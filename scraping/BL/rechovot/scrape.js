const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');
const os = require('os');
const { PdfParserService } = require('../../BL/shared/pdf/PdfParserService');
const { TextProcessor } = require('../../BL/shared/utils/TextProcessor');
const { FileHandler } = require('../../BL/shared/utils/FileHandler');
const { FieldExtractor } = require('../../BL/shared/pdf/pdfFieldExtractor');
const { fieldMappings, replaceHebrewKeysWithEnglish, mappedToEnglish } = require('../../config/pdfFieldMappings');

// Base URLs
const SITE_URL = 'https://www.rehovot.muni.il/429/';
const BASE_URL = 'https://www.rehovot.muni.il';
const BATCH_SIZE = 20;

// Custom HTTPS agent to bypass SSL verification
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

async function saveOutputs(outputDir, pdfName, jsonData, rawText, metadata) {
    const baseName = path.parse(pdfName).name;
    
    if (!jsonData && !rawText) {
        throw new Error('Both jsonData and rawText are undefined');
    }
    const combinedData = {
        ...metadata,
        pdfData:{...jsonData}
    };

    // Save JSON if available
    if (combinedData) {
        const jsonPath = path.join(outputDir, `${baseName}.json`);
        await fs.writeFile(jsonPath, JSON.stringify(combinedData, null, 2), 'utf8');
    }

    // Save raw text if available
    if (rawText) {
        const rawPath = path.join(outputDir, `${baseName}.txt`);
        await fs.writeFile(rawPath, rawText, 'utf8');
    }
}

async function fetchAndProcessPage() {
    try {
        const response = await axios.get(SITE_URL, { httpsAgent });
        const htmlContent = response.data;
        return extractPdfInfo(htmlContent);
    } catch (error) {
        console.error('Error fetching the webpage:', error.message);
        return [];
    }
}

function extractPdfInfo(htmlContent) {
  const $ = cheerio.load(htmlContent);
  const pdfList = [];

  $('tr').each((index, element) => {
      try {
          const cells = $(element).find('td');
          if (cells.length === 4) {
              const address = $(cells[0]).text().trim();
              const licenseType = $(cells[1]).text().trim();
              const pdfLink = $(cells[2]).find('a').attr('href');
              
              // Skip if essential data is missing
              if (!pdfLink) {
                  console.warn(`Skipping row ${index + 1}: Missing PDF link`);
                  return;
              }

              try {
                  const dateCell = $(cells[3]).text().trim();
                  const [startDate, endDate] = extractStartAndEndDates(dateCell);
                  const parsedDates = parseLicenseDates(startDate, endDate);

                  const pdfFilename = pdfLink.replace('./uploads/n/', '');
                  const fullPdfUrl = `${BASE_URL}/uploads/n/${pdfFilename}`;

                  pdfList.push({
                      address,
                      licenseType,
                      pdfUrl: fullPdfUrl,
                      date: {
                          start: parsedDates.formattedStartDate,
                          end: parsedDates.formattedEndDate
                      },
                      filename: pdfFilename,
                      pdfData: null
                  });
              } catch (dateError) {
                  console.warn(`Error processing dates for row ${index + 1}:`, dateError.message);
                  // Still add the item but with null dates
                  const pdfFilename = pdfLink.replace('./uploads/n/', '');
                  const fullPdfUrl = `${BASE_URL}/uploads/n/${pdfFilename}`;
                  
                  pdfList.push({
                      address,
                      licenseType,
                      pdfUrl: fullPdfUrl,
                      date: {
                          start: null,
                          end: null
                      },
                      filename: pdfFilename,
                      pdfData: null
                  });
              }
          }
      } catch (rowError) {
          console.warn(`Error processing row ${index + 1}:`, rowError.message);
          // Continue to next row
      }
  });

  return pdfList;
}


async function downloadPdf(pdfUrl, tempPath) {
    try {
        const response = await axios.get(pdfUrl, { 
            responseType: 'arraybuffer', 
            httpsAgent 
        });
        
        await fs.writeFile(tempPath, response.data);
        return true;
    } catch (error) {
        console.error(`Error downloading PDF from ${pdfUrl}:`, error.message);
        return false;
    }
}

function parseLicenseDates(startDateString, endDateString) {
  try {
      // Remove any extra whitespace
      startDateString = startDateString.trim();
      endDateString = endDateString.trim();
      
      // Check if either string is empty or invalid
      if (!startDateString || !endDateString) {
          throw new Error('Date strings cannot be empty');
      }


      // Parse start date
      const [startDay, startMonth, startYear] = startDateString.split('/').map(Number);
      const startDate = new Date(startYear, startMonth - 1, startDay);

      // Parse end date
      const [endDay, endMonth, endYear] = endDateString.split('/').map(Number);
      const endDate = new Date(endYear, endMonth - 1, endDay);

      // Validate dates
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          throw new Error('Invalid date values');
      }

      // If end date is before start date, swap them
      let finalStartDate = startDate;
      let finalEndDate = endDate;
      let finalStartDateString = startDateString;
      let finalEndDateString = endDateString;
      
      if (endDate < startDate) {
          finalStartDate = endDate;
          finalEndDate = startDate;
          finalStartDateString = endDateString;
          finalEndDateString = startDateString;
      }

      return {
          startDate: finalStartDate,
          endDate: finalEndDate,
          originalStartDate: startDateString,
          originalEndDate: endDateString,
          swapped: finalStartDate !== startDate,
          formattedStartDate: finalStartDate.toISOString(),
          formattedEndDate: finalEndDate.toISOString(),
          isValidAt: (date) => {
              const checkDate = date instanceof Date ? date : new Date(date);
              return checkDate >= finalStartDate && checkDate <= finalEndDate;
          }
      };
  } catch (error) {
      throw new Error(`Failed to parse license dates: ${error.message}`);
  }
}

async function processPdfBatch(batch, outputDir, pdfParser) {
  const tempDir = './temp';
  await fs.mkdir(tempDir, { recursive: true }).catch(error => {
      console.warn('Error creating temp directory:', error.message);
      // Use system temp directory as fallback
      return fs.mkdtemp(path.join(os.tmpdir(), 'pdf-processor-'));
  });
  
  const batchResults = [];
  const errors = [];

  for (const pdf of batch) {
      const tempFilePath = path.join(tempDir, pdf.filename);
      
      try {
          console.log(`Processing ${pdf.filename}...`);
          
          // Download PDF
          const downloaded = await downloadPdf(pdf.pdfUrl, tempFilePath);
          if (!downloaded) {
              throw new Error('Failed to download PDF');
          }

          let jsonData = null;
          let rawText = null;

          // Try to parse PDF, but continue if parsing fails
          try {
              const result = await pdfParser.parsePdf(tempFilePath, fieldMappings);
              if (result) {
                  jsonData = replaceHebrewKeysWithEnglish(result.jsonData || result, mappedToEnglish);
              }
          } catch (parseError) {
              console.warn(`Error parsing PDF ${pdf.filename}:`, parseError.message);
              errors.push({
                  filename: pdf.filename,
                  stage: 'parsing',
                  error: parseError.message
              });
          }

          // Try to extract raw text even if parsing failed
          try {
              rawText = await pdfParser.extractRawText(tempFilePath);
          } catch (textError) {
              console.warn(`Error extracting text from ${pdf.filename}:`, textError.message);
              errors.push({
                  filename: pdf.filename,
                  stage: 'text extraction',
                  error: textError.message
              });
          }

          // Save whatever data we managed to get
          if (jsonData || rawText) {
              await saveOutputs(outputDir, pdf.filename, jsonData, rawText, {
                  address: pdf.address,
                  licenseType: pdf.licenseType,
                  date: pdf.date,
                  pdfUrl: pdf.pdfUrl
              }).catch(saveError => {
                  console.error(`Error saving outputs for ${pdf.filename}:`, saveError.message);
                  errors.push({
                      filename: pdf.filename,
                      stage: 'saving',
                      error: saveError.message
                  });
              });
          }

          batchResults.push({
              filename: pdf.filename,
              success: true,
              hasJson: !!jsonData,
              hasText: !!rawText,
              errors: errors.filter(e => e.filename === pdf.filename)
          });

      } catch (error) {
          console.error(`Error processing ${pdf.filename}:`, error.message);
          batchResults.push({
              filename: pdf.filename,
              success: false,
              error: error.message
          });
      } finally {
          // Clean up temp file
          fs.unlink(tempFilePath).catch(() => {
              console.warn(`Failed to delete temp file ${tempFilePath}`);
          });
      }
  }

  // Try to clean up temp directory, but don't fail if it doesn't work
  fs.rmdir(tempDir).catch(() => {
      console.warn('Failed to delete temp directory');
  });

  // Return both results and any errors that occurred
  return {
      results: batchResults,
      errors: errors
  };
}

function extractStartAndEndDates(dateCell) {
  // Remove any extra whitespace and normalize spaces
  const cleanedDateCell = dateCell.trim().replace(/\s+/g, ' ');

  // Handle different possible date separators
  const separators = ['-', '–', '—', 'to', 'until', 'עד']; // including Hebrew 'until'
  let separator = separators.find(sep => cleanedDateCell.includes(sep));

  if (!separator) {
      throw new Error('No valid date separator found in date string ' + cleanedDateCell);
  }

  // Split the string by the found separator
  const [startDate, endDate] = cleanedDateCell.split(separator).map(date => date.trim());

  if (!startDate || !endDate) {
      throw new Error('Could not extract both start and end dates');
  }

  return [startDate, endDate];
}

async function main() {
    const outputDir = './output';
    
    try {
        // Initialize services
        const textProcessor = new TextProcessor();
        const fileHandler = new FileHandler();
        const fieldExtractor = new FieldExtractor();
        const pdfParser = new PdfParserService(
            textProcessor,
            fileHandler,
            fieldExtractor
        );

        await fs.mkdir(outputDir, { recursive: true });

        console.log('Fetching PDF list from website...');
        const pdfList = await fetchAndProcessPage();

        if (pdfList.length === 0) {
            console.log('No PDFs found to process');
            return;
        }

        // Process in batches
        console.log(`Found ${pdfList.length} PDFs. Processing in batches of ${BATCH_SIZE}...`);
        
        const batches = [];
        for (let i = 0; i < pdfList.length; i += BATCH_SIZE) {
            batches.push(pdfList.slice(i, i + BATCH_SIZE));
        }

        let processedCount = 0;
        for (let i = 0; i < batches.length; i++) {
            console.log(`Processing batch ${i + 1} of ${batches.length}...`);
            const results = await processPdfBatch(batches[i], outputDir, pdfParser);
            
            processedCount += results.length;
        }

        console.log(`Finished processing. Successfully processed ${processedCount} out of ${pdfList.length} PDFs.`);
        
    } catch (error) {
        console.error('Error in main:', error);
        process.exit(1);
    }
}

// Run the script
main().catch(console.error);
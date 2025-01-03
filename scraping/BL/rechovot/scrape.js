const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');
const pdfParse = require('pdf-parse');

// Base URLs
const SITE_URL = 'https://www.rehovot.muni.il/429/';
const BASE_URL = 'https://www.rehovot.muni.il';

// Custom HTTPS agent to bypass SSL verification
const httpsAgent = new https.Agent({
  rejectUnauthorized: false, // Disable SSL certificate verification
});

// Function to fetch and process the webpage
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

// Function to process the HTML and extract PDF information
function extractPdfInfo(htmlContent) {
  const $ = cheerio.load(htmlContent);
  const pdfList = [];

  $('tr').each((index, element) => {
    const cells = $(element).find('td');
    if (cells.length === 4) {
      const address = $(cells[0]).text().trim();
      const licenseType = $(cells[1]).text().trim();
      const pdfLink = $(cells[2]).find('a').attr('href');
      const date = $(cells[3]).text().trim();

      if (pdfLink) {
        const pdfFilename = pdfLink.replace('./uploads/n/', '');
        const fullPdfUrl = `${BASE_URL}/uploads/n/${pdfFilename}`;

        pdfList.push({
          address,
          licenseType,
          pdfUrl: fullPdfUrl,
          date,
          filename: pdfFilename,
        });
      }
    }
  });

  return pdfList;
}

// Function to download and parse PDF content
async function parsePdfData(pdfUrl) {
  try {
    const response = await axios.get(pdfUrl, { responseType: 'arraybuffer', httpsAgent });
    const pdfData = await pdfParse(response.data);
    return pdfData.text; // Extract plain text from the PDF
  } catch (error) {
    console.error(`Error processing PDF at ${pdfUrl}:`, error.message);
    return null;
  }
}

// Function to process all PDFs and generate combined JSON data
async function processAllPdfs(pdfList) {
  const combinedData = [];

  for (const pdf of pdfList) {
    console.log(`Processing PDF: ${pdf.filename}`);
    const pdfText = await parsePdfData(pdf.pdfUrl);

    if (pdfText) {
      combinedData.push({
        ...pdf,
        content: pdfText,
      });
    } else {
      console.warn(`Skipping PDF: ${pdf.filename}`);
    }
  }

  return combinedData;
}

// Function to save data to JSON file
function saveToJson(data, outputFilename) {
  const jsonOutput = JSON.stringify(data, null, 2);
  fs.writeFileSync(outputFilename, jsonOutput);
  console.log(`JSON file has been created: ${outputFilename}`);
}

// Main execution
async function main() {
  console.log('Fetching data from website...');
  const pdfList = await fetchAndProcessPage();

  if (pdfList.length > 0) {
    console.log(`Found ${pdfList.length} PDFs. Starting processing...`);
    const combinedData = await processAllPdfs(pdfList);

    if (combinedData.length > 0) {
      saveToJson(combinedData, 'combined_pdf_data.json');
      console.log(`\nProcessed ${combinedData.length} PDFs.`);
    } else {
      console.log('No PDF data was extracted.');
    }
  } else {
    console.log('No data was processed. Please check the website URL and try again.');
  }
}

// Run the script
main().catch(console.error);

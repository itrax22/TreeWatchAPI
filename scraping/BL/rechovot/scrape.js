const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');

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
    // Fetch the webpage
    const response = await axios.get(SITE_URL,{httpsAgent});
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

  // Find all table rows
  $('tr').each((index, element) => {
    const cells = $(element).find('td');
    if (cells.length === 4) { // Ensure we have all required cells
      const address = $(cells[0]).text().trim();
      const licenseType = $(cells[1]).text().trim();
      const pdfLink = $(cells[2]).find('a').attr('href');
      const date = $(cells[3]).text().trim();

      if (pdfLink) {
        // Extract the PDF filename and create full URL
        const pdfFilename = pdfLink.replace('./uploads/n/', '');
        const fullPdfUrl = `${BASE_URL}/uploads/n/${pdfFilename}`;

        pdfList.push({
          address,
          licenseType,
          pdfUrl: fullPdfUrl,
          date,
          filename: pdfFilename
        });
      }
    }
  });

  return pdfList;
}

// Function to generate JSON output
function saveToJson(pdfList) {
  const jsonOutput = JSON.stringify(pdfList, null, 2);
  fs.writeFileSync('pdf_licenses.json', jsonOutput);
  console.log('JSON file has been created: pdf_licenses.json');
}

// Main execution
async function main() {
  console.log('Fetching data from website...');
  const pdfList = await fetchAndProcessPage();
  
  if (pdfList.length > 0) {
    // Generate output files
    saveToJson(pdfList);
    
    // Print summary to console
    console.log(`\nProcessed ${pdfList.length} licenses`);
    console.log('\nExample of processed data:');
    console.log(pdfList[0]);
  } else {
    console.log('No data was processed. Please check the website URL and try again.');
  }
}

// Run the script
main().catch(console.error);
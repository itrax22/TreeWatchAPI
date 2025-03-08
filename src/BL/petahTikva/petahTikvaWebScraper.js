const puppeteer = require('puppeteer');
const cheerio = require('cheerio');

class PetahTikvaWebScraper {
    constructor(siteUrl, baseUrl) {
        this.siteUrl = siteUrl;
        this.baseUrl = baseUrl;
    }

    async fetchAndProcessPage(mode = 'production') {
        let browser = null;
        try {
            console.log(`Fetching data from: ${this.siteUrl} in ${mode} mode`);
            
            // Launch browser with more browser-like settings
            browser = await puppeteer.launch({
                headless: "new",
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--disable-gpu',
                    '--window-size=1920,1080'
                ]
            });
            
            const page = await browser.newPage();
            
            // Set a realistic viewport
            await page.setViewport({width: 1920, height: 1080});
            
            // Set a realistic user agent
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            
            // Add additional headers to appear more browser-like
            await page.setExtraHTTPHeaders({
                'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
                'Sec-Ch-Ua-Mobile': '?0',
                'Sec-Ch-Ua-Platform': '"Windows"',
                'Upgrade-Insecure-Requests': '1'
            });
            
            // Enable JavaScript
            await page.setJavaScriptEnabled(true);
            
            // Navigate to the page and wait for network to be idle
            await page.goto(this.siteUrl, {
                waitUntil: ['networkidle2', 'domcontentloaded', 'load'],
                timeout: 60000
            });
            
            // Wait for specific elements that indicate the page has fully loaded
            await page.waitForSelector('.ms-listviewtable', {timeout: 30000})
                .catch(() => console.log('Table selector not found, continuing anyway...'));
                        
            // Get the HTML content after JavaScript execution
            const htmlContent = await page.content();
            
            // Process the HTML content
            const pdfList = this.extractPdfInfo(htmlContent);
            
            // In test mode, limit the number of PDFs to process
            if (mode === 'test' && pdfList.length > 2) {
                console.log('Test mode: limiting to 2 PDFs');
                return pdfList.slice(0, 2);
            }
            
            return pdfList;
        } catch (error) {
            console.error('Error fetching and processing page:', error);
            throw error;
        } finally {
            if (browser) await browser.close();
        }
    }

    extractPdfInfo(htmlContent) {
        try {
            const $ = cheerio.load(htmlContent);
            const pdfList = new Map(); // Using Map to track unique PDF URLs
            
            // Find the table with the permits data - using the specific class from the website
            const tableRows = $('.ms-listviewtable tr').not('.ms-viewheadertr');
            
            console.log(`Found ${tableRows.length} table rows to process`);
            
            tableRows.each((index, row) => {
                try {
                    const cells = $(row).find('td');
                    if (cells.length >= 3) {
                        // Extract license number from the first cell
                        const licenseCell = $(cells[0]);
                        const licenseLink = licenseCell.find('a');
                        const licenseText = licenseLink.text().trim();
                        let pdfUrl = licenseLink.attr('href');
                        
                        // If the PDF URL is relative, make it absolute
                        if (pdfUrl && !pdfUrl.startsWith('http')) {
                            if (pdfUrl.startsWith('/')) {
                                // Absolute path from domain root
                                pdfUrl = new URL(pdfUrl, this.baseUrl).href;
                            } else {
                                // Relative path
                                pdfUrl = new URL(pdfUrl, this.siteUrl).href;
                            }
                        }
                        
                        // Extract date
                        const dateText = $(cells[1]).text().trim();
                        
                        // Extract address
                        const address = $(cells[2]).text().trim();
                        
                        // Skip if any essential data is missing
                        if (!pdfUrl || !licenseText || !address) {
                            console.warn(`Skipping row ${index + 1}: Missing data`);
                            return;
                        }
                        
                        // Parse license number
                        const licenseMatch = licenseText.match(/רישיון מס['\s]* (\d+)/);
                        const licenseNumber = licenseMatch ? licenseMatch[1] : licenseText;
                        
                        // Parse date (DD/MM/YYYY format)
                        let formattedDate = null;
                        try {
                            if (dateText) {
                                const [day, month, year] = dateText.split('/').map(num => parseInt(num, 10));
                                if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                                    const date = new Date(year, month - 1, day);
                                    formattedDate = date.toISOString();
                                }
                            }
                        } catch (dateError) {
                            console.warn(`Error parsing date ${dateText}:`, dateError.message);
                        }
                        
                        // Create filename for local storage based on license number
                        const filename = `petah_tikva_license_${licenseNumber}.pdf`;
                        
                        // Use the PDF URL as key to ensure uniqueness
                        if (!pdfList.has(pdfUrl)) {
                            pdfList.set(pdfUrl, {
                                licenseNumber,
                                pdfUrl,
                                publishDate: formattedDate,
                                address,
                                filename,
                                sourceId: licenseNumber,
                                metadata: {
                                    licenseNumber,
                                    publishDate: formattedDate,
                                    address,
                                    city: 'Petah-Tikva',
                                    sourceWebsite: this.siteUrl
                                }
                            });
                        }
                    }
                } catch (rowError) {
                    console.error(`Error processing row ${index + 1}:`, rowError);
                    // Continue to next row
                }
            });
            
            const results = Array.from(pdfList.values());
            console.log(`Successfully extracted ${results.length} PDF entries`);
            return results;
        } catch (error) {
            console.error('Error extracting PDF info:', error);
            return [];
        }
    }
    
    // Method to handle retries with exponential backoff
    async fetchWithRetry(maxRetries = 3) {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`Attempt ${attempt} of ${maxRetries}`);
                return await this.fetchAndProcessPage('production');
            } catch (error) {
                lastError = error;
                if (attempt < maxRetries) {
                    // Calculate delay with exponential backoff (1s, 2s, 4s, etc.)
                    const delay = Math.pow(2, attempt - 1) * 1000;
                    console.log(`Retry attempt ${attempt} failed. Waiting ${delay}ms before next try...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        
        throw new Error(`Failed after ${maxRetries} attempts: ${lastError.message}`);
    }
}

module.exports = { PetahTikvaWebScraper };
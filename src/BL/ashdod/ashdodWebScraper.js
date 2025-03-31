const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const AshdodDateParser = require('./ashdodDateParser');
const { AshdodLicense } = require('./models/ashdodLicense');

class AshdodWebScraper {
    constructor(siteUrl, baseUrl, httpsAgent) {
        this.siteUrl = siteUrl;
        this.baseUrl = baseUrl;
        // httpsAgent is not used directly in Puppeteer
        this.httpsAgent = httpsAgent;
        this.dataParser = new AshdodDateParser();
    }

    async fetchAndProcessPage(mode) {
        let browser;
        try {
            browser = await puppeteer.launch({ args: ['--no-sandbox'], headless: true });
            const page = await browser.newPage();
            await page.goto(this.siteUrl, { waitUntil: 'networkidle2' });

            // First, collect all year links
            const yearLinks = await page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('a[href*="parentMediaID"]'));
                return links.map(link => ({
                    url: link.href,
                    year: link.querySelector('h3') ? link.querySelector('h3').textContent.trim() : ''
                })).filter(link => link.year && !isNaN(link.year));
            });

            console.log(`Found ${yearLinks.length} year links to process`);
            
            // Process each year page to extract PDF links
            const allPdfLinks = [];
            for (const yearLink of yearLinks) {
                console.log(`Processing year: ${yearLink.year}`);
                await page.goto(yearLink.url, { waitUntil: 'networkidle2' });
                
                // Get the content of the year page
                const yearPageContent = await page.content();
                const yearPdfLinks = await this._extractPdfLinksFromYearPage(yearPageContent, yearLink.year);
                allPdfLinks.push(...yearPdfLinks);
            }

            return allPdfLinks;
        } catch (error) {
            console.error('Error fetching PDFs:', error.message);
            return [];
        } finally {
            if (browser) await browser.close();
        }
    }

    async _extractPdfLinksFromYearPage(html, year) {
        const $ = cheerio.load(html);
        const pdfList = [];

        // Find all PDF links on the page
        $('a[href$=".pdf"]').each((index, element) => {
            try {
                const pdfLink = $(element).attr('href');
                const linkText = $(element).text().trim();

                // Extract information from link text
                // Format typically: "בקשת כריתה| הר שומרון 3 | ערעור עד 30.07.22 | 27-0291"
                const parts = linkText.split('|').map(part => part.trim());
                
                let licenseType = '';
                let address = '';
                let dateText = '';
                let permitNumber = '';
                
                if (parts.length >= 1) {
                    licenseType = parts[0];
                }
                
                if (parts.length >= 2) {
                    address = parts[1];
                }
                
                if (parts.length >= 3) {
                    // Extract date from appeal date format: "ערעור עד 30.07.22"
                    const appealDateMatch = parts[2].match(/(\d{1,2}\.\d{1,2}\.\d{2,4})/);
                    dateText = appealDateMatch ? appealDateMatch[1] : '';
                }
                
                if (parts.length >= 4) {
                    permitNumber = parts[3];
                }

                const pdfFilename = pdfLink.split('/').pop();
                const fullPdfUrl = pdfLink.startsWith('http')
                    ? pdfLink
                    : `${this.baseUrl}${pdfLink}`;
                
                // Parse date if available
                const formattedDate = dateText ? this.dataParser.parseDate(dateText) : null;

                pdfList.push(new AshdodLicense(
                    address,
                    licenseType || 'Unknown',
                    fullPdfUrl,
                    formattedDate,
                    year, // Use year as organization
                    pdfFilename,
                    permitNumber
                ));
            } catch (linkError) {
                console.warn(`Error processing PDF link ${index + 1}:`, linkError.message);
            }
        });

        return pdfList;
    }
}

module.exports = { AshdodWebScraper };
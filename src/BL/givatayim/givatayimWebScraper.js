const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const { GivatayimDateParser } = require('./givatayimDateParser');
const { GivatayimLicense } = require('./models/givatayimLicense');

class GivatayimWebScraper {
    constructor(siteUrl, baseUrl, httpsAgent) {
        this.siteUrl = siteUrl;
        this.baseUrl = baseUrl;
        this.httpsAgent = httpsAgent;
        this.dataParser = new GivatayimDateParser();
    }

    async fetchAndProcessPage() {
        let browser;
        try {
            browser = await puppeteer.launch({ args: ['--no-sandbox'], headless: true });
            const page = await browser.newPage();

            // Mimic a regular Chrome user
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');
            await page.setViewport({ width: 1920, height: 1080 });

            await page.goto(this.siteUrl, { waitUntil: 'networkidle2' });

            // Wait for the iframe to load based on its src attribute
            const iframeElement = await page.waitForSelector('iframe[src*="filebrowser/?folder=90"]', { timeout: 10000 });
            const frame = await iframeElement.contentFrame();
            if (!frame) {
                console.warn('Unable to access iframe content');
                return [];
            }

            // Wait until at least one PDF link appears within the iframe
            await frame.waitForSelector('a[href$=".pdf"]', { timeout: 10000 });

            // Get the HTML content from the iframe and load it into Cheerio
            const content = await frame.content();
            const $ = cheerio.load(content);
            const pdfList = [];

            // Process all PDF links found within the iframe content
            $('a[href$=".pdf"]').each((i, el) => {
                const pdfElement = $(el);
                try {
                    let pdfLink = pdfElement.attr('href');
                    if (!pdfLink || !pdfLink.endsWith('.pdf')) return;
                    
                    // Remove any leading "../" segments from the URL path
                    pdfLink = pdfLink.replace(/^(\.\.\/)+/, '/');
                    
                    const linkText = pdfElement.text().trim();
                    // Remove trailing numbers from the link text to extract the address
                    const address = linkText.replace(/\s+\d+$/, '').trim();
                    const licenseType = 'כריתה';
                    const pdfFilename = pdfLink.split('/').pop();
                    const fullPdfUrl = pdfLink.startsWith('http')
                        ? pdfLink
                        : `${this.baseUrl}${pdfLink}`;
                    const dateMatch = pdfFilename.match(/(\d+)\.pdf$/);
                    const formattedDate = dateMatch 
                        ? this.dataParser.timestampToDate(dateMatch[1])
                        : new Date().toISOString();

                    pdfList.push(new GivatayimLicense(
                        address,
                        licenseType,
                        fullPdfUrl,
                        formattedDate,
                        '', // Organization is often empty for municipal permits
                        pdfFilename
                    ));
                } catch (linkError) {
                    console.warn('Error processing PDF link:', linkError.message);
                }
            });

            return pdfList;
        } catch (error) {
            console.error('Error fetching PDFs from Givatayim website:', error.message);
            return [];
        } finally {
            if (browser) await browser.close();
        }
    }
}

module.exports = { GivatayimWebScraper };

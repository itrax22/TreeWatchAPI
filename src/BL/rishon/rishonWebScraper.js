const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const RishonDateParser = require('./rishonDateParser');
const { RishonLicense } = require('./models/rishonLicense');

class RishonWebScraper {
    constructor(siteUrl, baseUrl, httpsAgent) {
        this.siteUrl = siteUrl;
        this.baseUrl = baseUrl;
        // httpsAgent is not used directly in Puppeteer
        this.httpsAgent = httpsAgent;
        this.dataParser = new RishonDateParser();
    }

    async fetchAndProcessPage() {
        let browser;
        try {
            browser = await puppeteer.launch({ args: ['--no-sandbox'], headless: true });
            const page = await browser.newPage();
            await page.goto(this.siteUrl, { waitUntil: 'networkidle2' });

            // Expand all collapsible sections to reveal hidden PDF links.
            // The buttons to expand are rendered as <a> elements with class "icoPlace"
            await page.evaluate(() => {
                const toggles = Array.from(document.querySelectorAll('a.icoPlace'));
                toggles.forEach(toggle => toggle.click());
            });

            // Now get the updated HTML content after expansion.
            const content = await page.content();
            const $ = cheerio.load(content);
            const pdfList = [];

            // Find all PDF links on the page.
            $('a[href$=".pdf"]').each((index, element) => {
                try {
                    const pdfLink = $(element).attr('href');
                    const linkText = $(element).text().trim();

                    // Attempt to extract additional info from the parent row.
                    let dateText = '';
                    let address = '';
                    let organization = '';

                    const row = $(element).closest('tr');
                    if (row.length) {
                        const cells = row.find('td');
                        if (cells.length >= 3) {
                            const dateCell = $(cells[0]).find('.date');
                            dateText = dateCell.length ? dateCell.text().trim() : '';
                            address = $(cells[1]).text().trim();
                            organization = $(cells[2]).text().trim();
                        }
                    }

                    // License type is derived from the link text.
                    let licenseType = '';
                    if (linkText.includes('-')) {
                        licenseType = linkText.split('-')[0].trim();
                    }

                    const pdfFilename = pdfLink.split('/').pop();
                    const fullPdfUrl = pdfLink.startsWith('http')
                        ? pdfLink
                        : `${this.baseUrl}${pdfLink}`;
                    const formattedDate = dateText ? this.dataParser.parseDate(dateText) : null;

                    pdfList.push(new RishonLicense(
                        address,
                        licenseType || 'Unknown',
                        fullPdfUrl,
                        formattedDate,
                        organization,
                        pdfFilename
                    ));
                } catch (linkError) {
                    console.warn(`Error processing PDF link ${index + 1}:`, linkError.message);
                }
            });

            return pdfList;
        } catch (error) {
            console.error('Error directly fetching PDFs:', error.message);
            return [];
        } finally {
            if (browser) await browser.close();
        }
    }
}

module.exports = { RishonWebScraper };

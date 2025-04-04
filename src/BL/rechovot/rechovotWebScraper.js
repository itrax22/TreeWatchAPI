const cheerio = require('cheerio');
const axios = require('axios');
const RechovotDateParser = require('./rechovotDateParser');
const {RechovotLicense} = require('./models/rechovotLicense');

class RechovotWebScraper {
    constructor(siteUrl, baseUrl, httpsAgent) {
        this.siteUrl = siteUrl;
        this.baseUrl = baseUrl;
        this.httpsAgent = httpsAgent;
        this.dataParser = new RechovotDateParser();
    }

    async fetchAndProcessPage(mode) {
        try {
            const response = await axios.get(this.siteUrl, { httpsAgent: this.httpsAgent });
            const results = this._extractPdfInfo(response.data);
            if (mode === 'production') {
                const lastMonth = new Date();
                lastMonth.setMonth(lastMonth.getMonth() - 1);
                lastMonth.setDate(1); // First day of last month
                
                return results.filter(license => {
                    if (!license.date.start) return false;
                    const licenseDate = new Date(license.date.start);
                    return licenseDate >= lastMonth;
                });
            }
            return results;
        } catch (error) {
            console.error('Error fetching the webpage:', error.message);
            return [];
        }
    }

    _extractPdfInfo(htmlContent) {
        const $ = cheerio.load(htmlContent);
        const pdfList = [];

        $('tr').each((index, element) => {
            try {
                const cells = $(element).find('td');
                if (cells.length === 4) {
                    const license = this._processTableRow($, cells, index);
                    if (license) {
                        pdfList.push(license);
                    }
                }
            } catch (rowError) {
                console.warn(`Error processing row ${index + 1}:`, rowError.message);
            }
        });

        return pdfList;
    }

    _processTableRow($, cells, index) {
        const address = $(cells[0]).text().trim();
        const licenseType = $(cells[1]).text().trim();
        const pdfLink = $(cells[2]).find('a').attr('href');
        
        if (!pdfLink) {
            console.warn(`Skipping row ${index + 1}: Missing PDF link`);
            return null;
        }

        try {
            const dateCell = $(cells[3]).text().trim();
            const [startDate, endDate] = this.dataParser.extractStartAndEndDates(dateCell);
            const parsedDates = this.dataParser.parseLicenseDates(startDate, endDate);

            const pdfFilename = pdfLink.replace('./uploads/n/', '');
            if(pdfLink.includes('http')) {
                let newPdfFilename = pdfFilename.split('/').pop();
                return new RechovotLicense(
                    address,
                    licenseType,
                    pdfLink,
                    parsedDates.formattedStartDate,
                    parsedDates.formattedEndDate,
                    newPdfFilename
                );
            }
            const fullPdfUrl = `${this.baseUrl}/uploads/n/${pdfFilename}`;

            return new RechovotLicense(
                address,
                licenseType,
                fullPdfUrl,
                parsedDates.formattedStartDate,
                parsedDates.formattedEndDate,
                pdfFilename
            );
        } catch (dateError) {
            console.warn(`Error processing dates for row ${index + 1}:`, dateError.message);
            const pdfFilename = pdfLink.replace('./uploads/n/', '');
            const fullPdfUrl = `${this.baseUrl}/uploads/n/${pdfFilename}`;
            
            return new RechovotLicense(
                address,
                licenseType,
                fullPdfUrl,
                null,
                null,
                pdfFilename
            );
        }
    }
}

module.exports = { RechovotWebScraper };
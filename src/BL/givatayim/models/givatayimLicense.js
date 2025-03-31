/**
 * Represents a tree cutting/relocation license from Givatayim municipality
 */
class GivatayimLicense {
    /**
     * @param {string} address - Location address of the tree(s)
     * @param {string} licenseType - Type of license (usually cutting or relocation)
     * @param {string} pdfUrl - URL to the PDF document
     * @param {string} date - ISO date string of the license
     * @param {string} organization - Organization responsible for the action
     * @param {string} filename - Filename of the PDF
     */
    constructor(address, licenseType, pdfUrl, date, organization, filename) {
        this.address = address || '';
        this.licenseType = licenseType || '';
        this.pdfUrl = pdfUrl || '';
        this.date = date || new Date().toISOString();
        this.organization = organization || '';
        this.filename = filename || '';
    }

    /**
     * Convert license to a simple object
     */
    toObject() {
        return {
            address: this.address,
            licenseType: this.licenseType,
            pdfUrl: this.pdfUrl,
            date: this.date,
            organization: this.organization,
            filename: this.filename
        };
    }

    /**
     * Convert license to JSON string
     */
    toJSON() {
        return JSON.stringify(this.toObject());
    }
}

module.exports = { GivatayimLicense };
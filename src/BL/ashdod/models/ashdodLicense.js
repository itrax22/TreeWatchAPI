class AshdodLicense {
    /**
     * Model representing a license from Ashdod municipality
     * @param {string} address - The address where the permit applies
     * @param {string} licenseType - The type of license (cutting, relocation, etc.)
     * @param {string} pdfUrl - The full URL to the PDF
     * @param {Date|null} date - The date of the license
     * @param {string} year - The year when the license was issued
     * @param {string} filename - The filename of the PDF
     * @param {string} permitNumber - The permit number, if available
     */
    constructor(address, licenseType, pdfUrl, date, year, filename, permitNumber = '') {
        this.address = address || '';
        this.licenseType = licenseType || 'Unknown';
        this.pdfUrl = pdfUrl || '';
        this.date = date || null;
        this.year = year || '';
        this.filename = filename || '';
        this.permitNumber = permitNumber || '';
    }

    /**
     * Validates that the license contains required data
     * @returns {boolean} - True if the license data is valid
     */
    isValid() {
        return this.pdfUrl && this.filename;
    }

    /**
     * Returns a string representation of the license
     * @returns {string} - String representation of the license
     */
    toString() {
        return `License: ${this.licenseType}, Address: ${this.address}, Date: ${this.date}, File: ${this.filename}`;
    }
}

module.exports = { AshdodLicense };
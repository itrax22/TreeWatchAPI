class RishonLicense {
    /**
     * Creates a new instance of RishonLicense
     * 
     * @param {string} address - The address where the license applies
     * @param {string} licenseType - The type of license (e.g., cutting, transplanting)
     * @param {string} pdfUrl - The URL to the PDF document
     * @param {string} date - The date of the license in ISO format (YYYY-MM-DD)
     * @param {string} organization - The organization that issued or requested the license
     * @param {string} filename - The filename of the PDF
     */
    constructor(address, licenseType, pdfUrl, date, organization, filename) {
        this.address = address;
        this.licenseType = licenseType;
        this.pdfUrl = pdfUrl;
        this.date = date;
        this.organization = organization;
        this.filename = filename;
        
        // Additional metadata
        this.city = 'ראשון לציון'; // Rishon LeTsiyon
        this.source = 'rishon';
        this.createdAt = new Date().toISOString();
    }

    toJSON() {
        return {
            address: this.address,
            licenseType: this.licenseType,
            pdfUrl: this.pdfUrl,
            date: this.date,
            organization: this.organization,
            filename: this.filename,
            city: this.city,
            source: this.source,
            createdAt: this.createdAt
        };
    }
}

module.exports = { RishonLicense };
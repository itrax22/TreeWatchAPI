class RechovotLicense {
    constructor(address, licenseType, pdfUrl, startDate, endDate, filename) {
        this.address = address;
        this.licenseType = licenseType;
        this.pdfUrl = pdfUrl;
        this.date = {
            start: startDate,
            end: endDate
        };
        this.filename = filename;
        this.pdfData = null;
    }

    toJSON() {
        return {
            address: this.address,
            licenseType: this.licenseType,
            date: this.date,
            pdfUrl: this.pdfUrl,
            pdfData: this.pdfData
        };
    }
}

module.exports = {RechovotLicense};
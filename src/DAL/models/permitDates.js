class PermitDates {
    constructor({ startDate, endDate, licenseDate, printDate }) {
        this.startDate = startDate ? new Date(startDate) : null;
        this.endDate = endDate ? new Date(endDate) : null;
        this.licenseDate = licenseDate
            ? new Date(licenseDate.split('/').reverse().join('-'))
            : null;
        this.printDate = printDate
            ? new Date(printDate.split('/').reverse().join('-'))
            : null;
        this.lastDateToObject = this.licenseDate 
            ? new Date(this.licenseDate.getTime() + 13 * 24 * 60 * 60 * 1000)
            : null;
    }
}

module.exports = PermitDates;

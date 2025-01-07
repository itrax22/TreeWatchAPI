const PermitDates = require('./permitDates');

class TreePermit {
    constructor({
        permitNumber,
        licenseType,
        address,
        houseNumber,
        settlement,
        gush,
        helka,
        reasonShort,
        reasonDetailed,
        licenseOwnerName,
        licenseOwnerId,
        licenseIssuerName,
        licenseIssuerRole,
        licenseIssuerPhoneNumber,
        licenseApproverName,
        approverTitle,
        licenseStatus,
        originalRequestNumber,
        forestPlotDetails,
        treeNotes,
        dates,
        pdfUrl,
        resourceId
    }) {
        this.permitNumber = permitNumber;
        this.licenseType = licenseType;
        this.address = address;
        this.houseNumber = houseNumber;
        this.settlement = settlement;
        this.gush = gush;
        this.helka = helka;
        this.reasonShort = reasonShort;
        this.reasonDetailed = reasonDetailed;
        this.licenseOwnerName = licenseOwnerName;
        this.licenseOwnerId = licenseOwnerId;
        this.licenseIssuerName = licenseIssuerName;
        this.licenseIssuerRole = licenseIssuerRole;
        this.licenseIssuerPhoneNumber = licenseIssuerPhoneNumber;
        this.licenseApproverName = licenseApproverName;
        this.approverTitle = approverTitle;
        this.licenseStatus = licenseStatus;
        this.originalRequestNumber = originalRequestNumber;
        this.forestPlotDetails = forestPlotDetails;
        this.treeNotes = treeNotes;
        this.dates = dates instanceof PermitDates ? dates : new PermitDates(dates);
        this.pdfUrl = pdfUrl;
        this.resourceId = resourceId;
    }
}

module.exports = TreePermit;
/**
 * Model class for Netanya tree license data
 */
class NetanyaLicense {
    /**
     * @param {string} serialNumber - Serial number of the license
     * @param {string} intakeDate - Date when the license was received
     * @param {string} requesterName - Name of the requester
     * @param {string} requestAddress - Address of the request
     * @param {string} requestNumber - Request number
     * @param {string} licenseNumber - License number
     * @param {Array} trees - Array of tree details
     */
    constructor(serialNumber, intakeDate, requesterName, requestAddress, requestNumber, licenseNumber, trees = []) {
        this.serialNumber = serialNumber;
        this.intakeDate = intakeDate;
        this.requesterName = requesterName;
        this.requestAddress = requestAddress;
        this.requestNumber = requestNumber;
        this.licenseNumber = licenseNumber;
        this.trees = trees;
        this.notes = '';
        this.gush = '';
        this.helka = '';
        this.approvalStatus = '';
        this.approvalExecutionDate = '';
        this.executionEndDate = '';
        this.appealUntilDate = '';
    }
}

module.exports = NetanyaLicense;
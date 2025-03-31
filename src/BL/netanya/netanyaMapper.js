const NetanyaDateParser = require('./netanyaDateParser');
const {constants} = require('../../constants');
/**
 * Maps Netanya Excel data to the TreePermit model format
 */
class NetanyaMapper {
    constructor() {
        this.dateParser = new NetanyaDateParser();
    }

    /**
     * Generate a unique resource ID for a license
     * @param {Object} license - The license data
     * @returns {string} Unique resource ID
     */
    _generateResourceId(license) {
        const dateString = license.intake_date 
            ? this.dateParser.parseDate(license.intake_date)?.replace(/-/g, '') || new Date().toISOString().split('T')[0].replace(/-/g, '')
            : new Date().toISOString().split('T')[0].replace(/-/g, '');
        
        // Use license number as part of the ID
        const licenseNumber = license.license_number || license.request_number || '';
        
        // Use a simple hash of the address for uniqueness
        const addressHash = this._hashString(license.request_address || 'unknown');
        
        // Combine elements to create a unique ID
        return `NETANYA-${dateString}-${licenseNumber.replace(/[^a-zA-Z0-9]/g, '')}-${addressHash}`;
    }
    
    /**
     * Simple string hashing function
     * @param {string} str - Input string
     * @returns {string} Hashed string
     */
    _hashString(str) {
        let hash = 0;
        if (!str || str.length === 0) return hash;
        
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        
        return Math.abs(hash).toString(16).substring(0, 6);
    }
    
    /**
     * Map a single license from Netanya format to TreePermit model
     * @param {Object} license - Netanya license data
     * @returns {Object} TreePermit model data
     */
    mapToTreePermitModel(license) {
        // Extract address components
        const addressComponents = this.dateParser.extractAddressComponents(license.request_address || '');
        
        // Determine license type
        const licenseType = this._determineLicenseType(license);
        
        // Format dates
        const dates = {
            licenseDate: this.dateParser.parseDate(license.intake_date) || null,
            startDate: this.dateParser.parseDate(license.approval_execution_date) || null,
            endDate: this.dateParser.parseDate(license.execution_end_date) || null,
            printDate: this.dateParser.parseDate(license.intake_date) || null
        };
        
        // Generate resource ID
        const resourceId = this._generateResourceId(license);
        
        // Format tree details
        const forestPlotDetails = this._formatForestPlotDetails(license.trees || []);
        
        // Return the TreePermit model structure
        return {
            permitNumber: license.request_number || resourceId,
            licenseType: licenseType,
            address: addressComponents.street || license.request_address || '',
            houseNumber: addressComponents.houseNumber || '',
            settlement: 'נתניה', // Fixed value for Netanya
            gush: license.gush || '',
            helka: license.helka || '',
            reasonShort: this._extractReasonShort(license),
            reasonDetailed: license.notes || '',
            licenseOwnerName: license.requester_name || '',
            licenseOwnerId: '',
            licenseIssuerName: '',
            licenseIssuerRole: '',
            licenseIssuerPhoneNumber: '',
            licenseApproverName: '',
            approverTitle: '',
            licenseStatus: license.approval_status === 'אושר' ? 'active' : 'pending',
            originalRequestNumber: license.request_number || '',
            forestPlotDetails,
            treeNotes: this._formatTreeNotes(license.trees || []),
            dates,
            resourceUrl: constants.NETANYA_EXCEL_URL,
            resourceId
        };
    }
    
    /**
     * Determine the license type from the license data
     * @param {Object} license - License data
     * @returns {string} License type
     */
    _determineLicenseType(license) {
        if (license.cutting && license.cutting.trim()) {
            return 'כריתה';
        }
        
        if (license.transfer_preservation && license.transfer_preservation.trim()) {
            return 'העתקה';
        }
        
        // Check in the trees array
        if (license.trees && license.trees.length > 0) {
            const firstTree = license.trees[0];
            if (firstTree.action) {
                return firstTree.action;
            }
        }
        
        return 'unknown';
    }
    
    /**
     * Extract short reason from license data
     * @param {Object} license - License data
     * @returns {string} Short reason
     */
    _extractReasonShort(license) {
        return license.notes || '';
    }
    
    /**
     * Format forest plot details from tree data
     * @param {Array} trees - Tree data
     * @returns {Array} Formatted forest plot details
     */
    _formatForestPlotDetails(trees) {
        return trees.map(tree => ({
            treeType: tree.treeType || 'unknown',
            treeId: '',
            diameter: '',
            quantity: tree.quantity || 1
        }));
    }
    
    /**
     * Format tree notes from tree data
     * @param {Array} trees - Tree data
     * @returns {Array} Formatted tree notes
     */
    _formatTreeNotes(trees) {
        return trees.map(tree => ({
            name: tree.treeType || 'unknown',
            amount: tree.quantity || 1
        }));
    }
    
    /**
     * Map multiple licenses to TreePermit model format
     * @param {Array} licenses - Array of Netanya license data
     * @returns {Array} Array of TreePermit model data
     */
    mapMultipleToTreePermitModel(licenses) {
        return licenses.map(license => this.mapToTreePermitModel(license));
    }
}

module.exports = NetanyaMapper;
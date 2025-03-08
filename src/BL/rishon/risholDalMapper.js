/**
 * Maps Rishon LeTsiyon license data to the TreePermit model format
 * Follows strict format without adding additional fields
 */
function mapToTreePermitModel(rishonLicense) {
    // Extract core data
    const {
        address,
        licenseType,
        pdfUrl,
        date,
        organization,
        filename
    } = rishonLicense;

    // Parse resourceData if it's a string
    let data = {};
    if (rishonLicense.resourceData) {
        if (typeof rishonLicense.resourceData === 'string') {
            try {
                data = JSON.parse(rishonLicense.resourceData);
            } catch (error) {
                console.warn(`Error parsing resourceData: ${error.message}`);
            }
        } else {
            data = rishonLicense.resourceData;
        }
    }

    // Determine license type
    let mappedLicenseType = licenseType || 'unknown';
    if (licenseType && typeof licenseType === 'string') {
        const licenseTypeLower = licenseType.toLowerCase();
        if (licenseTypeLower.includes('כריתה')) {
            mappedLicenseType = 'כריתה';
        } else if (licenseTypeLower.includes('העתקה')) {
            mappedLicenseType = 'העתקה';
        }
    }

    // Use action from resourceData if available
    if (data.action) {
        mappedLicenseType = data.action;
    }

    // Parse forest plot details
    let forestPlotDetails = [];
    if (data.forest_plot_details) {
        if (Array.isArray(data.forest_plot_details)) {
            forestPlotDetails = data.forest_plot_details;
        } else {
            forestPlotDetails = [data.forest_plot_details];
        }
    } else if (data.tree_notes) {
        if (Array.isArray(data.tree_notes)) {
            forestPlotDetails = data.tree_notes.map(tree => ({
                treeType: tree.name || 'unknown',
                treeId: '',
                diameter: '',
                quantity: tree.amount || 1
            }));
        } else if (data.tree_notes.name) {
            forestPlotDetails = [{
                treeType: data.tree_notes.name || 'unknown',
                treeId: '',
                diameter: '',
                quantity: data.tree_notes.amount || 1
            }];
        }
    }

    // Generate resource ID
    const resourceId = data.permit_number || generateResourceId(filename, date, address);

    // Return the strictly formatted model
    return {
        permitNumber: data.permit_number || resourceId,
        licenseType: mappedLicenseType,
        address: data.street || address,
        houseNumber: data.house_number || extractHouseNumber(address),
        settlement: data.settlement || 'ראשון לציון',
        gush: data.gush || '',
        helka: data.helka || '',
        reasonShort: data.reason_short || '',
        reasonDetailed: data.reason_detailed || '',
        licenseOwnerName: data.license_owner_name || organization || '',
        licenseOwnerId: data.license_owner_id || '',
        licenseIssuerName: data.license_issuer_name || '',
        licenseIssuerRole: data.license_issuer_role || '',
        licenseIssuerPhoneNumber: data.license_issuer_phone_number || '',
        licenseApproverName: data.license_approver_name || '',
        approverTitle: data.approver_title || '',
        licenseStatus: data.licenseStatus || 'active',
        originalRequestNumber: data.original_request_number || '',
        forestPlotDetails,
        treeNotes: data.tree_notes || [],
        dates: {
            licenseDate: data.license_date || date,
            startDate: data.start_date || date,
            endDate: data.end_date || null,
            printDate: data.printDate || date
        },
        resourceUrl: pdfUrl,
        resourceId: resourceId
    };
}

/**
 * Extracts house number from an address string
 */
function extractHouseNumber(address) {
    if (!address) return null;
    
    const addressMatch = address.match(/(\D+)\s+(\d+.*)/);
    if (addressMatch && addressMatch.length >= 3) {
        return addressMatch[2].trim();
    }
    return null;
}

/**
 * Generates a unique resource ID for the permit
 */
function generateResourceId(filename, date, address) {
    // Remove file extension if present
    const baseFilename = filename ? filename.replace(/\.[^/.]+$/, "") : "unknown";
    
    // Format date string
    const dateString = date ? new Date(date).toISOString().split('T')[0].replace(/-/g, '') : 
                             new Date().toISOString().split('T')[0].replace(/-/g, '');
    
    // Create a hash of the address for uniqueness
    const addressHash = hashString(address || 'unknown');
    
    // Combine elements to create a unique ID
    return `RLZN-${dateString}-${addressHash}-${baseFilename.substring(0, 8)}`;
}

/**
 * Simple string hashing function
 */
function hashString(str) {
    let hash = 0;
    if (!str || str.length === 0) return hash;
    
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    
    return Math.abs(hash).toString(16).substring(0, 6);
}

module.exports = { mapToTreePermitModel };
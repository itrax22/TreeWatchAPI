const PermitDates = require('../../../DAL/models/permitDates');

function mapToTreePermitModel(data) {
    const { resourceData, pdfUrl, address, licenseType, date } = data;

    // Extract the file name from the URL to use as the resourceId
    const resourceId = pdfUrl ? pdfUrl.split('/').pop() : null;

    const dates = new PermitDates({
        startDate: resourceData?.start_date || date?.start || null,
        endDate: resourceData?.end_date || date?.end || null,
        licenseDate: resourceData?.license_date || null,
        printDate: resourceData?.printDate || null,
    });

    return {
        permitNumber: resourceData?.permit_number || null,
        licenseType: resourceData?.action || licenseType || null,
        address: resourceData?.street || address || null,
        houseNumber: resourceData?.house_number || null,
        settlement: resourceData?.settlement || null,
        gush: resourceData?.gush || null,
        helka: resourceData?.helka || null,
        reasonShort: resourceData?.reason_short || null,
        reasonDetailed: resourceData?.reason_detailed || null,
        licenseOwnerName: resourceData?.license_owner_name || null,
        licenseOwnerId: resourceData?.license_owner_id || null,
        licenseIssuerName: resourceData?.license_issuer_name || null,
        licenseIssuerRole: resourceData?.license_issuer_role || null,
        licenseIssuerPhoneNumber: resourceData?.license_issuer_phone_number || null,
        licenseApproverName: resourceData?.license_approver_name || null,
        approverTitle: resourceData?.approver_title || null,
        licenseStatus: resourceData?.licenseStatus || null,
        originalRequestNumber: resourceData?.original_request_number || null,
        forestPlotDetails: resourceData?.forest_plot_details || null,
        treeNotes: resourceData?.tree_notes || [],
        dates: dates,
        resourceUrl: pdfUrl || null,
        resourceId: resourceId,
    };
}

module.exports = {
    mapToTreePermitModel,
};
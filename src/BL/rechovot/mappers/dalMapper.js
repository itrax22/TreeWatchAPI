const PermitDates = require('../../../DAL/models/permitDates');

function mapToTreePermitModel(data) {
    const { pdfData, pdfUrl, address, licenseType, date } = data;

    // Extract the file name from the URL to use as the resourceId
    const resourceId = pdfUrl ? pdfUrl.split('/').pop() : null;

    const dates = new PermitDates({
        startDate: pdfData?.start_date || date?.start || null,
        endDate: pdfData?.end_date || date?.end || null,
        licenseDate: pdfData?.license_date || null,
        printDate: pdfData?.printDate || null,
    });

    return {
        permitNumber: pdfData?.permit_number || null,
        licenseType: pdfData?.action || licenseType || null,
        address: pdfData?.street || address || null,
        houseNumber: pdfData?.house_number || null,
        settlement: pdfData?.settlement || null,
        gush: pdfData?.gush || null,
        helka: pdfData?.helka || null,
        reasonShort: pdfData?.reason_short || null,
        reasonDetailed: pdfData?.reason_detailed || null,
        licenseOwnerName: pdfData?.license_owner_name || null,
        licenseOwnerId: pdfData?.license_owner_id || null,
        licenseIssuerName: pdfData?.license_issuer_name || null,
        licenseIssuerRole: pdfData?.license_issuer_role || null,
        licenseIssuerPhoneNumber: pdfData?.license_issuer_phone_number || null,
        licenseApproverName: pdfData?.license_approver_name || null,
        approverTitle: pdfData?.approver_title || null,
        licenseStatus: pdfData?.licenseStatus || null,
        originalRequestNumber: pdfData?.original_request_number || null,
        forestPlotDetails: pdfData?.forest_plot_details || null,
        treeNotes: pdfData?.tree_notes || [],
        dates: dates,
        pdfUrl: pdfUrl || null,
        resourceId: resourceId,
    };
}

module.exports = {
    mapToTreePermitModel,
};
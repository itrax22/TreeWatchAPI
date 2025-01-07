const fieldMappings = [
    { key: 'מספר רשיון', value: 'nextLine' },
    { key: 'תאריך רישיון', value: 'nextLine' },
    { key: 'לביצוע רישיון(ז)', value: 'nextLine' },
    { key: 'שם בעל הרשיון', value: 'nextLine' },
    { key: 'ת.ז.', value: 'nextLine' },
    { key: 'טלפון', value: 'nextLine' },
    { key: 'סיבת הבקשה', value: 'nextLine' },
    { key: 'סיבה מילולית', value: 'nextLine' },
    { key: 'ישוב', value: 'nextLine' },
    { key: 'רחוב', value: 'nextLine' },
    { key: 'מס', value: 'nextLine' },
    { key: 'גוש', value: 'nextLine' },
    { key: 'חלקה', value: 'nextLine' },
    { key: 'תאריך הדפסה', value: 'nextLine' },
    { key: 'סטטוס הרשיון', value: 'nextLine' },
    { key: 'מתאריך', value: 'nextLine' },
    { key: 'עד תאריך', value: 'nextLine' },
    { key: 'שם נותן הרשיון', value: 'nextLine' },
    { key: 'תפקיד נותן הרשיון', value: 'nextLine' },
    { key: 'שם מאשר הרשיון', value: 'nextLine' },
    { key: 'תפקיד מאשר הרשיון', value: 'nextLine' },
    { key: 'מספר בקשה מקורית', value: 'nextLine' },
    { key: 'יער', value: 'ignore' },
    { key: 'חלקת יער', value: 'ignore' },
    { key: 'חלקת יעריער', value: 'ignore' },
    { key: 'הערותמספר העציםמין העץ', value: 'digitAndNamePattern' },
    // { key: 'Address', value: 'next3' }, // Next 3 lines
    // { key: 'Summary', value: 'untilKey', untilKey: 'End' }, // Until 'End' key is encountered
];
const mappedToEnglish = [
    { key: 'מספר רשיון', value: 'permit_number' },
    { key: 'תאריך רישיון', value: 'license_date' },
    { key: 'לביצוע רישיון(ז)', value: 'action' },
    { key: 'שם בעל הרשיון', value: 'license_owner_name' },
    { key: 'ת.ז.', value: 'license_owner_id' },
    { key: 'טלפון', value: 'license_issuer_phone_number' },
    { key: 'סיבת הבקשה', value: 'reason_short' },
    { key: 'סיבה מילולית', value: 'reason_detailed' },
    { key: 'ישוב', value: 'settlement' },
    { key: 'רחוב', value: 'street' },
    { key: 'מס', value: 'house_number' },
    { key: 'גוש', value: 'gush' },
    { key: 'חלקה', value: 'helka' },
    { key: 'תאריך הדפסה', value: 'printDate' },
    { key: 'סטטוס הרשיון', value: 'licenseStatus' },
    { key: 'מתאריך', value: 'start_date' },
    { key: 'עד תאריך', value: 'end_date' },
    { key: 'שם נותן הרשיון', value: 'license_issuer_name' },
    { key: 'תפקיד נותן הרשיון', value: 'license_issuer_role' },
    { key: 'שם מאשר הרשיון', value: 'license_approver_name' },
    { key: 'תפקיד מאשר הרשיון', value: 'approver_title' },
    { key: 'מספר בקשה מקורית', value: 'original_request_number' },
    { key: 'יער', value: 'forest' },
    { key: 'חלקת יער', value: 'forest_plot' },
    { key: 'חלקת יעריער', value: 'forest_plot_details' },
    { key: 'הערותמספר העציםמין העץ', value: 'tree_notes' }
];
function replaceHebrewKeysWithEnglish(data, mappings) {
    // Convert the mapping to a lookup object for efficient access
    const mappingLookup = Object.fromEntries(mappings.map(item => [item.key, item.value]));

    // Recursive function to replace keys in an object
    function replaceKeys(obj) {
        if (Array.isArray(obj)) {
            // Handle arrays by processing each element
            return obj.map(replaceKeys);
        } else if (typeof obj === 'object' && obj !== null) {
            // Handle objects by replacing keys and processing values
            return Object.fromEntries(
                Object.entries(obj).map(([key, value]) => {
                    const newKey = mappingLookup[key] || key; // Replace key or use original if no mapping found
                    return [newKey, replaceKeys(value)];
                })
            );
        }
        // If it's a primitive value, return as is
        return obj;
    }

    // Start the recursive replacement process
    return replaceKeys(data);
}

module.exports = { fieldMappings, mappedToEnglish, replaceHebrewKeysWithEnglish };
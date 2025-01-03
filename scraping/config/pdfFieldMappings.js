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
    { key: 'מספר רשיון', value: 'licenseNumber' },
    { key: 'תאריך רישיון', value: 'licenseDate' },
    { key: 'לביצוע רישיון(ז)', value: 'licenseExecution' },
    { key: 'שם בעל הרשיון', value: 'licenseOwnerName' },
    { key: 'ת.ז.', value: 'idNumber' },
    { key: 'טלפון', value: 'phoneNumber' },
    { key: 'סיבת הבקשה', value: 'requestReason' },
    { key: 'סיבה מילולית', value: 'reasonDescription' },
    { key: 'ישוב', value: 'settlement' },
    { key: 'רחוב', value: 'street' },
    { key: 'מס', value: 'houseNumber' },
    { key: 'גוש', value: 'block' },
    { key: 'חלקה', value: 'parcel' },
    { key: 'תאריך הדפסה', value: 'printDate' },
    { key: 'סטטוס הרשיון', value: 'licenseStatus' },
    { key: 'מתאריך', value: 'validFromDate' },
    { key: 'עד תאריך', value: 'validToDate' },
    { key: 'שם נותן הרשיון', value: 'licenseIssuerName' },
    { key: 'תפקיד נותן הרשיון', value: 'licenseIssuerRole' },
    { key: 'שם מאשר הרשיון', value: 'licenseApproverName' },
    { key: 'תפקיד מאשר הרשיון', value: 'licenseApproverRole' },
    { key: 'מספר בקשה מקורית', value: 'originalRequestNumber' },
    { key: 'יער', value: 'forest' },
    { key: 'חלקת יער', value: 'forestPlot' },
    { key: 'חלקת יעריער', value: 'forestPlotDetails' },
    { key: 'הערותמספר העציםמין העץ', value: 'treeNotes' }
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
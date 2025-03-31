/**
 * Parser for date formats in Netanya tree license data
 */
class NetanyaDateParser {
    constructor() {
        // Hebrew month names mapping if needed
        this.hebrewMonths = {
            'ינואר': '01',
            'פברואר': '02',
            'מרץ': '03',
            'אפריל': '04',
            'מאי': '05',
            'יוני': '06',
            'יולי': '07',
            'אוגוסט': '08',
            'ספטמבר': '09',
            'אוקטובר': '10',
            'נובמבר': '11',
            'דצמבר': '12'
        };
    }

    /**
     * Parse date string from DD/MM/YYYY format to YYYY-MM-DD
     * @param {string} dateString - Date in DD/MM/YYYY format
     * @returns {string|null} Date in YYYY-MM-DD format or null if invalid
     */
    parseDate(dateString) {
        if (!dateString) return null;
        
        try {
            // Handle format: DD/MM/YYYY
            const dateParts = dateString.trim().split('/');
            
            if (dateParts.length === 3) {
                const day = dateParts[0].padStart(2, '0');
                const month = dateParts[1].padStart(2, '0');
                let year = dateParts[2];
                
                // Handle 2-digit years
                if (year.length === 2) {
                    // Assume 20xx for years like '23'
                    year = `20${year}`;
                }
                
                // Format: YYYY-MM-DD
                return `${year}-${month}-${day}`;
            }
        } catch (error) {
            console.warn(`Failed to parse date: ${dateString}`, error);
        }
        
        return null;
    }

    /**
     * Extract address components from an address string
     * @param {string} address - Full address string
     * @returns {Object} Object with street and houseNumber
     */
    extractAddressComponents(address) {
        if (!address) return { street: '', houseNumber: '' };
        
        try {
            // Try to match a pattern like "Street Name 123" or "Street Name 123-456"
            const addressMatch = address.match(/(.+?)\s+(\d+(?:-\d+)?)\s*$/);
            
            if (addressMatch && addressMatch.length >= 3) {
                return {
                    street: addressMatch[1].trim(),
                    houseNumber: addressMatch[2].trim()
                };
            }
        } catch (error) {
            console.warn(`Failed to parse address: ${address}`, error);
        }
        
        return {
            street: address,
            houseNumber: ''
        };
    }
}

module.exports = NetanyaDateParser;
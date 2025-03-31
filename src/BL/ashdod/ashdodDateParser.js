class AshdodDateParser {
    /**
     * Parses date strings in various formats commonly found in Ashdod licenses
     * @param {string} dateString - A date string typically in DD.MM.YY or DD.MM.YYYY format
     * @returns {Date|null} - Parsed Date object or null if parsing failed
     */
    parseDate(dateString) {
        if (!dateString) return null;

        // Clean up the date string
        const cleanDateString = dateString.trim();
        
        // Try multiple formats
        // Format: DD.MM.YY or DD.MM.YYYY
        const dotFormatRegex = /(\d{1,2})\.(\d{1,2})\.(\d{2,4})/;
        
        if (dotFormatRegex.test(cleanDateString)) {
            const matches = cleanDateString.match(dotFormatRegex);
            if (matches && matches.length === 4) {
                const day = parseInt(matches[1], 10);
                const month = parseInt(matches[2], 10) - 1; // JavaScript months are 0-based
                let year = parseInt(matches[3], 10);
                
                // Handle two-digit years
                if (year < 100) {
                    // Assume 20XX for years < 50, 19XX for years >= 50
                    year = year < 50 ? 2000 + year : 1900 + year;
                }
                
                try {
                    const date = new Date(year, month, day);
                    // Validate the date is legitimate
                    if (date.getDate() === day && date.getMonth() === month && date.getFullYear() === year) {
                        return date;
                    }
                } catch (e) {
                    console.warn(`Failed to parse date: ${cleanDateString}`, e);
                }
            }
        }
        
        // If we couldn't parse the date, return null
        console.warn(`Could not parse date: ${dateString}`);
        return null;
    }
}

module.exports = AshdodDateParser;
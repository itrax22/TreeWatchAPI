class GivatayimDateParser {
    /**
     * Parse date formats commonly found in Givatayim PDFs
     */
    parseDate(dateStr) {
        if (!dateStr) return null;
        
        // Handle common Hebrew date formats
        try {
            // DD/MM/YYYY format
            const dateMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
            if (dateMatch) {
                const day = parseInt(dateMatch[1], 10);
                const month = parseInt(dateMatch[2], 10) - 1; // JS months are 0-indexed
                const year = parseInt(dateMatch[3], 10);
                return new Date(year, month, day).toISOString();
            }
            
            // Hebrew text date format
            const hebrewMonths = {
                'ינואר': 0, 'פברואר': 1, 'מרץ': 2, 'אפריל': 3, 'מאי': 4, 'יוני': 5,
                'יולי': 6, 'אוגוסט': 7, 'ספטמבר': 8, 'אוקטובר': 9, 'נובמבר': 10, 'דצמבר': 11
            };
            
            for (const [month, index] of Object.entries(hebrewMonths)) {
                if (dateStr.includes(month)) {
                    const yearMatch = dateStr.match(/\d{4}/);
                    const dayMatch = dateStr.match(/\d{1,2}/);
                    
                    if (yearMatch && dayMatch) {
                        const year = parseInt(yearMatch[0], 10);
                        const day = parseInt(dayMatch[0], 10);
                        return new Date(year, index, day).toISOString();
                    }
                }
            }
            
            // If all else fails, attempt to parse the string directly
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
                return date.toISOString();
            }
        } catch (error) {
            console.warn(`Error parsing date "${dateStr}":`, error.message);
        }
        
        // Return current date as fallback
        return new Date().toISOString();
    }
    
    /**
     * Convert Unix timestamp (from filenames) to date
     */
    timestampToDate(timestamp) {
        try {
            // Handle Unix timestamps in seconds or milliseconds
            const ts = timestamp.length > 10 ? 
                parseFloat(timestamp) : // Milliseconds
                parseFloat(timestamp) * 1000; // Seconds
                
            const date = new Date(ts);
            if (!isNaN(date.getTime())) {
                return date.toISOString();
            }
        } catch (error) {
            console.warn(`Error converting timestamp "${timestamp}" to date:`, error.message);
        }
        
        // Return current date as fallback
        return new Date().toISOString();
    }
}

module.exports = { GivatayimDateParser };
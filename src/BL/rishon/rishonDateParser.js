class RishonDateParser {
    constructor() {
        // Hebrew month names mapping
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

    parseDate(dateString) {
        if (!dateString) return null;
        
        try {
            // Format from the example: 6.3.23
            const dateParts = dateString.trim().split('.');
            
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

    // Method to handle date ranges if needed in the future
    extractDateRange(dateString) {
        // For now just return the single parsed date
        return {
            start: this.parseDate(dateString),
            end: null
        };
    }
}

module.exports = RishonDateParser;
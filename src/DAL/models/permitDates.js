class PermitDates {
    constructor({ startDate, endDate, licenseDate, printDate }) {
        this.startDate = this.parseAnyDateFormat(startDate);
        this.endDate = this.parseAnyDateFormat(endDate);
        this.licenseDate = this.parseAnyDateFormat(licenseDate);
        this.printDate = this.parseAnyDateFormat(printDate);
        this.lastDateToObject = this.licenseDate 
            ? this.parseDate(new Date(this.licenseDate.getTime() + 13 * 24 * 60 * 60 * 1000))
            : null;
    }

    /**
     * Parses a date using the standard Date constructor
     * @param {string|Date} dateInput - Date input in standard format
     * @returns {Date|null} Parsed date or null if invalid
     */
    parseDate(dateInput) {
        if (!dateInput) return null;
        
        const date = new Date(dateInput);
        return isNaN(date.getTime()) ? null : date;
    }

    /**
     * Parses a date in DD/MM/YYYY format
     * @param {string} dateStr - Date in DD/MM/YYYY format
     * @returns {Date|null} Parsed date or null if invalid
     */
    parseDateWithFormat(dateStr) {
        if (!dateStr) return null;
        
        try {
            if (typeof dateStr !== 'string' || !dateStr.includes('/')) return null;
            
            const [day, month, year] = dateStr.split('/');
            const date = new Date(`${year}-${month}-${day}`);
            return isNaN(date.getTime()) ? null : date;
        } catch (error) {
            return null;
        }
    }

    /**
     * Attempts to parse a date in any common format
     * Handles ISO formats like '2025-02-28T00:00:00.000Z' as well as various string formats
     * @param {string|Date} dateInput - Date input in any format
     * @returns {Date|null} Parsed date or null if invalid
     */
    parseAnyDateFormat(dateInput) {
        if (!dateInput) return null;
        
        // If it's already a Date object
        if (dateInput instanceof Date) {
            return isNaN(dateInput.getTime()) ? null : dateInput;
        }
        
        // Try standard parsing first (handles ISO formats and many others)
        let date = this.parseDate(dateInput);
        if (date) return date;
        
        // Try DD/MM/YYYY format
        date = this.parseDateWithFormat(dateInput);
        if (date) return date;
        
        // Try other common formats if it's a string
        if (typeof dateInput === 'string') {
            // Handle MM/DD/YYYY format (US format)
            try {
                if (dateInput.includes('/')) {
                    const [month, day, year] = dateInput.split('/');
                    date = new Date(`${year}-${month}-${day}`);
                    if (!isNaN(date.getTime())) return date;
                }
            } catch (e) {
                // Continue to other formats
            }
            
            // Try to detect and parse timestamp (numeric string)
            if (/^\d+$/.test(dateInput)) {
                date = new Date(parseInt(dateInput, 10));
                if (!isNaN(date.getTime())) return date;
            }
        }
        
        return null;
    }
}

module.exports = PermitDates;
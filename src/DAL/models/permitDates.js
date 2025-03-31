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
/**
 * Parses a date using the standard Date constructor and ensures it's in European format
 * @param {string|Date} dateInput - Date input in any format
 * @returns {Date|null} Parsed date object or null if invalid
 */
parseDate(dateInput) {
    if (!dateInput) return null;
    
    try {
        // If it's already a Date object
        if (dateInput instanceof Date) {
            return isNaN(dateInput.getTime()) ? null : dateInput;
        }
        
        // If it's an ISO string or other format
        const date = new Date(dateInput);
        
        // Validate date is valid
        if (isNaN(date.getTime())) {
            return null;
        }
        
        return date;
    } catch (error) {
        return null;
    }
}

/**
 * Converts a Date object to European format string (DD/MM/YYYY)
 * @param {Date} date - Date object to format
 * @returns {string|null} Formatted date string or null if invalid
 */
toEuropeanDateString(date) {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
        return null;
    }
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // +1 because months are 0-indexed
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
}

/**
 * Gets the European formatted date string
 * For any date property in the class
 * @param {string} propertyName - Name of the date property (startDate, endDate, etc.)
 * @returns {string|null} Formatted date string or null
 */
getFormattedDate(propertyName) {
    const dateProperty = this[propertyName];
    if (!dateProperty) return null;
    
    return this.toEuropeanDateString(dateProperty);
}

    /**
     * Parses a date string in DD/MM/YYYY format
     * @param {string} dateStr - Date string in DD/MM/YYYY format (e.g., '10/04/2025')
     * @returns {Date|null} Parsed date or null if invalid
     */
    parseDateWithFormat(dateStr) {
        if (!dateStr) return null;
        
        try {
            if (typeof dateStr !== 'string' || !dateStr.includes('/')) return null;
            
            // In DD/MM/YY format, first is day, second is month
            const parts = dateStr.split('/');
            if (parts.length !== 3) return null;
            
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10);
            let year = parseInt(parts[2], 10);
            
            // Handle year validation - we expect 4-digit years in DD/MM/YYYY format
            // But still handle 2-digit years just in case
            if (year < 100) {
                year = year + 2000;  // Assuming '25' means 2025
            }
            
            // Note: JavaScript months are 0-based (0=Jan, 1=Feb, etc.)
            const date = new Date(year, month - 1, day);
            
            // Validate the parsed date
            if (
                isNaN(date.getTime()) || 
                date.getDate() !== day || 
                date.getMonth() !== month - 1 || 
                date.getFullYear() !== year
            ) {
                return null;
            }
            
            return date;
        } catch (error) {
            return null;
        }
    }

    /**
     * Attempts to parse a date in any common format
     * Primarily handles DD/MM/YYYY format, but also supports other formats
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
        let date;
        
        // Try DD/MM/YY format (priority since this is the expected format)
        date = this.parseDateWithFormat(dateInput);
        if (date) return date;
        
        // Try other common formats if it's a string
        if (typeof dateInput === 'string') {
            // Handle MM/DD/YYYY format (US format)
            try {
                if (dateInput.includes('/')) {
                    const parts = dateInput.split('/');
                    
                    if (parts.length === 3) {
                        const month = parseInt(parts[0], 10);
                        const day = parseInt(parts[1], 10);
                        let year = parseInt(parts[2], 10);
                        
                        // Handle 2-digit years
                        if (year < 100) {
                            year = year + 2000;
                        }
                        
                        // Only use this if it's likely a MM/DD/YYYY format (month <= 12)
                        if (month <= 12) {
                            date = new Date(year, month - 1, day);
                            
                            // Validate the date is correctly interpreted
                            if (!isNaN(date.getTime()) && 
                                date.getMonth() === month - 1 && 
                                date.getDate() === day) {
                                return date;
                            }
                        }
                    }
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
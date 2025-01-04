class RechovotDateParser {
    constructor() {
    }

    parseLicenseDates(startDateString, endDateString) {
        const cleanDates = this._cleanDateStrings(startDateString, endDateString);
        const [startDate, endDate] = this._createDateObjects(cleanDates.start, cleanDates.end);
        return this._createDateResult(startDate, endDate, cleanDates);
    }

    extractStartAndEndDates(dateCell) {
        const cleanedDateCell = dateCell.trim().replace(/\s+/g, ' ');
        const separators = ['-', '–', '—', 'to', 'until', 'עד'];
        const separator = separators.find(sep => cleanedDateCell.includes(sep));

        if (!separator) {
            throw new Error(`No valid date separator found in date string ${cleanedDateCell}`);
        }

        const [startDate, endDate] = cleanedDateCell.split(separator).map(date => date.trim());
        
        if (!startDate || !endDate) {
            throw new Error('Could not extract both start and end dates');
        }

        return [startDate, endDate];
    }

    _cleanDateStrings(start, end) {
        const cleanStart = start.trim();
        const cleanEnd = end.trim();
        
        if (!cleanStart || !cleanEnd) {
            throw new Error('Date strings cannot be empty');
        }

        return { start: cleanStart, end: cleanEnd };
    }

    _createDateObjects(startString, endString) {
        const parseDate = (dateStr) => {
            const [day, month, year] = dateStr.split('/').map(Number);
    
            // Adjust the year if it's less than 100
            const adjustedYear = year < 100 ? 2000 + year : year;
    
            return new Date(adjustedYear, month - 1, day);
        };
    
        const startDate = parseDate(startString);
        const endDate = parseDate(endString);
    
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            throw new Error('Invalid date values');
        }
    
        return [startDate, endDate];
    }

    _createDateResult(startDate, endDate, originalDates) {
        const [finalStartDate, finalEndDate] = endDate < startDate ? 
            [endDate, startDate] : [startDate, endDate];

        return {
            startDate: finalStartDate,
            endDate: finalEndDate,
            originalStartDate: originalDates.start,
            originalEndDate: originalDates.end,
            swapped: finalStartDate !== startDate,
            formattedStartDate: finalStartDate.toISOString(),
            formattedEndDate: finalEndDate.toISOString(),
            isValidAt: (date) => {
                const checkDate = date instanceof Date ? date : new Date(date);
                return checkDate >= finalStartDate && checkDate <= finalEndDate;
            }
        };
    }
}

// Export the class directly
module.exports = RechovotDateParser;
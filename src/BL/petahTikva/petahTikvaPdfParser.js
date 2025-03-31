const fs = require('fs');
const pdfParse = require('pdf-parse');
const PermitDates = require('../../DAL/models/permitDates');
const TreePermit = require('../../DAL/models/treePermit');

class PetahTikvaPdfParser {
    constructor() {
        // Define column regions for parsing
        this.columnDefinitions = [
            { name: 'כתובת', startX: 700, endX: 800 },
            { name: 'מס עצים', startX: 670, endX: 700 },
            { name: 'שם העץ', startX: 560, endX: 670 },
            { name: 'הסיבה', startX: 495, endX: 550 },
            { name: 'הבקשה', startX: 450, endX: 495 },
            { name: 'מס רישיון', startX: 380, endX: 440 },
            { name: 'תאריך', startX: 300, endX: 380 },
            { name: 'שם המבקש', startX: 220, endX: 340 }, // Wider range for applicant name
            { name: 'גוש', startX: 170, endX: 220 },
            { name: 'חלקה', startX: 0, endX: 170 }
        ];
    }

    /**
     * Parse Petah Tikva PDF into structured data
     * @param {string} tempFilePath - Path to the PDF file
     * @param {string} pdfUrl - URL of the original PDF
     * @returns {Object} Structured permit data
     */
    async parsePetahTikvaPdf(tempFilePath, pdfUrl) {
        try {
            // Read the PDF file
            const dataBuffer = fs.readFileSync(tempFilePath);
            let rawText = '';
            const allTextItems = [];
            
            // Parse the PDF
            const data = await pdfParse(dataBuffer, {
                pagerender: async function(pageData) {
                    // Get text content with position information
                    const textContent = await pageData.getTextContent();
                    
                    // Process each text item to store it with position information
                    if (textContent && textContent.items) {
                        for (let i = 0; i < textContent.items.length; i++) {
                            const item = textContent.items[i];
                            allTextItems.push({
                                str: item.str,
                                transform: item.transform
                            });
                        }
                    }
                    
                    return pageData.getTextContent().then(content => {
                        return content.items.map(item => item.str).join(' ');
                    });
                }
            });
            
            // Always ensure rawText is defined
            rawText = data.text || '';
            
            // Extract license entries using position-based parsing
            let entries = this.extractLicenseEntries(allTextItems, pdfUrl);
            
            // If no entries found with position-based parsing, try text-based parsing
            if (entries.length === 0 && rawText) {
                entries = this.extractLicenseEntriesFromText(rawText, pdfUrl);
            }
            
            return {
                permits: entries,
                success: entries.length > 0,
                rawText: rawText
            };
        } catch (error) {
            console.error('Error parsing Petah Tikva PDF:', error);
            return {
                permits: [],
                success: false,
                error: error.message,
                rawText: '' // Ensure rawText is defined even in error case
            };
        }
    }

    /**
     * Extract license entries from text items
     * @param {Array} textItems - Text items from PDF
     * @param {string} pdfUrl - URL of the PDF
     * @returns {Array} Extracted license entries
     */
    extractLicenseEntries(textItems, pdfUrl) {
        // First identify license numbers - they should be 4-digit numbers starting with 3 or 4
        const licenseItems = textItems.filter(item => 
            /^[3-4]\d{3}$/.test(item.str.trim())
        );
        
        // No licenses found
        if (licenseItems.length === 0) {
            return [];
        }

        // Create a list of entries (one entry for each license)
        const entries = [];
        
        // Process each license
        for (const licenseItem of licenseItems) {
            const licenseNumber = licenseItem.str;
            const licenseY = licenseItem.transform[5];
            
            // Create a new entry object
            const entry = {
                licenseNumber: licenseNumber,
                rawData: {}
            };
            
            // Find items in the same row as the license
            const rowItems = textItems.filter(item => 
                Math.abs(item.transform[5] - licenseY) < 10
            );
            
            // Process each column
            for (const column of this.columnDefinitions) {
                // Skip the license number column since we already have it
                if (column.name === 'מס רישיון') {
                    entry.rawData[column.name] = licenseNumber;
                    continue;
                }
                
                // Find items in this row that fall within this column's boundaries
                const columnItems = rowItems.filter(item => 
                    item.transform[4] >= column.startX && item.transform[4] <= column.endX
                );
                
                // Sort from right to left for Hebrew text
                columnItems.sort((a, b) => b.transform[4] - a.transform[4]);
                
                // Extract column value
                if (columnItems.length > 0) {
                    const value = columnItems.map(item => item.str).join(' ').trim();
                    
                    // Skip column headers and empty values
                    if (value && !this.isColumnHeader(value)) {
                        this.processColumnValue(entry, column.name, value);
                    }
                }
            }
            
            // Check for multi-line addresses
            if (entry.address && entry.address.length > 15) {
                const addressLines = this.findAdditionalAddressLines(entry.address, textItems, licenseItem, this.columnDefinitions[0]);
                if (addressLines.length > 0) {
                    entry.address = [entry.address, ...addressLines].join(' ');
                    entry.rawData['כתובת'] = entry.address;
                }
            }
            
            // Add entry if it has enough data
            if (Object.keys(entry.rawData).length > 1) {
                // Transform to the TreePermit format
                const transformedEntry = this.transformToTreePermit(entry, pdfUrl);
                entries.push(transformedEntry);
            }
        }
        
        // Merge entries with the same license number
        const mergedEntries = this.mergeEntriesWithSameLicense(entries);
        
        return mergedEntries;
    }

    /**
     * Process a column value and add it to the entry object
     * @param {Object} entry - Entry object to update
     * @param {string} columnName - Column name
     * @param {string} value - Column value
     */
    processColumnValue(entry, columnName, value) {
        switch (columnName) {
            case 'תאריך':
                // Date column
                const dateMatch = value.match(/\d{2}\/\d{2}\/\d{4}/);
                if (dateMatch) {
                    entry.date = dateMatch[0];
                    entry.rawData[columnName] = entry.date;
                } else {
                    entry.rawData[columnName] = value;
                }
                break;
                
            case 'שם המבקש':
                // Applicant column
                entry.applicant = value;
                entry.rawData[columnName] = value;
                break;
                
            case 'הסיבה':
                // Reason column - clean up
                let cleanedValue = value;
                if (value.includes('כריתה')) {
                    cleanedValue = 'כריתה';
                }
                else if (value.includes('מחלת')) {
                    cleanedValue = 'מחלת עץ';
                }
                entry.reason = cleanedValue;
                entry.rawData[columnName] = cleanedValue;
                break;
                
            case 'הבקשה':
                // Request type
                entry.requestType = value;
                entry.rawData[columnName] = value;
                break;
                
            case 'כתובת':
                // Address
                entry.address = this.fixAddress(value);
                entry.rawData[columnName] = entry.address;
                break;
                
            case 'מס עצים':
                // Tree count - extract digits
                const matches = value.match(/\d+/);
                if (matches && matches.length > 0) {
                    entry['מס עצים'] = matches[0];
                    entry.rawData[columnName] = entry['מס עצים'];
                } else {
                    entry['מס עצים'] = null;
                    entry.rawData[columnName] = null;
                }
                break;
                
            case 'שם העץ':
                // Tree type
                entry.treeType = value;
                entry.rawData[columnName] = value;
                break;
                
            case 'גוש':
                // Block number - usually 4 digits
                const blockMatch = value.match(/\b\d{4}\b/);
                if (blockMatch) {
                    entry.block = blockMatch[0];
                    entry.rawData[columnName] = entry.block;
                } else {
                    entry.block = value;
                    entry.rawData[columnName] = value;
                }
                break;
                
            case 'חלקה':
                // Parcel number
                const parcelMatch = value.match(/\b\d+\b/);
                if (parcelMatch) {
                    entry.parcel = parcelMatch[0];
                    entry.rawData[columnName] = entry.parcel;
                } else {
                    entry.parcel = value;
                    entry.rawData[columnName] = value;
                }
                break;
                
            default:
                // Any other column
                entry[columnName] = value;
                entry.rawData[columnName] = value;
                break;
        }
    }

    /**
     * Find additional address lines in the text
     * @param {string} primaryAddress - Primary address text
     * @param {Array} allTextItems - All text items from the PDF
     * @param {Object} licenseItem - License item with position
     * @param {Object} addressColumn - Address column definition
     * @returns {Array} Additional address lines
     */
    findAdditionalAddressLines(primaryAddress, allTextItems, licenseItem, addressColumn) {
        const licenseY = licenseItem.transform[5];
        const additionalLines = [];
        
        // Look for items in the address column in the row below
        const addressItems = allTextItems.filter(item => 
            // In the address column
            item.transform[4] >= addressColumn.startX && 
            item.transform[4] <= addressColumn.endX &&
            // Below the license row
            item.transform[5] < licenseY &&
            Math.abs(item.transform[5] - licenseY) < 25 && 
            Math.abs(item.transform[5] - licenseY) > 10 && 
            // Not already in the primary address
            !primaryAddress.includes(item.str)
        );
        
        if (addressItems.length > 0) {
            // Sort by vertical position
            addressItems.sort((a, b) => 
                Math.abs(a.transform[5] - licenseY) - Math.abs(b.transform[5] - licenseY)
            );
            
            // Get items from the closest row
            const closestY = addressItems[0].transform[5];
            const closestRowItems = addressItems.filter(item => 
                Math.abs(item.transform[5] - closestY) < 5
            );
            
            // Sort right to left
            closestRowItems.sort((a, b) => b.transform[4] - a.transform[4]);
            
            const rowText = closestRowItems.map(item => item.str).join(' ').trim();
            if (rowText && !this.isColumnHeader(rowText)) {
                additionalLines.push(rowText);
            }
        }
        
        return additionalLines;
    }

    /**
     * Check if a value is a column header
     * @param {string} value - Value to check
     * @returns {boolean} True if the value is a column header
     */
    isColumnHeader(value) {
        const headers = ['כתובת', 'מס', 'עצים', 'שם העץ', 'הסיבה', 'הבקשה', 'מס רישיון', 'תאריך', 'שם המבקש', 'גוש', 'חלקה', 'רשימת רישיונות כריתה'];
        return headers.includes(value.trim());
    }

    /**
     * Fix common address issues
     * @param {string} address - Address to fix
     * @returns {string} Fixed address
     */
    fixAddress(address) {
        if (!address) return '';
        
        // Fix "הרכב ת" to "הרכבת"
        if (address.includes('הרכב ת')) {
            address = address.replace('הרכב ת', 'הרכבת');
        }
        
        return address;
    }

    /**
     * Extract street and house number from address
     * @param {string} address - Address to extract from
     * @returns {Object} Street and house number
     */
    extractAddressParts(address) {
        if (!address) return { street: null, houseNumber: null };
        
        // Match a number at the end of the string or followed by a space
        const numberMatch = address.match(/(\d+)($|\s)/);
        
        if (numberMatch) {
            const houseNumber = numberMatch[1];
            // Get everything before the house number
            const street = address.substring(0, numberMatch.index).trim();
            return { street, houseNumber };
        } else {
            // If no number found, return the entire address as street
            return { street: address, houseNumber: null };
        }
    }

    /**
     * Transform to TreePermit object
     * @param {Object} originalEntry - Original entry from PDF
     * @param {string} pdfUrl - URL of the PDF
     * @returns {TreePermit} Tree permit object
     */
    transformToTreePermit(originalEntry, pdfUrl) {
        // Extract street and house number from address
        const addressParts = this.extractAddressParts(originalEntry.address);
        
        // Create the tree notes array
        const treeNotes = [{
            name: originalEntry.treeType || null,
            amount: originalEntry['מס עצים'] ? parseInt(originalEntry['מס עצים']) : null
        }];
        const resourceId = generateResourceId(originalEntry, addressParts);

        // Create dates object for PermitDates
        const permitDatesData = {
            startDate: originalEntry.date || null,
            endDate: originalEntry.date || null,
            licenseDate: originalEntry.date || null,
            printDate: originalEntry.date || null
        };
        
        // Create TreePermit object
        return new TreePermit({
            permitNumber: originalEntry.licenseNumber || null,
            licenseType: originalEntry.requestType || null,
            address: addressParts.street || null,
            houseNumber: addressParts.houseNumber || null,
            settlement: "פתח תקווה",
            gush: originalEntry.block || null,
            helka: originalEntry.parcel || null,
            reasonShort: originalEntry.reason || null,
            reasonDetailed: null,
            licenseOwnerName: originalEntry.applicant || null,
            licenseOwnerId: null,
            licenseIssuerName: null,
            licenseIssuerRole: null,
            licenseIssuerPhoneNumber: null,
            licenseApproverName: null,
            approverTitle: null,
            licenseStatus: null,
            originalRequestNumber: null,
            forestPlotDetails: null,
            treeNotes: treeNotes,
            dates: permitDatesData,
            resourceUrl: pdfUrl || null,
            resourceId: resourceId
        });
    }

    /**
     * Merge entries with the same license number
     * @param {Array} entries - Entries to merge
     * @returns {Array} Merged entries
     */
    mergeEntriesWithSameLicense(entries) {
        // Group entries by license number
        const entriesByLicense = {};
        
        entries.forEach(entry => {
            const licenseNumber = entry.permitNumber;
            
            if (!entriesByLicense[licenseNumber]) {
                entriesByLicense[licenseNumber] = entry;
            } else {
                // For an existing license, merge the tree notes
                const existingEntry = entriesByLicense[licenseNumber];
                
                // Add the current entry's tree to the existing entry's tree_notes array
                if (entry.treeNotes && entry.treeNotes.length > 0) {
                    const newTree = entry.treeNotes[0];
                    if (newTree.name) {
                        existingEntry.treeNotes.push(newTree);
                    }
                }
            }
        });
        
        // Convert the grouped entries back to an array
        return Object.values(entriesByLicense);
    }

    /**
     * Text-based parsing (fallback method)
     * @param {string} rawText - Raw text from PDF
     * @param {string} pdfUrl - URL of the PDF
     * @returns {Array} Extracted license entries
     */
    extractLicenseEntriesFromText(rawText, pdfUrl) {
        // Split the text into lines and remove empty ones
        const lines = rawText.split('\n').filter(line => line.trim().length > 0);
        
        // Identify license numbers (4-digit numbers starting with 3 or 4)
        const entries = [];
        const licenseNumberRegex = /\b[3-4]\d{3}\b/;
        
        // Process each line to find license numbers
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const licenseMatch = line.match(licenseNumberRegex);
            
            if (licenseMatch) {
                const licenseNumber = licenseMatch[0];
                
                // Create a new entry object
                const entry = {
                    licenseNumber: licenseNumber,
                    rawData: {}
                };
                
                // Set license number
                entry.rawData['מס רישיון'] = licenseNumber;
                
                // Extract other data from the line and surrounding lines
                this.extractDataForLicense(entry, line, i, lines);
                
                // Add entry if it has enough data
                if (Object.keys(entry.rawData).length > 1) {
                    // Transform to TreePermit object
                    const transformedEntry = this.transformToTreePermit(entry, pdfUrl);
                    entries.push(transformedEntry);
                }
            }
        }
        
        // Merge entries with the same license number
        const mergedEntries = this.mergeEntriesWithSameLicense(entries);
        
        return mergedEntries;
    }

    /**
     * Extract data for a license from text lines (fallback method)
     * @param {Object} entry - License entry to populate
     * @param {string} line - Current line with license number
     * @param {number} lineIndex - Index of current line
     * @param {Array} allLines - All text lines
     */
    extractDataForLicense(entry, line, lineIndex, allLines) {
        // Extract date (looks like DD/MM/YYYY)
        const dateRegex = /\d{2}\/\d{2}\/\d{4}/;
        const dateMatch = line.match(dateRegex);
        if (dateMatch) {
            entry.date = dateMatch[0];
            entry.rawData['תאריך'] = entry.date;
        }
        
        // Remove license number for cleaner processing
        let processedLine = line.replace(new RegExp('\\b' + entry.licenseNumber + '\\b'), '');
        
        // Extract request type (typically "כריתה" or "העתקה")
        const requestTypes = ["כריתה", "העתקה", "גיזום"];
        for (const type of requestTypes) {
            if (processedLine.includes(type)) {
                entry.requestType = type;
                entry.rawData['הבקשה'] = type;
                processedLine = processedLine.replace(type, '');
                break;
            }
        }
        
        // Extract tree count (numeric values)
        const treeCountMatch = processedLine.match(/\b\d+\b/);
        if (treeCountMatch && !entry.date || (entry.date && !entry.date.includes(treeCountMatch[0]))) {
            entry['מס עצים'] = treeCountMatch[0];
            entry.rawData['מס עצים'] = entry['מס עצים'];
            processedLine = processedLine.replace(treeCountMatch[0], '');
        }
        
        // Extract address (look for Hebrew words and numbers)
        const addressPattern = /[\u0590-\u05FF\s]+\d+|[\u0590-\u05FF\s]+/;
        const addressMatch = processedLine.match(addressPattern);
        if (addressMatch) {
            const possibleAddress = addressMatch[0].trim();
            // Ensure it's not just the license number or a very short string
            if (possibleAddress.length > 2 && !possibleAddress.includes(entry.licenseNumber)) {
                entry.address = this.fixAddress(possibleAddress);
                entry.rawData['כתובת'] = entry.address;
                processedLine = processedLine.replace(possibleAddress, '');
            }
        }
        
        // Look for additional address info in surrounding lines
        if (!entry.address || entry.address.length < 10) {
            // Look at the previous and next lines for address information
            const surroundingLines = [];
            if (lineIndex > 0) surroundingLines.push(allLines[lineIndex - 1]);
            if (lineIndex < allLines.length - 1) surroundingLines.push(allLines[lineIndex + 1]);
            
            for (const surroundingLine of surroundingLines) {
                const surAddressMatch = surroundingLine.match(addressPattern);
                if (surAddressMatch && !surroundingLine.match(/\b[3-4]\d{3}\b/)) {
                    const additionalAddress = surAddressMatch[0].trim();
                    if (additionalAddress.length > 5) {
                        if (!entry.address) {
                            entry.address = this.fixAddress(additionalAddress);
                            entry.rawData['כתובת'] = entry.address;
                        } else {
                            entry.address = `${entry.address} ${this.fixAddress(additionalAddress)}`;
                            entry.rawData['כתובת'] = entry.address;
                        }
                        break;
                    }
                }
            }
        }
        
        // Look for tree species names
        const treeSpeciesPattern = /אורן|ברוש|אקליפטוס|תמר|דקל|זית|אלון|פיקוס|ושינגטוניה|איקליפטוס/;
        const treeSpeciesMatch = processedLine.match(treeSpeciesPattern);
        if (treeSpeciesMatch) {
            // Get the tree species and potentially a word or two around it
            const startIndex = Math.max(0, processedLine.indexOf(treeSpeciesMatch[0]) - 10);
            const endIndex = Math.min(processedLine.length, processedLine.indexOf(treeSpeciesMatch[0]) + treeSpeciesMatch[0].length + 10);
            const treeContext = processedLine.substring(startIndex, endIndex);
            
            // Extract the tree name and any Hebrew words directly connected to it
            const treeNameMatch = treeContext.match(/[\u0590-\u05FF\s]+/);
            if (treeNameMatch) {
                entry.treeType = treeNameMatch[0].trim();
                entry.rawData['שם העץ'] = entry.treeType;
                processedLine = processedLine.replace(treeSpeciesMatch[0], '');
            }
        }
        
        // Extract reason (common reason phrases)
        const reasonPatterns = [/בטיחות/, /מחלה/, /מסוכן/, /בניה/, /פיתוח/, /תשתית/];
        for (const pattern of reasonPatterns) {
            const reasonMatch = processedLine.match(pattern);
            if (reasonMatch) {
                // Get some context around the reason
                const startIndex = Math.max(0, processedLine.indexOf(reasonMatch[0]) - 5);
                const endIndex = Math.min(processedLine.length, processedLine.indexOf(reasonMatch[0]) + reasonMatch[0].length + 15);
                const reasonContext = processedLine.substring(startIndex, endIndex);
                
                entry.reason = reasonContext.trim();
                entry.rawData['הסיבה'] = entry.reason;
                processedLine = processedLine.replace(pattern, '');
                break;
            }
        }
        
        // Extract block and parcel
        const blockPattern = /\b\d{4}\b/;  // Block is usually a 4-digit number
        const blockMatch = line.match(blockPattern);
        if (blockMatch && blockMatch[0] !== entry.licenseNumber) {
            entry.block = blockMatch[0];
            entry.rawData['גוש'] = entry.block;
        }
        
        // Check for parcel after removing other known numbers
        let lineWithoutKnownNumbers = line
            .replace(new RegExp('\\b' + entry.licenseNumber + '\\b'), '')
            .replace(dateRegex, '')
            .replace(/\b\d{4}\b/, ''); // Remove block numbers
        
        const parcelPattern = /\b\d{1,3}\b/; // Parcel is usually a 1-3 digit number
        const parcelMatch = lineWithoutKnownNumbers.match(parcelPattern);
        if (parcelMatch) {
            entry.parcel = parcelMatch[0];
            entry.rawData['חלקה'] = entry.parcel;
        }
    }
}

function generateResourceId(originalEntry, addressParts) {
    const parts = [];

    // Most reliable: always include permitNumber
    const permitNumber = originalEntry.licenseNumber;
    if (!permitNumber) {
        throw new Error("Cannot generate resourceId: missing permitNumber");
    }
    parts.push(`permit-${permitNumber}`);

    // Add optional parts for extra uniqueness
    if (addressParts?.houseNumber) {
        parts.push(`house-${addressParts.houseNumber}`);
    }

    if (addressParts?.street) {
        parts.push(`street-${addressParts.street.replace(/\s+/g, '-')}`);
    }

    if (originalEntry.block) {
        parts.push(`gush-${originalEntry.block}`);
    }

    if (originalEntry.parcel) {
        parts.push(`helka-${originalEntry.parcel}`);
    }

    return parts.join('_').toLowerCase();
}

module.exports = { PetahTikvaPdfParser };
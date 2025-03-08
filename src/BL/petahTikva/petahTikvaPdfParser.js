class PetahTikvaPdfParser {
    constructor() {
        // Hebrew field mappings (RTL)
        this.fieldMappings = {
            addressField: 'כתובת',
            treeCountField: 'מס עצים',
            treeTypeField: 'שם העץ',
            reasonField: 'הסיבה',
            requestTypeField: 'הבקשה',
            licenseNumberField: 'מס רישיון',
            dateField: 'תאריך',
            applicantField: 'שם המבקש',
            blockField: 'גוש',
            parcelField: 'חלקה'
        };

        // Known tree species in Hebrew (common in Petah Tikva reports)
        this.knownTreeSpecies = [
            'ברוש מצוי',
            'סיגלון עלה-מימוזה',
            'אזדרכת מצויה',
            'פלומריה ריחנית',
            'קתרוסית מרובעת',
            'תמר מצוי-דקל',
            'קליסטמון',
            'פנסית דו-נוצתית',
            'אקליפטוס',
            'דקל וושינגטוניה',
            'אלון',
            'שיטה',
            'פיקוס',
            'צאלון'
        ];

        // Known reason values in Hebrew
        this.knownReasons = [
            'בניה',
            'עץ מת',
            'מנוון',
            'מסוכן',
            'בטיחות'
        ];

        // Recognizing patterns for various fields
        this.patterns = {
            headerPattern: /רשימת רישיונות כריתה/,
            addressLine: /^[\u0590-\u05FF\s\d'-]+\s+\d+$/,
            treeType: /^[\u0590-\u05FF\s-]+$/,
            reason: new RegExp(`(${this.knownReasons.join('|')})`),
            requestType: /(כריתה|העתקה)/,
            date: /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
            licenseNumber: /\b(\d{4})\b/,
            applicant: /^[\u0590-\u05FF\s\d"'.]+$/
        };
    }

    /**
     * Enhanced RTL text normalization for proper display
     * @param {string} text - The text to normalize
     * @returns {string} Normalized text with proper RTL marks
     */
    normalizeRtlText(text) {
        if (!text) return text;
        
        // Add RTL mark at the beginning of each line to ensure proper direction
        // \u200F is the Right-to-Left Mark (RLM)
        // Also add the Unicode Bidirectional Override U+202E to force RTL direction
        return text.split('\n')
            .map(line => {
                // Only add RLM if the line contains Hebrew characters
                if (/[\u0590-\u05FF]/.test(line)) {
                    // Use a stronger approach with RLM and RTL embedding
                    return '\u202B' + line.replace(/[\u200F\u202B\u202E]/g, '');
                }
                return line;
            })
            .join('\n');
    }

    /**
     * Enhanced method to fix RTL word order that properly handles complex Hebrew text
     * @param {string} text - The text to fix
     * @returns {string} Fixed text with proper RTL word order
     */
    fixRtlWordOrder(text) {
        if (!text) return text;
        
        // Split by lines and process each line
        const lines = text.split('\n');
        const processedLines = [];
        
        for (const line of lines) {
            // Skip empty lines
            if (!line.trim()) {
                processedLines.push(line);
                continue;
            }
            
            // For lines with Hebrew content, we need special handling
            if (/[\u0590-\u05FF]/.test(line)) {
                // First, identify "chunks" - these are logical groups in the line
                // A chunk might be an address, a tree name, a reason, etc.
                const chunks = this.identifyChunks(line);
                
                // We don't reverse the whole line, but process each chunk appropriately
                let processedLine = '';
                
                for (const chunk of chunks) {
                    if (chunk.type === 'hebrew') {
                        // For pure Hebrew text, keep it as is - proper RTL marks will handle display
                        processedLine += chunk.text;
                    } else if (chunk.type === 'mixed') {
                        // For mixed content, carefully handle the order
                        processedLine += this.processMixedChunk(chunk.text);
                    } else {
                        // Non-Hebrew chunks stay as they are
                        processedLine += chunk.text;
                    }
                }
                
                processedLines.push(processedLine);
            } else {
                // For non-Hebrew lines, keep as is
                processedLines.push(line);
            }
        }
        
        return processedLines.join('\n');
    }
    
    /**
     * Identify logical chunks in a line of text
     * @param {string} line - Line to process
     * @returns {Array} Array of chunk objects
     */
    identifyChunks(line) {
        const chunks = [];
        let currentChunk = { text: '', type: null };
        
        // Pattern to detect potential chunk boundaries
        const chunkBoundaryPattern = /[\t\s]{2,}/;
        
        // Split by potential chunk boundaries but keep the separator
        const parts = line.split(new RegExp(`(${chunkBoundaryPattern.source})`));
        
        for (const part of parts) {
            // Skip empty parts
            if (!part) continue;
            
            // If it's a chunk boundary, add the current chunk and reset
            if (chunkBoundaryPattern.test(part)) {
                if (currentChunk.text) {
                    chunks.push(currentChunk);
                }
                chunks.push({ text: part, type: 'separator' });
                currentChunk = { text: '', type: null };
            } else {
                // Determine the type of this part
                const type = this.getChunkType(part);
                
                // If we already have a chunk and the type is different, create a new chunk
                if (currentChunk.type && type !== currentChunk.type) {
                    chunks.push(currentChunk);
                    currentChunk = { text: part, type };
                } else {
                    // Add to current chunk
                    currentChunk.text += part;
                    currentChunk.type = type;
                }
            }
        }
        
        // Add the last chunk if any
        if (currentChunk.text) {
            chunks.push(currentChunk);
        }
        
        return chunks;
    }
    
    /**
     * Determine the type of a text chunk
     * @param {string} text - Text to check
     * @returns {string} Type of chunk: "hebrew", "number", "mixed", or "other"
     */
    getChunkType(text) {
        // Pure Hebrew text
        if (/^[\u0590-\u05FF\s]+$/.test(text)) {
            return "hebrew";
        }
        
        // Pure numbers
        if (/^\d+$/.test(text)) {
            return "number";
        }
        
        // Mixed Hebrew and other characters
        if (/[\u0590-\u05FF]/.test(text)) {
            return "mixed";
        }
        
        // Other
        return "other";
    }
    
    /**
     * Process mixed content chunks (containing both Hebrew and non-Hebrew)
     * @param {string} text - Mixed content chunk
     * @returns {string} Processed text
     */
    processMixedChunk(text) {
        // For mixed content with both Hebrew and non-Hebrew, 
        // we need to handle with care
        
        // For tree names with hyphens (like "סיגלון עלה-מימוזה"), keep them together
        if (this.looksLikeTreeName(text)) {
            return text;
        }
        
        // For addresses with numbers, keep the structure intact
        if (this.isAddressLine(text)) {
            return text;
        }
        
        // For other mixed content, try to maintain logical word order
        // This is complex and may require domain-specific rules
        
        // Detect potential word boundaries within the mixed chunk
        const words = text.split(/\s+/);
        
        // If it's a short mixed phrase, keep it intact
        if (words.length <= 3) {
            return text;
        }
        
        // For longer phrases, assume a logical structure that RTL display will handle correctly
        return text;
    }
    
    /**
     * Check if text looks like a tree name
     * @param {string} text - Text to check
     * @returns {boolean} Whether it looks like a tree name
     */
    looksLikeTreeName(text) {
        // Common tree name patterns in Hebrew
        // Most tree names are 2-3 words with potential hyphens
        const treeNamePattern = /^[\u0590-\u05FF\s-]+$/;
        const wordCount = text.split(/\s+/).length;
        
        return treeNamePattern.test(text) && wordCount <= 3;
    }

    /**
     * Improved preprocessing for Hebrew text from PDF
     * @param {string} rawText - The raw text from PDF
     * @returns {string} Properly processed text for parsing
     */
    preprocessText(rawText) {
        if (!rawText) return '';
        
        // 1. Normalize line endings
        let processedText = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        
        // 2. Remove extra spaces
        processedText = processedText.replace(/\s{2,}/g, ' ').trim();
        
        // 3. Fix RTL word order (this handles Hebrew text properly)
        processedText = this.fixRtlWordOrder(processedText);
        
        // 4. Add RTL marks for proper display
        processedText = this.normalizeRtlText(processedText);
        
        // 5. Handle combining characters and normalize Unicode
        processedText = processedText.normalize('NFC');
        
        return processedText;
    }

    /**
     * Enhanced pattern matching for address lines
     * @param {string} line - Line to check
     * @returns {boolean} Whether this is an address line
     */
    isAddressLine(line) {
        // Address in Hebrew will usually end with a number (street number)
        // and will contain only Hebrew characters, spaces, digits and punctuation
        return (/[\u0590-\u05FF]/.test(line) && 
                /\d+$/.test(line.trim()) && 
                line.length < 50);
    }
    
    /**
     * Enhanced pattern matching for tree type
     * @param {string} line - Line to check
     * @returns {boolean} Whether this is a tree type line
     */
    isTreeTypeLine(line) {
        // Remove RTL marks for comparison
        const cleanLine = line.replace(/[\u200F\u202B\u202E]/g, '').trim();
        
        // Common tree names in Hebrew (partial list, can be expanded)
        const commonTreeNames = [
            'ברוש', 'אורן', 'אקליפטוס', 'דקל', 'תמר', 'אלון',
            'זית', 'תאנה', 'רימון', 'הדר', 'אזדרכת', 'סיסם',
            'שיטה', 'צאלון', 'פיקוס', 'סיגלון', 'מילה', 'כליל',
            'אלביציה', 'אדר', 'ערמון', 'מגנוליה', 'פלומריה',
            'קליסטמון', 'פנסית', 'קתרוסית'
        ];
        
        // Check if the line contains any common tree name
        const hasCommonTreeName = commonTreeNames.some(treeName => cleanLine.includes(treeName));
        
        // Tree types are fully Hebrew names, typically 1-3 words with possible hyphens
        // Exclude lines that contain field names or known reasons
        return (this.patterns.treeType.test(cleanLine) && 
                !cleanLine.includes(this.fieldMappings.treeTypeField) && 
                !this.isReasonLine(cleanLine) &&
                cleanLine.length < 40 &&
                cleanLine.split(/\s+/).length <= 3 &&
                (hasCommonTreeName || /מצוי|ריחני|עלה/.test(cleanLine)));
    }
    
    /**
     * Enhanced pattern matching for reason lines
     * @param {string} line - Line to check
     * @returns {boolean} Whether this contains a known reason
     */
    isReasonLine(line) {
        // Clean the line of any RTL marks for comparison
        const cleanLine = line.replace(/[\u200F\u202B\u202E]/g, '').trim();
        
        // Check if the line contains one of the known reasons
        // For a reason line, it should typically be just the reason without much else
        return this.knownReasons.some(reason => 
            cleanLine.includes(reason) && cleanLine.length < 20
        );
    }

    /**
     * Extract reason from text
     * @param {string} text - Text to extract reason from
     * @returns {string|null} Extracted reason or null
     */
    extractReason(text) {
        // Clean the text of any RTL marks for comparison
        const cleanText = text.replace(/[\u200F\u202B\u202E]/g, '').trim();
        
        // Try to find an exact match first (more reliable)
        for (const reason of this.knownReasons) {
            // Look for exact reason (with possible word boundaries)
            const exactPattern = new RegExp(`\\b${reason}\\b`);
            if (exactPattern.test(cleanText)) {
                return reason;
            }
        }
        
        // If no exact match, look for partial matches
        for (const reason of this.knownReasons) {
            if (cleanText.includes(reason)) {
                return reason;
            }
        }
        
        return null;
    }
    
    /**
     * Enhanced method to extract details from a line of text
     * @param {string} line - The line to process
     * @param {object} permit - The permit object to update
     */
    extractDetailsFromLine(line, permit) {
        // Extract date
        const dateMatch = line.match(this.patterns.date);
        if (dateMatch) {
            try {
                const [fullMatch, day, month, year] = dateMatch;
                permit.licenseDate = `${day}/${month}/${year}`;
            } catch (e) {
                console.error('Error parsing date:', e);
            }
        }
        
        // Extract request type
        if (line.includes('כריתה')) {
            permit.requestType = 'כריתה'; // Cutting
        } else if (line.includes('העתקה')) {
            permit.requestType = 'העתקה'; // Transfer
        }
        
        // Extract reason if not already set
        if (!permit.reason) {
            const extractedReason = this.extractReason(line);
            if (extractedReason) {
                permit.reason = extractedReason;
            }
        }
        
        // Split the line into parts
        const parts = line.split(/\s+/);
        
        // Extract applicant - look for sequence of Hebrew words
        const hebrewNamePattern = /^[\u0590-\u05FF\s"'.]+$/;
        let applicantParts = [];
        let inApplicant = false;
        
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            
            // Skip non-Hebrew parts until we find Hebrew
            if (!inApplicant && !/[\u0590-\u05FF]/.test(part)) {
                continue;
            }
            
            // Check if this could be part of a name
            if (/[\u0590-\u05FF]/.test(part) || part === 'בע"מ' || part === 'בעמ') {
                inApplicant = true;
                applicantParts.push(part);
                continue;
            }
            
            // If we were in applicant mode but found non-Hebrew/non-name part
            if (inApplicant) {
                // If it's not a number or special character, end the applicant
                if (!/^\d+$/.test(part) && !/^[.,"'-]+$/.test(part)) {
                    break;
                }
            }
        }
        
        if (applicantParts.length > 0) {
            permit.applicant = applicantParts.join(' ');
        }
        
        // Extract numbers that could be block, parcel, license number, and tree count
        const numbers = parts.filter(part => /^\d+$/.test(part)).map(n => parseInt(n, 10));
        
        if (numbers.length >= 4) {
            // In the example, the pattern appears to be:
            // tree count, license number, date, block number, parcel number
            
            // Look for license number (4 digits)
            const licenseIndex = numbers.findIndex(n => n >= 1000 && n <= 9999);
            if (licenseIndex !== -1) {
                permit.licenseNumber = numbers[licenseIndex];
                
                // Block and parcel are typically the last two numbers
                if (licenseIndex < numbers.length - 2) {
                    permit.blockNumber = numbers[numbers.length - 2];
                    permit.parcelNumber = numbers[numbers.length - 1];
                }
                
                // Tree count is typically a small number at the beginning
                if (licenseIndex > 0) {
                    permit.treeCount = numbers[0];
                }
            } else {
                // Fallback to the original logic
                permit.treeCount = numbers[0];
                permit.blockNumber = numbers[numbers.length - 3];
                permit.parcelNumber = numbers[numbers.length - 2];
                permit.licenseNumber = numbers[numbers.length - 1];
            }
        } else if (numbers.length === 3) {
            // If only 3 numbers, use contextual clues to identify them
            const fourDigitIndex = numbers.findIndex(n => n >= 1000 && n <= 9999);
            
            if (fourDigitIndex !== -1) {
                // The 4-digit number is likely the license number
                permit.licenseNumber = numbers[fourDigitIndex];
                
                // Other numbers could be block/parcel or tree count
                const remainingNumbers = numbers.filter((_, i) => i !== fourDigitIndex);
                
                if (remainingNumbers.length >= 2) {
                    // Typically the larger number is the block
                    if (remainingNumbers[0] > remainingNumbers[1]) {
                        permit.blockNumber = remainingNumbers[0];
                        permit.parcelNumber = remainingNumbers[1];
                    } else {
                        permit.blockNumber = remainingNumbers[1];
                        permit.parcelNumber = remainingNumbers[0];
                    }
                }
                
                // If tree count is missing, assume 1
                if (!permit.treeCount) {
                    permit.treeCount = 1;
                }
            } else {
                // No 4-digit number found, fall back to original logic
                permit.treeCount = 1;
                permit.blockNumber = numbers[0];
                permit.parcelNumber = numbers[1];
                permit.licenseNumber = numbers[2];
            }
        } else if (numbers.length > 0) {
            // For cases with very few numbers
            // If there's a 4-digit number, it's likely the license
            const licenseCandidate = numbers.find(n => n >= 1000 && n <= 9999);
            if (licenseCandidate) {
                permit.licenseNumber = licenseCandidate;
            }
            
            // If there's only one small number at the beginning, it's likely the tree count
            if (numbers.length === 1 && numbers[0] < 100) {
                permit.treeCount = numbers[0];
            }
        }
    }

    /**
     * Process permits from lines of text
     * @param {string[]} lines - The lines to process
     * @param {number|null} defaultLicenseNumber - Default license number
     * @returns {object[]} The processed permits
     */
    processPermits(lines, defaultLicenseNumber) {
        const permits = [];
        let currentPermit = {};
        let currentAddress = null;
        let currentTreeType = null;
        let currentReason = null;
            
        // First pass: Identify all tree types and reasons in the document
        const allTreeTypes = new Set();
        const allReasons = new Set();
        
        for (const line of lines) {
            // Clean line for analysis
            const cleanLine = line.replace(/[\u200F\u202B\u202E]/g, '').trim();
            
            // Check for known tree species
            for (const species of this.knownTreeSpecies) {
                if (cleanLine.includes(species)) {
                    allTreeTypes.add(species);
                    break;
                }
            }
            
            // Extract any reason
            const reason = this.extractReason(cleanLine);
            if (reason) {
                allReasons.add(reason);
            }
        }
        
        
        // Second pass: Process lines to extract permits
        for (let i = 0; i < lines.length; i++) {
            // Clean line for analysis
            const line = lines[i].replace(/[\u200F\u202B\u202E]/g, '').trim();
            if (!line) continue;
            
            
            // Detect if this is an address line
            if (this.isAddressLine(line)) {
                
                // If we were building a permit, finalize it first
                if (Object.keys(currentPermit).length > 0) {
                    // Make sure the permit has at least address and tree type
                    if (currentPermit.address && (currentPermit.treeType || currentTreeType)) {
                        if (!currentPermit.treeType && currentTreeType) {
                            currentPermit.treeType = currentTreeType;
                        }
                        if (!currentPermit.reason && currentReason) {
                            currentPermit.reason = currentReason;
                        }
                        permits.push({...currentPermit});
                    }
                }
                
                // Start a new permit
                currentAddress = line;
                currentPermit = { address: line };
                continue;
            }
            
            // Detect tree type - check known species first
            let foundTreeType = false;
            for (const species of this.knownTreeSpecies) {
                if (line.includes(species)) {
                    currentTreeType = species;
                    currentPermit.treeType = species;
                    foundTreeType = true;
                    break;
                }
            }
            
            // If no known species found, try the pattern
            if (!foundTreeType && this.isTreeTypeLine(line)) {
                currentTreeType = line;
                currentPermit.treeType = line;
                continue;
            }
            
            // Detect reason
            const extractedReason = this.extractReason(line);
            if (extractedReason) {
                currentReason = extractedReason;
                currentPermit.reason = extractedReason;
                continue;
            }
            
            // Detect stand-alone license number
            if (/^\d{4}$/.test(line)) {
                currentPermit.licenseNumber = parseInt(line, 10);
                continue;
            }
            
            // Look for date and details line
            const dateMatch = line.match(this.patterns.date);
            if (dateMatch) {
                this.extractDetailsFromLine(line, currentPermit);
                
                // After a full details line, the permit is complete
                if (currentPermit.address) {
                    if (!currentPermit.treeType && currentTreeType) {
                        currentPermit.treeType = currentTreeType;
                    }
                    if (!currentPermit.reason && currentReason) {
                        currentPermit.reason = currentReason;
                    }
                    if (!currentPermit.licenseNumber && defaultLicenseNumber) {
                        currentPermit.licenseNumber = defaultLicenseNumber;
                    }
                    permits.push({...currentPermit});
                }
                
                // Reset for next permit but keep the address if available
                currentPermit = {};
                if (currentAddress) {
                    currentPermit.address = currentAddress;
                }
                continue;
            }
            
            // Check if this line is part of a structured data table
            // In the example, it appears that lines in the data table follow a pattern
            const hasStructuredData = 
                /\d/.test(line) && // Contains numbers
                /[\u0590-\u05FF]/.test(line) && // Contains Hebrew
                line.trim().split(/\s+/).length >= 3; // Has at least 3 words/tokens
                
            if (hasStructuredData) {
                
                // Extract tree type from line if not already set
                if (!currentPermit.treeType) {
                    for (const species of this.knownTreeSpecies) {
                        if (line.includes(species)) {
                            currentPermit.treeType = species;
                            break;
                        }
                    }
                }
                
                // Extract reason if not already set
                if (!currentPermit.reason) {
                    const reason = this.extractReason(line);
                    if (reason) {
                        currentPermit.reason = reason;
                    }
                }
                
                // Extract tree count if it looks like a number at the beginning
                const treeCountMatch = line.match(/^\s*(\d+)\s/);
                if (treeCountMatch && !currentPermit.treeCount) {
                    currentPermit.treeCount = parseInt(treeCountMatch[1], 10);
                }
                
                // Extract any other details
                this.extractDetailsFromLine(line, currentPermit);
            }
        }
        
        // Add the last permit if not already added
        if (Object.keys(currentPermit).length > 0 && currentPermit.address) {
            if (!currentPermit.treeType && currentTreeType) {
                currentPermit.treeType = currentTreeType;
            }
            if (!currentPermit.reason && currentReason) {
                currentPermit.reason = currentReason;
            }
            permits.push({...currentPermit});
        }
        
        return this.cleanupPermits(permits);
    }
    
    /**
     * Clean up permits by merging related ones and ensuring all fields are properly set
     * @param {object[]} permits - The permits to clean up
     * @returns {object[]} Cleaned up permits
     */
    cleanupPermits(permits) {
        // Group permits by address
        const addressGroups = {};
        
        for (const permit of permits) {
            if (!permit.address) continue;
            
            if (!addressGroups[permit.address]) {
                addressGroups[permit.address] = [];
            }
            addressGroups[permit.address].push(permit);
        }
        
        // Merge permits for each address
        const mergedPermits = [];
        
        for (const address in addressGroups) {
            const addressPermits = addressGroups[address];
            
            // If there's only one permit for this address, add it directly
            if (addressPermits.length === 1) {
                mergedPermits.push(addressPermits[0]);
                continue;
            }
            
            // If there are multiple permits for the same address
            // Group them by license number if available
            const licenseGroups = {};
            
            for (const permit of addressPermits) {
                const licenseKey = permit.licenseNumber ? permit.licenseNumber.toString() : 'unknown';
                
                if (!licenseGroups[licenseKey]) {
                    licenseGroups[licenseKey] = [];
                }
                licenseGroups[licenseKey].push(permit);
            }
            
            // For each license group, merge the permits
            for (const licenseKey in licenseGroups) {
                const licensePermits = licenseGroups[licenseKey];
                
                // If there's only one permit in this license group, add it directly
                if (licensePermits.length === 1) {
                    mergedPermits.push(licensePermits[0]);
                    continue;
                }
                
                // Merge multiple permits
                const mergedPermit = { address };
                
                // Merge all properties, preferring non-empty values
                for (const permit of licensePermits) {
                    for (const key in permit) {
                        if (key === 'address') continue; // Already set
                        
                        if (!mergedPermit[key] && permit[key]) {
                            mergedPermit[key] = permit[key];
                        }
                    }
                }
                
                mergedPermits.push(mergedPermit);
            }
        }
        
        return mergedPermits;
    }

    /**
     * Main entry point to parse a Petah Tikva PDF
     * @param {string} rawText - The raw text from the PDF
     * @param {number|null} defaultLicenseNumber - Default license number
     * @returns {object} The parsed data
     */
    async parsePetahTikvaPdf(rawText, defaultLicenseNumber = null) {
        try {
            if (!rawText) {
                throw new Error('No text content to parse');
            }

            
            // Preprocess the text to handle RTL properly
            const processedText = this.preprocessText(rawText);
            
            
            // Split the text into lines and filter empty lines
            const lines = processedText.split('\n').map(line => line.trim()).filter(line => line);
            
            // Extract the header line with date range
            let headerLine = null;
            for (const line of lines) {
                if (this.patterns.headerPattern.test(line)) {
                    headerLine = line;
                    break;
                }
            }
            
            
            // Find the table header line
            let headerIndex = -1;
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const cleanLine = line.replace(/[\u200F\u202B\u202E]/g, '');
                
                if (
                    cleanLine.includes(this.fieldMappings.addressField) || 
                    cleanLine.includes(this.fieldMappings.treeTypeField) || 
                    cleanLine.includes(this.fieldMappings.reasonField)
                ) {
                    headerIndex = i;
                    break;
                }
            }
            
            // If we couldn't find a header, use a reasonable default
            if (headerIndex === -1) {
                headerIndex = headerLine ? lines.indexOf(headerLine) + 2 : 0;
            }
            
            
            // Look for patterns in the data to validate field positions
            // Based on the example provided, analyze column positions
            const dataLines = lines.slice(headerIndex + 1);
            
            // Process permits
            const permits = this.processPermits(dataLines, defaultLicenseNumber);
            
            
            // Post-process permits to ensure all have proper reasons and tree types
            const enhancedPermits = this.enhancePermitData(permits, dataLines);
            
            // Group permits by address
            const permitsByAddress = {};
            for (const permit of enhancedPermits) {
                if (!permit.address) continue;
                
                if (!permitsByAddress[permit.address]) {
                    permitsByAddress[permit.address] = [];
                }
                permitsByAddress[permit.address].push(permit);
            }
            
            // Add RTL mark to all Hebrew text fields for proper display
            const finalPermits = enhancedPermits.map(permit => {
                const rtlPermit = {...permit};
                
                // Add RTL mark to Hebrew text fields (use RTL embedding for better display)
                for (const key in rtlPermit) {
                    if (typeof rtlPermit[key] === 'string' && /[\u0590-\u05FF]/.test(rtlPermit[key])) {
                        rtlPermit[key] = '\u202B' + rtlPermit[key].replace(/[\u200F\u202B\u202E]/g, '');
                    }
                }
                
                return rtlPermit;
            });
            
            return {
                licenseNumber: defaultLicenseNumber,
                headerInfo: headerLine ? '\u202B' + headerLine.replace(/[\u200F\u202B\u202E]/g, '') : null,
                permits: finalPermits,
                permitsByAddress: permitsByAddress
            };
            
        } catch (error) {
            console.error('Error parsing Petah-Tikva PDF:', error);
            throw error;
        }
    }
    
    /**
     * Enhanced post-processing of permit data to fix missing fields
     * @param {Array} permits - The extracted permits
     * @param {Array} dataLines - Original data lines for reference
     * @returns {Array} Enhanced permits with all fields populated
     */
    enhancePermitData(permits, dataLines) {
        const enhancedPermits = [];
        
        // Normalize and clean the data lines for comparison
        const normalizedLines = dataLines.map(line => 
            line.replace(/[\u200F\u202B\u202E]/g, '').trim()
        );
        
        // First, extract all tree types from the data for reference
        const treeTypes = this.extractAllTreeTypes(normalizedLines);
        
        // Extract all reasons for reference
        const reasons = this.extractAllReasons(normalizedLines);
        
        // Process each permit
        for (const permit of permits) {
            const enhancedPermit = {...permit};
            
            // If tree type is missing but we can find it by contextual clues, add it
            if (!enhancedPermit.treeType || enhancedPermit.treeType === this.fieldMappings.treeTypeField) {
                // Look for tree type in lines near this permit's address
                if (enhancedPermit.address) {
                    const addressIndex = normalizedLines.findIndex(line => 
                        line.includes(enhancedPermit.address.replace(/[\u200F\u202B\u202E]/g, ''))
                    );
                    
                    if (addressIndex !== -1) {
                        // Look at the next few lines for a tree type
                        for (let i = 1; i <= 3; i++) {
                            if (addressIndex + i < normalizedLines.length) {
                                const line = normalizedLines[addressIndex + i];
                                
                                // Check if this line might be a tree type
                                const potentialTreeType = treeTypes.find(type => line.includes(type));
                                if (potentialTreeType) {
                                    enhancedPermit.treeType = potentialTreeType;
                                    break;
                                }
                            }
                        }
                    }
                }
            }
            
            // If reason is missing but can be found, add it
            if (!enhancedPermit.reason) {
                // Look for reason in the permit's address line (sometimes they're combined)
                if (enhancedPermit.address) {
                    const cleanAddress = enhancedPermit.address.replace(/[\u200F\u202B\u202E]/g, '');
                    const foundReason = reasons.find(reason => cleanAddress.includes(reason));
                    
                    if (foundReason) {
                        enhancedPermit.reason = foundReason;
                    } else {
                        // Look in nearby lines
                        const addressIndex = normalizedLines.findIndex(line => 
                            line.includes(cleanAddress)
                        );
                        
                        if (addressIndex !== -1) {
                            // Look at surrounding lines for a reason
                            for (let i = -1; i <= 3; i++) {
                                if (addressIndex + i >= 0 && addressIndex + i < normalizedLines.length) {
                                    const line = normalizedLines[addressIndex + i];
                                    
                                    // Check for known reasons
                                    const foundReason = this.extractReason(line);
                                    if (foundReason) {
                                        enhancedPermit.reason = foundReason;
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }
            }
            
            // If tree count is missing, try to extract it
            if (!enhancedPermit.treeCount) {
                if (enhancedPermit.address) {
                    const addressIndex = normalizedLines.findIndex(line => 
                        line.includes(enhancedPermit.address.replace(/[\u200F\u202B\u202E]/g, ''))
                    );
                    
                    if (addressIndex !== -1) {
                        // In the example, tree count appears to be at the beginning of a row
                        const line = normalizedLines[addressIndex];
                        const treeCountMatch = line.match(/^\s*(\d+)\s/);
                        
                        if (treeCountMatch) {
                            enhancedPermit.treeCount = parseInt(treeCountMatch[1], 10);
                        }
                    }
                }
            }
            
            enhancedPermits.push(enhancedPermit);
        }
        
        return enhancedPermits;
    }
    
    /**
     * Extract all possible tree types from data
     * @param {Array} lines - Data lines
     * @returns {Array} List of tree types
     */
    extractAllTreeTypes(lines) {
        const treeTypes = new Set();
        
        for (const line of lines) {
            // Skip lines that don't look like they might contain a tree type
            if (!this.patterns.treeType.test(line)) continue;
            
            // Check if this line matches our tree type criteria
            if (this.isTreeTypeLine(line)) {
                treeTypes.add(line.trim());
            }
        }
        
        return Array.from(treeTypes);
    }
    
    /**
     * Extract all possible reasons from data
     * @param {Array} lines - Data lines
     * @returns {Array} List of reasons
     */
    extractAllReasons(lines) {
        const reasons = new Set();
        
        for (const line of lines) {
            const reason = this.extractReason(line);
            if (reason) {
                reasons.add(reason);
            }
        }
        
        return Array.from(reasons);
    }
}

module.exports = { PetahTikvaPdfParser };
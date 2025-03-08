const { PetahTikvaPdfParser } = require('./petahTikvaPdfParser');
const TreePermitRepository  = require('../../DAL/repositories/treePermitRepository');
const PermitDates = require('../../DAL/models/permitDates');

class PetahTikvaBatchProcessor {
    constructor(pdfDownloader, fileManager, pdfParser, batchSize) {
        this.pdfDownloader = pdfDownloader;
        this.fileManager = fileManager;
        this.pdfParser = pdfParser;
        this.batchSize = batchSize;
        this.customParser = new PetahTikvaPdfParser();
    }

    createBatches(pdfList) {
        const batches = [];
        for (let i = 0; i < pdfList.length; i += this.batchSize) {
            batches.push(pdfList.slice(i, i + this.batchSize));
        }
        return batches;
    }

    /**
     * Maps the reason from Petah Tikva format to standardized reason format
     * @param {string} ptReason - The reason from Petah Tikva permit
     * @returns {Object} Object containing reasonShort and reasonDetailed
     */
    mapReason(ptReason) {
        if (!ptReason) {
            return { reasonShort: null, reasonDetailed: null };
        }

        // Map Hebrew reasons to standardized formats
        const reasonMap = {
            'בניה': { short: 'בנייה', detailed: 'עץ מפריע לבניה' },
            'עץ מת': { short: 'עץ מת', detailed: 'עץ יבש' },
            'מנוון': { short: 'מחלת עץ', detailed: 'עץ מנוון' },
            'מסוכן': { short: 'בטיחות', detailed: 'עץ מסוכן' },
            'בטיחות': { short: 'בטיחות', detailed: 'גורם סכנה בטיחותית' }
        };

        const mappedReason = reasonMap[ptReason] || { short: 'אחר', detailed: ptReason };
        return {
            reasonShort: mappedReason.short,
            reasonDetailed: mappedReason.detailed
        };
    }

    /**
     * Convert a Petah Tikva permit to the TreePermit model format
     * @param {Object} permit - Single permit from Petah Tikva parser
     * @param {Object} metadata - Additional metadata about the permit
     * @returns {Object} TreePermit compatible object
     */
    convertToTreePermitFormat(permit, metadata) {
        if (!permit) return null;

        // Extract house number if included in the address
        let address = permit.address || '';
        let houseNumber = '';
        
        // Try to extract house number from address
        const addressMatch = address.match(/^(.+?)\s+(\d+.*)$/);
        if (addressMatch) {
            address = addressMatch[1];
            houseNumber = addressMatch[2];
        }

        // Map the reason
        const reasonInfo = this.mapReason(permit.reason);

        // Format the licenseDate
        let licenseDate = null;
        if (permit.licenseDate) {
            // Check if it's already in ISO format
            if (permit.licenseDate.includes('-')) {
                licenseDate = permit.licenseDate;
            } else {
                // Convert DD/MM/YYYY to ISO format
                const [day, month, year] = permit.licenseDate.split('/');
                licenseDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00.000Z`;
            }
        } else if (metadata.publishDate) {
            licenseDate = metadata.publishDate;
        }

        // Create dates object
        const dates = new PermitDates({
            startDate: null,
            endDate: null,
            licenseDate: licenseDate,
            printDate: licenseDate
        });

        // Create tree notes array
        const treeNotes = [];
        if (permit.treeType) {
            treeNotes.push({
                name: permit.treeType,
                amount: permit.treeCount || 1
            });
        }

        // Generate unique resource ID
        const resourceId = metadata.pdfUrl 
            ? metadata.pdfUrl.split('/').pop() + permit.licenseNumber
            : `petah-tikva-${permit.licenseNumber || Date.now()}.pdf`;

        return {
            permitNumber: permit.licenseNumber ? String(permit.licenseNumber) : String(metadata.licenseNumber || ''),
            licenseType: permit.requestType || 'כריתה',
            address: null,
            houseNumber: null,
            settlement: 'פתח תקווה',
            gush: permit.blockNumber ? String(permit.blockNumber) : null,
            helka: permit.parcelNumber ? String(permit.parcelNumber) : null,
            reasonShort: reasonInfo.reasonShort,
            reasonDetailed: reasonInfo.reasonDetailed,
            licenseOwnerName: null,
            licenseOwnerId: null,
            licenseIssuerName: null,
            licenseIssuerRole: 'פקיד יערות',
            licenseIssuerPhoneNumber: null,
            licenseApproverName: null,
            approverTitle: 'פקיד יערות העירוני פתח תקווה',
            licenseStatus: 'בתוקף',
            originalRequestNumber: null,
            forestPlotDetails: null,
            treeNotes: treeNotes,
            dates: dates,
            resourceUrl: metadata.pdfUrl || null,
            resourceId: resourceId,
            recordCreatedAt: new Date().toISOString()
        };
    }

    async processBatch(batch) {
        const results = [];
        const errors = [];

        for (const pdf of batch) {
            try {
                console.log(`Processing ${pdf.filename} for license ${pdf.licenseNumber}...`);
                
                // Get temporary file path
                const tempFilePath = await this.fileManager.getTempFilePath(pdf.filename);
                
                // Download PDF
                const downloadResult = await this.pdfDownloader.downloadPdf(pdf.pdfUrl, tempFilePath);
                if (!downloadResult) {
                    throw new Error(`Failed to download PDF: ${downloadResult.error}`);
                }
                
                // Process PDF - first try with the generic parser
                let rawText = null;
                let jsonData = null;
                
                try {
                    // Extract raw text
                    rawText = await this.pdfParser.extractRawText(tempFilePath);
                    
                    // Use our custom parser for Petah-Tikva PDFs
                    jsonData = await this.customParser.parsePetahTikvaPdf(rawText, pdf.licenseNumber);
                } catch (parseError) {
                    console.warn(`Error parsing PDF ${pdf.filename}:`, parseError.message);
                    errors.push({
                        filename: pdf.filename,
                        licenseNumber: pdf.licenseNumber,
                        stage: 'parsing',
                        error: parseError.message
                    });
                }
                
                // Save outputs
                if (jsonData || rawText) {
                    // await this.fileManager.saveOutputs(
                    //     pdf.filename,
                    //     jsonData,
                    //     rawText,
                    //     pdf.metadata
                    // );
                    
                    // Store data in repository
                    if (jsonData && jsonData.permits && jsonData.permits.length > 0) {
                        for (const permit of jsonData.permits) {
                            try {
                                // Convert to TreePermit format
                                const metadata = {
                                    pdfUrl: pdf.pdfUrl,
                                    licenseNumber: pdf.licenseNumber,
                                    publishDate: pdf.publishDate
                                };
                                
                                const treePermit = this.convertToTreePermitFormat(permit, metadata);
                                
                                // Insert into repository
                                await TreePermitRepository.insert(treePermit);
                            } catch (repoError) {
                                console.error(`Error storing permit in repository:`, repoError.message);
                                errors.push({
                                    filename: pdf.filename,
                                    licenseNumber: pdf.licenseNumber,
                                    stage: 'repository',
                                    error: repoError.message
                                });
                            }
                        }
                    }
                }
                
                results.push({
                    filename: pdf.filename,
                    licenseNumber: pdf.licenseNumber,
                    success: true,
                    hasJson: !!jsonData,
                    hasText: !!rawText,
                    errors: errors.filter(e => e.filename === pdf.filename)
                });
                
            } catch (error) {
                console.error(`Error processing ${pdf.filename}:`, error.message);
                results.push({
                    filename: pdf.filename,
                    licenseNumber: pdf.licenseNumber,
                    success: false,
                    error: error.message
                });
            }
        }
        
        return {
            results,
            errors
        };
    }
}

module.exports = { PetahTikvaBatchProcessor };
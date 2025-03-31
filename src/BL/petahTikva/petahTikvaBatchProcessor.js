const { PetahTikvaPdfParser } = require('./petahTikvaPdfParser');
const TreePermitRepository = require('../../DAL/repositories/treePermitRepository');
const PermitDates = require('../../DAL/models/permitDates');

class PetahTikvaBatchProcessor {
    constructor(pdfDownloader, fileManager, genericPdfParser, batchSize) {
        this.pdfDownloader = pdfDownloader;
        this.fileManager = fileManager;
        this.genericPdfParser = genericPdfParser;
        this.batchSize = batchSize;
        this.customParser = new PetahTikvaPdfParser();
    }

    /**
     * Create batches from PDF list
     * @param {Array} pdfList - List of PDFs to process
     * @returns {Array} Batches of PDFs for processing
     */
    createBatches(pdfList) {
        const batches = [];
        for (let i = 0; i < pdfList.length; i += this.batchSize) {
            batches.push(pdfList.slice(i, i + this.batchSize));
        }
        return batches;
    }

    /**
     * Process a batch of PDFs
     * @param {Array} batch - Batch of PDFs to process
     * @returns {Object} Results and errors from processing
     */
    async processBatch(batch) {
        const results = [];
        const errors = [];

        for (const pdf of batch) {
            try {
                console.log(`Processing ${pdf.filename} for license ${pdf.licenseNumber}...`);
                
                // Download the PDF first
                const tempFilePath = await this.fileManager.getTempFilePath(pdf.filename);
                const downloadResult = await this.pdfDownloader.downloadPdf(pdf.pdfUrl, tempFilePath);
                
                if (!downloadResult) {
                    throw new Error(`Failed to download PDF: ${pdf.pdfUrl}`);
                }
                
                // Process the PDF content
                const processedData = await this.processPdf(tempFilePath, pdf);
                
                // Store results
                results.push({
                    filename: pdf.filename,
                    licenseNumber: pdf.licenseNumber,
                    success: true,
                    hasJson: !!processedData.permits,
                    hasText: !!processedData.rawText,
                    permitCount: processedData.permits ? processedData.permits.length : 0,
                    errors: errors.filter(e => e.filename === pdf.filename)
                });
                
            } catch (error) {
                console.error(`Error processing ${pdf.filename}:`, error.message);
                errors.push({
                    filename: pdf.filename,
                    licenseNumber: pdf.licenseNumber,
                    stage: 'processing',
                    error: error.message
                });
                
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

    /**
     * Process a single PDF file
     * @param {string} tempFilePath - Path to the PDF file
     * @param {Object} pdfInfo - Information about the PDF
     * @returns {Object} Processed data including permits and raw text
     */
    async processPdf(tempFilePath, pdfInfo) {
        // Parse the PDF with our custom parser
        const jsonData = await this.customParser.parsePetahTikvaPdf(tempFilePath, pdfInfo.pdfUrl);
        
        // Save the extraction outputs if they exist
        if (jsonData || rawText) {
            // Save outputs to storage if needed
            // await this.fileManager.saveOutputs(pdfInfo.filename, jsonData, rawText, pdfInfo.metadata);
            
            // Store permits in repository if they exist
            if (jsonData && jsonData.permits && jsonData.permits.length > 0) {
                for (const permit of jsonData.permits) {
                    try {
                        // Tree permits are already in the correct format
                        await TreePermitRepository.insert(permit);
                    } catch (repoError) {
                        console.error(`Error storing permit in repository:`, repoError.message);
                        throw repoError;
                    }
                }
            }
        }
        
        return {
            permits: jsonData.permits || [],
            rawText
        };
    }
}

module.exports = { PetahTikvaBatchProcessor };
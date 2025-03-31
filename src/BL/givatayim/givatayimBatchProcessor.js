const {fieldMappings, replaceHebrewKeysWithEnglish, mappedToEnglish} = require('../../config/pdfFieldMappings');
const {mapToTreePermitModelWithCity} = require('./givatayimDalMapper');
const fs = require('fs').promises;
const TreePermit = require('../../DAL/models/treePermit');
const TreePermitRepository = require('../../DAL/repositories/treePermitRepository');

class GivatayimBatchProcessor {
    constructor(pdfDownloader, fileManager, pdfParser, batchSize, isProduction = true) {
        this.pdfDownloader = pdfDownloader;
        this.fileManager = fileManager;
        this.pdfParser = pdfParser;
        this.batchSize = batchSize;
        this.cityCode = 'GIVT'; // City code for Givatayim
        this.isProduction = isProduction;
    }

    createBatches(items) {
        const batches = [];
        for (let i = 0; i < items.length; i += this.batchSize) {
            batches.push(items.slice(i, i + this.batchSize));
        }
        return batches;
    }

    async processBatch(batch) {
        const batchResults = [];
        const errors = [];
        const skippedDueToDate = [];

        for (const item of batch) {
            const result = await this._processItem(item, errors, skippedDueToDate);
            batchResults.push(result);
        }

        return { results: batchResults, errors, skippedDueToDate };
    }

    async _processItem(pdf, errors, skippedDueToDate) {
        const tempFilePath = this.fileManager.getTempFilePath(pdf.filename);
        
        try {
            console.log(`Processing ${pdf.filename}...`);
            
            const downloaded = await this.pdfDownloader.downloadPdf(pdf.pdfUrl, tempFilePath);
            if (!downloaded) {
                throw new Error('Failed to download PDF');
            }

            const { jsonData, rawText } = await this._parsePdfContent(pdf, tempFilePath, errors);
            
            // Combine PDF metadata with extracted content
            const combinedData = {
                ...pdf,
                resourceData: {...jsonData},
                city: 'גבעתיים' // Add city information
            };

            // Map to the TreePermit model format with city information
            const mappedData = mapToTreePermitModelWithCity(combinedData, this.cityCode);
            const treePermitInstance = new TreePermit(mappedData);

            // Check if we should insert based on licenseDate when in production mode
            const shouldInsert = this._shouldInsertBasedOnDate(treePermitInstance);
            
            if (shouldInsert) {
                // Insert into the database
                await TreePermitRepository.insert(treePermitInstance);
            } else {
                skippedDueToDate.push({
                    filename: pdf.filename,
                    licenseDate: treePermitInstance.dates?.licenseDate
                });
            }

            return {
                filename: pdf.filename,
                success: true,
                hasJson: !!jsonData,
                hasText: !!rawText,
                inserted: shouldInsert,
                licenseDate: treePermitInstance.dates?.licenseDate,
                errors: errors.filter(e => e.filename === pdf.filename)
            };

        } catch (error) {
            console.error(`Error processing ${pdf.filename}:`, error.message);
            return {
                filename: pdf.filename,
                success: false,
                error: error.message
            };
        } finally {
            await this._cleanup(tempFilePath);
        }
    }

    _shouldInsertBasedOnDate(treePermit) {
        // If not in production mode, always insert
        if (!this.isProduction) {
            return true;
        }

        // In production mode, check if licenseDate is within the last 60 days
        if (!treePermit.dates || !treePermit.dates.licenseDate) {
            console.warn(`Missing licenseDate for permit ${treePermit.filename}, skipping in production mode`);
            return false;
        }

        const licenseDate = new Date(treePermit.dates.licenseDate);
        const now = new Date();
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(now.getDate() - 60);

        // Only insert if license date is within the last 60 days
        return licenseDate >= sixtyDaysAgo;
    }

    async _parsePdfContent(pdf, tempFilePath, errors) {
        let jsonData = null;
        let rawText = null;

        try {
            const result = await this.pdfParser.parsePdf(tempFilePath, fieldMappings);
            if (result) {
                jsonData = replaceHebrewKeysWithEnglish(result.jsonData || result, mappedToEnglish);
            }
        } catch (parseError) {
            this._logError(errors, pdf.filename, 'parsing', parseError);
        }

        try {
            rawText = await this.pdfParser.extractRawText(tempFilePath);
        } catch (textError) {
            this._logError(errors, pdf.filename, 'text extraction', textError);
        }

        return { jsonData, rawText };
    }

    _logError(errors, filename, stage, error) {
        console.warn(`Error in ${stage} for ${filename}:`, error.message);
        errors.push({
            filename,
            stage,
            error: error.message
        });
    }

    async _cleanup(tempFilePath) {
        try {
            await fs.unlink(tempFilePath);
        } catch (error) {
            console.warn(`Failed to delete temp file ${tempFilePath}`);
        }
    }
}

module.exports = { GivatayimBatchProcessor };
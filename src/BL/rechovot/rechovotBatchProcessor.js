const {fieldMappings, replaceHebrewKeysWithEnglish, mappedToEnglish} = require('../../config/pdfFieldMappings');
const {mapToTreePermitModel} = require('./mappers/dalMapper');
const fs = require('fs').promises;
const TreePermit = require('../../DAL/models/treePermit');
const TreePermitRepository = require('../../DAL/repositories/treePermitRepository');

class RechovotBatchProcessor {
    constructor(pdfDownloader, fileManager, pdfParser, batchSize) {
        this.pdfDownloader = pdfDownloader;
        this.fileManager = fileManager;
        this.pdfParser = pdfParser;
        this.batchSize = batchSize;
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

        for (const item of batch) {
            const result = await this._processItem(item, errors);
            batchResults.push(result);
        }

        return { results: batchResults, errors };
    }

    async _processItem(pdf, errors) {
        const tempFilePath = this.fileManager.getTempFilePath(pdf.filename);
        
        try {
            console.log(`Processing ${pdf.filename}...`);
            
            const downloaded = await this.pdfDownloader.downloadPdf(pdf.pdfUrl, tempFilePath);
            if (!downloaded) {
                throw new Error('Failed to download PDF');
            }

            const { jsonData, rawText } = await this._parsePdfContent(pdf, tempFilePath, errors);
            //Fix to download if the link is broken in some cases
            const combinedData = {
                ...pdf,
                pdfData: {...jsonData}
            };

            const mappedData = mapToTreePermitModel(combinedData);
            const treePermitInstance = new TreePermit(mappedData);

            await TreePermitRepository.insert(treePermitInstance);

            if (jsonData || rawText) {
                await this._saveResults(pdf, jsonData, rawText, errors);
            }



            return {
                filename: pdf.filename,
                success: true,
                hasJson: !!jsonData,
                hasText: !!rawText,
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

    async _saveResults(pdf, jsonData, rawText, errors) {
        try {
            await this.fileManager.saveOutputs(pdf.filename, jsonData, rawText, {
                address: pdf.address,
                licenseType: pdf.licenseType,
                date: pdf.date,
                pdfUrl: pdf.pdfUrl
            });
        } catch (saveError) {
            this._logError(errors, pdf.filename, 'saving', saveError);
        }
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


module.exports = {RechovotBatchProcessor};
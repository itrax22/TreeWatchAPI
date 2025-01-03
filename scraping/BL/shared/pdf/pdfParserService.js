const fs = require('fs');
const pdfParse = require('pdf-parse');
const { TextProcessor } = require('../utils/TextProcessor');
const { FileHandler } = require('../utils/FileHandler');
const { FieldExtractor } = require('./pdfFieldExtractor');


class PdfParserService {
    constructor(textProcessor, fileHandler, fieldExtractor) {
        this.textProcessor = textProcessor;
        this.fileHandler = fileHandler;
        this.fieldExtractor = fieldExtractor;
    }

    async parsePdf(filePath, fieldMappings) {
        try {
            const dataBuffer = await this.fileHandler.readFile(filePath);
            const data = await pdfParse(dataBuffer);
            
            const text = data.text;
            const rtlText = this.textProcessor.reverseHebrewText(text);
            
            await this.fileHandler.saveToFile('./rawTextHebrew.txt', rtlText);
            
            const result = this.fieldExtractor.processPdfText(rtlText, fieldMappings);
            
            console.log("Parsed Data Object:");
            console.log(result);
            
            await this.fileHandler.saveToFile(
                './parsedDataHebrew.json', 
                JSON.stringify(result, null, 2)
            );
            
            return result;
        } catch (error) {
            console.error("Error parsing PDF:", error);
            throw error;
        }
    }
}

module.exports = { PdfParserService };

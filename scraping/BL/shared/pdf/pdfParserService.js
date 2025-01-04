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
        
        // Define special characters that need escape sequences
        this.specialCharsMap = {
            '"': '\\"',
            '\\': '\\\\',
            '\b': '\\b',
            '\f': '\\f',
            '\n': '\\n',
            '\r': '\\r',
            '\t': '\\t',
            '\v': '\\v',
            '-': '-\\'
        };
    }

    escapeSpecialChars(str) {
        return str.replace(/[\\"\\\b\f\n\r\t\v-]/g, char => this.specialCharsMap[char] || char);
    }

    processTextItem(item) {
        // Check if the text contains special characters
        const hasSpecialChars = /[\\"\/\b\f\n\r\t\v]/.test(item.str);
        
        if (hasSpecialChars) {
            // Escape special characters while preserving the original text structure
            return this.escapeSpecialChars(item.str);
        }
        
        // If no special characters, return the original string
        return item.str;
    }

    render_page(pageData) {
        const render_options = {
            normalizeWhitespace: false,
            disableCombineTextItems: false
        };

        return pageData.getTextContent(render_options)
            .then(textContent => {
                let lastY, text = '';
                let currentLine = [];
                
                for (let item of textContent.items) {
                    const processedText = this.processTextItem(item);
                    if(processedText.includes('"')){
                        console.log('item',item)
                    }
                    if (lastY == item.transform[5] || !lastY) {
                        // Same line - accumulate text
                        currentLine.push(processedText);
                    } else {
                        // New line - process the accumulated line and start a new one
                        if (currentLine.length > 0) {
                            text += currentLine.join('') + '\n';
                            currentLine = [];
                        }
                        currentLine.push(processedText);
                    }
                    lastY = item.transform[5];
                }
                
                // Process the last line
                if (currentLine.length > 0) {
                    text += currentLine.join('');
                }

                // Process Hebrew text while preserving escaped special characters
                return this.textProcessor.reverseHebrewText(text);
            });
    }

    async parsePdf(filePath, fieldMappings) {
        try {
            const dataBuffer = await this.fileHandler.readFile(filePath);
            
            const options = {
                pagerender: this.render_page.bind(this)
            };

            const pdfData = await pdfParse(dataBuffer, options);
            const rawText = pdfData.text;
            const jsonData = await this.fieldExtractor.processPdfText(rawText, fieldMappings);

            return {
                jsonData,
                rawText
            };
        } catch (error) {
            console.error('Error parsing PDF:', error);
            throw error;
        }
    }

    async extractRawText(filePath) {
        try {
            const dataBuffer = await this.fileHandler.readFile(filePath);
            const options = {
                pagerender: this.render_page.bind(this)
            };

            const pdfData = await pdf(dataBuffer, options);
            return pdfData.text;
        } catch (error) {
            console.error('Error extracting raw text:', error);
            throw error;
        }
    }
}

module.exports = { PdfParserService };

const fs = require('fs');
const pdfParse = require('pdf-parse');
const { TextProcessor } = require('../utils/TextProcessor');
const { FileHandler } = require('../utils/FileHandler');
const { FieldExtractor } = require('./pdfFieldExtractor');
const { version } = require('os');

class PdfParserService {
    constructor(textProcessor, fileHandler, fieldExtractor) {
        this.textProcessor = textProcessor;
        this.fileHandler = fileHandler;
        this.fieldExtractor = fieldExtractor;
        
        // Characters to be treated as text in Hebrew with their escape sequences
        this.textFlowChars = {
            '(': '\u200e(\u200f',
            ')': '\u200e)\u200f',
            ',': '\u200e,\u200f',
            '.': '\u200e.\u200f',
            '"': '\u200e"\u200f',
            "'": "\u200e'\u200f"
        };
    }

    containsHebrew(str) {
        return /[\u0590-\u05FF]/.test(str);
    }

    processTextItem(item) {
        if (!item.str) return '';
        
        if (this.containsHebrew(item.str)) {
            let result = '';
            for (let char of item.str) {
                if (char in this.textFlowChars) {
                    result += this.textFlowChars[char];
                } else {
                    result += char;
                }
            }
            return result;
        }
        
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

                // Process Hebrew text while preserving the escape sequences
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

            const pdfData = await pdfParse(dataBuffer, options);
            return pdfData.text;
        } catch (error) {
            console.error('Error extracting raw text:', error);
            throw error;
        }
    }
}

module.exports = { PdfParserService };
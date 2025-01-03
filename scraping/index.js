const fs = require('fs').promises;
const path = require('path');
const { PdfParserService } = require('./BL/shared/pdf/PdfParserService');
const { TextProcessor } = require('./BL/shared/utils/TextProcessor');
const { FileHandler } = require('./BL/shared/utils/FileHandler');
const { FieldExtractor } = require('./BL/shared/pdf/pdfFieldExtractor');
const { fieldMappings,replaceHebrewKeysWithEnglish,mappedToEnglish } = require('./config/pdfFieldMappings');

async function saveOutputs(outputDir, pdfName, jsonData, rawText) {
    const baseName = path.parse(pdfName).name;
    
    // Add validation for the data
    if (!jsonData && !rawText) {
        throw new Error('Both jsonData and rawText are undefined');
    }

    // Save JSON if available
    if (jsonData) {
        const jsonPath = path.join(outputDir, `${baseName}.json`);
        await fs.writeFile(jsonPath, JSON.stringify(jsonData, null, 2), 'utf8');
    }

    // Save raw text if available
    if (rawText) {
        const rawPath = path.join(outputDir, `${baseName}.txt`);
        await fs.writeFile(rawPath, rawText, 'utf8');
    }
}

async function processDirectory(inputDir, outputDir) {
    try {
        await fs.mkdir(outputDir, { recursive: true });
    } catch (error) {
        if (error.code !== 'EEXIST') {
            throw error;
        }
    }

    const files = await fs.readdir(inputDir);
    const pdfFiles = files.filter(file => path.extname(file).toLowerCase() === '.pdf');

    if (pdfFiles.length === 0) {
        console.log('No PDF files found in input directory');
        return;
    }

    const textProcessor = new TextProcessor();
    const fileHandler = new FileHandler();
    const fieldExtractor = new FieldExtractor();
    
    const pdfParser = new PdfParserService(
        textProcessor,
        fileHandler,
        fieldExtractor
    );

    for (const pdfFile of pdfFiles) {
        const inputPath = path.join(inputDir, pdfFile);
        
        try {
            console.log(`Processing ${pdfFile}...`);
            
            // First, let's log the direct output from parsePdf
            const result = await pdfParser.parsePdf(inputPath, fieldMappings);
            console.log('Parser result:', result);

            // Check what we got from the parser
            if (!result) {
                throw new Error('Parser returned no results');
            }

            // If the parser doesn't return {jsonData, rawText}, let's adapt the output
            const jsonData = replaceHebrewKeysWithEnglish(result.jsonData || result, mappedToEnglish);

            const rawText = result.rawText || await pdfParser.extractRawText?.(inputPath) || JSON.stringify(result);
            
            // Log what we're about to save
            console.log('Saving with:', {
                hasJsonData: !!jsonData,
                jsonDataType: typeof jsonData,
                hasRawText: !!rawText,
                rawTextType: typeof rawText
            });

            await saveOutputs(outputDir, pdfFile, jsonData, rawText);
            console.log(`Successfully processed ${pdfFile}`);
        } catch (error) {
            console.error(`Error processing ${pdfFile}:`, {
                error: error.message,
                stack: error.stack
            });
            continue;
        }
    }
}

async function main() {
    const inputDir = './input';
    const outputDir = './output';
    
    try {
        await processDirectory(inputDir, outputDir);
        console.log('Finished processing all PDF files');
    } catch (error) {
        console.error('Error in main:', error);
        process.exit(1);
    }
}

main();
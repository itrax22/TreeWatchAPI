const fs = require('fs');
const pdfParse = require('pdf-parse');

/**
 * Parses a PDF file and processes its content based on configurable field mapping rules.
 * @param {string} filePath - Path to the PDF file.
 * @param {Array} fieldMappings - Configuration for key mappings and value extraction logic.
 * @returns {Object} Parsed data as a structured object.
 */
async function parsePdf(filePath, fieldMappings) {
    try {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdfParse(dataBuffer);

        const text = data.text;
        const rtlText = reverseHebrewText(text);

        saveToFile('./rawTextHebrew.txt', rtlText);

        const result = processPdfText(rtlText, fieldMappings);

        console.log("Parsed Data Object:");
        console.log(result);

        saveToFile('./parsedDataHebrew.json', JSON.stringify(result, null, 2));

        return result;
    } catch (error) {
        console.error("Error parsing PDF:", error);
    }
}

/**
 * Processes the text from the PDF into an object based on the field mappings.
 * @param {string} text - Raw text extracted from the PDF.
 * @param {Array} fieldMappings - Array of field mapping configurations.
 * @returns {Object} Processed data object.
 */
function processPdfText(text, fieldMappings) {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line !== '');
    const result = {};

    for (const mapping of fieldMappings) {
        const { key, value, untilKey } = mapping;

        for (let i = 0; i < lines.length; i++) {
            if (lines[i] === key) {
                if (value === 'nextLine') {
                    result[key] = lines[i + 1] || null;
                } else if (value.startsWith('next')) {
                    const count = parseInt(value.replace('next', ''), 10);
                    result[key] = lines.slice(i + 1, i + 1 + count).join(' ');
                } else if (value === 'untilKey') {
                    const endIndex = lines.slice(i + 1).findIndex(line => line === untilKey);
                    result[key] = lines.slice(i + 1, i + 1 + endIndex).join(' ');
                } else if (value === 'digitAndNamePattern') {
                    const extractedItems = [];
                    const validLinePattern = /^(\d+)([א-ת\s-]+)$/; // Number followed by valid Hebrew characters, spaces, and '-'

                    for (let j = i + 1; j < lines.length; j++) {
                        const line = lines[j];
                        const match = line.match(validLinePattern);

                        // Strict validation: stop if the line doesn't match the pattern
                        if (!match) {
                            break;
                        }

                        extractedItems.push({
                            name: match[2].trim(),
                            amount: parseInt(match[1], 10),
                        });
                    }

                    result[key] = extractedItems;
                }
                
                break;
            }
        }
    }

    return result;
}

/**
 * Reverses Hebrew text for right-to-left display.
 * @param {string} text - Raw text to reverse.
 * @returns {string} Reversed text.
 */
function reverseHebrewText(text) {
    return text.split('\n').map(line => line.split('').reverse().join('')).join('\n');
}

/**
 * Saves data to a file.
 * @param {string} filePath - Path to save the file.
 * @param {string} data - Data to save.
 */
function saveToFile(filePath, data) {
    fs.writeFileSync(filePath, data, { encoding: 'utf8' });
    console.log(`File saved to ${filePath}`);
}

// Example field mappings
const fieldMappings = [
    { key: 'מספר רשיון', value: 'nextLine' },
    { key: 'תאריך רישיון', value: 'nextLine' },
    { key: 'לביצוע )ז(רישיון ', value: 'nextLine' },
    { key: 'שם בעל הרשיון', value: 'nextLine' },
    { key: '.ז.ת', value: 'nextLine' },
    { key: 'טלפון', value: 'nextLine' },
    { key: 'סיבת הבקשה', value: 'nextLine' },
    { key: 'סיבה מילולית', value: 'nextLine' },
    { key: 'ישוב', value: 'nextLine' },
    { key: 'רחוב', value: 'nextLine' },
    { key: 'מס', value: 'nextLine' },
    { key: 'גוש', value: 'nextLine' },
    { key: 'חלקה', value: 'nextLine' },
    { key: 'תאריך הדפסה', value: 'nextLine' },
    { key: 'סטטוס הרשיון', value: 'nextLine' },
    { key: 'מתאריך', value: 'nextLine' },
    { key: 'שם נותן הרשיון', value: 'nextLine' },
    { key: 'תפקיד נותן הרשיון', value: 'nextLine' },
    { key: 'שם מאשר הרשיון', value: 'nextLine' },
    { key: 'תפקיד מאשר הרשיון', value: 'nextLine' },
    { key: 'מספר בקשה מקורית', value: 'nextLine' },
    { key: 'הערותמספר העציםמין העץ', value: 'digitAndNamePattern' },





    // { key: 'Address', value: 'next3' }, // Next 3 lines
    // { key: 'Summary', value: 'untilKey', untilKey: 'End' }, // Until 'End' key is encountered
];

// Path to your Hebrew PDF file
const filePath = './example.pdf';

// Parse the PDF with field mappings
parsePdf(filePath, fieldMappings);

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const XLSX = require('xlsx');
const NetanyaDateParser = require('./netanyaDateParser');

/**
 * Class for fetching and parsing Netanya tree licenses excel data
 */
class NetanyaExcelFetcher {
    constructor(excelUrl, outputDir, tempDir, httpsAgent) {
        this.excelUrl = excelUrl;
        this.outputDir = outputDir;
        this.tempDir = tempDir;
        this.httpsAgent = httpsAgent;
        this.dateParser = new NetanyaDateParser();
    }

    /**
     * Download the Excel file from the URL
     * @returns {Promise<string>} Path to the downloaded file
     */
    async downloadExcelFile() {
        try {
            console.log(`Downloading Excel file from ${this.excelUrl}...`);
            
            // Create temp directory if it doesn't exist
            await fs.mkdir(this.tempDir, { recursive: true });
            
            const tempFilePath = path.join(this.tempDir, 'netanya_tree_licenses.xlsx');
            
            const response = await axios({
                method: 'get',
                url: this.excelUrl,
                responseType: 'arraybuffer',
                httpsAgent: this.httpsAgent
            });
            
            await fs.writeFile(tempFilePath, response.data);
            console.log(`Excel file downloaded to ${tempFilePath}`);
            
            return tempFilePath;
        } catch (error) {
            console.error('Failed to download Excel file:', error.message);
            throw error;
        }
    }

    /**
     * Parse the Excel file into structured data
     * @param {string} filePath - Path to the Excel file
     * @returns {Promise<Array>} Array of license objects
     */
    async parseExcelFile(filePath) {
        try {
            console.log(`Parsing Excel file ${filePath}...`);
            
            // Read the Excel file
            const excelData = await fs.readFile(filePath);
            const workbook = XLSX.read(excelData, {
                type: 'buffer',
                cellStyles: true,
                cellDates: true
            });
            
            // Get the first sheet
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            
            // Convert to JSON
            const rawData = XLSX.utils.sheet_to_json(worksheet, { 
                header: 1,
                defval: '',
                raw: false
            });
            
            // Process the data and group by license ID
            return this._processRawData(rawData);
        } catch (error) {
            console.error('Failed to parse Excel file:', error.message);
            throw error;
        }
    }

    /**
     * Process raw data from Excel and group by license ID
     * @param {Array} rawData - Raw data from Excel
     * @returns {Array} Processed license objects
     */
    _processRawData(rawData) {
        // Define column mappings based on the provided example
        const columnNames = [
            'serial_number',           // מספר סידורי
            'intake_date',             // תאריך קליטה
            'requester_name',          // שם המבקש
            'request_address',         // כתובת הבקשה
            'tree_type',               // מין העץ
            'quantity',                // כמות
            'cutting',                 // כריתה
            'transfer_preservation',   // העתקה שימור
            'approval_status',         // דחיה/אישור
            'request_number',          // מספר בקשה
            'fee',                     // אגרה
            'approval_execution_date', // תאריך אישור ביצוע
            'execution_end_date',      // תאריך סיום ביצוע
            'license_number',          // מס' רישיון
            'appeal_until_date',       // ניתן לערער עד ליום
            'notes',                   // הערות
            'gush',                    // גוש
            'helka'                    // חלקה
        ];
        
        // Skip header rows (assumed to be first 4 rows based on example)
        const dataRows = rawData.slice(4);
        
        // Group by license ID
        const licenseMap = {};
        
        for (const row of dataRows) {
            // Skip empty or malformed rows
            if (!row || row.length < 5 || !row[0]) continue;
            
            // Create an object from the row data
            const rowData = {};
            for (let i = 0; i < columnNames.length && i < row.length; i++) {
                rowData[columnNames[i]] = row[i]?.toString().trim() || '';
            }
            
            // Skip if no valid serial number
            if (!rowData.serial_number || !/^\d+$/.test(rowData.serial_number)) continue;
            
            const licenseId = rowData.serial_number;
            
            // Initialize license if not exists
            if (!licenseMap[licenseId]) {
                licenseMap[licenseId] = {
                    ...rowData,
                    trees: []
                };
            }
            
            // Add tree details
            if (rowData.tree_type) {
                licenseMap[licenseId].trees.push({
                    treeType: rowData.tree_type,
                    quantity: parseInt(rowData.quantity || '1', 10),
                    action: rowData.cutting ? 'כריתה' : (rowData.transfer_preservation ? 'העתקה' : '')
                });
            }
        }
        
        return Object.values(licenseMap);
    }

    /**
     * Fetch and parse tree license data
     * @returns {Promise<Array>} Processed license data
     */
    async fetchData() {
        try {
            const filePath = await this.downloadExcelFile();
            const data = await this.parseExcelFile(filePath);
            
            // Clean up the temp file
            try {
                await fs.unlink(filePath);
            } catch (cleanupError) {
                console.warn(`Failed to clean up temp file: ${cleanupError.message}`);
            }
            
            return data;
        } catch (error) {
            console.error('Failed to fetch Excel data:', error.message);
            throw error;
        }
    }
}

module.exports = NetanyaExcelFetcher;
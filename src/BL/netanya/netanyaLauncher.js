const { constants } = require('../../constants');
const { HttpsAgentFactory } = require('../../config/https-agent');
const NetanyaExcelFetcher = require('./netanyaExcelFetcher');
const NetanyaMapper = require('./netanyaMapper');
const NetanyaFileManager = require('./netanyaFileManager');
const TreePermit = require('../../DAL/models/treePermit');
const TreePermitRepository = require('../../DAL/repositories/treePermitRepository');
const path = require('path');

/**
 * Main launcher for Netanya tree license data processing
 */
class NetanyaLauncher {
    constructor(isProduction = true) {
        // Initialize components
        this.httpsAgent = HttpsAgentFactory.create();
        this.fileManager = new NetanyaFileManager(
            constants.NETANYA_OUTPUT_DIR,
            constants.NETANYA_TEMP_DIR
        );
        this.excelFetcher = new NetanyaExcelFetcher(
            constants.NETANYA_EXCEL_URL,
            constants.NETANYA_OUTPUT_DIR,
            constants.NETANYA_TEMP_DIR,
            this.httpsAgent
        );
        this.mapper = new NetanyaMapper();
        this.batchSize = constants.NETANYA_BATCH_SIZE;
        this.isProduction = isProduction;
    }
    
    /**
     * Initialize directories
     */
    async initialize() {
        try {
            await this.fileManager.initialize();
            console.log('Netanya directories initialized.');
        } catch (error) {
            console.error('Failed to initialize directories:', error.message);
            throw error;
        }
    }
    
    /**
     * Clean up temporary files
     */
    async cleanup() {
        try {
            await this.fileManager.cleanup();
            console.log('Temporary files cleaned up.');
        } catch (error) {
            console.warn('Failed to clean up temp files:', error.message);
        }
    }
    
    /**
     * Check if a permit should be inserted based on license date
     * @param {Object} treePermit - Tree permit object
     * @returns {boolean} Whether the permit should be inserted
     */
    _shouldInsertBasedOnDate(treePermit) {
        // If not in production mode, always insert
        if (!this.isProduction) {
            return true;
        }

        // In production mode, check if licenseDate is within the last 60 days
        if (!treePermit.dates || !treePermit.dates.licenseDate) {
            console.warn(`Missing licenseDate for permit ${treePermit.permitNumber}, skipping in production mode`);
            return false;
        }

        const licenseDate = new Date(treePermit.dates.licenseDate);
        const now = new Date();
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(now.getDate() - 60);

        // Only insert if license date is within the last 60 days
        return licenseDate >= sixtyDaysAgo;
    }
    
    /**
     * Process data in batches
     * @param {Array} data - Array of data to process
     * @returns {Object} Processing results
     */
    async processBatchData(data) {
        console.log(`Processing ${data.length} licenses in batches of ${this.batchSize}...`);
        
        const batches = [];
        for (let i = 0; i < data.length; i += this.batchSize) {
            batches.push(data.slice(i, i + this.batchSize));
        }
        
        let successCount = 0;
        let skippedCount = 0;
        const errors = [];
        const skippedDueToDate = [];
        
        for (let i = 0; i < batches.length; i++) {
            console.log(`Processing batch ${i + 1} of ${batches.length}...`);
            const batch = batches[i];
            
            for (const item of batch) {
                try {
                    // Map the data to the TreePermit model
                    const mappedData = this.mapper.mapToTreePermitModel(item);
                    
                    // Create a TreePermit instance
                    const treePermitInstance = new TreePermit(mappedData);
                    
                    // Check if we should insert based on licenseDate
                    const shouldInsert = this._shouldInsertBasedOnDate(treePermitInstance);
                    
                    if (shouldInsert) {
                        // Insert into the database
                        await TreePermitRepository.insert(treePermitInstance);
                        successCount++;
                    } else {
                        // Log skipped permit
                        const licenseDate = treePermitInstance.dates?.licenseDate;
                        console.log(`Skipping permit ${treePermitInstance.permitNumber} with license date ${licenseDate} (older than 60 days)`);
                        skippedCount++;
                        skippedDueToDate.push({
                            permitNumber: treePermitInstance.permitNumber,
                            licenseDate: licenseDate
                        });
                    }
                    
                    // Save data to JSON file for debugging/verification if needed
                    //await this._saveToJsonFile(mappedData);
                    
                } catch (error) {
                    console.error(`Error processing license ${item.serial_number}:`, error.message);
                    errors.push({
                        licenseId: item.serial_number,
                        error: error.message
                    });
                }
            }
        }
        
        return {
            total: data.length,
            success: successCount,
            skipped: skippedCount,
            errors,
            skippedDueToDate
        };
    }
    
    /**
     * Save mapped data to JSON file
     * @param {Object} data - Mapped data
     */
    async _saveToJsonFile(data) {
        try {
            const fileName = `netanya_license_${data.permitNumber}.json`;
            await this.fileManager.saveToJsonFile(fileName, data);
        } catch (error) {
            console.warn(`Failed to save JSON file for license ${data.permitNumber}:`, error.message);
        }
    }
    
    /**
     * Launch the Netanya data processing
     * @param {string} mode - Processing mode (dev/production)
     */
    async launch(mode) {
        console.log(`Starting Netanya tree license processing in ${mode} mode...`);
        
        // Set production flag based on mode
        this.isProduction = mode.toLowerCase() === 'production';
        console.log(`Production mode: ${this.isProduction ? 'ON' : 'OFF'}`);
        
        try {
            // Initialize directories
            await this.initialize();
            
            // Fetch and parse Excel data
            console.log('Fetching Excel data from Netanya website...');
            const excelData = await this.excelFetcher.fetchData();
            
            if (excelData.length === 0) {
                console.log('No data found in Excel file.');
                return;
            }
            
            console.log(`Found ${excelData.length} licenses. Processing...`);
            
            // Process the data in batches
            const result = await this.processBatchData(excelData);
            
            console.log(`Processing completed. Success: ${result.success}/${result.total}`);
            console.log(`Skipped due to date: ${result.skipped}/${result.total}`);
            
            if (result.errors.length > 0) {
                console.log(`Encountered ${result.errors.length} errors.`);
            }
            
            // Log information about skipped permits if any
            if (result.skippedDueToDate.length > 0) {
                console.log(`Skipped ${result.skippedDueToDate.length} permits due to date filtering:`);
                // Log the first 10 skipped permits as an example
                const samplesToLog = result.skippedDueToDate.slice(0, 10);
                samplesToLog.forEach(item => {
                    console.log(`  - Permit #${item.permitNumber}, License Date: ${item.licenseDate}`);
                });
                
                if (result.skippedDueToDate.length > 10) {
                    console.log(`  - ... and ${result.skippedDueToDate.length - 10} more`);
                }
                
                // Save skipped permits to a file for reference
                const skipFileName = `netanya_skipped_${new Date().toISOString().slice(0, 10)}.json`;
                await this.fileManager.saveToJsonFile(skipFileName, result.skippedDueToDate);
                console.log(`Saved skipped permit details to ${skipFileName}`);
            }
            
            // Clean up
            await this.cleanup();
            
        } catch (error) {
            console.error('Netanya launcher encountered an error:', error.message);
            throw error;
        }
    }
}

module.exports = { NetanyaLauncher };
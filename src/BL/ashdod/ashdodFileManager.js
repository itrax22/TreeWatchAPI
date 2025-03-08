const fs = require('fs').promises;
const path = require('path');

class AshdodFileManager {
    /**
     * Manages file operations for Ashdod data processing
     * @param {string} outputDir - Directory to store processed output
     * @param {string} tempDir - Directory to store temporary files
     */
    constructor(outputDir, tempDir) {
        this.outputDir = outputDir;
        this.tempDir = tempDir;
    }

    /**
     * Initialize the required directories
     */
    async initialize() {
        try {
            // Ensure output directory exists
            await this._ensureDirectoryExists(this.outputDir);
            
            // Ensure temp directory exists
            await this._ensureDirectoryExists(this.tempDir);
            
            console.log('File manager initialized successfully');
        } catch (error) {
            console.error('Error initializing file manager:', error.message);
            throw error;
        }
    }

    /**
     * Create directory if it doesn't exist
     * @param {string} dirPath - Path to the directory
     */
    async _ensureDirectoryExists(dirPath) {
        try {
            await fs.mkdir(dirPath, { recursive: true });
        } catch (error) {
            if (error.code !== 'EEXIST') {
                throw error;
            }
        }
    }

    /**
     * Get path for temporary file storage
     * @param {string} filename - Name of the file
     * @returns {string} - Full path to the temporary file
     */
    getTempFilePath(filename) {
        return path.join(this.tempDir, filename);
    }

    /**
     * Get path for output file storage
     * @param {string} filename - Name of the file
     * @returns {string} - Full path to the output file
     */
    getOutputFilePath(filename) {
        return path.join(this.outputDir, filename);
    }

    /**
     * Saves data to a JSON file
     * @param {string} filename - Name of the output file
     * @param {Object} data - Data to save
     * @returns {Promise<string>} - Path to the saved file
     */
    async saveJsonToFile(filename, data) {
        const outputPath = this.getOutputFilePath(filename);
        try {
            await fs.writeFile(outputPath, JSON.stringify(data, null, 2), 'utf8');
            console.log(`Data saved to ${outputPath}`);
            return outputPath;
        } catch (error) {
            console.error(`Error saving data to ${outputPath}:`, error);
            throw error;
        }
    }

    /**
     * Clean up temporary files
     */
    async cleanup() {
        try {
            const files = await fs.readdir(this.tempDir);
            
            for (const file of files) {
                const filePath = path.join(this.tempDir, file);
                await fs.unlink(filePath);
            }
            
            console.log('Temporary files cleaned up');
        } catch (error) {
            console.warn('Error during cleanup:', error.message);
        }
    }
}

module.exports = { AshdodFileManager };
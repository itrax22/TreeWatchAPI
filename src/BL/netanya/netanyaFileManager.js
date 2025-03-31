const fs = require('fs').promises;
const path = require('path');

/**
 * Handles file operations for Netanya tree license data
 */
class NetanyaFileManager {
    /**
     * @param {string} outputDir - Directory for output files
     * @param {string} tempDir - Directory for temporary files
     */
    constructor(outputDir, tempDir) {
        this.outputDir = outputDir;
        this.tempDir = tempDir;
    }

    /**
     * Initialize directories
     */
    async initialize() {
        await fs.mkdir(this.outputDir, { recursive: true });
        await fs.mkdir(this.tempDir, { recursive: true });
    }

    /**
     * Get temporary file path
     * @param {string} filename - Filename
     * @returns {string} Full path to the temporary file
     */
    getTempFilePath(filename) {
        return path.join(this.tempDir, filename);
    }

    /**
     * Get output file path
     * @param {string} filename - Filename
     * @returns {string} Full path to the output file
     */
    getOutputFilePath(filename) {
        return path.join(this.outputDir, filename);
    }

    /**
     * Save data to JSON file
     * @param {string} filename - Filename
     * @param {Object} data - Data to save
     */
    async saveToJsonFile(filename, data) {
        const filePath = this.getOutputFilePath(filename);
        await fs.writeFile(
            filePath,
            JSON.stringify(data, null, 2),
            'utf8'
        );
    }

    /**
     * Clean up temporary files
     */
    async cleanup() {
        try {
            const files = await fs.readdir(this.tempDir);
            
            for (const file of files) {
                await fs.unlink(path.join(this.tempDir, file));
            }
        } catch (error) {
            console.warn(`Failed to clean up temporary files: ${error.message}`);
        }
    }
}

module.exports = NetanyaFileManager;
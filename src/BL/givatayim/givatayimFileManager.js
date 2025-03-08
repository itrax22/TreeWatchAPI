const fs = require('fs').promises;
const path = require('path');

class GivatayimFileManager {
    constructor(outputDir, tempDir) {
        this.outputDir = outputDir;
        this.tempDir = tempDir;
    }

    async initialize() {
        try {
            // Create output and temp directories if they don't exist
            await this._createDirIfNotExists(this.outputDir);
            await this._createDirIfNotExists(this.tempDir);
            console.log(`Directories initialized: ${this.outputDir}, ${this.tempDir}`);
        } catch (error) {
            console.error('Error initializing directories:', error.message);
            throw error;
        }
    }

    async _createDirIfNotExists(dirPath) {
        try {
            await fs.access(dirPath);
        } catch (error) {
            // Directory doesn't exist, create it
            await fs.mkdir(dirPath, { recursive: true });
        }
    }

    getTempFilePath(filename) {
        return path.join(this.tempDir, filename);
    }

    getOutputFilePath(filename) {
        return path.join(this.outputDir, filename);
    }

    async saveFile(filename, content) {
        const filePath = this.getOutputFilePath(filename);
        try {
            await fs.writeFile(filePath, content);
            return true;
        } catch (error) {
            console.error(`Error saving file ${filename}:`, error.message);
            return false;
        }
    }

    async readFile(filename) {
        const filePath = this.getOutputFilePath(filename);
        try {
            return await fs.readFile(filePath, 'utf8');
        } catch (error) {
            console.error(`Error reading file ${filename}:`, error.message);
            return null;
        }
    }

    async cleanup() {
        try {
            // List all files in temp directory
            const files = await fs.readdir(this.tempDir);
            
            // Delete each temp file
            for (const file of files) {
                const filePath = path.join(this.tempDir, file);
                try {
                    await fs.unlink(filePath);
                } catch (unlinkError) {
                    console.warn(`Failed to delete temp file ${filePath}: ${unlinkError.message}`);
                }
            }
            
            console.log('Temporary files cleaned up');
            return true;
        } catch (error) {
            console.error('Error during cleanup:', error.message);
            return false;
        }
    }
}

module.exports = { GivatayimFileManager };
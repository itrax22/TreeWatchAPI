const fs = require('fs').promises;
const path = require('path');

class RishonFileManager {
    constructor(outputDir, tempDir) {
        this.outputDir = outputDir;
        this.tempDir = tempDir;
        this.jsonOutputDir = path.join(outputDir, 'json');
        this.textOutputDir = path.join(outputDir, 'text');
        this.metaOutputDir = path.join(outputDir, 'meta');
    }

    async initialize() {
        // Ensure directories exist
        await this._createDirectoryIfNotExists(this.outputDir);
        await this._createDirectoryIfNotExists(this.jsonOutputDir);
        await this._createDirectoryIfNotExists(this.textOutputDir);
        await this._createDirectoryIfNotExists(this.metaOutputDir);
        await this._createDirectoryIfNotExists(this.tempDir);
        
        console.log('Rishon LeTsiyon file manager initialized');
    }

    async _createDirectoryIfNotExists(dirPath) {
        try {
            await fs.mkdir(dirPath, { recursive: true });
        } catch (error) {
            if (error.code !== 'EEXIST') {
                throw error;
            }
        }
    }

    getTempFilePath(filename) {
        return path.join(this.tempDir, filename);
    }

    async saveOutputs(filename, jsonData, rawText, metadata) {
        const promises = [];
        const baseFilename = path.basename(filename, path.extname(filename));
        
        // Save JSON data if available
        if (jsonData) {
            const jsonFilePath = path.join(this.jsonOutputDir, `${baseFilename}.json`);
            promises.push(fs.writeFile(jsonFilePath, JSON.stringify(jsonData, null, 2)));
        }
        
        // Save raw text if available
        if (rawText) {
            const textFilePath = path.join(this.textOutputDir, `${baseFilename}.txt`);
            promises.push(fs.writeFile(textFilePath, rawText));
        }
        
        // Save metadata if available
        if (metadata) {
            const metaFilePath = path.join(this.metaOutputDir, `${baseFilename}.json`);
            promises.push(fs.writeFile(metaFilePath, JSON.stringify(metadata, null, 2)));
        }
        
        await Promise.all(promises);
        return true;
    }

    async cleanup() {
        try {
            // Remove temporary files but keep the directory
            const files = await fs.readdir(this.tempDir);
            const deletePromises = files.map(file => 
                fs.unlink(path.join(this.tempDir, file)));
            
            await Promise.all(deletePromises);
            console.log('Temporary files cleaned up');
        } catch (error) {
            console.warn('Failed to clean up temporary files:', error.message);
        }
    }
}

module.exports = { RishonFileManager };
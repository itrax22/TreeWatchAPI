const fs = require('fs').promises;
const path = require('path');

class PetahTikvaFileManager {
    constructor(outputDir, tempDir) {
        this.outputDir = outputDir;
        this.tempDir = tempDir;
    }

    async initialize() {
        try {
            // Create output directory if it doesn't exist
            await fs.mkdir(this.outputDir, { recursive: true });
            
            // Create and clean temp directory
            await fs.mkdir(this.tempDir, { recursive: true });
            await this.clearDirectory(this.tempDir);
            
            console.log('PetahTikva file manager initialized successfully');
            return true;
        } catch (error) {
            console.error('Error initializing file manager:', error);
            throw error;
        }
    }

    async clearDirectory(dirPath) {
        try {
            const files = await fs.readdir(dirPath);
            for (const file of files) {
                const filePath = path.join(dirPath, file);
                const stats = await fs.stat(filePath);
                if (stats.isDirectory()) {
                    await this.clearDirectory(filePath);
                    await fs.rmdir(filePath);
                } else {
                    await fs.unlink(filePath);
                }
            }
        } catch (error) {
            console.error(`Error clearing directory ${dirPath}:`, error);
            throw error;
        }
    }

    async getTempFilePath(filename) {
        return path.join(this.tempDir, filename);
    }

    async getOutputFilePath(filename, extension = 'json') {
        return path.join(this.outputDir, `${filename}.${extension}`);
    }

    async saveOutputs(pdfName, jsonData, rawText, metadata) {
        const baseName = path.parse(pdfName).name;
        
        // Create combined data with metadata
        const combinedData = {
            ...metadata,
            city: 'Petah-Tikva',
            pdfData: jsonData || {}
        };

        // Save JSON
        if (jsonData || metadata) {
            const jsonPath = await this.getOutputFilePath(baseName);
            await fs.writeFile(jsonPath, JSON.stringify(combinedData, null, 2), 'utf8');
        }

        // Save raw text if available
        if (rawText) {
            const txtPath = await this.getOutputFilePath(baseName, 'txt');
            await fs.writeFile(txtPath, rawText, 'utf8');
        }

        return {
            jsonPath: await this.getOutputFilePath(baseName),
            txtPath: rawText ? await this.getOutputFilePath(baseName, 'txt') : null
        };
    }

    async cleanup() {
        try {
            await this.clearDirectory(this.tempDir);
            console.log('Temporary files cleaned up successfully');
            return true;
        } catch (error) {
            console.error('Error cleaning up temporary files:', error);
            return false;
        }
    }
}

module.exports = { PetahTikvaFileManager };
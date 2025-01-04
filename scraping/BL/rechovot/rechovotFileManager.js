const path = require('path');
const os = require('os');
const fs = require('fs').promises;
class RechovotFileManager {
    constructor(outputDir, tempDir) {
        this.outputDir = outputDir;
        this.tempDir = tempDir;
    }

    async initialize() {
        await Promise.all([
            this._createDirectory(this.outputDir),
            this._createDirectory(this.tempDir)
        ]);
    }

    async saveOutputs(pdfName, jsonData, rawText, metadata) {
        const baseName = path.parse(pdfName).name;
        
        if (!jsonData && !rawText) {
            throw new Error('Both jsonData and rawText are undefined');
        }

        const combinedData = {
            ...metadata,
            pdfData: {...jsonData}
        };

        await Promise.all([
            this._saveJson(baseName, combinedData),
            this._saveRawText(baseName, rawText)
        ]);
    }

    async cleanup() {
        try {
            await fs.rmdir(this.tempDir);
        } catch (error) {
            console.warn('Failed to delete temp directory');
        }
    }

    getTempFilePath(filename) {
        return path.join(this.tempDir, filename);
    }

    async _createDirectory(dir) {
        try {
            await fs.mkdir(dir, { recursive: true });
        } catch (error) {
            console.warn(`Error creating directory ${dir}:`, error.message);
            return fs.mkdtemp(path.join(os.tmpdir(), 'pdf-processor-'));
        }
    }

    async _saveJson(baseName, data) {
        if (data) {
            const jsonPath = path.join(this.outputDir, `${baseName}.json`);
            await fs.writeFile(jsonPath, JSON.stringify(data, null, 2), 'utf8');
        }
    }

    async _saveRawText(baseName, rawText) {
        if (rawText) {
            const rawPath = path.join(this.outputDir, `${baseName}.txt`);
            await fs.writeFile(rawPath, rawText, 'utf8');
        }
    }
}

module.exports = {RechovotFileManager};
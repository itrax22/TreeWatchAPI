const fs = require('fs').promises;

class FileHandler {
    async readFile(filePath) {
        return await fs.readFile(filePath);
    }

    async saveToFile(filePath, data) {
        await fs.writeFile(filePath, data, { encoding: 'utf8' });
        console.log(`File saved to ${filePath}`);
    }
}

module.exports = { FileHandler };
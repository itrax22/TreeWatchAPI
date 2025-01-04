const axios = require('axios');
const fs = require('fs').promises;

class PdfDownloader {
    constructor(httpsAgent) {
        this.httpsAgent = httpsAgent;
    }

    async downloadPdf(pdfUrl, tempPath) {
        try {
            const response = await axios.get(pdfUrl, { 
                responseType: 'arraybuffer', 
                httpsAgent: this.httpsAgent 
            });
            
            await fs.writeFile(tempPath, response.data);
            return true;
        } catch (error) {
            console.error(`Error downloading PDF from ${pdfUrl}:`, error.message);
            return false;
        }
    }
}

module.exports = {PdfDownloader};
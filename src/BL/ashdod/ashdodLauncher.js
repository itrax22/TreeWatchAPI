const {constants} = require('../../constants');
const { HttpsAgentFactory } = require('../../config/https-agent');
const { AshdodFileManager } = require('./ashdodFileManager');
const { PdfDownloader } = require('../shared/pdf/pdfDownloader');
const { AshdodWebScraper } = require('./ashdodWebScraper');
const { AshdodBatchProcessor } = require('./ashdodBatchProcessor');
const { TextProcessor } = require('../shared/utils/textProcessor');
const { FileHandler } = require('../shared/utils/fileHandler');
const { FieldExtractor } = require('../shared/pdf/pdfFieldExtractor');
const { PdfParserService } = require('../shared/pdf/pdfParserService');

class AshdodLauncher {
    constructor() {
        this.httpsAgent = HttpsAgentFactory.create();
        this.fileManager = new AshdodFileManager(constants.ASHDOD_OUTPUT_DIR, constants.ASHDOD_TEMP_DIR);
        this.pdfDownloader = new PdfDownloader(this.httpsAgent);
        this.webScraper = new AshdodWebScraper(constants.ASHDOD_SITE_URL, constants.ASHDOD_BASE_URL, this.httpsAgent);
        this.textProcessor = new TextProcessor();
        this.fileHandler = new FileHandler();
        this.fieldExtractor = new FieldExtractor();
        this.pdfParser = new PdfParserService(this.textProcessor, this.fileHandler, this.fieldExtractor);
        this.batchProcessor = new AshdodBatchProcessor(this.pdfDownloader, this.fileManager, this.pdfParser, constants.ASHDOD_BATCH_SIZE);
    }

    async launch(mode) {
        await this.fileManager.initialize();
        console.log('Fetching PDF list from Ashdod website...');
        const pdfList = await this.webScraper.fetchAndProcessPage(mode);

        if (pdfList.length === 0) {
            console.log('No PDFs found to process');
            return;
        }

        console.log(`Found ${pdfList.length} PDFs. Processing in batches of ${constants.ASHDOD_BATCH_SIZE}...`);
        const batches = this.batchProcessor.createBatches(pdfList);
        let processedCount = 0;

        for (let i = 0; i < batches.length; i++) {
            console.log(`Processing batch ${i + 1} of ${batches.length}...`);
            const result = await this.batchProcessor.processBatch(batches[i]);
            processedCount += result.results.filter(r => r.success).length;
        }

        console.log(`Finished processing. Successfully processed ${processedCount} out of ${pdfList.length} PDFs.`);
        await this.fileManager.cleanup();
    }
}

module.exports = {AshdodLauncher};
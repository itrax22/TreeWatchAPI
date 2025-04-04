const {constants} = require('../../constants');
const { HttpsAgentFactory } = require('../../config/https-agent');
const { RechovotFileManager } = require('./rechovotFileManager');
const { PdfDownloader } = require('../shared/pdf/pdfDownloader');
const { RechovotWebScraper } = require('./rechovotWebScraper');
const { RechovotBatchProcessor } = require('./rechovotBatchProcessor');
const { TextProcessor } = require('../shared/utils/textProcessor');
const { FileHandler } = require('../shared/utils/fileHandler');
const { FieldExtractor } = require('../shared/pdf/pdfFieldExtractor');
const { PdfParserService } = require('../shared/pdf/pdfParserService');

class RechovotLauncher{

    constructor(){
        this.httpsAgent = HttpsAgentFactory.create();
        this.fileManager = new RechovotFileManager(constants.RECHOVOT_OUTPUT_DIR, constants.RECHOVOT_TEMP_DIR);
        this.pdfDownloader = new PdfDownloader(this.httpsAgent);
        this.webScraper = new RechovotWebScraper(constants.RECHOVOT_SITE_URL, constants.RECHOVOT_BASE_URL, this.httpsAgent);
        this.textProcessor = new TextProcessor();
        this.fileHandler = new FileHandler();
        this.fieldExtractor = new FieldExtractor();
        this.pdfParser = new PdfParserService(this.textProcessor, this.fileHandler, this.fieldExtractor);
        this.batchProcessor = new RechovotBatchProcessor(this.pdfDownloader, this.fileManager, this.pdfParser, constants.RECHOVOT_BATCH_SIZE);
    }

    async launch(mode){
        await this.fileManager.initialize();
        console.log('Fetching PDF list from website...');
        const pdfList = await this.webScraper.fetchAndProcessPage(mode);
        if (pdfList.length === 0) {
            console.log('No PDFs found to process');
            return;
        }
        console.log(`Found ${pdfList.length} PDFs. Processing in batches of ${constants.RECHOVOT_BATCH_SIZE}...`);
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

module.exports = {RechovotLauncher};
// async function main() {
//     try {
//         // Initialize services
//         const httpsAgent = HttpsAgentFactory.create();
//         const fileManager = new RechovotFileManager(constants.RECHOVOT_OUTPUT_DIR, constants.RECHOVOT_TEMP_DIR);
//         const pdfDownloader = new PdfDownloader(httpsAgent);
//         const webScraper = new RechovotWebScraper(constants.RECHOVOT_SITE_URL, constants.RECHOVOT_BASE_URL, httpsAgent);
        
//         // Initialize existing services from the original code
//         const textProcessor = new TextProcessor();
//         const fileHandler = new FileHandler();
//         const fieldExtractor = new FieldExtractor();
//         const pdfParser = new PdfParserService(textProcessor, fileHandler, fieldExtractor);
        
//         const batchProcessor = new RechovotBatchProcessor(
//             pdfDownloader,
//             fileManager,
//             pdfParser,
//             constants.RECHOVOT_BATCH_SIZE
//         );

//         // Initialize directories
//         await fileManager.initialize();

//         // Fetch and process PDFs
//         console.log('Fetching PDF list from website...');
//         const pdfList = await webScraper.fetchAndProcessPage();

//         if (pdfList.length === 0) {
//             console.log('No PDFs found to process');
//             return;
//         }

//         console.log(`Found ${pdfList.length} PDFs. Processing in batches of ${constants.RECHOVOT_BATCH_SIZE}...`);
        
//         const batches = batchProcessor.createBatches(pdfList);

//         let processedCount = 0;
//         for (let i = 0; i < batches.length; i++) {
//             console.log(`Processing batch ${i + 1} of ${batches.length}...`);
//             const result = await batchProcessor.processBatch(batches[i]);
//             processedCount += result.results.filter(r => r.success).length;
//         }

//         console.log(`Finished processing. Successfully processed ${processedCount} out of ${pdfList.length} PDFs.`);
        
//         // Clean up
//         await fileManager.cleanup();
        
//     } catch (error) {
//         console.error('Error in main:', error);
//         process.exit(1);
//     }
// }

// main().catch(console.error);
const https = require('https');

class HttpsAgentFactory {
    static create() {
        return new https.Agent({
            rejectUnauthorized: false
        });
    }
}

module.exports = {HttpsAgentFactory};
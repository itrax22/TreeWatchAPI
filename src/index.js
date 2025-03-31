const express = require('express');
const cors = require('cors');
const { getTreePermits } = require('./handlers/getPermitsHandler');
const { runJob, runSingleJob } = require('./handlers/runJob');
const { 
    getHealthChecks, 
    getHealthStats, 
    getLatestHealthChecks,
    getHealthCheckById
} = require('./handlers/healthCheckHandler');

const app = express();

const corsOptions = {
    "origin": "*",
    "methods": "GET, HEAD, PUT, PATCH, POST, DELETE"
}

app.use(cors(corsOptions));

// Middleware to parse JSON request bodies
app.use(express.json());

// Define routes for tree permits
app.get('/tree-permits', getTreePermits);

// Job execution routes
app.post('/run', runJob);
app.post('/run/:jobName', runSingleJob);

// Health check routes
app.get('/health', getHealthStats);
app.get('/health/checks', getHealthChecks);
app.get('/health/latest', getLatestHealthChecks);
app.get('/health/check/:id', getHealthCheckById);

// Default route for health checks or testing
app.get('/', (req, res) => {
    res.status(200).send('Tree Permit Service is running.');
});

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
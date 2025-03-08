const express = require('express');
const cors = require('cors');
const { getTreePermits } = require('./handlers/getPermitsHandler');
const { runJob } = require('./handlers/runJob');

const app = express();

const corsOptions = {
    "origin": "*",
    "methods": "GET, HEAD, PUT, PATCH, POST, DELETE"
}

app.use(cors(corsOptions));

// Middleware to parse JSON request bodies
app.use(express.json());

// Define routes
app.get('/tree-permits', getTreePermits);
app.post('/run', runJob);

// Default route for health checks or testing
app.get('/', (req, res) => {
    res.status(200).send('Tree Permit Service is running.');
});

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

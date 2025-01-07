const express = require('express');
const { getTreePermits } = require('./handlers/getPermitsHandler');

const app = express();

// Middleware to parse JSON request bodies
app.use(express.json());

// Define routes
app.get('/tree-permits', getTreePermits);

// Default route for health checks or testing
app.get('/', (req, res) => {
    res.status(200).send('Tree Permit Service is running.');
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

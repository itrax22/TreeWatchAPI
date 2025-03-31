# TreeWatchAPI

TreeWatchAPI is a Node.js-based API service for handling tree permit data. This documentation will guide you through the installation and deployment process.

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v20 or higher)
- Docker
- Google Cloud SDK (for deployment)
- A Google Cloud Platform account with appropriate permissions
- A service account key file with necessary permissions

## Local Development Setup

1. Clone the repository:
```bash
git clone [repository-url]
cd TreeWatchAPI
```

2. Install dependencies:
```bash
cd src
npm install
```

3. Set up environment variables:
   - Copy the `service-account.json` file to the project root
   - Set the `GOOGLE_APPLICATION_CREDENTIALS` environment variable to point to your service account file
   - Set `NODE_ENV` to "development" for local development

4. Start the development server:
```bash
npm start
```

The server will start on port 8080 by default.

## Docker Deployment

### Building the Docker Image

1. Ensure you're in the project root directory
2. Build the Docker image:
```bash
docker build -t gcr.io/treewatchapi/tree-permit-api-handler:latest .
```

### Deploying to Google Cloud Platform

1. Authenticate with Google Cloud:
```bash
gcloud auth login
```

2. Set your project ID:
```bash
gcloud config set project treewatchapi
```

3. Configure Docker to use Google Container Registry:
```bash
gcloud auth configure-docker
```

4. Push the Docker image:
```bash
docker push gcr.io/treewatchapi/tree-permit-api-handler:latest
```

### Using Deployment Scripts

The project includes two batch scripts for Windows:

1. `deploy.bat`: Builds and pushes the Docker image to Google Container Registry
2. `run.bat`: Runs the application locally using Docker

To use these scripts:
```bash
# For deployment
.\deploy.bat

# For local testing
.\run.bat
```

## Project Structure

```
TreeWatchAPI/
├── src/                    # Source code
│   ├── BL/                # Business Logic
│   ├── DAL/               # Data Access Layer
│   ├── handlers/          # API Handlers
│   ├── migrations/        # Database Migrations
│   ├── tests/             # Test files
│   └── config/            # Configuration files
├── terraform/             # Infrastructure as Code
├── dockerfile            # Docker configuration
├── service-account.json  # Google Cloud credentials
└── deploy.bat           # Deployment script
```

## Dependencies

The project uses the following main dependencies:
- Express.js for the web server
- Google Cloud Datastore for data storage
- Puppeteer for web scraping
- PDF parsing libraries for document processing
- Various utility libraries for data processing

## Environment Variables

Required environment variables:
- `GOOGLE_APPLICATION_CREDENTIALS`: Path to service account key file
- `NODE_ENV`: Environment (development/production)

## API Endpoints

### Base URL
The API is served at the root URL. The default port is 8080.

### Available Endpoints

#### Tree Permits

##### GET /tree-permits
Retrieves tree permits with filtering, sorting, and pagination.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `pageSize` (optional): Number of items per page (default: 10, max: 50)
- `sortBy` (optional): Field to sort by (must be one of the valid sort fields)
- `settlementName` (optional): Filter by settlement name
- `reason` (optional): Filter by reason
- `licenseType` (optional): Filter by license type

**Response:**
- 200: Success with paginated results
- 400: Bad request (invalid parameters)
- 500: Internal server error

#### Job Execution

##### POST /run
Launches all available jobs (rechovot, petah-tikva, rishon, givatayim, ashdod, netanya).

**Response:**
- 200: All jobs launched successfully
- 207: Some jobs failed (with detailed results)
- 500: Failed to launch jobs

##### POST /run/:jobName
Launches a specific job by name.

**Path Parameters:**
- `jobName`: Name of the job to run (one of: rechovot, petah-tikva, rishon, givatayim, ashdod, netanya)

**Response:**
- 200: Job launched successfully
- 400: Bad request (missing job name)
- 500: Failed to run job

#### Health Monitoring

##### GET /health
Retrieves system health statistics.

**Response:**
- 200: Success with health statistics
- 500: Failed to retrieve health statistics

##### GET /health/checks
Retrieves health check records with filtering and pagination.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `pageSize` (optional): Number of items per page (default: 10)
- `jobName` (optional): Filter by job name
- `status` (optional): Filter by status
- `fromDate` (optional): Filter by start date
- `toDate` (optional): Filter by end date
- `sortBy` (optional): Field to sort by (default: 'startTime')
- `sortDirection` (optional): Sort direction (default: 'desc')

**Response:**
- 200: Success with health check records
- 500: Failed to retrieve health checks

##### GET /health/latest
Retrieves the latest health check for each job.

**Response:**
- 200: Success with latest health checks
- 500: Failed to retrieve latest health checks

##### GET /health/check/:id
Retrieves a specific health check by ID.

**Path Parameters:**
- `id`: Health check ID

**Response:**
- 200: Success with health check details
- 400: Bad request (missing ID)
- 404: Health check not found
- 500: Failed to retrieve health check

#### Root Endpoint

##### GET /
Basic health check endpoint that confirms the service is running.

**Response:**
- 200: Service is running

### CORS
The API supports CORS with the following configuration:
- Origin: All origins (*)
- Methods: GET, HEAD, PUT, PATCH, POST, DELETE

### Error Responses
All endpoints may return the following error responses:
- 400: Bad Request - Invalid parameters or missing required data
- 404: Not Found - Requested resource not found
- 500: Internal Server Error - Server-side error occurred

Each error response includes a JSON object with:
- `success`: false
- `message`: Description of the error
- `error`: Detailed error message (when available)

## Troubleshooting

Common issues and solutions:

1. Docker build failures:
   - Ensure Docker is running
   - Check for sufficient disk space
   - Verify Dockerfile syntax

2. Deployment issues:
   - Verify Google Cloud credentials
   - Check project permissions
   - Ensure service account has necessary roles

3. Runtime errors:
   - Check environment variables
   - Verify service account permissions
   - Review application logs

## Support

For support or questions, please contact the development team or create an issue in the repository.

## License

This project is licensed under the terms specified in the LICENSE file. 
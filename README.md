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

The API exposes several endpoints for tree permit handling:
- Single permit processing
- Batch permit processing
- Data retrieval and management

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
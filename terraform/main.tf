terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 4.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 4.0"
    }
  }
  required_version = ">= 1.4.0"
}

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

# Enable necessary APIs
resource "google_project_service" "cloud_run" {
  project = var.project_id
  service = "run.googleapis.com"
}

resource "google_project_service" "apigateway" {
  project = var.project_id
  service = "apigateway.googleapis.com"
}

# Enable Datastore API
resource "google_project_service" "datastore" {
  project = var.project_id
  service = "datastore.googleapis.com"
}

# Cloud Run service
resource "google_cloud_run_service" "tree_permit_handler" {
  name     = "tree-permit-api-handler"
  location = var.region

  template {
    spec {
      containers {
        image = "gcr.io/${var.project_id}/tree-permit-api-handler:latest"
        env {
          name  = "PROJECT_ID"
          value = var.project_id
        }
        resources {
          limits = {
            memory = "256Mi"
            cpu    = "500m"
          }
        }
      }
    }
  }

  autogenerate_revision_name = true
}

# IAM binding to allow API Gateway to invoke the Cloud Run service
resource "google_cloud_run_service_iam_member" "api_invoker" {
  location        = var.region
  service         = google_cloud_run_service.tree_permit_handler.name
  role            = "roles/run.invoker"
  member          = "serviceAccount:${google_service_account.api_gateway_service_account.email}"
}

# Storage bucket for the source code
resource "google_storage_bucket" "function_source" {
  name          = "${var.project_id}-function-source"
  location      = var.region
  force_destroy = true
}

resource "google_storage_bucket_object" "source_code" {
  name   = "tree-permit-api-handler.zip"
  bucket = google_storage_bucket.function_source.name
  source = "./tree-permit-api-handler.zip"
}

# API Gateway service account
resource "google_service_account" "api_gateway_service_account" {
  account_id   = "api-gateway-service-account"
  display_name = "API Gateway Service Account"
}

# API Gateway definition
resource "google_api_gateway_api" "tree_permit_api" {
  provider     = google-beta
  api_id       = "tree-permit-api"
  display_name = "Tree Permit API"
}

# API Gateway configuration
resource "google_api_gateway_api_config" "tree_permit_config" {
  provider      = google-beta
  api           = google_api_gateway_api.tree_permit_api.id
  api_config_id = "v1"
  display_name  = "Tree Permit API Config"

  openapi_documents {
    document {
      path     = "openapi-spec.yaml"
      contents = filebase64("./openapi-spec.yaml")
    }
  }
}

# API Gateway deployment
resource "google_api_gateway_gateway" "tree_permit_gateway" {
  gateway_id = "tree-permit-gateway"
  provider   = google-beta
  api_config = google_api_gateway_api_config.tree_permit_config.id
  region     = var.region
}

# Configure Indexes for Datastore Kinds
resource "google_datastore_index" "tree_permit_index" {
  project  = var.project_id
  kind     = "TreePermit"
  ancestor = "NONE"

  properties {
    name      = "settlement"
    direction = "ASCENDING"
  }

  properties {
    name      = "resourceId"
    direction = "ASCENDING"
  }

  properties {
    name      = "licenseDate"
    direction = "DESCENDING"
  }

  properties {
    name      = "lastDateToObject"
    direction = "DESCENDING"
  }

  properties {
    name      = "recordCreatedAt"
    direction = "DESCENDING"
  }

  properties {
    name      = "createDate"
    direction = "DESCENDING"
  }

  properties {
    name      = "__key__"
    direction = "ASCENDING"
  }
}

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

resource "google_project_service" "cloud_scheduler" {
  project = var.project_id
  service = "cloudscheduler.googleapis.com"
}

resource "google_project_service" "cloud_run_jobs" {
  project = var.project_id
  service = "run.googleapis.com"
}

# Cloud Run Job definition
# resource "google_cloud_run_v2_job" "scheduled_job" {
#   name     = "tree-permit-job"
#   location = var.region

#   template {
#     containers {
#       image = "gcr.io/treewatchapi/tree-permit-job-handler"
#       env {
#         name  = "PROJECT_ID"
#         value = var.project_id
#       }
#       resources {
#         limits = {
#           memory = "256Mi"
#           cpu    = "500m"
#         }
#       }
#     }
#   }

#   autogenerate_revision_name = true
# }

# # Cloud Scheduler job
# resource "google_cloud_scheduler_job" "run_job_scheduler" {
#   name        = "tree-permit-job-scheduler"
#   description = "Schedule to run the Cloud Run job every 4 hours"
#   schedule    = "0 */4 * * *" # Every 4 hours
#   time_zone   = "UTC"

#   http_target {
#     http_method = "POST"
#     uri         = "https://${google_cloud_run_v2_job.scheduled_job.location}-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${var.project_id}/jobs/${google_cloud_run_v2_job.scheduled_job.name}:run"
#     oidc_token {
#       service_account_email = google_service_account.scheduler_service_account.email
#     }
#   }
# }

# # Service Account for Cloud Scheduler
# resource "google_service_account" "scheduler_service_account" {
#   account_id   = "scheduler-service-account"
#   display_name = "Scheduler Service Account"
# }

# # IAM binding for Cloud Scheduler to invoke the Cloud Run job
# resource "google_cloud_run_service_iam_member" "scheduler_invoker" {
#   location        = var.region
#   service         = google_cloud_run_v2_job.scheduled_job.name
#   role            = "roles/run.invoker"
#   member          = "serviceAccount:${google_service_account.scheduler_service_account.email}"
# }

# Cloud Run service
resource "google_cloud_run_service" "tree_permit_endpoint" {
  name     = "tree-permit-api-endpoint"
  location = var.region

  template {
    spec {
      containers {
        image = "gcr.io/treewatchapi/tree-permit-api-handler"
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
       env {
          name  = "FORCE_DEPLOY"
          value = timestamp() # This forces the resource to update
        }

      }
    }
  }

  autogenerate_revision_name = true
}

# IAM binding to allow API Gateway to invoke the Cloud Run service
resource "google_cloud_run_service_iam_member" "api_invoker" {
  location        = var.region
  service         = google_cloud_run_service.tree_permit_endpoint.name
  role            = "roles/run.invoker"
  member          = "serviceAccount:${google_service_account.api_gateway_service_account.email}"
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
      path     = "./openapi-spec.yaml"
      contents = filebase64("./openapi-spec.yaml")
    }
    
  }

  lifecycle {
    create_before_destroy = true
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
resource "google_datastore_index" "tree_permit_settlement_license_date" {
  project  = var.project_id
  kind     = "TreePermit"
  ancestor = "NONE"

  properties {
    name      = "settlement"
    direction = "ASCENDING"
  }

  properties {
    name      = "dates.licenseDate"
    direction = "DESCENDING"
  }
}

# Index for reasonShort filter with dates.licenseDate sort
resource "google_datastore_index" "tree_permit_reasonShort_license_date" {
  project  = var.project_id
  kind     = "TreePermit"
  ancestor = "NONE"

  properties {
    name      = "reasonShort"
    direction = "ASCENDING"
  }

  properties {
    name      = "dates.licenseDate"
    direction = "DESCENDING"
  }
}

# Index for licenseType filter with dates.licenseDate sort
resource "google_datastore_index" "tree_permit_licenseType_license_date" {
  project  = var.project_id
  kind     = "TreePermit"
  ancestor = "NONE"

  properties {
    name      = "licenseType"
    direction = "ASCENDING"
  }

  properties {
    name      = "dates.licenseDate"
    direction = "DESCENDING"
  }
}

# Special case for lastDateToObject filter and sort
resource "google_datastore_index" "tree_permit_last_date_filter_sort" {
  project  = var.project_id
  kind     = "TreePermit"
  ancestor = "NONE"

  properties {
    name      = "dates.lastDateToObject"
    direction = "ASCENDING"  # For the >= filter
  }

  properties {
    name      = "dates.lastDateToObject"
    direction = "DESCENDING"  # For the sort
  }
}

# Basic index for recordCreatedAt sorting (default and createDate case)
resource "google_datastore_index" "tree_permit_created_at_sort" {
  project  = var.project_id
  kind     = "TreePermit"
  ancestor = "NONE"

  properties {
    name      = "recordCreatedAt"
    direction = "DESCENDING"
  }
}

# Basic index for settlement sorting (city case)
resource "google_datastore_index" "tree_permit_settlement_sort" {
  project  = var.project_id
  kind     = "TreePermit"
  ancestor = "NONE"

  properties {
    name      = "settlement"
    direction = "ASCENDING"
  }
}

# Basic index for dates.licenseDate sorting
resource "google_datastore_index" "tree_permit_license_date_sort" {
  project  = var.project_id
  kind     = "TreePermit"
  ancestor = "NONE"

  properties {
    name      = "dates.licenseDate"
    direction = "DESCENDING"
  }
}
# Index for health check filtering by jobName and sorting by startTime
resource "google_datastore_index" "health_check_job_name_start_time" {
  project  = var.project_id
  kind     = "HealthCheck"
  ancestor = "NONE"

  properties {
    name      = "jobName"
    direction = "ASCENDING"
  }

  properties {
    name      = "startTime"
    direction = "DESCENDING"
  }
}

# Index for health check filtering by status and sorting by startTime
resource "google_datastore_index" "health_check_status_start_time" {
  project  = var.project_id
  kind     = "HealthCheck"
  ancestor = "NONE"

  properties {
    name      = "status"
    direction = "ASCENDING"
  }

  properties {
    name      = "startTime"
    direction = "DESCENDING"
  }
}

# Index for health check filtering by jobName and status and sorting by startTime
resource "google_datastore_index" "health_check_job_name_status_start_time" {
  project  = var.project_id
  kind     = "HealthCheck"
  ancestor = "NONE"

  properties {
    name      = "jobName"
    direction = "ASCENDING"
  }

  properties {
    name      = "status"
    direction = "ASCENDING"
  }

  properties {
    name      = "startTime"
    direction = "DESCENDING"
  }
}
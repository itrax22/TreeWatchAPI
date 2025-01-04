terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 4.0"
    }
  }
  required_version = ">= 1.4.0"
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Enable Datastore API
resource "google_project_service" "datastore" {
  project = var.project_id
  service = "datastore.googleapis.com"
}

# Configure Indexes for Kinds
resource "google_datastore_index" "kind_indexes" {
  for_each = toset(var.kinds)

  project  = var.project_id
  kind     = each.value
  ancestor = "NONE"

  properties {
    name = "exampleField"
    direction = "ASCENDING"
  }

  properties {
    name = "__key__"
    direction = "ASCENDING"
  }
}

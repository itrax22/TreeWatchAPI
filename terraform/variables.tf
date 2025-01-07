variable "project_id" {
  description = "The GCP project ID where Datastore is configured"
  type        = string
  default     = "treewatchapi" # Adjusted to a valid project ID
}

variable "region" {
  description = "The region for the Datastore"
  type        = string
  default     = "europe-west1" # Adjusted to a valid region
}

variable "kinds" {
  description = "List of kinds (entities) for Datastore"
  type        = list(string)
  default     = ["TreePermit"]
}

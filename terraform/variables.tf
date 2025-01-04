variable "project_id" {
  description = "The GCP project ID where Datastore is configured"
  type        = string
}

variable "region" {
  description = "The region for the Datastore"
  type        = string
  default     = "eu3"
}

variable "kinds" {
  description = "List of kinds (entities) for Datastore"
  type        = list(string)
  default     = ["ExampleKind"]
}

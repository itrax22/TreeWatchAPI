output "datastore_enabled" {
  description = "Indicates if the Datastore API is enabled"
  value       = "Google Datastore enabled for project ${var.project_id}"
}

output "kind_indexes" {
  description = "The kinds and their configured indexes"
  value = {
    for kind, index in google_datastore_index.kind_indexes :
    kind => index.kind
  }
}

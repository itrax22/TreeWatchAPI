output "datastore_enabled" {
  description = "Indicates if the Datastore API is enabled"
  value       = "Google Datastore API is enabled for project ${var.project_id}"
}

output "tree_permit_index" {
  description = "Details of the TreePermit kind's configured indexes"
  value = {
    kind      = google_datastore_index.tree_permit_index.kind
    ancestor  = google_datastore_index.tree_permit_index.ancestor
    properties = [
      for property in google_datastore_index.tree_permit_index.properties :
      {
        name      = property.name
        direction = property.direction
      }
    ]
  }
}

output "api_gateway_url" {
  value       = google_api_gateway_gateway.tree_permit_gateway.default_hostname
  description = "The public URL for the Tree Permit API"
}

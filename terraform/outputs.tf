output "datastore_enabled" {
  description = "Indicates if the Datastore API is enabled"
  value       = "Google Datastore API is enabled for project ${var.project_id}"
}

output "tree_permit_indexes" {
  description = "Details of the TreePermit kind's configured indexes"
  value = {
    "settlement_license_date" = {
      kind      = google_datastore_index.tree_permit_settlement_license_date.kind
      properties = [
        for property in google_datastore_index.tree_permit_settlement_license_date.properties :
        {
          name      = property.name
          direction = property.direction
        }
      ]
    },
    "reasonShort_license_date" = {
      kind      = google_datastore_index.tree_permit_reasonShort_license_date.kind
      properties = [
        for property in google_datastore_index.tree_permit_reasonShort_license_date.properties :
        {
          name      = property.name
          direction = property.direction
        }
      ]
    },
    "licenseType_license_date" = {
      kind      = google_datastore_index.tree_permit_licenseType_license_date.kind
      properties = [
        for property in google_datastore_index.tree_permit_licenseType_license_date.properties :
        {
          name      = property.name
          direction = property.direction
        }
      ]
    },
    "lastDateToObject_filter_sort" = {
      kind      = google_datastore_index.tree_permit_last_date_filter_sort.kind
      properties = [
        for property in google_datastore_index.tree_permit_last_date_filter_sort.properties :
        {
          name      = property.name
          direction = property.direction
        }
      ]
    },
    "created_at_sort" = {
      kind      = google_datastore_index.tree_permit_created_at_sort.kind
      properties = [
        for property in google_datastore_index.tree_permit_created_at_sort.properties :
        {
          name      = property.name
          direction = property.direction
        }
      ]
    },
    "settlement_sort" = {
      kind      = google_datastore_index.tree_permit_settlement_sort.kind
      properties = [
        for property in google_datastore_index.tree_permit_settlement_sort.properties :
        {
          name      = property.name
          direction = property.direction
        }
      ]
    },
    "license_date_sort" = {
      kind      = google_datastore_index.tree_permit_license_date_sort.kind
      properties = [
        for property in google_datastore_index.tree_permit_license_date_sort.properties :
        {
          name      = property.name
          direction = property.direction
        }
      ]
    }
  }
}

output "api_gateway_url" {
  value       = google_api_gateway_gateway.tree_permit_gateway.default_hostname
  description = "The public URL for the Tree Permit API"
}

output "API_URL" {
  description = "HTTPS base URL of the API App Service."
  value       = "https://${module.api.resource_uri}"
}

output "WEB_URL" {
  description = "HTTPS base URL of the Static Web App."
  value       = "https://${module.web.resource_uri}"
}

output "AZURE_RESOURCE_GROUP" {
  description = "Name of the resource group created for this AZD environment."
  value       = azurerm_resource_group.this.name
}

output "KEY_VAULT_NAME" {
  description = "Key Vault where API runtime secrets must be populated."
  value       = local.key_vault_name
}

output "API_OUTBOUND_IP_ADDRESSES" {
  description = "Current App Service outbound IP addresses to allow in MongoDB Atlas."
  value       = module.api.resource.outbound_ip_address_list
}

terraform {
  required_version = ">= 1.8.0, < 2.0.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

provider "azurerm" {
  features {}

  subscription_id = var.subscription_id
}

resource "random_id" "suffix" {
  byte_length = 3
}

locals {
  project_slug = "ai-companion"
  suffix       = random_id.suffix.hex

  resource_group_name = "rg-${local.project_slug}-${var.environment_name}"
  key_vault_name      = "kv${replace(local.project_slug, "-", "")}${local.suffix}"
  api_name            = "app-${local.project_slug}-${local.suffix}"
  web_name            = "swa-${local.project_slug}-${local.suffix}"
  service_plan_name   = "asp-${local.project_slug}-${local.suffix}"
  identity_name       = "id-${local.project_slug}-${var.environment_name}"
  workspace_name      = "law-${local.project_slug}-${local.suffix}"
  insights_name       = "appi-${local.project_slug}-${local.suffix}"

  common_tags = {
    "azd-env-name" = var.environment_name
    "managed-by"   = "azd"
    "project"      = "ai-companion-platform"
  }

  api_tags = merge(local.common_tags, {
    "azd-service-name" = "api"
  })

  web_tags = merge(local.common_tags, {
    "azd-service-name" = "web"
  })

  api_app_settings = {
    NODE_ENV                              = "production"
    PORT                                  = "8080"
    TRUST_PROXY                           = "1"
    WEB_APP_URL                           = "https://${module.web.resource_uri}"
    AI_PROVIDER                           = var.ai_provider
    AI_MODEL                              = var.ai_model
    GEMINI_API_KEY                        = "@Microsoft.KeyVault(VaultName=${local.key_vault_name};SecretName=gemini-api-key)"
    MONGODB_USERNAME                      = "@Microsoft.KeyVault(VaultName=${local.key_vault_name};SecretName=mongodb-username)"
    MONGODB_PASSWORD                      = "@Microsoft.KeyVault(VaultName=${local.key_vault_name};SecretName=mongodb-password)"
    MONGODB_HOST                          = var.mongodb_host
    MONGODB_DATABASE                      = var.mongodb_database
    JWT_ACCESS_SECRET                     = "@Microsoft.KeyVault(VaultName=${local.key_vault_name};SecretName=jwt-access-secret)"
    MAIL_HOST                             = var.mail_host
    MAIL_PORT                             = tostring(var.mail_port)
    MAIL_SECURE                           = tostring(var.mail_secure)
    MAIL_USER                             = "@Microsoft.KeyVault(VaultName=${local.key_vault_name};SecretName=mail-user)"
    MAIL_PASSWORD                         = "@Microsoft.KeyVault(VaultName=${local.key_vault_name};SecretName=mail-password)"
    MAIL_FROM                             = "@Microsoft.KeyVault(VaultName=${local.key_vault_name};SecretName=mail-from)"
    CLINICIAN_ALERT_EMAILS                = "@Microsoft.KeyVault(VaultName=${local.key_vault_name};SecretName=clinician-alert-emails)"
    APPLICATIONINSIGHTS_CONNECTION_STRING = module.application_insights.connection_string
    SCM_DO_BUILD_DURING_DEPLOYMENT        = "true"
  }
}

resource "azurerm_resource_group" "this" {
  name     = local.resource_group_name
  location = var.location
  tags     = local.common_tags
}

resource "azurerm_service_plan" "api" {
  name                = local.service_plan_name
  location            = azurerm_resource_group.this.location
  resource_group_name = azurerm_resource_group.this.name
  os_type             = "Linux"
  sku_name            = "B1"
  tags                = local.api_tags
}

resource "azurerm_user_assigned_identity" "api" {
  name                = local.identity_name
  location            = azurerm_resource_group.this.location
  resource_group_name = azurerm_resource_group.this.name
  tags                = local.common_tags
}

data "azurerm_client_config" "current" {}

module "key_vault" {
  source  = "Azure/avm-res-keyvault-vault/azurerm"
  version = "0.13.1"

  name                           = local.key_vault_name
  parent_id                      = azurerm_resource_group.this.id
  location                       = azurerm_resource_group.this.location
  tenant_id                      = data.azurerm_client_config.current.tenant_id
  sku_name                       = "standard"
  legacy_access_policies_enabled = false
  public_network_access_enabled  = true
  purge_protection_enabled       = true
  soft_delete_retention_days     = 7
  network_acls = {
    bypass         = "AzureServices"
    default_action = "Allow"
  }
  tags = local.common_tags
}

resource "azurerm_role_assignment" "api_key_vault_secrets" {
  scope                            = module.key_vault.resource_id
  role_definition_name             = "Key Vault Secrets User"
  principal_id                     = azurerm_user_assigned_identity.api.principal_id
  principal_type                   = "ServicePrincipal"
  skip_service_principal_aad_check = true
}

module "log_analytics" {
  source  = "Azure/avm-res-operationalinsights-workspace/azurerm"
  version = "0.5.1"

  name                                      = local.workspace_name
  location                                  = azurerm_resource_group.this.location
  resource_group_name                       = azurerm_resource_group.this.name
  log_analytics_workspace_retention_in_days = 30
  tags                                      = local.common_tags
}

module "application_insights" {
  source  = "Azure/avm-res-insights-component/azurerm"
  version = "0.5.0"

  name                 = local.insights_name
  location             = azurerm_resource_group.this.location
  parent_id            = azurerm_resource_group.this.id
  workspace_id         = module.log_analytics.resource_id
  application_type     = "web"
  daily_data_cap_in_gb = 1
  tags                 = local.common_tags
}

module "web" {
  source  = "Azure/avm-res-web-staticsite/azurerm"
  version = "0.6.2"

  name                = local.web_name
  location            = azurerm_resource_group.this.location
  resource_group_name = azurerm_resource_group.this.name
  sku_tier            = "Free"
  sku_size            = "Free"
  tags                = local.web_tags
}

module "api" {
  source  = "Azure/avm-res-web-site/azurerm"
  version = "0.24.1"

  name                     = local.api_name
  location                 = azurerm_resource_group.this.location
  parent_id                = azurerm_resource_group.this.id
  service_plan_resource_id = azurerm_service_plan.api.id
  https_only               = true
  app_settings             = local.api_app_settings
  managed_identities = {
    user_assigned_resource_ids = [azurerm_user_assigned_identity.api.id]
  }
  key_vault_reference_identity = azurerm_user_assigned_identity.api.id
  site_config = {
    always_on           = true
    ftps_state          = "Disabled"
    health_check_path   = "/health"
    http2_enabled       = true
    minimum_tls_version = "1.2"
    application_stack = {
      node = {
        node_version = "24-lts"
      }
    }
  }
  tags = local.api_tags

  depends_on = [
    azurerm_role_assignment.api_key_vault_secrets
  ]
}

data "azurerm_monitor_diagnostic_categories" "api" {
  resource_id = module.api.resource_id
}

resource "azurerm_monitor_diagnostic_setting" "api" {
  name                           = "diag-${local.api_name}"
  target_resource_id             = module.api.resource_id
  log_analytics_workspace_id     = module.log_analytics.resource_id
  log_analytics_destination_type = "Dedicated"

  dynamic "enabled_log" {
    for_each = data.azurerm_monitor_diagnostic_categories.api.log_category_types
    content {
      category = enabled_log.value
    }
  }

  dynamic "enabled_metric" {
    for_each = data.azurerm_monitor_diagnostic_categories.api.metrics
    content {
      category = enabled_metric.value
    }
  }
}

# Azure Deployment Plan

> **Status:** Ready for Validation

Generated: 2026-11-12

## 1. Project Overview

**Goal:** Add Azure deployment configuration for the existing AI Companion Platform. Generate `azure.yaml` and Terraform only; do not provision Azure resources.

**Path:** Modernize Existing

## 2. Requirements

| Attribute | Value |
|-----------|-------|
| Classification | Development / demo |
| Scale | Small: under 1,000 users |
| Budget | Cost-optimized |
| Subscription | Supplied through the AZD environment at deployment time; none selected here |
| Location | Required `AZURE_LOCATION` input at deployment time; no fixed region selected |
| Compliance / data residency | No special constraints specified; this is not a compliance assessment |

The Azure CLI is not installed and no Azure subscription is authenticated. Policy, regional availability, quotas, and cost have not been checked. This plan is not approval to deploy.

## 3. Components Detected

| Component | Type | Technology | Path |
|-----------|------|------------|------|
| API | API service | Node.js, TypeScript, Express | `apps/api` |
| Web | SPA | React, Vite | `apps/web` |

The API connects to MongoDB Atlas and external Gemini and SMTP services. Terraform will not provision or migrate those external services.

## 4. Recipe Selection

**Selected:** AZD with Terraform

**Rationale:** The request specifies both `azure.yaml` and Terraform. AZD will coordinate the two app deployments while Terraform owns the Azure infrastructure.

## 5. Architecture

**Stack:** App Service for the API; Static Web Apps for the SPA.

| Component | Azure service | Development configuration |
|-----------|---------------|---------------------------|
| API | Linux App Service | Basic B1, Node 24 LTS, HTTPS-only, `/health` probe, always on for in-process workers |
| Web | Static Web Apps | Free tier; AZD build hook sets `VITE_API_BASE_URL` from Terraform's API output and builds with pnpm |
| Secrets | Key Vault | Standard tier, RBAC, purge protection; app uses a user-assigned managed identity |
| Logs / telemetry | Log Analytics + Application Insights | Workspace-based, 30-day retention |

MongoDB Atlas remains external; its network access list will need the App Service outbound addresses before the API can connect. Gemini and SMTP credentials remain external secrets in Key Vault.

## 6. Provisioning Limits and Cost

**Status:** Not assessed. No subscription or region is selected, and this task is limited to generating files. Do not apply Terraform until the target subscription, region, applicable policies, and quotas have been checked.

| Planned resource | Count | Quota / capacity |
|------------------|-------|------------------|
| Resource group | 1 | Not checked |
| App Service plan and API app | 1 each | Not checked |
| Static Web App | 1 | Not checked |
| Key Vault and managed identity | 1 each | Not checked |
| Log Analytics workspace and Application Insights | 1 each | Not checked |
| Key Vault role assignment | 1 | Not checked |

Cost depends on the eventual region and usage. App Service B1 is a recurring charge; Static Web Apps Free has no base charge; Key Vault and telemetry usage may incur charges.

## 7. Execution Checklist

### Planning
- [x] Analyze workspace and identify the existing API and frontend
- [x] Gather development/demo, small-scale, and cost-optimized requirements
- [x] Select AZD with Terraform and document the proposed architecture
- [x] User approved file generation; Azure provisioning and deployment remain out of scope

### File generation and local validation
- [x] Generate `azure.yaml` and Terraform under `infra/`
- [x] Format, initialize, and validate the Terraform configuration locally
- [x] Keep all runtime secret values out of Terraform variables and state; use Key Vault references
- [x] Do not provision Azure resources or deploy application code in this task
- [ ] Validate `azure.yaml` with AZD; AZD is not installed in this environment

## 8. Runtime Configuration

Terraform creates Key Vault references but does not create or store secret values. Before the API can start, populate these Key Vault secrets out of band: `gemini-api-key`, `mongodb-username`, `mongodb-password`, `jwt-access-secret`, `mail-user`, `mail-password`, `mail-from`, and `clinician-alert-emails`.

Set the SMTP hostname in the AZD environment with `azd env set MAIL_HOST <hostname>`. Confirm the MongoDB Atlas hostname/database and Gemini model defaults in `infra/variables.tf` match the intended deployment. Add the App Service outbound IP addresses from Terraform output `API_OUTBOUND_IP_ADDRESSES` to the Atlas network access list.

## 9. Files Generated

| File | Purpose |
|------|---------|
| `azure.yaml` | AZD service definitions and frontend build hook |
| `infra/main.tf` | Azure resources |
| `infra/variables.tf` | Environment and location inputs |
| `infra/outputs.tf` | AZD resource and endpoint outputs |
| `infra/main.tfvars.json` | AZD environment-to-Terraform variable mapping |
| `infra/.terraform.lock.hcl` | Locked Terraform provider versions |
| `.gitignore` | Ignore local AZD environments and Terraform state |

## 10. Next Step

Ready for validation. Terraform syntax/configuration validation passed locally. AZD schema validation, Azure authentication, live quota checks, Terraform plan/apply, and application deployment have not been performed and remain out of scope.

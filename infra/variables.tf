variable "subscription_id" {
  description = "Azure subscription ID selected for the AZD environment."
  type        = string
}

variable "location" {
  description = "Azure region selected for the AZD environment."
  type        = string
}

variable "environment_name" {
  description = "AZD environment name used in resource names and tags."
  type        = string
}

variable "ai_provider" {
  description = "AI provider configured by the API."
  type        = string
  default     = "gemini"
}

variable "ai_model" {
  description = "Gemini model configured by the API."
  type        = string
  default     = "gemini-2.5-flash"
}

variable "mongodb_host" {
  description = "MongoDB Atlas hostname; replace the sample default if needed."
  type        = string
  default     = "cluster0.qxrvogc.mongodb.net"
}

variable "mongodb_database" {
  description = "MongoDB database name."
  type        = string
  default     = "ai-companion-platform"
}

variable "mail_host" {
  description = "SMTP hostname, provided with `azd env set MAIL_HOST <hostname>`."
  type        = string

  validation {
    condition     = can(regex("^[A-Za-z0-9.-]+$", trimspace(var.mail_host)))
    error_message = "mail_host must be an SMTP hostname. Set it with `azd env set MAIL_HOST <hostname>`."
  }
}

variable "mail_port" {
  description = "SMTP port."
  type        = number
  default     = 587

  validation {
    condition     = var.mail_port >= 1 && var.mail_port <= 65535
    error_message = "mail_port must be between 1 and 65535."
  }
}

variable "mail_secure" {
  description = "Whether SMTP uses implicit TLS (typically true for port 465)."
  type        = bool
  default     = false
}

terraform {
  backend "s3" {
    bucket         = "gis-platform-terraform-state"
    key            = "global/s3/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    kms_key_id     = "arn:aws:kms:us-east-1:${AWS_ACCOUNT_ID}:key/${KMS_KEY_ID}"
    dynamodb_table = "gis-platform-terraform-locks"
    
    workspace_key_prefix = "workspaces"
    
    skip_credentials_validation = false
    skip_metadata_api_check     = false
    skip_region_validation      = false
    force_path_style            = false
    
    assume_role = {
      role_arn     = "arn:aws:iam::${AWS_ACCOUNT_ID}:role/TerraformStateManager"
      session_name = "TerraformStateAccess"
    }
  }
  
  required_version = ">= 1.7.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.25"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.12"
    }
  }
}

#!/bin/bash

# Script to create GitHub issues for identified code quality problems
# This script can be used with GitHub CLI (gh) to create issues automatically

set -e

echo "🔍 Creating GitHub Issues for Code Quality Problems"
echo "=================================================="

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed. Please install it first:"
    echo "   https://cli.github.com/"
    exit 1
fi

# Check if user is authenticated with GitHub
if ! gh auth status &> /dev/null; then
    echo "❌ Not authenticated with GitHub. Please run 'gh auth login' first."
    exit 1
fi

# Function to create an issue
create_issue() {
    local title="$1"
    local body_file="$2"
    local labels="$3"
    
    echo "📝 Creating issue: $title"
    
    if [[ -f "$body_file" ]]; then
        gh issue create \
            --title "$title" \
            --body-file "$body_file" \
            --label "$labels"
        echo "✅ Issue created successfully"
    else
        echo "❌ Body file not found: $body_file"
        return 1
    fi
}

# Create security issues
echo ""
echo "🔒 Creating Security Issues..."
create_issue "[SECURITY] Hardcoded JWT Secret Key Vulnerability" \
    "github-issues/01-hardcoded-jwt-secret.md" \
    "security,critical,authentication"

create_issue "[SECURITY] SQL Injection Vulnerabilities in PostGIS Services" \
    "github-issues/02-sql-injection-vulnerabilities.md" \
    "security,critical,database"

# Create code quality issues
echo ""
echo "📝 Creating Code Quality Issues..."
create_issue "[QUALITY] TypeScript Configuration Inconsistency" \
    "github-issues/03-typescript-configuration-inconsistency.md" \
    "code-quality,typescript,configuration"

create_issue "[QUALITY] Excessive Use of 'any' Type Reduces Type Safety" \
    "github-issues/04-excessive-any-types.md" \
    "code-quality,typescript,type-safety"

create_issue "[QUALITY] Poor Logging Practices - Replace console.log with Structured Logging" \
    "github-issues/05-poor-logging-practices.md" \
    "code-quality,logging,maintainability"

echo ""
echo "🎯 Additional Issues to Create Manually:"
echo "----------------------------------------"
echo "6. [SECURITY] Hardcoded Database Credentials (High Priority)"
echo "7. [QUALITY] Large Controller Files Need Refactoring (Medium Priority)"
echo "8. [QUALITY] Incomplete Route Implementation (Medium Priority)"
echo "9. [QUALITY] Missing Input Validation (Medium Priority)"
echo "10. [QUALITY] Inconsistent Error Handling (Medium Priority)"
echo "11. [PERFORMANCE] Inefficient Database Operations (Medium Priority)"
echo "12. [QUALITY] Large Frontend Components (Medium Priority)"
echo "13. [TESTING] Missing Unit Tests (Medium Priority)"
echo "14. [DOCS] Missing API Documentation (Low Priority)"
echo "15. [QUALITY] Missing Error Boundaries in React (Low Priority)"

echo ""
echo "📋 Issue Templates Available:"
echo "- .github/ISSUE_TEMPLATE/security-issue.md"
echo "- .github/ISSUE_TEMPLATE/code-quality.md"

echo ""
echo "📊 Summary:"
echo "- 5 issues created automatically"
echo "- 10 additional issues identified for manual creation"
echo "- Issue templates available for consistent reporting"

echo ""
echo "✅ GitHub Issues Creation Complete!"
echo "📖 See ISSUES_REPORT.md for detailed analysis of all issues found."
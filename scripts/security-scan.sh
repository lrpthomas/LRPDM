#!/bin/bash
# Enhanced Security Scanning Script for LRPDM QRA Requirements

echo "🔒 LRPDM Security Scan - QRA Compliance Check"
echo "============================================="

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

SCAN_RESULTS=()
TOTAL_ISSUES=0
EXIT_CODE=0

# Function to log results
log_result() {
    local status="$1"
    local message="$2"
    local details="$3"
    
    if [ "$status" = "PASS" ]; then
        echo "✅ $message"
    elif [ "$status" = "FAIL" ]; then
        echo "❌ $message"
        if [ -n "$details" ]; then
            echo "   Details: $details"
        fi
        EXIT_CODE=1
        TOTAL_ISSUES=$((TOTAL_ISSUES + 1))
    else
        echo "⚠️  $message"
        if [ -n "$details" ]; then
            echo "   Details: $details"
        fi
    fi
    
    SCAN_RESULTS+=("$status: $message")
}

echo "🔍 1. Dependency Vulnerability Scan"
echo "-----------------------------------"

if command -v npm &> /dev/null; then
    npm audit --json > security-audit.json 2>/dev/null
    
    if [ $? -eq 0 ]; then
        # Parse audit results
        VULN_COUNT=$(node -e "
            try {
                const audit = JSON.parse(require('fs').readFileSync('security-audit.json', 'utf8'));
                const vulns = audit.metadata?.vulnerabilities || {};
                const total = Object.values(vulns).reduce((sum, count) => sum + count, 0);
                console.log(total);
            } catch(e) {
                console.log('0');
            }
        ")
        
        if [ "$VULN_COUNT" -eq 0 ]; then
            log_result "PASS" "No dependency vulnerabilities found"
        else
            log_result "FAIL" "Found $VULN_COUNT dependency vulnerabilities" "Run 'npm audit fix' to resolve"
        fi
    else
        log_result "WARN" "Could not run npm audit" "npm audit command failed"
    fi
    
    # Clean up temp file
    rm -f security-audit.json
else
    log_result "WARN" "npm not available for dependency scanning"
fi

echo ""
echo "🔍 2. Secret Detection Scan"
echo "---------------------------"

# Simple secret pattern detection
SECRET_PATTERNS=(
    "password\s*=\s*['\"][^'\"]{8,}"
    "api[_-]?key\s*=\s*['\"][^'\"]{16,}"
    "secret\s*=\s*['\"][^'\"]{16,}"
    "token\s*=\s*['\"][^'\"]{20,}"
    "private[_-]?key"
    "-----BEGIN.*PRIVATE KEY-----"
)

SECRET_FOUND=0
for pattern in "${SECRET_PATTERNS[@]}"; do
    if grep -r -i -E "$pattern" src/ packages/ apps/ 2>/dev/null | grep -v node_modules | head -1 > /dev/null; then
        SECRET_FOUND=1
        break
    fi
done

if [ $SECRET_FOUND -eq 1 ]; then
    log_result "FAIL" "Potential secrets found in code" "Review code for hardcoded credentials"
else
    log_result "PASS" "No obvious secrets detected in source code"
fi

echo ""
echo "🔍 3. Code Security Analysis"
echo "----------------------------"

# Check for SQL injection vulnerabilities
SQL_INJECTION=0
if grep -r "query.*+.*req\." src/ packages/ apps/ 2>/dev/null | head -1 > /dev/null; then
    SQL_INJECTION=1
fi

if [ $SQL_INJECTION -eq 1 ]; then
    log_result "FAIL" "Potential SQL injection vulnerabilities" "Use parameterized queries"
else
    log_result "PASS" "No obvious SQL injection patterns detected"
fi

# Check for XSS vulnerabilities
XSS_RISK=0
if grep -r "innerHTML.*req\." src/ packages/ apps/ 2>/dev/null | head -1 > /dev/null; then
    XSS_RISK=1
fi

if [ $XSS_RISK -eq 1 ]; then
    log_result "FAIL" "Potential XSS vulnerabilities" "Sanitize user input before using innerHTML"
else
    log_result "PASS" "No obvious XSS patterns detected"
fi

echo ""
echo "🔍 4. Configuration Security"
echo "-----------------------------"

# Check for exposed configuration
if [ -f ".env" ] && [ -r ".env" ]; then
    if grep -q "password\|secret\|key" .env 2>/dev/null; then
        log_result "WARN" ".env file contains sensitive data" "Ensure .env is in .gitignore"
    else
        log_result "PASS" ".env file exists and appears safe"
    fi
fi

# Check .gitignore
if [ -f ".gitignore" ]; then
    if grep -q "\.env" .gitignore && grep -q "node_modules" .gitignore; then
        log_result "PASS" ".gitignore properly configured"
    else
        log_result "FAIL" ".gitignore missing critical entries" "Add .env and node_modules to .gitignore"
    fi
else
    log_result "FAIL" ".gitignore file missing" "Create .gitignore to prevent sensitive files from being committed"
fi

echo ""
echo "🔍 5. Security Headers Check"
echo "-----------------------------"

# Check if security middleware is configured
SECURITY_MIDDLEWARE=0
if grep -r "helmet\|cors" src/ packages/ apps/ 2>/dev/null | head -1 > /dev/null; then
    SECURITY_MIDDLEWARE=1
fi

if [ $SECURITY_MIDDLEWARE -eq 1 ]; then
    log_result "PASS" "Security middleware detected in code"
else
    log_result "WARN" "No security middleware detected" "Consider adding helmet.js for security headers"
fi

echo ""
echo "📊 Security Scan Summary"
echo "========================"
echo "Total Issues Found: $TOTAL_ISSUES"
echo ""

for result in "${SCAN_RESULTS[@]}"; do
    echo "$result"
done

echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo "🎉 Security scan PASSED - No critical issues found"
else
    echo "🚨 Security scan FAILED - $TOTAL_ISSUES issues require attention"
fi

echo ""
echo "📄 Detailed Report: security-scan-report.txt"

# Generate detailed report
cat > security-scan-report.txt << EOF
LRPDM Security Scan Report
Generated: $(date)
=========================

Total Issues: $TOTAL_ISSUES
Status: $([ $EXIT_CODE -eq 0 ] && echo "PASSED" || echo "FAILED")

Scan Results:
$(printf '%s\n' "${SCAN_RESULTS[@]}")

Recommendations:
- Run 'npm audit fix' regularly to address dependency vulnerabilities
- Use environment variables for sensitive configuration
- Implement proper input validation and sanitization
- Add security middleware (helmet.js) for HTTP security headers
- Regular security code reviews and penetration testing

EOF

exit $EXIT_CODE
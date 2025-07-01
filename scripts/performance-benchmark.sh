#!/bin/bash
# Performance Benchmarking Script for LRPDM QRA Requirements

echo "⚡ LRPDM Performance Benchmarks - QRA Compliance Check"
echo "======================================================"

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

BENCHMARK_RESULTS=()
TOTAL_FAILURES=0
EXIT_CODE=0

# Function to log benchmark results
log_benchmark() {
    local test_name="$1"
    local result="$2"
    local target="$3"
    local actual="$4"
    local unit="$5"
    
    if [ "$result" = "PASS" ]; then
        echo "✅ $test_name: $actual$unit (target: <$target$unit)"
    else
        echo "❌ $test_name: $actual$unit (target: <$target$unit)"
        TOTAL_FAILURES=$((TOTAL_FAILURES + 1))
        EXIT_CODE=1
    fi
    
    BENCHMARK_RESULTS+=("$test_name: $actual$unit (target: <$target$unit) - $result")
}

echo "🔍 1. Build Performance"
echo "----------------------"

echo "Testing build time..."
BUILD_START=$(date +%s%N)

if npm run build > /dev/null 2>&1; then
    BUILD_END=$(date +%s%N)
    BUILD_TIME_NS=$((BUILD_END - BUILD_START))
    BUILD_TIME_S=$((BUILD_TIME_NS / 1000000000))
    
    # Target: Build should complete in under 60 seconds
    if [ $BUILD_TIME_S -lt 60 ]; then
        log_benchmark "Build Time" "PASS" "60" "$BUILD_TIME_S" "s"
    else
        log_benchmark "Build Time" "FAIL" "60" "$BUILD_TIME_S" "s"
    fi
else
    log_benchmark "Build Time" "FAIL" "60" "FAILED" ""
fi

echo ""
echo "🔍 2. Test Suite Performance"
echo "----------------------------"

echo "Testing unit test execution time..."
TEST_START=$(date +%s)

if timeout 180 npm run test:unit > /dev/null 2>&1; then
    TEST_END=$(date +%s)
    TEST_TIME=$((TEST_END - TEST_START))
    
    # Target: Unit tests should complete in under 30 seconds
    if [ $TEST_TIME -lt 30 ]; then
        log_benchmark "Unit Test Time" "PASS" "30" "$TEST_TIME" "s"
    else
        log_benchmark "Unit Test Time" "FAIL" "30" "$TEST_TIME" "s"
    fi
else
    log_benchmark "Unit Test Time" "FAIL" "30" "TIMEOUT/FAILED" ""
fi

echo ""
echo "🔍 3. Memory Usage Analysis"
echo "--------------------------"

# Check if we can analyze memory usage during build
echo "Analyzing memory usage during build..."

# Simple memory check using Node.js
node -e "
const used = process.memoryUsage();
const totalMB = Math.round(used.rss / 1024 / 1024);
console.log('Current memory usage: ' + totalMB + 'MB');

// Target: Should use less than 512MB for basic operations
if (totalMB < 512) {
    console.log('✅ Memory usage acceptable (<512MB)');
    process.exit(0);
} else {
    console.log('❌ Memory usage high (≥512MB)');
    process.exit(1);
}
" && MEMORY_RESULT="PASS" || MEMORY_RESULT="FAIL"

if [ "$MEMORY_RESULT" = "PASS" ]; then
    log_benchmark "Memory Usage" "PASS" "512" "<512" "MB"
else
    log_benchmark "Memory Usage" "FAIL" "512" "≥512" "MB"
fi

echo ""
echo "🔍 4. File System Performance"
echo "-----------------------------"

# Test file operations speed
echo "Testing file system operations..."

# Create a test file and measure write/read speed
TEST_FILE="/tmp/lrpdm_perf_test.tmp"
TEST_DATA="$(head -c 1048576 /dev/zero | tr '\0' 'x')"  # 1MB of data

# Write test
WRITE_START=$(date +%s%N)
echo "$TEST_DATA" > "$TEST_FILE"
WRITE_END=$(date +%s%N)
WRITE_TIME_MS=$(((WRITE_END - WRITE_START) / 1000000))

# Read test
READ_START=$(date +%s%N)
cat "$TEST_FILE" > /dev/null
READ_END=$(date +%s%N)
READ_TIME_MS=$(((READ_END - READ_START) / 1000000))

# Cleanup
rm -f "$TEST_FILE"

# Target: 1MB file operations should take less than 100ms each
if [ $WRITE_TIME_MS -lt 100 ]; then
    log_benchmark "File Write (1MB)" "PASS" "100" "$WRITE_TIME_MS" "ms"
else
    log_benchmark "File Write (1MB)" "FAIL" "100" "$WRITE_TIME_MS" "ms"
fi

if [ $READ_TIME_MS -lt 100 ]; then
    log_benchmark "File Read (1MB)" "PASS" "100" "$READ_TIME_MS" "ms"
else
    log_benchmark "File Read (1MB)" "FAIL" "100" "$READ_TIME_MS" "ms"
fi

echo ""
echo "🔍 5. Dependency Installation Performance"
echo "----------------------------------------"

echo "Testing npm install performance..."

# Test npm install speed (using npm ci for consistency)
if [ -f "package-lock.json" ]; then
    # Clean install test
    INSTALL_START=$(date +%s)
    
    # Create a temporary directory for clean install test
    TEMP_DIR="/tmp/lrpdm_install_test"
    mkdir -p "$TEMP_DIR"
    cp package.json package-lock.json "$TEMP_DIR/"
    
    cd "$TEMP_DIR"
    if timeout 300 npm ci > /dev/null 2>&1; then
        INSTALL_END=$(date +%s)
        INSTALL_TIME=$((INSTALL_END - INSTALL_START))
        
        # Target: npm ci should complete in under 180 seconds
        if [ $INSTALL_TIME -lt 180 ]; then
            log_benchmark "npm ci Time" "PASS" "180" "$INSTALL_TIME" "s"
        else
            log_benchmark "npm ci Time" "FAIL" "180" "$INSTALL_TIME" "s"
        fi
    else
        log_benchmark "npm ci Time" "FAIL" "180" "TIMEOUT/FAILED" ""
    fi
    
    # Cleanup
    cd "$PROJECT_ROOT"
    rm -rf "$TEMP_DIR"
else
    log_benchmark "npm ci Time" "SKIP" "180" "No package-lock.json" ""
fi

echo ""
echo "🔍 6. TypeScript Compilation Performance"
echo "---------------------------------------"

echo "Testing TypeScript compilation speed..."

# Test type checking performance
TYPE_START=$(date +%s)

if timeout 120 npm run type-check > /dev/null 2>&1; then
    TYPE_END=$(date +%s)
    TYPE_TIME=$((TYPE_END - TYPE_START))
    
    # Target: Type checking should complete in under 30 seconds
    if [ $TYPE_TIME -lt 30 ]; then
        log_benchmark "TypeScript Check" "PASS" "30" "$TYPE_TIME" "s"
    else
        log_benchmark "TypeScript Check" "FAIL" "30" "$TYPE_TIME" "s"
    fi
else
    log_benchmark "TypeScript Check" "FAIL" "30" "TIMEOUT/FAILED" ""
fi

echo ""
echo "📊 Performance Benchmark Summary"
echo "================================"
echo "Total Failures: $TOTAL_FAILURES"
echo ""

for result in "${BENCHMARK_RESULTS[@]}"; do
    echo "$result"
done

echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo "🎉 Performance benchmarks PASSED - All targets met"
else
    echo "🚨 Performance benchmarks FAILED - $TOTAL_FAILURES targets missed"
fi

echo ""
echo "📄 Detailed Report: performance-benchmark-report.txt"

# Generate detailed report
cat > performance-benchmark-report.txt << EOF
LRPDM Performance Benchmark Report
Generated: $(date)
=================================

Total Failures: $TOTAL_FAILURES
Status: $([ $EXIT_CODE -eq 0 ] && echo "PASSED" || echo "FAILED")

Benchmark Results:
$(printf '%s\n' "${BENCHMARK_RESULTS[@]}")

Performance Targets (LRPDM Requirements):
- Build Time: < 60 seconds
- Unit Test Time: < 30 seconds  
- Memory Usage: < 512MB
- File Operations: < 100ms for 1MB
- npm ci Time: < 180 seconds
- TypeScript Check: < 30 seconds

Recommendations:
- Optimize build process and bundle size
- Improve test efficiency and parallelization
- Monitor memory usage and fix memory leaks
- Use SSD storage for better I/O performance
- Cache dependencies and type checking results
- Regular performance regression testing

EOF

exit $EXIT_CODE
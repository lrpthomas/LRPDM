#!/bin/bash

# Generate spatial API endpoint
generate_spatial_endpoint() {
    claude-code generate \
        --agent gis-spatial-agent \
        --workflow spatial-api \
        --input "requirements=$1" \
        --output packages/api/src/routes/
}

# Optimize PostGIS query
optimize_query() {
    claude-code ask \
        --agent gis-spatial-agent \
        "Optimize this PostGIS query for performance: $1"
}

# Generate React map component
generate_map_component() {
    claude-code generate \
        --agent frontend-spatial-agent \
        --workflow react-component \
        --input "requirements=$1" \
        --output packages/web/src/components/
}

# Validate spatial schema
validate_schema() {
    claude-code ask \
        --agent database-spatial-agent \
        "Review this PostGIS schema for best practices: $(cat $1)"
}

# Generate migration script
generate_migration() {
    claude-code generate \
        --agent database-spatial-agent \
        --template migration \
        --input "changes=$1" \
        --output migrations/
}

# Create vector tile endpoint
generate_tile_endpoint() {
    claude-code generate \
        --agent gis-spatial-agent \
        --template vector-tiles \
        --input "layer_config=$1" \
        --output packages/api/src/routes/tiles/
}

# Performance audit
audit_spatial_performance() {
    claude-code ask \
        --agent database-spatial-agent \
        "Audit spatial query performance for: $(find packages/api -name '*.sql' -o -name '*.ts' | grep -E '(spatial|geo)')"
}

# Generate test data
generate_test_data() {
    claude-code generate \
        --agent database-spatial-agent \
        --template test-data \
        --input "data_type=$1,count=$2" \
        --output tests/fixtures/
}

# Run spatial code review
spatial_review() {
    claude-code review \
        --agent gis-spatial-agent \
        --files "$@" \
        --criteria "PostGIS best practices,Performance,Security,Type safety"
}

# Generate API documentation
generate_api_docs() {
    claude-code generate \
        --agent gis-spatial-agent \
        --template api-docs \
        --input "endpoints=$(find packages/api/src/routes -name '*.ts')" \
        --format openapi \
        --output docs/api/
}

# Analyze spatial complexity
analyze_complexity() {
    claude-code ask \
        --agent database-spatial-agent \
        "Analyze spatial query complexity and suggest optimizations for: $1"
}

# Generate spatial index recommendations
recommend_indexes() {
    claude-code ask \
        --agent database-spatial-agent \
        "Recommend spatial indexes for tables in: $(cat $1)"
}

# Main command handler
case "$1" in
    "spatial-endpoint")
        generate_spatial_endpoint "$2"
        ;;
    "optimize")
        optimize_query "$2"
        ;;
    "map-component")
        generate_map_component "$2"
        ;;
    "validate-schema")
        validate_schema "$2"
        ;;
    "migration")
        generate_migration "$2"
        ;;
    "tile-endpoint")
        generate_tile_endpoint "$2"
        ;;
    "audit")
        audit_spatial_performance
        ;;
    "test-data")
        generate_test_data "$2" "$3"
        ;;
    "review")
        shift
        spatial_review "$@"
        ;;
    "api-docs")
        generate_api_docs
        ;;
    "analyze")
        analyze_complexity "$2"
        ;;
    "indexes")
        recommend_indexes "$2"
        ;;
    *)
        echo "Usage: $0 {spatial-endpoint|optimize|map-component|validate-schema|migration|tile-endpoint|audit|test-data|review|api-docs|analyze|indexes} [args]"
        exit 1
        ;;
esac
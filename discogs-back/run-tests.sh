#!/bin/bash

# Test runner script for Discogs Helper Backend
# Requires Docker to be running

set -e

echo "=================================="
echo "Discogs Helper - Test Runner"
echo "=================================="
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running"
    echo "Please start Docker and try again"
    exit 1
fi

echo "✓ Docker is running"
echo ""

# Parse command line arguments
TEST_TYPE="${1:-all}"

case "$TEST_TYPE" in
    "all")
        echo "Running all tests..."
        npm test
        ;;
    "unit")
        echo "Running unit tests..."
        npm run test:unit
        ;;
    "integration")
        echo "Running integration tests..."
        npm run test:integration
        ;;
    "watch")
        echo "Running tests in watch mode..."
        npm run test:watch
        ;;
    *)
        echo "Unknown test type: $TEST_TYPE"
        echo ""
        echo "Usage: ./run-tests.sh [all|unit|integration|watch]"
        echo ""
        echo "  all         - Run all tests (default)"
        echo "  unit        - Run only unit tests"
        echo "  integration - Run only integration tests"
        echo "  watch       - Run tests in watch mode"
        exit 1
        ;;
esac

echo ""
echo "=================================="
echo "Tests completed!"
echo "=================================="




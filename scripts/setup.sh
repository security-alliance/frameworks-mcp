#!/bin/bash
# Setup script to initialize the MCP server
# Run this after cloning the repo

set -e

FRAMEWORKS_REPO="frameworks-repo"
FRAMEWORKS_URL="https://github.com/security-alliance/frameworks"
FRAMEWORKS_BRANCH="main"

echo "=== Frameworks MCP Setup ==="
echo ""

# Install dependencies if not already installed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    pnpm install
    echo ""
fi

# Check if frameworks-repo already exists
if [ -d "$FRAMEWORKS_REPO" ]; then
    echo "Found existing frameworks-repo directory"
    echo "Updating..."
    cd $FRAMEWORKS_REPO && git fetch origin $FRAMEWORKS_BRANCH && git checkout $FRAMEWORKS_BRANCH && cd ..
else
    echo "Cloning frameworks repository..."
    git clone --depth 1 --branch $FRAMEWORKS_BRANCH $FRAMEWORKS_URL $FRAMEWORKS_REPO
fi

# Get commit SHA
COMMIT_SHA=$(cd $FRAMEWORKS_REPO && git rev-parse HEAD)
echo "Using frameworks @ $COMMIT_SHA"
echo ""

# Build indexes
echo "Building indexes..."
mkdir -p indexes

pnpm run index:build -- \
    --branch main \
    --sha "$COMMIT_SHA" \
    -- --content-dir "$(pwd)/$FRAMEWORKS_REPO/docs/pages"

pnpm run index:build -- \
    --branch develop \
    --sha "$COMMIT_SHA" \
    -- --content-dir "$(pwd)/$FRAMEWORKS_REPO/docs/pages"

echo ""
echo "=== Setup Complete ==="
echo ""
echo "To run the MCP server:"
echo "  node_modules/.bin/tsx apps/frameworks-mcp/src/index.ts"
echo ""
echo "To add to Claude Code:"
echo "  claude mcp add frameworks --scope user -- \"$(pwd)/node_modules/.bin/tsx\" \"$(pwd)/apps/frameworks-mcp/src/index.ts\""
echo ""
echo "To update content later:"
echo "  cd $FRAMEWORKS_REPO && git pull && pnpm run index:build ..."
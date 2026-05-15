#!/bin/bash
# Setup script to initialize the MCP server
# Run this after cloning the repo

set -e

FRAMEWORKS_URL="https://github.com/security-alliance/frameworks"

MAIN_REPO="frameworks-repo-main"
DEVELOP_REPO="frameworks-repo-develop"

function clone_or_update() {
  local repo_dir="$1"
  local branch="$2"
  if [ -d "$repo_dir/.git" ]; then
    echo "Updating $repo_dir for $branch..."
    cd "$repo_dir" && git fetch origin "$branch" && git checkout "$branch" && git pull origin "$branch" && cd ..
  else
    echo "Cloning frameworks $branch into $repo_dir..."
    git clone --depth 1 --branch "$branch" "$FRAMEWORKS_URL" "$repo_dir"
  fi
}

echo "=== Frameworks MCP Setup ==="
echo ""

# Install dependencies if not already installed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    pnpm install
    echo ""
fi

clone_or_update "$MAIN_REPO" "main"
clone_or_update "$DEVELOP_REPO" "develop"

MAIN_SHA=$(cd "$MAIN_REPO" && git rev-parse HEAD)
DEVELOP_SHA=$(cd "$DEVELOP_REPO" && git rev-parse HEAD)

echo "Using frameworks main @ $MAIN_SHA"
echo "Using frameworks develop @ $DEVELOP_SHA"
echo ""

# Build indexes
mkdir -p indexes

pnpm run index:build -- \
    --branch main \
    --sha "$MAIN_SHA" \
    --content-dir "$(pwd)/$MAIN_REPO/docs/pages"

pnpm run index:build -- \
    --branch develop \
    --sha "$DEVELOP_SHA" \
    --content-dir "$(pwd)/$DEVELOP_REPO/docs/pages"

pnpm exec tsx scripts/generate-manifest.ts --index-dir indexes

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
echo "  Run this script again or use pnpm run check:updates"

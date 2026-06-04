#!/bin/bash
# Start Phantoma server with environment variables loaded from .env

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(dirname "$SCRIPT_DIR")"

# Load .env if it exists
if [ -f "$SERVER_DIR/.env" ]; then
  export $(grep -v '^#' "$SERVER_DIR/.env" | xargs)
  echo "Loaded .env"
fi

echo "Starting Phantoma server..."
cd "$SERVER_DIR"
go run ./cmd/api

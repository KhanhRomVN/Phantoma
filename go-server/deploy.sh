#!/bin/bash

# Deployment script for Phantoma Server with Google Dorking

set -e

echo "🚀 Deploying Phantoma Server with Google Dorking..."

# Step 1: Build go-dork Docker image
echo "📦 Building go-dork Docker image..."
cd docker
docker build -f Dockerfile.go-dork -t go-dork:latest .
cd ..

# Step 2: Start all containers
echo "🐳 Starting Docker containers..."
cd docker
docker-compose up -d
cd ..

# Step 3: Wait for containers to be ready
echo "⏳ Waiting for containers to be ready..."
sleep 5

# Step 4: Verify go-dork container is running
if docker ps | grep -q "go-dork"; then
    echo "✅ go-dork container is running"
else
    echo "❌ go-dork container failed to start"
    exit 1
fi

# Step 5: Set environment variables
echo "🔧 Setting environment variables..."
export GO_DORK_CONTAINER=go-dork
export PORT=8080

# Step 6: Run the server
echo "🌐 Starting Phantoma server..."
go run cmd/server/main.go

echo "✅ Deployment complete! Server running on http://localhost:8080"
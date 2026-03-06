#!/bin/bash
# Deployment Build Script
# This script can be used by hosting providers (like Render or Railway) 
# if they require a custom build command instead of 'npm install'.

echo "🚀 Starting build process..."

# 1. Setup Backend
echo "📦 Installing backend dependencies..."
cd backend
npm install
# Note: Backend does not require a 'build' step, just installation.
cd ..

# 2. Setup Frontend (Optional for Render, handled automatically by Vercel)
# If deploying frontend to Vercel, you don't need this script. Vercel automatically 
# detects Next.js, installs dependencies, and runs 'npm run build'.
echo "💻 Installing frontend dependencies..."
cd internarea
npm install
echo "🏗️ Building frontend..."
npm run build
cd ..

echo "✅ Build complete! Ready for deployment."

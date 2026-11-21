#!/usr/bin/env bash
# EduNotify - Quick GitHub Repository Setup Script
# Usage: ./setup-git.sh <your-github-repo-url>

set -e

REPO_URL=$1

echo "=========================================================="
echo " EduNotify School Suite - GitHub Repository Initializer"
echo "=========================================================="

if [ ! -d ".git" ]; then
  echo "Initializing local git repository..."
  git init
  git branch -M main
else
  echo "Existing git repository detected."
fi

echo "Staging files..."
git add .

echo "Creating initial commit..."
git commit -m "Initial commit: EduNotify School Suite & WhatsApp Web Login Server" || echo "Working tree clean, proceeding..."

if [ -n "$REPO_URL" ]; then
  echo "Setting remote origin to $REPO_URL..."
  git remote remove origin 2>/dev/null || true
  git remote add origin "$REPO_URL"
  echo "Pushing code to $REPO_URL on branch main..."
  git push -u origin main
  echo "Successfully uploaded and pushed to GitHub!"
else
  echo ""
  echo "To link your GitHub repository and upload your code, run:"
  echo "  git remote add origin https://github.com/<your-username>/<your-repo-name>.git"
  echo "  git push -u origin main"
fi

echo "=========================================================="

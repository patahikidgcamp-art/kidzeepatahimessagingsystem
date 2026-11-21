#!/usr/bin/env bash
# ===============================================================================
#                KIDZEE SCHOOL - AUTOMATED APPLICATION INSTALLER (Linux/Mac)
#        Parent Reporting, Dues Tracking, WhatsApp Web & Server Gateway
# ===============================================================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}===============================================================================${NC}"
echo -e "${BLUE}               KIDZEE SCHOOL - AUTOMATED APPLICATION INSTALLER${NC}"
echo -e "${BLUE}===============================================================================${NC}"
echo ""

# 1. Check Node.js
echo -e "${BLUE}[1/5] Checking Node.js runtime environment...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERROR] Node.js is NOT installed!${NC}"
    echo "Please install Node.js LTS from https://nodejs.org or via your package manager."
    echo "Ubuntu/Debian: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs"
    echo "macOS (Homebrew): brew install node"
    exit 1
fi

NODE_VERSION=$(node -v)
NPM_VERSION=$(npm -v)
echo " -- Found Node.js: $NODE_VERSION"
echo " -- Found npm:     $NPM_VERSION"
echo ""

# 2. Setup .env
echo -e "${BLUE}[2/5] Setting up environment configuration (.env)...${NC}"
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo " -- Created .env from .env.example"
    else
        echo "PORT=3000" > .env
        echo " -- Created default .env"
    fi
else
    echo " -- Existing .env file found."
fi
echo ""

# 3. Create persistent storage folder
echo -e "${BLUE}[3/5] Setting up persistent storage folder (.data)...${NC}"
mkdir -p .data
echo " -- Verified .data directory"
echo ""

# 4. Install dependencies
echo -e "${BLUE}[4/5] Installing dependencies via npm install...${NC}"
npm install
echo ""

# 5. Make launcher scripts executable
echo -e "${BLUE}[5/5] Configuring execute permissions...${NC}"
chmod +x install.sh start.sh setup-git.sh 2>/dev/null || true
echo " -- Configured execute permissions for start.sh and setup-git.sh"
echo ""

echo -e "${GREEN}===============================================================================${NC}"
echo -e "${GREEN}                INSTALLATION COMPLETED SUCCESSFULLY!${NC}"
echo -e "${GREEN}===============================================================================${NC}"
echo ""
echo "To start the application anytime, run:"
echo "   ./start.sh   OR   npm start"
echo ""

read -p "Would you like to start the application right now? [Y/n]: " START_NOW
START_NOW=${START_NOW:-Y}

if [[ "$START_NOW" =~ ^[Yy]$ ]]; then
    echo "Starting Kidzee School on http://localhost:3000..."
    if command -v xdg-open &> /dev/null; then
        xdg-open "http://localhost:3000" &
    elif command -v open &> /dev/null; then
        open "http://localhost:3000" &
    fi
    npm start
fi

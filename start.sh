#!/usr/bin/env bash
# ===============================================================================
#                KIDZEE SCHOOL SUITE - LAUNCHER (Linux/Mac)
# ===============================================================================

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}===============================================================================${NC}"
echo -e "${BLUE}                KIDZEE SCHOOL SUITE - LAUNCHER${NC}"
echo -e "${BLUE}===============================================================================${NC}"
echo ""
echo -e "${GREEN}Starting Kidzee School server on http://localhost:3000...${NC}"
echo ""

# Open browser in background after 2 seconds
(
    sleep 2
    if command -v xdg-open &> /dev/null; then
        xdg-open "http://localhost:3000" &> /dev/null || true
    elif command -v open &> /dev/null; then
        open "http://localhost:3000" &> /dev/null || true
    fi
) &

npm start || npm run dev

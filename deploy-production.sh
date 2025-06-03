#!/bin/bash
# PremierFix Production Deployment Script

# Color codes for better visibility
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}PremierFix Production Deployment${NC}"
echo "------------------------------"
echo -e "${YELLOW}This script will help deploy PremierFix to PRODUCTION.${NC}"
echo

# Ensure firebase CLI is installed
command -v firebase >/dev/null 2>&1 || { 
    echo -e "${RED}Error: Firebase CLI not found. Please install it using 'npm install -g firebase-tools'${NC}" 
    exit 1
}

# Check if user is logged in to Firebase
FIREBASE_STATUS=$(firebase login:list 2>&1)
if [[ $FIREBASE_STATUS == *"No authorized accounts"* ]]; then
    echo -e "${YELLOW}You need to log in to Firebase first.${NC}"
    firebase login
fi

# Ask for confirmation
echo -e "${YELLOW}WARNING: This will deploy to the PRODUCTION environment (premierfix-prod).${NC}"
echo -e "${YELLOW}All development files will be available but will not be used if accessed from premierfix.uk domain.${NC}"
read -p "Are you sure you want to continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo -e "${RED}Deployment cancelled by user.${NC}"
    exit 1
fi

# Create or update firebase-config-prod.js if needed
if [ ! -f "js/firebase-config-prod.js" ]; then
    echo -e "${RED}Warning: js/firebase-config-prod.js not found.${NC}"
    echo -e "${YELLOW}You need to create a firebase-config-prod.js file with the production Firebase credentials.${NC}"
    read -p "Would you like to continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]
    then
        echo -e "${RED}Deployment cancelled. Please create the production Firebase config file first.${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}Production Firebase config file found.${NC}"
fi

# Check for temporary or backup files that should not be deployed
echo "Checking for files that should not be deployed..."
TMP_FILES=$(find . -name "*.tmp" -o -name "*.bak*" | wc -l)
if [ $TMP_FILES -gt 0 ]; then
    echo -e "${YELLOW}Found $TMP_FILES temporary/backup files. These will be ignored during deployment as specified in firebase-prod.json.${NC}"
fi

# Check for tracking-new.html and tracking-new.js
if [ -f "tracking-new.html" ] || [ -f "js/tracking-new.js" ]; then
    echo -e "${YELLOW}Warning: Found old tracking-new files. These will be ignored during deployment.${NC}"
    echo "    If you have renamed them to tracking.html and tracking.js, you can safely proceed."
fi

# Switch to production configuration
echo "Using production Firebase configuration..."
cp -f firebase-prod.json firebase.json
cp -f .firebaserc-prod .firebaserc

# Start the deployment
echo -e "${GREEN}Starting deployment to PRODUCTION...${NC}"
firebase deploy

# Restore development configuration
echo "Restoring development configuration..."
git checkout -- firebase.json .firebaserc 2>/dev/null || echo -e "${YELLOW}Note: Could not restore original firebase.json and .firebaserc. This is normal if you're not using git.${NC}"

echo -e "${GREEN}Deployment complete!${NC}"
echo
echo -e "${BLUE}Next steps:${NC}"
echo "1. Verify the deployment at your Firebase hosting URL."
echo "2. Set up custom domain 'premierfix.uk' in the Firebase console if not already done."
echo "3. Update your DNS records at Fasthosts to point to Firebase hosting."
echo
echo -e "${YELLOW}Note:${NC} The production version will automatically use the production Firebase config when accessed via premierfix.uk domain."
echo "Thank you for using PremierFix Deployment Script!" 
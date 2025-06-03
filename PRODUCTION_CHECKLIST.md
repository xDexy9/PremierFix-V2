# PremierFix Production Deployment Checklist

## Pre-Deployment Checks

### Firebase Project Setup
- [ ] Created new Firebase project named "PremierFix-Prod"
- [ ] Enabled Firestore Database in the production project
- [ ] Enabled Firebase Storage in the production project
- [ ] Enabled Firebase Authentication in the production project
- [ ] Configured Firestore security rules for production
- [ ] Configured Storage security rules for production
- [ ] Updated firebase-config-prod.js with correct production project details

### Codebase Review
- [ ] Renamed tracking-new.html to tracking.html
- [ ] Renamed tracking-new.js to tracking.js
- [ ] Updated all references to tracking-new.html in the codebase:
  - [ ] Navigation links in all HTML files
  - [ ] JavaScript redirects in form.js
  - [ ] JavaScript redirects in dashboard.js
  - [ ] README.md documentation
- [ ] Added conditional loading of Firebase config files for production environment
- [ ] Checked all pages for correct references to JS files
- [ ] Reviewed all HTML files for any hardcoded URLs or references
- [ ] Tested all core functionality in development environment

### Asset Optimization
- [ ] Optimized images using appropriate compression
- [ ] Minified CSS files (optional)
- [ ] Minified JavaScript files (optional)
- [ ] Ensured all file paths are correctly referenced

### Security Check
- [ ] Removed any exposed API keys from JS files (or moved to secure locations)
- [ ] Checked for any hardcoded credentials or sensitive information
- [ ] Added appropriate console warnings about sensitive information
- [ ] Reviewed Firebase security rules
- [ ] Ensured CORS is properly configured for Firebase Storage

## Deployment Process

### Configuration Files
- [ ] Set up firebase-prod.json with proper configuration
- [ ] Set up .firebaserc-prod with proper configuration
- [ ] Verified deploy-production.sh script works correctly
- [ ] Created and verified domain setup documentation

### Firebase CLI Setup
- [ ] Firebase CLI tool installed globally (`npm install -g firebase-tools`)
- [ ] Logged in to Firebase CLI (`firebase login`)
- [ ] Selected the correct Firebase project (`firebase use premierfix-prod`)

### Execution
- [ ] Run the deployment script `bash deploy-production.sh`
- [ ] Verify deployment was successful
- [ ] Check Firebase console to confirm files were deployed correctly

## Post-Deployment Checks

### Functionality Testing
- [ ] Verify all pages load correctly on the Firebase hosting URL
- [ ] Test issue creation functionality
- [ ] Test issue tracking functionality
- [ ] Test branch selection functionality
- [ ] Test hotel management functionality
- [ ] Test auth/permissions functionality (if applicable)
- [ ] Test photo upload/view functionality

### Domain Configuration
- [ ] Add custom domain in Firebase console: premierfix.uk
- [ ] Follow domain verification steps in Firebase console
- [ ] Add necessary DNS records in Fasthosts as indicated by Firebase
- [ ] Verify domain connection is working
- [ ] Wait for SSL certificate provisioning (can take up to 24 hours)
- [ ] Test website using the custom domain

### Final Verification
- [ ] Verify website loads correctly on premierfix.uk
- [ ] Verify that production Firebase project is being used when accessed via premierfix.uk
- [ ] Check site functionality on mobile devices
- [ ] Test site performance
- [ ] Verify all images and assets load correctly
- [ ] Update any documentation with production URLs

## Database Migration (If Needed)
- [ ] Plan for data migration from development to production
- [ ] Export data from development database
- [ ] Import data to production database
- [ ] Verify data integrity in production

---

## Notes for Specific PremierFix Features
- The isProduction variable should automatically detect when the site is accessed via the premierfix.uk domain
- Firebase configuration should automatically switch to production when accessed via the custom domain
- Original files from the development environment remain available but are not used when accessed via the production domain

---

**Complete this checklist before and during production deployment to ensure a smooth transition.** 
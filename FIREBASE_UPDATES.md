# Firebase Updates for PremierFix Production

## Updates Made

1. **Updated Firebase Configuration**
   - Updated the production Firebase configuration in `js/firebase-config-prod.js` with the new credentials
   - Added support for Firebase Analytics in the configuration

2. **Improved Environment Detection**
   - Enhanced the `initializeFirebase()` function in `js/tracking.js`
   - Added automatic domain-based detection of production environment
   - Added fallback options for configuration detection

3. **Added Analytics Support**
   - Added the Firebase Analytics SDK to `tracking.html`
   - Added analytics initialization code to track environment usage
   - Created helper script `update-analytics.sh` to automatically add Analytics SDK to all HTML files

## How the Integration Works

When a user visits the PremierFix application:

1. The app checks if the hostname is `premierfix.uk`
2. If it is, the production Firebase configuration is loaded from `js/firebase-config-prod.js`
3. If not, the development configuration is used
4. Analytics events are logged only in production environment

## Key Files Modified

- `js/firebase-config-prod.js`: Updated with new production configuration
- `js/tracking.js`: Enhanced environment detection and analytics support
- `tracking.html`: Added Firebase Analytics SDK
- New file `update-analytics.sh`: Script to add Analytics SDK to all HTML files

## Analytics Events

The following analytics events are now tracked in the production environment:

- `environment_used`: Logs which environment (production/development) is being used

## Next Steps

1. **Run the Analytics Update Script**:
   ```
   chmod +x update-analytics.sh
   ./update-analytics.sh
   ```
   This will add the Firebase Analytics SDK to all HTML files.

2. **Test Analytics Events**:
   - Access the application via the `premierfix.uk` domain
   - Check the Firebase Analytics dashboard to ensure events are being logged

3. **Add More Custom Events**:
   To add more custom events, use the following pattern:
   ```javascript
   if (firebase.analytics && typeof firebase.analytics === 'function') {
       const analytics = firebase.analytics();
       analytics.logEvent('event_name', { parameter1: 'value1', parameter2: 'value2' });
   }
   ```

4. **Deploy to Production**:
   Use the existing deployment script:
   ```
   bash deploy-production.sh
   ```

## Important Notes

- The Firebase configuration now uses the modern project structure but is adapted to work with Firebase SDK v8.
- For a future update, consider migrating to Firebase SDK v9 for improved performance and tree-shaking. 
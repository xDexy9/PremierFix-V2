# Updated Firebase Security Rules for PremierFix

To fix the "Missing or insufficient permissions" error when updating issue status, please update your Firebase security rules as follows:

## Firestore Rules

1. Go to your [Firebase Console](https://console.firebase.google.com/)
2. Select your project "premierfix-291fb"
3. Navigate to Firestore Database
4. Click on the "Rules" tab
5. Replace the current rules with the following:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read access to all users
    match /{document=**} {
      allow read: if true;
    }
    
    // Allow write access to authenticated users (even anonymous)
    match /issues/{issueId} {
      allow create: if request.auth != null;
      
      // Allow updates to status field by any authenticated user
      allow update: if request.auth != null && 
                     (request.resource.data.diff(resource.data).affectedKeys()
                      .hasOnly(['status', 'updatedAt']));
                      
      // Allow full updates by any authenticated user
      allow update: if request.auth != null;
                     
      // Allow deletion by any authenticated user
      allow delete: if request.auth != null;
    }
  }
}
```

## Why This Fixes the Issue

The previous rules were too restrictive, only allowing deletion by the creator of the issue. The key changes are:

1. Removed the requirement that the user must be the creator to delete issues
2. Simplified the update rules to allow any authenticated user to make changes
3. Kept the authentication requirement to prevent unauthorized access

After updating these rules, you should be able to update issue status and delete issues without permission errors.

## Storage Rules (if you're using Firebase Storage)

No changes needed to the Storage rules if you're not experiencing issues with file uploads.

## Authentication Settings

Make sure your GitHub Pages domain is still in the authorized domains list:
- Go to Authentication > Settings > Authorized domains
- Verify that `
# Firebase Security Rules for PremierFix

To ensure your PremierFix application works correctly when hosted on GitHub Pages, you need to update your Firebase security rules. Follow these steps:

## Firestore Rules

1. Go to your [Firebase Console](https://console.firebase.google.com/)
2. Select your project "premierfix-291fb"
3. Navigate to Firestore Database
4. Click on the "Rules" tab
5. Replace the current rules with the following:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read access to all collections
    match /{document=**} {
      allow read: if true;
      allow write: if true;
    }
    
    // Hotel branches collection
    match /hotel_branches/{branchId} {
      allow write: if true;
      
      // Room data subcollection
      match /rooms/{roomId} {
        allow write: if true;
      }
    }
    
    // Room audits collection
    match /room_audits/{auditId} {
      allow write: if true;
      
      // Validate audit data
      allow create: if request.resource.data.branchId is string &&
                      request.resource.data.roomNumber is string &&
                      request.resource.data.timestamp is timestamp &&
                      request.resource.data.items is map;
    }
    
    // Maintenance issues collection
    match /maintenance_issues/{issueId} {
      allow write: if true;
      
      // Validate issue data
      allow create: if request.resource.data.branchId is string &&
                      (request.resource.data.roomNumber is string || request.resource.data.location is string) &&
                      request.resource.data.category is string &&
                      request.resource.data.description is string &&
                      request.resource.data.priority in ['low', 'medium', 'critical'] &&
                      request.resource.data.authorName is string &&
                      request.resource.data.status in ['New', 'In Progress', 'Completed'] &&
                      request.resource.data.dateCreated is timestamp;
      
      // Allow updates only to specific fields
      allow update: if request.resource.data.diff(resource.data).affectedKeys()
                      .hasOnly(['status', 'updatedAt']);
    }
  }
}
```

## Storage Rules (if you're using Firebase Storage)

1. Navigate to Storage in your Firebase Console
2. Click on the "Rules" tab
3. Replace the current rules with the following:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

## Authentication Settings

1. Navigate to Authentication in your Firebase Console
2. Click on the "Settings" tab
3. Under the "Authorized domains" section, add your GitHub Pages domain:
   - `xdexy9.github.io`

## API Key Restrictions (Optional but Recommended)

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to "APIs & Services" > "Credentials"
3. Find your Firebase API key and click on it
4. Under "Application restrictions", select "HTTP referrers"
5. Add the following domains:
   - `localhost`
   - `127.0.0.1`
   - `*.github.io`
   - Your custom domain (if you have one)

After making these changes, your PremierFix application should work correctly when hosted on GitHub Pages. 
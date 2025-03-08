// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAcsYRpUk2C0p5tfClIFk69IOFAOFRwR_A",
  authDomain: "premierfix-291fb.firebaseapp.com",
  projectId: "premierfix-291fb",
  storageBucket: "premierfix-291fb.firebasestorage.app",
  messagingSenderId: "246325431082",
  appId: "1:246325431082:web:8f4048bc6100b65a0a2c53",
  measurementId: "G-ESTSGQ8V6G"
};

// Initialize Firebase
function initializeFirebase() {
  // Check if Firebase is already initialized
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    
    // Configure Firestore for GitHub Pages
    const db = firebase.firestore();
    
    // Enable offline persistence
    db.enablePersistence({ synchronizeTabs: true })
      .catch(err => {
        if (err.code === 'failed-precondition') {
          console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
        } else if (err.code === 'unimplemented') {
          console.warn('The current browser does not support all of the features required to enable persistence');
        }
      });
      
    // Set Firestore settings with relaxed security for cross-origin requests
    db.settings({
      cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
      ignoreUndefinedProperties: true
    });
    
    return {
      db: db,
      auth: firebase.auth(),
      storage: firebase.storage()
    };
  }

  return {
    db: firebase.firestore(),
    auth: firebase.auth(),
    storage: firebase.storage()
  };
}

// Anonymous authentication
async function signInAnonymously() {
  try {
    const { auth } = initializeFirebase();
    const userCredential = await auth.signInAnonymously();
    console.log("Signed in anonymously:", userCredential.user.uid);
    return userCredential.user;
  } catch (error) {
    console.error("Error signing in anonymously:", error);
    return null;
  }
}

// Save issue to Firestore
async function saveIssue(issueData) {
  try {
    const { db } = initializeFirebase();
    const user = await signInAnonymously();

    if (!user) {
      throw new Error("Authentication failed");
    }

    // Add user ID and timestamps
    const enhancedData = {
      ...issueData,
      userId: user.uid,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      status: "Pending"
    };

    // Handle network errors gracefully
    try {
      const docRef = await db.collection("issues").add(enhancedData);
      console.log("Issue saved with ID:", docRef.id);
      return docRef.id;
    } catch (networkError) {
      console.error("Network error while saving issue:", networkError);
      
      // Store locally if online save fails
      const offlineId = "offline_" + new Date().getTime();
      localStorage.setItem(`issue_${offlineId}`, JSON.stringify(enhancedData));
      console.log("Issue saved locally with ID:", offlineId);
      
      // Show user a message
      alert("Your issue has been saved locally. It will be uploaded when you're back online.");
      
      return offlineId;
    }
  } catch (error) {
    console.error("Error saving issue:", error);
    throw error;
  }
}

// Get issues from Firestore
async function getIssues(filters = {}) {
  try {
    const { db } = initializeFirebase();
    await signInAnonymously();

    let query = db.collection("issues");

    // Apply filters
    if (filters.status) {
      query = query.where("status", "==", filters.status);
    }

    if (filters.category) {
      query = query.where("category", "==", filters.category);
    }

    if (filters.dateFrom) {
      query = query.where("createdAt", ">=", filters.dateFrom);
    }

    if (filters.dateTo) {
      query = query.where("createdAt", "<=", filters.dateTo);
    }

    // Apply sorting
    if (filters.sortBy) {
      query = query.orderBy(filters.sortBy, filters.sortDirection || "desc");
    } else {
      query = query.orderBy("createdAt", "desc");
    }

    // Apply pagination
    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.startAfter) {
      query = query.startAfter(filters.startAfter);
    }

    try {
      const snapshot = await query.get();
      const issues = [];

      snapshot.forEach(doc => {
        issues.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt ? doc.data().createdAt.toDate() : null,
          updatedAt: doc.data().updatedAt ? doc.data().updatedAt.toDate() : null
        });
      });

      return issues;
    } catch (networkError) {
      console.error("Network error while getting issues:", networkError);
      
      // Return locally stored issues if online fetch fails
      const localIssues = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith("issue_")) {
          try {
            const issueData = JSON.parse(localStorage.getItem(key));
            localIssues.push({
              id: key.replace("issue_", ""),
              ...issueData,
              isOffline: true
            });
          } catch (e) {
            console.error("Error parsing local issue:", e);
          }
        }
      }
      
      return localIssues;
    }
  } catch (error) {
    console.error("Error getting issues:", error);
    throw error;
  }
}

// Update issue status
async function updateIssueStatus(issueId, newStatus) {
  try {
    const { db } = initializeFirebase();
    await signInAnonymously();

    // Handle offline IDs
    if (issueId.startsWith("offline_")) {
      const key = `issue_${issueId}`;
      const issueData = JSON.parse(localStorage.getItem(key));
      if (issueData) {
        issueData.status = newStatus;
        localStorage.setItem(key, JSON.stringify(issueData));
        console.log(`Offline issue ${issueId} status updated to ${newStatus}`);
        return true;
      }
      return false;
    }

    await db.collection("issues").doc(issueId).update({
      status: newStatus,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    console.log(`Issue ${issueId} status updated to ${newStatus}`);
    return true;
  } catch (error) {
    console.error("Error updating issue status:", error);
    throw error;
  }
}

// Delete issue
async function deleteIssue(issueId) {
  try {
    const { db } = initializeFirebase();
    await signInAnonymously();

    // Handle offline IDs
    if (issueId.startsWith("offline_")) {
      const key = `issue_${issueId}`;
      localStorage.removeItem(key);
      console.log(`Offline issue ${issueId} deleted`);
      return true;
    }

    await db.collection("issues").doc(issueId).delete();
    console.log(`Issue ${issueId} deleted`);
    return true;
  } catch (error) {
    console.error("Error deleting issue:", error);
    throw error;
  }
}

// Export functions
window.firebaseService = {
  initializeFirebase,
  signInAnonymously,
  saveIssue,
  getIssues,
  updateIssueStatus,
  deleteIssue
}; 
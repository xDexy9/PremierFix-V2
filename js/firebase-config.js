// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAcsYRpUk2C0p5tfClIFk69IOFAOFRwR_A",
  authDomain: "premierfix-291fb.firebaseapp.com",
  projectId: "premierfix-291fb",
  storageBucket: "premierfix-291fb.appspot.com",
  messagingSenderId: "246325431082",
  appId: "1:246325431082:web:8f4048bc6100b65a0a2c53",
  measurementId: "G-ESTSGQ8V6G"
};

// Global instances and state
let firebaseApp;
let firestoreInstance;
let authInstance;
let storageInstance;
let initializationPromise = null;
let initialized = false;

// Clear all Firebase data and state
async function clearFirebaseData() {
  try {
    console.log("Clearing Firebase data...");
    
    // Clear authentication state
    if (authInstance) {
      await authInstance.signOut();
    }
    
    // Terminate Firestore instance if it exists
    if (firestoreInstance) {
      await firestoreInstance.terminate();
    }
    
    // Reset state
    firebaseApp = null;
    firestoreInstance = null;
    authInstance = null;
    storageInstance = null;
    initializationPromise = null;
    initialized = false;
    
    console.log("Firebase data cleared successfully");
  } catch (error) {
    console.error("Error clearing Firebase data:", error);
    throw error;
  }
}

// Initialize Firebase with proper initialization queue
async function initializeFirebase() {
  // If already initializing, return the existing promise
  if (initializationPromise) {
    return initializationPromise;
  }

  // Create a new initialization promise
  initializationPromise = (async () => {
    try {
      console.log("Starting Firebase initialization...");
      
      // Clear existing data first
      await clearFirebaseData();

      // Initialize Firebase app
      if (!firebase.apps.length) {
        firebaseApp = firebase.initializeApp(firebaseConfig);
      } else {
        firebaseApp = firebase.app();
      }

      // Initialize services
      firestoreInstance = firebase.firestore();
      authInstance = firebase.auth();
      storageInstance = firebase.storage();

      // Configure Firestore settings
      firestoreInstance.settings({
        cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
        merge: true // Add merge option to prevent host override warning
      });

      // Sign in anonymously first
      await signInAnonymously();

      // Try to enable persistence with better error handling
      try {
        await firestoreInstance.enablePersistence({
          synchronizeTabs: false // Disable multi-tab support to prevent conflicts
        });
        console.log("Persistence enabled successfully");
      } catch (err) {
        if (err.code === 'failed-precondition') {
          console.log("Multiple tabs open, persistence cannot be enabled");
        } else if (err.code === 'unimplemented') {
          console.warn("Persistence not supported in this browser");
        } else {
          console.error("Error enabling persistence:", err);
        }
      }

      // Check and initialize test data if needed
      await initializeTestData();

      initialized = true;
      console.log("Firebase initialization completed successfully");
      return true;
    } catch (error) {
      console.error("Firebase initialization failed:", error);
      initialized = false;
      initializationPromise = null; // Reset promise to allow retry
      throw error;
    }
  })();

  return initializationPromise;
}

// Initialize test data if needed
async function initializeTestData() {
  try {
    const snapshot = await firestoreInstance.collection("issues").limit(1).get();
    if (snapshot.empty) {
      console.log('No issues found, but skipping test issue creation');
    } else {
      console.log('Issues collection is not empty');
    }
  } catch (error) {
    console.error('Error checking issues collection:', error);
    // Continue initialization even if test data check fails
  }
}

// Get Firebase instances with initialization check
async function getFirebaseInstances() {
  if (!initialized) {
    try {
      await initializeFirebase();
    } catch (error) {
      console.error("Failed to initialize Firebase:", error);
      return null;
    }
  }
  
  return {
    db: firestoreInstance,
    auth: authInstance,
    storage: storageInstance
  };
}

// Anonymous authentication with retry
async function signInAnonymously() {
  try {
    const userCredential = await authInstance.signInAnonymously();
    console.log("Signed in anonymously:", userCredential.user.uid);
    return userCredential.user;
  } catch (error) {
    console.error("Error signing in anonymously:", error);
    throw error;
  }
}

// Save issue to Firestore with initialization check
async function saveIssue(issueData) {
  try {
    const instances = await getFirebaseInstances();
    if (!instances) {
      throw new Error("Firebase not initialized");
    }

    const user = await signInAnonymously();
    if (!user) {
      throw new Error("Authentication failed");
    }

    const enhancedData = {
      ...issueData,
      userId: user.uid,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      status: issueData.status || "Pending"
    };

    const docRef = await instances.db.collection("issues").add(enhancedData);
    console.log("Issue saved with ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Error saving issue:", error);
    throw error;
  }
}

// Get issues from Firestore with initialization check
async function getIssues(filters = {}) {
  try {
    console.log('Fetching issues with filters:', {
      category: filters.category || 'All',
      status: filters.status || 'All',
      search: filters.search ? 'Yes' : 'No',
      dateRange: filters.dateFrom || filters.dateTo ? 'Yes' : 'No',
      sort: filters.sortDirection || 'desc'
    });
    
    const instances = await getFirebaseInstances();
    if (!instances) {
      throw new Error("Firebase not initialized");
    }

    let query = instances.db.collection("issues");
    
    // Create a compound query for category and status
    if (filters.category && filters.category !== "") {
      query = query.where("category", "==", filters.category);
    }
    
    // Always add createdAt to allow proper ordering
    query = query.orderBy("createdAt", filters.sortDirection || "desc");
    
    const snapshot = await query.get();
    let issues = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      issues.push({
        id: doc.id,
        ...data
      });
    });
    
    // Apply status filter in memory
    if (filters.status && filters.status !== "") {
      issues = issues.filter(issue => issue.status === filters.status);
    }
    
    // Apply date filters in memory
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      issues = issues.filter(issue => {
        const createdAt = issue.createdAt ? new Date(issue.createdAt.seconds * 1000) : null;
        return createdAt && createdAt >= fromDate;
      });
    }
    
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      issues = issues.filter(issue => {
        const createdAt = issue.createdAt ? new Date(issue.createdAt.seconds * 1000) : null;
        return createdAt && createdAt <= toDate;
      });
    }
    
    // Apply text search filter
    if (filters.search && filters.search !== "") {
      const searchLower = filters.search.toLowerCase();
      issues = issues.filter(issue => {
        const description = (issue.description || "").toLowerCase();
        const location = (issue.location || "").toLowerCase();
        const roomNumber = (issue.roomNumber || "").toLowerCase();
        const authorName = (issue.authorName || "").toLowerCase();
        
        return description.includes(searchLower) || 
               location.includes(searchLower) || 
               roomNumber.includes(searchLower) || 
               authorName.includes(searchLower);
      });
    }

    console.log('Retrieved issues:', {
      total: issues.length,
      pending: issues.filter(i => i.status === 'Pending').length,
      inProgress: issues.filter(i => i.status === 'In Progress').length,
      completed: issues.filter(i => i.status === 'Completed').length
    });
    
    return {
      issues: issues,
      total: issues.length
    };
  } catch (error) {
    console.error("Error getting issues:", error);
    throw error;
  }
}

// Update issue status with initialization check
async function updateIssueStatus(issueId, newStatus) {
  try {
    const instances = await getFirebaseInstances();
    if (!instances) {
      throw new Error("Firebase not initialized");
    }

    await instances.db.collection("issues").doc(issueId).update({
      status: newStatus,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error("Error updating issue status:", error);
    throw error;
  }
}

// Delete issue with initialization check
async function deleteIssue(issueId) {
  try {
    const instances = await getFirebaseInstances();
    if (!instances) {
      throw new Error("Firebase not initialized");
    }

    // Ensure user is authenticated
    const user = await signInAnonymously();
    if (!user) {
      throw new Error("Authentication failed");
    }

    // Get the issue first to verify it exists
    const issueDoc = await instances.db.collection("issues").doc(issueId).get();
    if (!issueDoc.exists) {
      throw new Error("Issue not found");
    }

    // Proceed with deletion
    await instances.db.collection("issues").doc(issueId).delete();
    console.log("Issue deleted successfully:", issueId);
    return true;
  } catch (error) {
    console.error("Error deleting issue:", error);
    throw error;
  }
}

// Delete all issues
async function deleteAllIssues() {
  try {
    const instances = await getFirebaseInstances();
    if (!instances) {
      throw new Error("Firebase not initialized");
    }

    // Ensure user is authenticated
    const user = await signInAnonymously();
    if (!user) {
      throw new Error("Authentication failed");
    }

    // Get all issues
    const snapshot = await instances.db.collection("issues").get();
    
    // If no issues found, return success
    if (snapshot.empty) {
      console.log("No issues to delete");
      return true;
    }

    // Create a single batch for better atomicity
    const batch = instances.db.batch();
    let operationCount = 0;

    // Add delete operations to batch
    snapshot.forEach((doc) => {
      batch.delete(doc.ref);
      operationCount++;
    });

    // Only commit if we have operations
    if (operationCount > 0) {
      await batch.commit();
      console.log(`Successfully deleted ${operationCount} issues`);
    }
    
    return true;
  } catch (error) {
    console.error("Error deleting all issues:", error);
    // Add more context to the error
    if (error.code === 'permission-denied') {
      throw new Error("Permission denied: Please ensure you are properly authenticated");
    } else if (error.code === 'not-found') {
      throw new Error("No issues found to delete");
    } else {
      throw error;
    }
  }
}

// Export functions and initialize Firebase
window.firebaseService = {
  saveIssue,
  getIssues,
  updateIssueStatus,
  deleteIssue,
  deleteAllIssues,
  initialize: initializeFirebase,
  clearData: clearFirebaseData
};

// Start initialization
initializeFirebase().catch(error => {
  console.error("Initial Firebase initialization failed:", error);
}); 
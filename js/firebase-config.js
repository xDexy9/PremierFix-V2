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
    
    const docRef = await db.collection("issues").add(enhancedData);
    console.log("Issue saved with ID:", docRef.id);
    return docRef.id;
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
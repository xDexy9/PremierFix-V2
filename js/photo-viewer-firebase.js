/**
 * Simplified Firebase configuration for Photo Viewer
 * This is a lightweight version without authentication requirements
 */

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAlF8cWyOtP_0K8BLsM1yl7fyEQactAEfE",
  authDomain: "premierfix-v2.firebaseapp.com",
  projectId: "premierfix-v2",
  storageBucket: "premierfix-v2.firebasestorage.app",
  messagingSenderId: "216071943010",
  appId: "1:216071943010:web:c7427124a2bebddaf1b23b",
  measurementId: "G-8PJ8N6MZ6B"
};

// Global instances
let firestoreInstance;
let storageInstance;
let initialized = false;

// Initialize Firebase
async function initializeFirebase() {
  if (initialized) return true;
  
  try {
    console.log("Starting Photo Viewer Firebase initialization...");

    // Initialize Firebase app if not already initialized
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }

    // Initialize Firestore and Storage
    firestoreInstance = firebase.firestore();
    
    if (firebase.storage) {
      storageInstance = firebase.storage();
    }

    initialized = true;
    console.log("Photo Viewer Firebase initialized successfully");
    return true;
  } catch (error) {
    console.error("Photo Viewer Firebase initialization failed:", error);
    return false;
  }
}

// Get issue by ID
async function getIssueById(issueId) {
  if (!initialized) {
    await initializeFirebase();
  }
  
  try {
    const issueDoc = await firestoreInstance.collection("issues").doc(issueId).get();
    if (!issueDoc.exists) {
      return null;
    }
    
    return {
      id: issueDoc.id,
      ...issueDoc.data()
    };
  } catch (error) {
    console.error("Error fetching issue:", error);
    return null;
  }
}

// Get fresh download URL for a photo in Firebase Storage
async function getPhotoDownloadUrl(storagePath) {
  if (!initialized) {
    await initializeFirebase();
  }
  
  if (!storageInstance) {
    console.error("Firebase Storage not initialized");
    return null;
  }
  
  if (!storagePath) {
    console.error("No storage path provided");
    return null;
  }
  
  try {
    console.log("Attempting to get fresh download URL for storage path:", storagePath);
    
    // Create a reference to the file
    const storageRef = storageInstance.ref(storagePath);
    
    // Get the download URL
    const downloadUrl = await storageRef.getDownloadURL();
    console.log("Fresh download URL obtained:", downloadUrl);
    
    return downloadUrl;
  } catch (error) {
    console.error("Error getting download URL:", error);
    return null;
  }
}

// Export functions
window.photoViewerFirebase = {
  initialize: initializeFirebase,
  getIssueById,
  getPhotoDownloadUrl
};

// Initialize on load
initializeFirebase().catch(error => {
  console.warn("Photo Viewer Firebase initialization failed:", error);
}); 
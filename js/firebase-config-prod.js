// Firebase configuration for production
const firebaseConfig = {
    apiKey: "AIzaSyCs7JocMaDAF61Lpv7C2Zhz-QFNDdV4aiw",
    authDomain: "premierfix-prod.firebaseapp.com",
    projectId: "premierfix-prod",
    storageBucket: "premierfix-prod.firebasestorage.app",
    messagingSenderId: "1053960112006",
    appId: "1:1053960112006:web:35cf897aeae23c93fd8e07",
    measurementId: "G-5SQWW5LSR2"
  };

/*
 * IMPORTANT: This is the production Firebase configuration.
 * This configuration will be used when the site is accessed via premierfix.uk domain.
 * DO NOT modify the development configuration in firebase-config.js
 */

// Firebase collection references
const COLLECTIONS = {
    BRANCHES: 'hotel_branches',
    ROOMS: 'hotel_rooms',
    AUDITS: 'room_audits'
};

// Global instances and state
let firebaseApp;
let firestoreInstance;
let authInstance;
let storageInstance;
let analyticsInstance;
let initializationPromise = null;
let initialized = false;
let persistenceEnabled = false;

// Initializes Firebase with the production configuration
async function initializeFirebase() {
  // If already initializing, return the existing promise
  if (initializationPromise) {
    return initializationPromise;
  }

  // Create a new initialization promise
  initializationPromise = (async () => {
    try {
      console.log("Starting Firebase initialization (PRODUCTION)...");

      // Initialize Firebase app if not already initialized
      if (!firebase.apps.length) {
        firebaseApp = firebase.initializeApp(firebaseConfig);
      } else {
        firebaseApp = firebase.app();
      }

      // Initialize services
      firestoreInstance = firebase.firestore();
      authInstance = firebase.auth();
      storageInstance = firebase.storage();
      
      // Initialize analytics if available
      if (typeof firebase.analytics === 'function') {
        try {
          analyticsInstance = firebase.analytics();
          console.log("Firebase Analytics initialized successfully");
        } catch (analyticsError) {
          console.warn("Firebase Analytics initialization failed:", analyticsError);
          // Continue without analytics
        }
      }

      // Configure Firestore settings
      firestoreInstance.settings({
        cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
        merge: true
      });

      // Try to enable persistence before any other operations
      if (!persistenceEnabled) {
        try {
          // First check if we have a version mismatch with IndexedDB
          const clearPersistence = localStorage.getItem('firebase_clear_persistence') === 'true';
          
          if (clearPersistence) {
            console.log("Clearing Firebase persistence due to previous version mismatch...");
            await firestoreInstance.clearPersistentCache();
            localStorage.removeItem('firebase_clear_persistence');
            console.log("Firebase persistence cleared successfully");
          }
          
          await firestoreInstance.enablePersistence({
            synchronizeTabs: true
          });
          persistenceEnabled = true;
          console.log("Persistence enabled successfully");
        } catch (err) {
          if (err.code === 'failed-precondition') {
            console.warn("Multiple tabs open, persistence can only be enabled in one tab at a time.");
            // Continue without persistence in this case
            persistenceEnabled = false;
          } else if (err.code === 'unimplemented') {
            console.warn("The current browser doesn't support persistence.");
            persistenceEnabled = false;
          } else if (err.message && err.message.includes('persisted data is not compatible')) {
            console.warn("Firebase persistence version mismatch. Setting flag to clear persistence on next load.");
            localStorage.setItem('firebase_clear_persistence', 'true');
            persistenceEnabled = false;
            // Show a message to refresh the page
            if (typeof showNotification === 'function') {
              showNotification('Please refresh the page to update the database cache.', 'warning', 5000);
            } else {
              alert('Please refresh the page to update the database cache.');
            }
          } else {
            console.error("Unexpected error enabling persistence:", err);
            persistenceEnabled = false;
          }
        }
      }

      // Set up auth state persistence
      try {
        await authInstance.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        console.log("Auth persistence set to LOCAL");
      } catch (err) {
        console.warn("Could not set auth persistence:", err);
      }

      // Sign in anonymously with retry logic
      let retryCount = 0;
      const maxRetries = 3;
      while (retryCount < maxRetries) {
        try {
          const user = await signInAnonymously();
          if (user) break;
        } catch (error) {
          console.warn(`Anonymous sign-in attempt ${retryCount + 1} failed:`, error);
          retryCount++;
          if (retryCount === maxRetries) {
            throw new Error("Failed to sign in anonymously after multiple attempts");
          }
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }

      initialized = true;
      console.log("Firebase initialization completed successfully (PRODUCTION)");
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
    storage: storageInstance,
    analytics: analyticsInstance,
    app: firebaseApp
  };
}

// Make the necessary functions available globally
window.firebaseServiceProd = {
  initialize: initializeFirebase,
  getInstances: getFirebaseInstances,
  collections: COLLECTIONS
}; 
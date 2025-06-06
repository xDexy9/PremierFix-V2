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
let initializationPromise = null;
let initialized = false;
let persistenceEnabled = false;

// Detect Safari browser - used for special handling
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

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
    persistenceEnabled = false;
    
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
    console.log("Firebase initialization already in progress, reusing promise");
    return initializationPromise;
  }

  // Create a new initialization promise
  initializationPromise = (async () => {
    try {
      console.log("Starting Firebase initialization...");
      console.log(`Browser: ${isSafari ? 'Safari' : 'Not Safari'}, iOS: ${isIOS ? 'Yes' : 'No'}`);

      // Initialize Firebase app if not already initialized
      if (!firebase.apps.length) {
        console.log("Initializing new Firebase app");
        firebaseApp = firebase.initializeApp(firebaseConfig);
      } else {
        console.log("Using existing Firebase app");
        firebaseApp = firebase.app();
      }

      // Initialize services
      console.log("Initializing Firebase services");
      firestoreInstance = firebase.firestore();
      authInstance = firebase.auth();
      storageInstance = firebase.storage();

      // Configure Firestore settings
      firestoreInstance.settings({
        cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
        merge: true
      });

      // Try to enable persistence with special handling for Safari
      if (!persistenceEnabled) {
        try {
          // First check if we have a version mismatch with IndexedDB
          const clearPersistence = localStorage.getItem('firebase_clear_persistence') === 'true';
          
          if (clearPersistence) {
            console.log("Clearing Firebase persistence due to previous version mismatch...");
            try {
              await firestoreInstance.clearPersistentCache();
              localStorage.removeItem('firebase_clear_persistence');
              console.log("Firebase persistence cleared successfully");
            } catch (clearError) {
              console.warn("Error clearing persistence cache:", clearError);
              // Continue anyway
            }
          }
          
          // Safari sometimes has issues with enablePersistence, especially on page transitions
          // We'll use different settings for Safari
          if (isSafari || isIOS) {
            console.log("Using Safari-specific persistence settings");
            
            // For Safari, we'll use less aggressive persistence settings
            try {
              await firestoreInstance.enablePersistence({
                synchronizeTabs: false // Don't synchronize tabs on Safari to avoid issues
              });
              persistenceEnabled = true;
              console.log("Safari persistence enabled successfully");
              
              // Set a flag in sessionStorage to track persistence state
              sessionStorage.setItem('firebase_persistence_enabled', 'true');
            } catch (err) {
              handlePersistenceError(err);
            }
          } else {
            // For other browsers, use normal persistence
            try {
              await firestoreInstance.enablePersistence({
                synchronizeTabs: true
              });
              persistenceEnabled = true;
              console.log("Persistence enabled successfully");
              
              // Set a flag in sessionStorage to track persistence state
              sessionStorage.setItem('firebase_persistence_enabled', 'true');
            } catch (err) {
              handlePersistenceError(err);
            }
          }
        } catch (err) {
          handlePersistenceError(err);
        }
      } else {
        console.log("Persistence already enabled");
      }

      // Helper function to handle persistence errors
      function handlePersistenceError(err) {
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

      // Set up auth state persistence
      try {
        // For Safari, modify auth persistence to improve reliability during page navigation
        if (isSafari || isIOS) {
          console.log("Setting Safari-optimized auth persistence");
          await authInstance.setPersistence(firebase.auth.Auth.Persistence.SESSION);
          console.log("Auth persistence set to SESSION for Safari");
        } else {
          await authInstance.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
          console.log("Auth persistence set to LOCAL");
        }
      } catch (err) {
        console.warn("Could not set auth persistence:", err);
      }

      // Sign in anonymously with retry logic
      let retryCount = 0;
      const maxRetries = 3;
      let authSuccess = false;
      
      while (retryCount < maxRetries && !authSuccess) {
        try {
          console.log(`Anonymous sign-in attempt ${retryCount + 1}/${maxRetries}`);
          const user = await signInAnonymously();
          if (user) {
            console.log("Anonymous sign-in successful");
            authSuccess = true;
            break;
          }
        } catch (error) {
          console.warn(`Anonymous sign-in attempt ${retryCount + 1} failed:`, error);
          retryCount++;
          
          if (retryCount === maxRetries) {
            console.error("Failed to sign in anonymously after multiple attempts");
            // Don't throw, continue without auth - the app can still work in read-only mode
          } else {
            // Wait before retrying with increasing delay
            const delay = 1000 * retryCount;
            console.log(`Waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      // Check that collections exist and create them if they don't
      try {
        await ensureCollectionsExist();
      } catch (collectionError) {
        console.error("Error ensuring collections exist:", collectionError);
        // Continue initialization even if this fails
      }

      initialized = true;
      // Store initialization state in sessionStorage to help with page navigation
      sessionStorage.setItem('firebase_initialized', 'true');
      console.log("Firebase initialization completed successfully");
      return true;
    } catch (error) {
      console.error("Firebase initialization failed:", error);
      initialized = false;
      initializationPromise = null; // Reset promise to allow retry
      // Clear sessionStorage state since initialization failed
      sessionStorage.removeItem('firebase_initialized');
      sessionStorage.removeItem('firebase_persistence_enabled');
      throw error;
    }
  })();

  return initializationPromise;
}

// Ensure required collections exist
async function ensureCollectionsExist() {
  console.log("Checking and ensuring required collections exist...");
  
  try {
    // Check if issues collection exists by doing a limited query
    const issuesSnapshot = await firestoreInstance.collection("issues").limit(1).get();
    console.log(`Issues collection exists and contains ${issuesSnapshot.size} documents`);
  } catch (error) {
    console.error("Error checking issues collection:", error);
    
    // Try to create the collection by adding a test document
    try {
      console.log("Attempting to create issues collection...");
      // Create a temporary document
      const tempDoc = await firestoreInstance.collection("issues").add({
        _temp: true,
        _createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        _description: "Temporary document to initialize issues collection"
      });
      
      // Then immediately delete it to keep the collection clean
      await tempDoc.delete();
      console.log("Successfully created and initialized issues collection");
    } catch (createError) {
      console.error("Failed to create issues collection:", createError);
      throw new Error("Failed to create required collections: " + createError.message);
    }
  }
  
  // Check other essential collections if needed
  const requiredCollections = ["branches", "hotel_branches"];
  for (const collName of requiredCollections) {
    try {
      const snapshot = await firestoreInstance.collection(collName).limit(1).get();
      console.log(`Collection ${collName} exists and contains ${snapshot.size} documents`);
    } catch (error) {
      console.warn(`Warning: Collection ${collName} may not exist or is inaccessible:`, error);
      // Don't try to create these automatically as they require specific structure
    }
  }
  
  console.log("Collection existence check completed");
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

    // Check if we're authenticated
    let user = authInstance.currentUser;
    if (!user) {
      // Try to sign in again if we lost authentication
      user = await signInAnonymously();
    }

    if (!user) {
      throw new Error("Authentication failed");
    }

    // Make a copy of the data to avoid modifying the original
    const enhancedData = {
      ...issueData,
      userId: user.uid,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      status: "New" // Always set to "New", ignore any other status
    };

    // Add offline support metadata
    enhancedData._lastModified = Date.now();

    // Handle photo data if present
    if (issueData.photoData) {
      try {
        console.log("Photo data found, attempting to upload to Firebase Storage");
        
        // Extract file data from photoData
        const photoData = issueData.photoData;
        
        // Log photo details for debugging
        console.log("Photo details:", {
          type: photoData.type,
          filename: photoData.filename || 'unknown',
          size: photoData.size ? Math.round(photoData.size / 1024) + 'KB' : 'unknown',
          dataAvailable: !!photoData.data || !!photoData.dataUrl,
          isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
        });
        
        // Get base64 data, handling both 'data' and legacy 'dataUrl' property
        let base64Data = photoData.data || photoData.dataUrl;
        
        // Check if base64Data exists before proceeding
        if (!base64Data) {
          console.error("Photo data is missing both 'data' and 'dataUrl' properties:", photoData);
          throw new Error("Invalid photo data format");
        }
        
        // Remove any data URL prefix
        if (base64Data.startsWith('data:')) {
          const dataStart = base64Data.indexOf(',') + 1;
          if (dataStart > 0) {
            base64Data = base64Data.substring(dataStart);
          } else {
            console.warn("Data URL format unexpected, using as-is");
          }
        }
        
        // Ensure we have valid data before processing
        if (!base64Data || base64Data.length < 100) {
          console.error("Base64 data appears invalid or too short:", base64Data ? base64Data.substring(0, 20) + '...' : 'null');
          throw new Error("Invalid image data");
        }
        
        console.log("Converting base64 to blob, data length:", base64Data.length);
        
        // Try-catch for the base64 to blob conversion
        let blob;
        try {
          // Convert base64 to blob
          const byteCharacters = atob(base64Data);
          const byteArrays = [];
          for (let i = 0; i < byteCharacters.length; i += 1024) {
            const slice = byteCharacters.slice(i, i + 1024);
            const byteNumbers = new Array(slice.length);
            for (let j = 0; j < slice.length; j++) {
              byteNumbers[j] = slice.charCodeAt(j);
            }
            const byteArray = new Uint8Array(byteNumbers);
            byteArrays.push(byteArray);
          }
          blob = new Blob(byteArrays, { type: 'image/jpeg' });
          console.log("Blob created successfully, size:", blob.size, "bytes");
        } catch (blobError) {
          console.error("Error converting base64 to blob:", blobError);
          // On mobile, we might have issues with large images or memory constraints
          // Let's add a mobile-specific error message
          if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            enhancedData.photoUploadFailed = true;
            enhancedData.photoErrorMessage = "Mobile browser could not process the image. Try a smaller image or use a desktop browser.";
            delete enhancedData.photoData;
            console.log("Continuing to save issue without photo due to mobile processing error");
            // Don't throw, continue with the save
            return;
          } else {
            throw new Error("Failed to process image: " + blobError.message);
          }
        }
        
        // Create a unique filename
        const timestamp = new Date().getTime();
        const filename = `issues/${enhancedData.branchId}/${timestamp}_${photoData.filename || 'photo.jpg'}`;
        
        console.log("Uploading to Firebase Storage with path:", filename);
        
        // Upload to Firebase Storage with timeout
        const storageRef = instances.storage.ref().child(filename);
        
        // Create a promise with timeout for the upload
        const uploadWithTimeout = (blob, timeoutMs = 30000) => {
          return new Promise((resolve, reject) => {
            // Set a timeout
            const timeoutId = setTimeout(() => {
              reject(new Error("Photo upload timed out after " + (timeoutMs/1000) + " seconds"));
            }, timeoutMs);
            
            // Start the upload
            const uploadTask = storageRef.put(blob);
            
            // Monitor progress for debugging
            uploadTask.on('state_changed', 
              (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                console.log('Upload progress: ' + Math.round(progress) + '%');
              },
              (error) => {
                // Clear timeout and reject with error
                clearTimeout(timeoutId);
                console.error("Storage upload error:", error);
                reject(error);
              },
              async () => {
                // Clear timeout on success
                clearTimeout(timeoutId);
                try {
                  // Get the download URL
                  const url = await uploadTask.snapshot.ref.getDownloadURL();
                  console.log("Upload completed successfully, URL:", url);
                  resolve(url);
                } catch (urlError) {
                  console.error("Error getting download URL:", urlError);
                  reject(urlError);
                }
              }
            );
          });
        };
        
        try {
          // Attempt the upload with timeout
          const photoUrl = await uploadWithTimeout(blob);
          
          // Add photo URL to issue data
          enhancedData.photoUrl = photoUrl;
          enhancedData.photoStoragePath = filename;
          
          console.log("Photo uploaded successfully:", photoUrl);
        } catch (uploadError) {
          console.error("Storage upload error:", uploadError);
          
          // Format a user-friendly error message based on the error
          let errorMessage = "Unknown error during photo upload";
          
          if (uploadError.code === 'storage/unauthorized') {
            errorMessage = "Permission denied: You don't have access to upload images";
          } else if (uploadError.code === 'storage/canceled') {
            errorMessage = "Upload canceled or timed out";
          } else if (uploadError.code === 'storage/unknown') {
            errorMessage = "Unknown storage error, possibly a network issue";
          } else if (uploadError.code === 'storage/retry-limit-exceeded') {
            errorMessage = "Upload failed due to network instability";
          } else if (uploadError.message && uploadError.message.includes('CORS')) {
            errorMessage = "CORS policy prevented the upload. This is common when using the app locally.";
          } else if (uploadError.message) {
            errorMessage = uploadError.message;
          }
          
          // Add flags to indicate photo upload failure
          enhancedData.photoUploadFailed = true;
          enhancedData.photoErrorMessage = errorMessage;
          console.log("Continuing to save issue without photo due to upload error:", errorMessage);
        }
        
        // Remove the raw photo data before saving to Firestore
        delete enhancedData.photoData;
      } catch (photoError) {
        console.error("Error in photo upload process:", photoError);
        // Continue saving the issue without the photo
        delete enhancedData.photoData;
        // Add a flag to indicate photo upload failure
        enhancedData.photoUploadFailed = true;
        enhancedData.photoErrorMessage = photoError.message || "Unknown error during photo upload";
        console.log("Continuing to save issue without photo due to upload error");
        // Don't throw the error - allow the issue to be saved without photo
      }
    }

    console.log("[saveIssue] Attempting to add issue to Firestore with data:", enhancedData);

    // First, check if issues collection exists and is accessible
    try {
      // Try to get a reference to the issues collection
      const issuesCollRef = instances.db.collection("issues");
      
      let docRef;
      try {
        // Attempt to add the document
        docRef = await issuesCollRef.add(enhancedData);
        console.log("[saveIssue] Firestore add operation successful. Issue saved with ID:", docRef.id);
        return docRef.id;
      } catch (addError) {
        console.error("[saveIssue] Error during Firestore add operation:", addError);

        // If it's a permission or non-existence error, try creating the collection first
        if (addError.code === 'permission-denied' || addError.code === 'not-found') {
          console.log("[saveIssue] Attempting to create issues collection first...");
          
          try {
            // Try to ensure collections exist
            await ensureCollectionsExist();
            
            // Try again after creating the collection
            docRef = await issuesCollRef.add(enhancedData);
            console.log("[saveIssue] Retry successful after creating collection. Issue saved with ID:", docRef.id);
            return docRef.id;
          } catch (retryError) {
            console.error("[saveIssue] Collection creation and retry failed:", retryError);
            throw new Error("Cannot save issue: " + (retryError.message || "Database error"));
          }
        }
        
        console.error("[saveIssue] Data that failed to save:", enhancedData);
        throw addError;
      }
    } catch (error) {
      console.error("[saveIssue] General error in saveIssue function:", error);
      // Add more context to the error
      if (error.code === 'permission-denied') {
        throw new Error("Permission denied: You don't have access to create or update issues");
      } else if (error.code === 'unavailable') {
        throw new Error("Service unavailable: Please check your internet connection");
      } else if (error.code === 'not-found') {
        throw new Error("Collection not found: The issues collection doesn't exist");
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error("[saveIssue] Outermost error handler:", error);
    throw error;
  }
}

// Get issues from Firestore with initialization check
async function getIssues(filters = {}) {
  try {
    console.log('Fetching issues with filters:', {
      branchId: filters.branchId || 'All',
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
    
    // Filter by branchId if provided
    if (filters.branchId && filters.branchId !== "") {
      query = query.where("branchId", "==", filters.branchId);
    }
    
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
async function deleteAllIssues(branchId) {
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

    // Get all issues, filtered by branchId if provided
    let query = instances.db.collection("issues");
    
    // Filter by branchId if provided
    if (branchId && branchId !== "") {
      console.log(`Deleting issues for branch: ${branchId}`);
      query = query.where("branchId", "==", branchId);
    } else {
      console.warn("No branch ID provided, deleting ALL issues across ALL branches");
    }
    
    const snapshot = await query.get();
    
    // If no issues found, return success
    if (snapshot.empty) {
      console.log(`No issues found ${branchId ? 'for branch ' + branchId : ''}`);
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
      console.log(`Successfully deleted ${operationCount} issues ${branchId ? 'for branch ' + branchId : ''}`);
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

// Add a comment to an issue in Firestore
async function addComment(issueId, commentData) {
    console.log(`Attempting to add comment to issue: ${issueId}`, commentData); // Log input

    if (!issueId || !commentData || !commentData.text || !commentData.author) {
        console.error("addComment validation failed: Missing issueId, text, or author.", { issueId, commentData });
        throw new Error("Issue ID, comment text, and author name are required to add a comment.");
    }

    const instances = await getFirebaseInstances();
    if (!instances || !instances.db) {
        throw new Error("Firestore not initialized or available");
    }

    const issueRef = instances.db.collection('issues').doc(issueId);

    // Generate a unique ID for the comment
    const commentId = instances.db.collection('issues').doc().id;

    const commentToSave = {
        ...commentData,
        commentId: commentId
    };
    
    // Ensure the timestamp is a valid Date object if passed from client, otherwise use now
    if (!(commentToSave.timestamp instanceof Date)) {
        console.warn("Client timestamp was not a Date object, using current Date.");
        commentToSave.timestamp = new Date(); 
    }

    console.log("Comment object prepared for Firestore (using client timestamp):");
    console.log(commentToSave);

    try {
        await instances.db.runTransaction(async (transaction) => {
            const issueDoc = await transaction.get(issueRef);
            if (!issueDoc.exists) {
                throw new Error(`Issue document with ID ${issueId} not found.`);
            }

            // Use arrayUnion within the transaction with the object containing the client timestamp
            transaction.update(issueRef, {
                comments: firebase.firestore.FieldValue.arrayUnion(commentToSave),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp() // Keep server timestamp for the main issue update time
            });
        });

        console.log(`Comment successfully added to Firestore for issue ${issueId} with commentId ${commentId}`);

        // Return the client-provided data plus the generated ID for optimistic update
        // We now return the object exactly as it was prepared to be saved (with client timestamp)
        return commentToSave; // Return the object including the client timestamp and commentId

    } catch (error) {
        console.error(`Error adding comment transactionally for issue ${issueId}:`, error);
        // Re-throw the error for the calling function to handle
        throw new Error(`Failed to save comment to database: ${error.message}`);
    }
}

// --- REWRITTEN FUNCTION: Fetch Branch Layout ---
/**
 * Fetches the layout data (floors and rooms) for a specific branch
 * by querying the hotel_rooms collection.
 * @param {string} branchId - The linking ID of the branch (e.g., the timestamp string used in hotel_rooms).
 * @returns {Promise<object>} A promise that resolves with the constructed branch layout data
 *                            (e.g., { "1": ["101", "102"], "2": ["201", "202"] }).
 */
async function fetchBranchLayout(branchId) {
  console.log(`Fetching layout by querying rooms for branchId: ${branchId}`);
  if (!branchId) {
    throw new Error("Branch ID (linking ID) is required to fetch layout.");
  }

  const instances = await getFirebaseInstances();
  if (!instances || !instances.db) {
    throw new Error("Firestore not initialized or available");
  }

  try {
    // Query the hotel_rooms collection for rooms matching the branchId
    const roomsQuery = instances.db.collection('hotel_rooms')
                                  .where("branchId", "==", branchId);

    const snapshot = await roomsQuery.get();

    if (snapshot.empty) {
      console.warn(`No rooms found in 'hotel_rooms' collection for branchId: ${branchId}. Returning empty layout.`);
      return {}; // Return empty object if no rooms found for this branch
    }

    const layoutData = {};

    // Iterate over the documents and build the layout object
    snapshot.forEach(doc => {
      const roomData = doc.data();
      const floor = roomData.floor;
      const roomNumber = roomData.roomNumber;

      // Ensure we have valid floor and roomNumber
      if (floor !== undefined && floor !== null && roomNumber !== undefined && roomNumber !== null) {
        const floorKey = String(floor);
        const roomNumStr = String(roomNumber);

        // --- MODIFIED: Only process if room number is NOT "13" --- 
        // --- REVISED: Only process if room number does NOT contain "1" --- 
        // --- CORRECTED: Only process if room number does NOT contain "13" --- 
        if (!roomNumStr.includes("13")) {
          if (!layoutData[floorKey]) {
            layoutData[floorKey] = []; // Initialize array for the floor if it doesn't exist
          }

          // Add the room number to the correct floor, ensuring no duplicates (optional but good practice)
          if (!layoutData[floorKey].includes(roomNumStr)) { // Use roomNumStr here
               layoutData[floorKey].push(roomNumStr); // Use roomNumStr here
          }
        } else {
            console.log(`Skipping room number ${roomNumStr} on floor ${floorKey} because it contains "13"`);
        }
        // --- END --- 

      } else {
          console.warn(`Skipping room document ${doc.id} due to missing floor or roomNumber data.`);
      }
    });

    // Optional: Sort room numbers within each floor numerically/alphabetically
    for (const floorKey in layoutData) {
        layoutData[floorKey].sort((a, b) => {
             const numA = parseInt(a);
             const numB = parseInt(b);
             if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
             return String(a).localeCompare(String(b));
        });
    }


    console.log(`Successfully constructed layout for branch ${branchId}:`, layoutData);
    return layoutData;

  } catch (error) {
    console.error(`Error fetching and constructing room layout for branchId ${branchId}:`, error);
    if (error.code === 'permission-denied') {
         throw new Error("Permission denied while fetching room layout.");
    }
    // Throw a more specific error for the calling function
    throw new Error(`Failed to retrieve room layout: ${error.message}`);
  }
}

// Function to check database configuration
async function checkDatabaseConfig() {
  console.log("Checking database configuration...");
  
  try {
    // Get the current Firebase configuration
    const config = firebaseConfig;
    
    // Sanitize the config by removing api keys for logging
    const sanitizedConfig = {
      projectId: config.projectId,
      authDomain: config.authDomain,
      databaseURL: config.databaseURL || 'N/A',
      storageBucket: config.storageBucket
    };
    
    console.log("Current Firebase configuration:", sanitizedConfig);
    
    // Check if initialized
    const initialized = await initializeFirebase();
    console.log("Firebase initialized:", initialized);
    
    // Check authentication status
    const user = authInstance?.currentUser;
    console.log("Authentication status:", user ? `Authenticated as ${user.uid}` : "Not authenticated");
    
    // Check available collections
    const collections = [];
    
    // Get all collections
    try {
      const collectionsQuery = await firestoreInstance.listCollections();
      for (const collection of collectionsQuery) {
        collections.push(collection.id);
      }
      console.log("Available collections:", collections);
    } catch (collError) {
      console.error("Error listing collections:", collError);
    }
    
    // Return the configuration info
    return {
      config: sanitizedConfig,
      initialized,
      authenticated: !!user,
      userId: user?.uid,
      collections
    };
  } catch (error) {
    console.error("Error checking database configuration:", error);
    return {
      error: error.message,
      stackTrace: error.stack
    };
  }
}

// Export functions and initialize Firebase
window.firebaseService = {
  saveIssue,
  getIssues,
  getFilteredIssues: getIssues,
  updateIssueStatus,
  deleteIssue,
  deleteAllIssues,
  initialize: initializeFirebase,
  clearData: clearFirebaseData,
  addComment: addComment,
  fetchBranchLayout: fetchBranchLayout,
  checkDatabaseConfig: checkDatabaseConfig,
  initializeTestData: initializeTestData
};

// Start initialization
initializeFirebase().catch(error => {
  console.error("Initial Firebase initialization failed:", error);
}); 
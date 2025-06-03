// Database Migration Checker
// This script helps verify that your new Firebase database is working correctly

// Function to check database connectivity and basic operations
async function checkDatabaseConnection() {
  try {
    // Initialize Firebase
    await initializeFirebase();
    
    console.log("Checking database connection...");
    
    // Get Firestore instance
    const db = firestoreInstance;
    
    // Try to read from the database
    const timestamp = new Date().toISOString();
    const testDocRef = db.collection('_migration_tests').doc(timestamp);
    
    // Write test data
    await testDocRef.set({
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      testValue: 'Connection successful',
      browser: navigator.userAgent
    });
    
    console.log("Write test successful");
    
    // Read test data
    const docSnapshot = await testDocRef.get();
    if (docSnapshot.exists) {
      console.log("Read test successful");
      
      // Delete test data
      await testDocRef.delete();
      console.log("Delete test successful");
      
      return {
        success: true,
        message: "Database connection verified successfully"
      };
    } else {
      return {
        success: false,
        message: "Failed to read test document"
      };
    }
  } catch (error) {
    console.error("Database connection check failed:", error);
    return {
      success: false,
      message: `Connection error: ${error.message}`,
      error: error
    };
  }
}

// Function to check existing collections
async function checkCollections() {
  try {
    // Initialize Firebase
    await initializeFirebase();
    
    console.log("Checking collections...");
    
    // Get Firestore instance
    const db = firestoreInstance;
    
    // Collections to check
    const collections = [
      'hotel_branches',
      'issues',
      'room_audits'
    ];
    
    const results = {};
    
    // Check each collection
    for (const collection of collections) {
      try {
        const querySnapshot = await db.collection(collection).limit(1).get();
        results[collection] = {
          exists: true,
          empty: querySnapshot.empty,
          count: querySnapshot.size
        };
      } catch (error) {
        results[collection] = {
          exists: false,
          error: error.message
        };
      }
    }
    
    console.log("Collection check results:", results);
    return results;
  } catch (error) {
    console.error("Collection check failed:", error);
    return {
      success: false,
      message: `Collection check error: ${error.message}`,
      error: error
    };
  }
}

// The database checker button has been removed
// To run database checks from the console, use:
// checkDatabaseConnection().then(console.log)
// checkCollections().then(console.log) 
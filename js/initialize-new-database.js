// Initialize New Firebase Database
// This script will set up the basic structure for your new Firebase database
// Run this script once after setting up your new Firebase project

// Import Firebase configuration
// Make sure you've updated the firebase-config.js file with your new project details

// Function to initialize the database
async function initializeNewDatabase() {
  try {
    // Initialize Firebase
    await initializeFirebase();
    
    console.log("Starting database initialization...");
    
    // Get Firestore instance
    const db = firestoreInstance;
    
    // Create sample hotel branch
    const branchRef = db.collection('hotel_branches').doc('sample_branch');
    await branchRef.set({
      name: 'Sample Hotel Branch',
      address: '123 Main Street',
      city: 'Sample City',
      state: 'Sample State',
      zipCode: '12345',
      phoneNumber: '(123) 456-7890',
      email: 'sample@hotel.com',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    // Create sample room in the branch
    const roomRef = branchRef.collection('rooms').doc('room101');
    await roomRef.set({
      roomNumber: '101',
      type: 'Standard',
      floor: '1',
      status: 'Available',
      lastInspected: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    // Create sample maintenance issue
    await db.collection('issues').add({
      branchId: 'sample_branch',
      roomNumber: '101',
      category: 'Plumbing',
      description: 'Leaking faucet in bathroom',
      priority: 'medium',
      authorName: 'System',
      status: 'New',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    // Create sample room audit
    await db.collection('room_audits').add({
      branchId: 'sample_branch',
      roomNumber: '101',
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      items: {
        cleanliness: 'Good',
        maintenance: 'Needs attention',
        amenities: 'Complete'
      },
      notes: 'Sample audit entry',
      inspector: 'System'
    });
    
    console.log("Database initialization complete!");
    return true;
  } catch (error) {
    console.error("Error initializing database:", error);
    return false;
  }
}

// The database initialization button has been removed
// This function can be called directly from the console using:
// initializeNewDatabase() 
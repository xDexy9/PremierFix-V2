/**
 * Hotel Branch Manager
 * This file provides functionality for managing hotel branches.
 * It initializes the branch manager and provides access to it globally.
 */

// Check if Firebase is available
const isFBAvailable = typeof firebase !== 'undefined' && 
                      firebase.firestore && 
                      typeof firebase.firestore === 'function';

// Reference to the Firestore database (internal to this module)
let _firestoreInstanceBranchManager = null;

// Initialize Firebase if needed
async function initFirebase() {
    // Clear sessionStorage flag to track initialization state
    const initKey = 'branchManager_initializing';
    
    // Check if we're already initializing in this session
    if (sessionStorage.getItem(initKey) === 'true') {
        console.log('Firebase initialization already in progress in another context, waiting...');
        // Wait briefly to see if initialization completes
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // If we still don't have Firebase after waiting, we'll try again
        if (!window.firebaseInitialized && typeof window.initializeFirebase === 'function') {
            console.log('Still no Firebase after waiting, trying again...');
            sessionStorage.removeItem(initKey);  // Clear the flag to allow retry
        } else {
            console.log('Firebase seems to be initializing elsewhere, using existing instance');
        }
    }
    
    try {
        sessionStorage.setItem(initKey, 'true');
        
        if (!window.firebaseInitialized) {
            // If a global initialize function exists, call it
            if (typeof window.initializeFirebase === 'function') {
                // Call the GLOBAL version of this function
                console.log('Calling global initializeFirebase function');
                await window.initializeFirebase();
            } else {
                console.warn('Global initializeFirebase function not found, assuming Firebase is already initialized');
            }
        }
        
        // Set up reference to firestore
        if (isFBAvailable) {
            _firestoreInstanceBranchManager = firebase.firestore();
        }
    } catch (error) {
        console.error('Error in initFirebase:', error);
    } finally {
        sessionStorage.removeItem(initKey);
    }
}

// Hotel branch management class
class HotelBranchManager {
    constructor() {
        this.currentBranch = null;
        this.branchData = null;
        this.initialized = false;
        this.initializing = false; // Prevent multiple initialization attempts
        this.initializationAttempts = 0; // Track initialization attempts
        this.initializationPromise = null; // Store the initialization promise
    }

    async initialize() {
        // If already initialized, just return
        if (this.initialized) {
            console.log('HotelBranchManager already initialized');
            return;
        }
        
        // If we're already initializing, return the existing promise
        if (this.initializing && this.initializationPromise) {
            console.log('HotelBranchManager initialization already in progress, returning existing promise');
            return this.initializationPromise;
        }
        
        // Limit excessive initialization attempts
        if (this.initializationAttempts > 3) {
            console.error('Too many initialization attempts, skipping to prevent performance issues');
            // Reset for future attempts
            this.initializationAttempts = 0;
            this.initializing = false;
            return;
        }
        
        // Get initialization status from sessionStorage - helps with cross-page navigation
        const initKey = 'branchManager_initialized';
        const initState = sessionStorage.getItem(initKey);
        
        if (initState === 'true') {
            console.log('Using previously initialized state from session storage');
            // Try to recover branch from localStorage
            const savedBranch = localStorage.getItem('selectedBranch');
            if (savedBranch) {
                console.log(`Recovered branch ${savedBranch} from localStorage`);
                try {
                    await this.loadBranchData(savedBranch);
                } catch (error) {
                    console.warn('Failed to load previously selected branch:', error);
                    // Clear localStorage to avoid persistent errors
                    localStorage.removeItem('selectedBranch');
                }
            }
            this.initialized = true;
            return;
        }
        
        this.initializing = true;
        this.initializationAttempts++;
        
        // Store the promise for reuse
        this.initializationPromise = (async () => {
            try {
                console.log('Starting HotelBranchManager initialization');
                
                // Initialize Firebase with retry for Safari
                let fbInitRetries = 0;
                while (!_firestoreInstanceBranchManager && fbInitRetries < 3) {
                    console.log(`Firebase init attempt ${fbInitRetries + 1}/3`);
                    await initFirebase();
                    
                    if (!_firestoreInstanceBranchManager && fbInitRetries < 2) {
                        // Wait before retry with increasing delay
                        await new Promise(resolve => setTimeout(resolve, 500 * (fbInitRetries + 1)));
                    }
                    fbInitRetries++;
                }
                
                if (!_firestoreInstanceBranchManager) {
                    throw new Error('Failed to initialize Firebase after multiple attempts');
                }
                
                // Check if the parent config has a branch manager
                if (window.hotelBranchManager && window.hotelBranchManager !== this && 
                    typeof window.hotelBranchManager.initialize === 'function') {
                    // Use the existing manager
                    console.log('Using existing HotelBranchManager from hotel-config.js');
                    this.parentManager = window.hotelBranchManager;
                    await this.parentManager.initialize();
                    
                    // Sync our state with the parent
                    this.currentBranch = this.parentManager.getCurrentBranch();
                    this.branchData = this.parentManager.getBranchData();
                } else {
                    // Standalone initialization
                    console.log('Initializing standalone HotelBranchManager');
                    
                    // Check if branch is selected in localStorage
                    const savedBranch = localStorage.getItem('selectedBranch');
                    if (savedBranch) {
                        try {
                            const success = await this.loadBranchData(savedBranch);
                            if (!success) {
                                throw new Error('Failed to load branch data');
                            }
                        } catch (error) {
                            console.warn('Could not load saved branch, it may not exist:', error.message);
                            localStorage.removeItem('selectedBranch');
                            this.currentBranch = null;
                            this.branchData = null;
                        }
                    }
                }
                
                this.initialized = true;
                // Store initialization state in sessionStorage
                sessionStorage.setItem(initKey, 'true');
                console.log('HotelBranchManager initialization completed successfully');
                return true;
            } catch (error) {
                console.error('Error initializing HotelBranchManager:', error);
                // Reset initialization state
                this.initialized = false;
                sessionStorage.removeItem(initKey);
                throw error;
            } finally {
                this.initializing = false;
                this.initializationPromise = null;
            }
        })();
        
        return this.initializationPromise;
    }

    async loadBranchData(branchId) {
        if (!branchId) {
            console.warn('loadBranchData called with no branchId');
            return false;
        }
        
        if (this.parentManager) {
            // Delegate to parent manager
            try {
                await this.parentManager.loadBranchData(branchId);
                
                // Sync our state
                this.currentBranch = this.parentManager.getCurrentBranch();
                this.branchData = this.parentManager.getBranchData();
                return true;
            } catch (error) {
                console.error('Error loading branch data from parent manager:', error);
                return false;
            }
        }
        
        let timeoutId = setTimeout(() => {
            console.warn('Branch data loading is taking a long time, may be stuck');
            // Hide loading indicators if they exist
            if (typeof hideLoading === 'function') {
                hideLoading();
            }
        }, 10000); // 10 second timeout
        
        try {
            console.log(`Loading branch data for branch: ${branchId}`);
            
            if (!_firestoreInstanceBranchManager) {
                await initFirebase();
                if (!_firestoreInstanceBranchManager) {
                    throw new Error('Firebase not initialized');
                }
            }
            
            const branchDoc = await _firestoreInstanceBranchManager
                .collection(COLLECTIONS.BRANCHES)
                .doc(branchId)
                .get();

            clearTimeout(timeoutId);

            if (!branchDoc.exists) {
                console.warn(`Branch ${branchId} not found in the database`);
                throw new Error('Branch not found');
            }

            this.currentBranch = branchId;
            this.branchData = branchDoc.data();
            localStorage.setItem('selectedBranch', branchId);
            
            console.log(`Branch data loaded successfully for branch: ${branchId}`);
            console.log(`Branch name: ${this.branchData.name}`);

            // Load room data with a timeout to prevent hanging
            try {
                // Set a timeout for loading room data
                const roomDataPromise = this.loadRoomData();
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Room data loading timed out')), 15000));
                
                await Promise.race([roomDataPromise, timeoutPromise]);
            } catch (roomError) {
                console.warn('Error or timeout loading room data:', roomError);
                // Continue anyway - missing room data is not critical
            }
            
            return true;
        } catch (error) {
            clearTimeout(timeoutId);
            console.error('Error loading branch data:', error);
            // Ensure any loading indicators are hidden
            if (typeof hideLoading === 'function') {
                hideLoading();
            }
            throw error;
        }
    }

    async loadRoomData() {
        if (this.parentManager) {
            // Delegate to parent manager
            await this.parentManager.loadRoomData();
            
            // Sync our state
            this.branchData = this.parentManager.getBranchData();
            return;
        }
        
        try {
            console.log(`Loading room data for branch: ${this.currentBranch}`);
            
            if (!_firestoreInstanceBranchManager) {
                await initFirebase();
                if (!_firestoreInstanceBranchManager) {
                    throw new Error('Firebase not initialized');
                }
            }
            
            const roomsSnapshot = await _firestoreInstanceBranchManager
                .collection(COLLECTIONS.ROOMS)
                .where('branchId', '==', this.currentBranch)
                .get();

            this.branchData.rooms = {};
            roomsSnapshot.forEach(doc => {
                const roomData = doc.data();
                // Use the room number as the key instead of the document ID
                if (roomData.roomNumber) {
                    this.branchData.rooms[roomData.roomNumber] = roomData;
                }
            });
            
            console.log(`Loaded ${Object.keys(this.branchData.rooms).length} rooms for branch: ${this.currentBranch}`);
        } catch (error) {
            console.error('Error loading room data:', error);
            throw error;
        }
    }

    getCurrentBranch() {
        if (this.parentManager) {
            return this.parentManager.getCurrentBranch();
        }
        return this.currentBranch;
    }

    getBranchData() {
        if (this.parentManager) {
            return this.parentManager.getBranchData();
        }
        return this.branchData;
    }

    async getAllBranches() {
        if (this.parentManager) {
            return this.parentManager.getAllBranches();
        }
        
        let timeoutId = setTimeout(() => {
            console.warn('Getting all branches is taking a long time, may be stuck');
            // Hide loading indicators if they exist
            if (typeof hideLoading === 'function') {
                hideLoading();
            }
        }, 8000); // 8 second timeout
        
        try {
            if (!_firestoreInstanceBranchManager) {
                await initFirebase();
                if (!_firestoreInstanceBranchManager) {
                    throw new Error('Firebase not initialized');
                }
            }
            
            // Create a promise that will reject after a timeout
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Operation timed out')), 12000));
            
            // Create the actual query promise
            const queryPromise = _firestoreInstanceBranchManager
                .collection(COLLECTIONS.BRANCHES)
                .get();
            
            // Race them - whichever resolves/rejects first wins
            const branchesSnapshot = await Promise.race([queryPromise, timeoutPromise]);
            
            clearTimeout(timeoutId);

            const branches = [];
            branchesSnapshot.forEach(doc => {
                branches.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            return branches;
        } catch (error) {
            clearTimeout(timeoutId);
            console.error('Error getting branches:', error);
            // Ensure any loading indicators are hidden
            if (typeof hideLoading === 'function') {
                hideLoading();
            }
            // Return empty array instead of throwing to prevent UI crashes
            return [];
        }
    }

    async getBranchInfo(branchId) {
        if (this.parentManager) {
            return this.parentManager.getBranchInfo(branchId);
        }
        
        try {
            if (!branchId) {
                console.warn('getBranchInfo called with no branchId');
                return null;
            }
            
            // If requested branch is the current branch, return from memory
            if (this.currentBranch === branchId && this.branchData) {
                return {
                    id: branchId,
                    ...this.branchData
                };
            }
            
            if (!_firestoreInstanceBranchManager) {
                await initFirebase();
                if (!_firestoreInstanceBranchManager) {
                    throw new Error('Firebase not initialized');
                }
            }
            
            // Otherwise fetch from Firestore
            const branchDoc = await _firestoreInstanceBranchManager
                .collection(COLLECTIONS.BRANCHES)
                .doc(branchId)
                .get();
                
            if (!branchDoc.exists) {
                console.warn(`Branch ${branchId} not found`);
                return null;
            }
            
            return {
                id: branchId,
                ...branchDoc.data()
            };
        } catch (error) {
            console.error(`Error getting branch info for ${branchId}:`, error);
            return null;
        }
    }

    async saveBranchSetup(branchData) {
        try {
            console.log("Saving branch setup:", branchData.name);
            
            if (!branchData || !branchData.id) {
                throw new Error('Invalid branch data');
            }
            
            // Ensure Firebase and Firestore instance are initialized
            if (!_firestoreInstanceBranchManager) {
                await initFirebase();
                if (!_firestoreInstanceBranchManager) {
                    console.error('Firebase not initialized');
                    throw new Error('Firebase not initialized. Please refresh the page and try again.');
                }
            }
             // Ensure FieldValue is available
            if (typeof firebase === 'undefined' || !firebase.firestore || !firebase.firestore.FieldValue) {
                console.error('Firebase FieldValue not available');
                throw new Error('Firebase components missing. Please refresh the page.');
            }
            
            console.log("Firebase initialized, proceeding with branch setup");
            
            const branchRef = _firestoreInstanceBranchManager
                .collection(COLLECTIONS.BRANCHES) 
                .doc(branchData.id);

            // --- Calculate total rooms --- 
            const totalRoomsCount = branchData.rooms ? Object.keys(branchData.rooms).length : 0;
            console.log(`Calculated total rooms: ${totalRoomsCount}`);

            // First save the branch document - ADD totalRoomsCount
            await branchRef.set({
                name: branchData.name,
                address: branchData.address,
                totalFloors: branchData.totalFloors,
                totalRooms: totalRoomsCount, // <-- Added this field
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true }); // Use merge: true to avoid overwriting other fields if editing
            
            console.log("Branch document saved, now saving rooms...");

            // Check if there are rooms to save
            if (!branchData.rooms || totalRoomsCount === 0) {
                console.warn("No rooms to save for branch:", branchData.id);
                 // Update local state even if no rooms
                this.currentBranch = branchData.id;
                this.branchData = {
                    name: branchData.name,
                    address: branchData.address,
                    totalFloors: branchData.totalFloors,
                    totalRooms: 0, // Ensure totalRooms is set locally
                    rooms: {} // Ensure rooms object exists
                };
                localStorage.setItem('selectedBranch', branchData.id);
                return true; // Still successful if branch is saved but no rooms
            }

            // Save room data in smaller batches
            const roomEntries = Object.entries(branchData.rooms);
            const batchSize = 100; // Firestore has a limit of 500 operations per batch
            
            for (let i = 0; i < roomEntries.length; i += batchSize) {
                const batch = _firestoreInstanceBranchManager.batch();
                const currentBatch = roomEntries.slice(i, i + batchSize);
                
                currentBatch.forEach(([roomNumber, roomData]) => {
                    // Use branchId_roomNumber as the document ID for rooms
                    const roomDocId = `${branchData.id}_${roomNumber}`;
                    const roomRef = _firestoreInstanceBranchManager
                        .collection(COLLECTIONS.ROOMS) 
                        .doc(roomDocId);
                    
                    batch.set(roomRef, {
                        ...roomData,
                        branchId: branchData.id,
                        roomNumber: String(roomNumber), // Store room number as string for consistency
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                });

                try {
                    await batch.commit();
                    console.log(`Saved batch ${Math.floor(i/batchSize) + 1} of rooms`);
                } catch (batchError) {
                    console.error(`Error saving batch ${Math.floor(i/batchSize) + 1}:`, batchError);
                    throw batchError;
                }
            }
            
            console.log("Branch setup completed successfully");
            
            // Update the current branch state in the manager
            this.currentBranch = branchData.id;
            this.branchData = { // Update branchData with the saved info
                name: branchData.name,
                address: branchData.address,
                totalFloors: branchData.totalFloors,
                totalRooms: totalRoomsCount, // <-- Include in local data
                rooms: branchData.rooms // Keep the rooms data
            };
            localStorage.setItem('selectedBranch', branchData.id);
            
            return true;
        } catch (error) {
            console.error('Error saving branch setup:', error);
            
            // Provide more specific error messages
            if (error.code === 'permission-denied') {
                throw new Error('Permission denied: You do not have access to save branch data');
            } else if (error.code === 'unavailable') {
                throw new Error('Service unavailable: Please check your internet connection');
            } else if (error.code === 'resource-exhausted') {
                throw new Error('Too many operations: Please try with fewer rooms');
            } else if (error.code === 'not-found') {
                throw new Error('Collection not found: Please check your Firebase configuration');
            } else {
                throw new Error(`Failed to save branch: ${error.message || 'Unknown error'}`);
            }
        }
    }

     async deleteBranch(branchId) {
        try {
            console.log(`Attempting to delete branch: ${branchId}`);
            
             if (!branchId) {
                throw new Error('Invalid branch ID provided for deletion');
            }

            // Ensure Firebase and Firestore instance are initialized
            if (!_firestoreInstanceBranchManager) {
                await initFirebase();
                if (!_firestoreInstanceBranchManager) {
                    console.error('Firebase not initialized');
                    throw new Error('Firebase not initialized. Cannot delete branch.');
                }
            }
            
            // Create a batch write operation
            const batch = _firestoreInstanceBranchManager.batch();

            // 1. Find all rooms associated with the branch
            console.log(`Querying rooms for branch: ${branchId}`);
            const roomsSnapshot = await _firestoreInstanceBranchManager
                .collection(COLLECTIONS.ROOMS)
                .where('branchId', '==', branchId)
                .get();
            
            let deletedRoomsCount = 0;
            if (!roomsSnapshot.empty) {
                roomsSnapshot.forEach(doc => {
                    console.log(`Adding room ${doc.id} to delete batch`);
                    batch.delete(doc.ref);
                    deletedRoomsCount++;
                });
                console.log(`Found ${deletedRoomsCount} rooms to delete.`);
            } else {
                console.log(`No rooms found for branch ${branchId}.`);
            }

            // 2. Add the branch document itself to the delete batch
            const branchRef = _firestoreInstanceBranchManager
                .collection(COLLECTIONS.BRANCHES)
                .doc(branchId);
            console.log(`Adding branch ${branchId} to delete batch`);
            batch.delete(branchRef);

            // 3. Commit the batch operation
            console.log('Committing delete batch...');
            await batch.commit();
            
            console.log(`Branch ${branchId} and ${deletedRoomsCount} associated rooms deleted successfully.`);

            // Optional: Clear current branch if it was the one deleted
            if (this.currentBranch === branchId) {
                this.currentBranch = null;
                this.branchData = null;
                localStorage.removeItem('selectedBranch');
                console.log('Cleared current branch selection as it was deleted.');
            }

            return true;
        } catch (error) {
            console.error(`Error deleting branch ${branchId}:`, error);
             if (error.code === 'permission-denied') {
                throw new Error('Permission denied: You do not have access to delete branch data');
            } else if (error.code === 'unavailable') {
                throw new Error('Service unavailable: Please check your internet connection');
            } else {
                 throw new Error(`Failed to delete branch: ${error.message || 'Unknown error'}`);
            }
        }
    }
}

// Create and initialize the branch manager instance
document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.hotelBranchManager === 'undefined') {
        console.log('Creating and initializing new branch manager on DOMContentLoaded');
        const branchManagerInstance = new HotelBranchManager();
        window.hotelBranchManager = branchManagerInstance;
        
        // Initialize the manager
        branchManagerInstance.initialize().catch(error => {
            console.error('Error during branch manager initialization:', error);
        });
    } else {
        console.log('Branch manager already exists on DOMContentLoaded');
        // If it already exists, maybe ensure it's initialized?
        // This part might need refinement depending on how scripts are loaded
        if (window.hotelBranchManager && typeof window.hotelBranchManager.initialize === 'function' && !window.hotelBranchManager.initialized) {
             console.log('Existing branch manager found, ensuring initialization.');
             window.hotelBranchManager.initialize().catch(error => {
                 console.error('Error during existing branch manager initialization:', error);
             });
        }
    }
}); 
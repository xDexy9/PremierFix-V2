// Hotel Branch Configuration Management

// Check if Firebase is available, otherwise use mock implementation
const isFirebaseAvailable = typeof firebase !== 'undefined' && 
                           firebase.firestore && 
                           typeof firebase.firestore === 'function';

// Create mock Firebase functionality if not available
if (!isFirebaseAvailable) {
    console.warn('Firebase not available, using mock implementation');
    window.firebase = {
        firestore: () => ({
            collection: () => ({
                doc: (id) => ({
                    get: () => Promise.resolve({
                        exists: true,
                        data: () => ({ name: 'Mock Branch', address: 'Mock Address', totalFloors: 3 }),
                        id: id || 'mock-id'
                    }),
                    set: () => Promise.resolve()
                }),
                where: () => ({
                    get: () => Promise.resolve({
                        forEach: (callback) => {
                            // Mock data
                            callback({
                                id: 'mock-room',
                                data: () => ({ floor: 1, available: true })
                            });
                        }
                    })
                }),
                add: () => Promise.resolve({ id: 'mock-id' }),
                get: () => Promise.resolve({
                    forEach: (callback) => {
                        // Mock branch data
                        callback({
                            id: 'mock-branch',
                            data: () => ({ name: 'Mock Branch', address: 'Mock Address' })
                        });
                    },
                    empty: false
                })
            }),
            batch: () => ({
                set: () => {},
                commit: () => Promise.resolve()
            })
        }),
        firestore: {
            FieldValue: {
                serverTimestamp: () => new Date().toISOString()
            }
        }
    };
}

// Firebase collection references
const COLLECTIONS = {
    BRANCHES: 'hotel_branches',
    ROOMS: 'hotel_rooms',
    AUDITS: 'room_audits'
};

// Hotel branch management
class HotelBranchManager {
    constructor() {
        this.currentBranch = null;
        this.branchData = null;
    }

    async initialize() {
        // Check if branch is selected in localStorage
        const savedBranch = localStorage.getItem('selectedBranch');
        if (savedBranch) {
            await this.loadBranchData(savedBranch);
        }
    }

    async loadBranchData(branchId) {
        try {
            const branchDoc = await firebase.firestore()
                .collection(COLLECTIONS.BRANCHES)
                .doc(branchId)
                .get();

            if (!branchDoc.exists) {
                throw new Error('Branch not found');
            }

            this.currentBranch = branchId;
            this.branchData = branchDoc.data();
            localStorage.setItem('selectedBranch', branchId);

            // Load room data
            await this.loadRoomData();
            return true;
        } catch (error) {
            console.error('Error loading branch data:', error);
            throw error;
        }
    }

    async loadRoomData() {
        try {
            const roomsSnapshot = await firebase.firestore()
                .collection(COLLECTIONS.ROOMS)
                .where('branchId', '==', this.currentBranch)
                .get();

            this.branchData.rooms = {};
            roomsSnapshot.forEach(doc => {
                this.branchData.rooms[doc.id] = doc.data();
            });
        } catch (error) {
            console.error('Error loading room data:', error);
            throw error;
        }
    }

    async saveBranchSetup(branchData) {
        try {
            console.log("Saving branch setup:", branchData.name);
            
            if (!branchData || !branchData.id) {
                throw new Error('Invalid branch data');
            }
            
            // Ensure Firebase is initialized
            if (typeof firebase === 'undefined' || !firebase.firestore) {
                console.error('Firebase not initialized');
                throw new Error('Firebase not initialized. Please refresh the page and try again.');
            }
            
            console.log("Firebase initialized, proceeding with branch setup");
            
            const branchRef = firebase.firestore()
                .collection(COLLECTIONS.BRANCHES)
                .doc(branchData.id);

            // First save the branch document
            await branchRef.set({
                name: branchData.name,
                address: branchData.address,
                totalFloors: branchData.totalFloors,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            console.log("Branch document saved, now saving rooms...");

            // Check if there are rooms to save
            if (!branchData.rooms || Object.keys(branchData.rooms).length === 0) {
                console.warn("No rooms to save for branch:", branchData.id);
                return true;
            }

            // Save room data in smaller batches to avoid transaction limits
            const roomEntries = Object.entries(branchData.rooms);
            const batchSize = 100; // Firestore has a limit of 500 operations per batch
            
            for (let i = 0; i < roomEntries.length; i += batchSize) {
                const batch = firebase.firestore().batch();
                const currentBatch = roomEntries.slice(i, i + batchSize);
                
                currentBatch.forEach(([roomNumber, roomData]) => {
                    const roomRef = firebase.firestore()
                        .collection(COLLECTIONS.ROOMS)
                        .doc(`${branchData.id}_${roomNumber}`);
                    
                    batch.set(roomRef, {
                        ...roomData,
                        branchId: branchData.id,
                        roomNumber: roomNumber,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                });

                try {
                    await batch.commit();
                    console.log(`Saved batch ${i/batchSize + 1} of rooms`);
                } catch (batchError) {
                    console.error(`Error saving batch ${i/batchSize + 1}:`, batchError);
                    throw batchError;
                }
            }
            
            console.log("Branch setup completed successfully");
            
            // Update the current branch to the newly created one
            this.currentBranch = branchData.id;
            this.branchData = {
                name: branchData.name,
                address: branchData.address,
                totalFloors: branchData.totalFloors,
                rooms: branchData.rooms
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

    getCurrentBranch() {
        return this.currentBranch;
    }

    getBranchData() {
        return this.branchData;
    }

    async getAllBranches() {
        try {
            const branchesSnapshot = await firebase.firestore()
                .collection(COLLECTIONS.BRANCHES)
                .get();

            const branches = [];
            branchesSnapshot.forEach(doc => {
                branches.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            return branches;
        } catch (error) {
            console.error('Error getting branches:', error);
            throw error;
        }
    }
}

// Room audit management
class RoomAuditManager {
    constructor(branchManager) {
        this.branchManager = branchManager;
    }

    async saveAudit(roomNumber, auditData) {
        try {
            const branchId = this.branchManager.getCurrentBranch();
            if (!branchId) throw new Error('No branch selected');

            const auditRef = firebase.firestore()
                .collection(COLLECTIONS.AUDITS)
                .doc();

            await auditRef.set({
                branchId,
                roomNumber,
                ...auditData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            return auditRef.id;
        } catch (error) {
            console.error('Error saving audit:', error);
            throw error;
        }
    }

    async getAudits(roomNumber, limit = 10) {
        try {
            const branchId = this.branchManager.getCurrentBranch();
            if (!branchId) throw new Error('No branch selected');

            const auditsSnapshot = await firebase.firestore()
                .collection(COLLECTIONS.AUDITS)
                .where('branchId', '==', branchId)
                .where('roomNumber', '==', roomNumber)
                .orderBy('createdAt', 'desc')
                .limit(limit)
                .get();

            const audits = [];
            auditsSnapshot.forEach(doc => {
                audits.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            return audits;
        } catch (error) {
            console.error('Error getting audits:', error);
            throw error;
        }
    }
}

// Export managers
window.hotelBranchManager = new HotelBranchManager();
window.roomAuditManager = new RoomAuditManager(window.hotelBranchManager); 
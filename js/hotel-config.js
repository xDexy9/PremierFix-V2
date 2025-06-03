// Hotel Branch Configuration Management

// Check if Firebase is available
const isFirebaseAvailable = typeof firebase !== 'undefined' && 
                           firebase.firestore && 
                           typeof firebase.firestore === 'function';

// Firebase collection references - MOVED to firebase-config.js
/*
const COLLECTIONS = {
    BRANCHES: 'hotel_branches',
    ROOMS: 'hotel_rooms',
    AUDITS: 'room_audits'
};
*/

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

// REMOVED: Export managers (Instances should be created by the pages that need them)
// window.hotelBranchManager = new HotelBranchManager(); // This line was causing errors as HotelBranchManager is commented out here
// window.roomAuditManager = new RoomAuditManager(window.hotelBranchManager); 
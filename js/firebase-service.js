/**
 * PremierFix Firebase Service
 * Wrapper for Firebase functionality 
 */

// Firebase service wrapper
const firebaseService = (function() {
    // Check if firebase-config.js is loaded
    if (typeof window.firebaseService === 'undefined') {
        console.error('Firebase config not loaded!');
        return null;
    }

    // Initialize function - calls the firebase-config initialize function
    async function initialize() {
        try {
            if (typeof window.firebaseService.initialize === 'function') {
                await window.firebaseService.initialize();
                console.log('Firebase service initialized successfully');
                return true;
            } else {
                console.error('Firebase initialize function not found');
                return false;
            }
        } catch (error) {
            console.error('Error initializing Firebase service:', error);
            return false;
        }
    }

    // Get issues with filters
    async function getIssues(filters = {}) {
        try {
            if (typeof window.firebaseService.getIssues === 'function') {
                return await window.firebaseService.getIssues(filters);
            } else {
                console.error('Firebase getIssues function not found');
                return { issues: [], total: 0 };
            }
        } catch (error) {
            console.error('Error getting issues:', error);
            throw error;
        }
    }

    // Get filtered issues
    async function getFilteredIssues(filters = {}) {
        try {
            if (typeof window.firebaseService.getFilteredIssues === 'function') {
                return await window.firebaseService.getFilteredIssues(filters);
            } else if (typeof window.firebaseService.getIssues === 'function') {
                // Fallback to getIssues if getFilteredIssues doesn't exist
                return await window.firebaseService.getIssues(filters);
            } else {
                console.error('Firebase getFilteredIssues function not found');
                return { issues: [], total: 0 };
            }
        } catch (error) {
            console.error('Error getting filtered issues:', error);
            throw error;
        }
    }

    // Update issue status
    async function updateIssueStatus(issueId, newStatus) {
        try {
            if (typeof window.firebaseService.updateIssueStatus === 'function') {
                return await window.firebaseService.updateIssueStatus(issueId, newStatus);
            } else {
                console.error('Firebase updateIssueStatus function not found');
                return false;
            }
        } catch (error) {
            console.error('Error updating issue status:', error);
            throw error;
        }
    }

    // Delete issue
    async function deleteIssue(issueId) {
        try {
            if (typeof window.firebaseService.deleteIssue === 'function') {
                return await window.firebaseService.deleteIssue(issueId);
            } else {
                console.error('Firebase deleteIssue function not found');
                return false;
            }
        } catch (error) {
            console.error('Error deleting issue:', error);
            throw error;
        }
    }

    // Delete all issues
    async function deleteAllIssues(branchId) {
        try {
            if (typeof window.firebaseService.deleteAllIssues === 'function') {
                return await window.firebaseService.deleteAllIssues(branchId);
            } else {
                console.error('Firebase deleteAllIssues function not found');
                return false;
            }
        } catch (error) {
            console.error('Error deleting all issues:', error);
            throw error;
        }
    }

    // Add comment to issue
    async function addComment(issueId, commentData) {
        try {
            if (typeof window.firebaseService.addComment === 'function') {
                return await window.firebaseService.addComment(issueId, commentData);
            } else {
                console.error('Firebase addComment function not found');
                return false;
            }
        } catch (error) {
            console.error('Error adding comment:', error);
            throw error;
        }
    }

    // Fetch branch layout
    async function fetchBranchLayout(branchId) {
        try {
            if (typeof window.firebaseService.fetchBranchLayout === 'function') {
                return await window.firebaseService.fetchBranchLayout(branchId);
            } else {
                console.error('Firebase fetchBranchLayout function not found');
                return {};
            }
        } catch (error) {
            console.error('Error fetching branch layout:', error);
            throw error;
        }
    }

    // Check database configuration
    async function checkDatabaseConfig() {
        try {
            if (typeof window.firebaseService.checkDatabaseConfig === 'function') {
                return await window.firebaseService.checkDatabaseConfig();
            } else {
                console.error('Firebase checkDatabaseConfig function not found');
                return { error: 'Function not available' };
            }
        } catch (error) {
            console.error('Error checking database configuration:', error);
            throw error;
        }
    }

    // Initialize test data
    async function initializeTestData() {
        try {
            if (typeof window.firebaseService.initializeTestData === 'function') {
                return await window.firebaseService.initializeTestData();
            } else {
                console.error('Firebase initializeTestData function not found');
                return false;
            }
        } catch (error) {
            console.error('Error initializing test data:', error);
            throw error;
        }
    }

    // Return the public API
    return {
        initialize,
        getIssues,
        getFilteredIssues,
        updateIssueStatus,
        deleteIssue,
        deleteAllIssues,
        addComment,
        fetchBranchLayout,
        checkDatabaseConfig,
        initializeTestData
    };
})();

// Store the original firebase-config service
window.firebaseServiceOriginal = window.firebaseService;

// Expose to window for global access
window.firebaseService = firebaseService; 
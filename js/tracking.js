/**
 * PremierFix Maintenance Tracker
 * A clean modern implementation for tracking maintenance tasks
 */

// Check if utilities are loaded, if not, provide fallbacks
if (typeof window.showLoading !== 'function') {
    console.warn('Utils not loaded, using fallback functions');
    window.showLoading = function() {
        const loadingContainer = document.getElementById('loadingContainer');
        if (loadingContainer) {
            loadingContainer.classList.add('active');
        }
    };

    window.hideLoading = function() {
        const loadingContainer = document.getElementById('loadingContainer');
        if (loadingContainer) {
            loadingContainer.classList.remove('active');
        }
    };

    window.showNotification = function(message, type = 'info', duration = 5000) {
        console.log(`${type.toUpperCase()}: ${message}`);
        alert(message);
    };
}

// Global variables
let currentBranchId = null;
let cachedIssues = [];
let currentPage = 1;
let sortDirection = 'desc';
const issuesPerPage = 9; // Changed from 10 to 9
let branchChoices = null; // To store the Choices.js instance

// Priority levels
const PRIORITY_LEVELS = {
    low: { label: 'Low', color: '#28a745' },
    medium: { label: 'Medium', color: '#ffc107' },
    critical: { label: 'Critical', color: '#dc3545' }
};

// Initialize the page
async function initializePage() {
    showLoading(); // Show loading indicator at the start
    console.log("Initializing page...");
    try {
        // Initialize Firebase
        const firebaseInitialized = initializeFirebase();
        if (!firebaseInitialized) {
            throw new Error('Firebase initialization failed');
        }
        
        // Initialize Firebase services
        const servicesInitialized = window.firebaseService.initialize();
        if (!servicesInitialized) {
            throw new Error('Firebase services initialization failed');
        }
        
        console.log('Firebase initialized successfully');
        
        // Show loading spinner
        showLoading();
        
        // Hide maintenance cards until a branch is selected
        const dashboard = document.querySelector('.dashboard');
        if (dashboard) {
            dashboard.style.display = 'none';
        }
        
        // Show "select branch" message in issues list
        const issuesList = document.getElementById('issuesList');
        if (issuesList) {
            issuesList.innerHTML = `
                <div class="empty-state">
                    <h3>Select a Branch</h3>
                    <p>Please select a branch to view maintenance issues and tasks.</p>
                </div>
            `;
        }
        
        // Check if hotel-branch-manager is available
        if (typeof window.hotelBranchManager === 'undefined') {
            console.warn('Hotel Branch Manager not found, creating fallback');
            
            // Create a fallback branch manager
            window.hotelBranchManager = {
                getCurrentBranch: function() {
                    return localStorage.getItem('currentBranchId') || 'default';
                },
                getBranchData: function() {
                    return { 
                        name: localStorage.getItem('currentBranchName') || 'Default Branch'
                    };
                },
                onBranchChange: function(callback) {
                    this._callback = callback;
                    // Since we can't actually listen for changes in the fallback,
                    // we'll just call the callback once
                    if (callback) {
                        callback(this.getCurrentBranch(), this.getBranchData().name);
                    }
                },
                getBranchOptions: async function() {
                    // Return some default branch options
                    return [
                        { id: 'default', name: 'Default Branch' }
                    ];
                },
                getAllBranches: async function() {
                    return [
                        { id: 'default', name: 'Default Branch' }
                    ];
                }
            };
        }
        
        // Set up branch selector
        await populateBranchSelector();
        
        // Get the current branch from hotel branch manager
        currentBranchId = window.hotelBranchManager.getCurrentBranch();
        
        // Only continue initialization if a branch is selected
        if (currentBranchId) {
            // Set up branch change listener
            if (typeof window.hotelBranchManager.onBranchChange === 'function') {
                // This part won't work since onBranchChange doesn't exist in the hotel-branch-manager
                // We'll fall back to the else block
                console.warn('onBranchChange not available in hotel-branch-manager, using direct branch loading');
                const branchData = window.hotelBranchManager.getBranchData();
                const branchName = branchData && branchData.name ? branchData.name : 'Unknown Branch';
                completeInitialization(currentBranchId, branchName);
            } else {
                // Fallback if onBranchChange is not available
                const branchData = window.hotelBranchManager.getBranchData();
                const branchName = branchData && branchData.name ? branchData.name : 'Unknown Branch';
                completeInitialization(currentBranchId, branchName);
            }
        } else {
            // No branch selected, just set up event listeners and wait for selection
            setupEventListeners();
            hideLoading();
            
            const branchNameElement = document.getElementById('branchName');
            if (branchNameElement) {
                branchNameElement.textContent = 'Please select a branch';
            }
            // Ensure pagination is hidden if no branch is selected initially
            const paginationContainer = document.getElementById('paginationContainer');
            if (paginationContainer) {
                paginationContainer.style.display = 'none';
            }
            // Ensure issue list shows select branch message
            const issuesList = document.getElementById('issuesList');
            if (issuesList) {
                issuesList.innerHTML = `
                    <div class="empty-state">
                        <h3>Select a Branch</h3>
                        <p>Please select a branch to view maintenance issues and tasks.</p>
                    </div>
                `;
            }
        }
        
        // Initialize Choices.js for the branch selector
        const branchSelectElement = document.getElementById('branchSelector');
        if (branchSelectElement) {
            branchChoices = new Choices(branchSelectElement, {
                searchEnabled: false,
                itemSelectText: '',
                shouldSort: false, // Keep original order
            });
        } else {
            console.error("Branch selector element not found.");
            hideLoading(); // Hide loading if selector fails
            return; 
        }

        await populateBranchSelector(); // Populate dropdown

        // Check for branchId in URL
        const urlParams = new URLSearchParams(window.location.search);
        const urlBranchId = urlParams.get('branchId');

        if (urlBranchId) {
            console.log(`Branch ID found in URL: ${urlBranchId}`);
            // Set the dropdown to this branch
            if (branchChoices) {
                branchChoices.setValue([{ value: urlBranchId, label: 'Loading...' }]); // Set temporary label
            }
            // Fetch and display issues for this branch
            await handleBranchChange({ detail: { value: urlBranchId } }); // Simulate change event
        } else {
            // Default behavior if no branchId in URL
            await fetchIssues(); // Fetch all or default branch issues
            filterAndDisplayIssues();
        }
        
        // Update maintenance tasks (consider if this should depend on branch selection)
        updateMaintenanceTasks();
        updateMaintenanceTaskStats();

        console.log("Page initialization complete.");
        hideLoading(); // Hide loading indicator on success

    } catch (error) {
        console.error('Error initializing page:', error);
        showError("Failed to initialize the page. Please try refreshing.");
        hideLoading(); // Ensure loading indicator is hidden on error
    }
}

// Complete initialization with branch info
async function completeInitialization(branchId, branchName) {
    try {
        // Set current branch ID
        currentBranchId = branchId;
        
        // Update branch info in UI
        updateBranchInfo(branchName);
        
        // Show dashboard
        const dashboard = document.querySelector('.dashboard');
        if (dashboard) {
            dashboard.style.display = 'grid';
        }
        
        // Set up event listeners for filters, etc.
        setupEventListeners();
        
        // Fetch issues for the selected branch
        await fetchIssues();
        
        // Update maintenance tasks
        updateMaintenanceTasks();
        
        hideLoading();
    } catch (error) {
        console.error('Error during initialization completion:', error);
        hideLoading();
    }
}

// Update branch info in UI
function updateBranchInfo(branchName) {
    const branchNameElement = document.getElementById('branchName');
    if (branchNameElement) {
        branchNameElement.textContent = branchName ? `- ${branchName}` : '';
    }
}

// Set up event listeners
function setupEventListeners() {
    // Branch selector
    const branchSelector = document.getElementById('branchSelector');
    if (branchSelector) {
        branchSelector.addEventListener('change', handleBranchChange);
    }
    
    // Export button
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            console.log('Export button clicked');
            alert('Export functionality is not implemented yet.');
        });
    }
    
    // Print button
    const printBtn = document.getElementById('printBtn');
    if (printBtn) {
        printBtn.addEventListener('click', () => {
            console.log('Print button clicked');
            alert('Print functionality is not implemented yet.');
        });
    }
    
    // Clear filters button
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', () => {
            console.log('Clear filters button clicked');
            // Implement filter clearing logic here
            filterAndDisplayIssues();
        });
    }
}

// Populate branch selector
async function populateBranchSelector() {
    try {
        const branchSelector = document.getElementById('branchSelector');
        if (!branchSelector) return;
        
        // Destroy previous Choices instance if it exists
        if (branchChoices) {
            branchChoices.destroy();
            branchChoices = null;
        }
        
        // Clear existing options
        branchSelector.innerHTML = '<option value="">Loading branches...</option>';
        
        // Get all branches
        let branches = [];
        if (typeof window.hotelBranchManager.getAllBranches === 'function') {
            branches = await window.hotelBranchManager.getAllBranches();
        } else {
            console.warn('getAllBranches not available, using fallback');
            
            // Try to get branch options if available
            if (typeof window.hotelBranchManager.getBranchOptions === 'function') {
                branches = await window.hotelBranchManager.getBranchOptions();
            } else {
                // Fallback to single branch
                const currentBranch = window.hotelBranchManager.getCurrentBranch();
                const branchData = window.hotelBranchManager.getBranchData();
                
                if (currentBranch && branchData) {
                    branches = [{ id: currentBranch, name: branchData.name || 'Current Branch' }];
                } else {
                    branches = [{ id: 'default', name: 'Default Branch' }];
                }
            }
        }
        
        // Clear and add options
        branchSelector.innerHTML = '';
        
        // Add default option if needed
        if (branches.length > 1) {
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = 'Select a branch...';
            branchSelector.appendChild(defaultOption);
        }
        
        // Add branch options
        branches.forEach(branch => {
            const option = document.createElement('option');
            option.value = branch.id;
            option.textContent = branch.name;
            
            // Select current branch
            if (branch.id === currentBranchId) {
                option.selected = true;
            }
            
            branchSelector.appendChild(option);
        });
        
        // Initialize Choices.js
        branchChoices = new Choices(branchSelector, {
            searchEnabled: true,
            itemSelectText: '',
            placeholder: true,
            placeholderValue: 'Select a branch...',
            allowHTML: false,
            removeItemButton: false,
            searchPlaceholderValue: 'Search branches',
        });
        
    } catch (error) {
        console.error('Error populating branch selector:', error);
    }
}

// Handle branch change
async function handleBranchChange(event) {
    try {
        // Get the branch ID from the event
        const branchId = event.detail ? event.detail.value : event.target.value;
        
        if (!branchId) {
            return;
        }
        
        showLoading();
        
        // Update current branch ID
        currentBranchId = branchId;
        
        // Get branch name
        const branchData = window.hotelBranchManager.getBranchData();
        const branchName = branchData && branchData.name ? branchData.name : 'Unknown Branch';
        
        // Update branch info
        updateBranchInfo(branchName);
        
        // Show dashboard now that a branch is selected
        const dashboard = document.querySelector('.dashboard');
        if (dashboard) {
            dashboard.style.display = 'grid';
        }
        
        // Fetch issues for the selected branch
        await fetchIssues();
        
        // Update maintenance tasks
        updateMaintenanceTasks();
        
        hideLoading();
    } catch (error) {
        console.error('Error handling branch change:', error);
        hideLoading();
    }
}

// Filter and display issues
async function filterAndDisplayIssues() {
    try {
        // Display issues
        displayIssues(cachedIssues);
    } catch (error) {
        console.error('Error filtering issues:', error);
    }
}

// Display issues
function displayIssues(issues) {
    const issuesList = document.getElementById('issuesList');
    if (!issuesList) return;
    
    if (!issues || issues.length === 0) {
        issuesList.innerHTML = `
            <div class="empty-state">
                <h3>No Issues Found</h3>
                <p>There are no maintenance issues for this branch.</p>
            </div>
        `;
        return;
    }
    
    issuesList.innerHTML = '';
    
    issues.forEach(issue => {
        const card = document.createElement('div');
        card.className = 'issue-card';
        
        // Create priority label
        const priorityClass = `priority-${issue.priority || 'low'}`;
        const priorityLabel = issue.priority ? PRIORITY_LEVELS[issue.priority].label : 'Low';
        
        // Create status badge
        const statusClass = `status-${issue.status ? issue.status.toLowerCase().replace(/\s+/g, '-') : 'new'}`;
        
        card.innerHTML = `
            <div class="issue-header">
                <div class="issue-priority ${priorityClass}">${priorityLabel}</div>
                <div class="issue-status ${statusClass}">${issue.status || 'New'}</div>
            </div>
            <div class="issue-body">
                <h3 class="issue-title">${issue.category || 'Maintenance Issue'}</h3>
                <p class="issue-description">${issue.description || 'No description provided'}</p>
                <div class="issue-details">
                    <div class="issue-detail">
                        <span class="detail-label">Location:</span>
                        <span class="detail-value">${issue.location || issue.roomNumber || 'Not specified'}</span>
                    </div>
                    <div class="issue-detail">
                        <span class="detail-label">Reported by:</span>
                        <span class="detail-value">${issue.authorName || 'Anonymous'}</span>
                    </div>
                    <div class="issue-detail">
                        <span class="detail-label">Date:</span>
                        <span class="detail-value">${formatDate(issue.createdAt)}</span>
                    </div>
                </div>
            </div>
        `;
        
        issuesList.appendChild(card);
    });
}

// Format date for display
function formatDate(dateObj) {
    if (!dateObj) return 'N/A';
    
    // If it's a Firebase timestamp, convert to JS Date
    if (dateObj && typeof dateObj.toDate === 'function') {
        dateObj = dateObj.toDate();
    }
    
    // If it's a string, convert to Date
    if (typeof dateObj === 'string') {
        dateObj = new Date(dateObj);
    }
    
    // Check if date is valid
    if (!(dateObj instanceof Date) || isNaN(dateObj)) {
        return 'Invalid Date';
    }
    
    return dateObj.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

// Update maintenance tasks
function updateMaintenanceTasks() {
    // Placeholder function
    console.log('Updating maintenance tasks...');
}

// Update maintenance task stats
async function updateMaintenanceTaskStats() {
    // Placeholder function
    console.log('Updating maintenance task stats...');
}

// Fetch issues from Firebase
async function fetchIssues() {
    try {
        showLoading();
        
        if (!currentBranchId) {
            console.warn('No branch selected, cannot fetch issues');
            cachedIssues = [];
            hideLoading();
            return;
        }
        
        console.log(`Fetching issues for branch: ${currentBranchId}`);
        
        // Check if Firebase service is available
        if (!window.firebaseService || typeof window.firebaseService.getIssues !== 'function') {
            console.error('Firebase getIssues function not available');
            cachedIssues = [];
            hideLoading();
            return;
        }
        
        // Fetch issues for the current branch
        const result = await window.firebaseService.getIssues({
            branchId: currentBranchId
        });
        
        cachedIssues = result.issues || [];
        
        console.log(`Fetched ${cachedIssues.length} issues`);
        
        // Filter and display the issues
        filterAndDisplayIssues();
        
        hideLoading();
    } catch (error) {
        console.error('Error fetching issues:', error);
        hideLoading();
    }
}

// Show error notification
function showError(message) {
    window.showNotification(message, 'error');
}

// Firebase initialization
function initializeFirebase() {
    try {
        // Check if production mode is set by the HTML page
        const isProduction = typeof window.isProduction !== 'undefined' ? window.isProduction : (window.location.hostname === 'premierfix.uk');
        
        // Use the appropriate firebaseConfig
        let firebaseConfig = null;
        
        if (isProduction && window.firebaseServiceProd) {
            console.log("Using PRODUCTION Firebase configuration");
            
            // Log to analytics that production environment is being used (if available)
            try {
                if (firebase.analytics && typeof firebase.analytics === 'function') {
                    const analytics = firebase.analytics();
                    analytics.logEvent('environment_used', { environment: 'production' });
                }
            } catch (analyticsError) {
                console.warn('Analytics event logging failed:', analyticsError);
            }
            
            // Use production service if available
            return window.firebaseServiceProd.initialize();
        } else if (window.firebaseConfig) {
            // Use the global variable from firebase-config.js
            console.log("Using DEVELOPMENT Firebase configuration");
            firebaseConfig = window.firebaseConfig;
        } else {
            // Fallback configuration - should not be used in production
            console.warn("Using fallback Firebase configuration - this should NOT happen in production");
            firebaseConfig = {
                apiKey: "AIzaSyAlF8cWyOtP_0K8BLsM1yl7fyEQactAEfE",
                authDomain: "premierfix-v2.firebaseapp.com", 
                projectId: "premierfix-v2",
                storageBucket: "premierfix-v2.appspot.com"
            };
        }
        
        // Initialize Firebase if not already initialized and config is available
        if (firebaseConfig && !firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
            console.log("Firebase initialized with " + (isProduction ? "PRODUCTION" : "DEVELOPMENT") + " configuration");
            
            // Initialize analytics if available
            try {
                if (firebase.analytics && typeof firebase.analytics === 'function') {
                    firebase.analytics();
                    console.log("Firebase Analytics initialized");
                }
            } catch (analyticsError) {
                console.warn('Firebase Analytics initialization failed:', analyticsError);
            }
        }
        
        return true;
    } catch (error) {
        console.error("Error initializing Firebase:", error);
        return false;
    }
}

// Document ready - initialize the page
document.addEventListener('DOMContentLoaded', initializePage); 
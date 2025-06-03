/**
 * PremierFix Maintenance Tracker
 * A clean modern implementation for tracking maintenance tasks
 */

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
        // Detect Safari browser - for special initialization handling
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        
        // Initialize Firebase
        console.log("Initializing Firebase...");
        const firebaseInitialized = await initializeFirebase();
        if (!firebaseInitialized) {
            throw new Error('Firebase initialization failed');
        }
        
        // Initialize Firebase services
        console.log("Initializing Firebase services...");
        const servicesInitialized = window.firebaseService && window.firebaseService.initialize ? 
            await window.firebaseService.initialize() : false;
            
        if (!servicesInitialized && !window.firebaseServiceProd) {
            console.warn('Firebase services initialization failed - continuing with limited functionality');
        }
        
        logInfo('Firebase initialized successfully');
        
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
        
        // Special handling for Safari
        if (isSafari || isIOS) {
            console.log("Safari/iOS detected - using special initialization sequence");
            
            // Wait for HotelBranchManager to be ready
            if (!window.hotelBranchManager) {
                console.log("HotelBranchManager not found, waiting...");
                // Wait for a short period to see if it loads
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
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
        } else if (typeof window.hotelBranchManager.initialize === 'function' &&
                  !window.hotelBranchManager.initialized) {
            console.log("Initializing HotelBranchManager...");
            // Ensure hotel branch manager is initialized
            try {
                await window.hotelBranchManager.initialize();
                console.log("HotelBranchManager initialized successfully");
            } catch (branchError) {
                console.error("Error initializing HotelBranchManager:", branchError);
                // Continue anyway, we'll try to recover
            }
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
            
            // Special handling for Safari - make sure we have the dropdown populated but don't show modal
            if ((isSafari || isIOS)) {
                console.log("Safari detected on tracking page - ensuring branch dropdown is populated");
                // We'll populate the dropdown in the next step, no need to call checkBranchSelector
            }
        }
        
        // Initialize Choices.js for the branch selector
        const branchSelectElement = document.getElementById('branchSelector');
        if (branchSelectElement) {
            // Check if Choices.js is already initialized on this element
            if (!branchSelectElement.classList.contains('choices__input')) {
                choicesInstance = new Choices(branchSelectElement, {
                    searchEnabled: false,
                    itemSelectText: '',
                    shouldSort: false, // Keep original order
                });
            } else {
                console.log('Choices.js already initialized on branch selector');
                // Get the existing instance
                choicesInstance = branchSelectElement.choices;
            }
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
            if (choicesInstance) {
                choicesInstance.setValue([{ value: urlBranchId, label: 'Loading...' }]); // Set temporary label
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

// Complete initialization after branch is selected
async function completeInitialization(branchId, branchName) {
    try {
        // Update branch info
        updateBranchInfo(branchName);
        
        // Set up event listeners
        setupEventListeners();
        
        // Show dashboard now that a branch is selected
        const dashboard = document.querySelector('.dashboard');
        if (dashboard) {
            dashboard.style.display = 'grid';
        }
        
        // Fetch and display issues
        await fetchIssues();
        
        // Update maintenance tasks
        updateMaintenanceTasks();
        
        // Show success notification
        showNotification('Tracking page loaded successfully', 'success');
    } catch (error) {
        console.error('Error in initialization:', error);
        showError(`Error in initialization: ${error.message}`);
    }
}

// Update branch info display
function updateBranchInfo(branchName) {
    try {
        const branchNameElement = document.getElementById('branchName');
        
        if (branchNameElement) {
            if (branchName) {
                branchNameElement.textContent = `Branch: ${branchName}`;
            } else {
                // Try to get branch name from hotel branch manager
                try {
                    const branchData = window.hotelBranchManager.getBranchData ? 
                        window.hotelBranchManager.getBranchData() : null;
                    
                    if (branchData && branchData.name) {
                        branchNameElement.textContent = `Branch: ${branchData.name}`;
                    } else {
                        const name = window.hotelBranchManager.getCurrentBranchName ? 
                            window.hotelBranchManager.getCurrentBranchName() : 'Unknown';
                        branchNameElement.textContent = `Branch: ${name}`;
                    }
                } catch (e) {
                    console.warn('Error getting branch name:', e);
                    branchNameElement.textContent = 'Branch: Unknown';
                }
            }
        }
    } catch (error) {
        console.error('Error updating branch info:', error);
    }
}

// Set up event listeners
function setupEventListeners() {
    // Set up event listeners for search and filters
    const searchInput = document.getElementById('searchInput');
    const filterCategory = document.getElementById('filterCategory');
    const filterStatus = document.getElementById('filterStatus');
    const filterPriority = document.getElementById('filterPriority');
    const dateFrom = document.getElementById('dateFrom');
    const dateTo = document.getElementById('dateTo');
    const clearFiltersBtn = document.getElementById('clearFilters');
    const sortButtons = document.querySelectorAll('#sortControlButtons .sort-btn');
    const refreshListBtn = document.getElementById('refreshListBtn');
    
    // Create a debounced version of filter function for search input
    const debouncedFilter = debounce(filterAndDisplayIssues, 300);
    
    // Search input event
    if (searchInput) {
        searchInput.addEventListener('input', debouncedFilter);
    }
    
    // Filter dropdown events
    if (filterCategory) {
        filterCategory.addEventListener('change', filterAndDisplayIssues);
    }
    
    if (filterStatus) {
        filterStatus.addEventListener('change', filterAndDisplayIssues);
    }
    
    if (filterPriority) {
        filterPriority.addEventListener('change', filterAndDisplayIssues);
    }
    
    // Date picker events
    if (dateFrom) {
        dateFrom.addEventListener('change', filterAndDisplayIssues);
    }
    
    if (dateTo) {
        dateTo.addEventListener('change', filterAndDisplayIssues);
    }
    
    // Clear filters button
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', clearFilters);
    }
    
    // Refresh list button
    if (refreshListBtn) {
        refreshListBtn.addEventListener('click', refreshIssuesList);
    }
    
    // Sort buttons
    if (sortButtons.length > 0) {
        sortButtons.forEach(button => {
            button.addEventListener('click', (event) => {
                // Update active state
                sortButtons.forEach(btn => btn.classList.remove('active'));
                event.target.classList.add('active');
                
                // Get sort direction
                sortDirection = event.target.getAttribute('data-sort') || 'desc';
                
                // Filter and display issues with new sort
                filterAndDisplayIssues();
            });
        });
    }
    
    // Branch selector change - now uses Choices.js instance
    if (branchChoices) {
        branchChoices.passedElement.element.addEventListener('change', handleBranchChange, false);
    }

    // Maintenance action buttons (Outside cards)
    const acFilterButton = document.querySelector('#acFilterCard .maintenance-action');
    const bathroomFanButton = document.querySelector('#bathroomFanCard .maintenance-action');
    if (acFilterButton) acFilterButton.addEventListener('click', handleMaintenanceAction);
    if (bathroomFanButton) bathroomFanButton.addEventListener('click', handleMaintenanceAction);
    
    // Export to Excel button
    const exportExcelBtn = document.getElementById('exportExcelBtn');
    if (exportExcelBtn) {
        exportExcelBtn.addEventListener('click', exportToExcel);
    }
    
    // Print View button
    const printViewBtn = document.getElementById('printViewBtn');
    if (printViewBtn) {
        printViewBtn.addEventListener('click', openPrintView);
    }
    
    // Delete All Tasks button
    const deleteAllTasksBtn = document.getElementById('deleteAllTasksBtn');
    if (deleteAllTasksBtn) {
        deleteAllTasksBtn.addEventListener('click', deleteAllTasks);
    }
    
    // Set up issue card event delegation instead of calling a non-existent function
    setupIssueCardEventDelegation();
}

// Function to set up issue card event delegation
function setupIssueCardEventDelegation() {
    // --- Add Delegated Event Listener for Issue Cards --- 
    const issuesListContainer = document.getElementById('issuesList');
    if (issuesListContainer) {
        issuesListContainer.addEventListener('click', function(event) {
            // Check if a status button was clicked
            const statusButton = event.target.closest('.status-btn');
            if (statusButton) {
                event.stopPropagation(); // Prevent potential conflicts
                handleStatusUpdateClickDelegated(statusButton);
                return; // Don't process other clicks if this was handled
            }
            
            // Check if the comments button was clicked
            const commentsButton = event.target.closest('.toggle-comments-btn');
            if (commentsButton) {
                event.stopPropagation(); // Prevent potential conflicts
                handleToggleCommentsClickDelegated(commentsButton);
                return; // Don't process other clicks if this was handled
            }
            
            // Potentially add handlers for other card actions here
        });
    } else {
        console.error('Could not find issuesList container for event delegation.');
    }
}

// --- New Delegated Handler for Status Update --- 
async function handleStatusUpdateClickDelegated(clickedButton) {
    const newStatus = clickedButton.getAttribute("data-status");
    const card = clickedButton.closest('.modern-card'); 
    if (!card) return;
    const issueId = card.getAttribute('data-id');
    const issueIndex = cachedIssues.findIndex(i => i.id === issueId);
    const currentIssue = issueIndex !== -1 ? cachedIssues[issueIndex] : null; 

    if (!currentIssue) {
        notifyError("Could not update issue: not found.");
        return;
    }
    
    try {
        showStatusUpdatingSpinner(clickedButton); 
        await updateIssueStatus(issueId, newStatus);
        notifyStatusChange(newStatus);
        
        // Update local cache
        currentIssue.status = newStatus;
        currentIssue.updatedAt = new Date();
        
        // Re-render the entire card footer (or just update relevant parts)
        renderCardFooter(card, currentIssue);
        
        // Update card attributes
        card.setAttribute("data-status", newStatus);
        const priorityClass = (currentIssue.priority || 'low').toLowerCase();
        card.className = `modern-card priority-${priorityClass}`;
        if(currentIssue.photoUrl) card.classList.add('has-photo');

    } catch (error) {
        console.error("Error updating status:", error);
        notifyError("Failed to update status.");
    } finally {
        hideStatusUpdatingSpinner(clickedButton); 
    }
}

// --- New Delegated Handler for Toggle Comments --- 
function handleToggleCommentsClickDelegated(clickedButton) {
    const issueId = clickedButton.getAttribute('data-issue-id');
    if (issueId) {
        showCommentsModal(issueId); // Directly call showCommentsModal
    }
}

// --- Function to Render/Update Card Footer --- 
function renderCardFooter(cardElement, issue) {
    const footer = cardElement.querySelector('.card-footer');
    if (!footer) {
        console.error("Could not find footer element for issue:", issue.id);
        return;
    }
    
    const updatedStatus = issue.status || 'New';
    const updatedStatusClass = updatedStatus.toLowerCase().replace(/\s+/g, '-');
    const updatedStatusIcon = { new: 'fa-bell', 'in-progress': 'fa-spinner fa-spin', completed: 'fa-check-circle' }[updatedStatusClass] || 'fa-question-circle';
    const updatedCommentCount = (issue.comments && Array.isArray(issue.comments)) ? issue.comments.length : 0; 
    const authorName = issue.authorName || 'Unknown';
    const updatedActionButtons = getActionButtonsMap(updatedStatus);
    
    footer.innerHTML = `
        <div class="footer-row footer-top">
            <div class="status-author-wrapper">
                <div class="card-status ${updatedStatusClass}">
                    <i class="fas ${updatedStatusIcon}"></i> ${escapeHTML(updatedStatus)}
                </div>
                <span class="card-author" title="Created by">
                   <i class="far fa-user"></i> ${escapeHTML(authorName)}
                </span>
            </div>
            ${updatedActionButtons.top || ''}
        </div>
        <hr>
        <div class="footer-row footer-bottom">
            <button class="action-btn toggle-comments-btn" data-issue-id="${escapeHTML(issue.id)}" title="Show Comments">
                <i class="far fa-comment-dots"></i> Comments <span class="comment-count-badge">${updatedCommentCount}</span>
            </button>
            ${updatedActionButtons.bottom || ''}
        </div>
    `;
    // Note: No need to re-attach listeners here with event delegation
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
        
        // If no branches found
        if (branches.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No branches available';
            branchSelector.appendChild(option);
        }

        // Initialize Choices.js
        branchChoices = new Choices(branchSelector, {
            searchEnabled: true,
            itemSelectText: '',
            placeholder: true,
            placeholderValue: 'Select a branch...',
            allowHTML: false,
            removeItemButton: false, // If you want a remove button
            searchPlaceholderValue: 'Search branches',
        });

    } catch (error) {
        console.error('Error populating branch selector:', error);
        
        // Show fallback option
        const branchSelector = document.getElementById('branchSelector');
        if (branchSelector) {
            branchSelector.innerHTML = '<option value="">Error loading branches</option>';
        }
    }
}

// Handle branch change
async function handleBranchChange(event) {
    try {
        // The value comes directly from the event target (Choices sets it on the original select)
        const branchId = event.target.value;
        // Remove the old way of getting branchId from Choices.js detail if present
        // const branchId = event.detail ? event.detail.value : event.target.value;

        if (!branchId) {
            // Hide dashboard if no branch selected
            const dashboard = document.querySelector('.dashboard');
            if (dashboard) {
                dashboard.style.display = 'none';
            }
            
            // Show select branch message
            const issuesList = document.getElementById('issuesList');
            if (issuesList) {
                issuesList.innerHTML = `
                    <div class="empty-state">
                        <h3>Select a Branch</h3>
                        <p>Please select a branch to view maintenance issues and tasks.</p>
                    </div>
                `;
            }
            
            // Update branch name display
            const branchNameElement = document.getElementById('branchName');
            if (branchNameElement) {
                branchNameElement.textContent = 'Please select a branch';
            }
            
            return;
        }
        
        // Show loading
        showLoading();
        
        // Update current branch ID
        currentBranchId = branchId;
        window.currentPage = 1; // Reset to page 1 for new branch
        
        // Load branch data
        if (typeof window.hotelBranchManager.loadBranchData === 'function') {
            await window.hotelBranchManager.loadBranchData(branchId);
        }
        
        // Get branch data
        const branchData = window.hotelBranchManager.getBranchData();
        const branchName = branchData && branchData.name ? branchData.name : 'Unknown Branch';
        
        // Update branch info
        updateBranchInfo(branchName);
        
        // Show dashboard now that a branch is selected
        const dashboard = document.querySelector('.dashboard');
        if (dashboard) {
            dashboard.style.display = 'grid';
        }
        
        // Refresh issues
        await fetchIssues(); // fetchIssues will now call filterAndDisplayIssues
        
        // Update maintenance tasks
        updateMaintenanceTasks();
        
        // Show notification
        showNotification(`Switched to branch: ${branchName}`, 'success');
    } catch (error) {
        console.error('Error changing branch:', error);
        showError(`Failed to change branch: ${error.message}`);
    } finally {
        hideLoading();
    }
}

// Simple debounce function for search input
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Filter and display issues
async function filterAndDisplayIssues() {
    try {
        // Ensure cachedIssues is an array
        if (!Array.isArray(cachedIssues)) {
            console.warn('cachedIssues is not an array, resetting to empty array');
            cachedIssues = [];
            displayIssues();
            return;
        }
        
        // Get filter values
        const searchValue = (document.getElementById('searchInput')?.value || '').toLowerCase();
        const categoryFilter = document.getElementById('filterCategory')?.value || '';
        const statusFilter = document.getElementById('filterStatus')?.value || '';
        const priorityFilter = document.getElementById('filterPriority')?.value || '';
        const dateFromFilter = document.getElementById('dateFrom')?.value ? new Date(document.getElementById('dateFrom').value) : null;
        const dateToFilter = document.getElementById('dateTo')?.value ? new Date(document.getElementById('dateTo').value) : null;
        
        // Set end of day for dateTo
        if (dateToFilter) {
            dateToFilter.setHours(23, 59, 59, 999);
        }
        
        // Filter issues (create a filtered copy, don't modify the original)
        const filteredIssues = cachedIssues.filter(issue => {
            // Ensure issue is a valid object
            if (!issue || typeof issue !== 'object') return false;
            
            // Search text (in location, description, category, author)
            const searchMatches = !searchValue || 
                (issue.location && issue.location.toLowerCase().includes(searchValue)) ||
                (issue.roomNumber && issue.roomNumber.toString().includes(searchValue)) ||
                (issue.description && issue.description.toLowerCase().includes(searchValue)) ||
                (issue.category && issue.category.toLowerCase().includes(searchValue)) ||
                (issue.authorName && issue.authorName.toLowerCase().includes(searchValue));
            
            if (!searchMatches) return false;
            
            // Category filter (case-insensitive match)
            if (categoryFilter && issue.category && 
                issue.category.toLowerCase() !== categoryFilter.toLowerCase()) {
                return false;
            }
            
            // Status filter
            if (statusFilter && issue.status !== statusFilter) return false;
            
            // Priority filter
            if (priorityFilter && issue.priority !== priorityFilter) return false;
            
            // Date range filter
            if (dateFromFilter || dateToFilter) {
                const issueDate = issue.createdAt?.seconds ? 
                    new Date(issue.createdAt.seconds * 1000) : 
                    (issue.dateCreated ? new Date(issue.dateCreated) : null);
                
                if (!issueDate) return false;
                
                if (dateFromFilter && issueDate < dateFromFilter) return false;
                if (dateToFilter && issueDate > dateToFilter) return false;
            }
            
            return true;
        });
        
        // Store the filtered issues for display, but don't overwrite the original cached issues
        const displayedIssues = [...filteredIssues];
        
        // Sort the displayed issues
        sortIssues(displayedIssues);
        
        // Display the issues
        displayIssues(displayedIssues);
        
    } catch (error) {
        console.error('Error filtering issues:', error);
        showError('Error filtering issues: ' + error.message);
        
        // Display empty state
        displayIssues([]);
    }
}

// Sort the provided issues array
function sortIssues(issues) {
    if (!Array.isArray(issues)) return;

    // Define priority order (higher number = higher priority)
    const priorityOrder = { critical: 3, medium: 2, low: 1 };
    // Define status order (lower number = higher priority in list)
    const statusOrder = { 'New': 1, 'In Progress': 2, 'Completed': 99 }; // Completed has high number to go last

    issues.sort((a, b) => {
        // --- Primary Sort: Completed vs. Active --- 
        const aIsCompleted = a.status === 'Completed';
        const bIsCompleted = b.status === 'Completed';

        if (!aIsCompleted && bIsCompleted) return -1; // Active comes before Completed
        if (aIsCompleted && !bIsCompleted) return 1;  // Completed comes after Active

        // --- Secondary Sort (if both are Completed) --- 
        if (aIsCompleted && bIsCompleted) {
            // Sort Completed by updatedAt (descending - newest first)
            // Use updatedAt as proxy for completion date, fallback to createdAt
            const dateA = a.updatedAt?.seconds ? new Date(a.updatedAt.seconds * 1000) : new Date(a.createdAt?.seconds * 1000 || 0);
            const dateB = b.updatedAt?.seconds ? new Date(b.updatedAt.seconds * 1000) : new Date(b.createdAt?.seconds * 1000 || 0);
            return dateB - dateA; // Always newest completed first for this group
        }

        // --- Secondary Sort (if both are Active - !aIsCompleted && !bIsCompleted) --- 
        // 1. Prioritize critical active tasks
        const aIsCritical = (a.priority === 'critical');
        const bIsCritical = (b.priority === 'critical');

        if (aIsCritical && !bIsCritical) return -1; // Critical comes before non-critical
        if (!aIsCritical && bIsCritical) return 1;  // Non-critical comes after critical

        // 2. If both are same criticality (critical or non-critical), sort by status order
        const statusValA = statusOrder[a.status] || 90; // Default large number for unknown active
        const statusValB = statusOrder[b.status] || 90;
        if (statusValA !== statusValB) {
            return statusValA - statusValB; // Lower status number comes first (New > In Progress)
        }

        // 3. If criticality and status are the same, sort by creation date respecting sortDirection
        const creationDateA = a.createdAt?.seconds ? new Date(a.createdAt.seconds * 1000) : new Date(a.dateCreated || 0);
        const creationDateB = b.createdAt?.seconds ? new Date(b.createdAt.seconds * 1000) : new Date(b.dateCreated || 0);

        return sortDirection === 'asc' ? creationDateA - creationDateB : creationDateB - creationDateA;
    });
}

// Display issues on the page
function displayIssues(issues) {
    const issuesList = document.getElementById('issuesList');
    const paginationContainer = document.getElementById('paginationContainer'); // Declare ONCE here
    issuesList.innerHTML = ''; // Clear previous issues

    // Always hide pagination container initially
    if (paginationContainer) {
        paginationContainer.style.display = 'none';
        paginationContainer.innerHTML = ''; // Clear its content too
    }

    if (!currentBranchId) {
        issuesList.innerHTML = `
            <div class="empty-state">
                <h3>Select a Branch</h3>
                <p>Please select a branch to view maintenance issues and tasks.</p>
            </div>
        `;
        if (paginationContainer) paginationContainer.style.display = 'none';
        // updateAllStatusSectionCounts(); // No longer needed as sections are removed
        return; // Stop if no branch selected
    }

    if (!Array.isArray(issues) || issues.length === 0) {
        // Display empty state message
        issuesList.innerHTML = `<div class="empty-state"><h3>There are no maintenance issues for this branch.</h3><p>No issues match the current filter criteria, or none have been logged yet.</p></div>`;
        hideLoading(); // Ensure loading is hidden
        document.getElementById('paginationContainer').style.display = 'none'; // Hide pagination
        // Add event listener for the clear button within the empty state
        const clearFiltersEmptyBtn = document.getElementById('clearFiltersEmpty');
        if (clearFiltersEmptyBtn) {
            clearFiltersEmptyBtn.addEventListener('click', clearFilters);
        }
        if (paginationContainer) paginationContainer.style.display = 'none'; // Hide pagination if no issues
        // updateAllStatusSectionCounts(); // No longer needed
        return;
    }

    // Sort issues based on current sortDirection
    sortIssues(issues); // Sort the 'issues' array directly
    
    // Pagination calculations (use the sorted 'issues' array)
    const totalPages = Math.ceil(issues.length / issuesPerPage);
    // Use the existing paginationContainer variable

    // Only render pagination if there are multiple pages
    if (totalPages > 1) {
        // Use the global window.currentPage for calculations
        const startIndex = (window.currentPage - 1) * issuesPerPage;
        const endIndex = startIndex + issuesPerPage;
        const paginatedIssues = issues.slice(startIndex, endIndex); // Use the sorted 'issues' array
        
        // Clear existing issues and add paginated ones
        issuesList.innerHTML = ''; // Clear again before adding paginated ones
        paginatedIssues.forEach(issue => {
            const card = createIssueCard(issue);
            issuesList.appendChild(card);
        });

        // Render pagination controls
        renderPagination(window.currentPage, totalPages, paginationContainer); // Use existing variable
        if (paginationContainer) {
            paginationContainer.style.display = 'flex'; // Show pagination
        }
    } else {
        // If only one page or no issues, display all fetched issues (already sorted)
        issuesList.innerHTML = ''; // Clear just in case
        issues.forEach(issue => { // Display all issues directly
            const card = createIssueCard(issue);
            issuesList.appendChild(card);
        });

        // Hide pagination
        if (paginationContainer) { // Use declared variable
            paginationContainer.style.display = 'none';
            paginationContainer.innerHTML = ''; // Clear any existing pagination buttons
        }
    }

    hideLoading();
}

// Create an issue card
function createIssueCard(issue) {
    try {
        if (!issue) {
            console.error("Invalid issue data provided to createIssueCard");
            return null;
        }

        const issueDate = formatDate(issue.createdAt);
        const dueDateText = issue.dueDate ? formatDate(issue.dueDate) : "No due date";
        const description = formatDescription(issue.description);
        const priorityClass = issue.priority ? issue.priority.toLowerCase() : 'low';
        const statusClass = issue.status ? issue.status.toLowerCase().replace(/\s+/g, '-') : 'new';
        const categoryClass = issue.category ? issue.category.toLowerCase().replace(/\s+/g, '-') : 'other';

        // --- RE-ADD commentCount calculation here --- 
        const commentCount = (issue.comments && Array.isArray(issue.comments)) ? issue.comments.length : 0;

        // Create card element
        const cardElement = document.createElement('div');
        cardElement.className = `modern-card priority-${priorityClass}`;
        cardElement.setAttribute('data-id', issue.id);
        cardElement.setAttribute('data-status', issue.status || 'New');
        cardElement.setAttribute('data-priority', issue.priority || 'Low');
        cardElement.setAttribute('data-category', issue.category || 'Other');

        // Add 'has-photo' class if photoUrl exists
        if (issue.photoUrl) {
            cardElement.classList.add('has-photo');
        }

        // Check for photo upload failure
        const photoUploadFailed = issue.photoUploadFailed === true;
        if (photoUploadFailed) {
            cardElement.classList.add('photo-upload-failed');
        }

        // Icons for status and priority
        const priorityIcon = { low: 'fa-thumbs-up', medium: 'fa-exclamation-circle', critical: 'fa-exclamation-triangle' }[priorityClass] || 'fa-info-circle';
        const statusIcon = { new: 'fa-bell', 'in-progress': 'fa-spinner fa-spin', completed: 'fa-check-circle' }[statusClass] || 'fa-question-circle';

        // --- Define the Event Handler for Status Buttons --- 
        async function handleStatusUpdateClick(event) {
            const clickedButton = event.currentTarget; // Get the button that was clicked
            const newStatus = clickedButton.getAttribute("data-status");
            const card = clickedButton.closest('.modern-card'); 
            if (!card) return;
            const issueId = card.getAttribute('data-id');
            const issueIndex = cachedIssues.findIndex(i => i.id === issueId);
            // Find the issue in the cache *using the ID*
            const currentIssue = issueIndex !== -1 ? cachedIssues[issueIndex] : null; 

            if (!currentIssue) {
                notifyError("Could not update issue: not found.");
                return;
            }
            
            try {
                showStatusUpdatingSpinner(clickedButton); // Pass the actual clicked button
                await updateIssueStatus(issueId, newStatus);
                notifyStatusChange(newStatus);
                
                // Update local cache
                currentIssue.status = newStatus;
                currentIssue.updatedAt = new Date();
                
                // --- Re-render the entire footer using the new structure --- 
                // --- REMOVED OLD RE-ATTACHMENT LOGIC --- 
                // The code that re-rendered the footer and attempted to re-attach listeners
                // has been replaced by calling renderCardFooter(card, currentIssue)
                // in the new delegated event handler.
                
                // Update card attributes
                card.setAttribute("data-status", newStatus);
                const priorityClass = (currentIssue.priority || 'low').toLowerCase();
                card.className = `modern-card priority-${priorityClass}`;
                if(currentIssue.photoUrl) card.classList.add('has-photo');

            } catch (error) {
                console.error("Error updating status:", error);
                notifyError("Failed to update status.");
            } finally {
                hideStatusUpdatingSpinner(clickedButton); // Pass the actual clicked button
            }
        } 
        // --- End of handleStatusUpdateClick definition ---

        // Card HTML structure (Initial rendering)
        cardElement.innerHTML = `
            <div class="card-main-content">
                <div class="card-header">
                    <div class="card-location">
                        <i class="fas fa-map-marker-alt"></i>
                        ${issue.roomNumber ? `Room ${escapeHTML(issue.roomNumber)}` : (issue.location ? escapeHTML(issue.location) : "Unknown Location")}
                    </div>
                    <div class="card-date">
                        <i class="far fa-calendar-alt"></i> ${issueDate}
                    </div>
                </div>
                <div class="card-body">
                    <div class="card-category-priority">
                        <span class="card-category ${categoryClass}">
                            <i class="fas fa-tag"></i> ${escapeHTML(issue.category || 'Other')}
                        </span>
                        <span class="card-priority ${priorityClass}">
                            <i class="fas ${priorityIcon}"></i> ${escapeHTML(issue.priority || 'Low')}
                        </span>
                    </div>
                    <div class="card-description-photo-wrapper">
                        <div class="card-description">${description}</div>
                        ${issue.photoUrl ? `
                        <div class="card-photo-container">
                            <img src="${issue.photoUrl}" alt="Issue photo" loading="lazy" onerror="this.style.display='none'; this.parentElement.style.display='none';">
                            <a href="photo-viewer.html?id=${issue.id}&photoUrl=${encodeURIComponent(issue.photoUrl)}" class="card-view-photo" target="_blank" title="View Full Size Photo">
                                <i class="fas fa-search-plus"></i>
                            </a>
                        </div>
                        ` : ''}
                        ${issue.photoUploadFailed ? `
                        <div class="photo-upload-failed-indicator">
                            <i class="fas fa-exclamation-triangle"></i> Photo upload failed
                            <div class="photo-error-details">${escapeHTML(issue.photoErrorMessage || 'Photo could not be uploaded')}</div>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
            <div class="card-footer">
                 <div class="footer-row footer-top">
                    <div class="status-author-wrapper">
                        <div class="card-status ${statusClass}">
                            <i class="fas ${statusIcon}"></i> ${escapeHTML(issue.status || 'New')}
                        </div>
                        <span class="card-author" title="Created by">
                           <i class="far fa-user"></i> ${escapeHTML(issue.authorName || 'Unknown')}
                        </span>
                    </div>
                    <!-- Top action button(s) will be inserted by JS -->
                </div>
                <hr>
                <div class="footer-row footer-bottom">
                    <button class="action-btn toggle-comments-btn" data-issue-id="${escapeHTML(issue.id)}" title="Show Comments">
                        <i class="far fa-comment-dots"></i> Comments <span class="comment-count-badge">${commentCount}</span>
                    </button>
                    <!-- Bottom action button(s) will be inserted by JS -->
                </div>
            </div>
        `;

        // --- Add Action Buttons and Attach Initial Listeners --- 
        const footerTopContainer = cardElement.querySelector(".footer-row.footer-top");
        const footerBottomContainer = cardElement.querySelector(".footer-row.footer-bottom");
        const currentStatus = issue.status || 'New';
        const actionButtons = getActionButtonsMap(currentStatus);

        if (actionButtons.top) {
            footerTopContainer.insertAdjacentHTML('beforeend', actionButtons.top);
        }
        if (actionButtons.bottom) {
            footerBottomContainer.insertAdjacentHTML('beforeend', actionButtons.bottom);
        }

        // Attach initial listeners using the NAMED handler
        cardElement.querySelectorAll(".footer-row .status-btn").forEach(button => {
            const listenerId = `status-btn-${issue.id}-${button.dataset.status}`;
            if (button.dataset.listenerAttached !== listenerId) { // Prevent double listeners
                button.dataset.listenerAttached = listenerId;
                button.addEventListener('click', handleStatusUpdateClick); // Use named handler
            }
        });

        // Attach initial listener for the 'Toggle Comments' button
        const initialToggleCommentsBtn = cardElement.querySelector('.toggle-comments-btn');
        if (initialToggleCommentsBtn) {
             const commentsListenerId = `comments-btn-${issue.id}`;
             // Define comments handler separately for clarity
             const handleToggleComments = (e) => { 
                 e.stopPropagation();
                 const buttonIssueId = initialToggleCommentsBtn.getAttribute('data-issue-id');
                 showCommentsModal(buttonIssueId); // Simplified: always show/reopen modal
             }; 
             if (initialToggleCommentsBtn.dataset.listenerAttached !== commentsListenerId) { 
                 initialToggleCommentsBtn.dataset.listenerAttached = commentsListenerId;
                 initialToggleCommentsBtn.addEventListener('click', handleToggleComments);
             }
        } else {
            console.warn("Initial toggle comments button not found:", issue.id);
        }

        // --- RENDER INITIAL FOOTER using the new function --- 
        renderCardFooter(cardElement, issue); 

        return cardElement;
    } catch (error) {
        console.error("Error creating issue card:", error, issue);
        return null;
    }
}

// ---- NEW: Comment Modal Functions ----

/**
 * Generates the HTML structure for the comment modal.
 * @param {string} issueId - The ID of the issue.
 * @param {string} issueTitle - A title for the modal (e.g., 'Comments for Room 101').
 * @returns {string} HTML string for the modal.
 */
function createCommentModalHTML(issueId, issueTitle) {
    return `
        <div class="comment-modal" id="comment-modal" role="dialog" aria-modal="true" aria-labelledby="comment-modal-title" data-modal-issue-id="${escapeHTML(issueId)}">
            <div class="modal-header">
                <h5 id="comment-modal-title">${escapeHTML(issueTitle)}</h5>
                <button class="close-modal-btn" aria-label="Close comments modal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="comment-list-container">
                    <ul class="comment-list"></ul>
                    
                </div>
                <div class="comment-input-area">
                    <textarea class="comment-input" placeholder="Add a comment..." rows="3" aria-label="New comment"></textarea>
                    
                    <button class="action-btn comment-submit-btn" data-issue-id="${escapeHTML(issueId)}">
                        <i class="fas fa-paper-plane"></i> Post Comment
                    </button>
                    <span class="comment-status-indicator" style="display: none;"><i class="fas fa-spinner fa-spin"></i></span>
                </div>
            </div>
        </div>
    `;
}

/**
 * Creates a single comment list item element.
 * @param {object} comment - The comment object.
 * @returns {HTMLElement} The LI element for the comment.
 */
function createCommentElement(comment) {
    const li = document.createElement('li');
    li.className = 'comment-item';
    li.setAttribute('data-comment-id', comment.commentId || '');

    const authorName = comment.author || 'Anonymous';
    const isCurrentUser = window.currentUser?.name && authorName === window.currentUser.name; // Basic check

    // Format timestamp relatively
    const timestamp = comment.timestamp ? (comment.timestamp.toDate ? comment.timestamp.toDate() : new Date(comment.timestamp)) : new Date();
    const relativeTime = formatRelativeTime(timestamp);

    li.innerHTML = `
        <div class="comment-content">
            <p class="comment-text">${escapeHTML(comment.text)}</p>
            <small class="comment-meta">
                <span class="comment-author">By ${escapeHTML(authorName)}</span>
                <span class="comment-time" title="${timestamp.toLocaleString()}">${relativeTime}</span>
            </small>
        </div>
        ${isCurrentUser ? `
        <div class="comment-actions">
            <button class="comment-action-btn edit-comment-btn" title="Edit comment (not implemented)"><i class="fas fa-pencil-alt"></i></button>
            <button class="comment-action-btn delete-comment-btn" title="Delete comment (not implemented)"><i class="fas fa-trash-alt"></i></button>
        </div>
        ` : ''}
    `;

    // Add event listeners for edit/delete (placeholders)
    const editBtn = li.querySelector('.edit-comment-btn');
    const deleteBtn = li.querySelector('.delete-comment-btn');
    if(editBtn) {
        editBtn.addEventListener('click', () => alert('Edit functionality not implemented yet.'));
    }
    if(deleteBtn) {
        deleteBtn.addEventListener('click', () => alert('Delete functionality not implemented yet.'));
    }

    return li;
}

/**
 * Populates the comment list in the modal.
 * @param {HTMLElement} listElement - The UL element to populate.
 * @param {Array<object>} comments - Array of comment objects.
 */
function populateCommentList(listElement, comments) {
    listElement.innerHTML = ''; // Clear existing
    if (comments && comments.length > 0) {
        // Sort comments by timestamp, oldest first for display order (optional)
        // Or newest first if preferred: .sort((a, b) => (b.timestamp?.toDate() || 0) - (a.timestamp?.toDate() || 0))
        const sortedComments = [...comments].sort((a, b) => 
            (a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp || 0)) - 
            (b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp || 0))
        );
        sortedComments.forEach(comment => {
            if(comment && comment.text) { // Basic validation
                listElement.appendChild(createCommentElement(comment));
            }
        });
    } else {
        listElement.innerHTML = '<li class="no-comments">No comments yet.</li>';
    }
    // Auto-scroll to bottom
    const container = listElement.closest('.comment-list-container');
    if (container) {
        container.scrollTop = container.scrollHeight;
    }
}

/**
 * Shows the comment modal for a given issue.
 * @param {string} issueId - The ID of the issue.
 */
function showCommentsModal(issueId) {
    closeCommentsModal(); // Close any existing modal first

    const issue = cachedIssues.find(i => i.id === issueId);
    if (!issue) {
        console.error(`Issue with ID ${issueId} not found in cache.`);
        notifyError("Could not load comments for this issue.");
        return;
    }

    // Create a title for the modal
    const issueTitle = `Comments for ${issue.roomNumber ? `Room ${escapeHTML(issue.roomNumber)}` : (issue.location ? escapeHTML(issue.location) : `Issue #${issueId.substring(0, 6)}`)}`;

    // Create modal HTML and add to body
    const modalHTML = createCommentModalHTML(issueId, issueTitle);
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.body.classList.add('modal-open'); // Prevent background scroll

    // Get references to modal elements
    const modalElement = document.getElementById('comment-modal');
    const closeBtn = modalElement?.querySelector('.close-modal-btn');
    const commentListUl = modalElement?.querySelector('.comment-list');
    const commentInput = modalElement?.querySelector('.comment-input');
    const submitBtn = modalElement?.querySelector('.comment-submit-btn');
    const statusIndicator = modalElement?.querySelector('.comment-status-indicator');
    const originalCardToggleBtn = document.querySelector(`.toggle-comments-btn[data-issue-id="${issueId}"]`);
    const originalBadge = originalCardToggleBtn?.querySelector('.comment-count-badge');

    if (!modalElement || !closeBtn || !commentListUl || !commentInput || !submitBtn || !statusIndicator || !originalBadge) {
        console.error("Could not find all necessary elements for the comment modal.");
        closeCommentsModal(); // Clean up if setup failed
        return;
    }

    // Populate the list
    populateCommentList(commentListUl, issue.comments || []);

    // Add Event Listeners
    closeBtn.addEventListener('click', closeCommentsModal);

    // Submit listener
    submitBtn.addEventListener('click', async () => {
        const commentText = commentInput.value.trim();
        if (!commentText) {
            showNotification('Comment cannot be empty.', 'warning');
            return;
        }
        const authorName = window.currentUser?.name || 'Maintenance Staff'; // Placeholder

        commentInput.disabled = true;
        submitBtn.disabled = true;
        statusIndicator.style.display = 'inline-block';

        const commentData = { text: commentText, author: authorName, timestamp: new Date() };

        try {
            if (!window.firebaseService || typeof window.firebaseService.addComment !== 'function') {
                throw new Error("Commenting feature not available.");
            }
            const newComment = await window.firebaseService.addComment(issueId, commentData);

            // Optimistic UI Update
            const tempCommentForUI = { ...commentData, commentId: newComment?.commentId || `temp-${Date.now()}` };
            const newElement = createCommentElement(tempCommentForUI);
            
            const noCommentsLi = commentListUl.querySelector('.no-comments');
            if(noCommentsLi) noCommentsLi.remove();
            
            commentListUl.appendChild(newElement);
            commentInput.value = ''; // Clear input
            
            // Scroll to bottom
            const container = commentListUl.closest('.comment-list-container');
            if (container) container.scrollTop = container.scrollHeight;

            // Update count on original card button
            const currentCount = parseInt(originalBadge.textContent || '0', 10);
            originalBadge.textContent = currentCount + 1;

            // Update local cache (important for consistency if modal is reopened)
             const issueIndex = cachedIssues.findIndex(i => i.id === issueId);
             if (issueIndex !== -1) {
                 if (!cachedIssues[issueIndex].comments) {
                     cachedIssues[issueIndex].comments = [];
                 }
                 // Use the comment data returned/confirmed by the service if possible
                 cachedIssues[issueIndex].comments.push({ ...tempCommentForUI, timestamp: tempCommentForUI.timestamp }); 
             }

        } catch (error) {
            console.error("Error posting comment:", error);
            notifyError(`Failed to post comment: ${error.message}`);
        } finally {
            commentInput.disabled = false;
            submitBtn.disabled = false;
            statusIndicator.style.display = 'none';
        }
    });

    // Focus input
    commentInput.focus();
}

/**
 * Closes and removes the comment modal from the DOM.
 */
function closeCommentsModal() {
    const modalElement = document.getElementById('comment-modal');

    if (modalElement) {
        modalElement.classList.add('closing'); // Add class for animation
        // Remove after animation (e.g., 300ms)
        setTimeout(() => {
            modalElement.remove();
             document.body.classList.remove('modal-open');
        }, 300); 
    }
}

/**
 * Formats a date into a relative time string (e.g., "5 minutes ago").
 * @param {Date} date - The date object to format.
 * @returns {string} Relative time string.
 */
function formatRelativeTime(date) {
    if (!(date instanceof Date)) return 'Invalid date';
    const now = new Date();
    const seconds = Math.round((now - date) / 1000);
    const minutes = Math.round(seconds / 60);
    const hours = Math.round(minutes / 60);
    const days = Math.round(hours / 24);
    const weeks = Math.round(days / 7);
    const months = Math.round(days / 30);
    const years = Math.round(days / 365);

    if (seconds < 60) return 'just now';
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (weeks < 5) return `${weeks} week${weeks > 1 ? 's' : ''} ago`; // approx
    if (months < 12) return `${months} month${months > 1 ? 's' : ''} ago`;
    return `${years} year${years > 1 ? 's' : ''} ago`;
}

// Render pagination controls
function renderPagination(currentPage, totalPages, container) {
    if (!container || totalPages <= 1) {
        if (container) container.innerHTML = ''; // Clear if exists but not needed
        return;
    }

    let paginationHTML = '';
    const maxPageButtons = 5; // Max number of page number buttons to show
    const sideButtons = Math.floor((maxPageButtons - 1) / 2); // Number of buttons on each side of current

    // Previous button
    const prevDisabled = currentPage === 1 ? 'disabled' : '';
    paginationHTML += `<button class="pagination-btn ${prevDisabled}" ${prevDisabled} data-page="${currentPage - 1}" aria-label="Previous page">
        <i class="fas fa-chevron-left"></i>
    </button>`;

    // Determine page range to display
    let startPage = Math.max(1, currentPage - sideButtons);
    let endPage = Math.min(totalPages, currentPage + sideButtons);

    // Adjust range if it's too small and there are enough pages
    if (endPage - startPage + 1 < maxPageButtons) {
        if (startPage === 1) {
            endPage = Math.min(totalPages, startPage + maxPageButtons - 1);
        } else if (endPage === totalPages) {
            startPage = Math.max(1, endPage - maxPageButtons + 1);
        }
    }

    // Ellipsis and first page button
    if (startPage > 1) {
        paginationHTML += `<button class="pagination-btn" data-page="1">1</button>`;
        if (startPage > 2) {
            paginationHTML += `<span class="pagination-ellipsis">...</span>`;
        }
    }

    // Page number buttons
    for (let i = startPage; i <= endPage; i++) {
        const activeClass = currentPage === i ? 'active' : '';
        paginationHTML += `<button class="pagination-btn ${activeClass}" data-page="${i}">${i}</button>`;
    }

    // Ellipsis and last page button
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += `<span class="pagination-ellipsis">...</span>`;
        }
        paginationHTML += `<button class="pagination-btn" data-page="${totalPages}">${totalPages}</button>`;
    }

    // Next button
    const nextDisabled = currentPage === totalPages ? 'disabled' : '';
    paginationHTML += `<button class="pagination-btn ${nextDisabled}" ${nextDisabled} data-page="${currentPage + 1}" aria-label="Next page">
        <i class="fas fa-chevron-right"></i>
    </button>`;

    // Set the HTML and add event listeners
    container.innerHTML = paginationHTML;

    // Add event listeners to pagination buttons
    const buttons = container.querySelectorAll('.pagination-btn:not(.disabled)');
    buttons.forEach(button => {
        button.addEventListener('click', () => {
            const newPage = parseInt(button.getAttribute('data-page'), 10);
            // Explicitly check against the *global* currentPage state
            if (newPage && newPage !== window.currentPage) {
                // Update the global currentPage variable directly
                window.currentPage = newPage;
                // Call filterAndDisplayIssues to refresh the display
                filterAndDisplayIssues();
            }
        });
    });
    
    // Add CSS for pagination (Ensure styles exist, e.g., from addPaginationStyles)
    // addPaginationStyles(); // This function might not be needed if styles are already included
}

// Add pagination styles
function addPaginationStyles() {
    // Check if styles are already added
    if (document.getElementById('pagination-styles')) return;
    
    const styleElement = document.createElement('style');
    styleElement.id = 'pagination-styles';
    styleElement.textContent = `
        .pagination {
            margin-top: 40px;
            margin-bottom: 30px;
        }
        
        .pagination-ellipsis {
            display: flex;
            align-items: center;
            justify-content: center;
            min-width: 40px;
            height: 40px;
            font-weight: bold;
            color: var(--dark);
        }
    `;
    document.head.appendChild(styleElement);
}

// Add CSS for the photo link
function addPhotoViewerStyles() {
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        .issue-photo {
            position: relative;
            margin-top: 10px;
            max-width: 100%;
            border-radius: 4px;
            overflow: hidden;
        }
        
        .issue-photo img {
            max-width: 100%;
            max-height: 150px;
            border-radius: 4px;
            display: block;
        }
        
        .view-photo-btn {
            position: absolute;
            bottom: 8px;
            right: 8px;
            background-color: rgba(81, 30, 88, 0.8);
            color: white;
            border: none;
            border-radius: 4px;
            padding: 4px 8px;
            font-size: 12px;
            text-decoration: none;
            transition: background-color 0.3s;
        }
        
        .view-photo-btn:hover {
            background-color: rgba(81, 30, 88, 1);
        }

        .photo-upload-failed-indicator {
            background-color: #ffecec;
            border: 1px solid #f5c2c7;
            color: #842029;
            border-radius: 8px;
            padding: 8px 12px;
            margin-top: 10px;
            font-size: 0.9rem;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .photo-upload-failed-indicator i {
            color: #dc3545;
        }

        .photo-error-details {
            font-size: 0.8rem;
            color: #6c757d;
            margin-top: 5px;
            padding-left: 24px;
        }
    `;
    document.head.appendChild(styleElement);
}

// Format description for display, without truncating
function formatDescription(description) {
    if (!description) return 'No description provided';
    
    // Return full description with escaped HTML
    return escapeHTML(description);
}

// Format a date object or string to a readable format
function formatDate(dateInput) {
    try {
        // Handle Firestore timestamps
        if (dateInput && dateInput.seconds) {
            const date = new Date(dateInput.seconds * 1000);
            return date.toLocaleString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
            });
        }
        
        // Handle string or Date objects
        const date = (dateInput instanceof Date) ? dateInput : new Date(dateInput);
        
        // Check for invalid dates
        if (isNaN(date.getTime())) {
            return 'Unknown Date';
        }
        
        return date.toLocaleString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'Invalid Date';
    }
}

// Update the maintenance task cards (AC Filter and Bathroom Fan)
function updateMaintenanceTasks() {
    try {
        // Get task cards
        const acFilterCard = document.getElementById('acFilterCard');
        const bathroomFanCard = document.getElementById('bathroomFanCard');
        
        if (!acFilterCard || !bathroomFanCard) {
            console.warn('Task cards not found in the DOM');
            return;
        }
        
        // Find maintenance issues for these specific tasks
        const acFilterIssues = cachedIssues.filter(issue => 
            issue.description && 
            issue.description.toLowerCase().includes('ac filter')
        );
        
        const fanIssues = cachedIssues.filter(issue => 
            issue.description && 
            issue.description.toLowerCase().includes('bathroom fan')
        );
        
        // Update AC Filter task card
        updateMaintenanceTaskCard(acFilterCard, acFilterIssues, 3); // 3 months interval
        
        // Update Fan task card
        updateMaintenanceTaskCard(bathroomFanCard, fanIssues, 3); // 3 months interval
        
    } catch (error) {
        console.error('Error updating maintenance tasks:', error);
    }
}

// Update a specific maintenance task card
function updateMaintenanceTaskCard(cardElement, issues, monthsInterval) {
    try {
        // Get the elements
        const statusElement = cardElement.querySelector('.maintenance-status');
        const nextDueElement = cardElement.querySelector('.maintenance-date');
        
        // If elements aren't found, silently exit without warning
        if (!statusElement || !nextDueElement) {
            // The warnings have been removed to keep the console clean
            return;
        }
        
        if (issues.length > 0) {
            // Sort by date descending to get the most recent
            issues.sort((a, b) => {
                const dateA = a.createdAt?.seconds ? new Date(a.createdAt.seconds * 1000) : new Date(a.dateCreated || 0);
                const dateB = b.createdAt?.seconds ? new Date(b.createdAt.seconds * 1000) : new Date(b.dateCreated || 0);
                return dateB - dateA;
            });
            
            const latestIssue = issues[0];
            const status = latestIssue.status || 'Not Started';
            
            // Update status
            statusElement.textContent = status;
            statusElement.className = 'maintenance-status';
            statusElement.classList.add(status.toLowerCase().replace(/\s+/g, '-'));
            
            // Update next due date
            const createdDate = latestIssue.createdAt?.seconds ? 
                new Date(latestIssue.createdAt.seconds * 1000) : 
                new Date(latestIssue.dateCreated || Date.now());
                
            const nextDueDate = new Date(createdDate);
            nextDueDate.setMonth(nextDueDate.getMonth() + monthsInterval);
            
            nextDueElement.textContent = `Next due: ${formatDate(nextDueDate)}`;
        } else {
            // No tasks found
            statusElement.textContent = 'Not Started';
            statusElement.className = 'maintenance-status not-started';
            nextDueElement.textContent = 'Next due: As soon as possible';
        }
    } catch (error) {
        // Only log errors in verbose mode
        if (verboseLogging) {
            console.error('Error updating maintenance task card:', error);
        }
    }
}

// Display error message
function showError(message) {
    showNotification(message, 'error');
}

// Show notification
function showNotification(message, type = 'info') {
    const notificationContainer = document.getElementById('notificationContainer');
    
    if (!notificationContainer) {
        console.error('Notification container not found');
        return;
    }
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-message">${escapeHTML(message)}</span>
            <button class="close-btn">&times;</button>
        </div>
    `;
    
    // Add close button functionality
    const closeBtn = notification.querySelector('.close-btn');
    closeBtn.addEventListener('click', () => {
        notification.classList.add('fade-out');
        setTimeout(() => {
            notificationContainer.removeChild(notification);
        }, 300);
    });
    
    // Auto-close after 5 seconds for non-error notifications
    if (type !== 'error') {
        setTimeout(() => {
            if (notification.parentNode) {
                notification.classList.add('fade-out');
                setTimeout(() => {
                    if (notification.parentNode) {
                        notificationContainer.removeChild(notification);
                    }
                }, 300);
            }
        }, 5000);
    }
    
    notificationContainer.appendChild(notification);
}

// Escape HTML to prevent XSS
function escapeHTML(str) {
    if (!str || typeof str !== 'string') return '';
    
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Generate maintenance checklist
function generateMaintenanceChecklist(taskType) {
    showNotification(`Generating ${taskType === 'ac' ? 'AC Filter' : 'Bathroom Fan'} checklist...`, 'info');
    
    // Implement checklist generation logic here
    setTimeout(() => {
        showNotification('Checklist feature coming soon!', 'info');
    }, 1000);
}

// Flag to track if we've already warned about missing services
let warnedAboutMissingServices = false;
// Flag to prevent recursive loop between fetchIssues and filterAndDisplayIssues
let isCurrentlyFetchingIssues = false;
// Enable or disable verbose logging
const verboseLogging = false;

// Helper function for controlled logging
function logInfo(message, data) {
    if (verboseLogging) {
        if (data) {
            console.log(`[TRACKING] ${message}`, data);
        } else {
            console.log(`[TRACKING] ${message}`);
        }
    }
}

// Fetch issues from Firebase
async function fetchIssues() {
    try {
        // Exit early if already fetching to prevent infinite loop
        if (isCurrentlyFetchingIssues) {
            logInfo('Already fetching issues, skipping recursive call');
            return;
        }
        
        // Set flag to prevent recursive loops
        isCurrentlyFetchingIssues = true;
        
        showLoading();
        
        // Clear cached issues before fetching new ones
        cachedIssues = [];
        
        if (!currentBranchId) {
            logInfo('fetchIssues called without a selected branch. Clearing view.');
            cachedIssues = []; // Clear cache
            currentPage = 1; // Reset page
            const issuesList = document.getElementById('issuesList');
            const paginationContainer = document.getElementById('paginationContainer');
            if (issuesList) {
                issuesList.innerHTML = `
                    <div class="empty-state">
                        <h3>Select a Branch</h3>
                        <p>Please select a branch to view maintenance issues and tasks.</p>
                    </div>
                `;
            }
            if (paginationContainer) {
                paginationContainer.style.display = 'none';
                paginationContainer.innerHTML = ''; // Also clear its content
            }
            updateAllStatusSectionCounts(); // Update counts (likely to zero)
            hideLoading();
            return; // Stop execution
        }
        
        if (!window.firebaseService || typeof window.firebaseService.fetchIssues !== 'function') {
            // Silently use fallback without warnings
            
            // Check if the getIssues function is available instead (in case the API name is different)
            if (window.firebaseService && typeof window.firebaseService.getIssues === 'function') {
                try {
                    // Try to use getIssues with a filter for the current branch
                    const response = await window.firebaseService.getIssues({
                        branchId: currentBranchId
                    });
                    
                    // Check the structure of the response
                    logInfo('Response from getIssues:', response);
                    
                    // Extract issues from the response
                    let issues = [];
                    
                    // Handle different response formats
                    if (Array.isArray(response)) {
                        // If response is already an array
                        issues = response;
                    } else if (response && typeof response === 'object') {
                        // If the response contains an issues array
                        if (Array.isArray(response.issues)) {
                            issues = response.issues;
                        } else if (response.data && Array.isArray(response.data)) {
                            issues = response.data;
                        } else {
                            // Empty state, no warnings needed
                            issues = [];
                            
                            // Show empty state message in UI
                            const issuesList = document.getElementById('issuesList');
                            if (issuesList) {
                                issuesList.innerHTML = `
                                    <div class="empty-state">
                                        <h3>No Issues Found</h3>
                                        <p>There are no maintenance issues for this branch.</p>
                                    </div>
                                `;
                            }
                        }
                    } else {
                        // Empty response - no warning needed
                        issues = [];
                    }
                    
                    logInfo(`Fetched ${issues.length} issues for branch ${currentBranchId} using getIssues`);
                    
                    // If no issues found, make sure we display empty state
                    if (issues.length === 0) {
                        const issuesList = document.getElementById('issuesList');
                        if (issuesList) {
                            issuesList.innerHTML = `
                                <div class="empty-state">
                                    <h3>No Issues Found</h3>
                                    <p>There are no maintenance issues for this branch.</p>
                                </div>
                            `;
                        }
                    }
                    
                    cachedIssues = issues;
                } catch (error) {
                    // Log the error but continue without displaying warnings
                    if (verboseLogging) {
                        console.error("Error fetching issues using getIssues:", error);
                    }
                    cachedIssues = [];
                }
            } else {
                // No method available - use demo data without warning
                cachedIssues = createDemoIssues();
            }
        } else {
            try {
                // Get issues for the current branch
                const response = await window.firebaseService.fetchIssues(currentBranchId);
                let issues = [];

                // Check if the response is the expected array or an object containing the array
                if (Array.isArray(response)) {
                    issues = response;
                } else if (response && typeof response === 'object' && Array.isArray(response.issues)) {
                    // Handle responses like { issues: [...], ... }
                    issues = response.issues;
                } else if (response && typeof response === 'object' && Array.isArray(response.data)) {
                     // Handle responses like { data: [...] }
                     issues = response.data;
                } else if (response && typeof response === 'object'){
                    // Log the unexpected object structure if verbose logging is on
                    logInfo('fetchIssues received an unexpected object structure:', response);
                    // Treat as no issues if the array is not found
                    issues = []; 
                } else {
                     // Handle other unexpected response types
                     logInfo('fetchIssues received an unexpected response type:', response);
                     issues = [];
                }

                if (Array.isArray(issues)) {
                    logInfo(`Processed ${issues.length} issues for branch ${currentBranchId}`);
                    
                    // If no issues found, make sure we display empty state
                    if (issues.length === 0) {
                        const issuesList = document.getElementById('issuesList');
                        if (issuesList) {
                            issuesList.innerHTML = `
                                <div class="empty-state">
                                    <h3>No Issues Found</h3>
                                    <p>There are no maintenance issues for this branch.</p>
                                </div>
                            `;
                        }
                    }
                    
                    cachedIssues = issues;
                } else {
                    // This case should ideally not be reached due to checks above, but as a safeguard:
                    logInfo('Failed to extract a valid issues array from the response.');
                    cachedIssues = [];
                    
                    // Show empty state
                    const issuesList = document.getElementById('issuesList');
                    if (issuesList) {
                        issuesList.innerHTML = `
                            <div class="empty-state">
                                <h3>No Issues Found</h3>
                                <p>Could not retrieve issue data for this branch.</p>
                            </div>
                        `;
                    }
                }
            } catch (error) {
                // Log error but don't show warnings
                if (verboseLogging) {
                    console.error("Error calling fetchIssues:", error);
                }
                cachedIssues = [];
            }
        }
        
        // Ensure cachedIssues is always an array
        if (!Array.isArray(cachedIssues)) {
            // Silently reset without warnings
            cachedIssues = [];
        }
        
        try {
            await updateMaintenanceTaskStats();
        } catch (error) {
            // Only log in verbose mode
            if (verboseLogging) {
                console.error("Error updating maintenance task stats:", error);
            }
        }
        
        // Apply filters and display the issues
        filterAndDisplayIssues(); // Changed from displayIssues(cachedIssues)
        
    } catch (error) {
        // Only show critical errors to user
        console.error('Error fetching issues:', error);
        showError(`Failed to fetch issues: ${error.message}`);
        
        // Set cachedIssues to empty array to prevent errors
        cachedIssues = [];
        
        // Clear existing issues and show error state
        const issuesList = document.getElementById('issuesList');
        if (issuesList) {
            issuesList.innerHTML = `
                <div class="error-state">
                    <h3><i class="fas fa-exclamation-triangle"></i> Error Loading Issues</h3>
                    <p>Could not load issues. Please check your connection or ensure the branch is set up correctly.</p> 
                    <p style="font-size: 0.8em; color: #6c757d;">Details: ${escapeHTML(error.message)}</p>
                </div>
            `;
        }
        // Also hide pagination on error
        const paginationContainer = document.getElementById('paginationContainer');
        if (paginationContainer) {
            paginationContainer.style.display = 'none';
            paginationContainer.innerHTML = ''; // Also clear its content
        }
    } finally {
        hideLoading();
        // Reset the flag when done to allow future fetches
        isCurrentlyFetchingIssues = false;
    }
}

// Helper function to create demo issues
/*function createDemoIssues() {
    return [
        {
            id: 'demo-1',
            branchId: currentBranchId,
            roomNumber: '101',
            category: 'Plumbing',
            description: 'Sink is leaking in the bathroom',
            status: 'New',
            priority: 'medium',
            authorName: 'Demo User',
            createdAt: { seconds: Math.floor(Date.now() / 1000) - 86400 } // Yesterday
        },
        {
            id: 'demo-2',
            branchId: currentBranchId,
            roomNumber: '203',
            category: 'Electrical',
            description: 'Light fixture not working in the bedroom',
            status: 'In Progress',
            priority: 'low',
            authorName: 'Demo Manager',
            createdAt: { seconds: Math.floor(Date.now() / 1000) - 43200 } // 12 hours ago
        },
        {
            id: 'demo-3',
            branchId: currentBranchId,
            roomNumber: '305',
            category: 'Furniture',
            description: 'Broken chair in the living room\nNeed replacement ASAP',
            status: 'New',
            priority: 'critical',
            authorName: 'Demo Staff',
            createdAt: { seconds: Math.floor(Date.now() / 1000) - 7200 } // 2 hours ago
        }
    ];
}*/

// Show and hide loading spinner
function showLoading() {
    const loadingContainer = document.getElementById('loadingSpinner');
    if (loadingContainer) {
        loadingContainer.style.display = 'flex';
    }
}

function hideLoading() {
    const loadingContainer = document.getElementById('loadingSpinner');
    if (loadingContainer) {
        loadingContainer.style.display = 'none';
    }
}

// Update maintenance task stats
async function updateMaintenanceTaskStats() {
    try {
        // Skip if no branch is selected
        if (!currentBranchId) {
            return;
        }
        
        let tasks = [];
        
        if (window.firebaseService && typeof window.firebaseService.fetchMaintenanceTasks === 'function') {
            // Fetch maintenance tasks for this branch
            tasks = await window.firebaseService.fetchMaintenanceTasks(currentBranchId);
        } else {
            // Create default tasks without warnings
            tasks = [
                {
                    id: 'default-ac-filter',
                    type: 'ac-filter',
                    status: 'Due',
                    lastCompletedDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
                    dueDate: new Date(),
                    branchId: currentBranchId
                },
                {
                    id: 'default-bathroom-fan',
                    type: 'bathroom-fan',
                    status: 'Due',
                    lastCompletedDate: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000), // 120 days ago
                    dueDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago (overdue)
                    branchId: currentBranchId
                }
            ];
        }
        
        // Get the AC Filter and Bathroom Fan cards
        const acFilterCard = document.getElementById('acFilterCard');
        const bathroomFanCard = document.getElementById('bathroomFanCard');
        
        if (!acFilterCard || !bathroomFanCard) {
            // Silently exit without warnings when cards aren't found
            return;
        }
        
        // Find the specific maintenance tasks
        const acFilterTask = tasks.find(task => task.type === 'ac-filter');
        const bathroomFanTask = tasks.find(task => task.type === 'bathroom-fan');
        
        // Update the AC Filter card
        if (acFilterTask) {
            updateMaintenanceCard(acFilterCard, acFilterTask);
        } else {
            // If task doesn't exist yet, set a default state
            updateMaintenanceCard(acFilterCard, {
                type: 'ac-filter',
                status: 'Unknown',
                lastCompletedDate: null,
                dueDate: null
            });
        }
        
        // Update the Bathroom Fan card
        if (bathroomFanTask) {
            updateMaintenanceCard(bathroomFanCard, bathroomFanTask);
        } else {
            // If task doesn't exist yet, set a default state
            updateMaintenanceCard(bathroomFanCard, {
                type: 'bathroom-fan',
                status: 'Unknown',
                lastCompletedDate: null,
                dueDate: null
            });
        }
        
        logInfo('Maintenance task stats updated successfully');
    } catch (error) {
        // Only log in verbose mode
        if (verboseLogging) {
            console.error('Error updating maintenance task stats:', error);
        }
    }
}

// Update a maintenance card with task data
function updateMaintenanceCard(cardElement, taskData) {
    if (!cardElement || !taskData) return;
    
    // Get elements within the card
    const statusElement = cardElement.querySelector('.maintenance-status');
    const dateElement = cardElement.querySelector('.maintenance-date');
    const actionButton = cardElement.querySelector('.maintenance-action');
    
    if (!statusElement || !dateElement || !actionButton) {
        // Silently exit without warnings when elements are missing
        return;
    }
    
    // Determine status and styling
    let statusClass = 'unknown';
    // --- MODIFIED: Button HTML structure to match user request --- 
    const buttonHTML = `
      <span class="printer-wrapper">
        <span class="printer-container">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 92 75">
            <path stroke-width="5" stroke="currentColor" d="M12 37.5H80C85.2467 37.5 89.5 41.7533 89.5 47V69C89.5 70.933 87.933 72.5 86 72.5H6C4.067 72.5 2.5 70.933 2.5 69V47C2.5 41.7533 6.75329 37.5 12 37.5Z"></path>
            <mask fill="white" id="path-2-inside-1_30_7_${taskData.type || 'task'}"> <!-- Unique mask ID -->
              <path d="M12 12C12 5.37258 17.3726 0 24 0H57C70.2548 0 81 10.7452 81 24V29H12V12Z"></path>
            </mask>
            <path mask="url(#path-2-inside-1_30_7_${taskData.type || 'task'})" fill="currentColor" d="M7 12C7 2.61116 14.6112 -5 24 -5H57C73.0163 -5 86 7.98374 86 24H76C76 13.5066 67.4934 5 57 5H24C20.134 5 17 8.13401 17 12H7ZM81 29H12H81ZM7 29V12C7 2.61116 14.6112 -5 24 -5V5C20.134 5 17 8.13401 17 12V29H7ZM57 -5C73.0163 -5 86 7.98374 86 24V29H76V24C76 13.5066 67.4934 5 57 5V-5Z"></path>
            <circle fill="currentColor" r="3" cy="49" cx="78"></circle>
          </svg>
        </span>
        <span class="printer-page-wrapper">
          <span class="printer-page"></span>
        </span>
      </span>
      Print Checklist
    `;
    let dateText = 'No record';
    
    if (taskData.status === 'Completed') {
        statusClass = 'completed';
        // buttonText = 'Mark Due'; // Removed
        
        if (taskData.lastCompletedDate) {
            const completedDate = formatDate(taskData.lastCompletedDate);
            dateText = `Last completed: ${completedDate}`;
        }
    } else if (taskData.status === 'Due') {
        statusClass = 'due';
        
        if (taskData.dueDate) {
            const dueDate = formatDate(taskData.dueDate);
            dateText = `Due: ${dueDate}`;
        } else {
            dateText = 'Due now';
        }
    } else if (taskData.status === 'Overdue') {
        statusClass = 'overdue';
        
        if (taskData.dueDate) {
            const dueDate = formatDate(taskData.dueDate);
            dateText = `Overdue since: ${dueDate}`;
        } else {
            dateText = 'Overdue';
        }
    }
    
    // Update elements
    statusElement.textContent = taskData.status;
    statusElement.className = `maintenance-status ${statusClass}`;
    dateElement.textContent = dateText;
    // --- MODIFIED: Set innerHTML to the new structure --- 
    actionButton.innerHTML = buttonHTML;
    
    // --- MODIFIED: Remove 'button' class and add 'print-style-btn' --- 
    actionButton.classList.remove('button', 'action-btn'); // Remove previous classes
    actionButton.classList.add('print-style-btn'); // Add the new specific class
    actionButton.classList.add('maintenance-action'); // Keep this for identification
    
    // Store task ID on the button for action handling
    actionButton.dataset.taskId = taskData.id || '';
    actionButton.dataset.taskType = taskData.type;
    actionButton.dataset.currentStatus = taskData.status;
    
    // Clear existing event listeners
    const newActionButton = actionButton.cloneNode(true);
    actionButton.parentNode.replaceChild(newActionButton, actionButton);
    
    // Add event listener for task action
    newActionButton.addEventListener('click', handleMaintenanceAction);
}

// Handle maintenance task action button click
async function handleMaintenanceAction(event) {
    const button = event.currentTarget;
    // const taskId = button.dataset.taskId; // We don't need taskId for just printing
    const taskType = button.dataset.taskType;
    // const currentStatus = button.dataset.currentStatus; // Status change logic removed
    
    // Disable button to prevent double-clicks
    button.disabled = true;
    
    try {
        showLoading();
        
        if (!currentBranchId) {
            throw new Error("Cannot generate checklist: No branch selected.");
        }
        
        // Call the function to generate the PDF checklist
        await generateRoomChecklistPDF(currentBranchId, taskType);
        
    } catch (error) {
        console.error(`Error generating checklist for ${taskType}:`, error);
        showError(`Failed to generate checklist: ${error.message}`);
    } finally {
        hideLoading();
        button.disabled = false;
    }
}

// --- UPDATED Function for PDF Generation --- 
/**
 * Fetches branch layout, generates checklist HTML, and opens print view.
 * @param {string} branchId The ID of the current branch.
 * @param {string} taskType The type of task (e.g., 'ac-filter', 'bathroom-fan').
 */
async function generateRoomChecklistPDF(branchId, taskType) {
    console.log(`generateRoomChecklistPDF called for branch ${branchId}, task ${taskType}`);
    showNotification(`Generating checklist for ${formatMaintenanceType(taskType)}...`, 'info');

    try {
        // 1. Check if fetchBranchLayout exists
        if (!window.firebaseService || typeof window.firebaseService.fetchBranchLayout !== 'function') {
            throw new Error("Firebase service (fetchBranchLayout) is not available.");
        }

        // 2. Fetch layout data
        const layoutData = await window.firebaseService.fetchBranchLayout(branchId);

        // 3. Get branch name 
        let branchName = 'Unknown Branch';
        if (window.hotelBranchManager && typeof window.hotelBranchManager.getBranchData === 'function') {
            const branchData = window.hotelBranchManager.getBranchData();
            branchName = branchData?.name || 'Unknown Branch';
        }

        // 4. Create checklist HTML
        const checklistHTML = createRoomChecklistHTML(branchName, taskType, layoutData);
        
        // 5. Define title
        const checklistTitle = `${formatMaintenanceType(taskType)} Checklist - ${branchName}`;

        // 6. Open print view - Pass branchName
        openChecklistPrintView(checklistHTML, checklistTitle, branchName);
        
        showNotification('Checklist ready for printing.', 'success');

    } catch (pdfError) {
        console.error("Error during PDF generation process:", pdfError);
        showError(`Could not generate checklist: ${pdfError.message}`);
        // Ensure loading is hidden even if pdf generation fails
        hideLoading(); 
    }
}

// --- NEW Helper: Create Room Checklist HTML --- 
/**
 * Creates the HTML content for the room checklist PDF.
 * @param {string} branchName Name of the branch.
 * @param {string} taskType Type of the maintenance task.
 * @param {object} layoutData Object with floor numbers as keys and arrays of room numbers as values.
 * @returns {string} HTML string for the print view.
 */
function createRoomChecklistHTML(branchName, taskType, layoutData) {
    if (!layoutData || Object.keys(layoutData).length === 0) {
        return `<p>No room layout data found for branch ${escapeHTML(branchName)}.</p>`;
    }

    let html = '';

    // Sort floor keys: numerically first, then alphabetically
    const sortedFloorKeys = Object.keys(layoutData).sort((a, b) => {
        const numA = parseInt(a);
        const numB = parseInt(b);
        const isANum = !isNaN(numA);
        const isBNum = !isNaN(numB);

        if (isANum && isBNum) return numA - numB; // Both numeric
        if (isANum) return -1; // Numeric comes before non-numeric
        if (isBNum) return 1;  // Non-numeric comes after numeric
        return a.localeCompare(b); // Both non-numeric, sort alphabetically
    });

    sortedFloorKeys.forEach(floor => {
        const rooms = layoutData[floor];
        if (!Array.isArray(rooms) || rooms.length === 0) return; // Skip empty floors

        html += `<div class="checklist-floor">`;
        html += `<h3 class="floor-header">Floor ${escapeHTML(floor)}</h3>`;
        html += `<ul class="room-list">`;

        // Sort rooms within the floor (simple alphabetical/numerical sort)
        const sortedRooms = [...rooms].sort((a, b) => {
             const numA = parseInt(a);
             const numB = parseInt(b);
             if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
             return String(a).localeCompare(String(b));
        });

        sortedRooms.forEach(room => {
            // Using ☐ (U+2610 BALLOT BOX) character for checkbox
            // --- MODIFIED: Use a span for a custom checkbox --- 
            html += `<li class="room-item"><span class="checklist-box"></span> ${escapeHTML(room)}</li>`;
        });

        html += `</ul>`;
        html += `</div>`;
    });

    return html;
}

// --- NEW Helper: Open Checklist Print View --- 
/**
 * Opens the browser's print dialog for the generated checklist HTML.
 * @param {string} htmlContent The HTML string to print.
 * @param {string} title The title for the print document.
 * @param {string} branchName The name of the branch.
 */
function openChecklistPrintView(htmlContent, title, branchName) { // Added branchName parameter
    try {
        // Create a hidden iframe for printing
        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);

        const printDoc = iframe.contentWindow.document;
        
        const completeHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>${escapeHTML(title)}</title>
                <style>
                    /* Use root variables for easier theme adjustments */
                    :root {
                        --print-primary-color: #3498db; /* Secondary color from old styles */
                        --print-primary-light-bg: rgba(52, 152, 219, 0.1); /* Light blue tint */
                        --print-text-color: #2c3e50;
                        --print-border-color: #dcdde1;
                        --print-header-bg: #f8f9fa; /* Keep header slightly distinct */
                    }

                    @media print {
                        @page { size: A4; margin: 10mm; } /* Reduced margin */
                        body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    }
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        font-size: 9pt; 
                        line-height: 1.3; 
                        color: var(--print-text-color);
                        /* --- MODIFIED: Removed CSS Columns --- */
                        /* column-count: 4; */ 
                        /* column-gap: 15px; */ 
                        padding: 5px;
                    }
                    .print-header {
                        text-align: center;
                        /* --- MODIFIED: Removed column-span --- */
                        /* column-span: all; */
                        width: 100%; 
                        margin-bottom: 15px; 
                        padding: 8px; 
                        border-bottom: 1.5px solid var(--print-primary-color);
                        background-color: var(--print-header-bg);
                        border-radius: 6px 6px 0 0; /* Slightly smaller radius */
                    }
                    .print-header h2 {
                        margin: 0 0 4px 0; /* Adjusted margin */
                        color: var(--print-primary-color);
                        font-weight: 600; /* Match button font-weight */
                        background-color: var(--print-primary-light-bg);
                        border: 1px solid rgba(52, 152, 219, 0.2);
                        border-radius: 6px; /* Slightly smaller radius */
                        padding: 10px; /* Reduced padding */
                        /* --- REMOVED Explicit Width and Box Sizing --- */
                        /* width: calc(33.33% - 10px); */
                        /* box-sizing: border-box; */
                    }
                    .print-header p {
                        margin: 0;
                        font-size: 0.85em; /* Slightly smaller date */
                        color: #555;
                     }
                    .checklist-floor {
                        /* --- MODIFIED: Remove inline-block, let it flow in columns --- */
                        /* display: inline-block; */
                        /* width: 18%; */
                        /* margin: 0 1% 10px 1%; */
                        /* vertical-align: top; */
                        margin-bottom: 15px; /* Add back some bottom margin */
                        /* --- TEMPORARILY REMOVED Styling for Debugging --- */
                        /* background-color: var(--print-primary-light-bg); */
                        /* border: 1px solid rgba(52, 152, 219, 0.2); */
                        /* border-radius: 6px; */
                        /* padding: 10px; */
                        /* --- Ensure block doesn't break across columns/pages --- */
                        break-inside: avoid;
                        page-break-inside: avoid; 
                    }
                    .floor-header {
                        /* --- MODIFIED: Reduced font-size, padding, and bottom margin --- */
                        font-size: 0.9em; /* Reduced font size */
                        font-weight: 600;
                        margin: -10px -10px 6px -10px; /* Reduced bottom margin */
                        padding: 6px 10px; /* Reduced vertical padding */
                        border-bottom: 1px solid rgba(52, 152, 219, 0.3); 
                        color: var(--print-primary-color); 
                        background-color: rgba(52, 152, 219, 0.05); 
                        border-radius: 6px 6px 0 0; 
                    }
                    .room-list {
                        list-style: none;
                        padding: 0;
                        margin: 0;
                        /* --- Keep Grid Layout for Rooms --- */
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(60px, 1fr)); 
                        gap: 4px; 
                    }
                    /* --- NEW: Style for the custom checkbox --- */
                    .checklist-box {
                        display: inline-block;
                        width: 0.9em; /* Slightly smaller than font height */
                        height: 0.9em;
                        border: 1.5px solid var(--print-text-color);
                        border-radius: 3px;
                        margin-right: 0.4em;
                        vertical-align: middle; /* Align with text */
                        background-color: #fff; /* Ensure background is white */
                    }
                    .room-item {
                        /* --- MODIFIED: Add background, border, padding, and flex alignment --- */
                        background-color: var(--print-primary-light-bg);
                        border: 1px solid rgba(52, 152, 219, 0.2);
                        border-radius: 4px;
                        padding: 4px 8px; /* Adjust padding */
                        display: inline-flex; /* Use flex for alignment */
                        align-items: center; /* Center items vertically */
                        /* margin-bottom: 0; */ /* Handled by grid gap */
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        color: var(--print-text-color);
                        font-size: 11pt; /* Keep increased size */
                        font-weight: bold; /* Keep bold */
                        /* white-space: nowrap; */ /* No longer needed with flex */
                    }
                </style>
            </head>
            <body>
                 <!-- Updated Header Structure -->
                <div class="print-header">
                    <h2>${escapeHTML(title)}</h2>
                     <!-- Use branchName parameter -->
                    <p>Branch: ${escapeHTML(branchName)} | Date: ${new Date().toLocaleDateString('en-GB')}</p>
                 </div>
                <!-- End Updated Header Structure -->
                ${htmlContent}
            </body>
            </html>
        `;

        printDoc.open();
        printDoc.write(completeHtml);
        printDoc.close();

        // --- MODIFIED: Use only onload and ensure single print call --- 
        let printCalled = false; // Flag to ensure print is called only once

        iframe.onload = () => {
            if (printCalled) return; // Exit if print already called
            printCalled = true;

            try {
                iframe.contentWindow.focus(); // Focus iframe for some browsers
                iframe.contentWindow.print();
            } catch (printError) {
                 console.error("Error calling print() on iframe:", printError);
                 showError("Could not open print dialog. Please try again or check browser settings.");
    } finally {
                // Remove iframe after a delay to allow print dialog
                setTimeout(() => {
                    if (iframe.parentNode) {
                         document.body.removeChild(iframe);
                    }
                }, 500); // Increased delay slightly
            }
        };
        // --- REMOVED Fallback setTimeout that also called print() --- 

    } catch (error) {
        console.error('Error opening checklist print view:', error);
        showNotification('Failed to generate checklist for printing', 'error');
        // Clean up iframe if it exists
        const existingIframe = document.querySelector('iframe[style*="position: absolute"]');
        if(existingIframe) existingIframe.remove();
    }
}

// --- ADD BACK formatMaintenanceType function --- 
// Format maintenance type for display
function formatMaintenanceType(type) {
    if (type === 'ac-filter') return 'AC Filter Maintenance';
    if (type === 'bathroom-fan') return 'Bathroom Fan Maintenance';
    // Fallback for any other types
    return type.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// ... (rest of the functions like initializeFirebase, etc.) ...

// Initialize Firebase if not already initialized
async function initializeFirebase() {
    // Check if Firebase is already initialized
    if (firebase.apps.length === 0) {
        try {
            console.log("Firebase not initialized, initializing now...");
            
            // Try to get the config from window object (set by firebase-config.js)
            let firebaseConfig = null;
            
            // Check if we're in production (based on URL hostname)
            const isProduction = window.location.hostname === 'premierfix.uk';
            
            // Try to use the appropriate config
            if (isProduction && window.firebaseServiceProd) {
                console.log("Using production Firebase configuration");
                return await window.firebaseServiceProd.initialize();
            } else if (window.firebaseConfig) {
                // Use standard config
                console.log("Using standard Firebase configuration from window.firebaseConfig");
                firebaseConfig = window.firebaseConfig;
            } else {
                // Fallback configuration - should not be used in production
                console.warn("Using fallback Firebase configuration - this should NOT happen in production");
                firebaseConfig = {
                    apiKey: "AIzaSyAlF8cWyOtP_0K8BLsM1yl7fyEQactAEfE",
                    authDomain: "premierfix-v2.firebaseapp.com", 
                    projectId: "premierfix-v2",
                    storageBucket: "premierfix-v2.firebasestorage.app"
                };
            }
            
            // Initialize Firebase with retrieved config
            firebase.initializeApp(firebaseConfig);
            console.log("Firebase initialized successfully");
            
            // Detect Safari browser - for special initialization handling
            const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
            
            // Special handling for Safari - initialize Firestore with less aggressive settings
            if (isSafari || isIOS) {
                console.log("Safari detected, using special Firestore settings");
                const firestoreInstance = firebase.firestore();
                
                // Configure Firestore settings
                firestoreInstance.settings({
                    cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
                    merge: true
                });
                
                // Try to enable persistence with Safari-specific settings
                try {
                    await firestoreInstance.enablePersistence({
                        synchronizeTabs: false // Don't synchronize tabs on Safari to avoid issues
                    });
                    console.log("Safari persistence enabled");
                } catch (err) {
                    console.warn("Could not enable Safari persistence:", err);
                    // Continue without persistence
                }
            }
            
            return true;
        } catch (error) {
            console.error("Error initializing Firebase:", error);
            return false;
        }
    } else {
        console.log("Firebase already initialized");
        return true;
    }
}

// Show status updating spinner on button
function showStatusUpdatingSpinner(button) {
    if (!button) return;
    
    // Store original content for later restoration
    button.dataset.originalContent = button.innerHTML;
    button.innerHTML = '<span class="spinner-small"></span>';
    button.disabled = true;
}

// Hide status updating spinner
function hideStatusUpdatingSpinner(button) {
    if (!button || !button.dataset.originalContent) return;
    
    button.innerHTML = button.dataset.originalContent;
    button.disabled = false;
}

// Update issue status
async function updateIssueStatus(issueId, newStatus) {
    if (!issueId || !newStatus) {
        throw new Error('Issue ID and new status are required');
    }
    
    if (!window.firebaseService || typeof window.firebaseService.updateIssueStatus !== 'function') {
        throw new Error('Firebase service is not available');
    }
    
    await window.firebaseService.updateIssueStatus(issueId, newStatus);
    
    // Also update the issue in cached issues
    if (Array.isArray(cachedIssues)) {
        const issueIndex = cachedIssues.findIndex(issue => issue.id === issueId);
        if (issueIndex !== -1) {
            cachedIssues[issueIndex].status = newStatus;
        }
    }
}

// Notify status change
function notifyStatusChange(status) {
    showNotification(`Issue status updated to ${status}`, 'success');
}

// Notify error
function notifyError(message) {
    showNotification(message, 'error');
}

// Get action buttons based on issue status
function getActionButtonsMap(status) {
    const buttons = { top: '', bottom: '' };
    switch (status.toLowerCase()) {
        case 'new':
            buttons.top = `
                <button class="status-btn start-btn" data-status="In Progress">
                    <i class="fas fa-play-circle"></i><span class="button-text">In Progress</span>
                </button>
            `;
            buttons.bottom = `
                <button class="status-btn complete-btn" data-status="Completed">
                    <i class="fas fa-check-circle"></i><span class="button-text">Complete</span>
                </button>
            `;
            break;
        case 'in progress':
            buttons.bottom = `
                <button class="status-btn complete-btn" data-status="Completed">
                    <i class="fas fa-check-circle"></i><span class="button-text">Complete</span>
                </button>
            `;
            break;
        case 'completed':
            buttons.top = `
                <button class="status-btn reopen-btn" data-status="New">
                    <i class="fas fa-redo-alt"></i><span class="button-text">Reopen</span>
                </button>
            `;
            break;
        default:
             console.warn(`Unknown status in getActionButtonsMap: ${status}`);
             // Provide default buttons as a fallback
             buttons.top = `
                <button class="status-btn start-btn" data-status="In Progress">
                    <i class="fas fa-play-circle"></i><span class="button-text">In Progress</span>
                </button>
            `;
            buttons.bottom = `
                <button class="status-btn complete-btn" data-status="Completed">
                    <i class="fas fa-check-circle"></i><span class="button-text">Complete</span>
                </button>
            `;
    }
    return buttons;
}

// Function to handle card status change (previously moveCardToSection)
function moveCardToSection(card, newStatus) {
    try {
        if (!card) {
            console.error("Card element is null or undefined");
            return;
        }
        
        // Instead of moving the card to a different section,
        // we just update the card in place and wait for the next
        // filter/sort operation to re-order all cards
        
        // Update the card's status classes
        card.className = `issue-card status-${newStatus.toLowerCase().replace(/\s+/g, '-')} priority-${card.getAttribute('data-priority').toLowerCase()}`;
        card.setAttribute('data-status', newStatus);
        
        // Update the status badge within the card
        const statusBadge = card.querySelector('.issue-status');
        if (statusBadge) {
            statusBadge.textContent = newStatus;
            statusBadge.className = `issue-status ${newStatus.toLowerCase().replace(/\s+/g, '-')}`;
        }
        
        // Trigger a re-filtering to sort all cards
        // But use a small timeout to prevent infinite loops
        setTimeout(() => {
            filterAndDisplayIssues();
        }, 10);
        
    } catch (error) {
        console.error("Error moving card to section:", error);
    }
}

// Update status section count
function updateStatusSectionCount(section) {
    if (!section) return;
    
    const countElement = section.querySelector('.issue-count');
    const issuesContainer = section.querySelector('.issues-container');
    
    if (countElement && issuesContainer) {
        countElement.textContent = issuesContainer.children.length;
    }
}

// Update all status section counts
function updateAllStatusSectionCounts() {
    const statusSections = document.querySelectorAll('.status-section');
    statusSections.forEach(updateStatusSectionCount);
}

// Add CSS styles for issue cards and status sections
function addCardAndSectionStyles() {
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        /* Status Sections */
        .status-section {
            margin-bottom: 30px;
        }
        
        .status-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 2px solid var(--primary);
        }
        
        .status-header h3 {
            margin: 0;
            color: var(--primary);
            font-size: 1.2rem;
        }
        
        .issue-count {
            background-color: var(--primary);
            color: white;
            border-radius: 20px;
            padding: 2px 10px;
            font-size: 0.9rem;
            font-weight: 500;
        }
        
        .issues-container {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
        }
        
        /* Issue Cards */
        .issue-card {
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            overflow: hidden;
            transition: all 0.3s ease;
            border-left: 4px solid #ccc;
        }
        
        .issue-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.15);
        }
        
        /* Card status colors */
        .issue-card.status-new {
            border-left-color: #3498db;
        }
        
        .issue-card.status-in-progress {
            border-left-color: #f39c12;
        }
        
        .issue-card.status-completed {
            border-left-color: #27ae60;
        }
        
        /* Priority markers */
        .issue-card.priority-low {
            border-top: 2px solid #3498db;
        }
        
        .issue-card.priority-medium {
            border-top: 2px solid #f39c12;
        }
        
        .issue-card.priority-high,
        .issue-card.priority-critical {
            border-top: 2px solid #e74c3c;
        }
        
        .issue-header {
            padding: 15px;
            display: flex;
            justify-content: space-between;
            background-color: #f8f9fa;
            border-bottom: 1px solid #eee;
        }
        
        .issue-location {
            font-weight: 600;
        }
        
        .issue-date {
            font-size: 0.8rem;
            color: #6c757d;
        }
        
        .issue-content {
            padding: 15px;
        }
        
        .issue-category {
            display: inline-block;
            margin-bottom: 10px;
            font-size: 0.9rem;
            padding: 3px 8px;
            background-color: #eeeef5;
            border-radius: 4px;
            color: var(--primary);
        }
        
        .issue-description {
            margin-bottom: 15px;
            line-height: 1.5;
            color: #495057;
        }
        
        .issue-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 15px;
            background-color: #f8f9fa;
            border-top: 1px solid #eee;
        }
        
        .issue-meta {
            display: flex;
            gap: 10px;
        }
        
        .issue-priority, .issue-status {
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 0.8rem;
            text-transform: uppercase;
            font-weight: 600;
            letter-spacing: 0.5px;
        }
        
        .issue-priority.low {
            background-color: #d1ecf1;
            color: #0c5460;
        }
        
        .issue-priority.medium {
            background-color: #fff3cd;
            color: #856404;
        }
        
        .issue-priority.high, .issue-priority.critical {
            background-color: #f8d7da;
            color: #721c24;
        }
        
        .issue-status.new {
            background-color: #cfe2ff;
            color: #084298;
        }
        
        .issue-status.in-progress {
            background-color: #fff3cd;
            color: #856404;
        }
        
        .issue-status.completed {
            background-color: #d1e7dd;
            color: #0f5132;
        }
        
        .issue-actions {
            display: flex;
            gap: 5px;
        }
        
        .status-btn {
            padding: 5px 10px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.85rem;
            font-weight: 500;
            transition: all 0.3s;
        }
        
        .status-btn.in-progress {
            background-color: #f39c12;
            color: white;
        }
        
        .status-btn.completed {
            background-color: #27ae60;
            color: white;
        }
        
        .status-btn.new {
            background-color: #3498db;
            color: white;
        }
        
        .status-btn:hover {
            opacity: 0.9;
            transform: translateY(-2px);
        }
        
        /* Small spinner for buttons */
        .spinner-small {
            display: inline-block;
            width: 12px;
            height: 12px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            border-top-color: white;
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            to {
                transform: rotate(360deg);
            }
        }
        
        /* Empty state */
        .empty-state {
            background-color: #f8f9fa;
            padding: 30px;
            text-align: center;
            border-radius: 8px;
            margin: 20px 0;
        }
        
        .empty-state h3 {
            color: #6c757d;
            margin-bottom: 10px;
        }
        
        .empty-state p {
            color: #6c757d;
            margin-bottom: 20px;
        }
        
        /* Error state */
        .error-state {
            background-color: #f8d7da;
            padding: 30px;
            text-align: center;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #842029;
        }
        
        .error-state h3 {
            color: #842029;
            margin-bottom: 10px;
        }
        
        .error-state p {
            color: #842029;
            margin-bottom: 15px;
        }
        
        /* Pagination */
        .pagination {
            display: flex;
            justify-content: center;
            margin-top: 20px;
            margin-bottom: 30px;
        }
        
        .pagination-btn {
            padding: 8px 15px;
            margin: 0 5px;
            border: 1px solid #dee2e6;
            background-color: white;
            cursor: pointer;
            border-radius: 4px;
            transition: all 0.2s;
        }
        
        .pagination-btn:hover {
            background-color: #f8f9fa;
        }
        
        .pagination-btn.active {
            background-color: var(--primary);
            color: white;
            border-color: var(--primary);
        }
        
        .pagination-btn.disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        /* Responsive adjustments */
        @media (max-width: 768px) {
            .issues-container {
                grid-template-columns: 1fr;
            }
            
            .issue-card {
                margin-bottom: 15px;
            }
            
            .issue-header {
                flex-direction: column;
                gap: 5px;
            }
            
            .issue-footer {
                flex-direction: column;
                gap: 10px;
                align-items: flex-start;
            }
            
            .issue-actions {
                width: 100%;
                justify-content: flex-end;
            }
        }
    `;
    
    document.head.appendChild(styleElement);
}

// Initialize the page when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializePage();
    addPhotoViewerStyles();
    addCardAndSectionStyles();
});

// Export current branch issues to Excel/CSV
function exportToExcel() {
    try {
        if (!cachedIssues || cachedIssues.length === 0) {
            showNotification('No issues to export', 'warning');
            return;
        }

        const branchData = window.hotelBranchManager.getBranchData();
        if (!branchData) throw new Error('Branch data not available');

        const headers = [
            'Date Created',
            'Room/Location',
            'Category',
            'Description',
            'Priority',
            'Time Preference',
            'Status',
            'Author'
        ];

        const rows = cachedIssues.map(issue => [
            formatDate(issue.createdAt),
            issue.roomNumber ? `Room ${issue.roomNumber}` : issue.location,
            issue.category,
            issue.description,
            PRIORITY_LEVELS[issue.priority]?.label || 'Low',
            issue.timePreference?.type || 'Anytime',
            issue.status,
            issue.authorName
        ]);

        // Create CSV content
        const csvContent = [
            [`Branch: ${branchData.name}`],
            [`Address: ${branchData.address || 'N/A'}`],
            [''],
            headers,
            ...rows
        ].map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(',')).join('\n');

        // Create and trigger download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `issues_${branchData.name.toLowerCase().replace(/\s+/g, '_')}_${formatDate(new Date())}.csv`;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
        }, 100);
        
        showNotification('Issues exported successfully!', 'success');
    } catch (error) {
        console.error('Error exporting to Excel:', error);
        showNotification('Failed to export issues', 'error');
    }
}

// Open print view with formatted issues for printing
function openPrintView() {
    try {
        if (!cachedIssues || cachedIssues.length === 0) {
            showNotification('No issues to print', 'warning');
            return;
        }

        const branchData = window.hotelBranchManager.getBranchData();
        if (!branchData) throw new Error('Branch data not available');

        // Filter active issues for printing (New and In Progress)
        const relevantIssues = cachedIssues.filter(issue => 
            ['New', 'In Progress'].includes(issue.status)
        ).sort((a, b) => {
            // Define priority levels for sorting (higher number = higher priority)
            const priorityOrder = { critical: 2, medium: 1, low: 0 }; 
            const priorityA = priorityOrder[a.priority?.toLowerCase()] ?? 0;
            const priorityB = priorityOrder[b.priority?.toLowerCase()] ?? 0;

            // 1. Sort by Priority (Critical first)
            if (priorityA !== priorityB) {
                return priorityB - priorityA; // Higher priority number comes first
            }

            // 2. If priorities are the same, sort by Status (New first)
            if (a.status !== b.status) {
                return a.status === 'New' ? -1 : 1;
            }
            
            // 3. If priority and status are the same, sort by Date (newest first)
            const dateA = a.createdAt?.seconds ? new Date(a.createdAt.seconds * 1000) : new Date(a.createdAt || 0);
            const dateB = b.createdAt?.seconds ? new Date(b.createdAt.seconds * 1000) : new Date(b.createdAt || 0);
            return dateB - dateA; 
        });

        if (relevantIssues.length === 0) {
            showNotification('No active issues to print', 'warning');
            return;
        }

        // Create a hidden iframe for printing
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
        
        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Maintenance Tasks - ${branchData.name} - ${new Date().toLocaleDateString('en-GB')}</title>
                <!-- Include Font Awesome for icons -->
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
                <style>
                    @media print {
                        /* A5 size with larger margins for receipt format */
                        @page { size: A5; margin: 15mm 10mm; } /* Reduced top/bottom margin slightly */
                        body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    }
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        font-size: 10pt; /* Slightly reduced base font for density */
                        color: #333;
                        line-height: 1.3; 
                    }

                    /* Updated Header Styles */
                    .print-header {
                        text-align: left; /* Align text left */
                        margin-bottom: 6mm; /* Reduced margin below header */
                        padding: 8px; /* Add some padding */
                        border: 1px solid #ccc;
                        background-color: #f8f8f8; /* Light background */
                        border-radius: 4px;
                        page-break-after: avoid; /* Try to keep header with first group */
                    }
                    .header-title {
                        font-size: 14pt; /* Adjusted */
                        color: #511e58; 
                        margin: 0 0 6px 0; 
                        font-weight: bold;
                        border-bottom: 1px solid #ddd;
                        padding-bottom: 4px;
                    }
                    .header-info {
                        display: flex;
                        justify-content: space-between; /* Space out info items */
                        flex-wrap: wrap; /* Allow wrapping if needed */
                        gap: 8px; /* Gap between items */
                        font-size: 9pt; 
                        color: #555;
                    }
                    .header-info span {
                         display: inline-flex; /* Align icon and text */
                         align-items: center;
                         gap: 4px;
                         white-space: nowrap; /* Prevent wrapping within an item */
                    }
                    /* End Updated Header Styles */

                    .task-group {
                        margin-bottom: 6mm; /* Reduced */
                        page-break-before: auto; 
                    }

                    .task-group-header {
                        font-weight: bold;
                        font-size: 11pt; /* Adjusted */
                        padding: 3px 0; /* Reduced */
                        margin-bottom: 5px; /* Reduced */
                        border-bottom: 1px solid #511e58;
                        color: #511e58;
                        page-break-after: avoid; 
                    }
                    
                    .print-card {
                        border: 1px solid #ccc;
                        border-radius: 4px;
                        margin-bottom: 7px; /* Reduced margin between cards */
                        padding: 8px; /* Slightly reduced padding */
                        page-break-inside: avoid;
                        background-color: #fff;
                        border-left: 4px solid #ccc; 
                    }

                    .print-card.priority-low { border-left-color: #28a745; }
                    .print-card.priority-medium { border-left-color: #ffc107; }
                    .print-card.priority-critical { 
                        border-left-color: #dc3545; 
                        border-width: 1px 1px 1px 4px; 
                    }

                    .print-card-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 6px; 
                        padding-bottom: 4px; 
                        border-bottom: 1px dashed #eee;
                        font-size: 8pt; /* Adjusted */
                        gap: 8px; 
                    }
                    .print-card-location { font-weight: bold; font-size: 9pt; flex-shrink: 1; }
                    .print-card-priority { flex-shrink: 0; white-space: nowrap; }
                    .print-card-status { flex-shrink: 0; white-space: nowrap; }
                    .print-card-header i { margin-right: 3px; font-size: 0.9em; } /* Smaller icons */

                    .print-card-body {
                        display: flex;
                        gap: 8px;
                        margin-bottom: 6px; 
                    }
                    .print-card-details {
                        flex: 1 1 auto; 
                    }
                    .print-card-details p { margin: 0 0 3px 0; font-size: 9pt; /* Adjusted */ }
                    .print-description {
                        font-size: 8pt; /* Adjusted */
                        color: #444;
                        padding: 4px;
                        background: #f9f9f9;
                        border: 1px solid #eee;
                        border-radius: 3px;
                        max-height: 100px; 
                        overflow: hidden; 
                    }

                    .print-card-photo {
                        flex: 0 0 70px; /* Slightly smaller photo */
                        height: 70px; 
                        overflow: hidden;
                        border: 1px solid #eee;
                        border-radius: 4px;
                        background-color: #f0f0f0;
                    }
                    .print-card-photo img {
                        width: 100%;
                        height: 100%;
                        object-fit: cover;
                        display: block;
                    }

                    .print-card-footer {
                        display: flex;
                        justify-content: space-between;
                        flex-wrap: wrap; /* Allow footer items to wrap */
                        gap: 5px 10px; /* Row and column gap */
                        margin-top: 6px; 
                        font-size: 8pt; 
                        color: #666;
                        border-top: 1px dashed #eee;
                        padding-top: 4px; 
                    }
                    .print-card-footer span { white-space: nowrap; }

                </style>
            </head>
            <body>
                 <!-- Updated Header Structure -->
                <div class="print-header">
                    <div class="header-title">Maintenance Task List</div>
                    <div class="header-info">
                        <span><i class="fas fa-building"></i> Branch: ${escapeHTML(branchData.name)}</span>
                        <span><i class="far fa-calendar-alt"></i> Generated: ${new Date().toLocaleDateString('en-GB')}</span>
                        <span><i class="fas fa-tasks"></i> Active Tasks: ${relevantIssues.length}</span>
                    </div>
                </div>
                <!-- End Updated Header Structure -->

                <div class="task-group">
                    <div class="task-group-header">New Tasks (${relevantIssues.filter(i => i.status === 'New').length})</div>
                    ${relevantIssues
                        .filter(issue => issue.status === 'New')
                        .map(issue => createPrintTaskHTML(issue))
                        .join('') || '<p style="padding: 10px; color: #777; font-style: italic;">No new tasks</p>'}
                </div>
            </body>
            </html>
        `;

        // Write content to iframe and print
        iframe.contentWindow.document.open();
        iframe.contentWindow.document.write(printContent);
        iframe.contentWindow.document.close();

        // Wait for content to load before printing
        iframe.onload = () => {
            iframe.contentWindow.print();
            // Remove iframe after printing dialog is closed
            setTimeout(() => {
                document.body.removeChild(iframe);
            }, 100);
        };
    } catch (error) {
        console.error('Error opening print view:', error);
        showNotification('Failed to open print view', 'error');
    }
}

// Helper function to create HTML for printing tasks
function createPrintTaskHTML(issue) {
    const location = issue.location || `Room ${issue.roomNumber || 'N/A'}`;
    const timePreference = issue.timePreference?.type === 'anytime' ? 
        'Anytime' : 
        `${issue.timePreference?.type === 'before' ? 'Before' : 'After'} ${issue.timePreference?.datetime || 'N/A'}`;
    
    const date = issue.createdAt?.seconds ? 
        new Date(issue.createdAt.seconds * 1000).toLocaleDateString('en-GB') : 
        new Date(issue.createdAt || Date.now()).toLocaleDateString('en-GB');

    const priorityClass = issue.priority || 'low';
    const priorityLabel = PRIORITY_LEVELS[priorityClass]?.label || 'Low';
    const categoryLabel = issue.category || 'Other';
    const description = formatDescription(issue.description || ''); // Use helper for consistency
    const statusClass = (issue.status || 'New').toLowerCase().replace(' ', '-');

    return `
        <div class="print-card priority-${priorityClass} status-${statusClass}">
            <div class="print-card-header">
                <span class="print-card-location"><i class="fas fa-map-marker-alt"></i> ${escapeHTML(location)}</span>
                <span class="print-card-priority"><i class="fas ${getPriorityIcon(priorityClass)}"></i> ${escapeHTML(priorityLabel)}</span>
                <span class="print-card-status"><i class="fas ${getStatusIcon(statusClass)}"></i> ${escapeHTML(issue.status || 'New')}</span> 
            </div>
            <div class="print-card-body">
                <div class="print-card-details">
                    <p><strong>Category:</strong> ${escapeHTML(categoryLabel)}</p>
                    <p><strong>Description:</strong></p>
                    <div class="print-description">${description.replace(/\n/g, '<br>')}</div> 
                </div>
                ${issue.photoUrl ? `
                <div class="print-card-photo">
                    <img src="${issue.photoUrl}" alt="Photo Evidence">
                </div>
                ` : ''}
            </div>
            <div class="print-card-footer">
                <span><strong>Reported by:</strong> ${escapeHTML(issue.authorName || 'Anonymous')}</span>
                <span><strong>Date:</strong> ${date}</span>
                <span><strong>Time Pref:</strong> ${escapeHTML(timePreference)}</span>
            </div>
        </div>
    `;
}

// Helper function to get Font Awesome icon class for priority
function getPriorityIcon(priorityClass) {
    return { low: 'fa-thumbs-up', medium: 'fa-exclamation-circle', critical: 'fa-exclamation-triangle' }[priorityClass] || 'fa-info-circle';
}

// Helper function to get Font Awesome icon class for status
function getStatusIcon(statusClass) {
    return { new: 'fa-bell', 'in-progress': 'fa-spinner', completed: 'fa-check-circle' }[statusClass] || 'fa-question-circle';
}

// Delete all issues for the current branch
async function deleteAllTasks() {
    try {
        const branchId = currentBranchId;
        if (!branchId) {
            showNotification('No branch selected', 'error');
            return;
        }
        
        if (!cachedIssues || cachedIssues.length === 0) {
            showNotification('No issues to delete', 'warning');
            return;
        }
        
        // Show confirmation dialog
        if (!confirm(`Are you sure you want to delete ALL ${cachedIssues.length} issues for branch ${branchId}? This action cannot be undone.`)) {
            return;
        }
        
        // Confirm again for safety
        if (!confirm(`FINAL WARNING: You are about to delete ${cachedIssues.length} maintenance issues from branch ${branchId}. This action is permanent!`)) {
            return;
        }
        
        showLoading();
        
        // Call Firebase to delete all issues for this branch
        if (!window.firebaseService || !window.firebaseService.deleteAllIssues) {
            throw new Error('Firebase service not available');
        }
        
        // Pass the current branch ID to ensure we only delete issues for this branch
        await window.firebaseService.deleteAllIssues(branchId);
        
        // Clear cached issues and refresh the UI
        cachedIssues = [];
        displayIssues([]);
        
        // Update maintenance tasks 
        updateMaintenanceTasks();
        
        hideLoading();
        showNotification(`All issues for branch ${branchId} have been deleted successfully`, 'success');
    } catch (error) {
        hideLoading();
        console.error('Error deleting all issues:', error);
        showNotification('Failed to delete issues: ' + (error.message || 'Unknown error'), 'error');
    }
}

// Clear all filters
function clearFilters() {
    // Get filter elements
    const searchInput = document.getElementById('searchInput');
    const filterCategory = document.getElementById('filterCategory');
    const filterStatus = document.getElementById('filterStatus');
    const filterPriority = document.getElementById('filterPriority');
    const dateFrom = document.getElementById('dateFrom');
    const dateTo = document.getElementById('dateTo');
    
    // Reset all filters to default values
    if (searchInput) searchInput.value = '';
    if (filterCategory) filterCategory.value = '';
    if (filterStatus) filterStatus.value = '';
    if (filterPriority) filterPriority.value = '';
    if (dateFrom) dateFrom.value = '';
    if (dateTo) dateTo.value = '';
    
    // Update sort buttons to default (newest first)
    const sortButtons = document.querySelectorAll('#sortControlButtons .sort-btn');
    sortButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-sort') === 'desc') {
            btn.classList.add('active');
        }
    });
    sortDirection = 'desc';
    
    // Re-filter and display issues
    filterAndDisplayIssues();
    
    // Show notification
    showNotification('Filters have been cleared', 'success');
}

// Function to refresh the issues list
async function refreshIssuesList() {
    try {
        // Reset any cached data
        if (Array.isArray(cachedIssues)) {
            cachedIssues = [];
        }
        
        // Show loading indicator
        showLoading();
        
        // Set the refresh button to show a rotating animation
        const refreshBtn = document.getElementById('refreshListBtn');
        const refreshIcon = refreshBtn?.querySelector('i');
        
        if (refreshIcon) {
            refreshIcon.classList.add('fa-spin');
        }
        
        // Reset to page 1
        currentPage = 1;
        
        // Fetch fresh data
        await fetchIssues();
        
        // Apply filters and display
        await filterAndDisplayIssues();
        
        // Show a success notification
        showNotification('Issues list refreshed successfully', 'success');
        
        // Stop the spin animation
        if (refreshIcon) {
            refreshIcon.classList.remove('fa-spin');
        }
        
        // Hide loading indicator
        hideLoading();
    } catch (error) {
        console.error('Error refreshing issues list:', error);
        
        // Hide loading indicator
        hideLoading();
        
        // Stop the spin animation if there was an error
        const refreshIcon = document.getElementById('refreshListBtn')?.querySelector('i');
        if (refreshIcon) {
            refreshIcon.classList.remove('fa-spin');
        }
        
        // Show error notification
        showError('Error refreshing issues list. Please try again.');
    }
}
// Cache DOM elements and constants
const ELEMENTS = {
    issuesList: document.getElementById('issuesList'),
    paginationContainer: document.getElementById('paginationContainer'),
    searchInput: document.getElementById('searchInput'),
    filterCategory: document.getElementById('filterCategory'),
    filterStatus: document.getElementById('filterStatus'),
    filterPriority: document.getElementById('filterPriority'),
    dateFrom: document.getElementById('dateFrom'),
    dateTo: document.getElementById('dateTo'),
    sortControl: document.getElementById('sortControl'),
    sortControlButtons: document.getElementById('sortControlButtons'),
    clearFilters: document.getElementById('clearFilters'),
    exportCSV: document.getElementById('exportCSV'),
    printView: document.getElementById('printView'),
    container: document.querySelector('.container'),
    summaryContainer: document.createElement('div'),
    branchInfo: document.getElementById('branchInfo')
};

// Priority levels (must match form.js)
const PRIORITY_LEVELS = {
    low: { label: 'Low', color: '#28a745' },
    medium: { label: 'Medium', color: '#ffc107' },
    critical: { label: 'Critical', color: '#dc3545' }
};

// Global variables
let currentPage = 1;
const issuesPerPage = 10;
let cachedIssues = [];
let sortDirection = 'desc';
let currentBranchId = null;

// Scheduled maintenance tasks configuration
const SCHEDULED_TASKS = {
    AC_FILTER_CLEANING: {
        name: 'AC & Ventilation Maintenance',
        frequency: 'quarterly', // every 3 months
        description: 'Clean AC filters and bathroom fans in all rooms',
        checklistItems: [
            'Remove filter/fan carefully',
            'Clean with appropriate cleaning solution',
            'Let dry completely',
            'Check for damage',
            'Reinstall filter/fan',
            'Test operation'
        ],
        generateRooms: () => {
            // Get rooms from the current branch data
            const branchData = window.hotelBranchManager.getBranchData();
            if (!branchData || !branchData.rooms) {
                console.warn('No rooms found for current branch');
                return [];
            }
            
            // Return array of room numbers from the branch data
            return Object.keys(branchData.rooms);
        }
    }
};

// Add clear all tasks button to the DOM
const clearAllButton = document.createElement('button');
clearAllButton.className = 'clear-all-btn';
clearAllButton.textContent = 'Clear All Tasks';
clearAllButton.onclick = confirmClearAllTasks;

// Add the button after the filter section
const filterSection = document.querySelector('.filter-section');
if (filterSection) {
    filterSection.insertAdjacentElement('afterend', clearAllButton);
}

// Function to show confirmation dialog
function showConfirmDialog(message) {
    return new Promise((resolve) => {
        const dialog = document.createElement('div');
        dialog.className = 'confirm-dialog';
        dialog.innerHTML = `
            <div class="confirm-content">
                <p>${message}</p>
                <div class="confirm-buttons">
                    <button class="btn-cancel">Cancel</button>
                    <button class="btn-confirm">Yes, proceed</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        const confirmBtn = dialog.querySelector('.btn-confirm');
        const cancelBtn = dialog.querySelector('.btn-cancel');
        
        confirmBtn.onclick = () => {
            document.body.removeChild(dialog);
            resolve(true);
        };
        
        cancelBtn.onclick = () => {
            document.body.removeChild(dialog);
            resolve(false);
        };
    });
}

// Function to handle clearing all tasks
async function confirmClearAllTasks() {
    // First confirmation
    const firstConfirm = await showConfirmDialog('Are you sure you want to delete all tasks from the tracker?');
    if (!firstConfirm) return;
    
    // Second confirmation with warning
    const secondConfirm = await showConfirmDialog(`<span style="color: #e74c3c; font-weight: bold;">WARNING:</span> This action cannot be undone. All tasks will be permanently deleted. Do you want to proceed?`);
    if (!secondConfirm) return;

    try {
        // Show loading message
        const loadingMessage = document.createElement('div');
        loadingMessage.className = 'loading-message';
        loadingMessage.textContent = 'Deleting all tasks...';
        document.body.appendChild(loadingMessage);

        // Initialize Firebase first
        await window.firebaseService.initialize();

        // Delete all tasks
        await window.firebaseService.deleteAllIssues();

        // Remove loading message
        document.body.removeChild(loadingMessage);

        // Show success notification
        showNotification('All tasks have been deleted successfully.', 'success');

        // Refresh the page to show updated state
        await filterAndDisplayIssues();
    } catch (error) {
        console.error('Error deleting all tasks:', error);
        
        // Remove loading message if it exists
        const loadingMsg = document.querySelector('.loading-message');
        if (loadingMsg) {
            document.body.removeChild(loadingMsg);
        }

        // Show more specific error message
        if (error.message.includes('permissions')) {
            showError('Permission denied. Please try refreshing the page and try again.');
        } else {
            showError('Failed to delete tasks. Please try again or contact support.');
        }
    }
}

// Debounced search handler
const debounce = (fn, delay) => {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
};

const STATUS_PRIORITY = {
    'New': 0,
    'In Progress': 1,
    'Completed': 2
};

const STATUS_COLORS = {
    'New': '#e74c3c',
    'In Progress': '#f39c12',
    'Completed': '#27ae60'
};

// Function to check and generate scheduled maintenance tasks
function checkScheduledMaintenance() {
    const branchId = window.hotelBranchManager.getCurrentBranch();
    if (!branchId) {
        console.warn('No branch selected, skipping scheduled maintenance check');
        return;
    }
    
    const lastCheck = localStorage.getItem(`lastMaintenanceCheck_${branchId}`) || new Date(0).toISOString();
    const now = new Date();
    const lastCheckDate = new Date(lastCheck);
    
    // Only check once per day
    if (lastCheckDate.toDateString() === now.toDateString()) {
        return;
    }
    
    // Get existing scheduled tasks for this branch
    const scheduledIssues = JSON.parse(localStorage.getItem(`scheduledMaintenance_${branchId}`)) || [];
    
    // Check each scheduled task
    Object.entries(SCHEDULED_TASKS).forEach(([taskId, task]) => {
        const lastTaskDate = findLastTaskDate(taskId, branchId);
        if (isTaskDue(lastTaskDate, task.frequency)) {
            generateScheduledTask(taskId, task, branchId);
        }
    });
    
    localStorage.setItem(`lastMaintenanceCheck_${branchId}`, now.toISOString());
}

// Find the last date a task was performed for a specific branch
function findLastTaskDate(taskId, branchId) {
    const taskHistory = JSON.parse(localStorage.getItem(`taskHistory_${branchId}_${taskId}`)) || [];
    if (taskHistory.length === 0) {
        return new Date(0);
    }
    
    // Sort by date descending and get the most recent
    taskHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
    return new Date(taskHistory[0].date);
}

function isTaskDue(lastDate, frequency) {
    const now = new Date();
    const monthsDiff = (now.getFullYear() - lastDate.getFullYear()) * 12 + 
                      (now.getMonth() - lastDate.getMonth());
    
    switch (frequency) {
        case 'monthly':
            return monthsDiff >= 1;
        case 'quarterly':
            return monthsDiff >= 3;
        default:
            return false;
    }
}

// Function to show maintenance type selection dialog
function showMaintenanceTypeDialog() {
    return new Promise((resolve) => {
        // Create backdrop overlay
        const backdrop = document.createElement('div');
        backdrop.className = 'dialog-backdrop';
        
        const dialog = document.createElement('div');
        dialog.className = 'confirm-dialog maintenance-type-dialog';
        dialog.innerHTML = `
            <div class="confirm-content">
                <h3>Select Maintenance Type</h3>
                <div class="maintenance-type-buttons">
                    <button class="btn-maintenance-type" data-type="ac">AC Filter Cleaning</button>
                    <button class="btn-maintenance-type" data-type="fan">Bathroom Fan Maintenance</button>
                </div>
            </div>
        `;
        
        // Add styles for the dialog and backdrop
        const style = document.createElement('style');
        style.textContent = `
            .dialog-backdrop {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 9998;
            }
            
            .maintenance-type-dialog {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                z-index: 9999;
                min-width: 300px;
            }
            
            .maintenance-type-dialog h3 {
                margin: 0 0 20px 0;
                color: var(--text-color);
                font-size: 18px;
                text-align: center;
            }
            
            .maintenance-type-buttons {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            
            .btn-maintenance-type {
                padding: 12px 20px;
                border: none;
                border-radius: 6px;
                background: var(--secondary-color);
                color: white;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                transition: all 0.3s ease;
                width: 100%;
            }
            
            .btn-maintenance-type:hover {
                background: #2980b9;
                transform: translateY(-1px);
            }
            
            .btn-maintenance-type:active {
                transform: translateY(0);
            }
        `;
        document.head.appendChild(style);
        
        // Add backdrop and dialog to the body
        document.body.appendChild(backdrop);
        document.body.appendChild(dialog);
        
        // Handle button clicks
        const buttons = dialog.querySelectorAll('.btn-maintenance-type');
        buttons.forEach(btn => {
            btn.onclick = () => {
                document.body.removeChild(backdrop);
                document.body.removeChild(dialog);
                resolve(btn.dataset.type);
            };
        });
        
        // Close dialog when clicking backdrop
        backdrop.onclick = () => {
            document.body.removeChild(backdrop);
            document.body.removeChild(dialog);
            resolve(null); // Return null if dialog is dismissed
        };
    });
}

// Function to generate AC Filter or Bathroom Fan cleaning checklist PDF
async function generateMaintenanceChecklist(type) {
    const title = type === 'ac' ? 'AC Filter Cleaning' : 'Bathroom Fan Maintenance';
    
    const today = new Date();
    const checklistContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${title} Checklist - ${today.toLocaleDateString()}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
                
                body { 
                    font-family: 'Inter', sans-serif;
                    padding: 12px;
                    max-width: 1200px;
                    margin: 0 auto;
                    background: #f8fafc;
                }
                
                .header { 
                    text-align: center;
                    margin-bottom: 12px;
                    padding: 8px;
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                
                .header h1 {
                    color: #1e293b;
                    margin: 0;
                    font-size: 20px;
                    font-weight: 600;
                }
                
                .date-section {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 12px;
                    padding: 8px;
                    background: white;
                    border-radius: 8px;
                }

                .floor-section {
                    background: white;
                    padding: 8px;
                    border-radius: 12px;
                    margin-bottom: 10px;
                }

                .floor-header {
                    font-weight: 600;
                    color: #1e293b;
                    padding: 4px 6px;
                    background: #f1f5f9;
                    border-radius: 6px;
                    margin-bottom: 6px;
                    font-size: 12px;
                }

                .rooms-table {
                    width: 100%;
                    border-collapse: collapse;
                    table-layout: fixed;
                }

                .rooms-table tr {
                    line-height: 1;
                }

                .room-cell {
                    display: inline-flex;
                    align-items: center;
                    padding: 2px 3px;
                    border: 1px solid #e2e8f0;
                    width: 42px;
                    height: 18px;
                }

                .checkbox {
                    width: 11px;
                    height: 11px;
                    border: 1.5px solid #64748b;
                    border-radius: 3px;
                    margin-right: 3px;
                }

                .room-number {
                    font-size: 10px;
                    color: #334155;
                    font-weight: 500;
                }

                .signature-section {
                    margin-top: 12px;
                    padding: 8px;
                    background: white;
                    border-radius: 12px;
                }

                .signature-line {
                    display: flex;
                    justify-content: space-between;
                    gap: 12px;
                }

                .signature-box {
                    flex: 1;
                    text-align: center;
                }

                .signature-box hr {
                    margin-top: 20px;
                    border: none;
                    border-top: 1px solid #cbd5e1;
                }

                .signature-box p {
                    color: #64748b;
                    font-size: 10px;
                    margin-top: 4px;
                }

                @media print {
                    body {
                        background: white;
                        padding: 6px;
                    }

                    .header,
                    .date-section,
                    .floor-section,
                    .signature-section {
                        box-shadow: none;
                        margin-bottom: 8px;
                    }

                    .floor-section {
                        page-break-inside: avoid;
                    }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>${title} Checklist</h1>
            </div>
            
            <div class="date-section">
                <div>
                    <strong>Date:</strong> ${today.toLocaleDateString('en-GB')}
                </div>
                <div style="display: flex; gap: 20px;">
                    <div>
                        <strong>Staff Name:</strong> _________________
                    </div>
                    <div>
                        <strong>Branch Name:</strong> _________________
                    </div>
                </div>
            </div>

            <div class="floor-section">
                <div class="floor-header">Ground Floor (01-18)</div>
                <table class="rooms-table">
                    <tr>
                        ${Array.from({length: 18}, (_, i) => i + 1)
                            .filter(num => num !== 13)
                            .map(num => `
                                <td class="room-cell">
                                    <span class="checkbox"></span>
                                    <span class="room-number">${String(num).padStart(2, '0')}</span>
                                </td>
                            `).join('')}
                    </tr>
                </table>
            </div>

            <div class="floor-section">
                <div class="floor-header">First Floor (101-121)</div>
                <table class="rooms-table">
                    <tr>
                        ${Array.from({length: 21}, (_, i) => i + 101)
                            .filter(num => num !== 113)
                            .map(num => `
                                <td class="room-cell">
                                    <span class="checkbox"></span>
                                    <span class="room-number">${num}</span>
                                </td>
                            `).join('')}
                    </tr>
                </table>
            </div>

            <div class="floor-section">
                <div class="floor-header">Second Floor (201-227)</div>
                <table class="rooms-table">
                    <tr>
                        ${Array.from({length: 27}, (_, i) => i + 201)
                            .filter(num => num !== 213)
                            .map(num => `
                                <td class="room-cell">
                                    <span class="checkbox"></span>
                                    <span class="room-number">${num}</span>
                                </td>
                            `).join('')}
                    </tr>
                </table>
            </div>

            <div class="floor-section">
                <div class="floor-header">Third Floor (301-330)</div>
                <table class="rooms-table">
                    <tr>
                        ${Array.from({length: 30}, (_, i) => i + 301)
                            .filter(num => num !== 313)
                            .map(num => `
                                <td class="room-cell">
                                    <span class="checkbox"></span>
                                    <span class="room-number">${num}</span>
                                </td>
                            `).join('')}
                    </tr>
                </table>
            </div>

            <div class="floor-section">
                <div class="floor-header">Fourth Floor (401-430)</div>
                <table class="rooms-table">
                    <tr>
                        ${Array.from({length: 30}, (_, i) => i + 401)
                            .filter(num => num !== 413)
                            .map(num => `
                                <td class="room-cell">
                                    <span class="checkbox"></span>
                                    <span class="room-number">${num}</span>
                                </td>
                            `).join('')}
                    </tr>
                </table>
            </div>

            <div class="floor-section">
                <div class="floor-header">Fifth Floor (501-511)</div>
                <table class="rooms-table">
                    <tr>
                        ${Array.from({length: 11}, (_, i) => i + 501)
                            .map(num => `
                                <td class="room-cell">
                                    <span class="checkbox"></span>
                                    <span class="room-number">${num}</span>
                                </td>
                            `).join('')}
                    </tr>
                </table>
            </div>

            <div class="floor-section">
                <div class="floor-header">Sixth Floor (601-612)</div>
                <table class="rooms-table">
                    <tr>
                        ${Array.from({length: 12}, (_, i) => i + 601)
                            .map(num => `
                                <td class="room-cell">
                                    <span class="checkbox"></span>
                                    <span class="room-number">${num}</span>
                                </td>
                            `).join('')}
                    </tr>
                </table>
            </div>

            <div class="floor-section">
                <div class="floor-header">Seventh Floor (701-712)</div>
                <table class="rooms-table">
                    <tr>
                        ${Array.from({length: 12}, (_, i) => i + 701)
                            .map(num => `
                                <td class="room-cell">
                                    <span class="checkbox"></span>
                                    <span class="room-number">${num}</span>
                                </td>
                            `).join('')}
                    </tr>
                </table>
            </div>

            <div class="signature-section">
                <div class="signature-line">
                    <div class="signature-box">
                        <hr>
                        <p>Maintenance Staff</p>
                    </div>
                    <div class="signature-box">
                        <hr>
                        <p>Supervisor</p>
                    </div>
                    <div class="signature-box">
                        <hr>
                        <p>Date</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(checklistContent);
    printWindow.document.close();
    printWindow.print();
}

// Generate a scheduled maintenance task for a specific branch
function generateScheduledTask(taskId, task, branchId) {
    // Create a task specific to this branch
    const scheduledTask = {
        id: `${taskId}_${Date.now()}`,
        branchId: branchId,
        name: task.name,
        description: task.description,
        rooms: task.generateRooms(),
        checklistItems: task.checklistItems,
        dateCreated: new Date().toISOString(),
        status: 'Pending'
    };
    
    // Store in localStorage for this branch
    const scheduledTasks = JSON.parse(localStorage.getItem(`scheduledMaintenance_${branchId}`)) || [];
    scheduledTasks.push(scheduledTask);
    localStorage.setItem(`scheduledMaintenance_${branchId}`, JSON.stringify(scheduledTasks));
    
    // Update UI
    updateScheduledTasksUI();
}

// Add retry logic for initialization
let initRetryCount = 0;
const maxInitRetries = 3;

async function initializePage() {
    try {
        console.log("Starting page initialization...");
        
        // Initialize Firebase with retry logic
        while (initRetryCount < maxInitRetries) {
            try {
                await window.firebaseService.initialize();
                console.log("Firebase initialization complete");
                break;
            } catch (error) {
                console.warn(`Firebase initialization attempt ${initRetryCount + 1} failed:`, error);
                initRetryCount++;
                if (initRetryCount === maxInitRetries) {
                    throw new Error("Failed to initialize Firebase after multiple attempts");
                }
                await new Promise(resolve => setTimeout(resolve, 1000 * initRetryCount));
            }
        }
        
        // Initialize branch manager
        await window.hotelBranchManager.initialize();
        console.log("Branch manager initialization complete");
        
        // Check if branch is selected
        currentBranchId = window.hotelBranchManager.getCurrentBranch();
        if (!currentBranchId) {
            // Show branch selector
            window.branchSelector.showBranchSelector();
            return;
        }
        
        // Update branch info
        updateBranchInfo();
        
        // Check for scheduled maintenance tasks
        checkScheduledMaintenance();
        
        // Update scheduled tasks UI
        updateScheduledTasksUI();
        
        // Set up event listeners
        setupEventListeners();
        
        // Initial data load
        await loadInitialData();
        
        console.log("Page initialization complete");
        
        // Clear console after a small delay to ensure all logs are shown
        setTimeout(() => {
            console.clear();
            console.log("✨ PremierFix Tracker Ready!");
        }, 1000);
    } catch (error) {
        console.error('Error initializing page:', error);
        showError('Failed to initialize page. Please refresh and try again.');
    }
}

async function loadInitialData() {
    try {
        // Add priority filter
        const filterPriorityHTML = `
            <div class="filter-group">
                <label for="filterPriority">Priority</label>
                <select id="filterPriority">
                    <option value="">All</option>
                    ${Object.entries(PRIORITY_LEVELS).map(([value, { label }]) => `
                        <option value="${value}">${label}</option>
                    `).join('')}
                </select>
            </div>
        `;
        
        const filterContainer = document.querySelector('.filter-section');
        filterContainer.insertAdjacentHTML('beforeend', filterPriorityHTML);
        
        // Initialize filter elements
        ELEMENTS.filterPriority = document.getElementById('filterPriority');
        
        // Load and display issues
        await filterAndDisplayIssues();
    } catch (error) {
        console.error('Error loading initial data:', error);
        showError('Failed to load issues');
    }
}

function setupEventListeners() {
    // Debounce search input
    ELEMENTS.searchInput.addEventListener('input', debounce(() => filterAndDisplayIssues(), 300));
    
    // Add change listeners to filters
    ELEMENTS.filterCategory.addEventListener('change', () => filterAndDisplayIssues());
    ELEMENTS.filterStatus.addEventListener('change', () => filterAndDisplayIssues());
    ELEMENTS.dateFrom.addEventListener('change', () => filterAndDisplayIssues());
    ELEMENTS.dateTo.addEventListener('change', () => filterAndDisplayIssues());
    
    // Sort control
    ELEMENTS.sortControlButtons.addEventListener('click', toggleSort);
    
    // Clear filters
    ELEMENTS.clearFilters.addEventListener('click', clearFilters);
    
    // Export buttons
    ELEMENTS.exportCSV.addEventListener('click', exportToCSV);
    ELEMENTS.printView.addEventListener('click', openPrintView);
    
    // Add online/offline handlers
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);
}

function handleOnlineStatus() {
    if (navigator.onLine) {
        console.log('Back online, refreshing data...');
        filterAndDisplayIssues();
    } else {
        console.log('Offline, using cached data...');
        showNotification('You are offline. Some features may be limited.', 'warning');
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background-color: ${type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : '#3498db'};
        color: white;
        padding: 1rem 2rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 1000;
        text-align: center;
        min-width: 300px;
        max-width: 80%;
        opacity: 0;
        transition: opacity 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Force a reflow to ensure the initial state is applied
    notification.offsetHeight;
    
    // Fade in
    requestAnimationFrame(() => {
        notification.style.opacity = '1';
    });
    
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

async function displayIssues(issues) {
    if (!safeGetElement(ELEMENTS.issuesList)) return;
    
    ELEMENTS.issuesList.innerHTML = '';
    
    if (issues.length === 0) {
        ELEMENTS.issuesList.innerHTML = `
            <div class="empty-state">
                <h3>No issues found</h3>
                <p>There are no maintenance issues matching your search criteria.</p>
            </div>
        `;
        if (safeGetElement(ELEMENTS.paginationContainer)) {
            ELEMENTS.paginationContainer.innerHTML = '';
        }
        return;
    }

    // Calculate pagination
    const startIndex = (currentPage - 1) * issuesPerPage;
    const endIndex = startIndex + issuesPerPage;
    const totalPages = Math.ceil(issues.length / issuesPerPage);
    const paginatedIssues = issues.slice(startIndex, endIndex);

    // Create document fragment for better performance
    const fragment = document.createDocumentFragment();
    let currentStatus = null;

    // Add issues to fragment
    paginatedIssues.forEach((issue, index) => {
        // Add status separator if status changes
        if (issue.status !== currentStatus) {
            currentStatus = issue.status;
            fragment.appendChild(createStatusSeparator(currentStatus));
        }
        fragment.appendChild(createIssueCard(issue, index));
    });

    // Append fragment to DOM
    ELEMENTS.issuesList.appendChild(fragment);

    // Update pagination
    renderPagination(currentPage, totalPages);
}

async function filterAndDisplayIssues() {
    try {
        const filters = {
            branchId: currentBranchId,
            search: ELEMENTS.searchInput.value.trim(),
            category: ELEMENTS.filterCategory.value,
            status: ELEMENTS.filterStatus.value,
            priority: ELEMENTS.filterPriority.value,
            dateFrom: ELEMENTS.dateFrom.value,
            dateTo: ELEMENTS.dateTo.value
        };

        const issues = await window.firebaseService.getFilteredIssues(filters);
        cachedIssues = issues;

        // Sort issues
        if (sortDirection === 'asc') {
            cachedIssues.sort((a, b) => new Date(a.dateCreated) - new Date(b.dateCreated));
        } else {
            cachedIssues.sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated));
        }

        // Update display
        await displayIssues(cachedIssues);
        
        // Update summary
        updateSummary(cachedIssues);
    } catch (error) {
        console.error('Error filtering issues:', error);
        showError('Failed to filter issues');
    }
}

function toggleSort() {
    if (!safeGetElement(ELEMENTS.sortControl) || !safeGetElement(ELEMENTS.sortControlButtons)) return;
    
    sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    ELEMENTS.sortControl.value = sortDirection;
    
    const sortIcon = ELEMENTS.sortControlButtons.querySelector('.sort-icon');
    if (sortIcon) {
        sortIcon.textContent = sortDirection === 'asc' ? '↑' : '↓';
    }
    
    ELEMENTS.sortControlButtons.classList.toggle('asc', sortDirection === 'asc');
    filterAndDisplayIssues();
}

function clearFilters() {
    if (safeGetElement(ELEMENTS.searchInput)) ELEMENTS.searchInput.value = '';
    if (safeGetElement(ELEMENTS.filterCategory)) ELEMENTS.filterCategory.value = '';
    if (safeGetElement(ELEMENTS.filterStatus)) ELEMENTS.filterStatus.value = '';
    if (safeGetElement(ELEMENTS.dateFrom)) ELEMENTS.dateFrom.value = '';
    if (safeGetElement(ELEMENTS.dateTo)) ELEMENTS.dateTo.value = '';
    
    sortDirection = 'desc';
    
    if (safeGetElement(ELEMENTS.sortControl)) {
        ELEMENTS.sortControl.value = 'desc';
    }
    
    if (safeGetElement(ELEMENTS.sortControlButtons)) {
        const sortIcon = ELEMENTS.sortControlButtons.querySelector('.sort-icon');
        if (sortIcon) {
            sortIcon.textContent = '↓';
        }
        ELEMENTS.sortControlButtons.classList.remove('asc');
    }
    
    currentPage = 1;
    filterAndDisplayIssues();
}

function exportToCSV() {
    try {
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
            formatDate(issue.dateCreated),
            issue.roomNumber ? `Room ${issue.roomNumber}` : issue.location,
            issue.category,
            issue.description,
            PRIORITY_LEVELS[issue.priority]?.label || 'Low',
            formatTimePreference(issue.timePreference),
            issue.status,
            issue.authorName
        ]);

        // Create CSV content
        const csvContent = [
            [`Branch: ${branchData.name}`],
            [`Address: ${branchData.address}`],
            [''],
            headers,
            ...rows
        ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

        // Create and trigger download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `issues_${branchData.name.toLowerCase().replace(/\s+/g, '_')}_${formatDate(new Date())}.csv`;
        link.click();
    } catch (error) {
        console.error('Error exporting to CSV:', error);
        showError('Failed to export issues');
    }
}

function openPrintView() {
    const issues = cachedIssues || [];
    const relevantIssues = issues.filter(issue => 
        ['New', 'In Progress'].includes(issue.status)
    ).sort((a, b) => {
        // Sort by status (New first) then by date
        if (a.status !== b.status) {
            return a.status === 'New' ? -1 : 1;
        }
        return new Date(b.createdAt?.seconds * 1000 || b.dateCreated) - new Date(a.createdAt?.seconds * 1000 || a.dateCreated);
    });

    // Create a hidden iframe for printing
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    
    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Maintenance Task List - ${new Date().toLocaleDateString('en-GB')}</title>
            <style>
                @media print {
                    body {
                        font-family: Arial, sans-serif;
                        padding: 20px;
                        color: #000;
                    }

                    .header {
                        text-align: center;
                        margin-bottom: 20px;
                        padding: 15px;
                        border-bottom: 2px solid #000;
                    }

                    .header h1 {
                        margin: 0 0 10px 0;
                        font-size: 24px;
                    }

                    .task-group {
                        margin-bottom: 25px;
                        page-break-inside: avoid;
                    }

                    .task-group-header {
                        padding: 10px;
                        background: #f0f0f0;
                        font-weight: bold;
                        border-bottom: 1px solid #000;
                    }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Maintenance Task List</h1>
                <p>Generated: ${new Date().toLocaleDateString('en-GB')}</p>
                <p>Total Tasks: ${relevantIssues.length}</p>
            </div>

            <div class="task-group">
                <div class="task-group-header">New Tasks</div>
                ${relevantIssues
                    .filter(issue => issue.status === 'New')
                    .map(issue => createTaskHTML(issue))
                    .join('')}
            </div>

            <div class="task-group">
                <div class="task-group-header">In Progress Tasks</div>
                ${relevantIssues
                    .filter(issue => issue.status === 'In Progress')
                    .map(issue => createTaskHTML(issue))
                    .join('')}
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
}

function createTaskHTML(issue) {
    const location = issue.location || `Room ${issue.roomNumber}`;
    const timePreference = formatTimePreference(issue.timePreference);
    const date = issue.createdAt?.seconds ? 
        new Date(issue.createdAt.seconds * 1000).toLocaleDateString('en-GB') : 
        new Date(issue.dateCreated).toLocaleDateString('en-GB');

    return `
        <div class="task">
            <div class="task-header">
                <span class="task-title">${location} - ${issue.category}</span>
                <span class="status-badge ${issue.status.toLowerCase().replace(' ', '-')}">
                    ${issue.status}
                </span>
            </div>
            <div class="task-content">
                ${issue.description.split('\n').map(line => 
                    line.startsWith('•') ? 
                    `<div class="checklist-item">
                        <span class="checkbox"></span>
                        <span>${line.substring(2)}</span>
                    </div>` : 
                    `<p>${line}</p>`
                ).join('')}
            </div>
            <div class="task-footer">
                <div>
                    <strong>Reported by:</strong><br>
                    ${issue.authorName}
                </div>
                <div>
                    <strong>Date Created:</strong><br>
                    ${date}
                </div>
                <div>
                    <strong>Time Preference:</strong><br>
                    ${timePreference}
                </div>
            </div>
        </div>
    `;
}

function showError(message) {
    if (!safeGetElement(ELEMENTS.container)) return;
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    ELEMENTS.container.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

function createIssueCard(issue, index) {
    const location = issue.location || `Room ${issue.roomNumber}`;
    const timeInfo = formatTimePreference(issue.timePreference);
    const createdDate = formatDate(issue.createdAt || issue.dateCreated);
    const priority = PRIORITY_LEVELS[issue.priority] || PRIORITY_LEVELS.low;
    
    const card = document.createElement('div');
    card.className = `issue-card ${issue.status.toLowerCase().replace(' ', '-')}`;
    card.dataset.status = issue.status;
    card.dataset.id = issue.id;
    
    let statusButtons = '';
    if (issue.status === 'New') {
        statusButtons = `
            <button class="btn-status btn-progress" onclick="updateStatus('${issue.id}', 'In Progress')">
                Mark In Progress
            </button>
            <button class="btn-status btn-completed" onclick="updateStatus('${issue.id}', 'Completed')">
                Mark Completed
            </button>
        `;
    } else if (issue.status === 'In Progress') {
        statusButtons = `
            <button class="btn-status btn-completed" onclick="updateStatus('${issue.id}', 'Completed')">
                Mark Completed
            </button>
        `;
    }
    
    card.innerHTML = `
        <div class="issue-header">
            <h3>${location} - ${issue.category}</h3>
            <span class="status-indicator ${issue.status.toLowerCase().replace(' ', '-')}">
                ${issue.status}
            </span>
        </div>
        <div class="issue-content">
            <p>${issue.description}</p>
            <div class="issue-details">
                <div class="detail-item">
                    <span class="detail-label">Requested by:</span>
                    <span class="detail-value">${issue.authorName}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Date:</span>
                    <span class="detail-value">${createdDate}</span>
                </div>
                ${timeInfo ? `
                <div class="detail-item">
                    <span class="detail-label">Time preference:</span>
                    <span class="detail-value">${timeInfo}</span>
                </div>
                ` : ''}
            </div>
            <div class="action-buttons">
                ${statusButtons}
            </div>
        </div>
    `;
    
    return card;
}

function formatTimePreference(timePreference) {
    if (!timePreference || !timePreference.datetime) return 'Anytime';
    
    const dateTime = new Date(timePreference.datetime);
    const formattedDateTime = dateTime.toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
    });
    return `${timePreference.type === 'before' ? 'Before' : 'After'} ${formattedDateTime}`;
}

function formatDate(dateString) {
    try {
        let date;
        if (dateString?.seconds) {
            // Handle Firebase Timestamp
            date = new Date(dateString.seconds * 1000);
        } else if (dateString instanceof Date) {
            // Handle Date object
            date = dateString;
        } else {
            // Handle ISO string or other string format
            date = new Date(dateString);
        }

        if (isNaN(date.getTime())) {
            console.error('Invalid date:', dateString);
            return 'Invalid Date';
        }

        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'Invalid Date';
    }
}

function createStatusSeparator(status) {
    const separator = document.createElement('div');
    separator.className = 'status-separator';
    
    const text = document.createElement('span');
    text.className = 'status-separator-text';
    text.textContent = status;
    
    separator.appendChild(text);
    return separator;
}

function renderPagination(currentPage, totalPages) {
    ELEMENTS.paginationContainer.innerHTML = `
        <div class="pagination">
            <button class="pagination-btn" onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
                Previous
            </button>
            <span class="pagination-info">Page ${currentPage} of ${totalPages}</span>
            <button class="pagination-btn" onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
                Next
            </button>
        </div>
    `;
}

// Modern confetti animation function
function triggerConfetti() {
    const duration = 3000;
    const defaults = {
        startVelocity: 30,
        spread: 360,
        ticks: 60,
        zIndex: 10000,
        shapes: ['square', 'circle'],
        colors: ['#26ccff', '#a25afd', '#ff5e7e', '#88ff5a', '#fcff42', '#ffa62d', '#ff36ff']
    };

    function randomInRange(min, max) {
        return Math.random() * (max - min) + min;
    }

    // Launch confetti from multiple points
    const interval = setInterval(() => {
        const timeLeft = duration - Date.now();
        
        if (timeLeft <= 0) {
            return clearInterval(interval);
        }

        const particleCount = 50;

        // Left cannon
        confetti({
            ...defaults,
            particleCount: particleCount / 2,
            origin: { x: 0.2, y: 0.7 }
        });

        // Right cannon
        confetti({
            ...defaults,
            particleCount: particleCount / 2,
            origin: { x: 0.8, y: 0.7 }
        });

        // Center burst
        confetti({
            ...defaults,
            particleCount: particleCount,
            origin: { x: 0.5, y: 0.7 }
        });

    }, 250);

    // Final burst
    setTimeout(() => {
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { x: 0.5, y: 0.7 }
        });
    }, duration - 1000);
}

async function updateStatus(issueId, newStatus) {
    try {
        // Store current scroll position
        const scrollPosition = window.scrollY;

        // Update status buttons
        const statusButtons = document.querySelectorAll(`.issue-card[data-id="${issueId}"] .btn-status`);
        statusButtons.forEach(btn => {
            btn.disabled = true;
        });
        
        // Update status in Firebase
        await window.firebaseService.updateIssueStatus(issueId, newStatus);
        
        // Show success notification
        showNotification(`Issue status updated to ${newStatus}`, 'success');
        
        // Trigger confetti animation if status is Completed
        if (newStatus === 'Completed') {
            triggerConfetti();
        }
        
        // Update UI
        const issueCard = document.querySelector(`.issue-card[data-id="${issueId}"]`);
        if (issueCard) {
            issueCard.dataset.status = newStatus;
            
            // Update the status indicator text
            const statusIndicator = issueCard.querySelector('.status-indicator');
            if (statusIndicator) {
                statusIndicator.textContent = newStatus;
                statusIndicator.className = `status-indicator ${newStatus.toLowerCase().replace(' ', '-')}`;
            }
            
            // Update action buttons
            const actionButtons = issueCard.querySelector('.action-buttons');
            if (actionButtons) {
                if (newStatus === 'In Progress') {
                    actionButtons.innerHTML = `
                        <button class="btn-status btn-completed" onclick="updateStatus('${issueId}', 'Completed')">
                            Mark Completed
                        </button>
                    `;
                } else if (newStatus === 'Completed') {
                    actionButtons.innerHTML = '';
                }
            }
        }
        
        // Update summary without refreshing the whole list
        const result = await window.firebaseService.getIssues({});
        updateSummary(result.issues);
        
        // Re-enable buttons
        statusButtons.forEach(btn => {
            btn.disabled = false;
        });

        // Restore scroll position
        window.scrollTo(0, scrollPosition);
    } catch (error) {
        console.error('Error updating status:', error);
        showError('Failed to update status. Please try again.');
        
        // Re-enable buttons
        const statusButtons = document.querySelectorAll(`.issue-card[data-id="${issueId}"] .btn-status`);
        statusButtons.forEach(btn => {
            btn.disabled = false;
        });
    }
}

async function filterIssues() {
    try {
        console.log('Starting filterIssues...');
        
        const searchTerm = safeGetElement(ELEMENTS.searchInput) ? ELEMENTS.searchInput.value.toLowerCase() : '';
        const categoryFilter = safeGetElement(ELEMENTS.filterCategory) ? ELEMENTS.filterCategory.value : '';
        const statusFilter = safeGetElement(ELEMENTS.filterStatus) ? ELEMENTS.filterStatus.value : '';
        const dateFromFilter = safeGetElement(ELEMENTS.dateFrom) && ELEMENTS.dateFrom.value ? new Date(ELEMENTS.dateFrom.value) : null;
        const dateToFilter = safeGetElement(ELEMENTS.dateTo) && ELEMENTS.dateTo.value ? new Date(ELEMENTS.dateTo.value) : null;
        
        // Create filters object for Firebase
        const filters = {
            search: searchTerm,
            category: categoryFilter,
            status: statusFilter,
            sortBy: 'createdAt',
            sortDirection: sortDirection
        };
        
        if (dateFromFilter) {
            filters.dateFrom = dateFromFilter;
        }
        
        if (dateToFilter) {
            filters.dateTo = dateToFilter;
        }
        
        // Get issues from Firebase
        const result = await window.firebaseService.getIssues(filters);
        
        // Sort issues by status priority and date
        const sortedIssues = result.issues.sort((a, b) => {
            // First sort by status priority
            const statusDiff = STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status];
            if (statusDiff !== 0) return statusDiff;
            
            // If same status, sort by date based on sortDirection
            const dateA = a.createdAt ? new Date(a.createdAt.seconds * 1000) : new Date(a.dateCreated);
            const dateB = b.createdAt ? new Date(b.createdAt.seconds * 1000) : new Date(b.dateCreated);
            
            return sortDirection === 'desc' ? dateB - dateA : dateA - dateB;
        });
        
        return {
            issues: sortedIssues,
            total: sortedIssues.length
        };
    } catch (error) {
        console.error('Error filtering issues:', error);
        throw error;
    }
}

function changePage(newPage) {
    const totalPages = Math.ceil(cachedIssues.length / issuesPerPage);
    
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        filterAndDisplayIssues();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function updateSummary(issues) {
    // Ensure issues is an array
    const issuesArray = Array.isArray(issues) ? issues : [];
    
    try {
        const summary = {
            new: issuesArray.filter(issue => issue && issue.status === 'New').length,
            inProgress: issuesArray.filter(issue => issue && issue.status === 'In Progress').length,
            completed: issuesArray.filter(issue => issue && issue.status === 'Completed').length,
            total: issuesArray.length
        };
        
        console.log('Summary:', summary);
        
        if (safeGetElement(ELEMENTS.summaryContainer)) {
            ELEMENTS.summaryContainer.innerHTML = `
                <div class="summary-item new">
                    <div class="summary-label">New</div>
                    <div class="summary-value">${summary.new}</div>
                </div>
                <div class="summary-item in-progress">
                    <div class="summary-label">In Progress</div>
                    <div class="summary-value">${summary.inProgress}</div>
                </div>
                <div class="summary-item completed">
                    <div class="summary-label">Completed</div>
                    <div class="summary-value">${summary.completed}</div>
                </div>
                <div class="summary-item">
                    <div class="summary-label">Total</div>
                    <div class="summary-value">${summary.total}</div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error updating summary:', error);
        if (safeGetElement(ELEMENTS.summaryContainer)) {
            ELEMENTS.summaryContainer.innerHTML = `
                <div class="summary-item error">
                    <div class="summary-label">Error</div>
                    <div class="summary-value">Failed to load summary</div>
                </div>
            `;
        }
    }
}

async function updateTaskCards() {
    try {
        // Get task data from Firebase
        const filters = {
            category: 'Scheduled Maintenance'
        };
        
        const result = await window.firebaseService.getIssues(filters);
        const maintenanceTasks = result.issues || [];
        
        // Update AC Filter task
        updateACFilterTaskCard(maintenanceTasks);
        
        // Update Premises Inspection task
        updatePremisesTaskCard(maintenanceTasks);
    } catch (error) {
        console.error('Error updating task cards:', error);
        // Show error in task cards
        showTaskCardError('acFilterTask');
        showTaskCardError('premisesTask');
    }
}

// Function to update AC Filter task card
function updateACFilterTaskCard(tasks) {
    const acFilterTask = document.getElementById('acFilterTask');
    if (!acFilterTask) return;

    const acFilterStatus = acFilterTask.querySelector('.task-status');
    const acFilterNextDue = acFilterTask.querySelector('.next-due');
    
    // Update the task card HTML to include both maintenance types
    acFilterTask.innerHTML = `
        <h3>AC & Ventilation Maintenance</h3>
        <p>Quarterly maintenance task for all rooms</p>
        <div class="task-status"></div>
        <div class="next-due"></div>
        <div class="maintenance-buttons">
            <button onclick="generateMaintenanceChecklist('ac')" class="checklist-btn">AC Filter Checklist</button>
            <button onclick="generateMaintenanceChecklist('fan')" class="checklist-btn">Bathroom Fan Checklist</button>
        </div>
    `;

    // Add styles for the maintenance buttons
    const style = document.createElement('style');
    style.textContent = `
        .maintenance-buttons {
            display: flex;
            gap: 10px;
            margin-top: 10px;
        }
        .checklist-btn {
            flex: 1;
            padding: 8px;
            border: none;
            border-radius: 4px;
            background: var(--secondary-color);
            color: white;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s ease;
        }
        .checklist-btn:hover {
            background: #2980b9;
        }
    `;
    document.head.appendChild(style);
    
    const acFilterTasks = tasks.filter(task => task.scheduledTaskId === 'AC_FILTER_CLEANING');
    
    if (acFilterTasks.length > 0) {
        const latestTask = acFilterTasks.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
            const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
            return dateB - dateA;
        })[0];
        
        updateTaskCardStatus(acFilterStatus, latestTask.status);
        updateTaskCardNextDue(acFilterNextDue, latestTask.createdAt, 3);
    } else {
        updateTaskCardStatus(acFilterStatus, 'Not Started');
        acFilterNextDue.textContent = 'Next due: As soon as possible';
    }
}

// Helper function to update Premises Inspection task card
function updatePremisesTaskCard(tasks) {
    const premisesTask = document.getElementById('premisesTask');
    if (!premisesTask) return;

    const premisesStatus = premisesTask.querySelector('.task-status');
    const premisesNextDue = premisesTask.querySelector('.next-due');
    
    const premisesTasks = tasks.filter(task => task.scheduledTaskId === 'PREMISES_INSPECTION');
    
    if (premisesTasks.length > 0) {
        const latestTask = premisesTasks.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
            const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
            return dateB - dateA;
        })[0];
        
        updateTaskCardStatus(premisesStatus, latestTask.status);
        updateTaskCardNextDue(premisesNextDue, latestTask.createdAt, 1);
    } else {
        updateTaskCardStatus(premisesStatus, 'Not Started');
        premisesNextDue.textContent = 'Next due: As soon as possible';
    }
}

// Helper function to update task card status
function updateTaskCardStatus(statusElement, status) {
    if (!statusElement) return;
    statusElement.textContent = `Status: ${status}`;
    statusElement.className = `task-status ${status.toLowerCase().replace(' ', '-')}`;
}

// Helper function to update task card next due date
function updateTaskCardNextDue(dueElement, createdDate, monthsInterval) {
    if (!dueElement) return;
    const createdAt = createdDate ? new Date(createdDate) : new Date();
    const nextDueDate = new Date(createdAt);
    nextDueDate.setMonth(nextDueDate.getMonth() + monthsInterval);
    dueElement.textContent = `Next due: ${formatDate(nextDueDate)}`;
}

// Helper function to show error in task card
function showTaskCardError(cardId) {
    const taskCard = document.getElementById(cardId);
    if (!taskCard) return;

    const status = taskCard.querySelector('.task-status');
    const nextDue = taskCard.querySelector('.next-due');
    
    if (status) {
        status.textContent = 'Status: Error loading';
        status.className = 'task-status error';
    }
    
    if (nextDue) {
        nextDue.textContent = 'Unable to determine next due date';
    }
}

// Update branch info display
async function updateBranchInfo() {
    const branchData = window.hotelBranchManager.getBranchData();
    if (!branchData) return;

    ELEMENTS.branchInfo.innerHTML = `
        <div class="branch-info">
            <h2>${branchData.name}</h2>
            <p>${branchData.address}</p>
            <button id="switchBranch" class="btn-secondary">Switch Branch</button>
            <button id="auditRoom" class="btn-primary">Room Audit</button>
        </div>
    `;

    // Add event listeners
    document.getElementById('switchBranch').addEventListener('click', () => {
        window.branchSelector.showBranchSelector();
    });

    document.getElementById('auditRoom').addEventListener('click', () => {
        showRoomSelector();
    });
}

// Show room selector for audit
function showRoomSelector() {
    const branchData = window.hotelBranchManager.getBranchData();
    if (!branchData || !branchData.rooms) {
        showError('Room data not available');
        return;
    }

    const modalHTML = `
        <div id="roomSelectorModal" class="modal">
            <div class="modal-content">
                <h2>Select Room for Audit</h2>
                <div class="room-grid">
                    ${Object.entries(branchData.rooms)
                        .sort(([a], [b]) => parseInt(a) - parseInt(b))
                        .map(([roomNumber, room]) => `
                            <button class="room-btn ${room.available ? '' : 'unavailable'}" 
                                    data-room="${roomNumber}"
                                    ${!room.available ? 'disabled' : ''}>
                                ${roomNumber}
                            </button>
                        `).join('')}
                </div>
                <button class="close-btn">Close</button>
            </div>
        </div>
    `;

    const styles = `
        .room-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
            gap: 10px;
            margin: 20px 0;
            max-height: 60vh;
            overflow-y: auto;
        }

        .room-btn {
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            background: white;
            cursor: pointer;
            transition: all 0.2s;
        }

        .room-btn:hover:not(:disabled) {
            background: #007bff;
            color: white;
        }

        .room-btn.unavailable {
            background: #f8d7da;
            border-color: #f5c6cb;
            cursor: not-allowed;
        }
    `;

    // Add styles
    const styleElement = document.createElement('style');
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);

    // Add modal to document
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer);

    // Add event listeners
    const modal = document.getElementById('roomSelectorModal');
    const closeBtn = modal.querySelector('.close-btn');
    const roomButtons = modal.querySelectorAll('.room-btn:not(.unavailable)');

    closeBtn.addEventListener('click', () => {
        document.body.removeChild(modalContainer);
    });

    roomButtons.forEach(button => {
        button.addEventListener('click', () => {
            const roomNumber = button.dataset.room;
            document.body.removeChild(modalContainer);
            window.roomAuditUI.openAudit(roomNumber);
        });
    });

    modal.style.display = 'block';
}

// Update the UI to show scheduled tasks for the current branch
function updateScheduledTasksUI() {
    const branchId = window.hotelBranchManager.getCurrentBranch();
    if (!branchId) {
        console.warn('No branch selected, cannot display scheduled tasks');
        return;
    }
    
    // Get scheduled tasks for this branch
    const scheduledTasks = JSON.parse(localStorage.getItem(`scheduledMaintenance_${branchId}`)) || [];
    
    // Get the container
    const tasksContainer = document.querySelector('.scheduled-tasks');
    if (!tasksContainer) {
        console.warn('Scheduled tasks container not found');
        return;
    }
    
    // Clear existing content
    tasksContainer.innerHTML = '';
    
    if (scheduledTasks.length === 0) {
        // No tasks for this branch
        tasksContainer.innerHTML = `
            <div class="no-tasks">
                <p>No scheduled maintenance tasks for this branch.</p>
            </div>
        `;
        return;
    }
    
    // Add each task to the UI
    scheduledTasks.forEach(task => {
        const taskCard = document.createElement('div');
        taskCard.className = 'task-card';
        taskCard.id = task.id;
        
        taskCard.innerHTML = `
            <h3>${task.name}</h3>
            <p>${task.description}</p>
            <div class="task-status">${task.status}</div>
            <div class="next-due">Rooms: ${task.rooms.length}</div>
            <div class="maintenance-buttons">
                <button onclick="generateMaintenanceChecklist('${task.id}')" class="checklist-btn">Generate Checklist</button>
            </div>
        `;
        
        tasksContainer.appendChild(taskCard);
    });
}

// Generate a maintenance checklist for a specific task
function generateMaintenanceChecklist(taskId) {
    const branchId = window.hotelBranchManager.getCurrentBranch();
    if (!branchId) {
        showError('No branch selected');
        return;
    }
    
    // Get scheduled tasks for this branch
    const scheduledTasks = JSON.parse(localStorage.getItem(`scheduledMaintenance_${branchId}`)) || [];
    const task = scheduledTasks.find(t => t.id === taskId);
    
    if (!task) {
        // If taskId is not a specific task ID, use the default AC or fan checklist
        if (taskId === 'ac' || taskId === 'fan') {
            generateDefaultChecklist(taskId);
            return;
        }
        
        showError('Task not found');
        return;
    }
    
    // Generate PDF checklist
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Add header
    doc.setFontSize(20);
    doc.text(`${task.name} Checklist`, 20, 20);
    
    // Add branch info
    const branchData = window.hotelBranchManager.getBranchData();
    doc.setFontSize(12);
    doc.text(`Branch: ${branchData.name}`, 20, 30);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 37);
    
    // Add checklist items
    doc.setFontSize(14);
    doc.text('Checklist Items:', 20, 50);
    
    let y = 60;
    task.checklistItems.forEach((item, index) => {
        doc.text(`□ ${index + 1}. ${item}`, 25, y);
        y += 10;
    });
    
    // Add rooms
    y += 10;
    doc.setFontSize(14);
    doc.text('Rooms to Check:', 20, y);
    y += 10;
    
    // Create a grid of rooms
    const roomsPerRow = 10;
    const roomWidth = 18;
    const roomHeight = 10;
    
    task.rooms.forEach((room, index) => {
        const col = index % roomsPerRow;
        const row = Math.floor(index / roomsPerRow);
        const x = 20 + (col * roomWidth);
        const rowY = y + (row * roomHeight);
        
        // Start a new page if needed
        if (rowY > 280) {
            doc.addPage();
            y = 20;
            doc.text(`${task.name} Checklist (continued)`, 20, 10);
        } else {
            doc.text(`□ ${room}`, x, rowY);
        }
    });
    
    // Save the PDF
    doc.save(`${task.name.replace(/\s+/g, '_')}_Checklist.pdf`);
    
    // Show success message
    showNotification('Checklist generated successfully', 'success');
}

// Generate a default checklist for AC or fan maintenance
function generateDefaultChecklist(type) {
    const branchId = window.hotelBranchManager.getCurrentBranch();
    if (!branchId) {
        showError('No branch selected');
        return;
    }
    
    const branchData = window.hotelBranchManager.getBranchData();
    if (!branchData || !branchData.rooms) {
        showError('No rooms found for this branch');
        return;
    }
    
    const rooms = Object.keys(branchData.rooms);
    const title = type === 'ac' ? 'AC Filter Cleaning' : 'Bathroom Fan Maintenance';
    const checklistItems = [
        'Remove filter/fan carefully',
        'Clean with appropriate cleaning solution',
        'Let dry completely',
        'Check for damage',
        'Reinstall filter/fan',
        'Test operation'
    ];
    
    // Generate PDF checklist
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Add header
    doc.setFontSize(20);
    doc.text(`${title} Checklist`, 20, 20);
    
    // Add branch info
    doc.setFontSize(12);
    doc.text(`Branch: ${branchData.name}`, 20, 30);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 37);
    
    // Add checklist items
    doc.setFontSize(14);
    doc.text('Checklist Items:', 20, 50);
    
    let y = 60;
    checklistItems.forEach((item, index) => {
        doc.text(`□ ${index + 1}. ${item}`, 25, y);
        y += 10;
    });
    
    // Add rooms
    y += 10;
    doc.setFontSize(14);
    doc.text('Rooms to Check:', 20, y);
    y += 10;
    
    // Create a grid of rooms
    const roomsPerRow = 10;
    const roomWidth = 18;
    const roomHeight = 10;
    
    rooms.forEach((room, index) => {
        const col = index % roomsPerRow;
        const row = Math.floor(index / roomsPerRow);
        const x = 20 + (col * roomWidth);
        const rowY = y + (row * roomHeight);
        
        // Start a new page if needed
        if (rowY > 280) {
            doc.addPage();
            y = 20;
            doc.text(`${title} Checklist (continued)`, 20, 10);
        } else {
            doc.text(`□ ${room}`, x, rowY);
        }
    });
    
    // Save the PDF
    doc.save(`${title.replace(/\s+/g, '_')}_Checklist.pdf`);
    
    // Show success message
    showNotification('Checklist generated successfully', 'success');
}

// Initialize the page when the DOM is loaded
document.addEventListener('DOMContentLoaded', initializePage); 
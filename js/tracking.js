// Cache DOM elements and constants
const ELEMENTS = {
    issuesList: document.getElementById('issuesList'),
    paginationContainer: document.getElementById('paginationContainer'),
    searchInput: document.getElementById('searchInput'),
    filterCategory: document.getElementById('filterCategory'),
    filterStatus: document.getElementById('filterStatus'),
    dateFrom: document.getElementById('dateFrom'),
    dateTo: document.getElementById('dateTo'),
    sortControl: document.getElementById('sortControl'),
    sortControlButtons: document.getElementById('sortControlButtons'),
    clearFilters: document.getElementById('clearFilters'),
    exportCSV: document.getElementById('exportCSV'),
    printView: document.getElementById('printView'),
    container: document.querySelector('.container'),
    summaryContainer: document.createElement('div')
};

// Helper function to safely access DOM elements
function safeGetElement(element, fallbackAction = () => {}) {
    if (!element) {
        console.warn(`Element not found in the DOM`);
        fallbackAction();
        return null;
    }
    return element;
}

// Global variables
let currentPage = 1;
const issuesPerPage = 10;
let cachedIssues = [];
let sortDirection = 'desc';

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
            const rooms = [];
            // Ground floor (1-18, excluding 13)
            for (let i = 1; i <= 18; i++) {
                if (i !== 13) rooms.push(i.toString().padStart(2, '0'));
            }
            // First floor (101-121, excluding 113)
            for (let i = 101; i <= 121; i++) {
                if (i !== 113) rooms.push(i.toString());
            }
            // Second floor (201-227, excluding 213)
            for (let i = 201; i <= 227; i++) {
                if (i !== 213) rooms.push(i.toString());
            }
            // Third floor (301-330, excluding 313)
            for (let i = 301; i <= 330; i++) {
                if (i !== 313) rooms.push(i.toString());
            }
            // Fourth floor (401-430, excluding 413)
            for (let i = 401; i <= 430; i++) {
                if (i !== 413) rooms.push(i.toString());
            }
            // Fifth floor (501-511, excluding 513)
            for (let i = 501; i <= 511; i++) {
                rooms.push(i.toString());
            }
            // Sixth floor (601-612)
            for (let i = 601; i <= 612; i++) {
                rooms.push(i.toString());
            }
            // Seventh floor (701-712)
            for (let i = 701; i <= 712; i++) {
                rooms.push(i.toString());
            }
            return rooms;
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
    const lastCheck = localStorage.getItem('lastMaintenanceCheck') || new Date(0).toISOString();
    const now = new Date();
    const lastCheckDate = new Date(lastCheck);
    
    // Only check once per day
    if (lastCheckDate.toDateString() === now.toDateString()) {
        return;
    }
    
    // Get existing scheduled tasks
    const scheduledIssues = JSON.parse(localStorage.getItem('scheduledMaintenance')) || [];
    
    // Check each scheduled task
    Object.entries(SCHEDULED_TASKS).forEach(([taskId, task]) => {
        const lastTaskDate = findLastTaskDate(taskId);
        if (isTaskDue(lastTaskDate, task.frequency)) {
            generateScheduledTask(taskId, task);
        }
    });
    
    localStorage.setItem('lastMaintenanceCheck', now.toISOString());
}

function findLastTaskDate(taskId) {
    const issues = JSON.parse(localStorage.getItem('issues')) || [];
    const matchingIssues = issues.filter(issue => 
        issue.scheduledTaskId === taskId && 
        issue.status === 'Completed'
    );
    
    if (matchingIssues.length === 0) {
        return new Date(0);
    }
    
    return new Date(Math.max(...matchingIssues.map(issue => new Date(issue.dateCreated))));
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

// Modify the generateScheduledTask function to handle AC Filter cleaning differently
function generateScheduledTask(taskId, task) {
    if (taskId === 'AC_FILTER_CLEANING') {
        generateMaintenanceChecklist('ac');
        return;
    }

    // Create a new scheduled task
    const newTask = {
        id: 'task_' + Date.now(),
        description: task.name,
        location: 'All Buildings',
        roomNumber: 'All',
        category: 'Scheduled Maintenance',
        priority: 'Medium',
        authorName: 'System',
        authorEmail: 'system@example.com',
        authorPhone: '',
        status: 'New',
        createdAt: new Date(),
        updatedAt: new Date(),
        scheduledTaskId: taskId
    };

    // Add to Firebase
    window.firebaseService.saveIssue(newTask)
        .then(() => {
            showNotification(`${task.name} task created successfully`, 'success');
            
            // Update UI
            updateTaskCards();
            filterAndDisplayIssues();
        })
        .catch(error => {
            console.error('Error creating scheduled task:', error);
            showError('Failed to create scheduled task. Please try again.');
        });
}

// Initialize the page
async function initializePage() {
    try {
        console.log("Starting page initialization...");
        
        // Initialize Firebase without clearing data
        await window.firebaseService.initialize();
        console.log("Firebase initialization complete");

        // Set up event listeners
        if (safeGetElement(ELEMENTS.searchInput)) {
            ELEMENTS.searchInput.addEventListener('input', debounce(() => {
                currentPage = 1;
                filterAndDisplayIssues();
            }, 300));
        }
        
        if (safeGetElement(ELEMENTS.filterCategory)) {
            ELEMENTS.filterCategory.addEventListener('change', () => {
                currentPage = 1;
                filterAndDisplayIssues();
            });
        }
        
        if (safeGetElement(ELEMENTS.filterStatus)) {
            ELEMENTS.filterStatus.addEventListener('change', () => {
                currentPage = 1;
                filterAndDisplayIssues();
            });
        }
        
        if (safeGetElement(ELEMENTS.dateFrom)) {
            ELEMENTS.dateFrom.addEventListener('change', () => {
                currentPage = 1;
                filterAndDisplayIssues();
            });
        }
        
        if (safeGetElement(ELEMENTS.dateTo)) {
            ELEMENTS.dateTo.addEventListener('change', () => {
                currentPage = 1;
                filterAndDisplayIssues();
            });
        }
        
        if (safeGetElement(ELEMENTS.sortControlButtons)) {
            ELEMENTS.sortControlButtons.addEventListener('click', toggleSort);
        }
        
        if (safeGetElement(ELEMENTS.clearFilters)) {
            ELEMENTS.clearFilters.addEventListener('click', clearFilters);
        }
        
        if (safeGetElement(ELEMENTS.exportCSV)) {
            ELEMENTS.exportCSV.addEventListener('click', exportToCSV);
        }
        
        if (safeGetElement(ELEMENTS.printView)) {
            ELEMENTS.printView.addEventListener('click', openPrintView);
        }
        
        // Add summary container
        if (safeGetElement(ELEMENTS.container) && safeGetElement(ELEMENTS.issuesList)) {
            ELEMENTS.summaryContainer.className = 'issues-summary';
            ELEMENTS.container.insertBefore(ELEMENTS.summaryContainer, ELEMENTS.issuesList);
        }
        
        // Load issues and update UI
        await Promise.all([
            filterAndDisplayIssues(),
            updateTaskCards()
        ]);
        
        console.log("Page initialization complete");
        
        // Clear console after a small delay to ensure all logs are shown
        setTimeout(() => {
            console.clear();
            console.log("✨ PremierFix Issue Tracker Ready!");
        }, 1000);
    } catch (error) {
        console.error('Error initializing page:', error);
        showError('Failed to initialize page. Please refresh and try again.');
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
        console.log('Starting to fetch issues...');
        
        // Show loading state
        if (safeGetElement(ELEMENTS.issuesList)) {
            ELEMENTS.issuesList.innerHTML = '<div class="loading-message">Loading issues...</div>';
        }
        
        // Get filtered issues
        const result = await filterIssues();
        console.log('Received issues count:', result?.issues?.length || 0);
        
        // Ensure we have a valid result with an array of issues
        if (!result || typeof result !== 'object') {
            throw new Error('Invalid response from filterIssues');
        }
        
        // Convert issues to array if it's not already
        const filteredIssues = Array.isArray(result.issues) ? result.issues : 
                             (result.issues ? Object.values(result.issues) : []);
        
        // Log only relevant information about the filtered issues
        console.log('Processed issues:', {
            total: filteredIssues.length,
            new: filteredIssues.filter(i => i.status === 'New').length,
            inProgress: filteredIssues.filter(i => i.status === 'In Progress').length,
            completed: filteredIssues.filter(i => i.status === 'Completed').length
        });
        
        // Cache the filtered issues for pagination
        cachedIssues = filteredIssues;
        
        // Update summary with the array
        updateSummary(filteredIssues);
        
        // Apply pagination and display
        const totalPages = Math.ceil(filteredIssues.length / issuesPerPage);
        const startIndex = (currentPage - 1) * issuesPerPage;
        const endIndex = startIndex + issuesPerPage;
        const paginatedIssues = filteredIssues.slice(startIndex, endIndex);
        
        await displayIssues(paginatedIssues);
        renderPagination(currentPage, totalPages);
    } catch (error) {
        console.error('Error filtering and displaying issues:', error);
        if (safeGetElement(ELEMENTS.issuesList)) {
            ELEMENTS.issuesList.innerHTML = `
                <div class="error-state">
                    <h3>Error Loading Issues</h3>
                    <p>There was a problem loading the maintenance issues. Please try refreshing the page.</p>
                    <button onclick="window.location.reload()">Refresh Page</button>
                </div>
            `;
        }
        showError('Failed to load issues. Please try refreshing the page.');
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
    const issues = cachedIssues;
    if (issues.length === 0) {
        showNotification('No issues to export', 'error');
        return;
    }
    
    // Create workbook data
    const headers = ['Location', 'Category', 'Description', 'Time Preference', 'Author', 'Status', 'Date Created'];
    const rows = issues.map(issue => [
        issue.location || `Room ${issue.roomNumber}`,
        issue.category,
        issue.description,
        formatTimePreference(issue.timePreference),
        issue.authorName,
        issue.status,
        formatDate(issue.createdAt || issue.dateCreated)
    ]);
    
    // Create the Excel content with proper XML namespace declarations
    let excelContent = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" 
              xmlns:x="urn:schemas-microsoft-com:office:excel" 
              xmlns="http://www.w3.org/TR/REC-html40">
        <head>
            <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
            <!--[if gte mso 9]>
            <xml>
                <x:ExcelWorkbook>
                    <x:ExcelWorksheets>
                        <x:ExcelWorksheet>
                            <x:Name>Maintenance Issues</x:Name>
                            <x:WorksheetOptions>
                                <x:DisplayGridlines/>
                            </x:WorksheetOptions>
                        </x:ExcelWorksheet>
                    </x:ExcelWorksheets>
                </x:ExcelWorkbook>
            </xml>
            <![endif]-->
            <style>
                table { border-collapse: collapse; }
                th { background-color: #f0f0f0; font-weight: bold; }
                th, td { border: 1px solid #ccc; padding: 5px; }
                tr:nth-child(even) { background-color: #f9f9f9; }
            </style>
        </head>
        <body>
            <table>
                <tr>
                    ${headers.map(header => 
                        `<th>${header}</th>`
                    ).join('')}
                </tr>
                ${rows.map(row => 
                    `<tr>${row.map(cell => 
                        `<td>${cell}</td>`
                    ).join('')}</tr>`
                ).join('')}
            </table>
        </body>
        </html>
    `;
    
    // Create blob with Excel MIME type and proper encoding
    const blob = new Blob(['\ufeff', excelContent], { 
        type: 'application/vnd.ms-excel;charset=utf-8' 
    });
    
    // Create download link with .xls extension
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `maintenance_issues_${new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}.xls`;
    link.click();
    
    showNotification('Issues exported successfully', 'success');
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

// Initialize the page when the DOM is loaded
document.addEventListener('DOMContentLoaded', initializePage); 
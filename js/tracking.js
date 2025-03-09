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

// Scheduled maintenance tasks configuration
const SCHEDULED_TASKS = {
    AC_FILTER_CLEANING: {
        name: 'AC Filter Cleaning',
        frequency: 'quarterly', // every 3 months
        description: 'Clean AC filters in all rooms',
        checklistItems: [
            'Remove filter carefully',
            'Clean with appropriate cleaning solution',
            'Let dry completely',
            'Check for damage',
            'Reinstall filter',
            'Test AC operation'
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
    },
    PREMISES_INSPECTION: {
        name: 'Premises Inspection',
        frequency: 'monthly',
        description: 'General inspection of building and surroundings',
        checklistItems: [
            'Check exterior lighting',
            'Inspect for debris/rubbish around buildings',
            'Check for any visible damage to building exterior',
            'Inspect parking areas',
            'Check security cameras',
            'Verify all emergency exits are clear',
            'Inspect grounds and landscaping'
        ],
        locations: 'exterior'
    }
};

// Debounced search handler
const debounce = (fn, delay) => {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
};

const STATUS_PRIORITY = {
    'Pending': 0,
    'In Progress': 1,
    'Completed': 2
};

const STATUS_COLORS = {
    'Pending': '#e74c3c',
    'In Progress': '#f39c12',
    'Completed': '#27ae60'
};

// Add pagination and sorting state
let currentPage = 1;
const issuesPerPage = 10;
let cachedIssues = [];
let isLoading = false;
let sortDirection = 'desc';

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

// Function to generate AC Filter cleaning checklist PDF
function generateACFilterChecklist() {
    const today = new Date();
    const checklistContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>AC Filter Cleaning Checklist - ${today.toLocaleDateString()}</title>
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
                <h1>AC Filter Cleaning Checklist</h1>
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
        generateACFilterChecklist();
        return;
    }

    const issues = JSON.parse(localStorage.getItem('issues')) || [];
    
    // Check if task already exists and is pending/in-progress
    const existingTask = issues.find(issue => 
        issue.scheduledTaskId === taskId && 
        ['Pending', 'In Progress'].includes(issue.status)
    );
    
    if (existingTask) {
        return; // Don't create duplicate task if one is already pending
    }
    
    const newIssue = {
        id: Date.now(),
        scheduledTaskId: taskId,
        category: 'Scheduled Maintenance',
        description: `${task.name}\n\nChecklist:\n${task.checklistItems.map(item => `• ${item}`).join('\n')}`,
        location: task.locations,
        authorName: 'System',
        status: 'Pending',
        dateCreated: new Date().toISOString(),
        priority: 'High',
        timePreference: { type: 'anytime' }
    };
    
    // Only add to issues list if it's not the AC Filter cleaning task
    if (taskId !== 'AC_FILTER_CLEANING') {
        issues.push(newIssue);
        localStorage.setItem('issues', JSON.stringify(issues));
        showNotification(`New scheduled maintenance task created: ${task.name}`, 'info');
    }
}

// Initialize the page
async function initializePage() {
    try {
        // Initialize Firebase
        // window.firebaseService.initializeFirebase(); // This function no longer exists
        
        // Set up event listeners
        ELEMENTS.searchInput.addEventListener('input', debounce(() => {
            currentPage = 1;
            filterAndDisplayIssues();
        }, 300));
        
        ELEMENTS.filterCategory.addEventListener('change', () => {
            currentPage = 1;
            filterAndDisplayIssues();
        });
        
        ELEMENTS.filterStatus.addEventListener('change', () => {
            currentPage = 1;
            filterAndDisplayIssues();
        });
        
        ELEMENTS.dateFrom.addEventListener('change', () => {
            currentPage = 1;
            filterAndDisplayIssues();
        });
        
        ELEMENTS.dateTo.addEventListener('change', () => {
            currentPage = 1;
            filterAndDisplayIssues();
        });
        
        ELEMENTS.sortControlButtons.addEventListener('click', toggleSort);
        ELEMENTS.clearFilters.addEventListener('click', clearFilters);
        ELEMENTS.exportCSV.addEventListener('click', exportToCSV);
        ELEMENTS.printView.addEventListener('click', openPrintView);
        
        // Add summary container
        ELEMENTS.summaryContainer.className = 'issues-summary';
        ELEMENTS.container.insertBefore(ELEMENTS.summaryContainer, ELEMENTS.issuesList);
        
        // Load issues
        await filterAndDisplayIssues();
        
        // Check scheduled maintenance
        checkScheduledMaintenance();
        
        // Update task cards
        updateTaskCards();
    } catch (error) {
        console.error('Error initializing page:', error);
        showError('Failed to initialize page. Please refresh and try again.');
    }
}

function showLoading() {
    const loader = document.createElement('div');
    loader.className = 'loader';
    loader.innerHTML = `
        <div class="loading-spinner"></div>
        <p>Loading issues...</p>
    `;
    ELEMENTS.container.appendChild(loader);
    isLoading = true;
}

function hideLoading() {
    const loader = document.querySelector('.loader');
    if (loader) {
        loader.remove();
    }
    isLoading = false;
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

async function displayIssues(issues) {
    ELEMENTS.issuesList.innerHTML = '';
    
    if (issues.length === 0) {
        ELEMENTS.issuesList.innerHTML = `
            <div class="empty-state">
                <h3>No issues found</h3>
                <p>There are no maintenance issues matching your search criteria.</p>
            </div>
        `;
        ELEMENTS.paginationContainer.innerHTML = '';
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
        showLoading();
        
        // Get filtered issues
        const filteredIssues = await filterIssues();
        
        // Cache the filtered issues for pagination
        cachedIssues = filteredIssues;
        
        // Update summary
        updateSummary(filteredIssues);
        
        // Apply pagination
        const totalPages = Math.ceil(filteredIssues.length / issuesPerPage);
        const startIndex = (currentPage - 1) * issuesPerPage;
        const endIndex = startIndex + issuesPerPage;
        const paginatedIssues = filteredIssues.slice(startIndex, endIndex);
        
        // Display issues and pagination
        await displayIssues(paginatedIssues);
        renderPagination(currentPage, totalPages);
        
        hideLoading();
    } catch (error) {
        console.error('Error filtering and displaying issues:', error);
        showError('Failed to load issues. Please try again.');
        hideLoading();
    }
}

function toggleSort() {
    sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    ELEMENTS.sortControl.value = sortDirection;
    ELEMENTS.sortControlButtons.querySelector('.sort-icon').textContent = sortDirection === 'asc' ? '↑' : '↓';
    ELEMENTS.sortControlButtons.classList.toggle('asc', sortDirection === 'asc');
    filterAndDisplayIssues();
}

function clearFilters() {
    ELEMENTS.searchInput.value = '';
    ELEMENTS.filterCategory.value = '';
    ELEMENTS.filterStatus.value = '';
    ELEMENTS.dateFrom.value = '';
    ELEMENTS.dateTo.value = '';
    sortDirection = 'desc';
    ELEMENTS.sortControl.value = 'desc';
    ELEMENTS.sortControlButtons.querySelector('.sort-icon').textContent = '↓';
    ELEMENTS.sortControlButtons.classList.remove('asc');
    currentPage = 1;
    filterAndDisplayIssues();
}

function exportToCSV() {
    const issues = cachedIssues;
    if (issues.length === 0) {
        showNotification('No issues to export', 'error');
        return;
    }
    
    const headers = ['ID', 'Location', 'Category', 'Description', 'Time Preference', 'Author', 'Status', 'Date Created'];
    const csvContent = [
        headers.join(','),
        ...issues.map(issue => [
            issue.id,
            issue.location || `Room ${issue.roomNumber}`,
            issue.category,
            `"${issue.description.replace(/"/g, '""')}"`,
            formatTimePreference(issue.timePreference),
            issue.authorName,
            issue.status,
            new Date(issue.dateCreated).toLocaleString()
        ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `maintenance_issues_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    showNotification('Issues exported successfully', 'success');
}

function openPrintView() {
    const issues = JSON.parse(localStorage.getItem('issues')) || [];
    const relevantIssues = issues.filter(issue => 
        ['Pending', 'In Progress'].includes(issue.status)
    ).sort((a, b) => {
        // Sort by status (Pending first) then by date
        if (a.status !== b.status) {
            return a.status === 'Pending' ? -1 : 1;
        }
        return new Date(b.dateCreated) - new Date(a.dateCreated);
    });

    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Maintenance Task List - ${new Date().toLocaleDateString('en-GB')}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
                
                body { 
                    font-family: 'Inter', sans-serif;
                    padding: 20px;
                    max-width: 1200px;
                    margin: 0 auto;
                    background: #f8fafc;
                    color: #1e293b;
                }

                .header {
                    text-align: center;
                    margin-bottom: 20px;
                    padding: 15px;
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }

                .header h1 {
                    margin: 0 0 10px 0;
                    color: #1e293b;
                    font-size: 24px;
                    font-weight: 600;
                }

                .header p {
                    margin: 5px 0;
                    color: #64748b;
                    font-size: 14px;
                }

                .task-group {
                    margin-bottom: 25px;
                    background: white;
                    border-radius: 12px;
                    overflow: hidden;
                }

                .task-group-header {
                    padding: 12px 20px;
                    background: #f1f5f9;
                    color: #1e293b;
                    font-weight: 600;
                    font-size: 16px;
                    border-bottom: 1px solid #e2e8f0;
                }

                .task {
                    padding: 20px;
                    border-bottom: 1px solid #e2e8f0;
                    break-inside: avoid;
                }

                .task:last-child {
                    border-bottom: none;
                }

                .task-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 15px;
                }

                .task-title {
                    font-weight: 600;
                    font-size: 15px;
                    color: #1e293b;
                }

                .status-badge {
                    padding: 6px 12px;
                    border-radius: 6px;
                    font-size: 13px;
                    font-weight: 500;
                }

                .status-badge.pending {
                    background: #fee2e2;
                    color: #991b1b;
                }

                .status-badge.in-progress {
                    background: #fef3c7;
                    color: #92400e;
                }

                .task-content {
                    font-size: 14px;
                    color: #475569;
                    line-height: 1.6;
                }

                .checklist {
                    margin-top: 15px;
                    padding-left: 0;
                }

                .checklist-item {
                    display: flex;
                    align-items: center;
                    margin: 8px 0;
                    font-size: 14px;
                }

                .checkbox {
                    width: 16px;
                    height: 16px;
                    border: 1.5px solid #64748b;
                    border-radius: 4px;
                    margin-right: 10px;
                    flex-shrink: 0;
                }

                .task-footer {
                    margin-top: 15px;
                    padding-top: 15px;
                    border-top: 1px solid #e2e8f0;
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 15px;
                    font-size: 13px;
                    color: #64748b;
                }

                .task-footer strong {
                    color: #475569;
                }

                @media print {
                    body {
                        background: white;
                        padding: 0;
                    }

                    .header,
                    .task-group {
                        box-shadow: none;
                        border: 1px solid #e2e8f0;
                        margin-bottom: 20px;
                    }

                    .task-group {
                        page-break-inside: avoid;
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
                <div class="task-group-header">Pending Tasks</div>
                ${relevantIssues
                    .filter(issue => issue.status === 'Pending')
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

    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
}

function createTaskHTML(issue) {
    const location = issue.location || `Room ${issue.roomNumber}`;
    const timePreference = formatTimePreference(issue.timePreference);
    const date = new Date(issue.dateCreated).toLocaleDateString('en-GB');

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
    const createdDate = issue.createdAt ? formatDate(issue.createdAt) : 'Unknown date';
    
    const card = document.createElement('div');
    card.className = `issue-card ${issue.status.toLowerCase().replace(' ', '-')}`;
    card.dataset.status = issue.status;
    card.dataset.id = issue.id;
    
    let statusButtons = '';
    if (issue.status === 'Pending') {
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
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
    });
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

async function updateStatus(issueId, newStatus) {
    try {
        // Show loading state
        const statusButtons = document.querySelectorAll(`.issue-card[data-id="${issueId}"] .btn-status`);
        statusButtons.forEach(btn => {
            btn.disabled = true;
            btn.classList.add('loading');
        });
        
        // Update status in Firebase
        await window.firebaseService.updateIssueStatus(issueId, newStatus);
        
        // Show success notification
        showNotification(`Issue status updated to ${newStatus}`, 'success');
        
        // Refresh the issues list
        await filterAndDisplayIssues();
    } catch (error) {
        console.error('Error updating status:', error);
        showError('Failed to update status. Please try again.');
        
        // Re-enable buttons
        const statusButtons = document.querySelectorAll(`.issue-card[data-id="${issueId}"] .btn-status`);
        statusButtons.forEach(btn => {
            btn.disabled = false;
            btn.classList.remove('loading');
        });
    }
}

function filterIssues() {
    const searchTerm = ELEMENTS.searchInput.value.toLowerCase();
    const categoryFilter = ELEMENTS.filterCategory.value;
    const statusFilter = ELEMENTS.filterStatus.value;
    const dateFromFilter = ELEMENTS.dateFrom.value ? new Date(ELEMENTS.dateFrom.value) : null;
    const dateToFilter = ELEMENTS.dateTo.value ? new Date(ELEMENTS.dateTo.value) : null;
    
    // Create filters object for Firebase
    const filters = {};
    
    if (categoryFilter) {
        filters.category = categoryFilter;
    }
    
    if (statusFilter) {
        filters.status = statusFilter;
    }
    
    if (dateFromFilter) {
        filters.dateFrom = dateFromFilter;
    }
    
    if (dateToFilter) {
        filters.dateTo = dateToFilter;
    }
    
    // Add sorting
    filters.sortBy = 'createdAt';
    filters.sortDirection = sortDirection;
    
    // Return a promise that resolves with filtered issues
    return window.firebaseService.getIssues(filters)
        .then(issues => {
            // Apply search filter client-side (Firebase doesn't support full-text search)
            if (searchTerm) {
                return issues.filter(issue => {
                    const location = issue.location || issue.roomNumber;
                    const searchFields = [
                        issue.description.toLowerCase(),
                        location.toString().toLowerCase(),
                        issue.authorName.toLowerCase(),
                        issue.category.toLowerCase()
                    ];
                    return searchFields.some(field => field.includes(searchTerm));
                });
            }
            return issues;
        })
        .catch(error => {
            console.error('Error filtering issues:', error);
            showError('Failed to load issues. Please try again.');
            return [];
        });
}

function changePage(newPage) {
    const totalPages = Math.ceil(cachedIssues.length / issuesPerPage);
    
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        filterAndDisplayIssues();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// Initial load of issues
filterAndDisplayIssues();

function updateSummary(issues) {
    const pendingCount = issues.filter(issue => issue.status === 'Pending').length;
    const inProgressCount = issues.filter(issue => issue.status === 'In Progress').length;
    const completedCount = issues.filter(issue => issue.status === 'Completed').length;
    const totalCount = issues.length;
    
    ELEMENTS.summaryContainer.innerHTML = `
        <div class="summary-item pending">
            <div class="summary-label">Pending</div>
            <div class="summary-value">${pendingCount}</div>
        </div>
        <div class="summary-item in-progress">
            <div class="summary-label">In Progress</div>
            <div class="summary-value">${inProgressCount}</div>
        </div>
        <div class="summary-item completed">
            <div class="summary-label">Completed</div>
            <div class="summary-value">${completedCount}</div>
        </div>
        <div class="summary-item">
            <div class="summary-label">Total</div>
            <div class="summary-value">${totalCount}</div>
        </div>
    `;
}

async function updateTaskCards() {
    try {
        // Update AC Filter task card
        const acFilterTask = document.getElementById('acFilterTask');
        const acFilterStatus = acFilterTask.querySelector('.task-status');
        const acFilterNextDue = acFilterTask.querySelector('.next-due');
        
        // Update Premises Inspection task card
        const premisesTask = document.getElementById('premisesTask');
        const premisesStatus = premisesTask.querySelector('.task-status');
        const premisesNextDue = premisesTask.querySelector('.next-due');
        
        // Get task data from Firebase
        const filters = {
            category: 'Scheduled Maintenance'
        };
        
        const maintenanceTasks = await window.firebaseService.getIssues(filters);
        
        // Update AC Filter task
        const acFilterTasks = maintenanceTasks.filter(task => 
            task.scheduledTaskId === 'AC_FILTER_CLEANING'
        );
        
        if (acFilterTasks.length > 0) {
            const latestTask = acFilterTasks.sort((a, b) => 
                b.createdAt - a.createdAt
            )[0];
            
            acFilterStatus.textContent = `Status: ${latestTask.status}`;
            acFilterStatus.className = `task-status ${latestTask.status.toLowerCase().replace(' ', '-')}`;
            
            // Calculate next due date (3 months after latest)
            const nextDueDate = new Date(latestTask.createdAt);
            nextDueDate.setMonth(nextDueDate.getMonth() + 3);
            acFilterNextDue.textContent = `Next due: ${formatDate(nextDueDate)}`;
        } else {
            acFilterStatus.textContent = 'Status: Not Started';
            acFilterStatus.className = 'task-status pending';
            acFilterNextDue.textContent = 'Next due: As soon as possible';
        }
        
        // Update Premises Inspection task
        const premisesTasks = maintenanceTasks.filter(task => 
            task.scheduledTaskId === 'PREMISES_INSPECTION'
        );
        
        if (premisesTasks.length > 0) {
            const latestTask = premisesTasks.sort((a, b) => 
                b.createdAt - a.createdAt
            )[0];
            
            premisesStatus.textContent = `Status: ${latestTask.status}`;
            premisesStatus.className = `task-status ${latestTask.status.toLowerCase().replace(' ', '-')}`;
            
            // Calculate next due date (1 month after latest)
            const nextDueDate = new Date(latestTask.createdAt);
            nextDueDate.setMonth(nextDueDate.getMonth() + 1);
            premisesNextDue.textContent = `Next due: ${formatDate(nextDueDate)}`;
        } else {
            premisesStatus.textContent = 'Status: Not Started';
            premisesStatus.className = 'task-status pending';
            premisesNextDue.textContent = 'Next due: As soon as possible';
        }
    } catch (error) {
        console.error('Error updating task cards:', error);
    }
}

// Initialize the page when the DOM is loaded
document.addEventListener('DOMContentLoaded', initializePage); 
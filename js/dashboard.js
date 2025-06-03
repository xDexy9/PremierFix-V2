// Dashboard functionality

// Cache DOM elements
// Define ELEMENTS as a global variable
let ELEMENTS = {};

// Function to initialize elements
function initializeElements() {
    ELEMENTS = {
        branchSelect: document.getElementById('branchSelect'),
        startDate: document.getElementById('startDate'),
        endDate: document.getElementById('endDate'),
        totalBranches: document.getElementById('totalBranches'),
        totalRooms: document.getElementById('totalRooms'),
        activeIssues: document.getElementById('activeIssues'),
        resolutionRate: document.getElementById('resolutionRate'),
        branchChange: document.getElementById('branchChange'),
        roomChange: document.getElementById('roomChange'),
        issueChange: document.getElementById('issueChange'),
        resolutionChange: document.getElementById('resolutionChange'),
        recentActivities: document.getElementById('recentActivities'),
        issuesTrendChart: document.getElementById('issuesTrendChart'),
        categoriesChart: document.getElementById('categoriesChart'),
        statusChart: document.getElementById('statusChart'),
        timeDistributionChart: document.getElementById('timeDistributionChart'),
        refreshPageDataBtn: document.getElementById('refreshPageDataBtn')
    };
}

// Chart instances
let issuesTrendChartInstance = null;
let categoriesChartInstance = null;
let statusChartInstance = null;
let timeDistributionChartInstance = null;

// Global data
let allBranches = [];
let allIssues = [];
let selectedBranch = 'all';
let dateRange = {
    start: null,
    end: null
};

// Updated Colors for charts - Using CSS Variables where possible
// Get computed style for CSS variables
const rootStyles = getComputedStyle(document.documentElement);

const CHART_COLORS = {
    primary: rootStyles.getPropertyValue('--primary-color').trim() || '#511e58',
    primaryDark: rootStyles.getPropertyValue('--primary-dark').trim() || '#3b1640',
    primaryLight: rootStyles.getPropertyValue('--primary-light').trim() || '#f3e9f7',
    secondary: rootStyles.getPropertyValue('--secondary-color').trim() || '#6366F1', // Indigo
    success: rootStyles.getPropertyValue('--success-color').trim() || '#10B981', // Teal/Green
    warning: rootStyles.getPropertyValue('--warning-color').trim() || '#F97316', // Orange
    danger: rootStyles.getPropertyValue('--danger-color').trim() || '#EF4444', // Red
    mediumGray: rootStyles.getPropertyValue('--medium-gray').trim() || '#9CA3AF',
    darkGray: rootStyles.getPropertyValue('--dark-gray').trim() || '#374151',
    // Define specific palettes if CSS vars aren't suitable for array
    categories: [
        '#511e58', // Primary Purple
        '#6366F1', // Indigo
        '#10B981', // Teal
        '#F59E0B', // Amber
        '#EF4444', // Red
        '#8B5CF6', // Violet
        '#F97316', // Orange
        '#EC4899', // Pink
        '#3B82F6', // Blue
        '#6B7280'  // Gray
    ],
    statuses: {
        'New': rootStyles.getPropertyValue('--primary-color').trim() || '#511e58',
        'In Progress': rootStyles.getPropertyValue('--warning-color').trim() || '#F97316',
        'Completed': rootStyles.getPropertyValue('--success-color').trim() || '#10B981',
        'Cancelled': rootStyles.getPropertyValue('--danger-color').trim() || '#EF4444' 
    },
    // Gradient or slightly varied colors for time distribution
    timeOfDay: [
        'rgba(81, 30, 88, 0.9)', // Darker Purple
        'rgba(81, 30, 88, 0.8)',
        'rgba(81, 30, 88, 0.7)',
        'rgba(81, 30, 88, 0.6)',
        'rgba(81, 30, 88, 0.5)',
        'rgba(81, 30, 88, 0.4)',
        'rgba(81, 30, 88, 0.3)',
        'rgba(81, 30, 88, 0.2)' 
    ]
};

// Initialize dashboard
async function initializeDashboard() {
    try {
        console.log('Initializing dashboard...');
        showLoading();
        
        // Check if we're on the dashboard page by looking for key elements
        const dashboardContainer = document.querySelector('.dashboard-container');
        if (!dashboardContainer) {
            console.log('Not on dashboard page, skipping initialization');
            hideLoading();
            return;
        }
        
        // Initialize DOM elements
        initializeElements();
        
        // Initialize date range
        initializeDateRange();
        
        // Load branches
        await loadBranches();
        
        // Load issues
        await loadIssues();
        
        // Update dashboard stats
        updateDashboardStats();
        
        // Initialize charts
        initializeCharts();
        
        // Setup event listeners
        setupEventListeners();
        
        hideLoading();
        console.log('Dashboard initialized successfully');
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        showError('Failed to initialize dashboard. Please refresh the page.');
        hideLoading();
    }
}

// Initialize date range
function initializeDateRange() {
    // Set default date range to last 30 days
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    dateRange.start = thirtyDaysAgo;
    dateRange.end = today;
    
    // Format dates for input fields - only set if elements exist
    if (ELEMENTS.startDate) {
        ELEMENTS.startDate.value = formatDateForInput(thirtyDaysAgo);
    }
    
    if (ELEMENTS.endDate) {
        ELEMENTS.endDate.value = formatDateForInput(today);
    }
}

// Format date for input fields
function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Load branches
async function loadBranches() {
    try {
        if (!window.hotelBranchManager) {
            throw new Error('Hotel branch manager not initialized');
        }
        
        allBranches = await window.hotelBranchManager.getAllBranches();
        
        // Populate branch select
        populateBranchSelect();
        
        return allBranches;
    } catch (error) {
        console.error('Error loading branches:', error);
        showError('Failed to load hotel branches');
        return [];
    }
}

// Populate branch select
function populateBranchSelect() {
    // Check if ELEMENTS.branchSelect is valid
    if (!ELEMENTS || !ELEMENTS.branchSelect) {
        console.error('Branch select element not found during population.');
        return; 
    }
    
    // Clear existing options except "All Branches"
    while (ELEMENTS.branchSelect.options.length > 1) {
        ELEMENTS.branchSelect.remove(1);
    }
    
    // Add branch options
    allBranches.forEach(branch => {
        const option = document.createElement('option');
        option.value = branch.id;
        option.textContent = branch.name;
        ELEMENTS.branchSelect.appendChild(option);
    });
}

// Load issues - MODIFIED to fetch from Firestore
async function loadIssues() {
    try {
        console.log("Fetching real issues from Firestore...");
        if (!firebase || !firebase.firestore) {
             throw new Error("Firebase Firestore is not available.");
        }
        const db = firebase.firestore();
        const issuesSnapshot = await db.collection('issues').get();
        
        allIssues = issuesSnapshot.docs.map(doc => {
            const data = doc.data();
            // Convert Firestore Timestamps to JS Dates
            const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : (data.dateCreated ? new Date(data.dateCreated) : new Date());
            const completedAt = data.completedAt?.toDate ? data.completedAt.toDate() : null;
            
            // Find branch name (might be slightly inefficient but okay for moderate number of branches)
            const branch = allBranches.find(b => b.id === data.branchId);
            const branchName = branch ? branch.name : 'Unknown Branch';

            return {
                id: doc.id,
                ...data,
                createdAt: createdAt,
                completedAt: completedAt,
                branchName: branchName // Add branch name for display
            };
        });
        
        console.log(`Fetched ${allIssues.length} issues.`);
        return allIssues;
    } catch (error) {
        console.error('Error loading issues from Firestore:', error);
        showError('Failed to load maintenance issues from database.');
        allIssues = []; // Ensure allIssues is empty on error
        return [];
    }
}

// Update dashboard stats - MODIFIED to remove mock changes
function updateDashboardStats() {
    // Ensure elements are initialized
    if (Object.keys(ELEMENTS).length === 0) {
        console.warn("Dashboard elements not initialized yet in updateDashboardStats.");
        return;
    }

    // Filter issues based on selected branch and date range
    const filteredIssues = filterIssues();
    
    // Update total branches
    ELEMENTS.totalBranches.textContent = selectedBranch === 'all' ? allBranches.length : 1;
    
    // Update total rooms - Fetching dynamically for selected branch or summing for all
    let totalRooms = 0;
    if (selectedBranch === 'all') {
        allBranches.forEach(branch => {
             // Assuming branch object fetched by hotelBranchManager might have basic room count or structure
             // A more robust solution might involve specific room count fields in branch docs or separate counts collection
            if (branch.rooms) { // Check if rooms data/count is available directly
                 if (typeof branch.rooms === 'number') {
                     totalRooms += branch.rooms;
                 } else if (typeof branch.rooms === 'object') {
                    totalRooms += Object.keys(branch.rooms).length;
                 }
            } else if (branch.totalRooms) { // Check for a dedicated count field
                 totalRooms += branch.totalRooms;
            }
             // If no room info, it adds 0. Consider fetching detailed branch info if needed.
        });
    } else {
        const branch = allBranches.find(b => b.id === selectedBranch);
         if (branch) {
            if (branch.rooms) {
                 if (typeof branch.rooms === 'number') {
                     totalRooms = branch.rooms;
                 } else if (typeof branch.rooms === 'object') {
                    totalRooms = Object.keys(branch.rooms).length;
                 }
             } else if (branch.totalRooms) {
                  totalRooms = branch.totalRooms;
             }
             // If no room info, totalRooms remains 0. Consider fetching if needed.
         }
    }
    ELEMENTS.totalRooms.textContent = totalRooms;
    
    // Update active issues
    const activeIssues = filteredIssues.filter(issue => 
        issue.status === 'New' || issue.status === 'In Progress'
    ).length;
    ELEMENTS.activeIssues.textContent = activeIssues;
    
    // Update resolution rate
    const completedIssues = filteredIssues.filter(issue => issue.status === 'Completed').length;
    // Avoid division by zero if no issues match filters
    const relevantTotalIssues = filteredIssues.filter(issue => ['New', 'In Progress', 'Completed'].includes(issue.status)).length;
    const resolutionRate = relevantTotalIssues > 0 
        ? Math.round((completedIssues / relevantTotalIssues) * 100) 
        : 0;
    ELEMENTS.resolutionRate.textContent = `${resolutionRate}%`;
    
    // Hide or clear the change elements if they exist
    const changeContainers = [
        document.getElementById('branchChangeContainer'),
        document.getElementById('roomChangeContainer'),
        document.getElementById('issueChangeContainer'),
        document.getElementById('resolutionChangeContainer')
    ];
    changeContainers.forEach(container => {
        if (container) {
             // Option 1: Hide the container
             // container.style.display = 'none'; 
             
             // Option 2: Clear the text content
             const span = container.querySelector('span');
             if (span) span.textContent = '-'; // Or set to empty string ''
             const icon = container.querySelector('i');
             if (icon) icon.className = 'bx bx-minus'; // Set to neutral icon
             container.className = 'stat-change neutral'; // Set to neutral style
        }
    });

    // Update recent activities
    updateRecentActivities();
}

// Filter issues based on selected branch and date range
function filterIssues() {
    return allIssues.filter(issue => {
        // Filter by branch
        if (selectedBranch !== 'all' && issue.branchId !== selectedBranch) {
            return false;
        }
        
        // Filter by date range
        const issueDate = new Date(issue.createdAt);
        if (dateRange.start && issueDate < dateRange.start) {
            return false;
        }
        if (dateRange.end) {
            const endDate = new Date(dateRange.end);
            endDate.setHours(23, 59, 59, 999); // End of the day
            if (issueDate > endDate) {
                return false;
            }
        }
        
        return true;
    });
}

// Update recent activities - REVISED LOGIC V2
function updateRecentActivities() { 
    if (!ELEMENTS.recentActivities) {
        console.warn("Recent activities element not found");
        return;
    }

    // 1. Filter out completed issues first and issues with incomplete data
    const activeIssues = allIssues.filter(issue => {
        // Filter out completed issues
        if (issue.status === 'Completed') return false;
        
        // Filter out issues with both missing branch name and missing description
        if ((!issue.branchName || issue.branchName === 'Unknown Branch') && 
            (!issue.description || issue.description === 'No description')) {
            return false;
        }
        
        return true;
    });

    // 2. Separate critical issues from others 
    const criticalIssues = activeIssues.filter(issue => issue.priority === 'critical');
    const otherIssues = activeIssues.filter(issue => issue.priority !== 'critical');

    // 3. Sort each group by creation date (newest first)
    const sortByDateDesc = (a, b) => new Date(b.createdAt) - new Date(a.createdAt);
    criticalIssues.sort(sortByDateDesc);
    otherIssues.sort(sortByDateDesc);

    // 4. Combine lists (critical first) and take the latest 20
    const sortedIssues = [...criticalIssues, ...otherIssues].slice(0, 20);
    
    // Clear existing activities
    ELEMENTS.recentActivities.innerHTML = '';
    
    // Add recent activities
    if (sortedIssues.length === 0) {
        ELEMENTS.recentActivities.innerHTML = '<p style="text-align: center; padding: 1rem; color: var(--medium-gray);">No active issues found.</p>'; // Updated message
        return;
    }
    
    sortedIssues.forEach(issue => {
        console.log('Processing issue for activity feed (Grid Layout):', issue);
        
        const activityLink = document.createElement('a');
        activityLink.href = `tracking.html?branchId=${issue.branchId || ''}`; 
        activityLink.className = 'activity-item-link'; // Keep the link wrapper for clickability
        activityLink.target = "_blank"; 

        const gridParent = document.createElement('div');
        gridParent.className = 'activity-item-grid-parent'; // New parent class for grid
        
        // --- Populate Grid Divs --- 

        // Div 1: Branch Name
        const div1 = `<div class="div1">${escapeHTML(issue.branchName || 'Unknown Branch')}</div>`;

        // Div 2: Room Number / Location
        const locationText = issue.roomNumber 
            ? `Room: ${escapeHTML(issue.roomNumber)}`
            : (issue.location ? `Loc: ${escapeHTML(issue.location)}` : 'N/A');
        const div2 = `<div class="div2">${locationText}</div>`;

        // Div 3: Category
        const div3 = `<div class="div3">${escapeHTML(issue.category || 'N/A')}</div>`;

        // Div 4: Image Preview
        let div4 = '<div class="div4 activity-image-placeholder"></div>'; // Placeholder if no image
        if (issue.photoUrl) {
             div4 = `
                 <div class="div4">
                     <img src="${issue.photoUrl}" 
                          alt="Issue Photo Preview" 
                          class="activity-photo-preview-grid" 
                          onerror="this.parentElement.classList.add('activity-image-placeholder'); this.remove();" 
                          loading="lazy">
                 </div>`;
         }

        // Div 5: Description (Truncated)
        const description = issue.description || 'No description';
        const truncatedDescription = description.length > 150 
            ? escapeHTML(description.substring(0, 150)) + '...' 
            : escapeHTML(description);
        const div5 = `<div class="div5">${truncatedDescription}</div>`;

        // Div 6: Date and Time
        const formattedDate = formatDate(issue.createdAt);
        const div6 = `<div class="div6">${formattedDate}</div>`;

        // Div 7: Issue Type (Critical Flag)
        const issueTypeText = issue.priority === 'critical' ? 'Critical' : 'New Job';
        const criticalClass = issue.priority === 'critical' ? 'critical-text' : '';
        const div7 = `<div class="div7 ${criticalClass}">${issueTypeText}</div>`;

        // Div 8: Icon
        let iconClass = 'new'; 
        let iconName = 'bx-wrench';
        if (issue.priority === 'critical') {
             iconClass = 'critical'; 
             iconName = 'bx-error-circle'; 
        } else if (issue.status === 'In Progress') { // Keep In Progress status distinct if possible
            iconClass = 'progress';
            iconName = 'bx-run'; 
        }
        const div8 = `
            <div class="div8 activity-icon-grid ${iconClass}">
                <i class='bx ${iconName}'></i>
            </div>`;

        // --- Assemble Grid --- 
        gridParent.innerHTML = `
            ${div1}
            ${div2}
            ${div3}
            ${div4}
            ${div5}
            ${div6}
            ${div7}
            ${div8}
        `;
        
        activityLink.appendChild(gridParent);
        ELEMENTS.recentActivities.appendChild(activityLink);
    });
}

// Helper to escape HTML characters (important for user-generated content)
function escapeHTML(str) {
     const div = document.createElement('div');
     div.textContent = str;
     return div.innerHTML;
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return date.toLocaleDateString(undefined, options);
}

// Initialize charts
function initializeCharts() {
    const filteredIssues = filterIssues();
    initializeIssuesTrendChart(filteredIssues);
    initializeCategoriesChart(filteredIssues);
    initializeStatusChart(filteredIssues);
    initializeTimeDistributionChart(filteredIssues);
}

// Initialize issues trend chart - UPDATED STYLES with GRADIENT & DATE FORMAT
function initializeIssuesTrendChart(filteredIssues) {
    const issuesByDate = groupIssuesByDate(filteredIssues);
    const labels = Object.keys(issuesByDate).sort();
    const newIssuesData = [];
    const resolvedIssuesData = [];

    labels.forEach(date => {
        const issues = issuesByDate[date] || []; // Ensure array exists
        const newCount = issues.filter(issue => new Date(issue.createdAt).toISOString().split('T')[0] === date).length;
        const resolvedCount = issues.filter(issue => issue.completedAt && new Date(issue.completedAt).toISOString().split('T')[0] === date).length;
        newIssuesData.push(newCount);
        resolvedIssuesData.push(resolvedCount);
    });

    // Format date labels for display (e.g., 'Jan 21')
    const formattedLabels = labels.map(dateString => {
        try {
            // Add time component to avoid potential timezone issues with just YYYY-MM-DD
            const date = new Date(dateString + 'T00:00:00'); 
            // Check if date is valid before formatting
            if (isNaN(date.getTime())) {
                 console.warn("Invalid date string encountered:", dateString); 
                 return dateString; // Return original string if invalid
             }
            return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        } catch (e) {
            console.error("Error formatting date label:", dateString, e);
            return dateString; // Return original on error
        }
    });

    const data = {
        labels: formattedLabels, // Use formatted labels
        datasets: [
            {
                label: 'New Issues',
                data: newIssuesData,
                borderColor: CHART_COLORS.primary,
                backgroundColor: (context) => {
                    const chart = context.chart;
                    const {ctx, chartArea} = chart;
                    if (!chartArea) { 
                        return 'rgba(81, 30, 88, 0.1)'; 
                    }
                    const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
                    gradient.addColorStop(0, 'rgba(81, 30, 88, 0)');    
                    gradient.addColorStop(0.8, 'rgba(81, 30, 88, 0.2)'); 
                    gradient.addColorStop(1, 'rgba(81, 30, 88, 0.4)'); 
                    return gradient;
                },
                borderWidth: 2,
                tension: 0.4, 
                fill: true, 
                pointRadius: 0, 
                pointBackgroundColor: CHART_COLORS.primary,
                pointHoverRadius: 5, 
                pointHitRadius: 10 
            },
            {
                label: 'Resolved Issues',
                data: resolvedIssuesData,
                borderColor: CHART_COLORS.success,
                 backgroundColor: (context) => {
                    const chart = context.chart;
                    const {ctx, chartArea} = chart;
                    if (!chartArea) { 
                        return 'rgba(16, 185, 129, 0.1)'; 
                    }
                    const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
                    gradient.addColorStop(0, 'rgba(16, 185, 129, 0)');    
                    gradient.addColorStop(0.8, 'rgba(16, 185, 129, 0.15)'); 
                    gradient.addColorStop(1, 'rgba(16, 185, 129, 0.3)');  
                    return gradient;
                },
                borderWidth: 2,
                tension: 0.4,
                fill: true,
                pointRadius: 0, 
                pointBackgroundColor: CHART_COLORS.success,
                pointHoverRadius: 5, 
                pointHitRadius: 10
            }
        ]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom', 
                labels: {
                    boxWidth: 12,
                    padding: 15,
                    font: {
                        size: 11 
                    }
                }
            },
            tooltip: {
                mode: 'index',
                intersect: false,
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                titleFont: { size: 12 },
                bodyFont: { size: 11 },
                padding: 8
            }
        },
        scales: {
            x: {
                grid: {
                    display: false 
                },
                ticks: {
                    font: { size: 11 }, // Slightly larger font
                    color: CHART_COLORS.mediumGray, // Use medium gray color
                    maxRotation: 0, 
                    autoSkip: true,
                    // Removed maxTicksLimit - let autoSkip handle density
                }
            },
            y: {
                beginAtZero: true,
                grid: {
                    color: 'rgba(0, 0, 0, 0.05)', 
                    drawBorder: false
                },
                 ticks: {
                    font: { size: 10 }
                }
            }
        },
        interaction: {
             mode: 'nearest',
             axis: 'x',
             intersect: false
        }
    };

    if (issuesTrendChartInstance) {
        issuesTrendChartInstance.data = data;
        issuesTrendChartInstance.options = options; 
        issuesTrendChartInstance.update();
    } else if (ELEMENTS.issuesTrendChart) {
        const ctx = ELEMENTS.issuesTrendChart.getContext('2d');
        issuesTrendChartInstance = new Chart(ctx, { type: 'line', data: data, options: options });
    } else {
         console.error('Issues Trend Chart canvas element not found.');
     }
}

// Group issues by date
function groupIssuesByDate(issues) {
    const issuesByDate = {};
    
    // Get date range
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    
    // Create empty entries for each date in range
    let currentDate = new Date(startDate);
    // Ensure loop runs at least once if start and end are same day
    endDate.setHours(23, 59, 59, 999); 
    while (currentDate <= endDate) {
        const dateString = currentDate.toISOString().split('T')[0];
        issuesByDate[dateString] = [];
        
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Group issues by date
    issues.forEach(issue => {
        if (issue.createdAt) {
             try {
                const createdDate = new Date(issue.createdAt).toISOString().split('T')[0];
                if (issuesByDate[createdDate]) {
                    issuesByDate[createdDate].push(issue);
                } else {
                     // Handle cases where issue date might be outside the initialized range
                     // console.warn(`Issue date ${createdDate} outside initial range, adding dynamically.`);
                     issuesByDate[createdDate] = [issue];
                 }
             } catch (e) {
                 console.error("Error processing issue date:", issue.createdAt, e);
             }
         } else {
             console.warn("Issue missing createdAt date:", issue.id);
         }
    });
    
    return issuesByDate;
}

// Initialize categories chart - UPDATED STYLES
function initializeCategoriesChart(filteredIssues) {
    const issuesByCategory = {};
    filteredIssues.forEach(issue => {
        const category = issue.category || 'Uncategorized';
        issuesByCategory[category] = (issuesByCategory[category] || 0) + 1;
    });

    const labels = Object.keys(issuesByCategory);
    const dataValues = labels.map(category => issuesByCategory[category]);
    const backgroundColors = labels.map((_, index) => 
        CHART_COLORS.categories[index % CHART_COLORS.categories.length]
    );

    const data = {
        labels: labels,
        datasets: [{
            data: dataValues,
            backgroundColor: backgroundColors,
            hoverBackgroundColor: backgroundColors.map(color => Chart.helpers.color(color).alpha(0.8).rgbString()), // Add hover effect
            borderWidth: 2, // Add subtle border
            borderColor: '#fff' // White border for separation
        }]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'right',
                labels: {
                     boxWidth: 12,
                     padding: 12,
                     font: { size: 11 }
                 }
            },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                titleFont: { size: 12 },
                bodyFont: { size: 11 },
                padding: 8,
                callbacks: {
                    label: function(context) {
                        const label = context.label || '';
                        const value = context.raw || 0;
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                        return ` ${label}: ${value} (${percentage}%)`; // Added space
                    }
                }
            },
            datalabels: { // Optional: Show percentage directly on chart
                 formatter: (value, ctx) => {
                     let sum = 0;
                     let dataArr = ctx.chart.data.datasets[0].data;
                     dataArr.map(data => {
                         sum += data;
                     });
                     let percentage = sum > 0 ? (value * 100 / sum).toFixed(1) + '%' : '0%';
                     // Only show label if percentage is significant
                     return parseFloat(percentage) > 5 ? percentage : ''; 
                 },
                 color: '#fff',
                 font: {
                     size: 10,
                     weight: 'bold'
                 },
                 textShadow: {
                     color: 'rgba(0, 0, 0, 0.3)',
                     offsetX: 1,
                     offsetY: 1,
                     blur: 2
                 }
             }
        },
        cutout: '65%' // Slightly larger cutout
    };

    if (categoriesChartInstance) {
        categoriesChartInstance.data = data;
        categoriesChartInstance.options = options;
        categoriesChartInstance.update();
    } else if (ELEMENTS.categoriesChart) {
        const ctx = ELEMENTS.categoriesChart.getContext('2d');
        categoriesChartInstance = new Chart(ctx, { 
             type: 'doughnut', 
             data: data, 
             options: options, 
             plugins: [ChartDataLabels] // Register datalabels plugin
         });
     } else {
         console.error('Categories Chart canvas element not found.');
     }
}

// Helper function to determine text color contrast based on background brightness
function getBrightness(colorStr) {
    let r = 0, g = 0, b = 0;
    try {
        if (colorStr.startsWith('#')) {
            // Basic Hex parsing (#RRGGBB or #RGB)
            let hex = colorStr.slice(1);
            if (hex.length === 3) {
                hex = hex.split('').map(c => c + c).join('');
            }
            if (hex.length === 6) {
                r = parseInt(hex.substring(0, 2), 16);
                g = parseInt(hex.substring(2, 4), 16);
                b = parseInt(hex.substring(4, 6), 16);
            }
        } else if (colorStr.startsWith('rgb')) {
            // Basic RGB/RGBA parsing
            const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
            if (match) {
                r = parseInt(match[1]);
                g = parseInt(match[2]);
                b = parseInt(match[3]);
            }
        } else {
            // Cannot parse reliably, default to assuming dark background -> white text
            return 0; 
        }
        // Simple brightness calculation (YIQ simplified)
        // Values range from 0 (black) to 255 (white)
        return (r * 299 + g * 587 + b * 114) / 1000;
    } catch (e) {
        console.error("Error parsing color for brightness:", colorStr, e);
        return 0; // Default to dark background on error
    }
}

// Initialize status chart - UPDATED STYLES
function initializeStatusChart(filteredIssues) {
    const issuesByStatus = {
        'New': 0,
        'In Progress': 0,
        'Completed': 0,
        'Cancelled': 0 // Assuming Cancelled is a possible status
    };
    filteredIssues.forEach(issue => {
        const status = issue.status || 'Unknown';
        if (issuesByStatus[status] !== undefined) {
            issuesByStatus[status]++;
        }
    });

    // Filter out statuses with 0 issues for cleaner chart
    const labels = Object.keys(issuesByStatus).filter(status => issuesByStatus[status] > 0);
    const dataValues = labels.map(status => issuesByStatus[status]);
    const backgroundColors = labels.map(status => CHART_COLORS.statuses[status] || CHART_COLORS.mediumGray);

    const data = {
        labels: labels,
        datasets: [{
            data: dataValues,
            backgroundColor: backgroundColors,
            hoverBackgroundColor: backgroundColors.map(color => { try { return Chart.helpers.color(color).alpha(0.8).rgbString(); } catch(e) { return color; } }), // Keep hover, add try-catch just in case
            borderWidth: 2,
            borderColor: '#fff'
        }]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    boxWidth: 12,
                    padding: 15,
                    font: { size: 11 }
                }
            },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                titleFont: { size: 12 },
                bodyFont: { size: 11 },
                padding: 8,
                callbacks: {
                    label: function(context) {
                        const label = context.label || '';
                        const value = context.raw || 0;
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                        return ` ${label}: ${value} (${percentage}%)`;
                    }
                }
            },
             datalabels: { 
                 formatter: (value, ctx) => {
                     let sum = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                     let percentage = sum > 0 ? (value * 100 / sum).toFixed(1) + '%' : '0%';
                     return parseFloat(percentage) > 5 ? percentage : ''; 
                 },
                 // UPDATED color callback using getBrightness
                 color: (context) => { 
                    const bgColor = context.dataset.backgroundColor[context.dataIndex];
                    const brightness = getBrightness(bgColor);
                    // Use a threshold (e.g., 150) to decide between black/white text
                    return brightness > 150 ? '#000' : '#fff'; 
                 },
                 font: {
                     size: 10,
                     weight: 'bold'
                 },
                  textShadow: {
                     color: 'rgba(0, 0, 0, 0.3)',
                     offsetX: 1,
                     offsetY: 1,
                     blur: 2
                 }
             }
        }
    };

    if (statusChartInstance) {
        statusChartInstance.data = data;
        statusChartInstance.options = options;
        statusChartInstance.update();
    } else if (ELEMENTS.statusChart) {
        const ctx = ELEMENTS.statusChart.getContext('2d');
        statusChartInstance = new Chart(ctx, { 
            type: 'pie', 
            data: data, 
            options: options, 
            plugins: [ChartDataLabels] 
        });
    } else {
         console.error('Status Chart canvas element not found.');
     }
}

// Initialize time distribution chart - UPDATED STYLES
function initializeTimeDistributionChart(filteredIssues) {
    const issuesByHour = Array(24).fill(0);
    filteredIssues.forEach(issue => {
        if (issue.completedAt) {
             try {
                 const completedDate = new Date(issue.completedAt);
                 if (!isNaN(completedDate)) { // Check if date is valid
                     const hour = completedDate.getHours();
                     issuesByHour[hour]++;
                 } else {
                     console.warn("Invalid completedAt date for issue:", issue.id, issue.completedAt);
                 }
             } catch (e) {
                  console.error("Error processing completedAt date:", issue.id, issue.completedAt, e);
              }
         }
    });

    const labels = Array(24).fill().map((_, i) => {
        const hour = i % 12 || 12;
        const ampm = i < 12 ? 'AM' : 'PM';
        return i % 3 === 0 ? `${hour}${ampm}` : ''; // Show labels every 3 hours
    });
    
    // Use a gradient or single color for bars
    const barColor = CHART_COLORS.primary;
    const barHoverColor = CHART_COLORS.primaryDark;

    const data = {
        labels: labels,
        datasets: [{
            label: 'Issues Completed',
            data: issuesByHour,
            backgroundColor: barColor,
            borderColor: barColor,
            borderWidth: 1,
            borderRadius: 4, // Rounded bars
            hoverBackgroundColor: barHoverColor,
            barPercentage: 0.7, // Adjust bar width
            categoryPercentage: 0.8 // Adjust spacing between bars
        }]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                titleFont: { size: 12 },
                bodyFont: { size: 11 },
                padding: 8,
                callbacks: {
                    // Use the full hour label in tooltip title
                    title: function(context) {
                         const index = context[0].dataIndex;
                         const hour = index % 12 || 12;
                         const ampm = index < 12 ? 'AM' : 'PM';
                         return `${hour}:00 ${ampm} - ${hour}:59 ${ampm}`;
                    },
                    label: function(context) {
                        return `Issues completed: ${context.raw}`;
                    }
                }
            }
        },
        scales: {
            x: {
                grid: {
                    display: false
                },
                 ticks: {
                     font: { size: 10 },
                     maxRotation: 0
                 }
            },
            y: {
                beginAtZero: true,
                grid: {
                    color: 'rgba(0, 0, 0, 0.05)',
                    drawBorder: false
                },
                 ticks: {
                    font: { size: 10 }
                }
            }
        }
    };

    if (timeDistributionChartInstance) {
        timeDistributionChartInstance.data = data;
        timeDistributionChartInstance.options = options;
        timeDistributionChartInstance.update();
    } else if (ELEMENTS.timeDistributionChart) {
        const ctx = ELEMENTS.timeDistributionChart.getContext('2d');
        timeDistributionChartInstance = new Chart(ctx, { type: 'bar', data: data, options: options });
    } else {
         console.error('Time Distribution Chart canvas element not found.');
     }
}

// Setup event listeners
function setupEventListeners() {
    // Branch select change
    if (ELEMENTS.branchSelect) {
        ELEMENTS.branchSelect.addEventListener('change', () => {
            selectedBranch = ELEMENTS.branchSelect.value;
            updateDashboardUI();
        });
    }
    
    // Date range change
    if (ELEMENTS.startDate) {
        ELEMENTS.startDate.addEventListener('change', () => {
            dateRange.start = ELEMENTS.startDate.value ? new Date(ELEMENTS.startDate.value) : null;
            updateDashboardUI();
        });
    }
    if (ELEMENTS.endDate) {
        ELEMENTS.endDate.addEventListener('change', () => {
            dateRange.end = ELEMENTS.endDate.value ? new Date(ELEMENTS.endDate.value) : null;
            updateDashboardUI();
        });
    }

    // **Refresh Button Listener** (Calls global showNotification/showError)
    if (ELEMENTS.refreshPageDataBtn) {
        ELEMENTS.refreshPageDataBtn.addEventListener('click', async () => {
            console.log('Refresh Page Data button clicked');
            showLoading();
            try {
                await loadBranches();
                await loadIssues();
                updateDashboardUI();

                // Assuming global showNotification exists and handles types
                if (typeof showNotification === 'function') {
                     showNotification('Dashboard data refreshed successfully.', 'success');
                 } else {
                     console.warn('Global showNotification function not found.');
                     alert('Dashboard data refreshed successfully.'); // Fallback alert
                 }
            } catch (error) {
                console.error('Error refreshing dashboard data:', error);
                 // Assuming global showError exists
                 if (typeof showError === 'function') {
                     showError('Failed to refresh dashboard data.');
                 } else {
                     console.warn('Global showError function not found.');
                     alert('Error: Failed to refresh dashboard data.'); // Fallback alert
                 }
            } finally {
                hideLoading();
            }
        });
    }
}

// Renamed: Update dashboard UI elements (stats & charts) based on current data
function updateDashboardUI() {
    updateDashboardStats();
    initializeCharts();
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if we're on the dashboard page
    if (document.querySelector('.dashboard-container')) {
        console.log('Dashboard page detected, initializing...');
        initializeDashboard();
    } else {
        console.log('Not on dashboard page, skipping initialization');
    }
});

// Loading indicator functions
function showLoading() {
    const loadingContainer = document.getElementById('loadingContainer');
    if (loadingContainer) {
        loadingContainer.classList.add('active');
    }
}

function hideLoading() {
    const loadingContainer = document.getElementById('loadingContainer');
    if (loadingContainer) {
        loadingContainer.classList.remove('active');
    }
} 
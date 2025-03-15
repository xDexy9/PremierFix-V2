// Dashboard functionality

// Cache DOM elements
const ELEMENTS = {
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
    timeDistributionChart: document.getElementById('timeDistributionChart')
};

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

// Colors for charts
const CHART_COLORS = {
    primary: '#3a7bd5',
    secondary: '#3a6073',
    success: '#28a745',
    warning: '#ffc107',
    danger: '#dc3545',
    light: '#f8f9fa',
    dark: '#343a40',
    gray: '#6c757d',
    categories: [
        '#3a7bd5', '#3a6073', '#28a745', '#ffc107', '#dc3545', 
        '#6610f2', '#fd7e14', '#20c997', '#6c757d', '#343a40'
    ],
    statuses: {
        'New': '#3a7bd5',
        'In Progress': '#ffc107',
        'Completed': '#28a745',
        'Cancelled': '#dc3545'
    },
    timeOfDay: [
        'rgba(58, 123, 213, 0.8)',
        'rgba(58, 123, 213, 0.7)',
        'rgba(58, 123, 213, 0.6)',
        'rgba(58, 123, 213, 0.5)',
        'rgba(58, 123, 213, 0.4)',
        'rgba(58, 123, 213, 0.3)',
        'rgba(58, 123, 213, 0.2)',
        'rgba(58, 123, 213, 0.1)'
    ]
};

// Initialize dashboard
async function initializeDashboard() {
    try {
        console.log('Initializing dashboard...');
        showLoading();
        
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
    
    // Format dates for input fields
    ELEMENTS.startDate.value = formatDateForInput(thirtyDaysAgo);
    ELEMENTS.endDate.value = formatDateForInput(today);
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

// Load issues
async function loadIssues() {
    try {
        // In a real application, you would fetch issues from Firebase
        // For now, we'll generate mock data
        allIssues = generateMockIssues();
        return allIssues;
    } catch (error) {
        console.error('Error loading issues:', error);
        showError('Failed to load maintenance issues');
        return [];
    }
}

// Generate mock issues for demonstration
function generateMockIssues() {
    const issues = [];
    const categories = ['Electrical', 'Plumbing', 'Furniture', 'HVAC', 'Cleaning', 'Other'];
    const statuses = ['New', 'In Progress', 'Completed', 'Cancelled'];
    const priorities = ['low', 'medium', 'critical'];
    
    // Generate random issues for each branch
    allBranches.forEach(branch => {
        // Generate between 10 and 30 issues per branch
        const issueCount = Math.floor(Math.random() * 20) + 10;
        
        for (let i = 0; i < issueCount; i++) {
            // Generate random date within the last 90 days
            const createdAt = new Date();
            createdAt.setDate(createdAt.getDate() - Math.floor(Math.random() * 90));
            
            // Generate random completion date for completed issues
            let completedAt = null;
            if (Math.random() > 0.5) {
                completedAt = new Date(createdAt);
                completedAt.setHours(createdAt.getHours() + Math.floor(Math.random() * 72));
            }
            
            // Generate random room number
            const roomNumber = Math.floor(Math.random() * 500) + 100;
            
            // Generate random issue
            const issue = {
                id: `issue-${branch.id}-${i}`,
                branchId: branch.id,
                branchName: branch.name,
                roomNumber: roomNumber.toString(),
                category: categories[Math.floor(Math.random() * categories.length)],
                description: `Issue in room ${roomNumber}`,
                status: statuses[Math.floor(Math.random() * statuses.length)],
                priority: priorities[Math.floor(Math.random() * priorities.length)],
                createdAt: createdAt,
                completedAt: completedAt,
                assignedTo: Math.random() > 0.7 ? 'Maintenance Staff' : null
            };
            
            issues.push(issue);
        }
    });
    
    return issues;
}

// Update dashboard stats
function updateDashboardStats() {
    // Filter issues based on selected branch and date range
    const filteredIssues = filterIssues();
    
    // Update total branches
    ELEMENTS.totalBranches.textContent = selectedBranch === 'all' ? allBranches.length : 1;
    
    // Update total rooms
    let totalRooms = 0;
    if (selectedBranch === 'all') {
        allBranches.forEach(branch => {
            if (branch.rooms) {
                totalRooms += Object.keys(branch.rooms).length;
            }
        });
    } else {
        const branch = allBranches.find(b => b.id === selectedBranch);
        if (branch && branch.rooms) {
            totalRooms = Object.keys(branch.rooms).length;
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
    const resolutionRate = filteredIssues.length > 0 
        ? Math.round((completedIssues / filteredIssues.length) * 100) 
        : 0;
    ELEMENTS.resolutionRate.textContent = `${resolutionRate}%`;
    
    // Update change percentages (mock data for demonstration)
    ELEMENTS.branchChange.textContent = '5% from last month';
    ELEMENTS.roomChange.textContent = '3% from last month';
    ELEMENTS.issueChange.textContent = '-7% from last month';
    ELEMENTS.resolutionChange.textContent = '12% from last month';
    
    // Update recent activities
    updateRecentActivities(filteredIssues);
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

// Update recent activities
function updateRecentActivities(filteredIssues) {
    // Sort issues by creation date (newest first)
    const sortedIssues = [...filteredIssues].sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
    );
    
    // Take the 10 most recent issues
    const recentIssues = sortedIssues.slice(0, 10);
    
    // Clear existing activities
    ELEMENTS.recentActivities.innerHTML = '';
    
    // Add recent activities
    if (recentIssues.length === 0) {
        ELEMENTS.recentActivities.innerHTML = '<p class="text-center">No recent activities</p>';
        return;
    }
    
    recentIssues.forEach(issue => {
        const activityItem = document.createElement('div');
        activityItem.className = 'activity-item';
        
        // Determine icon class based on status
        let iconClass = 'new';
        if (issue.status === 'In Progress') {
            iconClass = 'progress';
        } else if (issue.status === 'Completed') {
            iconClass = 'completed';
        }
        
        // Format date
        const formattedDate = formatDate(issue.createdAt);
        
        activityItem.innerHTML = `
            <div class="activity-icon ${iconClass}">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/>
                </svg>
            </div>
            <div class="activity-content">
                <p class="activity-text">${issue.description} - ${issue.status}</p>
                <p class="activity-time">${formattedDate} - ${issue.branchName}</p>
            </div>
        `;
        
        ELEMENTS.recentActivities.appendChild(activityItem);
    });
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return date.toLocaleDateString(undefined, options);
}

// Initialize charts
function initializeCharts() {
    // Filter issues based on selected branch and date range
    const filteredIssues = filterIssues();
    
    // Initialize issue trends chart
    initializeIssuesTrendChart(filteredIssues);
    
    // Initialize categories chart
    initializeCategoriesChart(filteredIssues);
    
    // Initialize status chart
    initializeStatusChart(filteredIssues);
    
    // Initialize time distribution chart
    initializeTimeDistributionChart(filteredIssues);
}

// Initialize issues trend chart
function initializeIssuesTrendChart(filteredIssues) {
    // Group issues by date
    const issuesByDate = groupIssuesByDate(filteredIssues);
    
    // Prepare data for chart
    const labels = Object.keys(issuesByDate).sort();
    const newIssues = [];
    const resolvedIssues = [];
    
    labels.forEach(date => {
        const issues = issuesByDate[date];
        const newCount = issues.filter(issue => 
            new Date(issue.createdAt).toDateString() === new Date(date).toDateString()
        ).length;
        
        const resolvedCount = issues.filter(issue => 
            issue.completedAt && 
            new Date(issue.completedAt).toDateString() === new Date(date).toDateString()
        ).length;
        
        newIssues.push(newCount);
        resolvedIssues.push(resolvedCount);
    });
    
    // Create or update chart
    if (issuesTrendChartInstance) {
        issuesTrendChartInstance.data.labels = labels;
        issuesTrendChartInstance.data.datasets[0].data = newIssues;
        issuesTrendChartInstance.data.datasets[1].data = resolvedIssues;
        issuesTrendChartInstance.update();
    } else {
        const ctx = ELEMENTS.issuesTrendChart.getContext('2d');
        issuesTrendChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'New Issues',
                        data: newIssues,
                        borderColor: CHART_COLORS.primary,
                        backgroundColor: 'rgba(58, 123, 213, 0.1)',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Resolved Issues',
                        data: resolvedIssues,
                        borderColor: CHART_COLORS.success,
                        backgroundColor: 'rgba(40, 167, 69, 0.1)',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    }
                }
            }
        });
    }
}

// Group issues by date
function groupIssuesByDate(issues) {
    const issuesByDate = {};
    
    // Get date range
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    
    // Create empty entries for each date in range
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
        const dateString = currentDate.toISOString().split('T')[0];
        issuesByDate[dateString] = [];
        
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Group issues by date
    issues.forEach(issue => {
        const createdDate = new Date(issue.createdAt).toISOString().split('T')[0];
        if (issuesByDate[createdDate]) {
            issuesByDate[createdDate].push(issue);
        }
    });
    
    return issuesByDate;
}

// Initialize categories chart
function initializeCategoriesChart(filteredIssues) {
    // Group issues by category
    const issuesByCategory = {};
    
    filteredIssues.forEach(issue => {
        if (!issuesByCategory[issue.category]) {
            issuesByCategory[issue.category] = 0;
        }
        issuesByCategory[issue.category]++;
    });
    
    // Prepare data for chart
    const labels = Object.keys(issuesByCategory);
    const data = labels.map(category => issuesByCategory[category]);
    const backgroundColors = labels.map((_, index) => 
        CHART_COLORS.categories[index % CHART_COLORS.categories.length]
    );
    
    // Create or update chart
    if (categoriesChartInstance) {
        categoriesChartInstance.data.labels = labels;
        categoriesChartInstance.data.datasets[0].data = data;
        categoriesChartInstance.data.datasets[0].backgroundColor = backgroundColors;
        categoriesChartInstance.update();
    } else {
        const ctx = ELEMENTS.categoriesChart.getContext('2d');
        categoriesChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [
                    {
                        data: data,
                        backgroundColor: backgroundColors,
                        borderWidth: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                },
                cutout: '70%'
            }
        });
    }
}

// Initialize status chart
function initializeStatusChart(filteredIssues) {
    // Group issues by status
    const issuesByStatus = {
        'New': 0,
        'In Progress': 0,
        'Completed': 0,
        'Cancelled': 0
    };
    
    filteredIssues.forEach(issue => {
        if (issuesByStatus[issue.status] !== undefined) {
            issuesByStatus[issue.status]++;
        }
    });
    
    // Prepare data for chart
    const labels = Object.keys(issuesByStatus);
    const data = labels.map(status => issuesByStatus[status]);
    const backgroundColors = labels.map(status => CHART_COLORS.statuses[status]);
    
    // Create or update chart
    if (statusChartInstance) {
        statusChartInstance.data.labels = labels;
        statusChartInstance.data.datasets[0].data = data;
        statusChartInstance.data.datasets[0].backgroundColor = backgroundColors;
        statusChartInstance.update();
    } else {
        const ctx = ELEMENTS.statusChart.getContext('2d');
        statusChartInstance = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [
                    {
                        data: data,
                        backgroundColor: backgroundColors,
                        borderWidth: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
}

// Initialize time distribution chart
function initializeTimeDistributionChart(filteredIssues) {
    // Group completed issues by hour of completion
    const issuesByHour = Array(24).fill(0);
    
    filteredIssues.forEach(issue => {
        if (issue.completedAt) {
            const hour = new Date(issue.completedAt).getHours();
            issuesByHour[hour]++;
        }
    });
    
    // Prepare data for chart
    const labels = Array(24).fill().map((_, i) => {
        const hour = i % 12 || 12;
        const ampm = i < 12 ? 'AM' : 'PM';
        return `${hour} ${ampm}`;
    });
    
    // Create or update chart
    if (timeDistributionChartInstance) {
        timeDistributionChartInstance.data.labels = labels;
        timeDistributionChartInstance.data.datasets[0].data = issuesByHour;
        timeDistributionChartInstance.update();
    } else {
        const ctx = ELEMENTS.timeDistributionChart.getContext('2d');
        timeDistributionChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Issues Completed',
                        data: issuesByHour,
                        backgroundColor: CHART_COLORS.primary,
                        borderWidth: 0,
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            title: function(context) {
                                return `${context[0].label}`;
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
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    }
                }
            }
        });
    }
}

// Setup event listeners
function setupEventListeners() {
    // Branch select change
    ELEMENTS.branchSelect.addEventListener('change', () => {
        selectedBranch = ELEMENTS.branchSelect.value;
        updateDashboard();
    });
    
    // Date range change
    ELEMENTS.startDate.addEventListener('change', () => {
        dateRange.start = ELEMENTS.startDate.value ? new Date(ELEMENTS.startDate.value) : null;
        updateDashboard();
    });
    
    ELEMENTS.endDate.addEventListener('change', () => {
        dateRange.end = ELEMENTS.endDate.value ? new Date(ELEMENTS.endDate.value) : null;
        updateDashboard();
    });
}

// Update dashboard
function updateDashboard() {
    updateDashboardStats();
    initializeCharts();
}

// Show error
function showError(message) {
    console.error('Error:', message);
    
    // Create a notification element
    const notification = document.createElement('div');
    notification.className = 'error-notification';
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-message">${message}</span>
            <button class="notification-close">&times;</button>
        </div>
    `;
    
    // Add styles if they don't exist
    if (!document.getElementById('notification-styles')) {
        const styles = document.createElement('style');
        styles.id = 'notification-styles';
        styles.textContent = `
            .error-notification {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                background-color: #f8d7da;
                border-left: 4px solid #dc3545;
                color: #721c24;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                z-index: 2000;
                max-width: 350px;
                animation: slideIn 0.3s ease-out forwards;
                opacity: 0;
                transform: translateX(20px);
            }
            
            @keyframes slideIn {
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
            
            .notification-content {
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            
            .notification-message {
                flex: 1;
                margin-right: 10px;
            }
            
            .notification-close {
                background: none;
                border: none;
                font-size: 20px;
                cursor: pointer;
                color: inherit;
                opacity: 0.7;
                transition: opacity 0.2s;
            }
            
            .notification-close:hover {
                opacity: 1;
            }
        `;
        document.head.appendChild(styles);
    }
    
    // Add to document
    document.body.appendChild(notification);
    
    // Add close button functionality
    const closeBtn = notification.querySelector('.notification-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            notification.remove();
        });
    }
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(20px)';
        notification.style.transition = 'all 0.3s ease-out';
        
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 5000);
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeDashboard();
}); 
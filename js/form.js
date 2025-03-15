// Time selection functionality
const timeButtons = document.querySelectorAll('.time-btn');
const dateTimeContainer = document.getElementById('dateTimeContainer');
const dateTimeLabel = document.getElementById('dateTimeLabel');
const timePreferenceInput = document.getElementById('timePreference');
let selectedTime = 'anytime';
let dateTimePicker; // Store the Flatpickr instance

// Priority levels
const PRIORITY_LEVELS = {
    low: { label: 'Low', color: '#4ade80' },
    medium: { label: 'Medium', color: '#f59e0b' },
    critical: { label: 'Critical', color: '#ef4444' }
};

// Update branch information
async function updateBranchInfo() {
    try {
        const branchId = window.hotelBranchManager.getCurrentBranch();
        const branchData = window.hotelBranchManager.getBranchData();

        if (!branchId || !branchData) {
            console.warn('No branch selected');
            return;
        }

        // Update branch details while preserving SVG icons
        const branchNameEl = document.getElementById('branchName');
        const branchAddressEl = document.getElementById('branchAddress');
        
        // Preserve the SVG icon for branch name
        if (branchNameEl) {
            // Get the SVG element if it exists
            const svgIcon = branchNameEl.querySelector('svg');
            if (svgIcon) {
                // Clear the element but keep the SVG
                branchNameEl.innerHTML = '';
                branchNameEl.appendChild(svgIcon);
                // Append the text node
                branchNameEl.appendChild(document.createTextNode(branchData.name || 'N/A'));
            } else {
                branchNameEl.textContent = branchData.name || 'N/A';
            }
        }
        
        // Preserve the SVG icon for branch address
        if (branchAddressEl) {
            // Get the SVG element if it exists
            const svgIcon = branchAddressEl.querySelector('svg');
            if (svgIcon) {
                // Clear the element but keep the SVG
                branchAddressEl.innerHTML = '';
                branchAddressEl.appendChild(svgIcon);
                // Append the text node
                branchAddressEl.appendChild(document.createTextNode(branchData.address || 'N/A'));
            } else {
                branchAddressEl.textContent = branchData.address || 'N/A';
            }
        }

        // Update date and time
        updateDateTime();
        // Start time update interval
        setInterval(updateDateTime, 1000);

        // Update maintenance stats
        await updateMaintenanceStats();
        // Update stats every 5 minutes
        setInterval(updateMaintenanceStats, 300000);

    } catch (error) {
        console.error('Error updating branch info:', error);
    }
}

function updateDateTime() {
    const now = new Date();
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };
    
    const currentDateEl = document.getElementById('currentDate');
    const currentTimeEl = document.getElementById('currentTime');
    const timeZoneEl = document.getElementById('timeZone');
    
    if (currentDateEl) {
        currentDateEl.textContent = now.toLocaleDateString(undefined, dateOptions);
    }
    if (currentTimeEl) {
        currentTimeEl.textContent = now.toLocaleTimeString(undefined, timeOptions);
    }
    if (timeZoneEl) {
        timeZoneEl.textContent = Intl.DateTimeFormat().resolvedOptions().timeZone;
    }
}

async function updateMaintenanceStats() {
    try {
        const branchId = window.hotelBranchManager.getCurrentBranch();
        if (!branchId) return;

        // Get maintenance issues for the current branch
        const issuesSnapshot = await firebase.firestore()
            .collection('maintenance_issues')
            .where('branchId', '==', branchId)
            .get();

        let newCount = 0;
        let inProgressCount = 0;

        issuesSnapshot.forEach(doc => {
            const issue = doc.data();
            if (issue.status === 'New') newCount++;
            if (issue.status === 'In Progress') inProgressCount++;
        });

        // Get elements
        const newIssuesCountEl = document.getElementById('newIssuesCount');
        const inProgressCountEl = document.getElementById('inProgressCount');
        const totalRoomsEl = document.getElementById('totalRooms');

        // Update total rooms count
        const branchData = window.hotelBranchManager.getBranchData();
        const totalRooms = branchData.rooms ? Object.keys(branchData.rooms).length : 0;
        
        // Animate the counters with the real branch-specific data
        if (newIssuesCountEl) animateCounterOptimized(newIssuesCountEl, newCount);
        if (inProgressCountEl) animateCounterOptimized(inProgressCountEl, inProgressCount);
        if (totalRoomsEl) animateCounterOptimized(totalRoomsEl, totalRooms);

    } catch (error) {
        console.error('Error updating maintenance stats:', error);
    }
}

// Optimized counter animation function using requestAnimationFrame
function animateCounterOptimized(element, target, duration = 1000) {
    if (!element) return;
    
    const startTime = performance.now();
    const startValue = parseInt(element.textContent) || 0;
    
    function updateCounter(currentTime) {
        const elapsedTime = currentTime - startTime;
        const progress = Math.min(elapsedTime / duration, 1);
        
        const currentValue = Math.floor(startValue + (target - startValue) * progress);
        element.textContent = currentValue;
        
        if (progress < 1) {
            requestAnimationFrame(updateCounter);
        } else {
            element.textContent = target;
        }
    }
    
    requestAnimationFrame(updateCounter);
}

// Initialize the page
async function initializePage() {
    try {
        console.log("Starting page initialization...");
        
        // Initialize Firebase
        await window.firebaseService.initialize();
        console.log("Firebase initialization complete");
        
        // Initialize branch manager
        await window.hotelBranchManager.initialize();
        console.log("Branch manager initialization complete");
        
        // Wait for branch selector to be initialized
        if (window.branchSelector && !window.branchSelector.initialized) {
            await window.branchSelector.initialize();
            console.log("Branch selector initialization complete");
        } else if (!window.branchSelector) {
            console.error('Branch selector not available');
            showErrorMessage('Failed to initialize branch selector. Please refresh and try again.');
            return;
        }
        
        // Check if branch is selected
        if (!window.hotelBranchManager.getCurrentBranch()) {
            // Show branch selector
            if (window.branchSelector) {
                window.branchSelector.showBranchSelector();
            } else {
                console.error('Branch selector not initialized');
                showErrorMessage('Failed to initialize branch selector. Please refresh and try again.');
            }
            return;
        }
        
        // Update branch information
        await updateBranchInfo();
        
        // Initialize Flatpickr
        initializeFlatpickr();
        
        // Initialize form event listeners
        initializeFormListeners();
        
        console.log("Page initialization complete");
        
        // Clear console after a small delay to ensure all logs are shown
        // setTimeout(() => {
        //     console.clear();
        //     console.log("✨ PremierFix Issue Logger Ready!");
        // }, 1000);
    } catch (error) {
        console.error('Error initializing page:', error);
        showErrorMessage('Failed to initialize page. Please refresh and try again.');
    }
}

// Initialize Flatpickr
function initializeFlatpickr() {
    const dateTimeInput = document.getElementById('dateTime');
    if (!dateTimeInput) return;

    dateTimePicker = flatpickr("#dateTime", {
        enableTime: true,
        dateFormat: "Y-m-d H:i",
        minDate: "today",
        time_24hr: false,
        minuteIncrement: 30,
        defaultHour: 9,
        position: "auto",
        theme: "material_blue",
        animate: true,
        allowInput: true,
        onOpen: function() {
            this.element.blur(); // Prevent mobile keyboard from showing
        },
        onChange: function(selectedDates, dateStr) {
            if (selectedDates.length > 0) {
                dateTimeInput.value = dateStr;
            }
        }
    });
}

// Initialize form event listeners
function initializeFormListeners() {
    const dateTimeInput = document.getElementById('dateTime');
    const roomNumberInput = document.getElementById('roomNumber');
    const locationSelect = document.getElementById('location');
    const priorityButtons = document.querySelectorAll('.priority-btn');
    const priorityInput = document.getElementById('priority');

    // Initialize Switch Branch button
    const switchBranchBtn = document.getElementById('switchBranch');
    if (switchBranchBtn) {
        switchBranchBtn.addEventListener('click', function() {
            if (window.branchSelector) {
                window.branchSelector.showBranchSelector();
            } else {
                showNotification('Branch selector not available', 'error');
            }
        });
    }

    // Make fields mutually exclusive
    roomNumberInput.addEventListener('input', function() {
        if (this.value) {
            locationSelect.value = '';
            locationSelect.removeAttribute('required');
        } else if (!locationSelect.value) {
            locationSelect.setAttribute('required', 'required');
        }
    });

    locationSelect.addEventListener('change', function() {
        if (this.value) {
            roomNumberInput.value = '';
            roomNumberInput.removeAttribute('required');
        } else if (!roomNumberInput.value) {
            roomNumberInput.setAttribute('required', 'required');
        }
    });

    // Priority selection buttons
    priorityButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons
            priorityButtons.forEach(btn => btn.classList.remove('active'));
            // Add active class to clicked button
            button.classList.add('active');
            // Update hidden input value
            priorityInput.value = button.dataset.priority;
        });
    });

    // Time selection buttons
    timeButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons
            timeButtons.forEach(btn => btn.classList.remove('active'));
            // Add active class to clicked button
            button.classList.add('active');

            selectedTime = button.dataset.time;
            // Update the hidden input value
            timePreferenceInput.value = selectedTime;

            // Show/hide datetime input based on selection
            if (selectedTime === 'anytime') {
                dateTimeContainer.style.display = 'none';
                dateTimeInput.removeAttribute('required');
                dateTimePicker.clear();
            } else {
                dateTimeContainer.style.display = 'block';
                dateTimeInput.setAttribute('required', 'required');
                dateTimeLabel.textContent = selectedTime === 'before' ?
                    'Maintenance needed before:' :
                    'Maintenance needed after:';
            }
        });
    });

    // Form submission
    document.getElementById('issueForm').addEventListener('submit', handleFormSubmit);
}

// Initialize dashboard controls
function initializeDashboardControls() {
    // Dashboard tabs
    const dashboardTabs = document.querySelectorAll('.dashboard-tab');
    dashboardTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs
            dashboardTabs.forEach(t => t.classList.remove('active'));
            // Add active class to clicked tab
            tab.classList.add('active');
            
            // Here you would typically show/hide content based on the selected tab
            // For now, we'll just show a notification
            showNotification(`${tab.textContent.trim()} tab selected`, 'info');
        });
    });
    
    // Refresh button
    const refreshButton = document.querySelector('.dashboard-control-btn[title="Refresh Data"]');
    if (refreshButton) {
        refreshButton.addEventListener('click', async () => {
            refreshButton.classList.add('loading');
            try {
                await updateBranchInfo();
                await updateMaintenanceStats();
                showNotification('Dashboard data refreshed', 'success');
            } catch (error) {
                console.error('Error refreshing data:', error);
                showNotification('Failed to refresh data', 'error');
            } finally {
                refreshButton.classList.remove('loading');
            }
        });
    }
    
    // Settings button
    const settingsButton = document.querySelector('.dashboard-control-btn[title="Settings"]');
    if (settingsButton) {
        settingsButton.addEventListener('click', () => {
            showNotification('Settings feature coming soon', 'info');
        });
    }
    
    // Quick action buttons
    const quickActionButtons = document.querySelectorAll('.quick-action-btn');
    quickActionButtons.forEach(button => {
        if (button.id === 'switchBranch') {
            button.addEventListener('click', () => {
                if (window.branchSelector) {
                    window.branchSelector.showBranchSelector();
                }
            });
        } else {
            button.addEventListener('click', () => {
                const action = button.textContent.trim();
                if (action === 'New Request') {
                    // Scroll to the form
                    document.getElementById('issueForm').scrollIntoView({ behavior: 'smooth' });
                } else if (action === 'View All Issues') {
                    // Redirect to tracking page
                    window.location.href = 'tracking.html';
                } else if (action === 'Print Report') {
                    showNotification('Generating report...', 'info');
                    setTimeout(() => {
                        showNotification('Report feature coming soon', 'info');
                    }, 1500);
                }
            });
        }
    });
}

// Form submission handler
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const submitButton = document.querySelector('.btn-submit');
    const roomNumber = document.getElementById('roomNumber').value;
    const location = document.getElementById('location').value;
    const category = document.getElementById('category').value;
    const description = document.getElementById('description').value.trim();
    const authorName = document.getElementById('authorName').value.trim();
    
    // Validate all required fields
    if (!category) {
        showErrorMessage('Please select a category');
        return;
    }
    
    if (!description) {
        showErrorMessage('Please provide a description');
        return;
    }
    
    if (!authorName) {
        showErrorMessage('Please enter your name');
        return;
    }
    
    // Validate that either room number or location is provided
    if (!roomNumber && !location) {
        showErrorMessage('Please enter either a room number or select a location');
        return;
    }

    submitButton.disabled = true;
    submitButton.classList.add('loading');
    submitButton.textContent = 'Submitting...';
    
    // Get the datetime value only if not "anytime"
    const dateTimeInput = document.getElementById('dateTime');
    const timePreference = {
        type: timePreferenceInput.value,
        datetime: timePreferenceInput.value !== 'anytime' ? dateTimeInput.value : null
    };
    
    const issue = {
        branchId: window.hotelBranchManager.getCurrentBranch(),
        roomNumber: roomNumber,
        location: location,
        category: category,
        description: description,
        timePreference: timePreference,
        authorName: authorName,
        priority: document.getElementById('priority').value,
        dateCreated: new Date().toISOString(),
        createdAt: new Date(),
        status: 'New'
    };

    try {
        // Use Firebase to save the issue
        const issueId = await window.firebaseService.saveIssue(issue);
        console.log('Issue saved with ID:', issueId);
        
        // Reset form
        resetForm();
        
        // Show success message
        showSuccessMessage();
    } catch (error) {
        console.error('Error saving issue:', error);
        // Don't show error if the issue was actually saved
        if (!error.message.includes('dateTimePicker')) {
            showErrorMessage('Failed to save issue. Please try again.');
        }
    } finally {
        submitButton.disabled = false;
        submitButton.classList.remove('loading');
        submitButton.textContent = 'Submit Issue';
    }
}

function resetForm() {
    const form = document.getElementById('issueForm');
    form.reset();
    
    // Reset time selection
    timeButtons.forEach(btn => {
        if (btn.dataset.time === 'anytime') {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    dateTimeContainer.style.display = 'none';
    selectedTime = 'anytime';
    timePreferenceInput.value = 'anytime';
    
    // Reset Flatpickr only if it exists
    if (dateTimePicker) {
        dateTimePicker.clear();
    }

    // Reset priority
    const defaultPriority = document.querySelector('.priority-btn');
    document.querySelectorAll('.priority-btn').forEach(btn => btn.classList.remove('active'));
    defaultPriority.classList.add('active');
    document.getElementById('priority').value = defaultPriority.dataset.priority;
}

function showSuccessMessage() {
    showNotification('Issue has been logged successfully!', 'success');
}

function showErrorMessage(message) {
    showNotification(message, 'error');
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-message">${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Hide and remove notification
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Initialize the page when DOM is loaded
document.addEventListener('DOMContentLoaded', initializePage);

// Dashboard tab functionality
document.addEventListener('DOMContentLoaded', function() {
    // Initialize dashboard tabs
    const dashboardTabs = document.querySelectorAll('.dashboard-tab');
    
    dashboardTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Remove active class from all tabs
            dashboardTabs.forEach(t => t.classList.remove('active'));
            
            // Add active class to clicked tab
            this.classList.add('active');
            
            // Here you would typically show/hide content based on the selected tab
            // For now, we're just showing a notification
            showNotification(`${this.textContent.trim()} tab selected`, 'info');
        });
    });

    // Set the first tab as active by default
    if (dashboardTabs.length > 0 && !document.querySelector('.dashboard-tab.active')) {
        dashboardTabs[0].classList.add('active');
    }
}); 
// Debug console log to verify form.js is loaded
console.log("form.js loaded at", new Date().toISOString());

// Time selection functionality
// Only declare timeButtons if it doesn't already exist to prevent redeclaration
if (typeof timeButtons === 'undefined') {
    // Use a function to get timeButtons so it's only queried when needed
    var timeButtons = null;
    function getTimeButtons() {
        if (!timeButtons) {
            timeButtons = document.querySelectorAll('.time-btn');
        }
        return timeButtons;
    }
    // Initialize after DOM content loaded to ensure elements exist
    document.addEventListener('DOMContentLoaded', function() {
        timeButtons = document.querySelectorAll('.time-btn');
    });
}

// Initialize global variables
window.justSubmittedForm = false;
window.maintenanceStats = { totalRooms: 0 };
window.lastUpdateTime = 0;
window.updateInProgress = false;
window.pendingUpdate = false;
window.lastSavedIssueId = null; // Track the last saved issue ID
window.updateCount = 0; // Track update count for debugging
window.blockUpdatesUntil = 0; // Timestamp until which updates should be blocked
window.originalUpdateFunction = null; // Store original update function for restoration
window.photoData = null; // Store photo data

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
        
        // Update maintenance stats
        await updateMaintenanceStats();

    } catch (error) {
        console.error('Error updating branch info:', error);
    }
}

function updateDateTime() {
    const now = new Date();
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };
    const shortDateOptions = { day: 'numeric', month: 'long' };
    
    const currentDateEl = document.getElementById('currentDate');
    const currentTimeEl = document.getElementById('currentTime');
    const timeZoneEl = document.getElementById('timeZone');
    const currentDayEl = document.getElementById('currentDay');
    const currentDateShortEl = document.getElementById('currentDateShort');
    
    if (currentDateEl) {
        currentDateEl.textContent = now.toLocaleDateString(undefined, dateOptions);
    }
    if (currentTimeEl) {
        currentTimeEl.textContent = now.toLocaleTimeString(undefined, timeOptions);
    }
    if (timeZoneEl) {
        timeZoneEl.textContent = Intl.DateTimeFormat().resolvedOptions().timeZone;
    }
    if (currentDayEl) {
        currentDayEl.textContent = now.toLocaleDateString(undefined, { weekday: 'long' });
    }
    if (currentDateShortEl) {
        currentDateShortEl.textContent = now.toLocaleDateString(undefined, shortDateOptions);
    }
}

async function updateMaintenanceStats() {
    try {
        window.updateCount++; // Increment update counter for debugging
        console.log(`Starting update #${window.updateCount}`);
        
        // Check if we should block this update
        const now = Date.now();
        if (now < window.blockUpdatesUntil && !window.justSubmittedForm) {
            console.log(`Update #${window.updateCount}: BLOCKED - in cooldown period (${Math.round((window.blockUpdatesUntil - now)/1000)}s remaining)`);
            return window.maintenanceStats;
        }
        
        // Prevent multiple simultaneous updates
        if (window.updateInProgress) {
            window.pendingUpdate = true;
            console.log(`Update #${window.updateCount}: Already in progress, marking as pending`);
            return window.maintenanceStats;
        }
        
        // Implement debounce - prevent too frequent updates
        const timeSinceLastUpdate = now - window.lastUpdateTime;
        const minimumUpdateInterval = 3000; // 3 seconds
        
        // Don't update too frequently unless it's a form submission
        if (timeSinceLastUpdate < minimumUpdateInterval && !window.justSubmittedForm) {
            console.log(`Update #${window.updateCount}: Skipping, last update was ${timeSinceLastUpdate}ms ago`);
            return window.maintenanceStats;
        }
        
        // Mark update as in progress
        window.updateInProgress = true;
        window.lastUpdateTime = now;
        
        const branchId = window.hotelBranchManager.getCurrentBranch();
        if (!branchId) {
            console.warn('No branch selected, cannot update maintenance stats');
            window.updateInProgress = false;
            return null;
        }

        console.log(`Update #${window.updateCount}: Getting stats for branch: ${branchId}`);

        // Get maintenance issues for the current branch
        const issuesSnapshot = await firebase.firestore()
            .collection('issues')
            .where('branchId', '==', branchId)
            .get();

        // Get elements
        const totalRoomsEl = document.getElementById('totalRooms');
        
        // Update total rooms count
        const branchData = window.hotelBranchManager.getBranchData();
        
        // Filter out room numbers containing "13"
        const totalRooms = branchData.rooms ? 
            Object.keys(branchData.rooms)
                .filter(roomNum => !String(roomNum).includes('13'))
                .length : 0;
        
        // Log room numbers for debugging
        if (branchData.rooms) {
            console.log(`[updateMaintenanceStats] Room numbers for branch ${branchId}:`, Object.keys(branchData.rooms));
        }
        
        console.log(`[updateMaintenanceStats] About to update UI. Total Rooms (excluding "13"): ${totalRooms}`); 

        console.log(`Update #${window.updateCount}: Setting UI counters: Total Rooms: ${totalRooms}`);
        
        // Update the global stats object
        window.maintenanceStats = {
            totalRooms
        };
        
        // Determine if we should use animation
        const isAfterSubmission = window.justSubmittedForm;
        
        // Update the counters
        if (totalRoomsEl) {
            totalRoomsEl.textContent = totalRooms || '0';
        }
        
        // Reset the submission flag and update state
        if (isAfterSubmission) {
            window.justSubmittedForm = false;
        }

        // Update is complete
        window.updateInProgress = false;
        
        // If there was a pending update and not immediately after a form submission,
        // schedule it after a reasonable delay
        if (window.pendingUpdate && !isAfterSubmission) {
            window.pendingUpdate = false;
            console.log(`Update #${window.updateCount}: Processing pending update`);
            setTimeout(() => updateMaintenanceStats(), 3000); // Run after a delay
        } else {
            window.pendingUpdate = false; // Clear pending update flag
        }

        console.log(`Update #${window.updateCount}: Complete`);
        return window.maintenanceStats;
    } catch (error) {
        console.error(`Update #${window.updateCount}: Error updating maintenance stats:`, error);
        window.updateInProgress = false; // Make sure to reset flag even on error
        return null;
    }
}

// Helper function to update counter directly without animation
function updateCounterDirectly(element, value) {
    if (element) {
        element.textContent = value;
    }
}

// Optimized counter animation function using requestAnimationFrame
function animateCounterOptimized(element, target, duration = 1000) {
    if (!element) return;
    
    // If we need an instant update, do it without animation
    if (window.justSubmittedForm) {
        element.textContent = target;
        return;
    }
    
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
        
        // Check if the page has a built-in branch selector (the select element in index.html)
        const hasBranchSelect = !!document.getElementById('branchSelect');
        
        // Try to initialize branch selector if available
        let branchSelectorInitialized = false;
        if (window.branchSelector) {
            try {
                if (!window.branchSelector.initialized) {
                    await window.branchSelector.initialize();
                    console.log("Branch selector initialization complete");
                } else {
                    console.log("Branch selector already initialized");
                }
                branchSelectorInitialized = true;
            } catch (selectorError) {
                console.warn('Branch selector initialization error:', selectorError);
                // Continue anyway - don't show an error if the page has its own branch selector
                if (!hasBranchSelect) {
                    console.warn('No fallback branch selector available');
                }
            }
        } else {
            // Only warn if there's no built-in branch selector on the page
            if (!hasBranchSelect) {
                console.warn('Branch selector component not available - continuing without it');
            } else {
                console.log('Using built-in branch selector from the page');
            }
        }
        
        // Check if branch is selected
        if (!window.hotelBranchManager.getCurrentBranch()) {
            console.log("No branch selected");
            
            // Only try to show branch selector if it's available and initialized
            if (branchSelectorInitialized && window.branchSelector) {
                console.log("Showing branch selector");
                window.branchSelector.showBranchSelector();
                
                // Check if we're in a new database with no branches
                const branches = await window.hotelBranchManager.getAllBranches();
                if (!branches || branches.length === 0) {
                    console.log("No branches found in database, showing initialization message");
                    showNotification("Welcome to PremierFix! It looks like you're using a new database. Please create a hotel branch to get started.", "info", 10000);
                }
            } else {
                // Only show warning if there's no way for the user to select a branch
                if (!hasBranchSelect) {
                    console.warn('Cannot show branch selector - no UI available for branch selection');
                    // Only show error message if there's no built-in branch selector
                    showNotification('Please select a branch to continue', 'info');
                } else {
                    console.log('Using page branch selector dropdown for branch selection');
                }
            }
            
            // Continue with initialization even without a branch selected
        }
        
        // Update branch information
        await updateBranchInfo();
        
        // Initialize Flatpickr
        initializeFlatpickr();
        
        // Initialize form event listeners
        initializeFormListeners();
        
        // Initialize dashboard controls
        initializeDashboardControls();
        
        // Set up controlled periodic updates
        setupPeriodicUpdates();
        
        // Initial update
        updateMaintenanceStats();
        
        console.log("Page initialization complete");
    } catch (error) {
        console.error('Error initializing page:', error);
        // Don't show this error for branch selector issues if we have a fallback
        if (!error.message || !error.message.includes('branch selector')) {
            showErrorMessage('Failed to initialize page. Please refresh and try again.');
        }
    }
}

// Setup controlled periodic updates
function setupPeriodicUpdates() {
    // Update date and time every second
    setInterval(updateDateTime, 1000);
    
    // Update maintenance stats every 5 minutes, but only if no update is in progress
    setInterval(() => {
        // Only update if it's been at least 5 seconds since the last manual update
        const now = Date.now();
        const timeSinceLastUpdate = now - window.lastUpdateTime;
        if (timeSinceLastUpdate > 5000 && !window.updateInProgress && !window.pendingUpdate) {
            updateMaintenanceStats();
        }
    }, 300000); // 5 minutes
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
        inline: false,
        static: false,
        clickOpens: true,
        closeOnSelect: false,
        onOpen: function() {
            this.element.blur(); // Prevent mobile keyboard from showing
        },
        onChange: function(selectedDates, dateStr) {
            if (selectedDates.length > 0) {
                dateTimeInput.value = dateStr;
            }
        }
    });
    
    // Force close the calendar on initialization
    if (dateTimePicker && typeof dateTimePicker.close === 'function') {
        setTimeout(() => {
            dateTimePicker.close();
            console.log("Forced flatpickr calendar to close on initialization");
        }, 100);
    }
}

// Initialize form event listeners
function initializeFormListeners() {
    console.log("initializeFormListeners called");
    const dateTimeInput = document.getElementById('dateTime');
    const roomNumberInput = document.getElementById('roomNumber');
    const locationSelect = document.getElementById('location');
    const priorityButtons = document.querySelectorAll('.priority-btn');
    const priorityInput = document.getElementById('priority');
    const takePhotoBtn = document.getElementById('takePhotoBtn');
    const uploadBtn = document.getElementById('uploadBtn');
    const criticalButton = document.getElementById('criticalButton');

    // Initialize critical request button
    if (criticalButton) {
        console.log("Critical button found, adding event listener");
        criticalButton.addEventListener('click', (event) => {
            // Prevent default action and stop propagation to avoid bubbling
            event.preventDefault();
            event.stopPropagation();
            
            console.log("CRITICAL BUTTON: Clicked!");
            
            // Prevent duplicate submissions
            if (window.isSubmitting) {
                console.log("CRITICAL BUTTON: Submission already in progress, ignoring click");
                return;
            }
            
            // Set flag to prevent duplicate submissions
            window.isSubmitting = true;
            
            // Set priority to critical
            priorityInput.value = 'critical';
            console.log("CRITICAL BUTTON: Set priority input value to 'critical'");
            
            // Reset any active priority buttons
            priorityButtons.forEach(btn => btn.classList.remove('active'));
            
            // Find and activate the critical priority button if it exists
            const criticalPriorityBtn = document.querySelector('.priority-btn[data-priority="critical"]');
            if (criticalPriorityBtn) {
                criticalPriorityBtn.classList.add('active');
                console.log("CRITICAL BUTTON: Activated critical priority button");
            } else {
                console.warn("CRITICAL BUTTON: Critical priority button not found");
            }
            
            // Get the form and submit it
            const form = document.getElementById('issueForm');
            if (form) {
                console.log("CRITICAL BUTTON: Found form with ID 'issueForm'");
                
                // Update submit button text to reflect critical request
                const submitButton = document.getElementById('submitButton');
                if (submitButton) {
                    submitButton.textContent = 'Submitting Critical Request...';
                    console.log("CRITICAL BUTTON: Updated submit button text");
                } else {
                    console.warn("CRITICAL BUTTON: Submit button not found");
                }
                
                // Verify that the hidden priority field is set correctly before submission
                // This is crucial to ensure the form submission uses the correct priority
                if (priorityInput && priorityInput.value !== 'critical') {
                    priorityInput.value = 'critical';
                    console.log("CRITICAL BUTTON: Double-checked priority input value");
                }
                
                console.log("CRITICAL BUTTON: Directly calling form handler");
                
                // Create a non-bubbling custom event to prevent multiple handlers from firing
                const customEvent = new Event('submit', { 
                    bubbles: false,  // Changed to false to prevent bubbling
                    cancelable: true
                });
                
                // Add critical flag to the event detail
                customEvent.detail = { critical: true };
                
                // Call the handler directly with our custom event
                handleFormSubmit(customEvent);
                
            } else {
                console.error("CRITICAL BUTTON: Form not found. Cannot submit critical request.");
                showErrorMessage('Form not found. Cannot submit critical request.');
                // Reset submission flag since we couldn't submit
                window.isSubmitting = false;
            }
        });
    } else {
        console.warn("Critical button not found on the page");
    }

    // Initialize photo buttons
    if (takePhotoBtn) {
        takePhotoBtn.addEventListener('click', handleTakePhoto);
    }
    
    if (uploadBtn) {
        uploadBtn.addEventListener('click', handleUploadPhoto);
    }

    // Initialize Switch Branch button
    const switchBranchBtn = document.getElementById('switchBranch');
    if (switchBranchBtn) {
        switchBranchBtn.addEventListener('click', function() {
            // Check if we have the modal branch selector
            if (window.branchSelector) {
                window.branchSelector.showBranchSelector();
            } else {
                // Check if we have a built-in branch selector in the page
                const branchSelect = document.getElementById('branchSelect');
                if (branchSelect) {
                    // Focus on the dropdown to prompt user selection
                    branchSelect.focus();
                    // Maybe trigger a click or show a tooltip
                    showNotification('Please select a branch from the dropdown', 'info');
                } else {
                    // Only show error if there's no way to select a branch
                    showNotification('Branch selector not available', 'error');
                }
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
    if (timeButtons && timeButtons.length > 0) {
        timeButtons.forEach(button => {
            if (button) {
                button.addEventListener('click', () => {
                    // Remove active class from all buttons
                    timeButtons.forEach(btn => {
                        if (btn && btn.classList) {
                            btn.classList.remove('active');
                        }
                    });
                    
                    // Add active class to clicked button
                    if (button.classList) {
                        button.classList.add('active');
                    }

                    selectedTime = button.dataset.time;
                    // Update the hidden input value
                    if (timePreferenceInput) {
                        timePreferenceInput.value = selectedTime;
                    }

                    // Show/hide datetime input based on selection
                    if (selectedTime === 'anytime') {
                        if (dateTimeContainer) {
                            dateTimeContainer.style.display = 'none';
                        }
                        if (dateTimeInput) {
                            dateTimeInput.removeAttribute('required');
                        }
                        if (dateTimePicker) {
                            dateTimePicker.clear();
                        }
                    } else {
                        if (dateTimeContainer) {
                            dateTimeContainer.style.display = 'block';
                        }
                        if (dateTimeInput) {
                            dateTimeInput.setAttribute('required', 'required');
                        }
                        if (dateTimeLabel) {
                            dateTimeLabel.textContent = selectedTime === 'before' ?
                                'Maintenance needed before:' :
                                'Maintenance needed after:';
                        }
                    }
                });
            }
        });
    }

    // Track if a form submission is in progress to prevent duplicates
    window.isSubmitting = false;
    
    document.body.addEventListener('submit', function(event) {
        // Check if the target of the submit event is the issue form
        if (event.target && event.target.id === 'issueForm') {
            // Check if this was already submitted by the critical button
            if (window.isSubmitting) {
                // Prevent duplicate submissions
                event.preventDefault();
                event.stopPropagation();
                console.log("Prevented duplicate form submission - submission already in progress");
                return;
            }
            
            // Check if this is a regular form submission (not from critical button)
            // If the priority is critical but it wasn't set via the critical button
            // this is likely a regular submission with priority already set to critical
            const priorityInput = document.getElementById('priority');
            const isCriticalSubmission = priorityInput && priorityInput.value === 'critical';
            
            // Set the flag to prevent duplicate submissions
            window.isSubmitting = true;
            
            // Add a log to track regular vs critical submissions
            console.log(`Regular form submission triggered. Priority: ${priorityInput?.value || 'unknown'}`);
            
            // If it is, call the original handler
            handleFormSubmit(event);
        }
    });
}

// Make initializeFormListeners globally available
window.initializeFormListeners = initializeFormListeners;

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

// Photo capture functionality
function handleTakePhoto() {
    // Check if the device has camera capability
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showNotification('Camera access is not supported by this browser or device. Please use the Upload Photo option instead.', 'info');
        // Automatically highlight the upload button to guide the user
        const uploadBtn = document.getElementById('uploadBtn');
        if (uploadBtn) {
            uploadBtn.classList.add('highlight');
            setTimeout(() => uploadBtn.classList.remove('highlight'), 2000);
        }
        return;
    }

    // First check if cameras are available
    navigator.mediaDevices.enumerateDevices()
        .then(devices => {
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            
            if (videoDevices.length === 0) {
                showNotification('No camera detected on your device. Please use the Upload Photo option instead.', 'info');
                // Automatically highlight the upload button to guide the user
                const uploadBtn = document.getElementById('uploadBtn');
                if (uploadBtn) {
                    uploadBtn.classList.add('highlight');
                    setTimeout(() => uploadBtn.classList.remove('highlight'), 2000);
                }
                return;
            }
            
            // Proceed with camera capture if devices are available
            initiateCameraCapture();
        })
        .catch(error => {
            console.error('Error checking for cameras:', error);
            showNotification('Could not check for camera availability. Please use the Upload Photo option.', 'warning');
        });

    // Function to initiate camera capture after verifying cameras exist
    function initiateCameraCapture() {
        // Create a modal for camera preview
        const modal = document.createElement('div');
        modal.className = 'photo-modal';
        modal.innerHTML = `
            <div class="photo-modal-content">
                <div class="photo-modal-header">
                    <h3>Take a Photo</h3>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="camera-container">
                    <video id="camera-preview" autoplay playsinline></video>
                    <canvas id="photo-canvas" style="display:none;"></canvas>
                </div>
                <div class="camera-controls">
                    <button id="capture-btn" class="capture-btn">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                        </svg>
                    </button>
                    <button id="retake-btn" class="retake-btn" style="display:none;">Retake</button>
                    <button id="confirm-btn" class="confirm-btn" style="display:none;">Use Photo</button>
                </div>
            </div>
        `;

        // Add modal styles
        const modalStyle = document.createElement('style');
        modalStyle.textContent = `
            .photo-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.8);
                z-index: 1000;
                display: flex;
                justify-content: center;
                align-items: center;
            }
            .photo-modal-content {
                background-color: white;
                border-radius: 10px;
                width: 90%;
                max-width: 500px;
                overflow: hidden;
                display: flex;
                flex-direction: column;
            }
            .photo-modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 15px;
                background-color: #511e58;
                color: white;
            }
            .photo-modal-header h3 {
                margin: 0;
            }
            .close-modal {
                background: none;
                border: none;
                color: white;
                font-size: 1.5rem;
                cursor: pointer;
            }
            .camera-container {
                position: relative;
                width: 100%;
                height: 0;
                padding-bottom: 75%; /* 4:3 aspect ratio */
                overflow: hidden;
            }
            #camera-preview, #photo-canvas {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                object-fit: cover;
                background-color: #000;
            }
            .camera-controls {
                display: flex;
                justify-content: center;
                padding: 15px;
                gap: 15px;
            }
            .capture-btn {
                width: 60px;
                height: 60px;
                border-radius: 50%;
                background-color: white;
                border: 3px solid #511e58;
                cursor: pointer;
                display: flex;
                justify-content: center;
                align-items: center;
            }
            .capture-btn svg {
                width: 40px;
                height: 40px;
                stroke: #511e58;
            }
            .retake-btn, .confirm-btn {
                padding: 10px 20px;
                border-radius: 20px;
                border: none;
                font-weight: bold;
                cursor: pointer;
            }
            .retake-btn {
                background-color: #f1f1f1;
                color: #333;
            }
            .confirm-btn {
                background-color: #511e58;
                color: white;
            }
            /* Highlight animation for upload button */
            @keyframes highlight-pulse {
                0% { box-shadow: 0 0 0 0 rgba(81, 30, 88, 0.7); }
                70% { box-shadow: 0 0 0 10px rgba(81, 30, 88, 0); }
                100% { box-shadow: 0 0 0 0 rgba(81, 30, 88, 0); }
            }
            .highlight {
                animation: highlight-pulse 1.5s ease-out;
                transform: scale(1.05);
                transition: transform 0.3s;
            }
        `;
        document.head.appendChild(modalStyle);
        document.body.appendChild(modal);

        // Get elements
        const closeModalBtn = modal.querySelector('.close-modal');
        const cameraPreview = modal.querySelector('#camera-preview');
        const photoCanvas = modal.querySelector('#photo-canvas');
        const captureBtn = modal.querySelector('#capture-btn');
        const retakeBtn = modal.querySelector('#retake-btn');
        const confirmBtn = modal.querySelector('#confirm-btn');
        
        let stream = null;
        let photoTaken = false;

        // Access the camera
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
            .then(mediaStream => {
                stream = mediaStream;
                cameraPreview.srcObject = mediaStream;
                cameraPreview.play();
            })
            .catch(error => {
                console.error('Error accessing camera:', error);
                
                // Provide more specific error messages based on the error
                if (error.name === 'NotFoundError') {
                    showNotification('No camera found on your device. Please use the Upload Photo option instead.', 'info');
                } else if (error.name === 'NotAllowedError') {
                    showNotification('Camera access denied. Please allow camera access in your browser settings.', 'warning');
                } else {
                    showNotification('Unable to access camera. Please check permissions.', 'error');
                }
                
                closeModal();
            });

        // Function to close the modal and release resources
        function closeModal() {
            // Stop all video tracks to release the camera
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            // Remove modal and style elements
            document.body.removeChild(modal);
            document.head.removeChild(modalStyle);
        }

        // Close modal event
        closeModalBtn.addEventListener('click', () => {
            closeModal();
        });

        // Capture photo
        captureBtn.addEventListener('click', () => {
            const context = photoCanvas.getContext('2d');
            
            // Set canvas dimensions to match video
            photoCanvas.width = cameraPreview.videoWidth;
            photoCanvas.height = cameraPreview.videoHeight;
            
            // Draw the current video frame on the canvas
            context.drawImage(cameraPreview, 0, 0, photoCanvas.width, photoCanvas.height);
            
            // Show the canvas with the captured photo
            photoCanvas.style.display = 'block';
            cameraPreview.style.display = 'none';
            
            // Show retake and confirm buttons, hide capture button
            captureBtn.style.display = 'none';
            retakeBtn.style.display = 'inline-block';
            confirmBtn.style.display = 'inline-block';
            
            photoTaken = true;
        });

        // Retake photo
        retakeBtn.addEventListener('click', () => {
            // Hide canvas, show video
            photoCanvas.style.display = 'none';
            cameraPreview.style.display = 'block';
            
            // Show capture button, hide retake and confirm buttons
            captureBtn.style.display = 'inline-block';
            retakeBtn.style.display = 'none';
            confirmBtn.style.display = 'none';
            
            photoTaken = false;
        });

        // Confirm photo
        confirmBtn.addEventListener('click', () => {
            if (!photoTaken) return;
            
            // Get the photo data URL from canvas
            const photoData = {
                type: 'camera',
                data: photoCanvas.toDataURL('image/jpeg'),
                filename: `photo_${Date.now()}.jpg`
            };
            
            // Store the photo data
            window.photoData = photoData;
            
            // Update photo indicator
            updatePhotoIndicator();
            
            // Close the modal
            closeModal();
            
            // Show confirmation
            showNotification('Photo captured successfully!', 'success');
        });
    }
}

// Make handleTakePhoto globally available
window.handleTakePhoto = handleTakePhoto;

// Handle photo uploads
function handleUploadPhoto() {
    // Create a file input element
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);
    
    // Define the change handler function separately so we can remove it later
    const handleFileSelection = function() {
        if (this.files && this.files[0]) {
            const file = this.files[0];
            
            // Check file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                showNotification('Image is too large. Maximum size is 5MB.', 'error');
                cleanup();
                return;
            }
            
            console.log('Photo selected:', file.name, 'Size:', Math.round(file.size/1024), 'KB', 'Type:', file.type);
            showNotification(`Processing photo: ${file.name}`, 'info');
            
            // Read the file
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    // Store the image data for form submission
                    window.photoData = {
                        type: 'upload',
                        data: e.target.result,
                        filename: file.name,
                        size: file.size,
                        type: file.type
                    };
                    
                    console.log('Photo data processed successfully, size:', Math.round(e.target.result.length/1024), 'KB');
                    
                    // Update UI to show a photo has been attached
                    updatePhotoIndicator();
                    
                    showNotification('Photo uploaded successfully!', 'success');
                    
                    // Clean up after successful processing
                    cleanup();
                } catch (error) {
                    console.error('Error processing photo data:', error);
                    showNotification('Error processing photo: ' + (error.message || 'Unknown error'), 'error');
                    cleanup();
                }
            };
            
            reader.onerror = function(error) {
                console.error('Error reading file:', error);
                showNotification('Error reading file: ' + (error.message || 'Unknown error'), 'error');
                cleanup();
            };
            
            try {
                reader.readAsDataURL(file);
            } catch (error) {
                console.error('Exception when reading file:', error);
                showNotification('Error accessing file: ' + (error.message || 'Unknown error'), 'error');
                cleanup();
            }
        } else {
            // No file selected, clean up anyway
            cleanup();
        }
    };
    
    // Clean up function to remove the input element
    const cleanup = function() {
        fileInput.removeEventListener('change', handleFileSelection);
        document.body.removeChild(fileInput);
    };
    
    // Add event listener for when a file is selected
    fileInput.addEventListener('change', handleFileSelection);
    
    // Trigger file selection dialog
    try {
        fileInput.click();
    } catch (error) {
        console.error('Error opening file selector:', error);
        showNotification('Could not open file selector: ' + (error.message || 'Unknown error'), 'error');
        cleanup();
    }
}

// Make handleUploadPhoto globally available
window.handleUploadPhoto = handleUploadPhoto;

// Update UI to show a photo has been attached
function updatePhotoIndicator() {
    const photoButtonsContainer = document.querySelector('.photo-buttons-container');
    
    // Remove existing indicator if any
    const existingIndicator = document.getElementById('photo-indicator');
    if (existingIndicator) {
        existingIndicator.remove();
    }
    
    if (photoButtonsContainer && window.photoData) {
        const indicator = document.createElement('div');
        indicator.id = 'photo-indicator';
        indicator.className = 'photo-indicator';
        
        const filename = window.photoData.filename || 'Image';
        const shortenedName = filename.length > 20 ? filename.substr(0, 17) + '...' : filename;
        const fileSize = window.photoData.size ? `(${Math.round(window.photoData.size / 1024)} KB)` : '';
        
        // Create HTML for the indicator
        const indicatorHTML = `
            <div class="photo-indicator-content">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
                <span>${shortenedName} ${fileSize}</span>
                <button class="remove-photo" title="Remove Photo">×</button>
            </div>
            <div class="photo-preview-container">
                <img src="${window.photoData.data}" alt="Preview" class="photo-preview">
            </div>
        `;
        
        indicator.innerHTML = indicatorHTML;
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .photo-indicator {
                margin-top: 15px;
                background: #f8f9fa;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
                transition: all 0.3s ease;
            }
            
            .photo-indicator:hover {
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            
            .photo-indicator-content {
                display: flex;
                align-items: center;
                padding: 10px 15px;
                background: #fff;
                border-bottom: 1px solid #e2e8f0;
            }
            
            .photo-indicator-content svg {
                color: var(--primary-color, #511e58);
                margin-right: 10px;
                flex-shrink: 0;
            }
            
            .photo-indicator-content span {
                flex: 1;
                font-size: 0.9rem;
                color: #4a5568;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            
            .remove-photo {
                background: none;
                border: none;
                color: #a0aec0;
                font-size: 1.2rem;
                cursor: pointer;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: all 0.2s ease;
            }
            
            .remove-photo:hover {
                background: #f1f1f1;
                color: #e53e3e;
            }
            
            .photo-preview-container {
                padding: 10px;
                background: #f1f1f1;
                text-align: center;
            }
            
            .photo-preview {
                max-width: 100%;
                max-height: 200px;
                border-radius: 4px;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            
            @media (max-width: 768px) {
                .photo-preview {
                    max-height: 150px;
                }
            }
        `;
        
        document.head.appendChild(style);
        
        // Add the indicator to the DOM
        photoButtonsContainer.appendChild(indicator);
        
        // Add click handler for the remove button
        const removeButton = indicator.querySelector('.remove-photo');
        if (removeButton) {
            removeButton.addEventListener('click', function() {
                // Clear photo data
                window.photoData = null;
                
                // Remove the indicator
                indicator.remove();
                
                // Show notification
                showNotification('Photo removed', 'info');
            });
        }
    }
}

// Form submission handler
async function handleFormSubmit(e) {
    console.log("[handleFormSubmit] Event listener triggered!");
    
    // Make sure we have a valid event object
    if (!e) {
        console.warn("[handleFormSubmit] No event object provided, creating a default one");
        e = new Event('submit', { bubbles: true, cancelable: true });
    }
    
    // Prevent default form submission
    e.preventDefault();
    
    // Detect if this is a critical submission from an event detail
    let isCriticalFromEvent = false;
    if (e.detail && e.detail.critical === true) {
        console.log("[handleFormSubmit] Critical flag detected in event detail");
        isCriticalFromEvent = true;
    }
    
    // Cancel any pending updates
    window.pendingUpdate = false;
    
    // Update selector to match the actual button ID in the HTML
    const submitButton = document.getElementById('submitButton');
    // Check if submit button exists
    if (!submitButton) {
        console.warn('Submit button not found in the form');
    }
    
    const roomNumber = document.getElementById('roomNumber')?.value || '';
    const location = document.getElementById('location')?.value || '';
    const category = document.getElementById('category')?.value || '';
    const description = document.getElementById('description')?.value.trim() || '';
    const authorName = document.getElementById('authorName')?.value.trim() || '';
    
    // Validate all required fields
    if (!category) {
        showErrorMessage('Please select a category');
        window.isSubmitting = false; // Reset submission flag on validation error
        return;
    }
    
    if (!description) {
        showErrorMessage('Please provide a description');
        window.isSubmitting = false; // Reset submission flag on validation error
        return;
    }
    
    if (!authorName) {
        showErrorMessage('Please enter your name');
        window.isSubmitting = false; // Reset submission flag on validation error
        return;
    }
    
    // Validate that either room number or location is provided
    if (!roomNumber && !location) {
        showErrorMessage('Please enter either a room number or select a location');
        window.isSubmitting = false; // Reset submission flag on validation error
        return;
    }

    // Check if we have a branch selected
    const branchId = window.hotelBranchManager?.getCurrentBranch();
    if (!branchId) {
        showErrorMessage('Please select a branch before submitting');
        window.isSubmitting = false; // Reset submission flag on validation error
        return;
    }
    console.log(`[handleFormSubmit] Using branch: ${branchId}`);

    // Get the priority value, checking for critical flag from event
    const priorityInput = document.getElementById('priority');
    
    // Ensure a default value if priorityInput doesn't exist or has no value
    let priority = priorityInput?.value || 'low';
    
    // If the event detail has a critical flag, override the priority
    if (isCriticalFromEvent) {
        priority = 'critical';
        if (priorityInput) {
            priorityInput.value = 'critical';
        }
        console.log("[handleFormSubmit] Priority overridden to critical from event");
    }
    
    const isCritical = priority === 'critical';
    console.log(`[handleFormSubmit] Priority: ${priority}, isCritical: ${isCritical}`);

    // Only modify button if it exists
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.classList.add('loading');
        submitButton.textContent = isCritical ? 'Submitting Critical Request...' : 'Submitting...';
    }
    
    // Get the datetime value only if not "anytime"
    const dateTimeInput = document.getElementById('dateTime');
    const timePreferenceInput = document.getElementById('timePreference');
    const timePreference = {
        type: timePreferenceInput?.value || 'anytime',
        datetime: (timePreferenceInput?.value !== 'anytime' && dateTimeInput) ? dateTimeInput.value : null
    };
    
    const issue = {
        branchId: branchId,
        roomNumber: roomNumber,
        location: location,
        category: category,
        description: description,
        timePreference: timePreference,
        authorName: authorName,
        priority: priority,
        dateCreated: new Date().toISOString(),
        createdAt: new Date(),
        status: 'New',
        photoData: window.photoData // Add photo data if available
    };

    console.log("[handleFormSubmit] Final issue data before save:", issue);

    try {
        // IMPORTANT: Save a reference to the original update function
        // before we potentially override it
        if (!window.originalUpdateFunction) {
            window.originalUpdateFunction = window.updateMaintenanceStats;
        }
        
        // Check if Firebase service is initialized
        if (!window.firebaseService) {
            console.error("[handleFormSubmit] Firebase service is not initialized!");
            window.isSubmitting = false; // Reset submission flag on error
            throw new Error("Firebase service is not available. Please refresh the page and try again.");
        }
        
        // ---> ADD LOG BEFORE CALL <---
        console.log("[handleFormSubmit] Preparing to call saveIssue. Issue data:", issue);

        // Use Firebase to save the issue
        const issueId = await window.firebaseService.saveIssue(issue);

        // ---> ADD LOG AFTER CALL <---
        console.log("[handleFormSubmit] Call to saveIssue completed. Returned issue ID:", issueId);

        console.log('Issue saved with ID:', issueId);
        
        // Store the ID of the issue we just saved to detect duplicate updates
        window.lastSavedIssueId = issueId;
        
        // Reset form - IMPORTANT: do this BEFORE showing success message
        // to ensure all form state is cleared
        resetForm();
        
        // Reset button UI immediately after form is reset
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.classList.remove('loading');
            submitButton.textContent = 'Regular Request';
        }
        
        // Set flag to use direct counter updates (no animation)
        window.justSubmittedForm = true;
        
        // Update maintenance stats to reflect the new issue
        // Force update by resetting the last update time
        window.lastUpdateTime = 0;
        
        // Enable Firebase update detection
        window.ignoreFirebaseEvents = true;
        
        // Update the UI with the new count
        try {
            const stats = await updateMaintenanceStats();
            console.log("[handleFormSubmit] Stats updated successfully:", stats);
            
            // Block additional updates for the next 30 seconds
            const blockDuration = 30000;
            window.blockUpdatesUntil = Date.now() + blockDuration;
            window.lastUpdateTime = Date.now();
            
            console.log(`Blocking automatic updates for the next ${blockDuration/1000} seconds`);
            
            // Show success message with priority that was just used for THIS submission
            showSuccessMessage(stats, isCritical);
            
            // Set a timeout to disable our Firebase update detection
            setTimeout(() => {
                window.ignoreFirebaseEvents = false;
                console.log('Firebase update detection disabled');
            }, blockDuration);
        } catch (statsError) {
            console.error("[handleFormSubmit] Error updating stats:", statsError);
            // Still show success message even if stats update fails
            showSuccessMessage(null, isCritical);
        }
        
        // Reset submission flag now that we're done
        window.isSubmitting = false;
        
    } catch (error) {
        console.error('[handleFormSubmit] Error saving issue:', error);
        // Show more detailed error message
        if (error.code) {
            console.error(`[handleFormSubmit] Error code: ${error.code}`);
        }
        
        // Reset submission flag on error
        window.isSubmitting = false;
        
        // Reset button UI on error
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.classList.remove('loading');
            submitButton.textContent = isCritical ? 'Critical Request' : 'Regular Request';
        }
        
        // Don't show error if the issue was actually saved
        if (!error.message || !error.message.includes('dateTimePicker')) {
            showErrorMessage(`Failed to save issue: ${error.message || 'Unknown error. Please try again.'}`);
        }
    }
}

// Expose the handler globally so it can be called from other scripts
window.handleFormSubmit = handleFormSubmit;

// Reset form
function resetForm() {
    const form = document.getElementById('issueForm');
    if (!form) {
        console.warn('Form not found, cannot reset');
        return;
    }
    
    form.reset();
    
    // Reset time selection - with null checks
    if (timeButtons && timeButtons.length > 0) {
        timeButtons.forEach(btn => {
            if (btn && btn.dataset && btn.dataset.time === 'anytime') {
                btn.classList.add('active');
            } else if (btn && btn.classList) {
                btn.classList.remove('active');
            }
        });
    }
    
    // Only manipulate DOM elements if they exist
    if (dateTimeContainer) {
        dateTimeContainer.style.display = 'none';
    }
    
    selectedTime = 'anytime';
    
    if (timePreferenceInput) {
        timePreferenceInput.value = 'anytime';
    }
    
    // Reset Flatpickr only if it exists
    if (dateTimePicker) {
        dateTimePicker.clear();
    }

    // Reset priority - ALWAYS set to default 'low' priority
    const priorityButtons = document.querySelectorAll('.priority-btn');
    const priorityInput = document.getElementById('priority');
    
    if (priorityButtons && priorityButtons.length > 0) {
        priorityButtons.forEach(btn => {
            if (btn && btn.classList) {
                btn.classList.remove('active');
            }
        });
        
        // Find and activate the low priority button
        const lowPriorityBtn = document.querySelector('.priority-btn[data-priority="low"]');
        if (lowPriorityBtn && lowPriorityBtn.classList) {
            lowPriorityBtn.classList.add('active');
        } else {
            // Fallback to first button if low not found
            const defaultPriority = document.querySelector('.priority-btn');
            if (defaultPriority && defaultPriority.classList) {
                defaultPriority.classList.add('active');
            }
        }
    }
    
    // IMPORTANT: Always reset the priority input value to 'low'
    if (priorityInput) {
        priorityInput.value = 'low';
    }
    
    // Reset photo data
    window.photoData = null;
    
    // Remove photo indicator if exists
    const photoIndicator = document.getElementById('photo-indicator');
    if (photoIndicator) {
        photoIndicator.remove();
    }
    
    // Make sure submit button text is reset to default
    const submitButton = document.getElementById('submitButton');
    if (submitButton) {
        submitButton.textContent = 'Regular Request';
        submitButton.disabled = false;
        submitButton.classList.remove('loading');
    }
    
    // Reset critical button appearance if needed
    const criticalButton = document.getElementById('criticalButton');
    if (criticalButton) {
        criticalButton.textContent = 'Critical Request';
        criticalButton.disabled = false;
        // Remove any highlight classes if they exist
        criticalButton.classList.remove('highlight', 'active', 'loading');
    }
    
    // Make sure the submission flag is reset
    window.isSubmitting = false;
    
    console.log("Form has been completely reset");
}

function showSuccessMessage(stats, isCritical = false) {
    // Create appropriate message based on priority of THIS submission only
    let message = '';
    let type = 'success';
    
    if (isCritical) {
        message = `CRITICAL REQUEST has been logged successfully! Your critical issue will be prioritized.`;
        type = 'error'; // Using error type for critical requests to make them stand out
    } else {
        message = `Issue has been logged successfully! Your maintenance request has been submitted.`;
        type = 'success';
    }
    
    // Use window.showNotification if available (modern system from index.html)
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
    } else {
        // Fallback to legacy notification
        showLegacyNotification(message, type);
    }
}

function showErrorMessage(message) {
    // Use window.showNotification if available (modern system from index.html)
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, 'error');
    } else {
        // Fallback to legacy notification
        showLegacyNotification(message, 'error');
    }
}

// Renamed to avoid conflicts with window.showNotification
function showLegacyNotification(message, type = 'success', duration = 3000) {
    console.log(`[LEGACY NOTIFICATION] ${message} (${type})`);
    
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
    
    // Hide notification after duration
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, duration);
}

// Document ready - initialize the page
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM Content Loaded - Initializing page");
    
    // Close any flatpickr calendars that might be open on page load
    setTimeout(() => {
        // Check for any visible flatpickr calendars
        const visibleCalendars = document.querySelectorAll('.flatpickr-calendar:not(.hidden)');
        if (visibleCalendars.length > 0) {
            console.log(`Found ${visibleCalendars.length} visible flatpickr calendars, hiding them`);
            visibleCalendars.forEach(calendar => {
                calendar.style.display = 'none';
                calendar.classList.remove('open');
                calendar.classList.add('hidden');
            });
        }
        
        // If we have access to the flatpickr instance, close it properly
        if (window.dateTimePicker && typeof window.dateTimePicker.close === 'function') {
            window.dateTimePicker.close();
        }
    }, 500); // Give a slight delay to ensure the page is fully loaded
    
    initializePage();
});

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
            
            // Use the modern notification system if available
            const tabName = this.textContent.trim();
            if (typeof window.showNotification === 'function') {
                window.showNotification(`${tabName} tab selected`, 'info');
            } else {
                // Fallback to legacy notification
                showLegacyNotification(`${tabName} tab selected`, 'info');
            }
        });
    });

    // Set the first tab as active by default
    if (dashboardTabs.length > 0 && !document.querySelector('.dashboard-tab.active')) {
        dashboardTabs[0].classList.add('active');
    }
});

// Make initializePage function globally available
window.initializePage = initializePage; 
// Time selection functionality
const timeButtons = document.querySelectorAll('.time-btn');
const dateTimeContainer = document.getElementById('dateTimeContainer');
const dateTimeLabel = document.getElementById('dateTimeLabel');
const timePreferenceInput = document.getElementById('timePreference');
let selectedTime = 'anytime';
let dateTimePicker; // Store the Flatpickr instance

// Initialize the page
async function initializePage() {
    try {
        console.log("Starting page initialization...");
        
        // Initialize Firebase
        await window.firebaseService.initialize();
        console.log("Firebase initialization complete");
        
        // Initialize Flatpickr
        initializeFlatpickr();
        
        // Initialize form event listeners
        initializeFormListeners();
        
        console.log("Page initialization complete");
        
        // Clear console after a small delay to ensure all logs are shown
        setTimeout(() => {
            console.clear();
            console.log("✨ PremierFix Issue Logger Ready!");
        }, 1000);
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

    // Make fields mutually exclusive
    roomNumberInput.addEventListener('input', function() {
        if (this.value) {
            locationSelect.value = '';
        }
    });

    locationSelect.addEventListener('change', function() {
        if (this.value) {
            roomNumberInput.value = '';
        }
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

// Form submission handler
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const submitButton = document.querySelector('.btn-submit');
    submitButton.disabled = true;
    submitButton.classList.add('loading');
    submitButton.textContent = 'Submitting...';
    
    const roomNumber = document.getElementById('roomNumber').value;
    const location = document.getElementById('location').value;
    
    // Validate that either room number or location is provided
    if (!roomNumber && !location) {
        alert('Please enter either a room number or select a location');
        submitButton.disabled = false;
        submitButton.classList.remove('loading');
        submitButton.textContent = 'Submit Issue';
        return;
    }

    // Get the datetime value only if not "anytime"
    const dateTimeInput = document.getElementById('dateTime');
    const timePreference = {
        type: timePreferenceInput.value,
        datetime: timePreferenceInput.value !== 'anytime' ? dateTimeInput.value : null
    };
    
    const issue = {
        roomNumber: roomNumber,
        location: location,
        category: document.getElementById('category').value,
        description: document.getElementById('description').value.trim(),
        timePreference: timePreference,
        authorName: document.getElementById('authorName').value.trim(),
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
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background-color: ${type === 'success' ? 'var(--success-color)' : 'var(--error-color, #e74c3c)'};
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
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Initialize the page when DOM is loaded
document.addEventListener('DOMContentLoaded', initializePage); 
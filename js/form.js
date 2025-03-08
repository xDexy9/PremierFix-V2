// Time selection functionality
const timeButtons = document.querySelectorAll('.time-btn');
const dateTimeContainer = document.getElementById('dateTimeContainer');
const dateTimeLabel = document.getElementById('dateTimeLabel');
const timePreferenceInput = document.getElementById('timePreference');
let selectedTime = 'anytime';

// Initialize Flatpickr
const dateTimePicker = flatpickr("#dateTime", {
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

// Form submission handler
document.getElementById('issueForm').addEventListener('submit', async function(e) {
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
    
    const issue = {
        roomNumber: roomNumber,
        location: location,
        category: document.getElementById('category').value,
        description: document.getElementById('description').value.trim(),
        timePreference: {
            type: timePreferenceInput.value,
            datetime: timePreferenceInput.value !== 'anytime' ? dateTimeInput.value : null
        },
        authorName: document.getElementById('authorName').value.trim(),
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
        showErrorMessage('Failed to save issue. Please try again.');
    } finally {
        submitButton.disabled = false;
        submitButton.classList.remove('loading');
        submitButton.textContent = 'Submit Issue';
    }
});

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
    dateTimePicker.clear();
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
        right: 20px;
        background-color: ${type === 'success' ? 'var(--success-color)' : 'var(--error-color, #e74c3c)'};
        color: white;
        padding: 1rem 2rem;
        border-radius: 4px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease-out;
        z-index: 1000;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
} 
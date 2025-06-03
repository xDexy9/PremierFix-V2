/**
 * PremierFix Utils
 * Utility functions for the PremierFix application
 */

// Show loading spinner
function showLoading() {
    const loadingContainer = document.getElementById('loadingContainer');
    if (loadingContainer) {
        loadingContainer.classList.add('active');
    }
}

// Hide loading spinner
function hideLoading() {
    const loadingContainer = document.getElementById('loadingContainer');
    if (loadingContainer) {
        loadingContainer.classList.remove('active');
    }
}

// Show notification
function showNotification(message, type = 'info', duration = 5000) {
    const container = document.getElementById('notificationContainer');
    if (!container) return;

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-message">${message}</span>
        </div>
    `;
    
    container.appendChild(notification);
    
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

// Show success notification
function showSuccess(message, duration = 5000) {
    showNotification(message, 'success', duration);
}

// Show error notification
function showError(message, duration = 5000) {
    showNotification(message, 'error', duration);
}

// Show warning notification
function showWarning(message, duration = 5000) {
    showNotification(message, 'warning', duration);
}

// Show info notification
function showInfo(message, duration = 5000) {
    showNotification(message, 'info', duration);
}

// Log messages with timestamp and prefix
function logInfo(message) {
    console.log(`[INFO ${new Date().toISOString()}] ${message}`);
}

function logWarning(message) {
    console.warn(`[WARNING ${new Date().toISOString()}] ${message}`);
}

function logError(message) {
    console.error(`[ERROR ${new Date().toISOString()}] ${message}`);
}

// Format date for display
function formatDate(dateObj) {
    if (!dateObj) return 'N/A';
    
    // If it's a Firebase timestamp, convert to JS Date
    if (dateObj && typeof dateObj.toDate === 'function') {
        dateObj = dateObj.toDate();
    }
    
    // If it's a string, convert to Date
    if (typeof dateObj === 'string') {
        dateObj = new Date(dateObj);
    }
    
    // Check if date is valid
    if (!(dateObj instanceof Date) || isNaN(dateObj)) {
        return 'Invalid Date';
    }
    
    return dateObj.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

// Format time for display
function formatTime(dateObj) {
    if (!dateObj) return 'N/A';
    
    // If it's a Firebase timestamp, convert to JS Date
    if (dateObj && typeof dateObj.toDate === 'function') {
        dateObj = dateObj.toDate();
    }
    
    // If it's a string, convert to Date
    if (typeof dateObj === 'string') {
        dateObj = new Date(dateObj);
    }
    
    // Check if date is valid
    if (!(dateObj instanceof Date) || isNaN(dateObj)) {
        return 'Invalid Time';
    }
    
    return dateObj.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Format date and time for display
function formatDateTime(dateObj) {
    if (!dateObj) return 'N/A';
    
    return `${formatDate(dateObj)} at ${formatTime(dateObj)}`;
}

// Export all utility functions
window.utils = {
    showLoading,
    hideLoading,
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    logInfo,
    logWarning,
    logError,
    formatDate,
    formatTime,
    formatDateTime
};

// Also expose them globally for backward compatibility
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.showNotification = showNotification;
window.showSuccess = showSuccess;
window.showError = showError;
window.showWarning = showWarning;
window.showInfo = showInfo; 
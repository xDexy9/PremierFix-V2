/**
 * Modern Notification System
 * This script creates beautiful, animated notifications with gradient backgrounds.
 * Include this file on all pages for consistent notifications.
 */

// Add the notification styles if they don't already exist
function ensureNotificationStyles() {
    if (!document.getElementById('modern-notification-styles')) {
        const notificationStyles = `
        <style id="modern-notification-styles">
            @keyframes notification-appear {
                0% { 
                    transform: translate(-50%, -50%) translateY(-30px) scale(0.9);
                    opacity: 0;
                }
                100% { 
                    transform: translate(-50%, -50%) translateY(0) scale(1);
                    opacity: 1;
                }
            }

            @keyframes notification-icon-pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.1); }
                100% { transform: scale(1); }
            }

            /* Block old notifications when modern ones are shown */
            body:has(.modern-notification-container) .notification {
                display: none !important;
            }

            /* Modern notification styles with specific naming */
            .modern-notification-container {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) translateY(-100px);
                max-width: 400px;
                width: 90%;
                z-index: 99999 !important; /* Extremely high z-index */
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.4s ease, visibility 0.4s ease, transform 0.4s ease;
                border-radius: 0.75rem;
                overflow: hidden;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                font-size: 16px;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
            }

            .modern-notification-container.show {
                opacity: 1;
                visibility: visible;
                transform: translate(-50%, -50%) scale(1) translateY(0);
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2), 0 0 1px rgba(0, 0, 0, 0.1);
                animation: notification-appear 0.4s ease-out forwards;
            }

            .modern-notification-container.hide {
                opacity: 0;
                transform: translate(-50%, -50%) translateY(100px);
            }

            .modern-notification-alert {
                position: relative;
                border-left-width: 4px;
                padding: 16px;
                border-radius: 0.75rem;
                display: flex;
                align-items: center;
                transition: all 0.3s ease-in-out;
                transform-origin: center;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                background-color: #FFFFFF; /* Fallback */
            }

            .modern-notification-alert:hover {
                transform: scale(1.03);
                box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
            }

            .modern-notification-alert svg {
                height: 1.75rem;
                width: 1.75rem;
                flex-shrink: 0;
                margin-right: 1rem;
                filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.1));
                animation: notification-icon-pulse 1.5s ease-in-out infinite;
            }

            .modern-notification-alert p {
                font-size: 1.1rem;
                font-weight: 600;
                margin: 0;
                letter-spacing: -0.01em;
                line-height: 1.5;
                text-shadow: 0 1px 0 rgba(255, 255, 255, 0.5);
                font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, system-ui, Roboto, 'Helvetica Neue', sans-serif;
            }

            /* Success notification */
            .modern-notification-alert.success {
                background: linear-gradient(135deg, #dcfce7 0%, #86efac 100%);
                border-color: #4ade80;
                color: #166534;
                box-shadow: 0 4px 12px rgba(74, 222, 128, 0.2);
            }

            .modern-notification-alert.success svg {
                color: #15803d;
            }

            .modern-notification-alert.success:hover {
                background: linear-gradient(135deg, #bbf7d0 0%, #4ade80 100%);
            }

            /* Info notification */
            .modern-notification-alert.info {
                background: linear-gradient(135deg, #dbeafe 0%, #93c5fd 100%);
                border-color: #3b82f6;
                color: #1e40af;
                box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
            }

            .modern-notification-alert.info svg {
                color: #1d4ed8;
            }

            .modern-notification-alert.info:hover {
                background: linear-gradient(135deg, #bfdbfe 0%, #60a5fa 100%);
            }

            /* Warning notification */
            .modern-notification-alert.warning {
                background: linear-gradient(135deg, #fef3c7 0%, #fcd34d 100%);
                border-color: #f59e0b;
                color: #854d0e;
                box-shadow: 0 4px 12px rgba(245, 158, 11, 0.2);
            }

            .modern-notification-alert.warning svg {
                color: #b45309;
            }

            .modern-notification-alert.warning:hover {
                background: linear-gradient(135deg, #fde68a 0%, #f59e0b 100%);
            }

            /* Error notification */
            .modern-notification-alert.error {
                background: linear-gradient(135deg, #fee2e2 0%, #fca5a5 100%);
                border-color: #ef4444;
                color: #991b1b;
                box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
            }

            .modern-notification-alert.error svg {
                color: #dc2626;
            }

            .modern-notification-alert.error:hover {
                background: linear-gradient(135deg, #fecaca 0%, #ef4444 100%);
            }

            /* Dark mode support for notifications */
            @media (prefers-color-scheme: dark) {
                .modern-notification-alert.success {
                    background: linear-gradient(135deg, #065f46 0%, #059669 100%);
                    border-color: #4ade80;
                    color: #ffffff;
                    box-shadow: 0 4px 12px rgba(5, 150, 105, 0.4);
                }

                .modern-notification-alert.success svg {
                    color: #4ade80;
                }

                .modern-notification-alert.info {
                    background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
                    border-color: #3b82f6;
                    color: #ffffff;
                    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
                }

                .modern-notification-alert.info svg {
                    color: #3b82f6;
                }

                .modern-notification-alert.warning {
                    background: linear-gradient(135deg, #78350f 0%, #d97706 100%);
                    border-color: #f59e0b;
                    color: #ffffff;
                    box-shadow: 0 4px 12px rgba(217, 119, 6, 0.4);
                }

                .modern-notification-alert.warning svg {
                    color: #f59e0b;
                }

                .modern-notification-alert.error {
                    background: linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%);
                    border-color: #ef4444;
                    color: #ffffff;
                    box-shadow: 0 4px 12px rgba(220, 38, 38, 0.4);
                }

                .modern-notification-alert.error svg {
                    color: #ef4444;
                }
                
                .modern-notification-alert p {
                    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
                }
            }
        </style>`;
        document.head.insertAdjacentHTML('beforeend', notificationStyles);
    }
}

// Main notification function
window.showNotification = function(message, type = 'success', duration = 3000) {
    // Make sure styles are present
    ensureNotificationStyles();
    
    console.log(`[MODERN NOTIFICATION SYSTEM] ${message} (${type})`);
    
    // Track notification counts for debugging
    window.notificationCount = window.notificationCount || 0;
    window.notificationCount++;
    
    // Keep track of active notifications
    window.activeNotifications = window.activeNotifications || [];
    
    // Force cleanup of any existing notifications (both old and new)
    const oldNotifications = document.querySelectorAll('.notification');
    oldNotifications.forEach(notification => {
        try {
            if (notification.classList.contains('show')) {
                notification.classList.remove('show');
            }
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        } catch (e) {
            console.error('Error cleaning up old notification:', e);
        }
    });
    
    // Clean up modern notifications
    const existingNotifications = document.querySelectorAll('.modern-notification-container');
    existingNotifications.forEach(notification => {
        try {
            notification.classList.add('hide');
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    notification.remove();
                }
            }, 400); // Match transition duration
        } catch (e) {
            console.error('Error cleaning up modern notification:', e);
        }
    });
    
    // Create the notification container with unique ID for tracking
    const notificationId = `notification-${Date.now()}-${window.notificationCount}`;
    const container = document.createElement('div');
    container.id = notificationId;
    container.className = 'modern-notification-container';
    
    // Create appropriate icon based on notification type
    let icon = '';
    switch(type) {
        case 'success':
            icon = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>';
            break;
        case 'error':
            icon = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>';
            break;
        case 'warning':
            icon = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>';
            break;
        case 'info':
        default:
            icon = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
            break;
    }
    
    // Create notification content with our new class names
    container.innerHTML = `
        <div class="modern-notification-alert ${type}">
            ${icon}
            <p>${message}</p>
        </div>
    `;
    
    // Add notification to DOM
    document.body.appendChild(container);
    
    // Track this notification
    window.activeNotifications.push({
        id: notificationId,
        element: container,
        addedAt: Date.now(),
        type: type,
        message: message
    });
    
    // Ensure it's properly inserted before showing with a slightly longer delay
    setTimeout(() => {
        if (document.body.contains(container)) {
            container.classList.add('show');
        }
    }, 100);
    
    // Remove after duration
    setTimeout(() => {
        if (document.body.contains(container)) {
            container.classList.add('hide');
            
            // Update tracking
            window.activeNotifications = window.activeNotifications.filter(n => n.id !== notificationId);
            
            setTimeout(() => {
                if (document.body.contains(container)) {
                    container.remove();
                }
            }, 400); // Match transition duration
        }
    }, duration);
    
    // Return the notification for potential programmatic control
    return container;
};

// Fallback notification function for backward compatibility
function showLegacyNotification(message, type = 'success', duration = 3000) {
    // Always use the modern notification if available
    if (typeof window.showNotification === 'function') {
        return window.showNotification(message, type, duration);
    }
    
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

// Test function to demonstrate all notification types
function testNotifications() {
    console.log("TESTING MODERN NOTIFICATION SYSTEM");
    console.log("==================================");
    
    // Reset notification counts
    window.notificationCount = 0;
    window.activeNotifications = [];
    
    // Display success notification immediately
    showNotification("SUCCESS: This is a modern notification system", "success", 3000);
    
    // Display info notification after 4 seconds
    setTimeout(() => {
        showNotification("INFO: Modern notification system - test 2", "info", 3000);
    }, 4000);
    
    // Display warning notification after 8 seconds
    setTimeout(() => {
        showNotification("WARNING: Modern notification system - test 3", "warning", 3000);
    }, 8000);
    
    // Display error notification after 12 seconds
    setTimeout(() => {
        showNotification("ERROR: Modern notification system - test 4", "error", 3000);
    }, 12000);
    
    // Final notification after all others to confirm
    setTimeout(() => {
        showNotification("All notification tests completed", "success", 3000);
    }, 16000);
}

// Initialize the notification system
document.addEventListener('DOMContentLoaded', function() {
    ensureNotificationStyles();
}); 
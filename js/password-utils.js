/**
 * Password Utilities for PremierFix
 * This file contains functionality for secure admin access
 */

// Store the correct password in plaintext (for fallback) and hash
const CORRECT_PASSWORD = "PremierFixManager800!?#";
const PASSWORD_HASH = "98faa038845033f29e3e4dcfb6012f54db000443a93b867a9ce6fd01f9708623";

// Track login status and click count
let isLoggedIn = false;
let clickCount = 0;

// SHA256 hash function in case the library is not available
async function sha256(message) {
    // Use the built-in crypto API if available
    if (window.crypto && window.crypto.subtle) {
        try {
            // Convert string to ArrayBuffer
            const msgBuffer = new TextEncoder().encode(message);
            // Hash the message
            const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
            // Convert ArrayBuffer to hex string
            return Array.from(new Uint8Array(hashBuffer))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');
        } catch (e) {
            console.error('Crypto API failed:', e);
            // Fall back to the direct password comparison
            return null;
        }
    }
    
    console.warn('Crypto API not available, using direct password comparison');
    return null;
}

// Create the password prompt overlay and modal
function createPasswordPrompt(title = 'Admin Access Required', callback) {
    // Only create if it doesn't already exist
    if (document.getElementById('passwordPromptOverlay')) {
        return document.getElementById('passwordPromptOverlay');
    }
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'passwordPromptOverlay';
    overlay.className = 'password-prompt-overlay';
    
    // Create modal
    overlay.innerHTML = `
        <div class="password-prompt-modal">
            <h2 class="password-prompt-title">${title}</h2>
            <input type="password" class="password-prompt-input" placeholder="Enter admin password" autofocus>
            <div class="password-prompt-error"></div>
            <div class="password-prompt-actions">
                <button class="password-prompt-cancel">Cancel</button>
                <button class="password-prompt-submit">Submit</button>
            </div>
        </div>
    `;
    
    // Add to body
    document.body.appendChild(overlay);
    
    // Setup event listeners
    const modal = overlay.querySelector('.password-prompt-modal');
    const input = overlay.querySelector('.password-prompt-input');
    const error = overlay.querySelector('.password-prompt-error');
    const submitBtn = overlay.querySelector('.password-prompt-submit');
    const cancelBtn = overlay.querySelector('.password-prompt-cancel');
    
    // Submit button
    submitBtn.addEventListener('click', () => {
        validatePassword(input.value, callback, error);
    });
    
    // Enter key in input
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            validatePassword(input.value, callback, error);
        }
    });
    
    // Cancel button
    cancelBtn.addEventListener('click', () => {
        hidePasswordPrompt();
    });
    
    // Click outside to close
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            hidePasswordPrompt();
        }
    });
    
    // Escape key to close
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlay.classList.contains('visible')) {
            hidePasswordPrompt();
        }
    });
    
    return overlay;
}

// Show the password prompt
function showPasswordPrompt(title = 'Admin Access Required', callback) {
    const overlay = createPasswordPrompt(title, callback);
    const input = overlay.querySelector('.password-prompt-input');
    
    // Reset the input and error
    input.value = '';
    overlay.querySelector('.password-prompt-error').textContent = '';
    
    // Add body class to prevent background scrolling
    document.body.classList.add('modal-prompt-open');
    
    // Show with animation
    requestAnimationFrame(() => {
        overlay.classList.add('visible');
        input.focus();
    });
}

// Hide the password prompt
function hidePasswordPrompt() {
    const overlay = document.getElementById('passwordPromptOverlay');
    if (!overlay) return;
    
    // Remove body class
    document.body.classList.remove('modal-prompt-open');
    
    // Hide with animation
    overlay.classList.remove('visible');
}

// Validate password - both direct comparison and hash comparison
async function validatePassword(password, callback, errorElement) {
    try {
        // Always check direct password match first for reliability
        if (password === CORRECT_PASSWORD) {
            handleSuccessfulLogin(callback);
            return true;
        }
        
        // If direct comparison failed, try hash comparison as a backup
        const inputHash = await sha256(password);
        
        // If we got a valid hash and it matches, log in
        if (inputHash && inputHash.toLowerCase() === PASSWORD_HASH.toLowerCase()) {
            handleSuccessfulLogin(callback);
            return true;
        }
        
        // If we get here, password is invalid
        showInvalidPasswordError(errorElement);
        return false;
    } catch (error) {
        console.error('Password validation error:', error);
        showValidationError(errorElement);
        return false;
    }
}

// Handle successful login
function handleSuccessfulLogin(callback) {
    // Set login status
    isLoggedIn = true;
    
    // Hide the prompt
    hidePasswordPrompt();
    
    // Show success notification if available
    if (typeof window.showNotification === 'function') {
        window.showNotification('Admin access granted. Redirecting...', 'success');
    }
    
    // Execute callback if provided
    if (typeof callback === 'function') {
        callback();
    }
    
    // Log the success
    console.log('Admin access granted, redirecting to dashboard');
    
    // Redirect to dashboard
    setTimeout(() => {
        window.location.href = 'dashboard.html';
    }, 1000);
}

// Show invalid password error
function showInvalidPasswordError(errorElement) {
    if (errorElement) {
        errorElement.textContent = 'Invalid password. Please try again.';
        errorElement.classList.add('shake');
        setTimeout(() => errorElement.classList.remove('shake'), 500);
    }
}

// Show validation error
function showValidationError(errorElement) {
    if (errorElement) {
        errorElement.textContent = 'An error occurred. Please try again.';
        errorElement.classList.add('shake');
        setTimeout(() => errorElement.classList.remove('shake'), 500);
    }
}

// Initialize event listeners
function initializePasswordListeners() {
    // Look for the hidden trigger element
    const hiddenTrigger = document.getElementById('hiddenIssueTrigger');
    
    if (hiddenTrigger) {
        console.log('Hidden trigger element found, setting up admin access');
        
        // Add click listener
        hiddenTrigger.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Increment click count
            clickCount++;
            
            // Check if we've reached 3 clicks
            if (clickCount >= 3) {
                console.log('Admin access triggered after 3 clicks');
                
                // Reset click count
                clickCount = 0;
                
                // Show password prompt
                showPasswordPrompt('Enter Admin Password', function() {
                    // Callback handled in handleSuccessfulLogin
                });
            }
        });
    } else {
        console.warn('Hidden trigger element not found');
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initializePasswordListeners);

// Style for shake animation
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
    
    .shake {
        animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
    }
`;
document.head.appendChild(shakeStyle);

// Expose functions globally
window.passwordUtils = {
    showPasswordPrompt,
    hidePasswordPrompt,
    isLoggedIn: () => isLoggedIn
}; 
// Database Initializer
// This script adds a floating button to initialize the database from any page

/*
document.addEventListener('DOMContentLoaded', function() {
    // Create the floating button container
    const buttonContainer = document.createElement('div');
    buttonContainer.style.position = 'fixed';
    buttonContainer.style.bottom = '20px';
    buttonContainer.style.right = '20px';
    buttonContainer.style.zIndex = '9999';
    buttonContainer.style.display = 'flex';
    buttonContainer.style.flexDirection = 'column';
    buttonContainer.style.gap = '10px';
    
    // Create the initialize database button
    const initButton = document.createElement('button');
    initButton.innerHTML = '<i class="fas fa-database"></i> Initialize Database';
    initButton.style.backgroundColor = '#511e58';
    initButton.style.color = 'white';
    initButton.style.border = 'none';
    initButton.style.borderRadius = '4px';
    initButton.style.padding = '10px 15px';
    initButton.style.cursor = 'pointer';
    initButton.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    initButton.style.display = 'flex';
    initButton.style.alignItems = 'center';
    initButton.style.justifyContent = 'center';
    initButton.style.gap = '5px';
    
    // Add hover effect
    initButton.onmouseover = function() {
        this.style.backgroundColor = '#3a1540';
    };
    initButton.onmouseout = function() {
        this.style.backgroundColor = '#511e58';
    };
    
    // Add click event
    initButton.onclick = async function() {
        try {
            // Change button state
            this.disabled = true;
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Initializing...';
            
            // Initialize Firebase if not already initialized
            if (typeof initializeFirebase === 'function') {
                await initializeFirebase();
            }
            
            // Initialize the database
            if (typeof initializeNewDatabase === 'function') {
                const success = await initializeNewDatabase();
                
                if (success) {
                    this.innerHTML = '<i class="fas fa-check"></i> Database Initialized';
                    this.style.backgroundColor = '#28a745';
                    
                    // Show success message
                    showInitMessage('Database initialized successfully! You can now use the application.', 'success');
                    
                    // Remove button after a delay
                    setTimeout(() => {
                        this.remove();
                    }, 3000);
                } else {
                    this.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Initialization Failed';
                    this.style.backgroundColor = '#dc3545';
                    this.disabled = false;
                    
                    // Show error message
                    showInitMessage('Failed to initialize database. Please try again.', 'error');
                }
            } else {
                this.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Function Not Found';
                this.style.backgroundColor = '#dc3545';
                this.disabled = false;
                
                // Show error message
                showInitMessage('Initialization function not found. Please check your code.', 'error');
            }
        } catch (error) {
            console.error('Error initializing database:', error);
            
            this.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error';
            this.style.backgroundColor = '#dc3545';
            this.disabled = false;
            
            // Show error message
            showInitMessage(`Error initializing database: ${error.message}`, 'error');
        }
    };
    
    // Create the test database button
    const testButton = document.createElement('button');
    testButton.innerHTML = '<i class="fas fa-vial"></i> Test Database';
    testButton.style.backgroundColor = '#3a6073';
    testButton.style.color = 'white';
    testButton.style.border = 'none';
    testButton.style.borderRadius = '4px';
    testButton.style.padding = '10px 15px';
    testButton.style.cursor = 'pointer';
    testButton.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    testButton.style.display = 'flex';
    testButton.style.alignItems = 'center';
    testButton.style.justifyContent = 'center';
    testButton.style.gap = '5px';
    
    // Add hover effect
    testButton.onmouseover = function() {
        this.style.backgroundColor = '#2a4a5a';
    };
    testButton.onmouseout = function() {
        this.style.backgroundColor = '#3a6073';
    };
    
    // Add click event
    testButton.onclick = function() {
        window.location.href = 'firebase-test.html';
    };
    
    // Add buttons to container
    buttonContainer.appendChild(initButton);
    buttonContainer.appendChild(testButton);
    
    // Add container to body
    document.body.appendChild(buttonContainer);
    
    // Function to show initialization messages
    function showInitMessage(message, type) {
        // Check if showNotification function exists
        if (typeof showNotification === 'function') {
            showNotification(message, type, 5000);
            return;
        }
        
        // Create a notification element if showNotification doesn't exist
        const notification = document.createElement('div');
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.left = '50%';
        notification.style.transform = 'translateX(-50%)';
        notification.style.padding = '15px 20px';
        notification.style.borderRadius = '4px';
        notification.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
        notification.style.zIndex = '10000';
        notification.style.maxWidth = '80%';
        notification.style.textAlign = 'center';
        
        // Set colors based on type
        if (type === 'error') {
            notification.style.backgroundColor = '#f8d7da';
            notification.style.color = '#721c24';
            notification.style.border = '1px solid #f5c6cb';
        } else if (type === 'success') {
            notification.style.backgroundColor = '#d4edda';
            notification.style.color = '#155724';
            notification.style.border = '1px solid #c3e6cb';
        } else {
            notification.style.backgroundColor = '#d1ecf1';
            notification.style.color = '#0c5460';
            notification.style.border = '1px solid #bee5eb';
        }
        
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // Remove after 5 seconds
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
}); 
*/

// Database initializer has been disabled
console.log('Database initializer buttons have been disabled'); 
// Room Audit Functionality
document.addEventListener('DOMContentLoaded', async function() {
    // Initialize loading indicator
    const loadingContainer = document.getElementById('loadingContainer');
    const showLoading = () => {
        loadingContainer.classList.add('active');
    };
    const hideLoading = () => {
        loadingContainer.classList.remove('active');
    };

    // Get form elements
    const roomNumberInput = document.getElementById('roomNumber');
    const auditNotesInput = document.getElementById('auditNotes');
    const photoInput = document.getElementById('photoInput');
    const imagePreview = document.getElementById('imagePreview');
    const submitAuditBtn = document.getElementById('submitAuditBtn');
    
    // Get all checkboxes
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    
    // Initialize state
    let currentBranch = null;
    let photoFile = null;
    
    // Initialize Firebase
    try {
        showLoading();
        await initializeFirebase();
        const { db } = await getFirebaseInstances();
        if (!db) {
            throw new Error('Failed to initialize Firebase database');
        }
        
        // Get current branch
        currentBranch = window.hotelBranchManager.getCurrentBranch();
        if (!currentBranch) {
            showNotification('Please select a branch first.', 'warning');
        }
        
        // Set up event listeners
        setupEventListeners();
        
        hideLoading();
    } catch (error) {
        console.error('Initialization error:', error);
        hideLoading();
        showNotification('Failed to initialize application. Please refresh the page.', 'error');
    }
    
    // Set up event listeners
    function setupEventListeners() {
        // Photo upload handler
        photoInput.addEventListener('change', handlePhotoUpload);
        
        // Submit audit handler
        submitAuditBtn.addEventListener('click', submitAudit);
    }
    
    // Handle photo upload
    function handlePhotoUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        // Store the file for later upload
        photoFile = file;
        
        // Preview image is handled in the inline script in the HTML file
    }
    
    // Submit audit to Firebase
    async function submitAudit() {
        try {
            // Validate inputs
            if (!validateForm()) {
                return;
            }
            
            showLoading();
            
            // Get current branch
            const branchId = window.hotelBranchManager.getCurrentBranch();
            if (!branchId) {
                hideLoading();
                showNotification('Please select a branch first.', 'warning');
                return;
            }
            
            // Collect form data
            const roomNumber = roomNumberInput.value.trim();
            const notes = auditNotesInput.value.trim();
            
            // Collect checked issues
            const issues = [];
            checkboxes.forEach(checkbox => {
                if (checkbox.checked) {
                    // Save the lowercase ID directly to match filter values
                    issues.push(checkbox.id.toLowerCase());
                }
            });
            
            // Upload photo if available
            let imageUrl = null;
            let photoUploadFailed = false;
            if (photoFile) {
                try {
                    imageUrl = await uploadPhoto(branchId, roomNumber);
                    if (!imageUrl) {
                        photoUploadFailed = true;
                    }
                } catch (uploadError) {
                    console.error('Photo upload failed:', uploadError);
                    photoUploadFailed = true;
                }
            }
            
            // Prepare notes with image upload status if needed
            let finalNotes = notes;
            if (photoUploadFailed) {
                finalNotes = `${notes}\n\n[NOTE: Photo evidence failed to upload due to a CORS/network issue. This is expected in local development environments and doesn't affect the audit data.]`;
                showNotification('Photo could not be uploaded due to CORS restrictions, but audit will be saved without the image.', 'warning');
            }
            
            // Create audit object
            const auditData = {
                branchId,
                roomNumber,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                issues,
                notes: finalNotes,
                imageUrl,
                photoAttempted: photoFile !== null,
                photoUploaded: imageUrl !== null
            };
            
            // Save to Firestore
            const { db } = await getFirebaseInstances();
            await db.collection('roomAudits').add(auditData);
            
            // Show success message
            showNotification('Room audit submitted successfully!', 'success');
            
            // Reset form
            resetForm();
            
            hideLoading();
            
        } catch (error) {
            console.error('Error submitting audit:', error);
            hideLoading();
            showNotification('Failed to submit audit. Please try again.', 'error');
        }
    }
    
    // Upload photo to Firebase Storage
    async function uploadPhoto(branchId, roomNumber) {
        try {
            const { storage } = await getFirebaseInstances();
            
            // Generate a unique filename
            const timestamp = new Date().getTime();
            const filename = `${branchId}_${roomNumber}_${timestamp}.jpg`;
            const storageRef = storage.ref(`room-audits/${filename}`);
            
            // Add CORS handling with a timeout
            const uploadTask = storageRef.put(photoFile);
            
            // Create a promise that resolves on success or rejects on error
            return new Promise((resolve, reject) => {
                // Set a timeout for the upload
                const timeoutId = setTimeout(() => {
                    reject(new Error('Upload timed out - possible CORS issue'));
                }, 15000); // 15 seconds timeout
                
                uploadTask.on('state_changed',
                    // Progress tracking if needed
                    (snapshot) => {
                        // Optional: track upload progress here
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        console.log('Upload progress: ' + Math.round(progress) + '%');
                    },
                    // Error handling
                    (error) => {
                        clearTimeout(timeoutId);
                        console.error('Error uploading photo:', error);
                        
                        // Detailed error message
                        let errorMessage = 'Failed to upload photo';
                        if (error.code === 'storage/unauthorized' || error.message.includes('CORS')) {
                            errorMessage = 'CORS policy blocked the photo upload. This is common in development environments.';
                            // Show a detailed notification about CORS issues
                            showCorsHelpNotification();
                            reject(new Error('CORS error: Firebase Storage may not be configured for local development'));
                        } else {
                            reject(error);
                        }
                    },
                    // Success handling
                    async () => {
                        clearTimeout(timeoutId);
                        try {
                            const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                            resolve(downloadURL);
                        } catch (urlError) {
                            console.error('Error getting download URL:', urlError);
                            reject(urlError);
                        }
                    }
                );
            });
        } catch (error) {
            console.error('Error in upload process:', error);
            // Return null to indicate no image was uploaded
            return null;
        }
    }
    
    // Show a helpful notification about CORS issues
    function showCorsHelpNotification() {
        // Create a special notification for CORS issues
        const notification = document.createElement('div');
        notification.className = 'notification info';
        notification.style.width = '400px';
        notification.style.maxWidth = '90%';
        
        notification.innerHTML = `
            <div class="notification-content" style="padding: 15px;">
                <h4 style="margin-top: 0; color: #3a7bd5;">Photo Upload Failed - CORS Issue</h4>
                <p>This is a common issue in development environments when testing with a local server (127.0.0.1).</p>
                <p><strong>Why this happens:</strong> Firebase Storage requires special configuration to allow uploads from development URLs.</p>
                <p><strong>Your audit will still be saved</strong> without the photo.</p>
                <p style="margin-bottom: 5px;"><strong>Solutions:</strong></p>
                <ul style="margin-top: 0; padding-left: 20px;">
                    <li>Deploy the app to Firebase Hosting</li>
                    <li>Configure CORS settings in Firebase Storage</li>
                    <li>Use Firebase Emulators for local development</li>
                </ul>
                <div style="display: flex; justify-content: space-between; margin-top: 10px;">
                    <button id="moreCorsInfoBtn" style="background: #3a7bd5; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">More Info</button>
                    <button id="dismissCorsHelp" style="background: #64748b; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">Dismiss</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Add animation class after a small delay
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Add event listener to More Info button
        const moreInfoButton = notification.querySelector('#moreCorsInfoBtn');
        moreInfoButton.addEventListener('click', () => {
            // Close the notification
            notification.classList.remove('show');
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
            
            // Show the CORS help modal if it exists
            if (typeof showCorsHelpModal === 'function') {
                showCorsHelpModal();
            } else {
                // If the modal function doesn't exist, create a simple alert
                alert('CORS issues are common in development environments. Your audit will still be saved without the photo.');
            }
        });
        
        // Add event listener to dismiss button
        const dismissButton = notification.querySelector('#dismissCorsHelp');
        dismissButton.addEventListener('click', () => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        });
        
        // Auto-dismiss after 20 seconds
        setTimeout(() => {
            if (document.body.contains(notification)) {
                notification.classList.remove('show');
                setTimeout(() => {
                    if (document.body.contains(notification)) {
                        document.body.removeChild(notification);
                    }
                }, 300);
            }
        }, 20000);
    }
    
    // Validate form inputs
    function validateForm() {
        // Check room number
        if (!roomNumberInput.value.trim()) {
            showNotification('Please enter a room number.', 'warning');
            roomNumberInput.focus();
            return false;
        }
        
        // Check if at least one issue is selected
        let issueSelected = false;
        checkboxes.forEach(checkbox => {
            if (checkbox.checked) {
                issueSelected = true;
            }
        });
        
        // Allow form submission even if no issues are selected
        // This supports the case where room is perfect and has no issues
        
        return true;
    }
    
    // Reset form after submission
    function resetForm() {
        roomNumberInput.value = '';
        auditNotesInput.value = '';
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        photoFile = null;
        imagePreview.style.display = 'none';
        photoInput.value = ''; // Reset file input
    }
    
    // Show notification
    function showNotification(message, type = 'info') {
        // Check if notification function exists in the global scope
        if (typeof window.showNotification === 'function') {
            // Use the modern notification system
            window.showNotification(message, type);
        } else {
            console.warn('Modern notification system not available, using fallback');
            
            // Create a simple notification (fallback)
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            notification.innerHTML = `
                <div class="notification-content">
                    <span>${message}</span>
                </div>
            `;
            
            // Add styles (if they don't already exist)
            if (!document.getElementById('fallback-notification-styles')) {
                const style = document.createElement('style');
                style.id = 'fallback-notification-styles';
                style.textContent = `
                    .notification {
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        padding: 15px 20px;
                        border-radius: 8px;
                        background-color: white;
                        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                        z-index: 1000;
                        transition: all 0.3s ease;
                        opacity: 0;
                        transform: translateY(-20px);
                        max-width: 300px;
                    }
                    
                    .notification.show {
                        opacity: 1;
                        transform: translateY(0);
                    }
                    
                    .notification.success {
                        border-left: 4px solid #4ade80;
                    }
                    
                    .notification.warning {
                        border-left: 4px solid #f59e0b;
                    }
                    
                    .notification.error {
                        border-left: 4px solid #ef4444;
                    }
                    
                    .notification.info {
                        border-left: 4px solid #3a7bd5;
                    }
                `;
                document.head.appendChild(style);
            }
            
            document.body.appendChild(notification);
            
            // Show notification
            setTimeout(() => {
                notification.classList.add('show');
            }, 10);
            
            // Remove notification after a few seconds
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => {
                    if (document.body.contains(notification)) {
                        document.body.removeChild(notification);
                    }
                }, 300);
            }, 3000);
        }
    }
}); 
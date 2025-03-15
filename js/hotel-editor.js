// Hotel Branch Editor

class HotelEditorUI {
    constructor() {
        this.initialized = false;
        this.branches = [];
    }

    async initialize() {
        try {
            if (this.initialized) {
                console.log('Hotel editor already initialized');
                return true;
            }
            
            console.log('Initializing hotel editor UI');
            
            // Initialize event listeners
            this.setupEventListeners();
            
            // Load branches
            await this.loadBranches();
            
            this.initialized = true;
            console.log('Hotel editor UI initialized successfully');
            return true;
        } catch (error) {
            console.error('Error initializing hotel editor UI:', error);
            this.showError('Failed to initialize hotel editor. Please refresh the page.');
            return false;
        }
    }

    setupEventListeners() {
        // Branch setup modal
        const branchSetupModal = document.getElementById('branchSetupModal');
        const branchSetupForm = document.getElementById('branchSetupForm');
        const totalFloorsInput = document.getElementById('totalFloors');
        const addNewBranchBtn = document.getElementById('addNewBranchBtn');

        if (!branchSetupModal) {
            console.error('Branch setup modal not found in the DOM');
            return;
        }

        if (!branchSetupForm) {
            console.error('Branch setup form not found in the DOM');
            return;
        }

        console.log('Setting up event listeners for hotel editor');

        // Close buttons
        const closeButtons = document.querySelectorAll('.close-btn');
        closeButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Find the parent modal and hide it
                const modal = button.closest('.modal');
                if (modal) {
                    modal.style.display = 'none';
                }
            });
        });

        // Close modal when clicking outside the modal content
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.addEventListener('click', (event) => {
                // Only close if the click is directly on the modal background (not on its children)
                if (event.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });

        // Close modal with Escape key
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                // Hide any visible modals
                modals.forEach(modal => {
                    if (modal.style.display === 'block') {
                        modal.style.display = 'none';
                    }
                });
            }
        });

        // Add new branch button
        if (addNewBranchBtn) {
            addNewBranchBtn.addEventListener('click', () => {
                // Show the branch setup modal
                if (branchSetupModal) {
                    branchSetupModal.style.display = 'block';
                }
                
                // Reset the form
                if (branchSetupForm) {
                    branchSetupForm.reset();
                }
                
                // Clear any previous floor setup
                const floorSetup = document.getElementById('floorSetup');
                if (floorSetup) {
                    floorSetup.innerHTML = '';
                }

                // Verify form elements exist after showing the modal
                const branchNameInput = document.getElementById('branchName');
                const branchAddressInput = document.getElementById('branchAddress');
                const totalFloorsInput = document.getElementById('totalFloors');

                if (!branchNameInput || !branchAddressInput || !totalFloorsInput) {
                    console.error('Form elements not found after showing modal');
                    this.showError('Error: Form elements not found. Please try again.');
                    return;
                }
            });
        } else {
            console.error('Add new branch button not found');
        }

        // Handle total floors input
        if (totalFloorsInput) {
            totalFloorsInput.addEventListener('change', () => {
                const floors = parseInt(totalFloorsInput.value) || 0;
                console.log('Total floors changed to:', floors);
                this.updateFloorSetup(floors);
            });
        } else {
            console.error('Total floors input not found');
        }

        // Handle branch setup form submission
        if (branchSetupForm) {
            branchSetupForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                console.log('Form submitted');

                // Verify form elements exist before handling submission
                const branchNameInput = document.getElementById('branchName');
                const branchAddressInput = document.getElementById('branchAddress');
                const totalFloorsInput = document.getElementById('totalFloors');

                if (!branchNameInput || !branchAddressInput || !totalFloorsInput) {
                    console.error('Form elements not found during submission');
                    this.showError('Error: Form elements not found. Please try again.');
                    return;
                }

                await this.handleBranchSetup();
            });
        } else {
            console.error('Branch setup form not found for event listener');
        }
    }

    async loadBranches() {
        try {
            showLoading();
            
            if (!window.hotelBranchManager) {
                throw new Error('Hotel branch manager not initialized');
            }
            
            this.branches = await window.hotelBranchManager.getAllBranches();
            
            const tableBody = document.getElementById('branchTableBody');
            
            if (!tableBody) {
                console.error('Branch table body not found');
                return;
            }
            
            if (this.branches.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center">No branches found. Add your first branch!</td>
                    </tr>
                `;
                hideLoading();
                return;
            }
            
            tableBody.innerHTML = this.branches.map(branch => {
                const roomCount = Object.keys(branch.rooms || {}).length;
                
                return `
                    <tr data-branch-id="${branch.id}">
                        <td>${branch.name}</td>
                        <td>${branch.address}</td>
                        <td>${branch.totalFloors || 0}</td>
                        <td>${roomCount}</td>
                        <td>
                            <button class="action-btn edit-branch" data-branch-id="${branch.id}">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/>
                                </svg>
                                Edit
                            </button>
                            <button class="action-btn delete delete-branch" data-branch-id="${branch.id}">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                                    <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                                </svg>
                                Delete
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
            
            // Add event listeners for edit and delete buttons
            this.setupBranchActions();
            
            hideLoading();
        } catch (error) {
            console.error('Error loading branches:', error);
            this.showError('Failed to load hotel branches');
            hideLoading();
        }
    }

    setupBranchActions() {
        // Edit branch buttons
        const editButtons = document.querySelectorAll('.edit-branch');
        editButtons.forEach(button => {
            button.addEventListener('click', () => {
                const branchId = button.dataset.branchId;
                this.editBranch(branchId);
            });
        });
        
        // Delete branch buttons
        const deleteButtons = document.querySelectorAll('.delete-branch');
        deleteButtons.forEach(button => {
            button.addEventListener('click', () => {
                const branchId = button.dataset.branchId;
                this.deleteBranch(branchId);
            });
        });
    }

    async editBranch(branchId) {
        try {
            showLoading();
            
            // Find the branch in the loaded branches
            const branch = this.branches.find(b => b.id === branchId);
            
            if (!branch) {
                throw new Error('Branch not found');
            }
            
            // Populate the form with branch data
            const branchNameInput = document.getElementById('branchName');
            const branchAddressInput = document.getElementById('branchAddress');
            const totalFloorsInput = document.getElementById('totalFloors');
            const branchSetupModal = document.getElementById('branchSetupModal');
            
            if (!branchNameInput || !branchAddressInput || !totalFloorsInput || !branchSetupModal) {
                throw new Error('Form elements not found');
            }
            
            branchNameInput.value = branch.name;
            branchAddressInput.value = branch.address;
            totalFloorsInput.value = branch.totalFloors;
            
            // Set branch ID as a data attribute on the form
            const branchSetupForm = document.getElementById('branchSetupForm');
            if (branchSetupForm) {
                branchSetupForm.dataset.branchId = branchId;
            }
            
            // Update floor setup
            this.updateFloorSetup(branch.totalFloors, branch.rooms);
            
            // Show the modal
            branchSetupModal.style.display = 'block';
            
            hideLoading();
        } catch (error) {
            console.error('Error editing branch:', error);
            this.showError('Failed to load branch data for editing');
            hideLoading();
        }
    }

    async deleteBranch(branchId) {
        try {
            if (!confirm('Are you sure you want to delete this branch? This action cannot be undone.')) {
                return;
            }
            
            showLoading();
            
            if (!window.hotelBranchManager) {
                throw new Error('Hotel branch manager not initialized');
            }
            
            await window.hotelBranchManager.deleteBranch(branchId);
            
            // Refresh the branch list
            await this.loadBranches();
            
            this.showNotification('Branch deleted successfully');
            
            hideLoading();
        } catch (error) {
            console.error('Error deleting branch:', error);
            this.showError('Failed to delete branch');
            hideLoading();
        }
    }

    updateFloorSetup(totalFloors, existingRooms = {}) {
        const floorSetup = document.getElementById('floorSetup');
        if (!floorSetup) {
            console.error('Floor setup container not found');
            return;
        }
        
        floorSetup.innerHTML = '';

        // Create a map of floor to room ranges
        const floorRoomRanges = {};
        
        // If we have existing rooms, calculate the room ranges for each floor
        if (existingRooms && Object.keys(existingRooms).length > 0) {
            for (const [roomNum, roomData] of Object.entries(existingRooms)) {
                const floor = roomData.floor;
                const roomNumber = parseInt(roomNum);
                
                if (!floorRoomRanges[floor]) {
                    floorRoomRanges[floor] = { min: roomNumber, max: roomNumber };
                } else {
                    floorRoomRanges[floor].min = Math.min(floorRoomRanges[floor].min, roomNumber);
                    floorRoomRanges[floor].max = Math.max(floorRoomRanges[floor].max, roomNumber);
                }
            }
        }

        for (let floor = 1; floor <= totalFloors; floor++) {
            const floorDiv = document.createElement('div');
            floorDiv.className = 'floor-setup';
            
            // Get room range for this floor if it exists
            const roomRange = floorRoomRanges[floor] || { min: '', max: '' };
            
            floorDiv.innerHTML = `
                <h3>Floor ${floor}</h3>
                <div class="form-group">
                    <label>Room Range for Floor ${floor}</label>
                    <div class="room-range">
                        <input type="number" class="room-start" min="1" placeholder="Start number" required value="${roomRange.min}">
                        <span>to</span>
                        <input type="number" class="room-end" min="1" placeholder="End number" required value="${roomRange.max}">
                    </div>
                    <div class="error-message"></div>
                </div>
            `;
            floorSetup.appendChild(floorDiv);

            // Add validation for room range
            const startInput = floorDiv.querySelector('.room-start');
            const endInput = floorDiv.querySelector('.room-end');
            const errorMessage = floorDiv.querySelector('.error-message');

            const validateRoomRange = () => {
                const start = parseInt(startInput.value);
                const end = parseInt(endInput.value);
                
                if (start && end) {
                    if (start >= end) {
                        errorMessage.textContent = 'End number must be greater than start number';
                        return false;
                    }
                    
                    errorMessage.textContent = '';
                    return true;
                }
                return false;
            };

            [startInput, endInput].forEach(input => {
                input.addEventListener('input', validateRoomRange);
            });
        }
    }

    async handleBranchSetup() {
        try {
            // Get form elements with error checking
            const branchNameElement = document.getElementById('branchName');
            const branchAddressElement = document.getElementById('branchAddress');
            const totalFloorsElement = document.getElementById('totalFloors');
            const branchSetupForm = document.getElementById('branchSetupForm');
            
            if (!branchNameElement || !branchNameElement.value) {
                console.error('Branch name input element not found or empty');
                this.showError('Please enter a branch name');
                return;
            }
            
            if (!branchAddressElement || !branchAddressElement.value) {
                console.error('Branch address input element not found or empty');
                this.showError('Please enter a branch address');
                return;
            }
            
            if (!totalFloorsElement || !totalFloorsElement.value) {
                console.error('Total floors input element not found or empty');
                this.showError('Please enter the number of floors');
                return;
            }
            
            const branchName = branchNameElement.value.trim();
            const branchAddress = branchAddressElement.value.trim();
            const totalFloors = parseInt(totalFloorsElement.value);
            
            // Check if we're editing an existing branch
            const branchId = branchSetupForm ? branchSetupForm.dataset.branchId : null;
            const isEditing = !!branchId;
            
            console.log("Form values:", {
                branchName,
                branchAddress,
                totalFloors,
                isEditing,
                branchId
            });
            
            if (!branchName) {
                this.showError('Please enter a branch name');
                return;
            }
            
            if (!branchAddress) {
                this.showError('Please enter a branch address');
                return;
            }
            
            if (!totalFloors || totalFloors <= 0) {
                this.showError('Please enter a valid number of floors');
                return;
            }
            
            const branchData = {
                id: branchId || Date.now().toString(),
                name: branchName,
                address: branchAddress,
                totalFloors: totalFloors,
                rooms: {}
            };

            // Validate all room ranges
            const floorSetups = document.querySelectorAll('.floor-setup');
            if (!floorSetups || floorSetups.length === 0) {
                console.error('No floor setups found');
                this.showError('Please set up at least one floor');
                return;
            }

            let isValid = true;
            let roomCount = 0;

            floorSetups.forEach((floorSetup, index) => {
                const floor = index + 1;
                const startInput = floorSetup.querySelector('.room-start');
                const endInput = floorSetup.querySelector('.room-end');

                if (!startInput || !endInput) {
                    console.error(`Room inputs not found for floor ${floor}`);
                    isValid = false;
                    this.showError(`Room range inputs missing for floor ${floor}`);
                    return;
                }

                const start = parseInt(startInput.value);
                const end = parseInt(endInput.value);

                if (isNaN(start) || isNaN(end)) {
                    isValid = false;
                    this.showError(`Please enter valid room numbers for floor ${floor}`);
                    return;
                }

                if (start && end && start < end) {
                    // Generate room numbers
                    for (let roomNum = start; roomNum <= end; roomNum++) {
                        branchData.rooms[roomNum] = {
                            floor,
                            available: true
                        };
                        roomCount++;
                    }
                } else {
                    isValid = false;
                    this.showError(`Please check room range for floor ${floor}`);
                    return;
                }
            });

            if (!isValid) {
                return;
            }
            
            if (roomCount > 500) {
                this.showError('Too many rooms (maximum 500). Please use smaller room ranges.');
                return;
            }
            
            // Show loading indicator
            showLoading();

            console.log("About to save branch data:", branchData);
            
            try {
                // Save branch data
                if (!window.hotelBranchManager) {
                    throw new Error('Hotel branch manager not initialized');
                }
                
                // Ensure Firebase is initialized
                if (typeof firebase === 'undefined' || !firebase.firestore) {
                    throw new Error('Firebase not initialized. Please refresh the page and try again.');
                }
                
                await window.hotelBranchManager.saveBranchSetup(branchData);
                
                // Hide loading indicator
                hideLoading();
                
                // Close setup modal and refresh branch list
                const setupModal = document.getElementById('branchSetupModal');
                if (setupModal) {
                    setupModal.style.display = 'none';
                }
                
                // Clear the branch ID from the form
                if (branchSetupForm) {
                    delete branchSetupForm.dataset.branchId;
                }
                
                await this.loadBranches();
                
                // Show success message
                this.showNotification(isEditing ? 'Branch updated successfully' : 'Branch created successfully');
            } catch (saveError) {
                console.error('Error in saveBranchSetup:', saveError);
                hideLoading();
                this.showError(saveError.message || 'Failed to save branch setup');
            }
        } catch (error) {
            // Hide loading indicator
            hideLoading();
            
            console.error('Error in handleBranchSetup:', error);
            
            // Show user-friendly error message
            const errorMessage = error.message || 'Failed to save branch setup';
            this.showError(errorMessage);
        }
    }

    showNotification(message) {
        console.log('Notification:', message);
        
        // Try to use the global notification system
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, 'success');
            return;
        }
        
        // Create a custom notification if the global one isn't available
        this.createCustomNotification(message, 'success');
    }

    showError(message) {
        console.error('Error:', message);
        
        // Try to use the global error notification system
        if (typeof window.showError === 'function') {
            window.showError(message);
            return;
        }
        
        // Try to use the global notification system with error type
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, 'error');
            return;
        }
        
        // Create a custom notification if the global ones aren't available
        this.createCustomNotification(message, 'error');
    }
    
    createCustomNotification(message, type = 'success') {
        // Create a notification element
        const notification = document.createElement('div');
        notification.className = `custom-notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
                <button class="notification-close">&times;</button>
            </div>
        `;
        
        // Add styles if they don't exist
        if (!document.getElementById('custom-notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'custom-notification-styles';
            styles.textContent = `
                .custom-notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 15px 20px;
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
                
                .custom-notification.success {
                    background-color: #d4edda;
                    border-left: 4px solid #28a745;
                    color: #155724;
                }
                
                .custom-notification.error {
                    background-color: #f8d7da;
                    border-left: 4px solid #dc3545;
                    color: #721c24;
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
}

// Initialize hotel editor
document.addEventListener('DOMContentLoaded', () => {
    window.hotelEditor = new HotelEditorUI();
    window.hotelEditor.initialize();
}); 
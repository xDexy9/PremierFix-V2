// Branch Selector UI

class BranchSelectorUI {
    constructor() {
        this.initialized = false;
    }

    async initialize() {
        try {
            if (this.initialized) {
                console.log('Branch selector already initialized');
                return true;
            }
            
            console.log('Initializing branch selector UI');
            
            // Create and append modal HTML
            const modalCreated = this.createModalHTML();
            if (!modalCreated) {
                console.error('Failed to create modals');
                return false;
            }
            
            // Verify that modals were created
            const branchSelectorModal = document.getElementById('branchSelectorModal');
            
            if (!branchSelectorModal) {
                console.error('Failed to create branch selector modal');
                return false;
            }
            
            // Initialize event listeners
            this.setupEventListeners();
            
            // Check if branch is selected
            const selectedBranch = localStorage.getItem('selectedBranch');
            if (!selectedBranch) {
                console.log('No branch selected, showing branch selector');
                this.showBranchSelector();
            } else {
                console.log('Branch already selected:', selectedBranch);
            }
            
            this.initialized = true;
            console.log('Branch selector UI initialized successfully');
            return true;
        } catch (error) {
            console.error('Error initializing branch selector UI:', error);
            this.showError('Failed to initialize branch selector. Please refresh the page.');
            return false;
        }
    }

    createModalHTML() {
        try {
            // Check if modals already exist to prevent duplicates
            if (document.getElementById('branchSelectorModal')) {
                console.log('Branch selector modal already exists, skipping creation');
                return true;
            }

            // Create a container for the modals if it doesn't exist
            let modalContainer = document.getElementById('branch-selector-container');
            if (!modalContainer) {
                modalContainer = document.createElement('div');
                modalContainer.id = 'branch-selector-container';
            }

            const modalHTML = `
                <div id="branchSelectorModal" class="modal">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h2>Select Hotel Branch</h2>
                            <button class="close-btn">&times;</button>
                        </div>
                        <div id="branchList" class="branch-list"></div>
                        <div class="branch-selector-footer">
                            <a href="hoteleditor.html" class="admin-link">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M12.854.146a.5.5 0 0 0-.707 0L10.5 1.793 14.207 5.5l1.647-1.646a.5.5 0 0 0 0-.708l-3-3zm.646 6.061L9.793 2.5 3.293 9H3.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.207l6.5-6.5zm-7.468 7.468A.5.5 0 0 1 6 13.5V13h-.5a.5.5 0 0 1-.5-.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.5-.5V10h-.5a.499.499 0 0 1-.175-.032l-.179.178a.5.5 0 0 0-.11.168l-2 5a.5.5 0 0 0 .65.65l5-2a.5.5 0 0 0 .168-.11l.178-.178z"/>
                                </svg>
                                Manage Hotel Branches
                            </a>
                        </div>
                    </div>
                </div>
            `;

            // Set the HTML content
            modalContainer.innerHTML = modalHTML;

            // Make sure the container is in the document
            if (!modalContainer.parentNode) {
                document.body.appendChild(modalContainer);
            }

            // Add styles for the footer
            const style = document.createElement('style');
            style.textContent = `
                .branch-selector-footer {
                    padding: 1rem;
                    border-top: 1px solid #eee;
                    text-align: center;
                }
                
                .admin-link {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    color: #3a7bd5;
                    text-decoration: none;
                    padding: 0.5rem 1rem;
                    border-radius: 4px;
                    transition: all 0.2s;
                    font-size: 0.9rem;
                }
                
                .admin-link:hover {
                    background: rgba(58, 123, 213, 0.1);
                }
            `;
            document.head.appendChild(style);

            console.log('Branch selector modal created and added to document');
            return true;
        } catch (error) {
            console.error('Error in createModalHTML:', error);
            this.showError('Failed to create branch selector. Please try again.');
            return false;
        }
    }

    setupEventListeners() {
        // Branch selector modal
        const branchSelectorModal = document.getElementById('branchSelectorModal');
        const branchList = document.getElementById('branchList');

        if (!branchSelectorModal) {
            console.error('Branch selector modal not found in the DOM');
            return;
        }

        console.log('Setting up event listeners for branch selector');

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

        // Load and display branches
        this.loadBranches();
    }

    async loadBranches() {
        try {
            const branches = await window.hotelBranchManager.getAllBranches();
            const branchList = document.getElementById('branchList');
            
            if (!branchList) {
                console.error('Branch list element not found');
                return;
            }
            
            if (branches.length === 0) {
                branchList.innerHTML = `
                    <div class="no-branches">
                        <p>No branches found. Please add a branch in the Hotel Management page.</p>
                        <a href="hoteleditor.html" class="btn-primary">Go to Hotel Management</a>
                    </div>
                `;
                return;
            }
            
            branchList.innerHTML = branches.map(branch => `
                <div class="branch-item" data-branch-id="${branch.id}">
                    <h3>${branch.name}</h3>
                    <p>${branch.address}</p>
                </div>
            `).join('');

            // Add click handlers
            branchList.querySelectorAll('.branch-item').forEach(item => {
                item.addEventListener('click', async () => {
                    const branchId = item.dataset.branchId;
                    await this.selectBranch(branchId);
                });
            });
        } catch (error) {
            console.error('Error loading branches:', error);
            this.showError('Failed to load hotel branches');
        }
    }

    async selectBranch(branchId) {
        try {
            await window.hotelBranchManager.loadBranchData(branchId);
            document.getElementById('branchSelectorModal').style.display = 'none';
            this.showNotification('Branch selected successfully');
            
            // Refresh the page to update all data
            window.location.reload();
        } catch (error) {
            console.error('Error selecting branch:', error);
            this.showError('Failed to select branch');
        }
    }

    showBranchSelector() {
        try {
            const modal = document.getElementById('branchSelectorModal');
            if (!modal) {
                console.error('Branch selector modal not found');
                return;
            }
            
            console.log('Showing branch selector modal');
            modal.style.display = 'block';
        } catch (error) {
            console.error('Error showing branch selector:', error);
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

// Initialize branch selector
window.branchSelector = new BranchSelectorUI();

// Only initialize if document is already loaded, otherwise wait for DOMContentLoaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.branchSelector.initialize();
    });
} else {
    // Document already loaded, initialize immediately
    window.branchSelector.initialize();
} 
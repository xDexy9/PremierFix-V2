/**
 * Safari Navigation Fix
 * This script addresses issues with navigating between pages on mobile Safari
 * by ensuring proper reinitialization of Firebase and the branch selector.
 */

(function() {
    // Detect Safari browser
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    
    // Only apply fixes if running on Safari
    if (!isSafari && !isIOS) {
        console.log('Safari navigation fix not needed for this browser');
        return;
    }
    
    console.log('Safari navigation fix script loaded');
    
    // Key for tracking page navigations in Safari
    const SAFARI_NAV_KEY = 'safari_navigation_timestamp';
    const SAFARI_PAGE_KEY = 'safari_current_page';
    
    // Store current page URL to detect page changes
    const currentPage = window.location.pathname;
    const previousPage = sessionStorage.getItem(SAFARI_PAGE_KEY);
    sessionStorage.setItem(SAFARI_PAGE_KEY, currentPage);
    
    // Check if we've navigated from another page
    const lastNavTimestamp = parseInt(sessionStorage.getItem(SAFARI_NAV_KEY) || '0');
    const currentTimestamp = Date.now();
    const timeSinceLastNav = currentTimestamp - lastNavTimestamp;
    
    // Update navigation timestamp
    sessionStorage.setItem(SAFARI_NAV_KEY, currentTimestamp.toString());
    
    // If we've navigated from another page and it was recent (within 30 seconds)
    if (previousPage && previousPage !== currentPage && timeSinceLastNav < 30000) {
        console.log(`Safari page navigation detected from ${previousPage} to ${currentPage}`);
        
        // Force Firebase reinitialization if needed
        if (typeof firebase !== 'undefined' && typeof firebase.firestore === 'function') {
            // Clear any incomplete initialization state from previous page
            sessionStorage.removeItem('branchManager_initializing');
            sessionStorage.removeItem('firebase_initialized');
            
            // We need to do these in order when DOMContentLoaded fires
            document.addEventListener('DOMContentLoaded', function() {
                console.log('Safari fix: Reinitializing Firebase and HotelBranchManager after navigation');
                
                // Initialize Firebase first
                if (typeof window.initializeFirebase === 'function') {
                    window.initializeFirebase().then(() => {
                        console.log('Safari fix: Firebase successfully reinitialized');
                        
                        // Then initialize HotelBranchManager
                        if (window.hotelBranchManager && 
                            typeof window.hotelBranchManager.initialize === 'function') {
                            return window.hotelBranchManager.initialize();
                        }
                    }).then(() => {
                        console.log('Safari fix: HotelBranchManager successfully reinitialized');
                        
                        // Finally initialize branch selector if on a page with branch selector
                        if (window.branchSelector && 
                            typeof window.branchSelector.initialize === 'function' &&
                            !window.branchSelector.initialized) {
                            return window.branchSelector.initialize();
                        }
                    }).catch(error => {
                        console.error('Safari fix: Error during reinitialization:', error);
                    });
                }
            });
        }
    }
    
    // Add a fix for the branch selector "Loading branches..." issue
    document.addEventListener('DOMContentLoaded', function() {
        // Check if we're on a tracking page - if so, don't attempt to fix branch selector modal
        const isTrackingPage = window.location.pathname.includes('tracking-new') || 
                             window.location.pathname.endsWith('tracking-new.html') ||
                             window.location.pathname.includes('tracking.html');
                             
        // If on a tracking page, ensure the modal is removed if it exists
        if (isTrackingPage) {
            console.log('Safari fix: On tracking page, ensuring branch selector modal is removed');
            
            // Aggressive approach: immediately remove any branch selector modal from the DOM
            const removeModal = function() {
                const branchSelectorModal = document.getElementById('branchSelectorModal');
                if (branchSelectorModal) {
                    console.log('Safari fix: Removing branch selector modal from DOM on tracking page');
                    branchSelectorModal.parentNode.removeChild(branchSelectorModal);
                }
                
                // Also check for the container
                const branchSelectorContainer = document.getElementById('branch-selector-container');
                if (branchSelectorContainer) {
                    console.log('Safari fix: Removing branch selector container from DOM on tracking page');
                    branchSelectorContainer.parentNode.removeChild(branchSelectorContainer);
                }
            };
            
            // Remove immediately and also after a delay (in case it gets added later)
            removeModal();
            setTimeout(removeModal, 500);
            setTimeout(removeModal, 1000);
            
            // No need to continue with other branch selector fixes
            return;
        }
        
        // Only proceed with normal branch selector fixes on non-tracking pages
        let branchListElem = document.getElementById('branchList');
        if (branchListElem && branchListElem.innerHTML.includes('Loading branches...')) {
            console.log('Safari fix: Found branch list in loading state, attempting recovery');
            
            // Delay slightly to allow other initialization to complete
            setTimeout(() => {
                // If we still have the loading message after 2 seconds, try to reload branches
                if (branchListElem.innerHTML.includes('Loading branches...')) {
                    console.log('Safari fix: Branch list still loading, forcing reload');
                    
                    if (window.branchSelector && typeof window.branchSelector.loadBranches === 'function') {
                        window.branchSelector.loadBranches();
                    } else if (window.hotelBranchManager) {
                        // Create temporary methods to reload branches
                        const reloadBranches = async function() {
                            try {
                                // Ensure HotelBranchManager is initialized
                                if (typeof window.hotelBranchManager.initialize === 'function') {
                                    if (!window.hotelBranchManager.initialized) {
                                        await window.hotelBranchManager.initialize();
                                    }
                                }
                                
                                // Get branches
                                const branches = await window.hotelBranchManager.getAllBranches();
                                
                                if (!branches || branches.length === 0) {
                                    branchListElem.innerHTML = `
                                        <div class="no-branches">
                                            <p>No branches found. Please add a branch in the Hotel Management page.</p>
                                            <a href="hoteleditor.html" class="btn-primary">Go to Hotel Management</a>
                                        </div>
                                    `;
                                    return;
                                }
                                
                                branchListElem.innerHTML = branches.map(branch => `
                                    <div class="branch-item" data-branch-id="${branch.id}">
                                        <h3>${branch.name}</h3>
                                        <p>${branch.address}</p>
                                    </div>
                                `).join('');
                                
                                // Add click handlers
                                branchListElem.querySelectorAll('.branch-item').forEach(item => {
                                    item.addEventListener('click', async () => {
                                        const branchId = item.dataset.branchId;
                                        // Load branch data
                                        await window.hotelBranchManager.loadBranchData(branchId);
                                        
                                        // Hide the modal if it exists
                                        const modal = document.getElementById('branchSelectorModal');
                                        if (modal) modal.style.display = 'none';
                                        
                                        // Refresh the page
                                        window.location.reload();
                                    });
                                });
                                
                                console.log('Safari fix: Successfully reloaded branches');
                            } catch (error) {
                                console.error('Safari fix: Error reloading branches:', error);
                                branchListElem.innerHTML = `
                                    <div class="no-branches">
                                        <p>Failed to load branches. Please try again or refresh the page.</p>
                                        <button id="retryBranchesBtn" class="btn-primary">Retry</button>
                                    </div>
                                `;
                                
                                // Add retry button functionality
                                const retryBtn = document.getElementById('retryBranchesBtn');
                                if (retryBtn) {
                                    retryBtn.addEventListener('click', reloadBranches);
                                }
                            }
                        };
                        
                        // Call the function
                        reloadBranches();
                    }
                }
            }, 2000);
        }
    });
    
    // Add a helper to check if a branch selector is needed
    window.checkBranchSelector = function() {
        // On tracking pages, never show the branch selector modal
        const isTrackingPage = window.location.pathname.includes('tracking') || 
                              window.location.pathname.endsWith('tracking.html') ||
                              window.location.pathname.endsWith('tracking-new.html');
        
        if (isTrackingPage) {
            console.log('Safari fix: On tracking page, never showing branch selector modal');
            
            // Also ensure any existing modals are hidden
            setTimeout(() => {
                const branchSelectorModal = document.getElementById('branchSelectorModal');
                if (branchSelectorModal) {
                    console.log('Safari fix: Hiding existing branch selector modal on tracking page');
                    branchSelectorModal.style.display = 'none';
                    
                    // Optionally remove it from DOM to prevent it from appearing again
                    if (branchSelectorModal.parentNode) {
                        branchSelectorModal.parentNode.removeChild(branchSelectorModal);
                    }
                }
            }, 0);
            
            // Support the top dropdown selector if it exists
            const branchSelectorDropdown = document.getElementById('branchSelector');
            if (branchSelectorDropdown && typeof window.populateBranchSelector === 'function') {
                console.log('Safari fix: Ensuring branch selector dropdown is populated');
                try {
                    window.populateBranchSelector();
                } catch (error) {
                    console.error('Safari fix: Error populating branch selector dropdown:', error);
                }
            }
            return;
        }
        
        // If no branch is selected, show the selector (but only on non-tracking pages)
        const selectedBranch = localStorage.getItem('selectedBranch');
        if (!selectedBranch) {
            console.log('Safari fix: No branch selected, showing selector');
            // Wait a bit to ensure all elements are ready
            setTimeout(() => {
                const modal = document.getElementById('branchSelectorModal');
                if (modal) {
                    modal.style.display = 'block';
                    
                    // Also reload branches if needed
                    const branchList = document.getElementById('branchList');
                    if (branchList && (branchList.innerHTML.trim() === '' || branchList.innerHTML.includes('Loading branches...'))) {
                        if (window.branchSelector && typeof window.branchSelector.loadBranches === 'function') {
                            window.branchSelector.loadBranches();
                        }
                    }
                }
            }, 500);
        }
    };
})(); 
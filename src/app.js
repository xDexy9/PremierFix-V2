// Add a version check mechanism
const APP_VERSION = '1.2.3'; // Update this when you deploy

// Function to check if app needs updating
function checkForUpdates() {
  fetch('/version.json?nocache=' + new Date().getTime())
    .then(response => response.json())
    .then(data => {
      if (data.version !== APP_VERSION) {
        // Clear cache and reload
        if ('caches' in window) {
          caches.keys().then(cacheNames => {
            cacheNames.forEach(cacheName => {
              caches.delete(cacheName);
            });
            window.location.reload(true);
          });
        } else {
          window.location.reload(true);
        }
      }
    })
    .catch(err => console.error('Version check failed:', err));
}

// Check for updates when the app starts
checkForUpdates(); 
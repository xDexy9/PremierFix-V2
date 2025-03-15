function refreshApp() {
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

// Add this to your header component
return (
  <header>
    // ... existing code ...
    <button onClick={refreshApp} title="Refresh app data">
      <RefreshIcon /> Refresh
    </button>
    // ... existing code ...
  </header>
); 
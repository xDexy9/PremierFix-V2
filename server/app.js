// For Express.js servers
app.use((req, res, next) => {
  // For API responses that change frequently
  if (req.path.includes('/api/')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  // For static assets that rarely change
  else if (req.path.match(/\.(js|css|jpg|png|gif)$/)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000');
  }
  next();
}); 
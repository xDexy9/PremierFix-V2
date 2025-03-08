# PremierFix - Hotel Maintenance Management System

A simple, user-friendly web application for managing hotel maintenance issues.

## Features

- Log maintenance issues with room number, category, and description
- Track and update issue status (Pending, In Progress, Completed)
- Search and filter functionality
- Responsive design for mobile and desktop
- Real-time updates using browser storage

## Getting Started

1. Double-click the `index.html` file to open it in your web browser
   - For Chrome: Right-click > Open with > Google Chrome
   - For Firefox: Right-click > Open with > Firefox
   - For Edge: Right-click > Open with > Microsoft Edge

2. The application has two main pages:
   - `index.html`: For logging new maintenance issues
   - `tracking.html`: For viewing and managing existing issues

## Usage

### Logging an Issue
1. Open `index.html`
2. Fill in the required information:
   - Room Number
   - Category of Fault
   - Description
   - Author Name
3. Click "Submit"

### Tracking Issues
1. Open `tracking.html`
2. View all maintenance issues
3. Use the search bar to find specific issues
4. Filter issues by category
5. Update issue status using the "In Progress" and "Completed" buttons

## Browser Support

The application works best in modern browsers:
- Google Chrome (recommended)
- Mozilla Firefox
- Microsoft Edge
- Safari

## Data Storage

The application uses browser localStorage to store data. This means:
- Data persists even after closing the browser
- Data is stored locally on your computer
- Data is not shared between different computers
- Clearing browser data will erase all stored issues

## Future Improvements

Planned features for future versions:
- Backend database integration
- User authentication
- Email/WhatsApp notifications
- Image upload for issues
- Analytics dashboard

## Browser Compatibility

PremierFix is designed to work across modern browsers and includes:
- Vendor prefixes for CSS properties
- Polyfills for older browsers
- Feature detection with Modernizr

## Running the Application

### Important: Use a Web Server

This application uses modern web features like Service Workers and CORS policies that require running it through a web server rather than directly from the file system.

#### Option 1: Using Python's built-in server

If you have Python installed:

```bash
# For Python 3.x
cd path/to/PremierFix
python -m http.server 8000

# For Python 2.x
cd path/to/PremierFix
python -m SimpleHTTPServer 8000
```

Then open your browser and navigate to: `http://localhost:8000`

#### Option 2: Using Node.js

If you have Node.js installed:

1. Install the `http-server` package:
```bash
npm install -g http-server
```

2. Run the server:
```bash
cd path/to/PremierFix
http-server -p 8000
```

Then open your browser and navigate to: `http://localhost:8000`

#### Option 3: Using Visual Studio Code Live Server

If you're using Visual Studio Code:

1. Install the "Live Server" extension
2. Right-click on `index.html` and select "Open with Live Server"

### Firebase Setup

1. Create a Firebase project at [firebase.google.com](https://firebase.google.com)
2. Enable Firestore Database and Anonymous Authentication
3. Update the Firebase configuration in `js/firebase-config.js` with your project details

## Deployment

### GitHub Pages

1. Create a GitHub repository
2. Push your code to the repository
3. Enable GitHub Pages in the repository settings
4. Set the source to the branch containing your code

### Firebase Hosting

1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login to Firebase: `firebase login`
3. Initialize your project: `firebase init`
4. Deploy to Firebase: `firebase deploy`

## Project Structure

- `index.html` - Issue logging form
- `tracking.html` - Issue tracking interface
- `css/` - Stylesheets
  - `normalize.css` - CSS reset
  - `autoprefixer.css` - Vendor prefixes
  - `styles.css` - Main styles
- `js/` - JavaScript files
  - `form.js` - Issue form handling
  - `tracking.js` - Issue tracking functionality
  - `firebase-config.js` - Firebase configuration
  - `modernizr-custom.js` - Feature detection
- `images/` - Image assets
- `manifest.json` - PWA manifest
- `service-worker.js` - Service worker for offline capabilities

## License

MIT 
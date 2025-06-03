# PremierFix Maintenance Tracker

This application allows hotel staff to log, track, and manage maintenance issues across different branches.

## Features

*   **Log Issues:** Submit new maintenance requests with details like location (room or area), category, description, priority, and optional photos.
*   **Track Issues:** View all logged issues, filter by status, priority, category, date, and search by keywords. Issues are displayed in a modern card format.
*   **Status Updates:** Change the status of issues (New, In Progress, Completed).
*   **Comments:** Add comments to issues for communication and updates.
*   **Branch Management:** Select the specific hotel branch to view its issues and statistics.
*   **Dashboard:** Overview of key metrics (New Issues, Rooms, etc.).
*   **Hotel Editor:** Manage hotel branches, rooms, and configurations (likely requires specific permissions).
*   **Room Audit:** Perform detailed room inspections using a checklist, add notes, and upload evidence.
*   **Audit Logs:** View a history of completed room audits.
*   **Maintenance Tasks:** Track scheduled maintenance tasks (e.g., AC filters, Bathroom fans) and mark them as complete.
*   **Print Views:** Generate printable checklists and issue lists.
*   **Export:** Export issue data to Excel.

## Setup & Deployment

1.  **Firebase:** This project uses Firebase for backend services (Firestore database, Storage, Authentication, Hosting).
    *   Ensure you have a Firebase project set up.
    *   Place your Firebase configuration in `js/firebase-config.js`.
    *   Configure Firebase security rules (see `firebase.json` and potentially `.firebaserc`).
    *   Configure CORS for Firebase Storage if testing locally and needing photo uploads (see CORS help modal in Room Audit).
2.  **Deployment:** Deploy the project using Firebase Hosting via the Firebase CLI:
    ```bash
    firebase deploy
    ```

## Key Files

*   `index.html`: Log Issue page.
*   `tracking.html`: Track Issues page (modern version).
*   `room-audit.html`: Room Audit page.
*   `audit-logs.html`: Audit Logs page.
*   `dashboard.html`: Dashboard page.
*   `hoteleditor.html`: Hotel Management page.
*   `photo-viewer.html`: Page to view issue photos.
*   `css/`: Contains CSS stylesheets.
*   `js/`: Contains JavaScript files for core logic, Firebase interaction, and page-specific functionality.
    *   `js/firebase-config.js`: Firebase setup.
    *   `js/hotel-branch-manager.js`: Handles branch data and selection.
    *   `js/notifications.js`: Manages UI notifications.
    *   `js/form.js`: Logic for the issue logging form.
    *   `js/tracking.js`: Logic for the tracking page.
    *   `js/room-audit.js`: Logic for the room audit page.
*   `images/`: Contains static images.
*   `firebase.json`: Firebase deployment rules.
*   `.firebaserc`: Firebase project configuration. 
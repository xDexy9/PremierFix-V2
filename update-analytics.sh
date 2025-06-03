#!/bin/bash
# Script to update HTML files to include Firebase Analytics SDK

echo "Updating HTML files to include Firebase Analytics SDK..."

# List of HTML files to update
HTML_FILES=(
  "index.html"
  "dashboard.html"
  "tracking.html"
  "hoteleditor.html"
  "photo-viewer.html"
  "audit-logs.html"
  "room-audit.html"
)

for file in "${HTML_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing $file..."
    
    # Check if file already has analytics
    if grep -q "firebase-analytics.js" "$file"; then
      echo "  $file already includes Firebase Analytics SDK."
    else
      # Find the line with firebase-auth.js and add analytics after it
      if grep -q "firebase-auth.js" "$file"; then
        sed -i 's|firebase-auth.js"></script>|firebase-auth.js"></script>\n    <script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-analytics.js"></script>|' "$file"
        echo "  Successfully added Firebase Analytics SDK to $file"
      else
        echo "  Could not find Firebase Auth script tag in $file. Skipping."
      fi
    fi
  else
    echo "Warning: $file not found. Skipping."
  fi
done

echo "Update complete!"
echo "Note: You may need to manually add the Analytics SDK to any HTML files that were not detected."
echo "Example script tag to add: <script src=\"https://www.gstatic.com/firebasejs/8.10.1/firebase-analytics.js\"></script>" 
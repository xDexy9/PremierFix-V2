// Audit Logs Functionality
document.addEventListener('DOMContentLoaded', async function() {
    // Initialize loading indicator
    const loadingContainer = document.getElementById('loadingContainer');
    const showLoading = () => {
        loadingContainer.classList.add('active');
    };
    const hideLoading = () => {
        loadingContainer.classList.remove('active');
    };

    // Initialize branch selector
    const branchSelect = document.getElementById('branchSelect');
    const auditLogsBody = document.getElementById('auditLogsBody');
    const searchInput = document.getElementById('searchInput');
    const emptyState = document.getElementById('emptyState');
    const logsTableContainer = document.querySelector('.logs-table-container');
    
    let currentBranch = null;
    let allAudits = [];
    
    // Initialize Firebase
    try {
        showLoading();
        await initializeFirebase();
        const { db } = await getFirebaseInstances();
        if (!db) {
            throw new Error('Failed to initialize Firebase database');
        }
        
        // Load branches
        await loadBranches();
        
        // Set up event listeners
        setupEventListeners();
        
        // Try to load the default branch
        const defaultBranch = window.hotelBranchManager.getCurrentBranch();
        if (defaultBranch) {
            console.log('Current branch already selected:', defaultBranch);
            branchSelect.value = defaultBranch;
            
            // Check if the option exists
            if (branchSelect.value === defaultBranch) {
                console.log('Loading audits for current branch:', defaultBranch);
                
                // Set the current branch and update UI elements
                currentBranch = defaultBranch;
                updateBranchState();
                
                // Load the audit data
                loadAuditsForBranch(defaultBranch);
            } else {
                console.warn('Selected branch not found in dropdown');
                showNotification('Please select a branch to view audit logs', 'warning');
                showEmptyState();
            }
        } else {
            console.log('No branch selected, showing empty state');
            showEmptyState();
            showNotification('Please select a branch to view audit logs', 'info');
        }
        
        hideLoading();
    } catch (error) {
        console.error('Initialization error:', error);
        hideLoading();
        showNotification('Failed to initialize application. Please refresh the page.', 'error');
    }
    
    // Load branches into selector
    async function loadBranches() {
        try {
            const branches = await window.hotelBranchManager.getAllBranches();
            branchSelect.innerHTML = '<option value="">Select Branch</option>';
            
            branches.forEach(branch => {
                const option = document.createElement('option');
                option.value = branch.id;
                option.textContent = branch.name;
                branchSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading branches:', error);
            showNotification('Failed to load branches', 'error');
        }
    }
    
    // Set up event listeners
    function setupEventListeners() {
        // Branch selection change
        branchSelect.addEventListener('change', function() {
            const selectedBranch = this.value;
            if (selectedBranch) {
                // Use the correct method to set current branch
                window.hotelBranchManager.loadBranchData(selectedBranch)
                    .then(() => {
                        console.log(`Branch data loaded for ${selectedBranch}`);
                        currentBranch = selectedBranch;
                        updateBranchState();
                        loadAuditsForBranch(selectedBranch);
                    })
                    .catch(error => {
                        console.error('Error loading branch data:', error);
                        showNotification('Failed to load branch data', 'error');
                        disableActionButtons();
                    });
            } else {
                // Clear table if no branch selected
                auditLogsBody.innerHTML = '';
                showEmptyState();
                
                // Update branch indicator and disable action buttons
                currentBranch = null;
                updateBranchState();
            }
        });
        
        // Search functionality
        searchInput.addEventListener('input', function() {
            if (!currentBranch) return;
            
            const searchTerm = this.value.toLowerCase();
            filterAudits(searchTerm);
        });
        
        // Add listener for filter checkboxes
        const filterCheckboxesContainer = document.getElementById('issueFilterCheckboxes');
        if (filterCheckboxesContainer) {
            filterCheckboxesContainer.addEventListener('change', function(event) {
                if (event.target.classList.contains('issue-filter-checkbox')) {
                    filterAudits(); // Re-filter when checkboxes change
                }
            });
        }
        
        // Export to Excel button
        const exportExcelBtn = document.getElementById('exportExcelBtn');
        if (exportExcelBtn) {
            exportExcelBtn.addEventListener('click', function() {
                if (!currentBranch || allAudits.length === 0) {
                    showNotification('No audit data to export', 'warning');
                    return;
                }
                
                exportToExcel();
            });
        }
        
        // Print to PDF button
        const printPdfBtn = document.getElementById('printPdfBtn');
        if (printPdfBtn) {
            printPdfBtn.addEventListener('click', function() {
                if (!currentBranch || allAudits.length === 0) {
                    showNotification('No audit data to print', 'warning');
                    return;
                }
                
                printToPrinter();
            });
        }
        
        // Delete All Records button
        const deleteAllBtn = document.getElementById('deleteAllBtn');
        if (deleteAllBtn) {
            deleteAllBtn.addEventListener('click', function() {
                if (!currentBranch) {
                    showNotification('No branch selected', 'warning');
                    return;
                }
                
                // Confirm before deleting
                if (confirm(`⚠️ WARNING: You are about to delete ALL audit records for the selected branch. This action cannot be undone.\n\nAre you absolutely sure you want to proceed?`)) {
                    deleteAllRecords();
                }
            });
        }
    }
    
    // Update branch indicator
    function updateBranchIndicator(branchId) {
        const branchIndicator = document.getElementById('branchIndicator');
        if (!branchIndicator) return;
        
        if (!branchId) {
            branchIndicator.innerHTML = '<span>No branch selected</span>';
            branchIndicator.classList.remove('active');
        } else {
            window.hotelBranchManager.getBranchInfo(branchId)
                .then(branchInfo => {
                    const branchName = branchInfo ? branchInfo.name : branchId;
                    branchIndicator.innerHTML = `<span>Selected Branch: <strong>${branchName}</strong></span>`;
                    branchIndicator.classList.add('active');
                })
                .catch(error => {
                    console.error('Error getting branch info:', error);
                    branchIndicator.innerHTML = `<span>Selected Branch: <strong>${branchId}</strong></span>`;
                    branchIndicator.classList.add('active');
                });
        }
    }
    
    // Enable action buttons
    function enableActionButtons() {
        const exportExcelBtn = document.getElementById('exportExcelBtn');
        const printPdfBtn = document.getElementById('printPdfBtn');
        const deleteAllBtn = document.getElementById('deleteAllBtn');
        
        if (exportExcelBtn) exportExcelBtn.removeAttribute('disabled');
        if (printPdfBtn) printPdfBtn.removeAttribute('disabled');
        if (deleteAllBtn) deleteAllBtn.removeAttribute('disabled');
    }
    
    // Disable action buttons
    function disableActionButtons() {
        const exportExcelBtn = document.getElementById('exportExcelBtn');
        const printPdfBtn = document.getElementById('printPdfBtn');
        const deleteAllBtn = document.getElementById('deleteAllBtn');
        
        if (exportExcelBtn) exportExcelBtn.setAttribute('disabled', true);
        if (printPdfBtn) printPdfBtn.setAttribute('disabled', true);
        if (deleteAllBtn) deleteAllBtn.setAttribute('disabled', true);
    }
    
    // Export audit logs to Excel
    function exportToExcel() {
        try {
            showLoading();
            
            // Get branch name for filename
            const getBranchName = async () => {
                try {
                    const branchInfo = await window.hotelBranchManager.getBranchInfo(currentBranch);
                    return branchInfo ? branchInfo.name : currentBranch;
                } catch (error) {
                    console.error('Error getting branch name:', error);
                    return currentBranch;
                }
            };
            
            getBranchName().then(branchName => {
                const fileName = `${branchName.replace(/[^a-z0-9]/gi, '_')}_Audit_Logs_${new Date().toISOString().split('T')[0]}.xlsx`;
                
                // Create workbook
                const wb = XLSX.utils.book_new();
                
                // Create a sheet list to track all sheets for navigation
                const sheetList = ['Report Summary', 'All Audit Records'];
                
                // Process audit records to collect category information in advance
                const categories = {};
                
                // Group audits by issue categories
                allAudits.forEach(audit => {
                    if (audit.issues && audit.issues.length > 0) {
                        audit.issues.forEach(issue => {
                            // Extract category (first word of issue)
                            const category = issue.split(' ')[0];
                            if (!categories[category]) categories[category] = [];
                            categories[category].push(audit);
                        });
                    }
                });
                
                // Add category sheets that meet the threshold to our sheet list
                Object.entries(categories).forEach(([category, audits]) => {
                    if (audits.length >= 3) {
                        sheetList.push(`${category} Issues`);
                    }
                });
                
                // User guide data for the navigation instruction
                const userGuideData = [
                    ['MULTI-PAGE REPORT NAVIGATION'],
                    [''],
                    ['This Excel report contains multiple pages with different views of your audit data:'],
                    [''],
                    ['• Report Summary - Overview statistics and report information'],
                    ['• All Audit Records - Complete listing of all audit records'],
                ];
                
                // Add category sheets to the guide
                Object.entries(categories).forEach(([category, audits]) => {
                    if (audits.length >= 3) {
                        userGuideData.push([`• ${category} Issues - Focused view of ${audits.length} audits with ${category} problems`]);
                    }
                });
                
                userGuideData.push(['']);
                userGuideData.push(['Use the navigation buttons at the top of each sheet to move between pages.']);
                userGuideData.push(['']);
                userGuideData.push(['Generated by PremierFix Room Audit System']);
                
                // Create a user guide sheet
                const userGuideSheet = XLSX.utils.aoa_to_sheet(userGuideData);
                
                // Set column width
                userGuideSheet['!cols'] = [{ wch: 80 }];
                
                // Style the user guide
                const userGuideRange = XLSX.utils.decode_range(userGuideSheet['!ref'] || 'A1:A15');
                const titleStyle = { s: { font: { bold: true, sz: 14, color: { rgb: "3A7BD5" } } } };
                const subheaderStyle = { s: { font: { bold: true, sz: 12 } } };
                const bulletStyle = { s: { font: { bold: false, sz: 11 } } };
                const footerStyle = { s: { font: { italic: true, sz: 10, color: { rgb: "777777" } } } };
                
                // Apply styles
                userGuideSheet.A1 = { ...userGuideSheet.A1, ...titleStyle };
                
                // Style bullet points
                for (let R = 4; R <= 4 + categories.length; R++) {
                    if (userGuideSheet[`A${R}`]) {
                        userGuideSheet[`A${R}`] = { 
                            ...userGuideSheet[`A${R}`], 
                            ...bulletStyle 
                        };
                    }
                }
                
                // Style footer
                if (userGuideSheet.A13) {
                    userGuideSheet.A13 = { ...userGuideSheet.A13, ...footerStyle };
                }
                
                // Add user guide to workbook as the first sheet
                XLSX.utils.book_append_sheet(wb, userGuideSheet, 'How To Use');
                sheetList.unshift('How To Use'); // Add to the beginning of sheetList
                
                // Function to create navigation buttons (header row with clickable cells)
                function createNavigationButtons(sheet, currentSheet) {
                    // Create a header with navigation buttons
                    const navRow = [];
                    
                    // Add "NAVIGATION:" text
                    navRow.push("NAVIGATION:");
                    
                    // Add a button for each sheet
                    sheetList.forEach(sheetName => {
                        if (sheetName === currentSheet) {
                            // Current sheet (highlight differently)
                            navRow.push(`[${sheetName}]`);
                        } else {
                            // Other sheet (clickable)
                            navRow.push(`Click to view "${sheetName}"`);
                        }
                    });
                    
                    // Add the navigation row to the top of the sheet
                    XLSX.utils.sheet_add_aoa(sheet, [navRow], { origin: "A1" });
                    
                    // Get the range of the navigation row
                    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:Z1');
                    
                    // Style and add hyperlinks for the navigation row
                    for (let C = 0; C <= range.e.c; C++) {
                        const cell = XLSX.utils.encode_cell({ r: 0, c: C });
                        
                        if (C === 0) {
                            // Navigation header style
                            sheet[cell] = { 
                                ...sheet[cell], 
                                s: { 
                                    font: { bold: true, color: { rgb: "444444" } },
                                    fill: { fgColor: { rgb: "EEEEEE" } }
                                }
                            };
                        } else if (C - 1 < sheetList.length) {
                            const targetSheet = sheetList[C - 1];
                            if (targetSheet === currentSheet) {
                                // Current sheet style (highlighted)
                                sheet[cell] = { 
                                    ...sheet[cell], 
                                    s: { 
                                        font: { bold: true, color: { rgb: "FFFFFF" } },
                                        fill: { fgColor: { rgb: "3A7BD5" } }
                                    }
                                };
                            } else {
                                // Other sheet style (clickable)
                                sheet[cell] = { 
                                    ...sheet[cell], 
                                    l: { Target: `#'${targetSheet}'!A1` },
                                    s: { 
                                        font: { color: { rgb: "0563C1" }, underline: true },
                                        fill: { fgColor: { rgb: "F5F8FF" } }
                                    }
                                };
                            }
                        }
                    }
                    
                    // Add a blank row after navigation for better separation
                    XLSX.utils.sheet_add_aoa(sheet, [['']], { origin: "A2" });
                    
                    return sheet;
                }
                
                // Add a report summary worksheet
                let summaryWS = XLSX.utils.aoa_to_sheet([
                    ['PremierFix Room Audit Report'],
                    [''],
                    ['Branch:', branchName],
                    ['Generated On:', new Date().toLocaleString()],
                    ['Total Records:', allAudits.length.toString()],
                    ['Report Period:', allAudits.length > 0 ? 
                        `${formatDate(allAudits[allAudits.length - 1].timestamp)} - ${formatDate(allAudits[0].timestamp)}` : 
                        'No date range available'],
                    [''],
                    ['Report Summary:'],
                    ['Room Count:', [...new Set(allAudits.map(audit => audit.roomNumber))].length.toString()],
                    ['With Photos:', allAudits.filter(audit => audit.photoUploaded).length.toString()],
                    ['Issues Found:', allAudits.filter(audit => audit.issues && audit.issues.length > 0).length.toString()]
                ]);
                
                // Add navigation buttons to summary sheet
                summaryWS = createNavigationButtons(summaryWS, 'Report Summary');
                
                // Style the summary sheet
                const summaryRange = XLSX.utils.decode_range(summaryWS['!ref'] || 'A1:B15');
                const titleCell = { s: { font: { bold: true, sz: 16, color: { rgb: "3A7BD5" } } } };
                const headerCell = { s: { font: { bold: true, sz: 12 } } };
                const valueCell = { s: { alignment: { horizontal: "left" } } };
                const subheaderCell = { s: { font: { bold: true, sz: 12, color: { rgb: "666666" } } } };
                
                // Apply title style
                summaryWS.A3 = { ...summaryWS.A3, ...titleCell };
                
                // Apply styles to cells
                for (let R = 4; R <= summaryRange.e.r; R++) {
                    // Skip navigation rows
                    if (R <= 2) continue;
                    
                    // Style left column (headers)
                    if (summaryWS[XLSX.utils.encode_cell({ r: R, c: 0 })]) {
                        summaryWS[XLSX.utils.encode_cell({ r: R, c: 0 })] = {
                            ...summaryWS[XLSX.utils.encode_cell({ r: R, c: 0 })],
                            ...headerCell
                        };
                    }
                    
                    // Style right column (values)
                    if (summaryWS[XLSX.utils.encode_cell({ r: R, c: 1 })]) {
                        summaryWS[XLSX.utils.encode_cell({ r: R, c: 1 })] = {
                            ...summaryWS[XLSX.utils.encode_cell({ r: R, c: 1 })],
                            ...valueCell
                        };
                    }
                }
                
                summaryWS["!cols"] = [{ wch: 20 }, { wch: 40 }];
                
                // Add summary to workbook
                XLSX.utils.book_append_sheet(wb, summaryWS, 'Report Summary');
                
                // Prepare main audit data
                const auditData = allAudits.map(audit => {
                    return {
                        'Room Number': audit.roomNumber || 'Unknown',
                        'Date & Time': formatDate(audit.timestamp),
                        'Issues Found': Array.isArray(audit.issues) && audit.issues.length > 0 ? 
                            audit.issues.join(', ') : 'No issues',
                        'Issue Count': Array.isArray(audit.issues) ? audit.issues.length : 0,
                        'Notes': audit.notes || '',
                        'Photo Available': audit.photoUploaded ? 'Yes' : 'No',
                        'Photo URL': audit.imageUrl || ''
                    };
                });
                
                // Create the main sheet
                let ws = XLSX.utils.json_to_sheet(auditData);
                
                // Add navigation buttons to main sheet
                ws = createNavigationButtons(ws, 'All Audit Records');
                
                // Set column widths
                ws['!cols'] = [
                    { wch: 12 },  // Room Number
                    { wch: 20 },  // Date & Time
                    { wch: 50 },  // Issues Found
                    { wch: 12 },  // Issue Count
                    { wch: 40 },  // Notes
                    { wch: 15 },  // Photo Available
                    { wch: 50 }   // Photo URL
                ];
                
                // Add cell styles
                const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:Z100');
                
                // Define styles
                const headerStyle = { 
                    font: { bold: true, color: { rgb: "FFFFFF" } },
                    fill: { fgColor: { rgb: "3A7BD5" } },
                    alignment: { horizontal: "center", vertical: "center" },
                    border: { 
                        top: { style: "thin" },
                        bottom: { style: "thin" },
                        left: { style: "thin" },
                        right: { style: "thin" }
                    }
                };
                
                // Apply header styles to data header row (third row, after navigation)
                for (let C = range.s.c; C <= range.e.c; C++) {
                    const header = XLSX.utils.encode_cell({ r: 2, c: C });
                    if (!ws[header]) continue;
                    ws[header].s = headerStyle;
                }
                
                // Add the main sheet to workbook
                XLSX.utils.book_append_sheet(wb, ws, 'All Audit Records');
                
                // Create category-specific sheets if needed
                if (Object.keys(categories).length > 0) {
                    for (const [category, audits] of Object.entries(categories)) {
                        if (audits.length >= 3) { // Only create sheets for categories with sufficient entries
                            const categoryData = audits.map(audit => {
                                const categoryIssues = audit.issues.filter(issue => 
                                    issue.startsWith(category));
                                
                                return {
                                    'Room Number': audit.roomNumber || 'Unknown',
                                    'Date & Time': formatDate(audit.timestamp),
                                    'Specific Issues': categoryIssues.join(', '),
                                    'All Issues': audit.issues.join(', '),
                                    'Notes': audit.notes || '',
                                    'Photo Available': audit.photoUploaded ? 'Yes' : 'No'
                                };
                            });
                            
                            // Create sheet
                            let catSheet = XLSX.utils.json_to_sheet(categoryData);
                            
                            // Add navigation buttons to category sheet
                            catSheet = createNavigationButtons(catSheet, `${category} Issues`);
                            
                            // Add a title to the category sheet after navigation area
                            XLSX.utils.sheet_add_aoa(catSheet, [[`${category} Issues (${audits.length} records found)`]], { origin: 'A3' });
                            
                            // Style the title
                            catSheet.A3 = { 
                                ...catSheet.A3, 
                                s: { 
                                    font: { bold: true, sz: 14, color: { rgb: "3A7BD5" } },
                                    fill: { fgColor: { rgb: "F5F8FF" } }
                                }
                            };
                            
                            // Add spacing
                            XLSX.utils.sheet_add_aoa(catSheet, [['']], { origin: 'A4' });
                            
                            // Set column widths
                            catSheet['!cols'] = [
                                { wch: 12 },  // Room Number
                                { wch: 20 },  // Date & Time
                                { wch: 40 },  // Specific Issues
                                { wch: 40 },  // All Issues
                                { wch: 40 },  // Notes
                                { wch: 15 }   // Photo Available
                            ];
                            
                            // Style the data headers (row 5, after nav and title)
                            const catRange = XLSX.utils.decode_range(catSheet['!ref'] || 'A1:Z100');
                            for (let C = catRange.s.c; C <= catRange.e.c; C++) {
                                const header = XLSX.utils.encode_cell({ r: 4, c: C });
                                if (!catSheet[header]) continue;
                                catSheet[header].s = headerStyle;
                            }
                            
                            // Add sheet to workbook
                            XLSX.utils.book_append_sheet(wb, catSheet, `${category} Issues`);
                        }
                    }
                }
                
                // Generate the Excel file
                XLSX.writeFile(wb, fileName);
                
                hideLoading();
                showNotification(`Exported audit records to Excel with enhanced navigation between sheets`, 'success');
            });
        } catch (error) {
            console.error('Error exporting to Excel:', error);
            hideLoading();
            showNotification('Failed to export to Excel: ' + error.message, 'error');
        }
    }
    
    // Print audit logs directly to printer
    function printToPrinter() {
        try {
            showLoading();
            
            // Get branch name for filename and header
            const getBranchName = async () => {
                try {
                    const branchInfo = await window.hotelBranchManager.getBranchInfo(currentBranch);
                    return branchInfo ? branchInfo.name : currentBranch;
                } catch (error) {
                    console.error('Error getting branch name:', error);
                    return currentBranch;
                }
            };
            
            getBranchName().then(branchName => {
                // Create new window for printing
                const printWindow = window.open('', '_blank');
                
                if (!printWindow) {
                    showNotification('Print window was blocked. Please allow popups for this site.', 'warning');
                    hideLoading();
                    return;
                }
                
                // Format current date for display
                const currentDate = new Date();
                const formattedDate = currentDate.toLocaleString();
                
                // Prepare navigation sections structure
                const sections = [
                    { id: 'report-header', title: 'Report Header' },
                    { id: 'summary-data', title: 'Summary & Statistics' },
                    { id: 'audit-records', title: 'All Audit Records' },
                    { id: 'photo-evidence', title: 'Photo Evidence' }
                ];
                
                // Add category-based sections if we have enough data
                const categories = {};
                
                // Collect categories and group audits
                allAudits.forEach(audit => {
                    if (audit.issues && audit.issues.length > 0) {
                        audit.issues.forEach(issue => {
                            const category = issue.split(' ')[0]; // First word of issue as category
                            if (!categories[category]) categories[category] = [];
                            categories[category].push(audit);
                        });
                    }
                });
                
                // Add categories with 3+ records as sections
                Object.entries(categories).forEach(([category, audits]) => {
                    if (audits.length >= 3) {
                        sections.push({
                            id: `category-${category.toLowerCase()}`,
                            title: `${category} Issues (${audits.length})`
                        });
                    }
                });
                
                // Start writing content to the print window
                printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>PremierFix Audit Report - ${branchName}</title>
                    <meta charset="UTF-8">
                    <style>
                        @media print {
                            /* Print-specific styles */
                            body {
                                font-family: Arial, sans-serif;
                                color: black;
                                padding: 0;
                                margin: 0;
                            }
                            
                            .page-break {
                                page-break-before: always;
                            }
                            
                            .no-print {
                                display: none !important;
                            }
                            
                            table {
                                page-break-inside: avoid;
                                width: 100%;
                                border-collapse: collapse;
                            }
                            
                            /* Allow large tables to break across pages */
                            table.allow-break {
                                page-break-inside: auto;
                            }
                            
                            table.allow-break tr {
                                page-break-inside: avoid;
                            }
                            
                            h1, h2, h3 {
                                page-break-after: avoid;
                            }
                            
                            img {
                                max-width: 100% !important;
                            }
                            
                            .navigation-controls {
                                display: none !important;
                            }
                        }
                        
                        /* General styles */
                        body {
                            font-family: Arial, sans-serif;
                            line-height: 1.5;
                            color: #333;
                            background: #fff;
                            margin: 0;
                            padding: 20px;
                        }
                        
                        .container {
                            max-width: 1000px;
                            margin: 0 auto;
                        }
                        
                        /* Report header */
                        .report-header {
                            text-align: center;
                            margin-bottom: 30px;
                            padding-bottom: 20px;
                            border-bottom: 2px solid #3a7bd5;
                        }
                        
                        .report-title {
                            color: #3a7bd5;
                            font-size: 28px;
                            margin-bottom: 10px;
                        }
                        
                        .report-subtitle {
                            color: #666;
                            font-size: 16px;
                            margin-top: 0;
                        }
                        
                        /* Summary box */
                        .summary-box {
                            background-color: #f5f8ff;
                            border: 1px solid #d0e1fd;
                            border-radius: 8px;
                            padding: 20px;
                            margin-bottom: 30px;
                        }
                        
                        .summary-title {
                            color: #3a7bd5;
                            margin-top: 0;
                            border-bottom: 1px solid #d0e1fd;
                            padding-bottom: 10px;
                        }
                        
                        .summary-stats {
                            display: grid;
                            grid-template-columns: repeat(3, 1fr);
                            gap: 15px;
                        }
                        
                        .stat-item {
                            text-align: center;
                            padding: 10px;
                        }
                        
                        .stat-value {
                            font-size: 24px;
                            font-weight: bold;
                            color: #3a7bd5;
                        }
                        
                        .stat-label {
                            font-size: 14px;
                            color: #666;
                        }
                        
                        /* Tables */
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-bottom: 30px;
                            font-size: 14px;
                        }
                        
                        th {
                            background-color: #3a7bd5;
                            color: white;
                            text-align: left;
                            padding: 12px 15px;
                        }
                        
                        td {
                            padding: 10px 15px;
                            border-bottom: 1px solid #ddd;
                        }
                        
                        tr:nth-child(even) {
                            background-color: #f9f9f9;
                        }
                        
                        tr:hover {
                            background-color: #f5f8ff;
                        }
                        
                        /* Section headers */
                        .section-header {
                            color: #3a7bd5;
                            border-bottom: 2px solid #d0e1fd;
                            padding-bottom: 10px;
                            margin-top: 40px;
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                        }
                        
                        /* Image gallery */
                        .image-gallery {
                            display: grid;
                            grid-template-columns: repeat(3, 1fr);
                            gap: 15px;
                        }
                        
                        .gallery-item {
                            border: 1px solid #ddd;
                            border-radius: 4px;
                            padding: 10px;
                        }
                        
                        .gallery-image {
                            width: 100%;
                            height: 200px;
                            object-fit: cover;
                            border-radius: 4px;
                        }
                        
                        .image-caption {
                            margin-top: 10px;
                            font-size: 12px;
                            text-align: center;
                        }
                        
                        /* Navigation controls */
                        .navigation-controls {
                            background: #f5f8ff;
                            padding: 15px;
                            margin: 20px 0;
                            border-radius: 8px;
                            border: 1px solid #d0e1fd;
                        }
                        
                        .navigation-title {
                            font-weight: bold;
                            margin-bottom: 10px;
                            color: #3a7bd5;
                        }
                        
                        .nav-buttons {
                            display: flex;
                            flex-wrap: wrap;
                            gap: 10px;
                        }
                        
                        .nav-button {
                            background: #3a7bd5;
                            color: white;
                            border: none;
                            padding: 8px 15px;
                            border-radius: 4px;
                            cursor: pointer;
                            text-decoration: none;
                            font-size: 14px;
                            display: inline-block;
                        }
                        
                        .nav-button:hover {
                            background: #2a6cbd;
                        }
                        
                        .nav-button.active {
                            background: #1d4f8f;
                            font-weight: bold;
                        }
                        
                        .nav-button.back-to-top {
                            background: #666;
                        }
                        
                        /* Table of contents */
                        .table-of-contents {
                            background: #f5f8ff;
                            padding: 20px;
                            border-radius: 8px;
                            margin-bottom: 30px;
                            border: 1px solid #d0e1fd;
                        }
                        
                        .toc-title {
                            margin-top: 0;
                            color: #3a7bd5;
                            margin-bottom: 15px;
                        }
                        
                        .toc-list {
                            list-style-type: none;
                            padding-left: 0;
                        }
                        
                        .toc-item {
                            margin-bottom: 10px;
                        }
                        
                        .toc-link {
                            text-decoration: none;
                            color: #3a7bd5;
                            display: flex;
                            align-items: center;
                        }
                        
                        .toc-link:hover {
                            text-decoration: underline;
                        }
                        
                        .toc-number {
                            background: #3a7bd5;
                            color: white;
                            width: 24px;
                            height: 24px;
                            border-radius: 50%;
                            display: inline-flex;
                            justify-content: center;
                            align-items: center;
                            margin-right: 10px;
                            font-size: 12px;
                        }
                        
                        /* Buttons for manual printing */
                        .print-controls {
                            position: fixed;
                            top: 20px;
                            right: 20px;
                            display: flex;
                            gap: 10px;
                        }
                        
                        .print-button {
                            background: #3a7bd5;
                            color: white;
                            border: none;
                            padding: 10px 20px;
                            border-radius: 4px;
                            cursor: pointer;
                            display: flex;
                            align-items: center;
                            gap: 8px;
                        }
                        
                        .print-button:hover {
                            background: #2a6cbd;
                        }
                        
                        .close-button {
                            background: #666;
                            color: white;
                            border: none;
                            padding: 10px 20px;
                            border-radius: 4px;
                            cursor: pointer;
                        }
                        
                        .close-button:hover {
                            background: #555;
                        }
                        
                        /* Placeholder for missing images */
                        .missing-image {
                            background: #f8f8f8;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            height: 200px;
                            width: 100%;
                            border-radius: 4px;
                            color: #999;
                            font-style: italic;
                        }
                        
                        /* Media query for smaller screens */
                        @media (max-width: 768px) {
                            .summary-stats {
                                grid-template-columns: 1fr;
                            }
                            
                            .image-gallery {
                                grid-template-columns: 1fr;
                            }
                        }
                    </style>
                </head>
                <body>
                    <!-- Manual print button (for browsers that don't auto-show print dialog) -->
                    <div class="print-controls no-print">
                        <button class="print-button" onclick="window.print()">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M5 1a2 2 0 0 0-2 2v1h10V3a2 2 0 0 0-2-2H5zm6 8H5a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1z"/>
                                <path d="M0 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-1v-2a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2H2a2 2 0 0 1-2-2V7zm2.5 1a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1z"/>
                            </svg>
                            Print Report
                        </button>
                        <button class="close-button" onclick="window.close()">Close</button>
                    </div>
                    
                    <div class="container">
                        <!-- Report header section -->
                        <div id="report-header" class="report-header">
                            <h1 class="report-title">PremierFix Room Audit Report</h1>
                            <h2 class="report-subtitle">${branchName}</h2>
                            <p>Generated on: ${formattedDate}</p>
                        </div>
                        
                        <!-- Table of Contents -->
                        <div class="table-of-contents no-print">
                            <h2 class="toc-title">Report Contents</h2>
                            <p>This report contains multiple sections. Use the links below to navigate:</p>
                            <ul class="toc-list">
                                ${sections.map((section, index) => `
                                    <li class="toc-item">
                                        <a href="#${section.id}" class="toc-link">
                                            <span class="toc-number">${index + 1}</span>
                                            <span>${section.title}</span>
                                        </a>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                        
                        <!-- Navigation bar -->
                        <div class="navigation-controls no-print">
                            <div class="navigation-title">Quick Navigation:</div>
                            <div class="nav-buttons">
                                ${sections.map(section => `
                                    <a href="#${section.id}" class="nav-button">${section.title}</a>
                                `).join('')}
                            </div>
                        </div>
                        
                        <!-- Summary section -->
                        <div id="summary-data">
                            <div class="section-header">
                                <h2>Report Summary</h2>
                                <a href="#report-header" class="nav-button back-to-top no-print">Back to Top</a>
                            </div>
                            
                            <div class="summary-box">
                                <h3 class="summary-title">Audit Statistics</h3>
                                <div class="summary-stats">
                                    <div class="stat-item">
                                        <div class="stat-value">${allAudits.length}</div>
                                        <div class="stat-label">Total Records</div>
                                    </div>
                                    <div class="stat-item">
                                        <div class="stat-value">${[...new Set(allAudits.map(audit => audit.roomNumber))].length}</div>
                                        <div class="stat-label">Rooms Audited</div>
                                    </div>
                                    <div class="stat-item">
                                        <div class="stat-value">${allAudits.filter(audit => audit.photoUploaded).length}</div>
                                        <div class="stat-label">With Photos</div>
                                    </div>
                                </div>
                            </div>
                            
                            <table>
                                <tr>
                                    <th>Report Period</th>
                                    <td>${allAudits.length > 0 ? 
                                        `${formatDate(allAudits[allAudits.length - 1].timestamp)} - ${formatDate(allAudits[0].timestamp)}` : 
                                        'No date range available'}</td>
                                </tr>
                                <tr>
                                    <th>Issues Found</th>
                                    <td>${allAudits.filter(audit => audit.issues && audit.issues.length > 0).length}</td>
                                </tr>
                                <tr>
                                    <th>Branch</th>
                                    <td>${branchName}</td>
                                </tr>
                            </table>
                        </div>
                        
                        <!-- Navigation bar -->
                        <div class="navigation-controls no-print">
                            <div class="nav-buttons">
                                ${sections.map(section => `
                                    <a href="#${section.id}" class="nav-button">${section.title}</a>
                                `).join('')}
                            </div>
                        </div>
                        
                        <!-- Audit Records section -->
                        <div id="audit-records" class="page-break">
                            <div class="section-header">
                                <h2>Audit Records</h2>
                                <a href="#report-header" class="nav-button back-to-top no-print">Back to Top</a>
                            </div>
                            
                            <table class="allow-break">
                                <thead>
                                    <tr>
                                        <th>Room</th>
                                        <th>Date & Time</th>
                                        <th>Issues Found</th>
                                        <th>Notes</th>
                                        <th>Photo</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${allAudits.map(audit => `
                                        <tr>
                                            <td>${audit.roomNumber || 'Unknown'}</td>
                                            <td>${formatDate(audit.timestamp)}</td>
                                            <td>${Array.isArray(audit.issues) && audit.issues.length > 0 ? 
                                                audit.issues.join(', ') : 'No issues'}</td>
                                            <td>${audit.notes || ''}</td>
                                            <td>${audit.photoUploaded ? 'Yes' : 'No'}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                        
                        <!-- Navigation bar -->
                        <div class="navigation-controls no-print">
                            <div class="nav-buttons">
                                ${sections.map(section => `
                                    <a href="#${section.id}" class="nav-button">${section.title}</a>
                                `).join('')}
                            </div>
                        </div>
                `);
                
                // Add category-specific sections if we have categories
                if (Object.keys(categories).length > 0) {
                    Object.entries(categories).forEach(([category, audits]) => {
                        if (audits.length >= 3) { // Only create section for categories with sufficient entries
                            printWindow.document.write(`
                                <!-- ${category} Issues Section -->
                                <div id="category-${category.toLowerCase()}" class="page-break">
                                    <div class="section-header">
                                        <h2>${category} Issues (${audits.length})</h2>
                                        <a href="#report-header" class="nav-button back-to-top no-print">Back to Top</a>
                                    </div>
                                    
                                    <table class="allow-break">
                                        <thead>
                                            <tr>
                                                <th>Room</th>
                                                <th>Date & Time</th>
                                                <th>${category} Issues</th>
                                                <th>Notes</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${audits.map(audit => {
                                                const categoryIssues = audit.issues.filter(issue => 
                                                    issue.startsWith(category));
                                                    
                                                return `
                                                    <tr>
                                                        <td>${audit.roomNumber || 'Unknown'}</td>
                                                        <td>${formatDate(audit.timestamp)}</td>
                                                        <td>${categoryIssues.join(', ')}</td>
                                                        <td>${audit.notes || ''}</td>
                                                    </tr>
                                                `;
                                            }).join('')}
                                        </tbody>
                                    </table>
                                </div>
                                
                                <!-- Navigation bar -->
                                <div class="navigation-controls no-print">
                                    <div class="nav-buttons">
                                        ${sections.map(section => `
                                            <a href="#${section.id}" class="nav-button">${section.title}</a>
                                        `).join('')}
                                    </div>
                                </div>
                            `);
                        }
                    });
                }
                
                // Add photo evidence section
                printWindow.document.write(`
                        <!-- Photo Evidence -->
                        <div id="photo-evidence" class="page-break">
                            <div class="section-header">
                                <h2>Photo Evidence</h2>
                                <a href="#report-header" class="nav-button back-to-top no-print">Back to Top</a>
                            </div>
                `);
                
                // Check if we have any photos
                const auditsWithPhotos = allAudits.filter(audit => audit.photoUploaded && audit.imageUrl);
                
                if (auditsWithPhotos.length > 0) {
                    printWindow.document.write(`
                            <div class="image-gallery">
                                ${auditsWithPhotos.map(audit => `
                                    <div class="gallery-item">
                                        <img 
                                            src="${audit.imageUrl}" 
                                            alt="Room ${audit.roomNumber}" 
                                            class="gallery-image"
                                            onerror="this.outerHTML='<div class=\'missing-image\'>Image not available</div>'"
                                        >
                                        <div class="image-caption">
                                            Room ${audit.roomNumber} - ${formatDate(audit.timestamp)}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                    `);
                } else {
                    printWindow.document.write(`
                            <p>No photo evidence is available in the selected audit records.</p>
                    `);
                }
                
                // Finish the photo section and complete the document
                printWindow.document.write(`
                        </div>
                        
                        <!-- Final navigation bar -->
                        <div class="navigation-controls no-print">
                            <div class="nav-buttons">
                                ${sections.map(section => `
                                    <a href="#${section.id}" class="nav-button">${section.title}</a>
                                `).join('')}
                                <a href="#report-header" class="nav-button back-to-top">Back to Top</a>
                            </div>
                        </div>
                        
                        <footer style="margin-top: 40px; border-top: 1px solid #ddd; padding-top: 20px; text-align: center; color: #666; font-size: 12px;">
                            <p>PremierFix Room Audit Report - Generated on ${formattedDate}</p>
                        </footer>
                    </div>
                    
                    <script>
                        // Add active class to navigation buttons based on scroll position
                        window.addEventListener('DOMContentLoaded', function() {
                            // Automatically open print dialog after content loads
                            setTimeout(function() {
                                window.print();
                            }, 1000);
                            
                            // Highlight active navigation button based on scroll
                            window.addEventListener('scroll', function() {
                                const sections = document.querySelectorAll('[id^="report-"], [id^="summary-"], [id^="audit-"], [id^="photo-"], [id^="category-"]');
                                const navButtons = document.querySelectorAll('.nav-button');
                                
                                let currentSectionId = sections[0].id;
                                
                                sections.forEach(section => {
                                    const sectionTop = section.offsetTop;
                                    const sectionHeight = section.offsetHeight;
                                    
                                    if (window.scrollY >= sectionTop - 100) {
                                        currentSectionId = section.id;
                                    }
                                });
                                
                                navButtons.forEach(button => {
                                    button.classList.remove('active');
                                    if (button.getAttribute('href') === '#' + currentSectionId) {
                                        button.classList.add('active');
                                    }
                                });
                            });
                        });
                    </script>
                </body>
                </html>
                `);
                
                // Close document for writing
                printWindow.document.close();
                hideLoading();
                
                // Show helpful notification
                showNotification('Print report opened in new window. If print dialog doesn\'t appear automatically, use the Print button in the report.', 'info', 5000);
            });
            
        } catch (error) {
            console.error('Error generating print report:', error);
            hideLoading();
            showNotification('Failed to generate print report: ' + error.message, 'error');
        }
    }
    
    // Delete all audit records for the current branch
    async function deleteAllRecords() {
        if (!currentBranch) {
            showNotification('No branch selected', 'warning');
            return;
        }
        
        try {
            showLoading();
            
            const { db } = await getFirebaseInstances();
            const auditQuery = db.collection('roomAudits').where('branchId', '==', currentBranch);
            
            // Get all documents matching the branch
            const auditSnapshot = await auditQuery.get();
            
            if (auditSnapshot.empty) {
                hideLoading();
                showNotification('No audit records found to delete', 'info');
                return;
            }
            
            // Count the number of records to delete
            const recordCount = auditSnapshot.size;
            
            // Delete each document in a batch
            const batchSize = 500; // Firestore limits batch operations to 500
            const batches = [];
            let batch = db.batch();
            let operationCount = 0;
            
            auditSnapshot.forEach(doc => {
                batch.delete(doc.ref);
                operationCount++;
                
                if (operationCount >= batchSize) {
                    batches.push(batch.commit());
                    batch = db.batch();
                    operationCount = 0;
                }
            });
            
            // Commit any remaining operations
            if (operationCount > 0) {
                batches.push(batch.commit());
            }
            
            // Wait for all batches to complete
            await Promise.all(batches);
            
            // Clear the local data
            allAudits = [];
            auditLogsBody.innerHTML = '';
            showEmptyState();
            
            hideLoading();
            showNotification(`Successfully deleted ${recordCount} audit records`, 'success');
            
        } catch (error) {
            console.error('Error deleting records:', error);
            hideLoading();
            showNotification('Failed to delete records: ' + error.message, 'error');
        }
    }
    
    // Load audits for selected branch
    async function loadAuditsForBranch(branchId) {
        try {
            showLoading();
            
            // Only update currentBranch if it's different
            if (currentBranch !== branchId) {
                currentBranch = branchId;
                console.log(`Current branch updated to: ${branchId}`);
            }
            
            const { db } = await getFirebaseInstances();
            console.log(`Attempting to load audits for branch: ${branchId}`);
            
            // Check if collection exists using a more reliable method
            // First try to get one document from the collection
            let collectionExists = true;
            try {
                const testQuery = await db.collection('roomAudits').limit(1).get();
                console.log(`Collection test: empty=${testQuery.empty}`);
            } catch (err) {
                if (err.code === 'permission-denied' || err.message.includes('missing or insufficient permissions')) {
                    console.warn('Permission denied to access roomAudits collection');
                    showNotification('You do not have permission to access audit logs', 'warning');
                    collectionExists = false;
                }
            }
            
            if (!collectionExists) {
                console.warn('roomAudits collection does not exist or is not accessible');
                // Try to create the collection with a dummy document if it doesn't exist
                try {
                    console.log('Attempting to create roomAudits collection');
                    // We won't actually create a document, just continue as normal
                }
                catch (createErr) {
                    console.error('Error creating collection:', createErr);
                }
            }
            
            // Query the roomAudits collection regardless
            let auditsSnapshot;
            
            // Flag to track if we used ordering in our query
            let wasOrdered = false;
            
            try {
                console.log(`Querying audits for branch: ${branchId}`);
                
                // Instead of using count(), just get the documents directly
                // with a limit if we just want to check existence
                const checkExistenceQuery = await db.collection('roomAudits')
                    .where('branchId', '==', branchId)
                    .limit(1)
                    .get();
                
                if (checkExistenceQuery.empty) {
                    // No audits for this branch
                    console.log('No audits found for this branch');
                    allAudits = [];
                    showEmptyState();
                    showNotification('No audit logs found for this branch', 'info');
                    hideLoading();
                    return;
                }
                
                // If documents exist, get all of them without orderBy to avoid index error
                console.log('Audits found, retrieving all without ordering (to avoid index error)');
                
                try {
                    // Try first with the compound query requiring an index
                    auditsSnapshot = await db.collection('roomAudits')
                        .where('branchId', '==', branchId)
                        .orderBy('timestamp', 'desc')
                        .get();
                    
                    console.log(`Retrieved ${auditsSnapshot.size} audit documents with ordering`);
                    // Mark that we used ordering in query
                    wasOrdered = true;
                } catch (indexError) {
                    // If we get an index error, try the query without sorting
                    console.log('Index error, falling back to query without ordering');
                    
                    // Show a helpful notification about the index issue
                    showIndexHelp(indexError);
                    
                    // Fall back to a simple query without ordering
                    auditsSnapshot = await db.collection('roomAudits')
                        .where('branchId', '==', branchId)
                        .get();
                    
                    console.log(`Retrieved ${auditsSnapshot.size} audit documents without ordering`);
                    // wasOrdered remains false
                }
                
            } catch (queryErr) {
                console.error('Error querying audits:', queryErr);
                
                // Check if the error is related to missing index
                if (queryErr.code === 'failed-precondition' && queryErr.message.includes('index')) {
                    showNotification('Database index not configured. Composite index needed for branchId and timestamp fields.', 'error');
                    console.error('Missing index error:', queryErr.message);
                    
                    // Show a helpful notification about the index issue
                    showIndexHelp(queryErr);
                } else {
                    showNotification('Error loading audits: ' + queryErr.message, 'error');
                }
                
                allAudits = [];
                showEmptyState();
                hideLoading();
                return;
            }
            
            if (!auditsSnapshot || auditsSnapshot.empty) {
                console.log('No audit documents found for this branch');
                allAudits = [];
                showEmptyState();
                showNotification('No audit logs found for this branch', 'info');
            } else {
                console.log(`Processing ${auditsSnapshot.size} audit documents`);
                allAudits = auditsSnapshot.docs.map(doc => {
                    const data = doc.data();
                    console.log(`Processing audit: ${doc.id}`, data);
                    
                    // Use safe access to avoid errors with invalid data
                    const timestamp = data.timestamp ? 
                        (typeof data.timestamp.toDate === 'function' ? data.timestamp.toDate() : new Date()) : 
                        new Date();
                    
                    return {
                        id: doc.id,
                        roomNumber: data.roomNumber || 'Unknown',
                        timestamp: timestamp,
                        issues: Array.isArray(data.issues) ? data.issues : [],
                        notes: data.notes || '',
                        imageUrl: data.imageUrl || null,
                        photoAttempted: !!data.photoAttempted,
                        photoUploaded: !!data.photoUploaded
                    };
                });
                
                // Sort manually if we didn't use orderBy in the query
                // Instead of checking query structure which might vary across Firestore versions,
                // use our wasOrdered flag
                if (typeof wasOrdered === 'undefined' || wasOrdered === false) {
                    console.log('Sorting audit data manually by timestamp');
                    allAudits.sort((a, b) => {
                        // Sort newer first (descending)
                        return b.timestamp.getTime() - a.timestamp.getTime();
                    });
                }
                
                console.log(`Processed ${allAudits.length} audits for rendering`);
                renderAudits();
                hideEmptyState();
                
                if (allAudits.length > 0) {
                    showNotification(`Loaded ${allAudits.length} audit logs`, 'success');
                }
                
                // Update button states based on loaded data
                updateBranchState();
            }
            
            hideLoading();
        } catch (error) {
            console.error('Error loading audits:', error);
            
            // Check if this is the specific explicitOrderBy error and handle it gracefully
            if (error instanceof TypeError && error.message.includes('explicitOrderBy')) {
                console.log('Caught explicitOrderBy TypeError, still attempting to render audits');
                
                // If we have audits, still try to render them
                if (allAudits && allAudits.length > 0) {
                    // Sort the audits manually since we know orderBy failed
                    console.log('Sorting audit data manually by timestamp due to error');
                    allAudits.sort((a, b) => {
                        // Sort newer first (descending)
                        return b.timestamp.getTime() - a.timestamp.getTime();
                    });
                    
                    // Now try to render
                    try {
                        renderAudits();
                        hideEmptyState();
                        showNotification(`Loaded ${allAudits.length} audit logs`, 'success');
                    } catch (renderError) {
                        console.error('Failed to render audits after error:', renderError);
                        showNotification('Error displaying audit logs', 'error');
                        showEmptyState();
                    }
                    return;
                }
            }
            
            // Try to continue rendering if we have audits despite the error
            if (allAudits && allAudits.length > 0) {
                console.log(`Attempting to render ${allAudits.length} audits despite error...`);
                try {
                    renderAudits();
                    hideEmptyState();
                    showNotification(`Loaded ${allAudits.length} audit logs`, 'warning');
                } catch (renderError) {
                    console.error('Failed to render audits after error:', renderError);
                    showNotification('Error displaying audit logs', 'error');
                    showEmptyState();
                }
            } else {
                hideLoading();
                showNotification('Failed to load audit logs: ' + error.message, 'error');
                showEmptyState();
            }
        }
    }
    
    // Render audits to the table
    function renderAudits(auditsToRender = allAudits) {
        console.log(`renderAudits called with ${auditsToRender ? auditsToRender.length : 0} audits`);
        auditLogsBody.innerHTML = '';
        
        if (!auditsToRender || auditsToRender.length === 0) {
            console.log('No audits to render, showing empty state');
            showEmptyState();
            return;
        }
        
        console.log(`Rendering ${auditsToRender.length} audits to the table`);
        
        try {
            auditsToRender.forEach((audit, index) => {
                if (!audit) {
                    console.warn(`Audit at index ${index} is null or undefined, skipping`);
                    return;
                }
                
                console.log(`Rendering audit ${index+1}/${auditsToRender.length}: Room ${audit.roomNumber || 'Unknown'}`);
                
                try {
                    const row = document.createElement('tr');
                    
                    // Room number cell
                    const roomCell = document.createElement('td');
                    roomCell.innerHTML = `<span class="room-number">${audit.roomNumber || 'Unknown'}</span>`;
                    
                    // Date & time cell
                    const dateCell = document.createElement('td');
                    const formattedDate = formatDate(audit.timestamp);
                    dateCell.innerHTML = `<span class="audit-date">${formattedDate}</span>`;
                    
                    // Issues cell
                    const issuesCell = document.createElement('td');
                    const tagsContainer = document.createElement('div');
                    tagsContainer.className = 'tags-container';
                    
                    if (audit.issues && audit.issues.length > 0) {
                        audit.issues.forEach(issue => {
                            if (issue) {
                                const tag = document.createElement('span');
                                tag.className = 'tag issue';
                                tag.textContent = issue;
                                tagsContainer.appendChild(tag);
                            }
                        });
                        
                        // If we didn't add any tags (all issues were null/undefined)
                        if (tagsContainer.children.length === 0) {
                            const tag = document.createElement('span');
                            tag.className = 'tag';
                            tag.textContent = 'No issues found';
                            tagsContainer.appendChild(tag);
                        }
                    } else {
                        const tag = document.createElement('span');
                        tag.className = 'tag';
                        tag.textContent = 'No issues found';
                        tagsContainer.appendChild(tag);
                    }
                    
                    issuesCell.appendChild(tagsContainer);
                    
                    // Actions cell
                    const actionsCell = document.createElement('td');
                    const viewButton = document.createElement('button');
                    viewButton.className = 'view-details-btn';
                    viewButton.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                        View Details
                    `;
                    
                    viewButton.addEventListener('click', () => {
                        showAuditDetails(audit);
                    });
                    
                    actionsCell.appendChild(viewButton);
                    
                    // Add all cells to the row
                    row.appendChild(roomCell);
                    row.appendChild(dateCell);
                    row.appendChild(issuesCell);
                    row.appendChild(actionsCell);
                    
                    // Add row to table
                    auditLogsBody.appendChild(row);
                    
                } catch (renderError) {
                    console.error(`Error rendering audit row ${index}:`, renderError);
                }
            });
            
            // Make sure action buttons are enabled if we have successfully displayed audits
            if (currentBranch && auditsToRender.length > 0) {
                enableActionButtons();
                updateBranchIndicator(currentBranch);
            }
            
            hideEmptyState();
        } catch (error) {
            console.error('Error rendering audits:', error);
            showNotification('Error displaying audits', 'error');
        }
    }
    
    // Filter audits based on search term AND selected issue checkboxes
    function filterAudits(searchTerm = searchInput.value.toLowerCase()) {
        // Ensure selected issues are lowercased for comparison
        const selectedIssues = Array.from(document.querySelectorAll('.issue-filter-checkbox:checked')).map(cb => cb.value.toLowerCase());

        const filteredAudits = allAudits.filter(audit => {
            const matchesSearch = !searchTerm || 
                                  audit.roomNumber.toLowerCase().includes(searchTerm) ||
                                  (audit.notes && audit.notes.toLowerCase().includes(searchTerm)) ||
                                  (audit.issues && audit.issues.some(issue => issue.toLowerCase().includes(searchTerm)));

            // Check if the audit matches any selected issue filters (case-insensitive)
            const matchesIssues = selectedIssues.length === 0 || 
                                  (audit.issues && selectedIssues.some(selectedIssue => 
                                      // Check if any issue in the audit's list CONTAINS the selected filter keyword (case-insensitive)
                                      audit.issues.some(issue => issue.toLowerCase().includes(selectedIssue))
                                  ));

            return matchesSearch && matchesIssues;
        });
        
        renderAudits(filteredAudits);
    }
    
    // Format date for display
    function formatDate(date) {
        if (!date) return 'Unknown';
        
        return new Intl.DateTimeFormat('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    }
    
    // Show empty state
    function showEmptyState() {
        emptyState.style.display = 'block';
        logsTableContainer.style.display = 'none';
    }
    
    // Hide empty state
    function hideEmptyState() {
        emptyState.style.display = 'none';
        logsTableContainer.style.display = 'block';
    }
    
    // Show notification
    function showNotification(message, type = 'info') {
        // Check if notification function exists in the global scope
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
            return;
        }
        
        console.warn('Modern notification system not available, using fallback');
        
        // Create a simple notification
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span>${message}</span>
            </div>
        `;
        
        // Add styles if they don't exist
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
    
    // Show audit details modal
    function showAuditDetails(audit) {
        // Create modal element
        const modal = document.createElement('div');
        modal.className = 'audit-detail-modal';
        
        let issuesList = '';
        if (audit.issues && audit.issues.length > 0) {
            issuesList = `
                <ul class="issues-list">
                    ${audit.issues.map(issue => `<li>${issue}</li>`).join('')}
                </ul>
            `;
        } else {
            issuesList = '<p>No issues were found during this audit.</p>';
        }
        
        let imageSection = '';
        if (audit.imageUrl) {
            imageSection = `
                <div class="audit-image-container">
                    <h3>Evidence Photo</h3>
                    <img src="${audit.imageUrl}" alt="Room audit evidence" class="audit-image">
                </div>
            `;
        }
        
        modal.innerHTML = `
            <div class="audit-detail-content">
                <div class="audit-detail-header">
                    <h2>Room ${audit.roomNumber} Audit Details</h2>
                    <button class="close-modal-btn">&times;</button>
                </div>
                <div class="audit-detail-body">
                    <div class="audit-meta">
                        <p><strong>Date:</strong> ${formatDate(audit.timestamp)}</p>
                    </div>
                    
                    <div class="audit-issues">
                        <h3>Issues Found</h3>
                        ${issuesList}
                    </div>
                    
                    <div class="audit-notes">
                        <h3>Additional Notes</h3>
                        <p>${audit.notes || 'No additional notes were provided.'}</p>
                    </div>
                    
                    ${imageSection}
                </div>
            </div>
        `;
        
        // Add styles for the modal
        const style = document.createElement('style');
        style.textContent = `
            .audit-detail-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
            }
            
            .audit-detail-content {
                background: white;
                border-radius: 12px;
                width: 90%;
                max-width: 600px;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
            }
            
            .audit-detail-header {
                padding: 1.5rem;
                border-bottom: 1px solid #e2e8f0;
                display: flex;
                justify-content: space-between;
                align-items: center;
                position: sticky;
                top: 0;
                background: white;
                z-index: 1;
            }
            
            .audit-detail-header h2 {
                margin: 0;
                font-family: 'Montserrat', sans-serif;
                color: var(--primary-color);
            }
            
            .close-modal-btn {
                background: none;
                border: none;
                font-size: 1.5rem;
                cursor: pointer;
                color: #64748b;
            }
            
            .audit-detail-body {
                padding: 1.5rem;
            }
            
            .audit-meta {
                margin-bottom: 1.5rem;
                padding-bottom: 1rem;
                border-bottom: 1px solid #f1f5f9;
            }
            
            .audit-issues, .audit-notes {
                margin-bottom: 1.5rem;
            }
            
            .audit-issues h3, .audit-notes h3 {
                color: #334155;
                font-family: 'Montserrat', sans-serif;
                margin-bottom: 0.75rem;
            }
            
            .issues-list {
                padding-left: 1.5rem;
                margin: 0;
            }
            
            .issues-list li {
                margin-bottom: 0.5rem;
                color: #b91c1c;
            }
            
            .audit-image-container {
                margin-top: 1.5rem;
            }
            
            .audit-image {
                max-width: 100%;
                border-radius: 8px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(modal);
        
        // Close modal on click outside or on close button
        const closeBtn = modal.querySelector('.close-modal-btn');
        closeBtn.addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }
    
    // Helpful function to show index help UI
    function showIndexHelp(error) {
        // Check if error contains a URL to create the index
        if (!error.message || !error.message.includes('create it here')) {
            return;
        }
        
        // Extract the index URL
        const indexUrl = error.message.match(/https:\/\/console\.firebase\.google\.com[^\s"']+/);
        if (!indexUrl) {
            return;
        }
        
        // Remove any existing index help
        const existingHelp = document.getElementById('indexHelpPanel');
        if (existingHelp) {
            existingHelp.remove();
        }
        
        // Create a help panel
        const helpPanel = document.createElement('div');
        helpPanel.id = 'indexHelpPanel';
        helpPanel.style.position = 'fixed';
        helpPanel.style.bottom = '20px';
        helpPanel.style.left = '20px';
        helpPanel.style.width = '350px';
        helpPanel.style.backgroundColor = 'white';
        helpPanel.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.2)';
        helpPanel.style.borderRadius = '8px';
        helpPanel.style.padding = '15px';
        helpPanel.style.zIndex = '1000';
        helpPanel.style.border = '1px solid #e2e8f0';
        
        helpPanel.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <h3 style="margin: 0; color: #3a7bd5; font-size: 16px;">Missing Database Index</h3>
                <button id="closeIndexHelp" style="background: none; border: none; cursor: pointer; font-size: 16px; color: #64748b;">&times;</button>
            </div>
            <p style="margin: 10px 0; font-size: 14px;">
                The audit logs require a special database configuration (an index) to work properly. 
                The data is being displayed but might not be in the correct order.
            </p>
            <a href="${indexUrl[0]}" target="_blank" 
               style="display: block; margin: 15px 0; padding: 8px 16px; background-color: #3a7bd5; 
                      color: white; border-radius: 4px; text-decoration: none; text-align: center; font-weight: 500; font-size: 14px;">
                Create Required Index
            </a>
            <p style="margin: 5px 0; font-size: 12px; color: #64748b;">
                After creating the index, refresh this page to see properly sorted audit logs.
            </p>
        `;
        
        document.body.appendChild(helpPanel);
        
        // Add close button functionality
        document.getElementById('closeIndexHelp').addEventListener('click', () => {
            helpPanel.remove();
        });
        
        // Auto-remove after 30 seconds
        setTimeout(() => {
            if (document.body.contains(helpPanel)) {
                helpPanel.remove();
            }
        }, 30000);
    }
    
    // Update UI based on current branch state
    function updateBranchState() {
        // Make sure we update the branch display in the branch selector
        if (currentBranch) {
            // Set the select value if not already set
            if (branchSelect.value !== currentBranch) {
                branchSelect.value = currentBranch;
            }
            
            // Update the branch indicator and enable buttons
            updateBranchIndicator(currentBranch);
            
            // Only enable buttons if we have audit data
            if (allAudits && allAudits.length > 0) {
                enableActionButtons();
            } else {
                // Disable only the export/print buttons, but keep delete enabled
                const exportExcelBtn = document.getElementById('exportExcelBtn');
                const printPdfBtn = document.getElementById('printPdfBtn');
                
                if (exportExcelBtn) exportExcelBtn.setAttribute('disabled', true);
                if (printPdfBtn) printPdfBtn.setAttribute('disabled', true);
                
                // Keep delete button enabled as user might want to clean up
                const deleteAllBtn = document.getElementById('deleteAllBtn');
                if (deleteAllBtn) deleteAllBtn.removeAttribute('disabled');
            }
        } else {
            // If no branch is selected, disable all buttons
            disableActionButtons();
            updateBranchIndicator(null);
        }
    }
    
    // Function to initialize page
    async function initializePage() {
        // Check if we should run the branch state check periodically
        // This helps catch cases where the branch may have changed from another tab
        setInterval(() => {
            const selectedBranch = window.hotelBranchManager.getCurrentBranch();
            if (selectedBranch !== currentBranch) {
                console.log(`Branch change detected: ${currentBranch} -> ${selectedBranch}`);
                currentBranch = selectedBranch;
                updateBranchState();
                if (selectedBranch) {
                    loadAuditsForBranch(selectedBranch);
                } else {
                    allAudits = [];
                    auditLogsBody.innerHTML = '';
                    showEmptyState();
                }
            }
        }, 5000); // Check every 5 seconds
    }
    
    // Initialize the page
    initializePage();
}); 
// Room Audit Functionality

const AUDIT_CHECKLIST = {
    lighting: [
        { id: 'main_lights', label: 'Main Room Lights', type: 'check' },
        { id: 'bathroom_lights', label: 'Bathroom Lights', type: 'check' },
        { id: 'desk_lamp', label: 'Desk Lamp', type: 'check' },
        { id: 'bedside_lamps', label: 'Bedside Lamps', type: 'check' }
    ],
    plumbing: [
        { id: 'sink_faucet', label: 'Sink Faucet', type: 'check' },
        { id: 'toilet_flush', label: 'Toilet Flush', type: 'check' },
        { id: 'shower_head', label: 'Shower Head', type: 'check' },
        { id: 'drain_flow', label: 'Drain Flow', type: 'check' },
        { id: 'water_pressure', label: 'Water Pressure', type: 'rating', max: 5 }
    ],
    climate: [
        { id: 'ac_cooling', label: 'AC Cooling', type: 'check' },
        { id: 'ac_noise', label: 'AC Noise Level', type: 'rating', max: 5 },
        { id: 'thermostat', label: 'Thermostat Function', type: 'check' },
        { id: 'ventilation', label: 'Room Ventilation', type: 'check' }
    ],
    furniture: [
        { id: 'bed_frame', label: 'Bed Frame', type: 'check' },
        { id: 'mattress', label: 'Mattress Condition', type: 'rating', max: 5 },
        { id: 'desk_chair', label: 'Desk & Chair', type: 'check' },
        { id: 'wardrobe', label: 'Wardrobe/Closet', type: 'check' },
        { id: 'curtains', label: 'Curtains/Blinds', type: 'check' }
    ],
    electronics: [
        { id: 'tv_function', label: 'TV Function', type: 'check' },
        { id: 'tv_remote', label: 'TV Remote', type: 'check' },
        { id: 'wifi_signal', label: 'WiFi Signal Strength', type: 'rating', max: 5 },
        { id: 'phone', label: 'Room Phone', type: 'check' },
        { id: 'power_outlets', label: 'Power Outlets', type: 'check' }
    ],
    safety: [
        { id: 'smoke_detector', label: 'Smoke Detector', type: 'check' },
        { id: 'door_lock', label: 'Door Lock & Security', type: 'check' },
        { id: 'emergency_info', label: 'Emergency Information', type: 'check' },
        { id: 'window_locks', label: 'Window Locks', type: 'check' }
    ]
};

class RoomAuditUI {
    constructor() {
        this.currentRoom = null;
        this.auditData = {};
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;
        
        // Create and append modal HTML
        this.createModalHTML();
        
        // Initialize event listeners
        this.setupEventListeners();
        
        this.initialized = true;
    }

    createModalHTML() {
        const modalHTML = `
            <div id="roomAuditModal" class="modal">
                <div class="modal-content audit-modal">
                    <div class="modal-header">
                        <h2>Room Audit - <span id="roomNumber"></span></h2>
                        <button class="close-btn">&times;</button>
                    </div>
                    <div class="audit-content">
                        <div class="audit-tabs">
                            ${Object.keys(AUDIT_CHECKLIST).map(category => `
                                <button class="tab-btn" data-category="${category}">
                                    ${category.charAt(0).toUpperCase() + category.slice(1)}
                                </button>
                            `).join('')}
                        </div>
                        <div class="audit-sections">
                            ${Object.entries(AUDIT_CHECKLIST).map(([category, items]) => `
                                <div class="audit-section" data-category="${category}">
                                    <h3>${category.charAt(0).toUpperCase() + category.slice(1)}</h3>
                                    <div class="checklist">
                                        ${items.map(item => `
                                            <div class="checklist-item">
                                                <label for="${item.id}">${item.label}</label>
                                                ${item.type === 'check' ? `
                                                    <div class="check-options">
                                                        <button class="status-btn" data-status="pass" data-item="${item.id}">Pass</button>
                                                        <button class="status-btn" data-status="fail" data-item="${item.id}">Fail</button>
                                                        <button class="status-btn" data-status="na" data-item="${item.id}">N/A</button>
                                                    </div>
                                                ` : `
                                                    <div class="rating-options">
                                                        ${Array.from({length: item.max}, (_, i) => i + 1).map(num => `
                                                            <button class="rating-btn" data-rating="${num}" data-item="${item.id}">${num}</button>
                                                        `).join('')}
                                                    </div>
                                                `}
                                                <div class="notes-field">
                                                    <input type="text" placeholder="Add notes..." data-item="${item.id}">
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button id="saveAudit" class="btn-primary">Save Audit</button>
                        <button id="exportAuditPDF" class="btn-secondary">Export PDF</button>
                    </div>
                </div>
            </div>
        `;

        // Add styles
        const styles = `
            .audit-modal {
                width: 90%;
                max-width: 800px;
                max-height: 90vh;
                margin: 5vh auto;
                display: flex;
                flex-direction: column;
            }

            .modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding-bottom: 15px;
                border-bottom: 1px solid #ddd;
            }

            .close-btn {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
            }

            .audit-content {
                flex: 1;
                overflow-y: auto;
                padding: 20px 0;
            }

            .audit-tabs {
                display: flex;
                gap: 10px;
                margin-bottom: 20px;
                flex-wrap: wrap;
            }

            .tab-btn {
                padding: 8px 16px;
                border: 1px solid #ddd;
                border-radius: 4px;
                background: none;
                cursor: pointer;
                transition: all 0.2s;
            }

            .tab-btn.active {
                background: #007bff;
                color: white;
                border-color: #0056b3;
            }

            .audit-section {
                display: none;
            }

            .audit-section.active {
                display: block;
            }

            .checklist {
                display: flex;
                flex-direction: column;
                gap: 15px;
            }

            .checklist-item {
                padding: 10px;
                border: 1px solid #ddd;
                border-radius: 4px;
            }

            .check-options {
                display: flex;
                gap: 10px;
                margin: 10px 0;
            }

            .status-btn {
                padding: 5px 15px;
                border: 1px solid #ddd;
                border-radius: 4px;
                background: none;
                cursor: pointer;
            }

            .status-btn.active[data-status="pass"] {
                background: #28a745;
                color: white;
            }

            .status-btn.active[data-status="fail"] {
                background: #dc3545;
                color: white;
            }

            .status-btn.active[data-status="na"] {
                background: #6c757d;
                color: white;
            }

            .rating-options {
                display: flex;
                gap: 5px;
                margin: 10px 0;
            }

            .rating-btn {
                width: 30px;
                height: 30px;
                border: 1px solid #ddd;
                border-radius: 4px;
                background: none;
                cursor: pointer;
            }

            .rating-btn.active {
                background: #007bff;
                color: white;
            }

            .notes-field input {
                width: 100%;
                padding: 8px;
                border: 1px solid #ddd;
                border-radius: 4px;
                margin-top: 5px;
            }

            .modal-footer {
                padding-top: 15px;
                border-top: 1px solid #ddd;
                display: flex;
                gap: 10px;
                justify-content: flex-end;
            }

            .btn-secondary {
                background-color: #6c757d;
                color: white;
                padding: 10px 20px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
            }

            .btn-secondary:hover {
                background-color: #5a6268;
            }
        `;

        // Add modal and styles to document
        const styleElement = document.createElement('style');
        styleElement.textContent = styles;
        document.head.appendChild(styleElement);

        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHTML;
        document.body.appendChild(modalContainer);
    }

    setupEventListeners() {
        const modal = document.getElementById('roomAuditModal');
        const closeBtn = modal.querySelector('.close-btn');
        const tabButtons = modal.querySelectorAll('.tab-btn');
        const statusButtons = modal.querySelectorAll('.status-btn');
        const ratingButtons = modal.querySelectorAll('.rating-btn');
        const saveButton = document.getElementById('saveAudit');
        const exportButton = document.getElementById('exportAuditPDF');
        const noteInputs = modal.querySelectorAll('.notes-field input');

        // Close button
        closeBtn.addEventListener('click', () => {
            this.closeAudit();
        });

        // Tab switching
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const category = button.dataset.category;
                this.switchTab(category);
            });
        });

        // Status buttons
        statusButtons.forEach(button => {
            button.addEventListener('click', () => {
                const item = button.dataset.item;
                const status = button.dataset.status;
                this.updateItemStatus(item, status, button);
            });
        });

        // Rating buttons
        ratingButtons.forEach(button => {
            button.addEventListener('click', () => {
                const item = button.dataset.item;
                const rating = parseInt(button.dataset.rating);
                this.updateItemRating(item, rating, button);
            });
        });

        // Note inputs
        noteInputs.forEach(input => {
            input.addEventListener('change', () => {
                const item = input.dataset.item;
                this.updateItemNotes(item, input.value);
            });
        });

        // Save button
        saveButton.addEventListener('click', async () => {
            await this.saveAudit();
        });

        // Export button
        exportButton.addEventListener('click', () => {
            this.exportAuditPDF();
        });
    }

    openAudit(roomNumber) {
        this.currentRoom = roomNumber;
        this.auditData = {};
        
        // Reset UI
        document.getElementById('roomNumber').textContent = `Room ${roomNumber}`;
        document.querySelectorAll('.status-btn.active').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.rating-btn.active').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.notes-field input').forEach(input => input.value = '');
        
        // Show first tab
        this.switchTab(Object.keys(AUDIT_CHECKLIST)[0]);
        
        // Show modal
        document.getElementById('roomAuditModal').style.display = 'block';
    }

    closeAudit() {
        document.getElementById('roomAuditModal').style.display = 'none';
        this.currentRoom = null;
        this.auditData = {};
    }

    switchTab(category) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === category);
        });

        // Update sections
        document.querySelectorAll('.audit-section').forEach(section => {
            section.classList.toggle('active', section.dataset.category === category);
        });
    }

    updateItemStatus(item, status, button) {
        // Remove active class from sibling buttons
        const siblings = button.parentElement.querySelectorAll('.status-btn');
        siblings.forEach(btn => btn.classList.remove('active'));
        
        // Add active class to clicked button
        button.classList.add('active');
        
        // Update audit data
        if (!this.auditData[item]) this.auditData[item] = {};
        this.auditData[item].status = status;
    }

    updateItemRating(item, rating, button) {
        // Remove active class from sibling buttons
        const siblings = button.parentElement.querySelectorAll('.rating-btn');
        siblings.forEach(btn => btn.classList.remove('active'));
        
        // Add active class to clicked button
        button.classList.add('active');
        
        // Update audit data
        if (!this.auditData[item]) this.auditData[item] = {};
        this.auditData[item].rating = rating;
    }

    updateItemNotes(item, notes) {
        if (!this.auditData[item]) this.auditData[item] = {};
        this.auditData[item].notes = notes;
    }

    async saveAudit() {
        try {
            if (!this.currentRoom) throw new Error('No room selected');
            
            const auditData = {
                roomNumber: this.currentRoom,
                timestamp: new Date().toISOString(),
                items: this.auditData
            };
            
            await window.roomAuditManager.saveAudit(this.currentRoom, auditData);
            this.showNotification('Audit saved successfully');
            this.closeAudit();
        } catch (error) {
            console.error('Error saving audit:', error);
            this.showError('Failed to save audit');
        }
    }

    async exportAuditPDF() {
        try {
            if (!this.currentRoom) throw new Error('No room selected');
            
            // Create PDF content
            const content = this.generatePDFContent();
            
            // Generate PDF using jsPDF
            const pdf = new jsPDF();
            
            // Add content to PDF
            let yOffset = 20;
            
            // Add header
            pdf.setFontSize(16);
            pdf.text(`Room ${this.currentRoom} Audit Report`, 20, yOffset);
            yOffset += 10;
            
            pdf.setFontSize(12);
            pdf.text(`Date: ${new Date().toLocaleDateString()}`, 20, yOffset);
            yOffset += 20;
            
            // Add categories
            Object.entries(AUDIT_CHECKLIST).forEach(([category, items]) => {
                // Add category header
                pdf.setFontSize(14);
                pdf.text(category.charAt(0).toUpperCase() + category.slice(1), 20, yOffset);
                yOffset += 10;
                
                // Add items
                pdf.setFontSize(10);
                items.forEach(item => {
                    const itemData = this.auditData[item.id] || {};
                    let status = itemData.status || 'Not checked';
                    if (item.type === 'rating') {
                        status = itemData.rating ? `Rating: ${itemData.rating}/5` : 'Not rated';
                    }
                    
                    const text = `${item.label}: ${status}`;
                    if (yOffset > 270) {
                        pdf.addPage();
                        yOffset = 20;
                    }
                    
                    pdf.text(text, 30, yOffset);
                    yOffset += 7;
                    
                    if (itemData.notes) {
                        pdf.setTextColor(100);
                        pdf.text(`Notes: ${itemData.notes}`, 40, yOffset);
                        pdf.setTextColor(0);
                        yOffset += 7;
                    }
                });
                
                yOffset += 10;
            });
            
            // Save PDF
            pdf.save(`room_${this.currentRoom}_audit.pdf`);
            
        } catch (error) {
            console.error('Error exporting audit:', error);
            this.showError('Failed to export audit to PDF');
        }
    }

    generatePDFContent() {
        // Generate content for PDF export
        const content = [];
        
        Object.entries(AUDIT_CHECKLIST).forEach(([category, items]) => {
            content.push({
                text: category.charAt(0).toUpperCase() + category.slice(1),
                style: 'categoryHeader'
            });
            
            items.forEach(item => {
                const itemData = this.auditData[item.id] || {};
                content.push({
                    text: `${item.label}: ${itemData.status || 'Not checked'}`,
                    style: 'item'
                });
                
                if (itemData.notes) {
                    content.push({
                        text: `Notes: ${itemData.notes}`,
                        style: 'notes'
                    });
                }
            });
            
            content.push({ text: '', margin: [0, 10] });
        });
        
        return content;
    }

    showNotification(message) {
        if (window.showNotification) {
            window.showNotification(message, 'success');
        } else {
            alert(message);
        }
    }

    showError(message) {
        if (window.showError) {
            window.showError(message);
        } else {
            alert('Error: ' + message);
        }
    }
}

// Initialize room audit UI
window.roomAuditUI = new RoomAuditUI();
document.addEventListener('DOMContentLoaded', () => {
    window.roomAuditUI.initialize();
}); 
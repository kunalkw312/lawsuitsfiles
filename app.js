// ==========================================
// STATE MANAGEMENT & SAMPLE DATA
// ==========================================

// Mapping of structural categories to their corresponding asset filenames
const CATEGORY_IMAGES = {
    "Civil Litigation": "assets/Civil Litigation.png",
    "Criminal Cases": "assets/Criminal Cases.png",
    "Family Law": "assets/Family Law.png",
    "Corporate & Business Law": "assets/Corporate & Business Law.png",
    "Personal Injury & Accident Claims": "assets/Personal Injury & Accident Claims.png"
};

// Initial/Mock database stores
let casesData = [
    {
        id: "case-1",
        title: "National Consumer Data Security Breach Litigation",
        category: "Civil Litigation",
        description: "Investigating corporate data infrastructure failures that exposed private identification metrics, passwords, and banking histories of millions of users without adequate safeguards."
    },
    {
        id: "case-2",
        title: "Defective Automotive Brake System Defect Investigation",
        category: "Personal Injury & Accident Claims",
        description: "Tracking deployment and system errors across electronic emergency brake models manufactured between 2022 and 2025 that cause unexpected lock-ups during transit."
    },
    {
        id: "case-3",
        title: "Commercial Contract Breach & Antitrust Actions",
        category: "Corporate & Business Law",
        description: "A class action exploration dealing with non-compete overreaches and horizontal pricing coordination structures negatively impacting independent regional suppliers."
    }
];

let leadsData = [
    {
        id: "lead-1",
        firstName: "Jane",
        lastName: "Doe",
        email: "jane.doe@example.com",
        phone: "555-0199",
        category: "Civil Litigation",
        message: "My data was compromised in the breach last month. Received an explicit alert notice."
    }
];

// Helper to gracefully fallback if a structural category is missing a mapped image asset
function getCaseImage(category) {
    return CATEGORY_IMAGES[category] || "https://via.placeholder.com/400x250?text=Legal+Case";
}

// ==========================================
// DOM RENDER ENGINES
// ==========================================

// Renders the 3-column tile layout on the public Cases page
function renderPublicCases() {
    const gridContainer = document.getElementById('frontendCasesList');
    if (!gridContainer) return;

    const searchVal = document.getElementById('frontendSearchCases').value.toLowerCase();
    const filterVal = document.getElementById('frontendFilterCases').value;

    const filtered = casesData.filter(item => {
        const matchesSearch = item.title.toLowerCase().includes(searchVal) || 
                              item.description.toLowerCase().includes(searchVal);
        const matchesCategory = (filterVal === 'All' || item.category === filterVal);
        return matchesSearch && matchesCategory;
    });

    if (filtered.length === 0) {
        gridContainer.innerHTML = `<p style="grid-column: span 3; text-align: center; color: #64748b; padding: 40px 0;">No active cases matched your selected parameters.</p>`;
        return;
    }

    gridContainer.innerHTML = filtered.map(item => `
        <div class="case-card" data-id="${item.id}">
            <div class="case-img-wrap">
                <img src="${getCaseImage(item.category)}" alt="${item.category}" onerror="this.src='https://via.placeholder.com/400x250?text=Legal+Case'">
            </div>
            <div class="case-card-body">
                <span class="case-category">${item.category}</span>
                <h3>${item.title}</h3>
                <p>${item.description.substring(0, 140)}${item.description.length > 140 ? '...' : ''}</p>
                <div class="case-btn-group">
                    <button class="btn btn-view-detail" data-id="${item.id}">View Detail</button>
                    <button class="btn btn-secondary btn-tile-contact" data-category="${item.category}">Contact Us</button>
                </div>
            </div>
        </div>
    `).join('');

    // Attach explicit click event interceptors to newly rendered tile buttons
    gridContainer.querySelectorAll('.btn-view-detail').forEach(btn => {
        btn.addEventListener('click', () => showCaseDetailPage(btn.getAttribute('data-id')));
    });

    gridContainer.querySelectorAll('.btn-tile-contact').forEach(btn => {
        btn.addEventListener('click', () => {
            const cat = btn.getAttribute('data-category');
            forwardToContactWithCategory(cat);
        });
    });
}

// Transitions views to show a specific case in detail and pre-fills its inline form
function showCaseDetailPage(caseId) {
    const caseObj = casesData.find(c => c.id === caseId);
    if (!caseObj) return;

    const detailsContainer = document.getElementById('dynamicCaseDetailContainer');
    if (!detailsContainer) return;

    // Inject matching dynamic view content
    detailsContainer.innerHTML = `
        <div class="details-banner">
            <img src="${getCaseImage(caseObj.category)}" alt="${caseObj.category}" onerror="this.src='https://via.placeholder.com/1100x380?text=Investigation+Banner'">
        </div>
        <div class="details-content">
            <span class="case-category" style="margin-bottom: 15px;">${caseObj.category}</span>
            <h1>${caseObj.title}</h1>
            <div class="full-description">${caseObj.description}</div>
        </div>
    `;

    // Pre-select category configuration on the internal dynamic inline contact form
    const inlineSelect = document.getElementById('inlineCaseContactForm').querySelector('select');
    if (inlineSelect) {
        inlineSelect.value = caseObj.category;
    }

    // Trigger explicit single page container routing transition
    if (typeof window.navigateToPage === 'function') {
        window.navigateToPage('case-details');
    }
}

// Redirects and sets categories for standard global actions
function forwardToContactWithCategory(categoryName) {
    const publicSelect = document.getElementById('leadCategory');
    if (publicSelect) {
        publicSelect.value = categoryName;
    }
    if (typeof window.navigateToPage === 'function') {
        window.navigateToPage('connect');
    }
}

// Renders Management Data inside Admin Panels
function renderAdminDashboard() {
    // 1. Render Admin Incoming Leads
    const leadsTableBody = document.querySelector('#adminLeadsTable tbody');
    const leadFilter = document.getElementById('adminLeadFilter').value;
    
    if (leadsTableBody) {
        const filteredLeads = leadsData.filter(l => leadFilter === 'All' || l.category === leadFilter);
        
        if (filteredLeads.length === 0) {
            leadsTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#94a3b8;">No lead records stored.</td></tr>`;
        } else {
            leadsTableBody.innerHTML = filteredLeads.map(l => `
                <tr>
                    <td><strong>${l.firstName} ${l.lastName}</strong></td>
                    <td><a href="mailto:${l.email}">${l.email}</a></td>
                    <td>${l.phone}</td>
                    <td><span class="case-category" style="background:#475569">${l.category}</span></td>
                    <td style="font-size:0.9em; max-width: 300px; white-space: pre-wrap;">${l.message}</td>
                </tr>
            `).join('');
        }
    }

    // 2. Render Admin Active Case Manager Rows (with Edit buttons)
    const casesTableBody = document.querySelector('#adminCasesTable tbody');
    if (casesTableBody) {
        if (casesData.length === 0) {
            casesTableBody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:#94a3b8;">No dynamic cases posted.</td></tr>`;
        } else {
            casesTableBody.innerHTML = casesData.map(c => `
                <tr>
                    <td><strong>${c.title}</strong></td>
                    <td><span class="case-category" style="background:#0f172a">${c.category}</span></td>
                    <td>
                        <div style="display:flex; gap: 8px;">
                            <button class="btn btn-warning btn-admin-edit" data-id="${c.id}" style="padding: 6px 12px; font-size: 0.85em;">Edit</button>
                            <button class="btn btn-danger btn-admin-delete" data-id="${c.id}" style="padding: 6px 12px; font-size: 0.85em;">Delete</button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }

        // Hook operational handlers back onto Admin Table controllers
        casesTableBody.querySelectorAll('.btn-admin-edit').forEach(btn => {
            btn.addEventListener('click', () => loadCaseIntoAdminForm(btn.getAttribute('data-id')));
        });
        casesTableBody.querySelectorAll('.btn-admin-delete').forEach(btn => {
            btn.addEventListener('click', () => deleteCaseTracker(btn.getAttribute('data-id')));
        });
    }
}

// ==========================================
// ADMIN PANEL CRUD OPERATIONS
// ==========================================

// Pre-populates the admin form with structural variables to process modifications
function loadCaseIntoAdminForm(caseId) {
    const targetCase = casesData.find(c => c.id === caseId);
    if (!targetCase) return;

    // Shift text inputs to reflect edit status
    document.getElementById('editCaseTargetId').value = targetCase.id;
    document.getElementById('newCaseTitle').value = targetCase.title;
    document.getElementById('newCaseCategory').value = targetCase.category;
    document.getElementById('newCaseDesc').value = targetCase.description;

    document.getElementById('adminFormHeadline').innerText = "⚡ Edit Case Parameters Mode";
    document.getElementById('adminFormSubmitBtn').innerText = "Save Modified Changes";
    document.getElementById('adminFormSubmitBtn').className = "btn btn-warning";
    document.getElementById('cancelEditCaseBtn').style.display = "inline-block";

    // Smooth scroll up within the modal environment directly to the form element
    document.getElementById('addCaseForm').scrollIntoView({ behavior: 'smooth' });
}

// Reverts the Admin Form from Editing back to Standard Creation
function clearAdminCaseFormState() {
    document.getElementById('editCaseTargetId').value = "";
    document.getElementById('addCaseForm').reset();
    
    document.getElementById('adminFormHeadline').innerText = "Add New Case Investigation";
    document.getElementById('adminFormSubmitBtn').innerText = "Add Case to Website";
    document.getElementById('adminFormSubmitBtn').className = "btn";
    document.getElementById('cancelEditCaseBtn').style.display = "none";
}

// Disposes of an unwanted case listing row
function deleteCaseTracker(caseId) {
    if (confirm("Are you sure you want to completely erase this case profile from the tracking records?")) {
        casesData = casesData.filter(c => c.id !== caseId);
        
        // Reset processing forms if active target is deleted mid-flight
        if(document.getElementById('editCaseTargetId').value === caseId) {
            clearAdminCaseFormState();
        }

        renderAdminDashboard();
        renderPublicCases();
    }
}

// CSV Export Utility for Administrative Logs
function exportLeadsToCSV() {
    if (leadsData.length === 0) {
        alert("There is no structural data inside the collection to build a download output payload.");
        return;
    }
    
    let csvContent = "data:text/csv;charset=utf-8,First Name,Last Name,Email,Phone,Category,Message\n";
    leadsData.forEach(l => {
        let cleanMsg = l.message.replace(/"/g, '""');
        csvContent += `"${l.firstName}","${l.lastName}","${l.email}","${l.phone}","${l.category}","${cleanMsg}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", encodedUri);
    downloadAnchor.setAttribute("download", `lawsuitfiles_leads_export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
}

// ==========================================
// EVENT CONTROLLER BINDINGS
// ==========================================

document.addEventListener('DOMContentLoaded', () => {

    // 1. Live Filtering Inputs
    document.getElementById('frontendSearchCases').addEventListener('input', renderPublicCases);
    document.getElementById('frontendFilterCases').addEventListener('change', renderPublicCases);
    document.getElementById('adminLeadFilter').addEventListener('change', renderAdminDashboard);
    document.getElementById('exportCsvBtn').addEventListener('click', exportLeadsToCSV);
    
    // Cancel editing context trigger
    document.getElementById('cancelEditCaseBtn').addEventListener('click', clearAdminCaseFormState);

    // 2. Public Multi-Page Form Ingest Interceptors
    document.getElementById('publicContactForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const newLead = {
            id: 'lead-' + Date.now(),
            firstName: document.getElementById('leadFirstName').value,
            lastName: document.getElementById('leadLastName').value,
            email: document.getElementById('leadEmail').value,
            phone: document.getElementById('leadPhone').value,
            category: document.getElementById('leadCategory').value,
            message: document.getElementById('leadMessage').value
        };
        leadsData.push(newLead);
        this.reset();
        alert("Your secure information profile has been registered. Evaluation networks are updating.");
        renderAdminDashboard();
    });

    document.getElementById('inlineCaseContactForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const newLead = {
            id: 'lead-' + Date.now(),
            firstName: document.getElementById('inlineLeadFirstName').value,
            lastName: document.getElementById('inlineLeadLastName').value,
            email: document.getElementById('inlineLeadEmail').value,
            phone: document.getElementById('inlineLeadPhone').value,
            category: document.getElementById('inlineLeadCategory').value,
            message: document.getElementById('inlineLeadMessage').value
        };
        leadsData.push(newLead);
        this.reset();
        alert("Your targeted case information request has been logged successfully.");
        renderAdminDashboard();
        window.navigateToPage('cases');
    });

    // 3. Admin Security Processing Form
    document.getElementById('adminLoginForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const email = document.getElementById('adminEmail').value.trim();
        const password = document.getElementById('adminPassword').value.trim();

        if (email === "admin@gmail.com" && password === "admin1234") {
            document.getElementById('adminLoginBox').style.display = 'none';
            document.getElementById('adminDashboardBox').style.display = 'flex';
            renderAdminDashboard();
        } else {
            alert("Invalid clearance credentials. Authentication refused.");
        }
    });

    // 4. Admin Session Termination (Logout)
    document.getElementById('adminLogoutBtn').addEventListener('click', () => {
        document.getElementById('adminLoginForm').reset();
        clearAdminCaseFormState();
        document.getElementById('adminDashboardBox').style.display = 'none';
        document.getElementById('adminLoginBox').style.display = 'block';
        document.getElementById('adminOverlay').style.display = 'none';
    });

    // 5. Shared Case Creation & Modification Submissions Tracker
    document.getElementById('addCaseForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const targetId = document.getElementById('editCaseTargetId').value;
        const titleVal = document.getElementById('newCaseTitle').value;
        const catVal = document.getElementById('newCaseCategory').value;
        const descVal = document.getElementById('newCaseDesc').value;

        if (targetId) {
            // Processing Modification Update Path
            const idx = casesData.findIndex(c => c.id === targetId);
            if(idx !== -1) {
                casesData[idx].title = titleVal;
                casesData[idx].category = catVal;
                casesData[idx].description = descVal;
                alert("Case variables modified correctly.");
            }
            clearAdminCaseFormState();
        } else {
            // Processing New Entry Target Path
            const newCase = {
                id: 'case-' + Date.now(),
                title: titleVal,
                category: catVal,
                description: descVal
            };
            casesData.push(newCase);
            this.reset();
            alert("New investigation route listed successfully.");
        }

        renderAdminDashboard();
        renderPublicCases();
    });

    // Run foundational executions on boot
    renderPublicCases();
});

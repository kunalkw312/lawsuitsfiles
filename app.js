/**
 * LawsuitFiles - Core Application & SPA Functional Architecture Matrix
 */

import { ADMIN_CREDENTIALS, DEFAULT_SETTINGS, INITIAL_CATEGORIES, INITIAL_CASES, INITIAL_LEADS } from './config.js';

// ================= APP STATE MANAGEMENT =================
const State = {
    categories: JSON.parse(localStorage.getItem('lf_categories')) || INITIAL_CATEGORIES,
    cases: JSON.parse(localStorage.getItem('lf_cases')) || INITIAL_CASES,
    leads: JSON.parse(localStorage.getItem('lf_leads')) || INITIAL_LEADS,
    settings: JSON.parse(localStorage.getItem('lf_settings')) || DEFAULT_SETTINGS,
    activeEditCaseId: null
};

// Persist structural states to client database layer
function saveStateToStorage() {
    localStorage.setItem('lf_categories', JSON.stringify(State.categories));
    localStorage.setItem('lf_cases', JSON.stringify(State.cases));
    localStorage.setItem('lf_leads', JSON.stringify(State.leads));
    localStorage.setItem('lf_settings', JSON.stringify(State.settings));
}

// ================= APP INITIALIZATION RUNNER =================
document.addEventListener('DOMContentLoaded', () => {
    applyGlobalSettings();
    synchronizeSelectDropdowns();
    renderFrontendCases();
    renderAdminDashboardData();
    setupEventListeners();
});

// ================= UI SYSTEM COMPONENT SYNCS =================
function synchronizeSelectDropdowns() {
    // Sync Category Filter Dropdown on Directory page
    window.updateDropdownOptions('frontendFilterCases', State.categories, 'All Categories');
    // Sync Category Filter Dropdown on Admin Leads panel
    window.updateDropdownOptions('adminLeadFilter', State.categories, 'All Categories');
    // Sync Category Selector inside Front Ingest Form
    window.updateDropdownOptions('globalLeadCategory', State.categories, '-- Select Legal Category Regulating Your Case --');
    // Sync Category Selector inside Admin Add/Edit Case Form
    window.updateDropdownOptions('newCaseCategory', State.categories, 'Select Category');
}

function applyGlobalSettings() {
    // Dynamic footer string insertion
    const telNode = document.getElementById('footerTel');
    const emailNode = document.getElementById('footerEmail');
    const addrNode = document.getElementById('footerAddress');
    
    if (telNode) telNode.innerHTML = `Tel Support: ${State.settings.tel}`;
    if (emailNode) emailNode.innerHTML = `✉ Queries: ${State.settings.email}`;
    if (addrNode) addrNode.innerHTML = `📍 Intake: ${State.settings.address}`;

    // Prefill Settings Input fields within Admin section
    const inputTel = document.getElementById('settingTel');
    const inputEmail = document.getElementById('settingEmail');
    const inputAddr = document.getElementById('settingAddress');

    if (inputTel) inputTel.value = State.settings.tel;
    if (inputEmail) inputEmail.value = State.settings.email;
    if (inputAddr) inputAddr.value = State.settings.address;
}

// ================= FRONTEND RENDERING ENGINE =================
function renderFrontendCases() {
    const casesGrid = document.getElementById('frontendCasesList');
    if (!casesGrid) return;

    const searchQuery = (document.getElementById('frontendSearchCases')?.value || '').toLowerCase();
    const filterCategory = document.getElementById('frontendFilterCases')?.value || 'All';

    // Apply strict analytical filter matches
    const filteredCases = State.cases.filter(item => {
        const matchesSearch = item.title.toLowerCase().includes(searchQuery) || item.description.toLowerCase().includes(searchQuery);
        const matchesCategory = (filterCategory === 'All' || item.category === filterCategory);
        return matchesSearch && matchesCategory;
    });

    if (filteredCases.length === 0) {
        casesGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #64748b; background: #fff; border-radius: 8px; border: 1px dashed #cbd5e1;">
                <h3>No active matching case files found.</h3>
                <p style="margin-top: 8px;">Modify search parameters or browse alternative legal intake sectors.</p>
            </div>
        `;
        return;
    }

    casesGrid.innerHTML = filteredCases.map(caseItem => `
        <div class="case-card" data-id="${caseItem.id}">
            <div class="case-img-wrap">
                <img src="${caseItem.image}" alt="${caseItem.title}" onerror="this.src='https://via.placeholder.com/600x400?text=LawsuitFiles+Asset'">
            </div>
            <div class="case-card-body">
                <span class="case-category">${caseItem.category}</span>
                <h3>${caseItem.title}</h3>
                <p>${caseItem.description.substring(0, 140)}...</p>
                <div class="case-btn-group">
                    <button class="btn btn-secondary view-details-trigger" data-id="${caseItem.id}">Read Criteria</button>
                    <button class="btn claim-evaluation-trigger">Check Eligibility</button>
                </div>
            </div>
        </div>
    `).join('');

    // Attach local scope card behavior contexts
    casesGrid.querySelectorAll('.view-details-trigger').forEach(btn => {
        btn.addEventListener('click', () => exposeCaseFileDetails(btn.dataset.id));
    });

    casesGrid.querySelectorAll('.claim-evaluation-trigger').forEach(btn => {
        btn.addEventListener('click', () => {
            if (typeof window.navigateToPage === 'function') {
                window.navigateToPage('connect');
                document.getElementById('globalContactSection')?.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

function exposeCaseFileDetails(caseId) {
    const targetCase = State.cases.find(c => c.id === caseId);
    const container = document.getElementById('dynamicCaseDetailContainer');
    if (!targetCase || !container) return;

    container.innerHTML = `
        <div class="details-banner">
            <img src="${targetCase.image}" alt="${targetCase.title}" onerror="this.src='https://via.placeholder.com/1200x500?text=LawsuitFiles+Case+Investigation'">
        </div>
        <div class="details-content">
            <span class="case-category" style="margin-bottom: 15px;">${targetCase.category}</span>
            <h1>${targetCase.title}</h1>
            <hr style="border: 0; height: 1px; background: #e2e8f0; margin: 20px 0;">
            <p class="full-description">${targetCase.description}</p>
            <div style="margin-top: 40px; background: #f8f9fa; padding: 25px; border-radius: 8px; border: 1px solid #e2e8f0;">
                <h4 style="margin-bottom: 10px; color: #0a1128;">Submit an assessment statement regarding this docket</h4>
                <p style="font-size: 0.95em; color: #4a5568; margin-bottom: 20px;">If your health parameters or financial exposure profiles line up with structural requirements tracked here, file a case review application immediately.</p>
                <button class="btn" id="detailsPageActionBtn">Initiate Dynamic Claim Audit</button>
            </div>
        </div>
    `;

    document.getElementById('detailsPageActionBtn').addEventListener('click', () => {
        if (typeof window.navigateToPage === 'function') {
            window.navigateToPage('connect');
            const leadCategorySelect = document.getElementById('globalLeadCategory');
            if (leadCategorySelect) {
                leadCategorySelect.value = targetCase.category;
                if (typeof window.syncCustomSelect === 'function') {
                    window.syncCustomSelect('globalLeadCategory');
                }
            }
            document.getElementById('globalContactSection')?.scrollIntoView({ behavior: 'smooth' });
        }
    });

    if (typeof window.navigateToPage === 'function') {
        window.navigateToPage('case-details');
    }
}

// ================= ADMIN DASHBOARD OPERATION MATRICES =================
function renderAdminDashboardData() {
    renderAdminLeadsList();
    renderAdminCasesList();
    renderAdminCategoriesList();
}

function renderAdminLeadsList() {
    const tbody = document.querySelector('#adminLeadsTable tbody');
    if (!tbody) return;

    const filterVal = document.getElementById('adminLeadFilter')?.value || 'All';
    const filteredLeads = State.leads.filter(lead => filterVal === 'All' || lead.category === filterVal);

    if (filteredLeads.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 30px;">Zero intake leads match selected criteria options.</td></tr>`;
        return;
    }

    tbody.innerHTML = filteredLeads.map(lead => `
        <tr>
            <td><strong>${lead.firstName} ${lead.lastName}</strong></td>
            <td><a href="mailto:${lead.email}" style="color: #0d6efd; text-decoration: none;">${lead.email}</a></td>
            <td>${lead.phone}</td>
            <td><span class="case-category" style="background: #0a1128; font-size: 0.7em;">${lead.category}</span></td>
            <td style="max-width: 300px; font-size: 0.9em; color: #4a5568; white-space: normal; word-break: break-word;">${lead.message}</td>
        </tr>
    `).join('');
}

function renderAdminCasesList() {
    const tbody = document.querySelector('#adminCasesTable tbody');
    if (!tbody) return;

    if (State.cases.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: #94a3b8; padding: 30px;">No operational litigation directories initialized.</td></tr>`;
        return;
    }

    tbody.innerHTML = State.cases.map(item => `
        <tr>
            <td><strong>${item.title}</strong></td>
            <td><span class="case-category" style="font-size: 0.7em;">${item.category}</span></td>
            <td>
                <div style="display: flex; gap: 8px;">
                    <button class="btn btn-secondary edit-case-action-btn" data-id="${item.id}" style="padding: 6px 12px; font-size: 0.85em;">Modify</button>
                    <button class="btn btn-danger delete-case-action-btn" data-id="${item.id}" style="padding: 6px 12px; font-size: 0.85em;">Remove</button>
                </div>
            </td>
        </tr>
    `).join('');

    // Wire actions arrays
    tbody.querySelectorAll('.edit-case-action-btn').forEach(btn => {
        btn.addEventListener('click', () => enterCaseEditMode(btn.dataset.id));
    });
    tbody.querySelectorAll('.delete-case-action-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (typeof window.customConfirm === 'function') {
                window.customConfirm("Are you sure you want to permanently remove this case filing file?", () => {
                    State.cases = State.cases.filter(c => c.id !== btn.dataset.id);
                    saveStateToStorage();
                    renderFrontendCases();
                    renderAdminCasesList();
                    if (typeof window.showToast === 'function') window.showToast('Case deleted successfully', 'success');
                });
            }
        });
    });
}

function enterCaseEditMode(caseId) {
    const target = State.cases.find(c => c.id === caseId);
    if (!target) return;

    State.activeEditCaseId = caseId;
    document.getElementById('editCaseTargetId').value = caseId;
    document.getElementById('newCaseTitle').value = target.title;
    document.getElementById('newCaseCategory').value = target.category;
    document.getElementById('newCaseDesc').value = target.description;

    if (typeof window.syncCustomSelect === 'function') {
        window.syncCustomSelect('newCaseCategory');
    }

    document.getElementById('adminFormHeadline').textContent = "Modify Tracked Case Parameters";
    document.getElementById('adminFormSubmitBtn').textContent = "Save Overwritten Updates";
    document.getElementById('cancelEditCaseBtn').style.display = 'inline-block';
    document.getElementById('addCaseForm').scrollIntoView({ behavior: 'smooth' });
}

function exitCaseEditMode() {
    State.activeEditCaseId = null;
    document.getElementById('editCaseTargetId').value = "";
    document.getElementById('addCaseForm').reset();
    
    if (typeof window.syncCustomSelect === 'function') {
        window.syncCustomSelect('newCaseCategory');
    }

    document.getElementById('adminFormHeadline').textContent = "Add New Case Investigation";
    document.getElementById('adminFormSubmitBtn').textContent = "Add Case to Website";
    document.getElementById('cancelEditCaseBtn').style.display = 'none';
}

function renderAdminCategoriesList() {
    const tbody = document.querySelector('#adminCategoriesTable tbody');
    if (!tbody) return;

    tbody.innerHTML = State.categories.map(cat => `
        <tr>
            <td><strong>${cat}</strong></td>
            <td style="color: #64748b; font-size: 0.85em; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Dynamic Resource Vector Map Attached</td>
            <td>
                <button class="btn btn-danger delete-cat-action-btn" data-value="${cat}" style="padding: 6px 12px; font-size: 0.85em;">Drop</button>
            </td>
        </tr>
    `).join('');

    tbody.querySelectorAll('.delete-cat-action-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const catVal = btn.dataset.value;
            if (typeof window.customConfirm === 'function') {
                window.customConfirm(`Drop category "${catVal}"? This layout action will invalidate connected cases.`, () => {
                    State.categories = State.categories.filter(c => c !== catVal);
                    saveStateToStorage();
                    synchronizeSelectDropdowns();
                    renderFrontendCases();
                    renderAdminDashboardData();
                    if (typeof window.showToast === 'function') window.showToast('Category classification removed', 'success');
                });
            }
        });
    });
}

// ================= DATA DOWNLOAD UTILITIES =================
function triggerLeadsDatabaseExport() {
    if (State.leads.length === 0) {
        if (typeof window.showToast === 'function') window.showToast('No structured lead data fields found to write', 'error');
        return;
    }

    const headers = ['Lead_ID', 'First_Name', 'Last_Name', 'Email_Address', 'Phone_Number', 'Category_Classification', 'Message_Details'];
    const rowStrings = State.leads.map(l => [
        l.id,
        `"${l.firstName.replace(/"/g, '""')}"`,
        `"${l.lastName.replace(/"/g, '""')}"`,
        `"${l.email.replace(/"/g, '""')}"`,
        `"${l.phone.replace(/"/g, '""')}"`,
        `"${l.category.replace(/"/g, '""')}"`,
        `"${l.message.replace(/"/g, '""')}"`
    ].join(','));

    const csvOutputContent = [headers.join(','), ...rowStrings].join('\n');
    const dynamicBlob = new Blob([csvOutputContent], { type: 'text/csv;charset=utf-8;' });
    const matchingUrl = URL.createObjectURL(dynamicBlob);
    
    const operationalAnchor = document.createElement('a');
    operationalAnchor.setAttribute('href', matchingUrl);
    operationalAnchor.setAttribute('download', `LawsuitFiles_IntakeLeads_2026.csv`);
    operationalAnchor.style.visibility = 'hidden';
    
    document.body.appendChild(operationalAnchor);
    operationalAnchor.click();
    document.body.removeChild(operationalAnchor);
}

// ================= GLOBAL EVENT REGISTRATION MATRIX =================
function setupEventListeners() {
    // Search/Filter Realtime Interceptors
    document.getElementById('frontendSearchCases')?.addEventListener('input', renderFrontendCases);
    document.getElementById('frontendFilterCases')?.addEventListener('change', renderFrontendCases);
    document.getElementById('adminLeadFilter')?.addEventListener('change', renderAdminLeadsList);

    // Frontend Request Submission Pipeline Ingestion
    document.getElementById('globalContactForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const newLead = {
            id: `lead-${Date.now()}`,
            firstName: document.getElementById('globalLeadFirstName').value.trim(),
            lastName: document.getElementById('globalLeadLastName').value.trim(),
            email: document.getElementById('globalLeadEmail').value.trim(),
            phone: document.getElementById('globalLeadPhone').value.trim(),
            category: document.getElementById('globalLeadCategory').value,
            message: document.getElementById('globalLeadMessage').value.trim()
        };

        if(!newLead.category) {
            if (typeof window.showToast === 'function') window.showToast('Please select a valid legal tracking category.', 'error');
            return;
        }

        State.leads.unshift(newLead);
        saveStateToStorage();
        this.reset();
        
        if (typeof window.syncCustomSelect === 'function') {
            window.syncCustomSelect('globalLeadCategory');
        }

        renderAdminLeadsList();
        if (typeof window.showToast === 'function') {
            window.showToast('Secure evaluation dossier created. A partner advocate will follow up.', 'success');
        }
    });

    // Admin Auth Form Verification Interceptor
    document.getElementById('adminLoginForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        const enteredEmail = document.getElementById('adminEmail').value.trim();
        const enteredPass = document.getElementById('adminPassword').value;

        if (enteredEmail === ADMIN_CREDENTIALS.email && enteredPass === ADMIN_CREDENTIALS.password) {
            document.getElementById('adminLoginBox').style.display = 'none';
            document.getElementById('adminDashboardBox').style.display = 'flex';
            renderAdminDashboardData();
            if (typeof window.showToast === 'function') window.showToast('Identity authentication approved', 'success');
        } else {
            if (typeof window.showToast === 'function') window.showToast('Invalid administrative access tokens requested', 'error');
        }
    });

    // Admin Panel Logout Interceptor
    document.getElementById('adminLogoutBtn')?.addEventListener('click', () => {
        document.getElementById('adminDashboardBox').style.display = 'none';
        document.getElementById('adminLoginForm').reset();
        document.getElementById('adminLoginBox').style.display = 'block';
        if (typeof window.showToast === 'function') window.showToast('Secure administrator session tracking purged', 'success');
    });

    // Admin Content Entry System Add/Update Interceptor
    document.getElementById('addCaseForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const title = document.getElementById('newCaseTitle').value.trim();
        const category = document.getElementById('newCaseCategory').value;
        const description = document.getElementById('newCaseDesc').value.trim();

        if (!category) {
            if (typeof window.showToast === 'function') window.showToast('Please assign a category scope classification.', 'error');
            return;
        }

        if (State.activeEditCaseId) {
            // Overwrite existing data mapping fields
            State.cases = State.cases.map(c => {
                if (c.id === State.activeEditCaseId) {
                    return { ...c, title, category, description };
                }
                return c;
            });
            if (typeof window.showToast === 'function') window.showToast('Case details dynamically updated', 'success');
            exitCaseEditMode();
        } else {
            // Insert brand new configuration mapping structural indexes
            const newCase = {
                id: `case-${Date.now()}`,
                title,
                category,
                description,
                image: "assets/image.png" // Fallback template link setting context default
            };
            State.cases.push(newCase);
            if (typeof window.showToast === 'function') window.showToast('New docket file added to index layers', 'success');
            this.reset();
            if (typeof window.syncCustomSelect === 'function') window.syncCustomSelect('newCaseCategory');
        }

        saveStateToStorage();
        renderFrontendCases();
        renderAdminCasesList();
    });

    document.getElementById('cancelEditCaseBtn')?.addEventListener('click', exitCaseEditMode);

    // Admin Add Category System Form Interceptor
    document.getElementById('addCategoryForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        const catName = document.getElementById('newCategoryName').value.trim();

        if (State.categories.some(c => c.toLowerCase() === catName.toLowerCase())) {
            if (typeof window.showToast === 'function') window.showToast('This structural category entry already exists.', 'error');
            return;
        }

        State.categories.push(catName);
        saveStateToStorage();
        
        this.reset();
        synchronizeSelectDropdowns();
        renderFrontendCases();
        renderAdminDashboardData();

        if (typeof window.showToast === 'function') window.showToast('New category classification array deployed', 'success');
    });

    // Global Settings System Config Form Submission Interceptor
    document.getElementById('updateSettingsForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        
        State.settings.tel = document.getElementById('settingTel').value.trim();
        State.settings.email = document.getElementById('settingEmail').value.trim();
        State.settings.address = document.getElementById('settingAddress').value.trim();

        saveStateToStorage();
        applyGlobalSettings();

        if (typeof window.showToast === 'function') window.showToast('Global organizational profile tokens updated', 'success');
    });

    // Export Trigger Interceptor mapping
    document.getElementById('exportCsvBtn')?.addEventListener('click', triggerLeadsDatabaseExport);
}

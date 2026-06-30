import { db } from "./config.js";
import { 
    collection, 
    addDoc, 
    getDocs, 
    deleteDoc,
    doc,
    serverTimestamp,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Ensure scripts run after DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // 1. AUTHENTICATION (HARDCODED) & ADMIN UI
    // ==========================================
    const loginBox = document.getElementById('adminLoginBox');
    const dashboardBox = document.getElementById('adminDashboardBox');
    const adminLoginForm = document.getElementById('adminLoginForm');
    const adminLogoutBtn = document.getElementById('adminLogoutBtn');

    // Hardcoded Admin Credentials
    const ADMIN_EMAIL = "admin@gmail.com";
    const ADMIN_PASSWORD = "admin1234";

    // Check Auth State using sessionStorage instead of Firebase Auth
    function checkAuthState() {
        const isLoggedIn = sessionStorage.getItem('isAdminLoggedIn');
        if (isLoggedIn === 'true') {
            // Logged in: Show Dashboard, Hide Login Form
            if (loginBox) loginBox.style.display = 'none';
            if (dashboardBox) dashboardBox.style.display = 'flex';
            loadAdminLeads();
            loadAdminCases();
        } else {
            // Logged out: Show Login Form, Hide Dashboard
            if (loginBox) loginBox.style.display = 'block';
            if (dashboardBox) dashboardBox.style.display = 'none';
        }
    }

    // Run authentication check on initial script initialization
    checkAuthState();

    // Admin Login form submission pipeline
    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const email = document.getElementById('adminEmail').value;
            const password = document.getElementById('adminPassword').value;
            const submitBtn = adminLoginForm.querySelector('button');
            
            // Visual feedback processing state
            const originalText = submitBtn.innerText;
            submitBtn.innerText = "Authenticating...";
            submitBtn.disabled = true;

            // Simulate brief latency window for secure handling presentation
            setTimeout(() => {
                if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
                    // Success: Set local session state key
                    sessionStorage.setItem('isAdminLoggedIn', 'true');
                    adminLoginForm.reset();
                    checkAuthState();
                } else {
                    // Mismatched security credentials fall-off
                    alert("Login failed! Invalid administrative email or security password.");
                    console.error("Hardcoded Login Error: Credentials do not match static safety keys.");
                }
                
                // Reset button visual feedback state
                submitBtn.innerText = originalText;
                submitBtn.disabled = false;
            }, 500);
        });
    }

    // Admin Session Revocation (Logout)
    if (adminLogoutBtn) {
        adminLogoutBtn.addEventListener('click', () => {
            sessionStorage.removeItem('isAdminLoggedIn');
            checkAuthState();
        });
    }

    // ==========================================
    // 2. FRONTEND: SUBMIT LEAD CONTEXT FORM
    // ==========================================
    const publicContactForm = document.getElementById('publicContactForm');

    if (publicContactForm) {
        publicContactForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Structure safe mapping of form element values
            const leadData = {
                firstName: document.getElementById('leadFirstName').value,
                lastName: document.getElementById('leadLastName').value,
                email: document.getElementById('leadEmail').value,
                phone: document.getElementById('leadPhone').value,
                category: document.getElementById('leadCategory').value,
                message: document.getElementById('leadMessage').value,
                timestamp: serverTimestamp()
            };

            const submitBtn = publicContactForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerText;
            submitBtn.innerText = "Submitting Review Details...";
            submitBtn.disabled = true;

            try {
                // Post object properties directly into firestore 'leads' collection
                await addDoc(collection(db, "leads"), leadData);
                alert("Thank you! Your case review request has been submitted successfully.");
                publicContactForm.reset();
            } catch (error) {
                alert("Error transmitting filing review parameters: " + error.message);
                console.error("Submit Log Error:", error);
            } finally {
                submitBtn.innerText = originalText;
                submitBtn.disabled = false;
            }
        });
    }

    // ==========================================
    // 3. ADMIN: LEADS MANAGEMENT & EXPORT DATA
    // ==========================================
    let allLeads = []; 

    async function loadAdminLeads() {
        try {
            const q = query(collection(db, "leads"), orderBy("timestamp", "desc"));
            const querySnapshot = await getDocs(q);
            
            allLeads = [];
            querySnapshot.forEach((doc) => {
                allLeads.push({ id: doc.id, ...doc.data() });
            });
            
            renderLeads(allLeads);
        } catch (error) {
            console.error("Database breakdown loading leads collection:", error);
        }
    }

    function renderLeads(leadsToRender) {
        const tbody = document.querySelector("#adminLeadsTable tbody");
        if (!tbody) return;

        tbody.innerHTML = "";
        
        if (leadsToRender.length === 0) {
            tbody.innerHTML = "<tr><td colspan='5' style='text-align: center; color: #777;'>No matching leads logged yet.</td></tr>";
            return;
        }

        leadsToRender.forEach(lead => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${lead.firstName} ${lead.lastName}</strong></td>
                <td><a href="mailto:${lead.email}" style="color: #0d6efd; text-decoration: none;">${lead.email}</a></td>
                <td>${lead.phone}</td>
                <td><span class="case-category">${lead.category || 'N/A'}</span></td>
                <td style="max-width: 250px; line-height: 1.4; font-size: 0.9em; color:#4a5568;">${lead.message}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Interactive Admin Category Lead Filter Selector Switcher
    const adminLeadFilter = document.getElementById('adminLeadFilter');
    if (adminLeadFilter) {
        adminLeadFilter.addEventListener('change', (e) => {
            const category = e.target.value;
            if (category === "All") {
                renderLeads(allLeads);
            } else {
                const filtered = allLeads.filter(lead => lead.category === category);
                renderLeads(filtered);
            }
        });
    }

    // Export Leads Arrays Array Directly to CSV File Link Download Struct
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', () => {
            if (allLeads.length === 0) {
                alert("No structural context data available within selected collection arrays to export.");
                return;
            }

            const headers = ["First Name", "Last Name", "Email", "Phone", "Category", "Message"];
            const rows = allLeads.map(lead => [
                `"${lead.firstName || ''}"`,
                `"${lead.lastName || ''}"`,
                `"${lead.email || ''}"`,
                `"${lead.phone || ''}"`,
                `"${lead.category || ''}"`,
                `"${(lead.message || '').replace(/"/g, '""')}"`
            ]);
            
            const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
            
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `lawsuit_leads_export.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }

    // ==========================================
    // 4. ADMIN & FRONTEND: CASES MANAGEMENT
    // ==========================================
    let allCases = []; 

    // Add New Case Profile record entries via form post processing mapping
    const addCaseForm = document.getElementById('addCaseForm');
    if (addCaseForm) {
        addCaseForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const caseData = {
                title: document.getElementById('newCaseTitle').value,
                category: document.getElementById('newCaseCategory').value,
                description: document.getElementById('newCaseDesc').value,
                timestamp: serverTimestamp()
            };

            const submitBtn = addCaseForm.querySelector('button');
            submitBtn.innerText = "Processing Addition...";
            submitBtn.disabled = true;

            try {
                await addDoc(collection(db, "cases"), caseData);
                alert("New investigation context data cataloged successfully!");
                addCaseForm.reset();
                loadAdminCases();
                loadFrontendCases();
            } catch (error) {
                alert("Error uploading parameters to Cloud Database: " + error.message);
            } finally {
                submitBtn.innerText = "Add Case to Website";
                submitBtn.disabled = false;
            }
        });
    }

    // Fetch array parameters rendering Admin Table listing profiles
    async function loadAdminCases() {
        try {
            const querySnapshot = await getDocs(collection(db, "cases"));
            const tbody = document.querySelector("#adminCasesTable tbody");
            if (!tbody) return;
            
            tbody.innerHTML = "";
            
            if (querySnapshot.empty) {
                tbody.innerHTML = "<tr><td colspan='3' style='text-align: center; color: #777;'>No cases added yet.</td></tr>";
                return;
            }

            querySnapshot.forEach((docSnap) => {
                const c = docSnap.data();
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${c.title}</strong></td>
                    <td><span class="case-category">${c.category}</span></td>
                    <td>
                        <button class="btn btn-danger" style="padding: 6px 12px; font-size: 0.85em;" data-id="${docSnap.id}">Delete</button>
                    </td>
                `;
                
                const deleteBtn = tr.querySelector('button');
                deleteBtn.addEventListener('click', async () => {
                    if(confirm(`Are you certain you wish to completely wipe structural record "${c.title}" from user views?`)) {
                        await deleteDoc(doc(db, "cases", docSnap.id));
                        loadAdminCases();
                        loadFrontendCases();
                    }
                });
                
                tbody.appendChild(tr);
            });
        } catch (error) {
            console.error("Error reading admin case listings portfolio mapping:", error);
        }
    }

    // Load Cases context arrays formatting Frontend active directory display view grid
    async function loadFrontendCases() {
        try {
            const querySnapshot = await getDocs(collection(db, "cases"));
            allCases = [];
            querySnapshot.forEach((doc) => {
                allCases.push(doc.data());
            });
            renderFrontendCases(allCases);
        } catch (error) {
            console.error("Critical failure tracking active live database cases array:", error);
        }
    }

    function renderFrontendCases(casesToRender) {
        const list = document.getElementById('frontendCasesList');
        if (!list) return;
        
        list.innerHTML = "";
        
        if(casesToRender.length === 0) {
            list.innerHTML = "<p style='grid-column: 1/-1; text-align: center; color: #64748b; padding: 40px 0;'>No active investigations match your query selection matrices currently.</p>";
            return;
        }

        casesToRender.forEach(c => {
            const card = document.createElement('div');
            card.className = "case-card";
            card.innerHTML = `
                <div>
                    <span class="case-category">${c.category}</span>
                    <h3>${c.title}</h3>
                    <p>${c.description}</p>
                </div>
                <button class="btn redirect-connect-btn" style="width: 100%; margin-top: 15px;">Check Eligibility</button>
            `;
            
            // SPA view swap instead of old layout window scroll element targeting handles
            card.querySelector('.redirect-connect-btn').addEventListener('click', () => {
                if (typeof navigateToPage === "function") {
                    navigateToPage('connect');
                } else {
                    window.location.hash = "connect";
                }
            });

            list.appendChild(card);
        });
    }

    // Combined input key-up and selector evaluation filtering functions
    function handleFrontendFilter() {
        const searchInput = document.getElementById('frontendSearchCases');
        const filterSelect = document.getElementById('frontendFilterCases');
        
        if (!searchInput || !filterSelect) return;

        const searchTerm = searchInput.value.toLowerCase();
        const filterCategory = filterSelect.value;

        const filtered = allCases.filter(c => {
            const titleSafe = (c.title || "").toLowerCase();
            const descSafe = (c.description || "").toLowerCase();
            
            const matchesSearch = titleSafe.includes(searchTerm) || descSafe.includes(searchTerm);
            const matchesCategory = (filterCategory === "All") || (c.category === filterCategory);
            
            return matchesSearch && matchesCategory;
        });

        renderFrontendCases(filtered);
    }

    const frontendSearchInput = document.getElementById('frontendSearchCases');
    const frontendFilterSelect = document.getElementById('frontendFilterCases');

    if (frontendSearchInput) frontendSearchInput.addEventListener('input', handleFrontendFilter);
    if (frontendFilterSelect) frontendFilterSelect.addEventListener('change', handleFrontendFilter);

    // Initial query fetch execution bootstrapping user-facing cases directory module
    loadFrontendCases();
});

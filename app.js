import { auth, db } from "./config.js";
import { 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
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
    // 1. AUTHENTICATION & ADMIN UI TOGGLES
    // ==========================================
    const loginBox = document.getElementById('adminLoginBox');
    const dashboardBox = document.getElementById('adminDashboardBox');
    const adminLoginForm = document.getElementById('adminLoginForm');
    const adminLogoutBtn = document.getElementById('adminLogoutBtn');

    // Listen for Auth State Changes
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // Logged in: Show Dashboard, Hide Login
            if (loginBox) loginBox.style.display = 'none';
            if (dashboardBox) dashboardBox.style.display = 'flex';
            loadAdminLeads();
            loadAdminCases();
        } else {
            // Logged out: Show Login, Hide Dashboard
            if (loginBox) loginBox.style.display = 'block';
            if (dashboardBox) dashboardBox.style.display = 'none';
        }
    });

    // Admin Login form submission
    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('adminEmail').value;
            const password = document.getElementById('adminPassword').value;
            const submitBtn = adminLoginForm.querySelector('button');
            
            // Visual feedback while loading
            const originalText = submitBtn.innerText;
            submitBtn.innerText = "Authenticating...";
            submitBtn.disabled = true;

            try {
                // Attempt login
                await signInWithEmailAndPassword(auth, email, password);
                adminLoginForm.reset();
            } catch (error) {
                // Explicitly show error if it fails
                alert("Login failed! Please check your email/password.\nError: " + error.message);
                console.error("Firebase Login Error:", error);
            } finally {
                // Restore button state
                submitBtn.innerText = originalText;
                submitBtn.disabled = false;
            }
        });
    }

    // Admin Logout
    if (adminLogoutBtn) {
        adminLogoutBtn.addEventListener('click', async () => {
            try {
                await signOut(auth);
            } catch (error) {
                console.error("Logout Error:", error);
            }
        });
    }

    // ==========================================
    // 2. FRONTEND: SUBMIT LEAD FORM
    // ==========================================
    const publicContactForm = document.getElementById('publicContactForm');

    if (publicContactForm) {
        publicContactForm.addEventListener('submit', async (e) => {
            e.preventDefault();

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
            submitBtn.innerText = "Submitting...";
            submitBtn.disabled = true;

            try {
                await addDoc(collection(db, "leads"), leadData);
                alert("Thank you! Your case review request has been submitted successfully.");
                publicContactForm.reset();
            } catch (error) {
                alert("Error submitting form: " + error.message);
                console.error("Submit Error:", error);
            } finally {
                submitBtn.innerText = originalText;
                submitBtn.disabled = false;
            }
        });
    }

    // ==========================================
    // 3. ADMIN: LEADS MANAGEMENT & EXPORT
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
            console.error("Error loading leads:", error);
        }
    }

    function renderLeads(leadsToRender) {
        const tbody = document.querySelector("#adminLeadsTable tbody");
        if (!tbody) return;

        tbody.innerHTML = "";
        
        if (leadsToRender.length === 0) {
            tbody.innerHTML = "<tr><td colspan='5' style='text-align: center; color: #777;'>No leads found.</td></tr>";
            return;
        }

        leadsToRender.forEach(lead => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${lead.firstName} ${lead.lastName}</strong></td>
                <td><a href="mailto:${lead.email}" style="color: #0d6efd; text-decoration: none;">${lead.email}</a></td>
                <td>${lead.phone}</td>
                <td><span class="case-category">${lead.category || 'N/A'}</span></td>
                <td style="max-width: 250px; line-height: 1.4;">${lead.message}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Filter Leads
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

    // Export Leads to CSV
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', () => {
            if (allLeads.length === 0) {
                alert("No leads available to export.");
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
            link.setAttribute("download", `lawsuit_leads.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }

    // ==========================================
    // 4. ADMIN & FRONTEND: CASES MANAGEMENT
    // ==========================================
    let allCases = []; 

    // Add New Case
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
            submitBtn.innerText = "Adding...";
            submitBtn.disabled = true;

            try {
                await addDoc(collection(db, "cases"), caseData);
                alert("Case added successfully!");
                addCaseForm.reset();
                loadAdminCases();
                loadFrontendCases();
            } catch (error) {
                alert("Error adding case: " + error.message);
            } finally {
                submitBtn.innerText = "Add Case to Website";
                submitBtn.disabled = false;
            }
        });
    }

    // Load Cases for Admin Panel
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
                        <button class="btn btn-secondary" style="padding: 6px 12px; font-size: 0.85em; background: #dc3545;" data-id="${docSnap.id}">Delete</button>
                    </td>
                `;
                
                const deleteBtn = tr.querySelector('button');
                deleteBtn.addEventListener('click', async () => {
                    if(confirm(`Are you sure you want to delete "${c.title}"?`)) {
                        await deleteDoc(doc(db, "cases", docSnap.id));
                        loadAdminCases();
                        loadFrontendCases();
                    }
                });
                
                tbody.appendChild(tr);
            });
        } catch (error) {
            console.error("Error loading admin cases:", error);
        }
    }

    // Load Cases for Frontend Display
    async function loadFrontendCases() {
        try {
            const querySnapshot = await getDocs(collection(db, "cases"));
            allCases = [];
            querySnapshot.forEach((doc) => {
                allCases.push(doc.data());
            });
            renderFrontendCases(allCases);
        } catch (error) {
            console.error("Error loading frontend cases:", error);
        }
    }

    function renderFrontendCases(casesToRender) {
        const list = document.getElementById('frontendCasesList');
        if (!list) return;
        
        list.innerHTML = "";
        
        if(casesToRender.length === 0) {
            list.innerHTML = "<p style='grid-column: 1/-1; text-align: center; color: #777;'>No cases match your search criteria.</p>";
            return;
        }

        casesToRender.forEach(c => {
            const card = document.createElement('div');
            card.className = "case-card";
            card.innerHTML = `
                <span class="case-category">${c.category}</span>
                <h3>${c.title}</h3>
                <p>${c.description}</p>
                <button class="btn" style="width: 100%;" onclick="document.getElementById('contact').scrollIntoView({ behavior: 'smooth' });">Check Eligibility</button>
            `;
            list.appendChild(card);
        });
    }

    // Frontend Cases Search & Filter
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

    // Initial Load of Public Cases
    loadFrontendCases();
});

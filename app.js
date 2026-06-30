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

// Admin Login
if (adminLoginForm) {
    adminLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('adminEmail').value;
        const password = document.getElementById('adminPassword').value;

        try {
            await signInWithEmailAndPassword(auth, email, password);
            adminLoginForm.reset();
        } catch (error) {
            alert("Authentication failed. Please check your credentials.");
            console.error("Login Error:", error);
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

        try {
            // Disable button during submission
            const submitBtn = publicContactForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerText;
            submitBtn.innerText = "Submitting Securely...";
            submitBtn.disabled = true;

            await addDoc(collection(db, "leads"), leadData);
            
            alert("Thank you. Your confidential inquiry has been submitted successfully. Our legal team will review your information shortly.");
            publicContactForm.reset();
            
            // Restore button
            submitBtn.innerText = originalText;
            submitBtn.disabled = false;
        } catch (error) {
            alert("An error occurred while submitting your inquiry. Please try again or contact us directly by phone.");
            console.error("Submit Error:", error);
        }
    });
}

// ==========================================
// 3. ADMIN: LEADS MANAGEMENT & EXPORT
// ==========================================
let allLeads = []; // Store fetched leads for filtering/exporting

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
        tbody.innerHTML = "<tr><td colspan='4' style='text-align: center; color: #64748b;'>No inquiries found for this category.</td></tr>";
        return;
    }

    leadsToRender.forEach(lead => {
        const tr = document.createElement('tr');
        
        // Format date if timestamp exists
        let dateString = "Recent";
        if (lead.timestamp) {
            const date = lead.timestamp.toDate();
            dateString = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        }

        tr.innerHTML = `
            <td>
                <strong>${lead.firstName} ${lead.lastName}</strong><br>
                <span style="font-size: 0.85em; color: #64748b;">${dateString}</span>
            </td>
            <td>
                <a href="mailto:${lead.email}" style="color: #003366; text-decoration: none;">${lead.email}</a><br>
                ${lead.phone}
            </td>
            <td><span style="background: #e2e8f0; color: #1e293b; padding: 4px 8px; border-radius: 4px; font-size: 0.85em; font-weight: bold;">${lead.category || 'Uncategorized'}</span></td>
            <td style="max-width: 300px; line-height: 1.4; font-size: 0.9em; color: #475569;">
                ${lead.message}
            </td>
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
            alert("No data available to export.");
            return;
        }

        // Build CSV string
        const headers = ["Date", "First Name", "Last Name", "Email", "Phone", "Practice Area", "Case Details"];
        const rows = allLeads.map(lead => {
            let dateStr = "";
            if (lead.timestamp) dateStr = lead.timestamp.toDate().toLocaleString();
            
            return [
                `"${dateStr}"`,
                `"${lead.firstName || ''}"`,
                `"${lead.lastName || ''}"`,
                `"${lead.email || ''}"`,
                `"${lead.phone || ''}"`,
                `"${lead.category || ''}"`,
                `"${(lead.message || '').replace(/"/g, '""')}"` // Escape quotes in messages
            ];
        });
        
        const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        
        // Trigger download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `LawsuitFiles_Inquiries_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
}

// ==========================================
// 4. ADMIN & FRONTEND: CASES MANAGEMENT
// ==========================================
let allCases = []; // Store fetched cases for frontend searching/filtering

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

        try {
            await addDoc(collection(db, "cases"), caseData);
            alert("New case successfully added to the public docket.");
            addCaseForm.reset();
            loadAdminCases(); // Refresh admin list
            loadFrontendCases(); // Refresh frontend list
        } catch (error) {
            alert("Error publishing case to docket: " + error.message);
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
            tbody.innerHTML = "<tr><td colspan='3' style='text-align: center; color: #64748b;'>No active cases on the docket.</td></tr>";
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const c = docSnap.data();
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong style="color: #003366;">${c.title}</strong></td>
                <td><span style="background: #c5a059; color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 0.8em; text-transform: uppercase;">${c.category}</span></td>
                <td>
                    <button class="btn btn-secondary" style="padding: 6px 12px; font-size: 0.85em; background: #e63946;" data-id="${docSnap.id}">Remove Case</button>
                </td>
            `;
            
            // Attach delete event
            const deleteBtn = tr.querySelector('button');
            deleteBtn.addEventListener('click', async () => {
                if(confirm(`Are you certain you want to remove "${c.title}" from the public docket? This action cannot be undone.`)) {
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
        list.innerHTML = "<p style='grid-column: 1/-1; text-align: center; color: #64748b; font-size: 1.1em; padding: 40px;'>No active cases currently match your criteria.</p>";
        return;
    }

    casesToRender.forEach(c => {
        const card = document.createElement('div');
        card.className = "case-card";
        card.innerHTML = `
            <span class="case-category">${c.category}</span>
            <h3>${c.title}</h3>
            <p>${c.description}</p>
            <button class="btn" style="width: 100%; margin-top: auto;" onclick="window.location.hash='contact'">Verify Eligibility</button>
        `;
        list.appendChild(card);
    });
}

// Frontend Cases Search & Filter Logic
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

// ==========================================
// 5. INITIALIZATION ON LOAD
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // Load frontend cases immediately when the DOM is ready
    loadFrontendCases();
});

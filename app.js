// app.js
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
const adminOverlay = document.getElementById('adminOverlay');
const loginBox = document.getElementById('adminLoginBox');
const dashboardBox = document.getElementById('adminDashboardBox');
const adminLoginForm = document.getElementById('adminLoginForm');
const adminLogoutBtn = document.getElementById('adminLogoutBtn');

// Listen for Auth State Changes
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Logged in
        loginBox.style.display = 'none';
        dashboardBox.style.display = 'flex';
        loadAdminLeads();
        loadAdminCases();
    } else {
        // Logged out
        loginBox.style.display = 'block';
        dashboardBox.style.display = 'none';
    }
});

// Admin Login
adminLoginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('adminEmail').value;
    const password = document.getElementById('adminPassword').value;

    try {
        await signInWithEmailAndPassword(auth, email, password);
        alert("Login successful!");
        adminLoginForm.reset();
    } catch (error) {
        alert("Login failed: " + error.message);
    }
});

// Admin Logout
adminLogoutBtn.addEventListener('click', async () => {
    try {
        await signOut(auth);
        alert("Logged out successfully.");
    } catch (error) {
        console.error("Logout Error:", error);
    }
});

// ==========================================
// 2. FRONTEND: SUBMIT LEAD FORM
// ==========================================
const publicContactForm = document.getElementById('publicContactForm');

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
        await addDoc(collection(db, "leads"), leadData);
        alert("Thank you! Your case review request has been submitted successfully.");
        publicContactForm.reset();
    } catch (error) {
        alert("Error submitting form: " + error.message);
    }
});

// ==========================================
// 3. ADMIN: LEADS MANAGEMENT & EXPORT
// ==========================================
let allLeads = []; // Store fetched leads for filtering/exporting

async function loadAdminLeads() {
    const q = query(collection(db, "leads"), orderBy("timestamp", "desc"));
    const querySnapshot = await getDocs(q);
    
    allLeads = [];
    querySnapshot.forEach((doc) => {
        allLeads.push({ id: doc.id, ...doc.data() });
    });
    
    renderLeads(allLeads);
}

function renderLeads(leadsToRender) {
    const tbody = document.querySelector("#adminLeadsTable tbody");
    tbody.innerHTML = "";
    
    leadsToRender.forEach(lead => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${lead.firstName} ${lead.lastName}</td>
            <td>${lead.email}</td>
            <td>${lead.phone}</td>
            <td><span class="case-category">${lead.category || 'N/A'}</span></td>
            <td style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${lead.message}">
                ${lead.message}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Filter Leads
document.getElementById('adminLeadFilter').addEventListener('change', (e) => {
    const category = e.target.value;
    if (category === "All") {
        renderLeads(allLeads);
    } else {
        const filtered = allLeads.filter(lead => lead.category === category);
        renderLeads(filtered);
    }
});

// Export Leads to CSV
document.getElementById('exportCsvBtn').addEventListener('click', () => {
    if (allLeads.length === 0) {
        alert("No leads to export.");
        return;
    }

    // Build CSV string
    const headers = ["First Name", "Last Name", "Email", "Phone", "Category", "Message"];
    const rows = allLeads.map(lead => [
        `"${lead.firstName}"`,
        `"${lead.lastName}"`,
        `"${lead.email}"`,
        `"${lead.phone}"`,
        `"${lead.category}"`,
        `"${lead.message.replace(/"/g, '""')}"` // Escape quotes in messages
    ]);
    
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    
    // Trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "lawsuitfiles_leads.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

// ==========================================
// 4. ADMIN & FRONTEND: CASES MANAGEMENT
// ==========================================
let allCases = []; // Store fetched cases for frontend searching/filtering

// Add New Case
document.getElementById('addCaseForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const caseData = {
        title: document.getElementById('newCaseTitle').value,
        category: document.getElementById('newCaseCategory').value,
        description: document.getElementById('newCaseDesc').value,
        timestamp: serverTimestamp()
    };

    try {
        await addDoc(collection(db, "cases"), caseData);
        alert("Case added successfully!");
        document.getElementById('addCaseForm').reset();
        loadAdminCases(); // Refresh admin list
        loadFrontendCases(); // Refresh frontend list
    } catch (error) {
        alert("Error adding case: " + error.message);
    }
});

// Load Cases for Admin Panel
async function loadAdminCases() {
    const querySnapshot = await getDocs(collection(db, "cases"));
    const tbody = document.querySelector("#adminCasesTable tbody");
    tbody.innerHTML = "";
    
    querySnapshot.forEach((docSnap) => {
        const c = docSnap.data();
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${c.title}</strong></td>
            <td><span class="case-category">${c.category}</span></td>
            <td>
                <button class="btn btn-secondary" style="padding: 5px 10px; font-size: 0.85em;" data-id="${docSnap.id}">Delete</button>
            </td>
        `;
        
        // Attach delete event
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
}

// Load Cases for Frontend Display
async function loadFrontendCases() {
    const querySnapshot = await getDocs(collection(db, "cases"));
    allCases = [];
    querySnapshot.forEach((doc) => {
        allCases.push(doc.data());
    });
    renderFrontendCases(allCases);
}

function renderFrontendCases(casesToRender) {
    const list = document.getElementById('frontendCasesList');
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
            <button class="btn" style="width: 100%; padding: 10px;" onclick="document.getElementById('contact').scrollIntoView({ behavior: 'smooth' });">Check Eligibility</button>
        `;
        list.appendChild(card);
    });
}

// Frontend Cases Search & Filter Logic
function handleFrontendFilter() {
    const searchTerm = document.getElementById('frontendSearchCases').value.toLowerCase();
    const filterCategory = document.getElementById('frontendFilterCases').value;

    const filtered = allCases.filter(c => {
        const matchesSearch = c.title.toLowerCase().includes(searchTerm) || c.description.toLowerCase().includes(searchTerm);
        const matchesCategory = (filterCategory === "All") || (c.category === filterCategory);
        return matchesSearch && matchesCategory;
    });

    renderFrontendCases(filtered);
}

document.getElementById('frontendSearchCases').addEventListener('input', handleFrontendFilter);
document.getElementById('frontendFilterCases').addEventListener('change', handleFrontendFilter);

// ==========================================
// 5. INITIALIZATION ON LOAD
// ==========================================
// Load frontend cases immediately when the script runs
loadFrontendCases();

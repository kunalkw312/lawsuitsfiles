// =============================================================
// app.js – Firebase Integration & State Management
// =============================================================

import { db } from './config.js';
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// =============================================================
// STATE
// =============================================================
const state = {
  settings: { tel: "+1 (555) 000-0000", email: "legal@lawsuitefiles.com", address: "New York, United States" },
  adBanner: { imageUrl: "", targetCaseId: "", isActive: false },
  categories: [],
  cases: [],
  leads: [],
  isAdmin: false,
  initialized: false
};

// DOM helpers with null safety
const $ = (id) => document.getElementById(id);
const $$ = (selector) => document.querySelector(selector);

// =============================================================
// FIREBASE: FETCH ALL
// =============================================================
async function fetchAllData() {
  try {
    console.log("🔥 Fetching data from Firebase...");

    // Settings
    const settingsSnap = await getDoc(doc(db, "settings", "global"));
    if (settingsSnap.exists()) {
      state.settings = settingsSnap.data();
    } else {
      await setDoc(doc(db, "settings", "global"), state.settings);
    }

    // Ad Banner
    const adSnap = await getDoc(doc(db, "settings", "adBanner"));
    if (adSnap.exists()) {
      state.adBanner = adSnap.data();
    } else {
      await setDoc(doc(db, "settings", "adBanner"), state.adBanner);
    }

    // Categories
    const catSnap = await getDocs(collection(db, "categories"));
    state.categories = catSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Cases
    const casesSnap = await getDocs(collection(db, "cases"));
    state.cases = casesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Leads
    const leadsSnap = await getDocs(collection(db, "leads"));
    state.leads = leadsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    state.initialized = true;
    renderAll();
    console.log("✅ Firebase data loaded successfully.");
  } catch (err) {
    console.error("❌ Firebase sync error:", err);
    state.initialized = false;
    renderAll();
    if (typeof window.showToast === 'function') {
      window.showToast("Failed to sync with database. Using local data.", "error");
    }
  }
}

// =============================================================
// RENDER: All UI
// =============================================================
function renderAll() {
  try {
    renderSettings();
    renderAdBanner();
    renderCategories();
    renderPublicCases();
    renderAdminDashboard();
    renderStats();
  } catch (err) {
    console.error("Render error:", err);
  }
}

// ---- Stats ----
function renderStats() {
  const totalLeads = document.getElementById('statTotalLeads');
  const categories = document.getElementById('statCategories');
  const cases = document.getElementById('statCases');

  if (totalLeads) totalLeads.textContent = state.leads.length;
  if (categories) categories.textContent = state.categories.length;
  if (cases) cases.textContent = state.cases.length;
}

// ---- Settings ----
function renderSettings() {
  const s = state.settings;
  const el = (id) => document.getElementById(id);

  if (el('footerTel')) el('footerTel').textContent = `Tel Support: ${s.tel}`;
  if (el('footerEmail')) el('footerEmail').textContent = ` Queries: ${s.email}`;
  if (el('footerAddress')) el('footerAddress').textContent = `Intake: ${s.address}`;

  if (el('settingTel')) el('settingTel').value = s.tel;
  if (el('settingEmail')) el('settingEmail').value = s.email;
  if (el('settingAddress')) el('settingAddress').value = s.address;
}

// ---- Ad Banner ----
function renderAdBanner() {
  // 1. Update Frontend Display
  const bannerWrap = document.getElementById('frontendAdBanner');
  const bannerImg = document.getElementById('frontendAdBannerImg');
  
  if (bannerWrap && bannerImg) {
    if (state.adBanner.isActive && state.adBanner.imageUrl && state.adBanner.targetCaseId) {
      bannerImg.src = state.adBanner.imageUrl;
      bannerWrap.classList.add('active');
      bannerWrap.onclick = (e) => {
        e.preventDefault();
        showCaseDetail(state.adBanner.targetCaseId);
      };
    } else {
      bannerWrap.classList.remove('active');
    }
  }

  // 2. Update Admin Target Case Dropdown Options
  const targetCaseSelect = document.getElementById('adTargetCase');
  if (targetCaseSelect) {
    const currentVal = state.adBanner.targetCaseId;
    const opts = state.cases.map(c => `<option value="${c.id}">${c.title}</option>`).join('');
    targetCaseSelect.innerHTML = `<option value="">Select a Case</option>${opts}`;
    
    if (currentVal && state.cases.some(c => c.id === currentVal)) {
      targetCaseSelect.value = currentVal;
    }
  }

  if (typeof window.initCustomSelects === 'function') {
    window.initCustomSelects();
  }

  // 3. Update Admin Ad Form Values
  const adImgInput = document.getElementById('adImageUrl');
  const adActiveInput = document.getElementById('adIsActive');
  
  if (adImgInput) adImgInput.value = state.adBanner.imageUrl || '';
  if (adActiveInput) adActiveInput.checked = state.adBanner.isActive || false;
}

// ---- Categories ----
function renderCategories() {
  const opts = state.categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');

  const selects = ['frontendFilterCases', 'adminLeadFilter', 'globalLeadCategory', 'newCaseCategory'];
  selects.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      const current = el.value;
      if (id === 'globalLeadCategory') {
        el.innerHTML = `<option value="">— Select Legal Category —</option>${opts}`;
      } else if (id === 'newCaseCategory') {
        el.innerHTML = `<option value="">Select Category</option>${opts}`;
      } else {
        el.innerHTML = `<option value="All">All Categories</option>${opts}`;
      }
      if (current && [...el.options].some(o => o.value === current)) {
        el.value = current;
      }
    }
  });

  if (typeof window.initCustomSelects === 'function') {
    window.initCustomSelects();
  }

  // Admin categories table
  const tbody = document.querySelector('#adminCategoriesTable tbody');
  if (tbody) {
    if (!state.categories.length) {
      tbody.innerHTML = `<tr><td colspan="2" style="text-align:center;color:#94a3b8;">No categories added yet.</td></tr>`;
    } else {
      tbody.innerHTML = state.categories.map(c => `
        <tr>
          <td><strong>${c.name}</strong></td>
          <td><button class="btn btn-danger btn-sm btn-delete-cat" data-id="${c.id}">Delete</button></td>
        </tr>
      `).join('');
    }
    tbody.querySelectorAll('.btn-delete-cat').forEach(btn => {
      btn.addEventListener('click', () => deleteCategory(btn.dataset.id));
    });
  }
}

// ---- Public Cases ----
function renderPublicCases() {
  const grid = document.getElementById('frontendCasesList');
  if (!grid) return;

  const search = document.getElementById('frontendSearchCases')?.value?.toLowerCase() || '';
  const filter = document.getElementById('frontendFilterCases')?.value || 'All';

  const filtered = state.cases.filter(c => {
    const matchTitle = c.title?.toLowerCase().includes(search) || false;
    const matchDesc = c.description?.toLowerCase().includes(search) || false;
    return (matchTitle || matchDesc) && (filter === 'All' || c.category === filter);
  });

  if (!filtered.length) {
    grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:#64748b;padding:40px 0;">No active cases matched your selected parameters.</p>`;
    return;
  }

  grid.innerHTML = filtered.map(c => {
    const img = c.imageUrl || 'https://via.placeholder.com/400x250?text=Legal+Case';
    return `
      <div class="case-card" data-id="${c.id}">
        <div class="case-img-wrap">
          <img src="${img}" alt="${c.category}" onerror="this.src='https://via.placeholder.com/400x250?text=Legal+Case'">
          <span class="case-badge">Active</span>
        </div>
        <div class="case-card-body">
          <span class="case-category">${c.category}</span>
          <h3>${c.title}</h3>
          <p>${(c.description || '').substring(0, 140)}${(c.description || '').length > 140 ? '…' : ''}</p>
          <div class="case-btn-group">
            <button class="btn btn-primary btn-view-detail" data-id="${c.id}">View Detail</button>
            <button class="btn btn-secondary btn-tile-contact" data-category="${c.category}">Contact Us</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('.btn-view-detail').forEach(btn => {
    btn.addEventListener('click', () => showCaseDetail(btn.dataset.id));
  });
  grid.querySelectorAll('.btn-tile-contact').forEach(btn => {
    btn.addEventListener('click', () => {
      const sel = document.getElementById('globalLeadCategory');
      if (sel) {
        sel.value = btn.dataset.category;
        if (typeof window.syncCustomSelect === 'function') {
          window.syncCustomSelect('globalLeadCategory');
        }
      }
      if (typeof navigateToPage === 'function') {
        navigateToPage('connect');
      }
      document.getElementById('globalContactSection')?.scrollIntoView({ behavior: 'smooth' });
    });
  });
}

// ---- Case Detail ----
function showCaseDetail(caseId) {
  const c = state.cases.find(x => x.id === caseId);
  if (!c) {
    console.warn("Case not found:", caseId);
    return;
  }
  const container = document.getElementById('dynamicCaseDetailContainer');
  if (!container) return;

  const img = c.imageUrl || 'https://via.placeholder.com/1100x380?text=Investigation+Banner';
  container.innerHTML = `
    <div class="details-banner">
      <img src="${img}" alt="${c.category}" onerror="this.src='https://via.placeholder.com/1100x380?text=Investigation+Banner'">
    </div>
    <div class="details-content">
      <span class="case-category">${c.category}</span>
      <h1>${c.title}</h1>
      <div class="full-description">${c.description || ''}</div>
    </div>
  `;

  const sel = document.getElementById('globalLeadCategory');
  if (sel) {
    sel.value = c.category;
    if (typeof window.syncCustomSelect === 'function') {
      window.syncCustomSelect('globalLeadCategory');
    }
  }
  if (typeof navigateToPage === 'function') {
    navigateToPage('case-details');
  }
}
window.showCaseDetail = showCaseDetail;

// ---- Admin Dashboard ----
function renderAdminDashboard() {
  // Leads
  const leadTbody = document.querySelector('#adminLeadsTable tbody');
  const filterEl = document.getElementById('adminLeadFilter');
  const filter = filterEl ? filterEl.value : 'All';

  if (leadTbody) {
    const filtered = state.leads.filter(l => filter === 'All' || l.category === filter);
    if (!filtered.length) {
      leadTbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#94a3b8;">No lead records stored.</td></tr>`;
    } else {
      leadTbody.innerHTML = filtered.map(l => `
        <tr>
          <td><strong>${l.firstName || ''} ${l.lastName || ''}</strong></td>
          <td><a href="mailto:${l.email || ''}">${l.email || ''}</a></td>
          <td>${l.phone || ''}</td>
          <td><span class="badge">${l.category || ''}</span></td>
          <td style="font-size:0.9rem;max-width:200px;white-space:pre-wrap;">${(l.message || '').substring(0,80)}${(l.message||'').length>80?'…':''}</td>
          <td><button class="btn btn-danger btn-sm btn-admin-delete-lead" data-id="${l.id}">Delete</button></td>
        </tr>
      `).join('');
    }
    leadTbody.querySelectorAll('.btn-admin-delete-lead').forEach(btn => {
      btn.addEventListener('click', () => deleteLead(btn.dataset.id));
    });
  }

  // Cases (admin table)
  const caseTbody = document.querySelector('#adminCasesTable tbody');
  if (caseTbody) {
    if (!state.cases.length) {
      caseTbody.innerHTML = `<tr><td colspan="3" style="text-align:center;color:#94a3b8;">No dynamic cases posted.</td></tr>`;
    } else {
      caseTbody.innerHTML = state.cases.map(c => `
        <tr>
          <td><strong>${c.title}</strong></td>
          <td><span class="badge badge-dark">${c.category}</span></td>
          <td>
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
              <button class="btn btn-warning btn-sm btn-admin-edit" data-id="${c.id}">Edit</button>
              <button class="btn btn-danger btn-sm btn-admin-delete" data-id="${c.id}">Delete</button>
            </div>
          </td>
        </tr>
      `).join('');
    }
    caseTbody.querySelectorAll('.btn-admin-edit').forEach(btn => {
      btn.addEventListener('click', () => loadCaseForEdit(btn.dataset.id));
    });
    caseTbody.querySelectorAll('.btn-admin-delete').forEach(btn => {
      btn.addEventListener('click', () => deleteCase(btn.dataset.id));
    });
  }
}

// =============================================================
// CRUD OPERATIONS
// =============================================================

// ---- Delete Lead ----
async function deleteLead(id) {
  if (typeof window.customConfirm !== 'function') {
    if (!confirm("Permanently delete this lead record?")) return;
    await performDeleteLead(id);
    return;
  }
  window.customConfirm("Permanently delete this lead record?", async () => {
    await performDeleteLead(id);
  });
}

async function performDeleteLead(id) {
  try {
    await deleteDoc(doc(db, "leads", id));
    state.leads = state.leads.filter(l => l.id !== id);
    renderAdminDashboard();
    renderStats();
    if (typeof window.showToast === 'function') window.showToast("Lead deleted.");
  } catch (e) {
    console.error(e);
    if (typeof window.showToast === 'function') window.showToast("Delete failed.", "error");
  }
}

// ---- Delete Case ----
async function deleteCase(id) {
  if (typeof window.customConfirm !== 'function') {
    if (!confirm("Permanently delete this case profile?")) return;
    await performDeleteCase(id);
    return;
  }
  window.customConfirm("Permanently delete this case profile?", async () => {
    await performDeleteCase(id);
  });
}

async function performDeleteCase(id) {
  try {
    await deleteDoc(doc(db, "cases", id));
    state.cases = state.cases.filter(c => c.id !== id);
    if ($('editCaseTargetId')?.value === id) clearEditForm();
    
    // Safety check if deleted case is the target of the ad banner
    if (state.adBanner.targetCaseId === id) {
      state.adBanner.targetCaseId = '';
      state.adBanner.isActive = false;
      await setDoc(doc(db, "settings", "adBanner"), state.adBanner);
    }

    renderAdminDashboard();
    renderPublicCases();
    renderAdBanner();
    renderStats();
    if (typeof window.showToast === 'function') window.showToast("Case deleted.");
  } catch (e) {
    console.error(e);
    if (typeof window.showToast === 'function') window.showToast("Delete failed.", "error");
  }
}

// ---- Delete Category ----
async function deleteCategory(id) {
  if (typeof window.customConfirm !== 'function') {
    if (!confirm("Delete this category? Cases using it will lose their filter association.")) return;
    await performDeleteCategory(id);
    return;
  }
  window.customConfirm("Delete this category? Cases using it will lose their filter association.", async () => {
    await performDeleteCategory(id);
  });
}

async function performDeleteCategory(id) {
  try {
    await deleteDoc(doc(db, "categories", id));
    state.categories = state.categories.filter(c => c.id !== id);
    renderAll();
    if (typeof window.showToast === 'function') window.showToast("Category deleted.");
  } catch (e) {
    console.error(e);
    if (typeof window.showToast === 'function') window.showToast("Delete failed.", "error");
  }
}

// ---- Load Case for Edit ----
function loadCaseForEdit(id) {
  const c = state.cases.find(x => x.id === id);
  if (!c) return;

  const targetId = $('editCaseTargetId');
  const title = $('newCaseTitle');
  const category = $('newCaseCategory');
  const imageUrl = $('newCaseImageUrl');
  const desc = $('newCaseDesc');

  if (targetId) targetId.value = c.id;
  if (title) title.value = c.title || '';
  if (category) category.value = c.category || '';
  if (imageUrl) imageUrl.value = c.imageUrl || '';
  if (desc) desc.value = c.description || '';

  if (typeof window.syncCustomSelect === 'function') {
    window.syncCustomSelect('newCaseCategory');
  }

  const headline = $('adminFormHeadline');
  const submitBtn = $('adminFormSubmitBtn');
  const cancelBtn = $('cancelEditCaseBtn');

  if (headline) headline.textContent = '✏️ Edit Case Parameters';
  if (submitBtn) {
    submitBtn.textContent = '💾 Save Changes';
    submitBtn.className = 'btn btn-warning';
  }
  if (cancelBtn) cancelBtn.style.display = 'inline-block';

  const form = $('addCaseForm');
  if (form) form.scrollIntoView({ behavior: 'smooth' });
}

function clearEditForm() {
  const targetId = $('editCaseTargetId');
  const form = $('addCaseForm');
  const headline = $('adminFormHeadline');
  const submitBtn = $('adminFormSubmitBtn');
  const cancelBtn = $('cancelEditCaseBtn');

  if (targetId) targetId.value = '';
  if (form) form.reset();

  if (typeof window.syncCustomSelect === 'function') {
    window.syncCustomSelect('newCaseCategory');
  }

  if (headline) headline.textContent = '➕ Add New Case Investigation';
  if (submitBtn) {
    submitBtn.textContent = 'Add Case to Website';
    submitBtn.className = 'btn btn-primary';
  }
  if (cancelBtn) cancelBtn.style.display = 'none';
}
window.clearEditForm = clearEditForm;

// ---- Export CSV ----
function exportLeadsCSV() {
  if (!state.leads.length) {
    if (typeof window.showToast === 'function') window.showToast("No leads to export.", "error");
    return;
  }

  let csv = "data:text/csv;charset=utf-8,First Name,Last Name,Email,Phone,Category,Message\n";
  state.leads.forEach(l => {
    const msg = (l.message || '').replace(/"/g, '""');
    csv += `"${l.firstName||''}","${l.lastName||''}","${l.email||''}","${l.phone||''}","${l.category||''}","${msg}"\n`;
  });

  const a = document.createElement('a');
  a.href = encodeURI(csv);
  a.download = `leads_export_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  if (typeof window.showToast === 'function') window.showToast("Leads exported successfully!");
}

// =============================================================
// EVENT BINDINGS
// =============================================================
document.addEventListener('DOMContentLoaded', () => {
  console.log("🚀 app.js initializing...");

  // Search / filter
  const searchInput = $('frontendSearchCases');
  const filterSelect = $('frontendFilterCases');
  const leadFilter = $('adminLeadFilter');

  if (searchInput) searchInput.addEventListener('input', renderPublicCases);
  if (filterSelect) filterSelect.addEventListener('change', renderPublicCases);
  if (leadFilter) leadFilter.addEventListener('change', renderAdminDashboard);

  // Export CSV
  const exportBtn = $('exportCsvBtn');
  if (exportBtn) exportBtn.addEventListener('click', exportLeadsCSV);

  // Cancel edit
  const cancelBtn = $('cancelEditCaseBtn');
  if (cancelBtn) cancelBtn.addEventListener('click', clearEditForm);

  // ---- Submit Lead Form ----
  const leadForm = $('globalContactForm');
  if (leadForm) {
    leadForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const btn = this.querySelector('button[type="submit"]');
      const orig = btn?.textContent || 'Submit';
      if (btn) {
        btn.textContent = "Processing…";
        btn.disabled = true;
      }

      try {
        const lead = {
          firstName: $('globalLeadFirstName')?.value?.trim() || '',
          lastName: $('globalLeadLastName')?.value?.trim() || '',
          email: $('globalLeadEmail')?.value?.trim() || '',
          phone: $('globalLeadPhone')?.value?.trim() || '',
          category: $('globalLeadCategory')?.value || '',
          message: $('globalLeadMessage')?.value?.trim() || '',
          timestamp: new Date().toISOString()
        };

        const ref = await addDoc(collection(db, "leads"), lead);
        lead.id = ref.id;
        state.leads.push(lead);
        this.reset();

        if (typeof window.syncCustomSelect === 'function') {
          window.syncCustomSelect('globalLeadCategory');
        }

        if (typeof window.showToast === 'function') {
          window.showToast("Your information has been registered.");
        }
        renderAdminDashboard();
        renderStats();
      } catch (err) {
        console.error(err);
        if (typeof window.showToast === 'function') {
          window.showToast("Submission failed. Please try again.", "error");
        }
      } finally {
        if (btn) {
          btn.textContent = orig;
          btn.disabled = false;
        }
      }
    });
  }

  // ---- Admin Login ----
  const loginForm = $('adminLoginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const email = $('adminEmail')?.value?.trim() || '';
      const pass = $('adminPassword')?.value?.trim() || '';

      if (email === "admin@gmail.com" && pass === "admin1234") {
        const loginBox = $('adminLoginBox');
        const dashboard = $('adminDashboardBox');

        if (loginBox) loginBox.style.display = 'none';
        if (dashboard) {
          dashboard.style.display = 'flex';
          dashboard.classList.add('open');
        }

        state.isAdmin = true;
        if (typeof window.showToast === 'function') window.showToast("Access granted.");
        renderAdminDashboard();
        renderStats();
      } else {
        if (typeof window.showToast === 'function') window.showToast("Invalid credentials.", "error");
      }
    });
  }

  // ---- Admin Logout ----
  const logoutBtn = $('adminLogoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      const loginFormEl = $('adminLoginForm');
      const dashboard = $('adminDashboardBox');
      const loginBox = $('adminLoginBox');

      if (loginFormEl) loginFormEl.reset();
      clearEditForm();
      if (dashboard) {
        dashboard.classList.remove('open');
        dashboard.style.display = 'none';
      }
      if (loginBox) loginBox.style.display = 'block';
      const overlay = document.getElementById('adminOverlay');
      if (overlay) overlay.style.display = 'none';

      state.isAdmin = false;
      if (typeof window.showToast === 'function') window.showToast("Session terminated.");
    });
  }

  // ---- Add / Edit Case ----
  const caseForm = $('addCaseForm');
  if (caseForm) {
    caseForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const id = $('editCaseTargetId')?.value || '';
      const data = {
        title: $('newCaseTitle')?.value?.trim() || '',
        category: $('newCaseCategory')?.value || '',
        imageUrl: $('newCaseImageUrl')?.value?.trim() || '',
        description: $('newCaseDesc')?.value?.trim() || ''
      };

      const btn = $('adminFormSubmitBtn');
      const orig = btn?.textContent || 'Save';
      if (btn) {
        btn.textContent = "Saving…";
        btn.disabled = true;
      }

      try {
        if (id) {
          await updateDoc(doc(db, "cases", id), data);
          const idx = state.cases.findIndex(c => c.id === id);
          if (idx !== -1) state.cases[idx] = { ...state.cases[idx], ...data };
          if (typeof window.showToast === 'function') window.showToast("Case updated.");
          clearEditForm();
        } else {
          const ref = await addDoc(collection(db, "cases"), { ...data, createdAt: new Date().toISOString() });
          state.cases.push({ id: ref.id, ...data });
          this.reset();
          if (typeof window.syncCustomSelect === 'function') {
            window.syncCustomSelect('newCaseCategory');
          }
          if (typeof window.showToast === 'function') window.showToast("New case added.");
        }
        renderAdminDashboard();
        renderPublicCases();
        renderAdBanner(); // Refresh target case list
        renderStats();
      } catch (err) {
        console.error(err);
        if (typeof window.showToast === 'function') window.showToast("Database write failed.", "error");
      } finally {
        if (btn) {
          btn.textContent = orig;
          btn.disabled = false;
        }
      }
    });
  }

  // ---- Update Ad Banner ----
  const updateAdForm = $('updateAdForm');
  if (updateAdForm) {
    updateAdForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const btn = this.querySelector('button[type="submit"]');
      const orig = btn?.textContent || 'Save Ad Banner';
      if (btn) {
        btn.textContent = "Saving…";
        btn.disabled = true;
      }

      const newAdData = {
        imageUrl: $('adImageUrl')?.value?.trim() || '',
        targetCaseId: $('adTargetCase')?.value || '',
        isActive: $('adIsActive')?.checked || false
      };

      try {
        await setDoc(doc(db, "settings", "adBanner"), newAdData);
        state.adBanner = newAdData;
        renderAdBanner();
        if (typeof window.showToast === 'function') window.showToast("Ad Banner updated successfully.");
      } catch (err) {
        console.error(err);
        if (typeof window.showToast === 'function') window.showToast("Ad Banner update failed.", "error");
      } finally {
        if (btn) {
          btn.textContent = orig;
          btn.disabled = false;
        }
      }
    });
  }

  // ---- Update Settings ----
  const settingsForm = $('updateSettingsForm');
  if (settingsForm) {
    settingsForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const btn = this.querySelector('button[type="submit"]');
      const orig = btn?.textContent || 'Save';
      if (btn) {
        btn.textContent = "Syncing…";
        btn.disabled = true;
      }

      const newSettings = {
        tel: $('settingTel')?.value?.trim() || '',
        email: $('settingEmail')?.value?.trim() || '',
        address: $('settingAddress')?.value?.trim() || ''
      };

      try {
        await setDoc(doc(db, "settings", "global"), newSettings);
        state.settings = newSettings;
        renderSettings();
        if (typeof window.showToast === 'function') window.showToast("Settings updated.");
      } catch (err) {
        console.error(err);
        if (typeof window.showToast === 'function') window.showToast("Update failed.", "error");
      } finally {
        if (btn) {
          btn.textContent = orig;
          btn.disabled = false;
        }
      }
    });
  }

  // ---- Add Category ----
  const addCategoryBtn = document.getElementById('addCategoryBtn');
  if (addCategoryBtn) {
    addCategoryBtn.addEventListener('click', async function(e) {
      e.preventDefault();
      const btn = this;
      btn.disabled = true;
      btn.textContent = "Adding…";

      const nameInput = document.getElementById('newCategoryName');
      const name = nameInput?.value?.trim() || '';

      if (!name) {
        if (typeof window.showToast === 'function') {
          window.showToast("Please enter a category name.", "error");
        }
        btn.disabled = false;
        btn.textContent = "➕ Add Category";
        return;
      }

      try {
        // Check if category already exists
        if (state.categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
          if (typeof window.showToast === 'function') {
            window.showToast("Category already exists.", "error");
          }
          btn.disabled = false;
          btn.textContent = "➕ Add Category";
          return;
        }

        const ref = await addDoc(collection(db, "categories"), { name });
        state.categories.push({ id: ref.id, name });
        if (nameInput) nameInput.value = '';
        renderAll();
        if (typeof window.showToast === 'function') {
          window.showToast(`Category "${name}" added successfully.`);
        }
      } catch (err) {
        console.error(err);
        if (typeof window.showToast === 'function') {
          window.showToast("Add failed. Please try again.", "error");
        }
      } finally {
        btn.disabled = false;
        btn.textContent = "➕ Add Category";
      }
    });
  }

  // ---- Initial fetch ----
  fetchAllData();

  console.log("✅ app.js initialized successfully.");
});

console.log("📦 app.js loaded");

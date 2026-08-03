document.addEventListener("DOMContentLoaded", async () => {

  // ── Constants ────────────────────────────────────────────────────────
  const API_BASE  = "/api";
  const token     = localStorage.getItem("token");
  const PAGE_SIZE = 10;

  // ── State ────────────────────────────────────────────────────────────
  let allUsers        = [];
  let filteredUsers   = [];
  let currentPage     = 1;
  let editFormSnapshot = null;

  function showAlertModal(message) {
    const overlay = document.getElementById("alertModal");
    const msgEl = document.getElementById("alertModalMessage");
    const btn = document.getElementById("alertModalOk");
    if (!overlay) return alert(message);
    msgEl.textContent = message;
    overlay.classList.remove("hidden");
    btn.onclick = () => overlay.classList.add("hidden");
  }

  // ── Department filter — derived from user data ────────────────────────
  function populateDepartmentFilter() {
    const departments = [...new Set(
      allUsers.map(u => u.department_name || u.eu_department).filter(Boolean)
    )].sort();
    const sel     = document.getElementById("filterDepartment");
    const current = sel.value;
    sel.innerHTML = `<option value="">All Departments</option>`;
    departments.forEach(d => {
      const opt       = document.createElement("option");
      opt.value       = d;
      opt.textContent = d;
      if (d === current) opt.selected = true;
      sel.appendChild(opt);
    });
  }

  // ── Load departments into Add/Edit dropdowns ──────────────────────────
  async function loadDepartmentOptions() {
    let options = '<option value="" disabled selected hidden>Select department</option>';
    try {
      const res  = await fetch(`${API_BASE}/department`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      const raw  = Array.isArray(data)                  ? data :
                   Array.isArray(data?.departments)     ? data.departments :
                   Array.isArray(data?.data)            ? data.data : [];

      raw.forEach(dept => {
        const id   = dept.department_id ?? dept.id   ?? "";
        const name = dept.department_name ?? dept.name ?? "";
        if (name) options += `<option value="${id}">${name}</option>`;
      });
    } catch (err) {
      console.error("Failed to load departments:", err);
    }

    ["addDepartment", "editDepartment"].forEach(elId => {
      const el = document.getElementById(elId);
      if (el) el.innerHTML = options;
    });
  }

  // ── Fetch All Users ───────────────────────────────────────────────────
  async function loadUsers() {
    try {
      const res = await fetch(`${API_BASE}/end-user`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      allUsers = Array.isArray(data)      ? data :
                 Array.isArray(data.data) ? data.data : [];
      populateDivisionFilter();
      populateDepartmentFilter();
      applyLocalFilters();
    } catch (err) {
      console.error("Failed to load end users:", err);
      document.getElementById("userTableBody").innerHTML = `
        <tr class="state-row">
          <td colspan="9">Failed to load users. Please try again.</td>
        </tr>`;
    }
  }

  // ── Filters ───────────────────────────────────────────────────────────
  function populateDivisionFilter() {
    const divisions = [...new Set(allUsers.map(u => u.eu_division).filter(Boolean))].sort();
    const sel       = document.getElementById("filterDivision");
    const current   = sel.value;
    sel.innerHTML   = `<option value="">All Divisions</option>`;
    divisions.forEach(d => {
      const opt       = document.createElement("option");
      opt.value       = d;
      opt.textContent = d;
      if (d === current) opt.selected = true;
      sel.appendChild(opt);
    });
  }

  function applyLocalFilters() {
    const search     = document.getElementById("filterSearch").value.trim().toLowerCase();
    const division   = document.getElementById("filterDivision").value;
    const department = document.getElementById("filterDepartment").value;
    const location   = document.getElementById("filterLocation").value;
    const status     = document.getElementById("filterStatus").value;

    filteredUsers = allUsers.filter(u => {
      if (search) {
        const haystack = `${u.eu_name} ${u.eu_emp_id} ${u.eu_email || ""}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      if (division   && u.eu_division !== division) return false;
      if (department && (u.department_name || u.eu_department) !== department) return false;
      if (location   && u.eu_location !== location) return false;

      const empStatus = (u.eu_status || "Active").toLowerCase();
      if (status === "active"   && empStatus !== "active")   return false;
      if (status === "resigned" && empStatus !== "resigned") return false;
      return true;
    });

    currentPage = 1;
    renderTable();
  }

  function clearFilters() {
    document.getElementById("filterSearch").value     = "";
    document.getElementById("filterDivision").value   = "";
    document.getElementById("filterDepartment").value = "";
    document.getElementById("filterLocation").value   = "";
    document.getElementById("filterStatus").value     = "";
    applyLocalFilters();
  }

  // ── Render Table ──────────────────────────────────────────────────────
  function renderTable() {
    const tbody     = document.getElementById("userTableBody");
    const total     = filteredUsers.length;
    const start     = (currentPage - 1) * PAGE_SIZE;
    const end       = Math.min(start + PAGE_SIZE, total);
    const pageUsers = filteredUsers.slice(start, end);

    document.getElementById("userCount").textContent =
      `${total.toLocaleString()} ${total === 1 ? "user" : "users"}`;

    if (pageUsers.length === 0) {
      tbody.innerHTML = `
        <tr class="state-row">
          <td colspan="9">No users match your filters.</td>
        </tr>`;
      renderPagination(total);
      return;
    }

    tbody.innerHTML = pageUsers.map((u, i) => {
      const computers  = u.assignedComputers || [];
      const software   = u.assignedSoftware  || [];
      const empStatus  = (u.eu_status || "Active").trim();
      const isResigned = empStatus.toLowerCase() === "resigned";

      const statusBadge = isResigned
        ? `<span class="status-badge status-resigned">Resigned</span>`
        : `<span class="status-badge status-active">Active</span>`;

      return `
        <tr class="${isResigned ? "disabled-row" : ""}" data-index="${start + i}">
          <td class="td-emp-id">${escHtml(String(u.eu_emp_id || "—"))}</td>
          <td class="td-name">
            <strong>${escHtml(u.eu_name || "—")}</strong>
            <span>${escHtml(u.eu_email || "")}</span>
          </td>
          <td>${escHtml(u.eu_division || "—")}</td>
          <td>${escHtml(u.department_name || u.eu_department || "—")}</td>
          <td style="text-align:center">${escHtml(u.eu_location || "—")}</td>
          <td style="text-align:center">
            <span class="asset-count ${computers.length > 0 ? "has-assets" : ""}">${computers.length}</span>
          </td>
          <td style="text-align:center">
            <span class="asset-count ${software.length > 0 ? "has-assets" : ""}">${software.length}</span>
          </td>
          <td style="text-align:center">${statusBadge}</td>
          <td>
            <div class="action-btns">
              <button class="btn-icon btn-view" title="View profile" data-index="${start + i}">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </button>
              <button class="btn-icon btn-edit" title="Edit user" data-index="${start + i}">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
              <button class="btn-icon ${isResigned ? "" : "btn-icon-danger"} btn-disable"
                title="${isResigned ? "Mark as Active" : "Mark as Resigned"}"
                data-index="${start + i}">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                </svg>
              </button>
            </div>
          </td>
        </tr>`;
    }).join("");

    renderPagination(total);
  }

  function renderPagination(total) {
    const totalPages = Math.ceil(total / PAGE_SIZE);
    const start      = (currentPage - 1) * PAGE_SIZE + 1;
    const end        = Math.min(currentPage * PAGE_SIZE, total);

    document.getElementById("paginationInfo").textContent =
      total === 0 ? "" : `Showing ${start}–${end} of ${total}`;

    const btns = document.getElementById("paginationBtns");
    btns.innerHTML = "";
    if (totalPages <= 1) return;

    getPaginationRange(currentPage, totalPages).forEach(p => {
      if (p === "…") {
        const el = document.createElement("span");
        el.style.cssText = "padding:0 4px;line-height:32px;color:#94a3b8;font-size:13px;";
        el.textContent   = "…";
        btns.appendChild(el);
        return;
      }
      const btn       = document.createElement("button");
      btn.className   = `page-btn${p === currentPage ? " active" : ""}`;
      btn.textContent = p;
      btn.onclick     = () => { currentPage = p; renderTable(); };
      btns.appendChild(btn);
    });
  }

  function getPaginationRange(current, total) {
    if (total <= 7)          return Array.from({ length: total }, (_, i) => i + 1);
    if (current <= 4)        return [1, 2, 3, 4, 5, "…", total];
    if (current >= total -3) return [1, "…", total-4, total-3, total-2, total-1, total];
    return [1, "…", current-1, current, current+1, "…", total];
  }

  // ── Detail Modal ──────────────────────────────────────────────────────
  async function openDetailModal(userIndex) {
    const u = filteredUsers[userIndex];
    document.getElementById("detailModalTitle").textContent = u.eu_name || "User Profile";
    document.getElementById("detailModalMeta").textContent  =
      `Employee ID: ${u.eu_emp_id} · ${u.eu_division || ""}`;
    document.getElementById("detailModalBody").innerHTML    =
      `<p class="modal-loading"><span class="spinner"></span> Loading profile…</p>`;
    document.getElementById("detailModal").classList.remove("hidden");

    try {
      const res = await fetch(`${API_BASE}/end-user/${u.eu_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      renderDetailBody(data);
    } catch (err) {
      console.error("Failed to load user detail:", err);
      document.getElementById("detailModalBody").innerHTML =
        `<p style="color:#ef4444;text-align:center;font-size:13px;padding:24px 0">Failed to load profile.</p>`;
    }
  }

  function renderDetailBody(u) {
    const computers  = u.assignedComputers || [];
    const software   = u.assignedSoftware  || [];
    const isResigned = (u.eu_status || "").toLowerCase() === "resigned";

    document.getElementById("detailModalBody").innerHTML = `
      <div class="detail-section">
        <div class="detail-section-title">Personal Information</div>
        <div class="detail-grid">
          <div class="detail-item"><span>Full Name</span><span>${escHtml(u.eu_name || "—")}</span></div>
          <div class="detail-item"><span>Employee ID</span><span>${escHtml(String(u.eu_emp_id || "—"))}</span></div>
          <div class="detail-item"><span>Email</span><span>${escHtml(u.eu_email || "—")}</span></div>
          <div class="detail-item"><span>Contact No.</span><span>${escHtml(u.eu_contact_no || "—")}</span></div>
          <div class="detail-item"><span>Division</span><span>${escHtml(u.eu_division || "—")}</span></div>
          <div class="detail-item"><span>Department</span><span>${escHtml(u.department_name || u.eu_department || "—")}</span></div>
          <div class="detail-item"><span>Location</span><span>${escHtml(u.eu_location || "—")}</span></div>
          <div class="detail-item"><span>Employment Status</span><span>${isResigned
            ? '<span class="status-badge status-resigned">Resigned</span>'
            : '<span class="status-badge status-active">Active</span>'}</span></div>
        </div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">Assigned Computers (${computers.length})</div>
        <div class="asset-list" id="computerAssetList">
          ${computers.length === 0
            ? `<p class="asset-empty">No computers assigned.</p>`
            : computers.map(c => `
              <div class="asset-accordion" data-type="computer" data-id="${escHtml(String(c.computer_id))}">
                <button class="asset-accordion-trigger" type="button" aria-expanded="false">
                  <div class="asset-accordion-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/>
                      <line x1="12" y1="17" x2="12" y2="21"/>
                    </svg>
                  </div>
                  <div class="asset-accordion-label">
                    <span class="asset-item-name">${escHtml(c.computer_name || "—")}</span>
                  </div>
                  <svg class="asset-accordion-chevron" xmlns="http://www.w3.org/2000/svg" width="14" height="14"
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                    stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
                <div class="asset-accordion-body" hidden></div>
              </div>`).join("")}
        </div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">Assigned Software (${software.length})</div>
        <div class="asset-list" id="softwareAssetList">
          ${software.length === 0
            ? `<p class="asset-empty">No software assigned.</p>`
            : software.map(s => `
              <div class="asset-accordion" data-type="software" data-id="${escHtml(String(s.software_id))}">
                <button class="asset-accordion-trigger" type="button" aria-expanded="false">
                  <div class="asset-accordion-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
                    </svg>
                  </div>
                  <div class="asset-accordion-label">
                    <span class="asset-item-name">${escHtml(s.software_name || "—")}</span>
                  </div>
                  <svg class="asset-accordion-chevron" xmlns="http://www.w3.org/2000/svg" width="14" height="14"
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                    stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
                <div class="asset-accordion-body" hidden></div>
              </div>`).join("")}
        </div>
      </div>
    `;

    document.getElementById("detailModalBody").querySelectorAll(".asset-accordion-trigger")
      .forEach(btn => btn.addEventListener("click", handleAssetAccordion));
  }

  // ── Asset Accordion ───────────────────────────────────────────────────
  async function handleAssetAccordion(e) {
    const trigger   = e.currentTarget;
    const accordion = trigger.closest(".asset-accordion");
    const body      = accordion.querySelector(".asset-accordion-body");
    const isOpen    = trigger.getAttribute("aria-expanded") === "true";

    trigger.setAttribute("aria-expanded", !isOpen);
    accordion.classList.toggle("is-open", !isOpen);

    if (isOpen) { body.hidden = true; return; }
    if (body.dataset.loaded === "true") { body.hidden = false; return; }

    const type     = accordion.dataset.type;
    const id       = accordion.dataset.id;
    const endpoint = type === "computer"
      ? `${API_BASE}/computer/${id}`
      : `${API_BASE}/software/${id}`;

    body.hidden   = false;
    body.innerHTML = `<div class="asset-detail-loading"><span class="spinner spinner-sm"></span> Loading details…</div>`;

    try {
      const res = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      body.innerHTML      = type === "computer"
        ? renderComputerDetail(data)
        : renderSoftwareDetail(data);
      body.dataset.loaded = "true";
    } catch (err) {
      console.error(`Failed to load ${type} detail:`, err);
      body.innerHTML = `<p class="asset-detail-error">Failed to load details. Please try again.</p>`;
    }
  }

  // ── Computer Detail Renderer ──────────────────────────────────────────
  function renderComputerDetail(c) {
    const statusClass = (c.computer_status || "").toLowerCase() === "active"
      ? "status-active" : "status-disabled";
    const peripherals = Array.isArray(c.peripherals) && c.peripherals.length > 0
      ? c.peripherals.map(p => `<span class="asset-tag">${escHtml(p)}</span>`).join("")
      : `<span class="asset-detail-empty">None listed</span>`;

    return `
      <div class="asset-detail-panel">
        <div class="asset-detail-group">
          <div class="asset-detail-group-title">Identity</div>
          <div class="asset-detail-grid">
            <div class="asset-detail-row"><span>Asset Tag</span><span>${escHtml(c.asset_tag || "—")}</span></div>
            <div class="asset-detail-row"><span>Serial No.</span><span>${escHtml(c.serial_no || "—")}</span></div>
            <div class="asset-detail-row"><span>Brand / Model</span><span>${escHtml(c.brand || "—")} ${escHtml(c.model || "")}</span></div>
            <div class="asset-detail-row"><span>Device Type</span><span>${escHtml(c.device_type || "—")}</span></div>
            <div class="asset-detail-row"><span>Status</span><span><span class="status-badge ${statusClass}">${escHtml(c.computer_status || "—")}</span></span></div>
            <div class="asset-detail-row"><span>Condition</span><span>${escHtml(c.asset_condition || "—")}</span></div>
          </div>
        </div>
        <div class="asset-detail-group">
          <div class="asset-detail-group-title">Hardware</div>
          <div class="asset-detail-grid">
            <div class="asset-detail-row"><span>Operating System</span><span>${escHtml(c.operating_system || "—")}</span></div>
            <div class="asset-detail-row"><span>Processor</span><span>${escHtml(c.processor || "—")}</span></div>
            <div class="asset-detail-row"><span>RAM</span><span>${escHtml(c.ram_size || "—")}</span></div>
            <div class="asset-detail-row"><span>Storage</span><span>${escHtml(c.storage_capacity || "—")} ${escHtml(c.storage_type || "")}</span></div>
          </div>
        </div>
        <div class="asset-detail-group">
          <div class="asset-detail-group-title">Network</div>
          <div class="asset-detail-grid">
            <div class="asset-detail-row"><span>IP Address</span><span>${escHtml(c.ip_address || "—")}</span></div>
            <div class="asset-detail-row"><span>MAC Address</span><span>${escHtml(c.mac_address || "—")}</span></div>
            <div class="asset-detail-row"><span>Connectivity</span><span>${escHtml(c.network_connectivity || "—")}</span></div>
            <div class="asset-detail-row"><span>VPN Access</span><span>${c.has_vpn_access ? "Yes" : "No"}</span></div>
            <div class="asset-detail-row"><span>AnyDesk ID</span><span>${escHtml(c.anydesk_ip || "—")}</span></div>
          </div>
        </div>
        <div class="asset-detail-group">
          <div class="asset-detail-group-title">Lifecycle</div>
          <div class="asset-detail-grid">
            <div class="asset-detail-row"><span>Vendor</span><span>${escHtml(c.vendor || "—")}</span></div>
            <div class="asset-detail-row"><span>Cost</span><span>${c.cost != null ? "₱" + Number(c.cost).toLocaleString() : "—"}</span></div>
            <div class="asset-detail-row"><span>Received Date</span><span>${formatDate(c.received_date)}</span></div>
            <div class="asset-detail-row"><span>Warranty Expiry</span><span>${formatDate(c.warranty_expiry)}</span></div>
            <div class="asset-detail-row"><span>Assigned Date</span><span>${formatDate(c.assigned_date)}</span></div>
            <div class="asset-detail-row"><span>Return By</span><span>${formatDate(c.to_return_by)}</span></div>
          </div>
        </div>
        ${c.peripherals && c.peripherals.length > 0 ? `
        <div class="asset-detail-group">
          <div class="asset-detail-group-title">Peripherals</div>
          <div class="asset-tags-row">${peripherals}</div>
        </div>` : ""}
        ${c.programs && c.programs.length > 0 ? `
        <div class="asset-detail-group">
          <div class="asset-detail-group-title">Programs</div>
          <div class="asset-tags-row">${c.programs.map(a => `<span class="asset-tag">${escHtml(a)}</span>`).join("")}</div>
        </div>` : ""}
        ${c.remarks ? `
        <div class="asset-detail-group">
          <div class="asset-detail-group-title">Remarks</div>
          <p class="asset-detail-remarks">${escHtml(c.remarks)}</p>
        </div>` : ""}
      </div>`;
  }

  // ── Software Detail Renderer ──────────────────────────────────────────
  function renderSoftwareDetail(s) {
    const statusClass = (s.software_status || "").toLowerCase() === "active"
      ? "status-active" : "status-disabled";

    return `
      <div class="asset-detail-panel">
        <div class="asset-detail-group">
          <div class="asset-detail-group-title">License Info</div>
          <div class="asset-detail-grid">
            <div class="asset-detail-row"><span>Vendor</span><span>${escHtml(s.vendor || "—")}</span></div>
            <div class="asset-detail-row"><span>License Type</span><span>${escHtml(s.license_type || "—")}</span></div>
            <div class="asset-detail-row"><span>Subscription ID</span><span>${escHtml(s.subscription_id || "—")}</span></div>
            <div class="asset-detail-row"><span>Status</span><span><span class="status-badge ${statusClass}">${escHtml(s.software_status || "—")}</span></span></div>
          </div>
        </div>
        <div class="asset-detail-group">
          <div class="asset-detail-group-title">Dates &amp; Cost</div>
          <div class="asset-detail-grid">
            <div class="asset-detail-row"><span>Purchase Date</span><span>${formatDate(s.purchase_date)}</span></div>
            <div class="asset-detail-row"><span>Renewal Date</span><span>${formatDate(s.renewal_date)}</span></div>
            <div class="asset-detail-row"><span>Expiry Date</span><span>${formatDate(s.expiry_date)}</span></div>
            <div class="asset-detail-row"><span>Assigned Date</span><span>${formatDate(s.assigned_date)}</span></div>
            <div class="asset-detail-row"><span>Cost</span><span>${s.cost != null ? "₱" + Number(s.cost).toLocaleString() : "—"}</span></div>
            <div class="asset-detail-row"><span>Previous Cost</span><span>${s.previous_cost != null ? "₱" + Number(s.previous_cost).toLocaleString() : "—"}</span></div>
          </div>
        </div>
        ${s.remarks ? `
        <div class="asset-detail-group">
          <div class="asset-detail-group-title">Remarks</div>
          <p class="asset-detail-remarks">${escHtml(s.remarks)}</p>
        </div>` : ""}
      </div>`;
  }

  function closeDetailModal() {
    document.getElementById("detailModal").classList.add("hidden");
    document.getElementById("detailModalBody").innerHTML = "";
  }

  // ── Form Validation ───────────────────────────────────────────────────
  function validateUserForm(prefix) {
    const get    = id => document.getElementById(id);
    const fields = [
      { id: `${prefix}Name`,       errId: `${prefix}NameError`,       test: v => v.trim() !== "" },
      { id: `${prefix}EmpId`,      errId: `${prefix}EmpIdError`,      test: v => /^\d{5}$/.test(v.trim()) },
      { id: `${prefix}Division`,   errId: `${prefix}DivisionError`,   test: v => v.trim() !== "" },
      { id: `${prefix}Department`, errId: `${prefix}DepartmentError`, test: v => v !== "" },
      { id: `${prefix}Email`,      errId: `${prefix}EmailError`,      test: v => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) },
      { id: `${prefix}Contact`,    errId: `${prefix}ContactError`,    test: v => v === "" || /^\d{1,11}$/.test(v) },
      { id: `${prefix}Location`,   errId: `${prefix}LocationError`,   test: v => v !== "" },
    ];

    let valid = true;

    fields.forEach(({ id, errId, test }) => {
      const el    = get(id);
      const errEl = get(errId);
      if (!el || !errEl) return;

      const val = el.value ?? "";
      const ok  = test(val);

      el.classList.toggle("input-error", !ok);
      errEl.classList.toggle("visible",  !ok);
      if (!ok) valid = false;
    });

    return valid;
  }

  function clearFormErrors(prefix) {
    ["Name", "EmpId", "Division", "Department", "Email", "Contact", "Location"].forEach(field => {
      const el    = document.getElementById(`${prefix}${field}`);
      const errEl = document.getElementById(`${prefix}${field}Error`);
      if (el)    el.classList.remove("input-error");
      if (errEl) errEl.classList.remove("visible");
    });
  }

  // ── Add Modal ─────────────────────────────────────────────────────────
  function openAddModal() {
    document.getElementById("addUserForm").reset();
    document.getElementById("addFormError").classList.add("hidden");
    document.getElementById("btnSubmitAdd").disabled = false;
    clearFormErrors("add");
    document.getElementById("addModal").classList.remove("hidden");
  }

  function closeAddModal() {
    document.getElementById("addModal").classList.add("hidden");
  }

  async function submitAddUser(e) {
    e.preventDefault();
    const errEl     = document.getElementById("addFormError");
    const submitBtn = document.getElementById("btnSubmitAdd");

    errEl.classList.add("hidden");
    submitBtn.disabled    = true;
    submitBtn.textContent = "Creating…";

    if (!validateUserForm("add")) {
      submitBtn.disabled    = false;
      submitBtn.textContent = "Create User";
      return;
    }

    const emailVal   = document.getElementById("addEmail").value.trim();
    const contactVal = document.getElementById("addContact").value.trim();

    const payload = {
      eu_name:       document.getElementById("addName").value.trim(),
      eu_emp_id:     Number(document.getElementById("addEmpId").value.trim()),
      eu_division:   document.getElementById("addDivision").value.trim(),
      eu_department: document.getElementById("addDepartment").value,
      eu_email:      emailVal   || null,
      eu_contact_no: contactVal || null,
      eu_location:   document.getElementById("addLocation").value,
      eu_status:     "Active",
    };

    try {
      const res = await fetch(`${API_BASE}/end-user`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        errEl.textContent = data.message || "Failed to create user.";
        errEl.classList.remove("hidden");
        return;
      }
      closeAddModal();
      await loadUsers();
    } catch (err) {
      console.error("Add user error:", err);
      errEl.textContent = "Unexpected error. Please try again.";
      errEl.classList.remove("hidden");
    } finally {
      submitBtn.disabled    = false;
      submitBtn.textContent = "Create User";
    }
  }

  // ── Edit Modal ────────────────────────────────────────────────────────
  function openEditModal(userIndex) {
    const u = filteredUsers[userIndex];

    document.getElementById("editUserId").value   = u.eu_id;
    document.getElementById("editName").value     = u.eu_name       || "";
    document.getElementById("editEmpId").value    = u.eu_emp_id     || "";
    document.getElementById("editDivision").value = u.eu_division   || "";
    document.getElementById("editEmail").value    = u.eu_email      || "";
    document.getElementById("editContact").value  = u.eu_contact_no || "";
    document.getElementById("editLocation").value = u.eu_location   || "";

    // Match department by ID, fall back to name matching
    const deptSelect = document.getElementById("editDepartment");
    const deptId     = String(u.eu_department_id ?? u.department_id ?? u.eu_department ?? "");
    if (deptId && [...deptSelect.options].some(o => o.value === deptId)) {
      deptSelect.value = deptId;
    } else {
      const match = [...deptSelect.options].find(o =>
        o.textContent.trim() === (u.department_name || "").trim()
      );
      deptSelect.value = match ? match.value : "";
    }

    // Status display (read-only badge)
    const isResigned = (u.eu_status || "Active").toLowerCase() === "resigned";
    document.getElementById("editStatusDisplay").innerHTML = isResigned
      ? `<span class="status-badge status-resigned">Resigned</span>`
      : `<span class="status-badge status-active">Active</span>`;

    document.getElementById("editModalMeta").textContent =
      `Employee ID: ${u.eu_emp_id} · ${u.eu_name}`;
    document.getElementById("editFormError").classList.add("hidden");
    document.getElementById("btnSubmitEdit").disabled = true;
    clearFormErrors("edit");
    document.getElementById("editModal").classList.remove("hidden");

    // Take snapshot of form values for change detection
    editFormSnapshot = {
      editName:     document.getElementById("editName").value,
      editEmpId:    document.getElementById("editEmpId").value,
      editDivision: document.getElementById("editDivision").value,
      editDepartment: document.getElementById("editDepartment").value,
      editEmail:    document.getElementById("editEmail").value,
      editContact:  document.getElementById("editContact").value,
      editLocation: document.getElementById("editLocation").value,
    };
  }

  function closeEditModal() {
    document.getElementById("editModal").classList.add("hidden");
  }

  async function submitEditUser(e) {
    e.preventDefault();
    const errEl     = document.getElementById("editFormError");
    const submitBtn = document.getElementById("btnSubmitEdit");
    const id        = document.getElementById("editUserId").value;

    errEl.classList.add("hidden");
    submitBtn.disabled    = true;
    submitBtn.textContent = "Saving…";

    if (!validateUserForm("edit")) {
      submitBtn.disabled    = false;
      submitBtn.textContent = "Save Changes";
      return;
    }

    // Re-check that changes exist (button was re-enabled, but guard anyway)
    if (editFormSnapshot) {
      const unchanged =
        document.getElementById("editName").value       === editFormSnapshot.editName &&
        document.getElementById("editEmpId").value       === editFormSnapshot.editEmpId &&
        document.getElementById("editDivision").value    === editFormSnapshot.editDivision &&
        document.getElementById("editDepartment").value  === editFormSnapshot.editDepartment &&
        document.getElementById("editEmail").value       === editFormSnapshot.editEmail &&
        document.getElementById("editContact").value     === editFormSnapshot.editContact &&
        document.getElementById("editLocation").value    === editFormSnapshot.editLocation;
      if (unchanged) {
        closeEditModal();
        return;
      }
    }

    const emailVal   = document.getElementById("editEmail").value.trim();
    const contactVal = document.getElementById("editContact").value.trim();

    // Read current status from the badge since it's display-only in this form
    const currentStatus = document.getElementById("editStatusDisplay")
      .querySelector(".status-badge")?.textContent.trim() || "Active";

    const payload = {
      euName:       document.getElementById("editName").value.trim(),
      euEmpId:      Number(document.getElementById("editEmpId").value.trim()),
      euDivision:   document.getElementById("editDivision").value.trim(),
      euDepartment: document.getElementById("editDepartment").value,
      euEmail:      emailVal   || null,
      euContactNo:  contactVal || null,
      euLocation:   document.getElementById("editLocation").value,
      euStatus:     currentStatus,
    };

    try {
      const res = await fetch(`${API_BASE}/end-user/${id}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        errEl.textContent = data.message || "Failed to update user.";
        errEl.classList.remove("hidden");
        return;
      }
      closeEditModal();
      await loadUsers();
    } catch (err) {
      console.error("Edit user error:", err);
      errEl.textContent = "Unexpected error. Please try again.";
      errEl.classList.remove("hidden");
    } finally {
      submitBtn.disabled    = false;
      submitBtn.textContent = "Save Changes";
    }
  }

  // ── Status Modal ──────────────────────────────────────────────────────
  let pendingStatusUserId = null;
  let pendingStatusTarget = null;

  function openStatusModal(userIndex) {
    const u       = filteredUsers[userIndex];
    const isActive = (u.eu_status || "Active").toLowerCase() !== "resigned";
    const newStatus = isActive ? "Resigned" : "Active";

    pendingStatusUserId = u.eu_id ?? u.id ?? null;

    if (!pendingStatusUserId) {
      console.error("openStatusModal: could not resolve eu_id", u);
      showAlertModal("Could not identify this user. Please refresh and try again.");
      return;
    }

    pendingStatusTarget = newStatus;

    const isResign   = newStatus === "Resigned";
    const warning    = document.getElementById("statusModalWarning");
    const confirmBtn = document.getElementById("btnConfirmStatus");

    document.getElementById("statusModalTitle").textContent = isResign
      ? `Mark as Resigned — ${u.eu_name}`
      : `Reactivate — ${u.eu_name}`;

    document.getElementById("statusModalMsg").textContent = isResign
      ? `${u.eu_name} (ID: ${u.eu_emp_id}) will be marked as Resigned. Their asset assignments will remain intact.`
      : `${u.eu_name} (ID: ${u.eu_emp_id}) will be set back to Active.`;

    warning.classList.toggle("is-resign",   isResign);
    warning.classList.toggle("is-activate", !isResign);
    confirmBtn.classList.toggle("is-resign",   isResign);
    confirmBtn.classList.toggle("is-activate", !isResign);

    document.getElementById("statusModal").classList.remove("hidden");
  }

  function closeStatusModal() {
    document.getElementById("statusModal").classList.add("hidden");
    pendingStatusUserId = null;
    pendingStatusTarget = null;
  }

  async function submitStatusChange() {
    if (!pendingStatusUserId || !pendingStatusTarget) return;

    const targetId     = pendingStatusUserId;
    const targetStatus = pendingStatusTarget;
    closeStatusModal();

    if (isNaN(Number(targetId))) {
      showAlertModal(`Invalid user ID "${targetId}". Please refresh and try again.`);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/end-user/${targetId}/status`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ status: targetStatus }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const messages = {
          400: "Invalid status value.",
          401: "Unauthorized.",
          403: "You don't have permission to update employment status.",
          404: "End user not found.",
        };
        showAlertModal(data?.message || messages[res.status] || "Failed to update status.");
        return;
      }

      await loadUsers();
    } catch (err) {
      console.error("Status update error:", err);
      showAlertModal("Could not connect to server.");
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────
  function escHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function formatDate(val) {
    if (!val) return "\u2014";
    const d = new Date(val);
    if (isNaN(d.getTime())) return escHtml(val);
    return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  }

  // ── Event Listeners ───────────────────────────────────────────────────
  document.getElementById("filterSearch").addEventListener("input",   applyLocalFilters);
  document.getElementById("filterDivision").addEventListener("change", applyLocalFilters);
  document.getElementById("filterDepartment").addEventListener("change", applyLocalFilters);
  document.getElementById("filterLocation").addEventListener("change", applyLocalFilters);
  document.getElementById("filterStatus").addEventListener("change",  applyLocalFilters);
  document.getElementById("btnClearFilters").addEventListener("click", clearFilters);

  document.getElementById("btnAddUser").addEventListener("click",   openAddModal);
  document.getElementById("btnCloseAdd").addEventListener("click",  closeAddModal);
  document.getElementById("btnCancelAdd").addEventListener("click", closeAddModal);
  document.getElementById("addUserForm").addEventListener("submit", submitAddUser);

  document.getElementById("btnCloseEdit").addEventListener("click",  closeEditModal);
  document.getElementById("btnCancelEdit").addEventListener("click", closeEditModal);
  document.getElementById("editUserForm").addEventListener("submit", submitEditUser);

  // Change detection for edit modal
  function updateEditSaveBtn() {
    const btn = document.getElementById("btnSubmitEdit");
    if (!btn || !editFormSnapshot) return;
    const changed =
      document.getElementById("editName").value       !== editFormSnapshot.editName ||
      document.getElementById("editEmpId").value       !== editFormSnapshot.editEmpId ||
      document.getElementById("editDivision").value    !== editFormSnapshot.editDivision ||
      document.getElementById("editDepartment").value  !== editFormSnapshot.editDepartment ||
      document.getElementById("editEmail").value       !== editFormSnapshot.editEmail ||
      document.getElementById("editContact").value     !== editFormSnapshot.editContact ||
      document.getElementById("editLocation").value    !== editFormSnapshot.editLocation;
    btn.disabled = !changed;
  }
  const editInputIds = ["editName", "editEmpId", "editDivision", "editDepartment", "editEmail", "editContact", "editLocation"];
  editInputIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", updateEditSaveBtn);
  });

  document.getElementById("btnCloseDetail").addEventListener("click", closeDetailModal);

  document.getElementById("btnCloseStatus").addEventListener("click",   closeStatusModal);
  document.getElementById("btnCancelStatus").addEventListener("click",  closeStatusModal);
  document.getElementById("btnConfirmStatus").addEventListener("click", submitStatusChange);

  document.getElementById("userTableBody").addEventListener("click", e => {
    const viewBtn    = e.target.closest(".btn-view");
    const editBtn    = e.target.closest(".btn-edit");
    const disableBtn = e.target.closest(".btn-disable");
    if (viewBtn)    openDetailModal(Number(viewBtn.dataset.index));
    if (editBtn)    openEditModal(Number(editBtn.dataset.index));
    if (disableBtn) openStatusModal(Number(disableBtn.dataset.index));
  });

  ["detailModal", "addModal", "editModal", "statusModal"].forEach(id => {
    document.getElementById(id).addEventListener("click", e => {
      if (e.target === document.getElementById(id))
        document.getElementById(id).classList.add("hidden");
    });
  });

  // Strip non-digits from contact fields as user types
  ["addContact", "editContact"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", () => {
      el.value = el.value.replace(/\D/g, "").slice(0, 11);
    });
  });

  // Block non-digit keystrokes on employee ID fields
  ["addEmpId", "editEmpId"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("keydown", e => {
      const allowed = ["Backspace", "Delete", "Tab", "ArrowLeft", "ArrowRight", "Home", "End"];
      if (!allowed.includes(e.key) && !/^\d$/.test(e.key)) e.preventDefault();
    });
  });

  // Clear field error as soon as user corrects the field
  ["add", "edit"].forEach(prefix => {
    ["Name", "EmpId", "Division", "Department", "Email", "Contact", "Location"].forEach(field => {
      const el = document.getElementById(`${prefix}${field}`);
      if (!el) return;
      const event = el.tagName === "SELECT" ? "change" : "input";
      el.addEventListener(event, () => {
        el.classList.remove("input-error");
        const errEl = document.getElementById(`${prefix}${field}Error`);
        if (errEl) errEl.classList.remove("visible");
      });
    });
  });

  lucide.createIcons();

  await loadDepartmentOptions();
  loadUsers();
});
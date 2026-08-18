document.addEventListener("DOMContentLoaded", () => {

  // ── Constants ─────────────────────────────────────────────────────────────
  const API_BASE  = "/api";
  const token     = localStorage.getItem("token");
  const PAGE_SIZE = 10;

  const SNAPSHOT_ACTIONS = new Set([
    "Add Computer", "Add Software", "Add UPS", "Add Printer", "Add Network Device",
    "Update Computer", "Assign Computer", "Unassign Computer", "Update Computer Network",
    "Update Software", "Assign Software", "Unassign Software",
    "Update UPS", "Update Printer", "Update Printer Network",
    "Update Network Device"
  ]);

  const ASSET_CREATE_ACTIONS = new Set([
    "Add Computer", "Add Software", "Add UPS", "Add Printer", "Add Network Device"
  ]);

  const SYSTEM_ACTIONS = new Set([
    "Login", "Register", "Change Password", "Reset Password",
    "Update Status", "Update Role", "Update Username", "Update User Details",
    "Grant Permission", "Revoke Permission",
    "Add Department", "Update Department",
    "Add Peripheral", "Update Peripheral",
    "Add Program", "Update Program",
    "Add Vendor", "Update Vendor",
    "Add Category", "Update Category Status",
    "Add End User", "Update End User", "Update End User Status",
    "Add Purchase Request", "Update Purchase Request", "Update Purchase Request Item",
    "Download Computer Report", "Download Software Report",
    "Download UPS Report", "Download Printer Report",
    "Download Network Device Report", "Download End User Report"
  ]);

  const ASSIGN_ACTIONS = new Set([
    "Assign Computer", "Unassign Computer",
    "Assign Software", "Unassign Software",
  ]);

  const UPDATE_ACTIONS = new Set([
    "Update Computer", "Update Computer Network",
    "Update Software",
    "Update UPS",
    "Update Printer", "Update Printer Network",
    "Update Network Device",
  ]);

  // ── Field label map — raw DB column → human-readable label ───────────────
  const FIELD_LABELS = {
    id:                        "ID",
    created_at:                "Created At",
    updated_at:                "Updated At",
    status:                    "Status",
    notes:                     "Notes",
    remarks:                   "Remarks",
    description:               "Description",
    type:                      "Type",
    brand:                     "Brand",
    model:                     "Model",
    serial_number:             "Serial Number",
    asset_tag:                 "Asset Tag",
    purchase_date:             "Purchase Date",
    purchase_price:            "Purchase Price",
    warranty_expiry:           "Warranty Expiry",
    location:                  "Location",
    department_id:             "Department",
    assigned_user_id:          "Assigned User",
    assigned_to:               "Assigned To",
    assigned_date:             "Assigned Date",
    unassigned_date:           "Unassigned Date",

    computer_id:               "Computer ID",
    computer_name:             "Computer Name",
    hostname:                  "Hostname",
    os:                        "Operating System",
    os_version:                "OS Version",
    processor:                 "Processor",
    ram_gb:                    "RAM (GB)",
    storage_gb:                "Storage (GB)",
    storage_type:              "Storage Type",
    form_factor:               "Form Factor",
    mac_address:               "MAC Address",
    ip_address:                "IP Address",
    subnet_mask:               "Subnet Mask",
    gateway:                   "Gateway",
    dns_primary:               "DNS (Primary)",
    dns_secondary:             "DNS (Secondary)",
    network_type:              "Network Type",
    vlan:                      "VLAN",
    switch_port:               "Switch Port",

    software_id:               "Software ID",
    software_name:             "Software Name",
    version:                   "Version",
    license_key:               "License Key",
    license_type:              "License Type",
    license_expiry:            "License Expiry",
    seats:                     "Seats",
    vendor:                    "Vendor",
    install_date:              "Install Date",

    ups_id:                    "UPS ID",
    ups_name:                  "UPS Name",
    capacity_va:               "Capacity (VA)",
    battery_type:              "Battery Type",
    last_battery_replacement:  "Last Battery Replacement",
    runtime_minutes:           "Runtime (min)",

    printer_id:                "Printer ID",
    printer_name:              "Printer Name",
    printer_type:              "Printer Type",
    is_network_printer:        "Network Printer",
    paper_size:                "Paper Size",
    color_capable:             "Color Capable",
    duplex_capable:            "Duplex Capable",

    network_device_id:         "Network Device ID",
    device_name:               "Device Name",
    device_type:               "Device Type",
    port_count:                "Port Count",
    firmware_version:          "Firmware Version",
    management_ip:             "Management IP",
    uplink_port:               "Uplink Port",

    user_id:                   "User ID",
    emp_id:                    "Employee ID",
    first_name:                "First Name",
    last_name:                 "Last Name",
    full_name:                 "Full Name",
    email:                     "Email",
    role:                      "Role",
    is_active:                 "Active",
    phone:                     "Phone",
    position:                  "Position",

    department_name:           "Department Name",
    dept_code:                 "Dept. Code",
    parent_department_id:      "Parent Department",

    peripheral_id:             "Peripheral ID",
    peripheral_name:           "Peripheral Name",
    peripheral_type:           "Peripheral Type",
    connected_computer_id:     "Connected Computer",

    category_id:               "Category ID",
    category_name:             "Category Name",
    is_enabled:                "Enabled",

    pr_id:                     "PR ID",
    pr_number:                 "PR Number",
    requested_by:              "Requested By",
    approved_by:               "Approved By",
    request_date:              "Request Date",
    approval_date:             "Approval Date",
    total_amount:              "Total Amount",
    pr_status:                 "PR Status",
    item_description:          "Item Description",
    quantity:                  "Quantity",
    unit_price:                "Unit Price",
  };

  function fieldLabel(key) {
    if (FIELD_LABELS[key]) return FIELD_LABELS[key];
    return key
      .replace(/_id$/, " ID")
      .replace(/_/g, " ")
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  const ACTION_GROUPS = {
    "system": [
      { label: "Session",             actions: ["Login", "Register", "Change Password", "Reset Password"] },
      { label: "Account Management",  actions: ["Update Status", "Update Role", "Update Username", "Update User Details"] },
      { label: "Permissions",         actions: ["Grant Permission", "Revoke Permission"] },
      { label: "File Maintenance",    actions: ["Add Department", "Update Department", "Add Peripheral", "Update Peripheral", "Add Program", "Update Program", "Add Vendor", "Update Vendor", "Add Category", "Update Category Status"] },
      { label: "End Users",           actions: ["Add End User", "Update End User", "Update End User Status"] },
      { label: "Purchase Requests",   actions: ["Add Purchase Request", "Update Purchase Request", "Update Purchase Request Item"] },
      { label: "Reports",             actions: ["Download Computer Report", "Download Software Report", "Download UPS Report", "Download Printer Report", "Download Network Device Report", "Download End User Report"] },
    ],
    "asset-create": [
      { label: null, actions: [...ASSET_CREATE_ACTIONS] },
    ],
    "asset-change": [
      { label: "Assignments", actions: [...ASSIGN_ACTIONS] },
      { label: "Updates",     actions: [...UPDATE_ACTIONS] },
    ],
  };

  const CATEGORY_META = {
    "system": {
      name: "System Events",
      desc: "Logins, accounts, permissions",
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
      </svg>`
    },
    "asset-create": {
      name: "Asset Additions",
      desc: "New computers, software, devices",
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
      </svg>`
    },
    "asset-change": {
      name: "Asset Changes",
      desc: "Updates, assigns, network edits",
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>`
    },
  };

  const TABLE_LABELS = {
    computers:         "Computer",
    computer:          "Computer",
    software:          "Software",
    ups:               "UPS",
    printers:          "Printer",
    printer:           "Printer",
    network_devices:   "Network Device",
    network_device:    "Network Device",
    end_users:         "End User",
    end_user:          "End User",
    users:             "User",
    user:              "User",
    departments:       "Department",
    department:        "Department",
    peripherals:       "Peripheral",
    peripheral:        "Peripheral",
    categories:        "Category",
    category:          "Category",
    purchase_requests: "Purchase Request",
    purchase_request:  "Purchase Request",
  };

  const ACTION_DETAIL = {
    "Login":                   { label: "Session started"          },
    "Register":                { label: "Account created"          },
    "Change Password":         { label: "Password changed"         },
    "Reset Password":          { label: "Password reset"           },
    "Update Status":           { label: "Status updated"           },
    "Update Role":             { label: "Role updated"             },
    "Update Username":         { label: "Username updated"         },
    "Update User Details":     { label: "Details updated"          },
    "Grant Permission":        { label: "Permission granted"       },
    "Revoke Permission":       { label: "Permission revoked"       },
    "Add Department":          { label: "Dept. created"            },
    "Update Department":       { label: "Dept. updated"            },
    "Add Peripheral":          { label: "Peripheral added"         },
    "Update Peripheral":       { label: "Peripheral updated"       },
    "Add Program":             { label: "Program added"            },
    "Update Program":          { label: "Program updated"          },
    "Add Vendor":              { label: "Vendor added"             },
    "Update Vendor":           { label: "Vendor updated"           },
    "Add Category":            { label: "Category added"           },
    "Update Category Status":  { label: "Category status set"      },
    "Add End User":            { label: "Record created"           },
    "Update End User":         { label: "Fields updated"           },
    "Update End User Status":  { label: "Status updated"           },
    "Add Purchase Request":    { label: "PR created"               },
    "Update Purchase Request": { label: "PR updated"               },
    "Update Purchase Request Item": { label: "PR item updated"     },
    "Add Computer":            { label: "Record created"           },
    "Add Software":            { label: "Record created"           },
    "Add UPS":                 { label: "Record created"           },
    "Add Printer":             { label: "Record created"           },
    "Add Network Device":      { label: "Record created"           },
    "Update Computer":         { label: "Fields updated"           },
    "Assign Computer":         { label: "Assigned to user"         },
    "Unassign Computer":       { label: "Unassigned from user"     },
    "Update Computer Network": { label: "Network config updated"   },
    "Update Software":         { label: "Fields updated"           },
    "Assign Software":         { label: "Assigned to user"         },
    "Unassign Software":       { label: "Unassigned from user"     },
    "Update UPS":              { label: "Fields updated"           },
    "Update Printer":          { label: "Fields updated"           },
    "Update Printer Network":  { label: "Network config updated"   },
    "Update Network Device":   { label: "Fields updated"           },
    "Download Computer Report":       { label: "Report downloaded" },
    "Download Software Report":       { label: "Report downloaded" },
    "Download UPS Report":            { label: "Report downloaded" },
    "Download Printer Report":        { label: "Report downloaded" },
    "Download Network Device Report": { label: "Report downloaded" },
    "Download End User Report":       { label: "Report downloaded" },
  };

  // ── Category open/closed state ─────────────────────────────────────────────
  const CATEGORY_STATE_KEY = "auditLogCategoryOpenState";

  function loadCategoryState() {
    try {
      const raw = localStorage.getItem(CATEGORY_STATE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }

  function saveCategoryState(state) {
    try { localStorage.setItem(CATEGORY_STATE_KEY, JSON.stringify(state)); }
    catch (e) { /* ignore */ }
  }

  // ── State ─────────────────────────────────────────────────────────────────
  let allLogs           = [];
  let filteredLogs      = [];
  let currentPage       = 1;
  let selectedActions   = new Set();
  let categoryOpenState = loadCategoryState();
  let linkFilter        = null;

  // ── Action-to-endpoint mapping ──────────────────────────────────────────────
  const AUDIT_ENDPOINTS = [
    "system", "computer", "software", "printer", "ups",
    "network-device", "purchase-request", "user", "end-user",
  ];

  const ACTION_TO_ENDPOINT = {};
  SYSTEM_ACTIONS.forEach(a => ACTION_TO_ENDPOINT[a] = "system");
  ["Add Computer","Update Computer","Assign Computer","Unassign Computer","Update Computer Network"].forEach(a => ACTION_TO_ENDPOINT[a] = "computer");
  ["Add Software","Update Software","Assign Software","Unassign Software"].forEach(a => ACTION_TO_ENDPOINT[a] = "software");
  ["Add Printer","Update Printer","Update Printer Network"].forEach(a => ACTION_TO_ENDPOINT[a] = "printer");
  ["Add UPS","Update UPS"].forEach(a => ACTION_TO_ENDPOINT[a] = "ups");
  ["Add Network Device","Update Network Device"].forEach(a => ACTION_TO_ENDPOINT[a] = "network-device");
  ["Add Purchase Request","Update Purchase Request","Update Purchase Request Item"].forEach(a => ACTION_TO_ENDPOINT[a] = "purchase-request");
  ["Add End User","Update End User","Update End User Status"].forEach(a => ACTION_TO_ENDPOINT[a] = "end-user");

  const ENDPOINT_TO_ACTIONS = {};
  Object.keys(ACTION_TO_ENDPOINT).forEach(a => {
    const ep = ACTION_TO_ENDPOINT[a];
    if (!ENDPOINT_TO_ACTIONS[ep]) ENDPOINT_TO_ACTIONS[ep] = [];
    ENDPOINT_TO_ACTIONS[ep].push(a);
  });

  // ── Elements ──────────────────────────────────────────────────────────────
  const logTableBody      = document.getElementById("logTableBody");
  const logCount          = document.getElementById("logCount");
  const activeFiltersStrip= document.getElementById("activeFiltersStrip");
  const filterUser        = document.getElementById("filterUser");
  const filterAssetType   = document.getElementById("filterAssetType");
  const filterActor       = document.getElementById("filterActor");
  const filterDatePreset  = document.getElementById("filterDatePreset");
  const filterFrom        = document.getElementById("filterFrom");
  const filterTo          = document.getElementById("filterTo");
  const filterCustomDates = document.getElementById("filterCustomDates");
  const actionList        = document.getElementById("actionList");
  const btnClearActions   = document.getElementById("btnClearActions");
  const btnClearFilters   = document.getElementById("btnClearFilters");
  const btnFilterToggle   = document.getElementById("btnFilterToggle");
  const tablePanel        = document.querySelector(".audit-detail-panel");
  const tableHeading      = document.getElementById("tableHeading");
  let filterPanelOpen     = false;

  // ── Render action list ─────────────────────────────────────────────────────
  function renderActionList(assetTypeFilter) {
    actionList.innerHTML = "";

    const categoryKeys = Object.keys(ACTION_GROUPS);
    const allowed      = assetTypeFilter ? new Set(ENDPOINT_TO_ACTIONS[assetTypeFilter] || []) : null;

    categoryKeys.forEach((catKey, ci) => {
      const meta   = CATEGORY_META[catKey];
      const groups = ACTION_GROUPS[catKey];

      const visibleGroups = groups.reduce((acc, group) => {
        const filtered = allowed ? group.actions.filter(a => allowed.has(a)) : group.actions.slice();
        if (filtered.length === 0) return acc;
        acc.push({ ...group, actions: filtered });
        return acc;
      }, []);

      if (visibleGroups.length === 0) return;

      let isOpen = categoryOpenState[catKey] === true;
      const section = document.createElement("div");
      section.className = `category-section${isOpen ? "" : " collapsed"}${catKey === "system" ? " category-full-width" : ""}`;

      const label = document.createElement("div");
      label.className = "category-label";
      label.tabIndex = 0;
      label.setAttribute("role", "button");
      label.setAttribute("aria-expanded", String(isOpen));
      label.innerHTML = `
        <span class="category-label-icon">${meta.icon}</span>
        <span class="category-label-text">
          <span class="category-label-name">${meta.name}</span>
          <span class="category-label-desc">${meta.desc}</span>
        </span>
        <span class="category-label-chevron">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </span>
      `;

      const toggleSection = () => {
        isOpen = !isOpen;
        categoryOpenState[catKey] = isOpen;
        saveCategoryState(categoryOpenState);
        section.classList.toggle("collapsed", !isOpen);
        label.setAttribute("aria-expanded", String(isOpen));
      };

      label.addEventListener("click", toggleSection);
      label.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleSection(); }
      });

      section.appendChild(label);

      const itemsWrap = document.createElement("div");
      itemsWrap.className = "action-items";
      if (visibleGroups.length > 1 || visibleGroups.some(g => g.label)) {
        itemsWrap.classList.add("has-subgroups");
      }

      visibleGroups.forEach((group, gi) => {
        if (group.label && visibleGroups.length > 1) {
          const sublabel = document.createElement("div");
          sublabel.className = "action-subgroup-label";
          sublabel.textContent = group.label;
          itemsWrap.appendChild(sublabel);
        }

        group.actions.forEach(action => {
          const lbl = document.createElement("label");
          lbl.className = "action-item";

          const cb = document.createElement("input");
          cb.type = "checkbox";
          cb.value = action;
          cb.checked = selectedActions.has(action);

          cb.addEventListener("change", () => {
            if (cb.checked) {
              selectedActions.add(action);
            } else {
              selectedActions.delete(action);
            }
            currentPage = 1;
            updateActiveFilterPills();
            loadLogs();
          });

          const checkmark = document.createElement("span");
          checkmark.className = "action-item-check";
          checkmark.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

          const text = document.createElement("span");
          text.className = "action-item-text";
          text.textContent = action;

          lbl.appendChild(cb);
          lbl.appendChild(checkmark);
          lbl.appendChild(text);
          itemsWrap.appendChild(lbl);
        });

        if (visibleGroups.length > 1 && gi < visibleGroups.length - 1) {
          const div = document.createElement("div");
          div.className = "action-subgroup-divider";
          itemsWrap.appendChild(div);
        }
      });

      section.appendChild(itemsWrap);
      actionList.appendChild(section);
    });
  }

  btnClearActions.addEventListener("click", () => {
    selectedActions = new Set();
    renderActionList(filterAssetType.value);
    updateActiveFilterPills();
    currentPage = 1;
    loadLogs();
  });

  // ── Active filter pills ────────────────────────────────────────────────────
  function updateActiveFilterPills() {
    activeFiltersStrip.innerHTML = "";
    selectedActions.forEach(action => {
      const pill = document.createElement("span");
      pill.className = "filter-pill";
      pill.textContent = action;
      activeFiltersStrip.appendChild(pill);
    });
    if (linkFilter) {
      const pill = document.createElement("span");
      pill.className = "filter-pill filter-pill-link";
      pill.textContent = `${linkFilter.label} #${linkFilter.id}`;
      activeFiltersStrip.appendChild(pill);
    }
    if (filterActor.value) {
      const pill = document.createElement("span");
      pill.className = "filter-pill";
      pill.textContent = `Actor: ${filterActor.value}`;
      activeFiltersStrip.appendChild(pill);
    }
  }

  // ── Date preset ────────────────────────────────────────────────────────────
  filterDatePreset.addEventListener("change", () => {
    filterCustomDates.classList.toggle("hidden", filterDatePreset.value !== "custom");
    if (filterDatePreset.value !== "custom") { currentPage = 1; loadLogs(); }
  });

  filterFrom.addEventListener("input", () => {
    if (filterDatePreset.value !== "custom") {
      filterDatePreset.value = "custom";
      filterCustomDates.classList.remove("hidden");
    }
    currentPage = 1; loadLogs();
  });
  filterTo.addEventListener("input", () => {
    if (filterDatePreset.value !== "custom") {
      filterDatePreset.value = "custom";
      filterCustomDates.classList.remove("hidden");
    }
    currentPage = 1; loadLogs();
  });
  filterUser.addEventListener("input", debounce(applySearch, 300));

  filterAssetType.addEventListener("change", () => {
    currentPage = 1;
    if (filterAssetType.value && selectedActions.size) {
      const allowed = new Set(ENDPOINT_TO_ACTIONS[filterAssetType.value] || []);
      selectedActions = new Set([...selectedActions].filter(a => allowed.has(a)));
    }
    renderActionList(filterAssetType.value);
    updateActiveFilterPills();
    loadLogs();
  });

  filterActor.addEventListener("change", () => { currentPage = 1; updateActiveFilterPills(); applySearch(); });

  function clearLinkFilter() {
    if (!linkFilter) return;
    linkFilter = null;
    if (tableHeading) tableHeading.textContent = "All Log Entries";
    const url = new URL(window.location);
    url.searchParams.delete("audit");
    window.history.replaceState({}, "", url);
  }

  btnClearFilters.addEventListener("click", () => {
    filterUser.value       = "";
    filterAssetType.value  = "";
    filterActor.value      = "";
    filterDatePreset.value = "";
    filterFrom.value       = "";
    filterTo.value         = "";
    filterCustomDates.classList.add("hidden");
    selectedActions = new Set();
    renderActionList(filterAssetType.value);
    clearLinkFilter();
    updateActiveFilterPills();
    currentPage = 1;
    loadLogs();
  });

  // ── Query params ───────────────────────────────────────────────────────────
  function buildQueryParams() {
    const params = new URLSearchParams();
    selectedActions.forEach(a => params.append("type", a));
    return params.toString();
  }

  function resolveDateRange(preset) {
    const now   = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const fmt = d => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };

    if (preset === "today") return {
      from: fmt(today),
      to:   fmt(today)
    };
    if (preset === "7d") return {
      from: fmt(new Date(today.getTime() - 6 * 86400000)),
      to:   fmt(today)
    };
    if (preset === "30d") return {
      from: fmt(new Date(today.getTime() - 29 * 86400000)),
      to:   fmt(today)
    };
    if (preset === "custom") {
      return {
        from: filterFrom.value || "",
        to:   filterTo.value   || ""
      };
    }
    return { from: "", to: "" };
  }

  // ── Fetch ──────────────────────────────────────────────────────────────────
  async function loadLogs() {
    logTableBody.innerHTML = `
      <tr class="state-row">
        <td colspan="7"><div class="spinner"></div>Loading audit logs…</td>
      </tr>`;

    try {
      let endpoints;
      if (selectedActions.size > 0) {
        const eps = new Set();
        selectedActions.forEach(a => {
          const ep = ACTION_TO_ENDPOINT[a];
          if (ep) eps.add(ep);
        });
        endpoints = eps.size > 0 ? [...eps] : ["system"];
      } else {
        endpoints = [...AUDIT_ENDPOINTS];
      }

      const taggedFetches = endpoints.map(cat =>
        (async () => {
          try {
            const url = `${API_BASE}/audit/${cat}`;
            const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
            if (!res.ok) return [];
            const data = await res.json();
            const arr = Array.isArray(data) ? data : Array.isArray(data.data) ? data.data : [];
            return arr.map(item => ({ ...item, _assetType: cat }));
          } catch (e) {
            console.warn(`[audit] Failed to fetch ${cat}:`, e);
            return [];
          }
        })()
      );

      const results = await Promise.all(taggedFetches);
      const merged = results.flat();

      merged.sort((a, b) => new Date(b.interaction_date) - new Date(a.interaction_date));
      allLogs = merged;

      populateActorFilter();

      await applySearch();
    } catch (err) {
      console.error("Failed to load audit logs:", err);
      logTableBody.innerHTML = `
        <tr class="state-row">
          <td colspan="7">Failed to load logs. Please try again.</td>
        </tr>`;
    }
  }

  // ── Actor filter ─────────────────────────────────────────────────────────────
  function populateActorFilter() {
    const current = filterActor.value;
    filterActor.innerHTML = '<option value="">All Actors</option>';
    const names = [...new Set(allLogs.map(l => l.user_name).filter(Boolean))];
    names.sort((a, b) => a.localeCompare(b));
    names.forEach(name => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      filterActor.appendChild(opt);
    });
    if (current) filterActor.value = current;
  }

  // ── Client-side search ──────────────────────────────────────────────────────
  async function applySearch() {
    const search = filterUser.value.trim().toLowerCase();

    const { from, to } = resolveDateRange(filterDatePreset.value);
    const fromDate = from ? new Date(from + "T00:00:00") : null;
    const toDate   = to   ? new Date(to   + "T23:59:59") : null;

    filteredLogs = allLogs.filter(log => {
      if (selectedActions.size > 0 && !selectedActions.has(log.interaction_type)) return false;

      if (filterAssetType.value && log._assetType !== filterAssetType.value) return false;

      if (filterActor.value && log.user_name !== filterActor.value) return false;

      if (search) {
        const match =
          (log.user_name          && log.user_name.toLowerCase().includes(search)) ||
          (log.entity_name        && log.entity_name.toLowerCase().includes(search)) ||
          (log.interaction_type   && log.interaction_type.toLowerCase().includes(search)) ||
          (log.field              && log.field.toLowerCase().includes(search)) ||
          (log.interaction_detail && log.interaction_detail.toLowerCase().includes(search));
        if (!match) return false;
      }

      if (fromDate || toDate) {
        const logDate = new Date(log.interaction_date);
        if (fromDate && logDate < fromDate) return false;
        if (toDate   && logDate > toDate)   return false;
      }

      return true;
    });

    currentPage = 1;
    renderTable();
  }

  // ── Render table (flat rows) ──────────────────────────────────────────────
  function renderTable() {
    const total    = filteredLogs.length;
    const start    = (currentPage - 1) * PAGE_SIZE;
    const end      = Math.min(start + PAGE_SIZE, total);
    const pageLogs = filteredLogs.slice(start, end);

    logCount.textContent = `${total.toLocaleString()} ${total === 1 ? "entry" : "entries"}`;

    if (pageLogs.length === 0) {
      logTableBody.innerHTML = `
        <tr class="state-row">
          <td colspan="7">No log entries match your filters.</td>
        </tr>`;
      renderPagination(total);
      return;
    }

    function fmtVal(v) {
      if (v == null || v === "") return "-";
      if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v)) return formatTimestamp(v);
      return escHtml(String(v));
    }

    logTableBody.innerHTML = pageLogs.map(log => {
      const ts = formatTimestamp(log.interaction_date);
      return `<tr>
        <td>${escHtml(log.entity_name || "-")}</td>
        <td class="td-timestamp">${ts}</td>
        <td>${escHtml(log.interaction_type || "—")}</td>
        <td>${escHtml(log.field || "-")}</td>
        <td>${fmtVal(log.old_value)}</td>
        <td>${fmtVal(log.new_value)}</td>
        <td>${escHtml(log.user_name || "—")}</td>
      </tr>`;
    }).join("");

    renderPagination(total);
  }

  // ── Record-history endpoint resolution ──────────────────────────────────────
  const TABLE_HISTORY_ENDPOINTS = {
    computer:        id => `${API_BASE}/audit/computer/${encodeURIComponent(id)}`,
    computers:       id => `${API_BASE}/audit/computer/${encodeURIComponent(id)}`,
    software:        id => `${API_BASE}/audit/software/${encodeURIComponent(id)}`,
    ups:             id => `${API_BASE}/audit/ups/${encodeURIComponent(id)}`,
    network_device:  id => `${API_BASE}/audit/network-devices/${encodeURIComponent(id)}`,
    network_devices: id => `${API_BASE}/audit/network-devices/${encodeURIComponent(id)}`,
    printer:        id => `${API_BASE}/audit/printer/${encodeURIComponent(id)}`,
    printers:       id => `${API_BASE}/audit/printer/${encodeURIComponent(id)}`,
    end_user:       id => `${API_BASE}/audit/user/${encodeURIComponent(id)}`,
  };

  function historyUrl(table, id) {
    const resolve = TABLE_HISTORY_ENDPOINTS[table];
    if (resolve) return resolve(id);
    console.warn(`No dedicated history endpoint configured for table "${table}"; using generic fallback.`);
    return `${API_BASE}/audit/history?table=${encodeURIComponent(table)}&id=${encodeURIComponent(id)}`;
  }

  // ── Pagination ─────────────────────────────────────────────────────────────
  function renderPagination(total) {
    const totalPages = Math.ceil(total / PAGE_SIZE);
    const start = (currentPage - 1) * PAGE_SIZE + 1;
    const end   = Math.min(currentPage * PAGE_SIZE, total);

    document.getElementById("paginationInfo").textContent =
      total === 0 ? "" : `Showing ${start}–${end} of ${total}`;

    const btns = document.getElementById("paginationBtns");
    btns.innerHTML = "";
    if (totalPages <= 1) return;

    getPaginationRange(currentPage, totalPages).forEach(p => {
      if (p === "…") {
        const el = document.createElement("span");
        el.style.cssText = "padding:0 4px;line-height:32px;color:#94a3b8;font-size:13px;";
        el.textContent = "…";
        btns.appendChild(el);
        return;
      }
      const btn = document.createElement("button");
      btn.className = `page-btn${p === currentPage ? " active" : ""}`;
      btn.textContent = p;
      btn.onclick = () => { currentPage = p; renderTable(); };
      btns.appendChild(btn);
    });
  }

  function getPaginationRange(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    if (current <= 4) return [1, 2, 3, 4, 5, "…", total];
    if (current >= total - 3) return [1, "…", total-4, total-3, total-2, total-1, total];
    return [1, "…", current-1, current, current+1, "…", total];
  }

  // ── Record History Modal ───────────────────────────────────────────────────
  async function openHistoryModal(table, id, label) {
    document.getElementById("historyModalTitle").textContent = `${label} #${id} — Full History`;
    document.getElementById("historyModalMeta").textContent =
      "Every recorded action for this record, most recent first.";

    const body = document.getElementById("historyModalBody");
    body.innerHTML = `<p style="color:#94a3b8;font-size:13px;text-align:center;padding:24px 0;">Loading history…</p>`;
    document.getElementById("historyModal").classList.remove("hidden");

    try {
      const res = await fetch(historyUrl(table, id), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const entries = Array.isArray(data.logs) ? data.logs
                    : Array.isArray(data)      ? data
                    : Array.isArray(data.data) ? data.data
                    : [];
      renderHistoryBody(body, entries);
    } catch (err) {
      console.error("Failed to load record history:", err);
      body.innerHTML = `<p style="color:#ef4444;font-size:13px;text-align:center;padding:24px 0;">Failed to load history.</p>`;
    }
  }

  function renderHistoryBody(body, entries) {
    if (!entries.length) {
      body.innerHTML = `<p style="color:#94a3b8;font-size:13px;text-align:center;padding:24px 0;">No history found for this record.</p>`;
      return;
    }

    const timeline = document.createElement("div");
    timeline.className = "history-timeline";

    entries.forEach(entry => {
      const item = document.createElement("div");
      item.className = "history-item";
      item.innerHTML = `
        <span class="history-dot"></span>
        <div class="history-content">
          <div class="history-content-top">
            <span class="history-action">${escHtml(entry.interaction_type || "—")}</span>
            <span class="history-date">${formatTimestamp(entry.interaction_date)}</span>
          </div>
          <div class="history-detail">${escHtml(entry.interaction_detail || "")}</div>
          <div class="history-user">${escHtml(entry.user_name || "—")}${entry.user_emp_id ? ` · Emp ID ${escHtml(String(entry.user_emp_id))}` : ""}</div>
        </div>
      `;
      timeline.appendChild(item);
    });

    body.innerHTML = "";
    body.appendChild(timeline);
  }

  function closeHistoryModal() {
    document.getElementById("historyModal").classList.add("hidden");
    document.getElementById("historyModalBody").innerHTML = "";
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  function getCategoryInfo(action) {
    if (SNAPSHOT_ACTIONS.has(action))     return { cls: "badge-mutation", label: "Asset Change" };
    if (ASSET_CREATE_ACTIONS.has(action)) return { cls: "badge-asset",    label: "Asset Create" };
    return { cls: "badge-system", label: "System" };
  }

  function debounce(fn, ms) {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
  }

  function formatTimestamp(ts) {
    if (!ts) return "—";
    const d = new Date(ts);
    const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    const month = months[d.getMonth()];
    const day = d.getDate();
    const year = d.getFullYear();
    let hours = d.getHours();
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    const mins = String(d.getMinutes()).padStart(2, "0");
    return `${month} ${day}, ${year} ${hours}:${mins}${ampm}`;
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // ── Filter panel toggle ──────────────────────────────────────────────────
  function toggleFilterPanel(force) {
    const panel = actionList.parentElement;
    const showing = force !== undefined ? force : panel.classList.contains("collapsed");
    panel.classList.toggle("collapsed", !showing);
    btnFilterToggle.classList.toggle("active", showing);
    filterPanelOpen = showing;
  }

  if (btnFilterToggle) {
    btnFilterToggle.addEventListener("click", () => toggleFilterPanel());

    toggleFilterPanel(false);
  }

  btnClearActions.addEventListener("click", () => { if (window.innerWidth <= 480) toggleFilterPanel(false); });

  // ── URL param auto-filtering ───────────────────────────────────────────────
  (function applyLinkFilterFromURL() {
    const params = new URLSearchParams(window.location.search);
    const audit = params.get("audit");
    if (!audit) return;
    const sep = audit.lastIndexOf(":");
    if (sep === -1) return;
    const tbl = audit.slice(0, sep);
    const id  = audit.slice(sep + 1);
    if (!tbl || !id) return;
    const label = TABLE_LABELS[tbl] || tbl;
    linkFilter = { table: tbl, id, label };
    if (tableHeading) tableHeading.textContent = `${label} #${id} — Audit History`;
    updateActiveFilterPills();
  })();

  // ── Event listeners ────────────────────────────────────────────────────────
  document.getElementById("btnCloseHistoryModal").addEventListener("click", closeHistoryModal);
  document.getElementById("historyModal").addEventListener("click", e => {
    if (e.target === document.getElementById("historyModal")) closeHistoryModal();
  });

  logTableBody.addEventListener("click", e => {
    const badge = e.target.closest(".interaction-record-badge");
    if (badge && badge.dataset.table && badge.dataset.id) {
      openHistoryModal(badge.dataset.table, badge.dataset.id, badge.dataset.label || badge.dataset.table);
    }
  });

  // ── Init ───────────────────────────────────────────────────────────────────
  lucide.createIcons();
  renderActionList(filterAssetType.value);
  loadLogs();
});

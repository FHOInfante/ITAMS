document.addEventListener("DOMContentLoaded", async () => {
  lucide.createIcons();

  const API_BASE = "/api";
  const token    = localStorage.getItem("token");

  function showAlertModal(message) {
    const overlay = document.getElementById("alertModal");
    const msgEl = document.getElementById("alertModalMessage");
    const btn = document.getElementById("alertModalOk");
    if (!overlay) return alert(message);
    msgEl.textContent = message;
    overlay.classList.remove("hidden");
    btn.onclick = () => overlay.classList.add("hidden");
  }

  function showEditNameModal(labelText, currentValue) {
    return new Promise((resolve) => {
      const overlay  = document.getElementById("editNameModal");
      const title    = document.getElementById("editNameModalTitle");
      const label    = document.getElementById("editNameModalLabel");
      const input    = document.getElementById("editNameInput");
      const saveBtn  = document.getElementById("editNameSaveBtn");
      const cancelBtn = document.getElementById("editNameCancelBtn");
      const closeBtn  = document.getElementById("editNameCloseBtn");
      if (!overlay || !input) { resolve(window.prompt(labelText, currentValue)); return; }

      const origValue = currentValue || "";
      title.textContent = labelText;
      label.textContent = labelText;
      input.value       = origValue;
      saveBtn.disabled  = true;
      overlay.classList.remove("hidden");
      setTimeout(() => input.focus(), 50);

      function onInput() {
        saveBtn.disabled = input.value.trim() === origValue.trim();
      }
      input.addEventListener("input", onInput);

      function cleanup() {
        overlay.classList.add("hidden");
        input.removeEventListener("input", onInput);
        saveBtn.removeEventListener("click", onSave);
        cancelBtn.removeEventListener("click", onCancel);
        closeBtn.removeEventListener("click", onCancel);
        overlay.removeEventListener("click", onOverlay);
      }

      function onSave()    { const v = input.value; cleanup(); resolve(v); }
      function onCancel()  { cleanup(); resolve(null); }
      function onOverlay(e) { if (e.target === overlay) onCancel(); }

      saveBtn.addEventListener("click", onSave);
      cancelBtn.addEventListener("click", onCancel);
      closeBtn.addEventListener("click", onCancel);
      overlay.addEventListener("click", onOverlay);

      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); onSave(); }
        if (e.key === "Escape") { e.preventDefault(); onCancel(); }
      });
    });
  }

  function showEditProgramModal(currentValue) {
    return new Promise((resolve) => {
      const overlay  = document.getElementById("editProgramModal");
      const input    = document.getElementById("editProgramInput");
      const saveBtn  = document.getElementById("editProgramSaveBtn");
      const cancelBtn = document.getElementById("editProgramCancelBtn");
      const closeBtn  = document.getElementById("editProgramCloseBtn");
      if (!overlay || !input) { resolve(window.prompt("Update program name:", currentValue)); return; }

      const origValue = currentValue || "";
      input.value     = origValue;
      saveBtn.disabled = true;
      overlay.classList.remove("hidden");
      setTimeout(() => input.focus(), 50);

      function onInput() {
        saveBtn.disabled = input.value.trim() === origValue.trim();
      }
      input.addEventListener("input", onInput);

      function cleanup() {
        overlay.classList.add("hidden");
        input.removeEventListener("input", onInput);
        saveBtn.removeEventListener("click", onSave);
        cancelBtn.removeEventListener("click", onCancel);
        closeBtn.removeEventListener("click", onCancel);
        overlay.removeEventListener("click", onOverlay);
      }

      function onSave()    { const v = input.value; cleanup(); resolve(v); }
      function onCancel()  { cleanup(); resolve(null); }
      function onOverlay(e) { if (e.target === overlay) onCancel(); }

      saveBtn.addEventListener("click", onSave);
      cancelBtn.addEventListener("click", onCancel);
      closeBtn.addEventListener("click", onCancel);
      overlay.addEventListener("click", onOverlay);

      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); onSave(); }
        if (e.key === "Escape") { e.preventDefault(); onCancel(); }
      });
    });
  }

  // ─────────────────────────────────────────────
  // Tab switching
  // ─────────────────────────────────────────────
  const tabs   = document.querySelectorAll(".fm-tab");
  const panels = document.querySelectorAll(".fm-panel");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t)   => t.classList.remove("active"));
      panels.forEach((p) => p.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(`panel-${tab.dataset.tab}`)?.classList.add("active");
    });
  });

  // ─────────────────────────────────────────────
  // Confirmation modal
  // ─────────────────────────────────────────────
  const confirmModal      = document.getElementById("confirmAddModal");
  const confirmModalTitle = document.getElementById("confirmAddTitle");
  const confirmModalBody  = document.getElementById("confirmAddBody");
  const confirmModalBtn   = document.getElementById("confirmAddSubmit");
  const confirmCancelBtn  = document.getElementById("confirmAddCancel");
  const confirmCloseBtn   = document.getElementById("confirmAddClose");

  let pendingConfirmAction = null;
  let pendingConfirmLabel  = "Confirm Add";
  let pendingWorkingLabel  = "Adding…";

  function openConfirmModal(title, bodyHtml, onConfirm, confirmLabel, workingLabel) {
    confirmModalTitle.textContent = title;
    confirmModalBody.innerHTML    = bodyHtml;
    pendingConfirmAction          = onConfirm;
    pendingConfirmLabel           = confirmLabel || "Confirm Add";
    pendingWorkingLabel           = workingLabel || "Adding…";
    confirmModalBtn.textContent   = pendingConfirmLabel;
    confirmModal.classList.remove("hidden");
  }

  function closeConfirmModal() {
    confirmModal.classList.add("hidden");
    pendingConfirmAction = null;
  }

  confirmModalBtn.addEventListener("click", async () => {
    if (pendingConfirmAction) {
      confirmModalBtn.disabled    = true;
      confirmModalBtn.textContent = pendingWorkingLabel;
      try { await pendingConfirmAction(); } finally {
        confirmModalBtn.disabled    = false;
        confirmModalBtn.textContent = pendingConfirmLabel;
        closeConfirmModal();
      }
    }
  });

  confirmCancelBtn.addEventListener("click", closeConfirmModal);
  confirmCloseBtn.addEventListener("click",  closeConfirmModal);
  confirmModal.addEventListener("click", (e) => {
    if (e.target === confirmModal) closeConfirmModal();
  });

  // ─────────────────────────────────────────────
  // Category definitions
  // ─────────────────────────────────────────────
  const groupedCategories = [
    { key: "computer_brand",            gridId: "categoryGrid-computer",  title: "Brands",             apiGroup: "computer.brand",             placeholder: "Add brand",                     actionType: "toggle" },
    { key: "computer_device_type",      gridId: "categoryGrid-computer",  title: "Device Types",       apiGroup: "computer.device_type",       placeholder: "Add device type",               actionType: "toggle" },
    { key: "computer_operating_system", gridId: "categoryGrid-computer",  title: "Operating Systems",  apiGroup: "computer.operating_system",  placeholder: "Add operating system",          actionType: "toggle" },
    { key: "computer_ram_size",         gridId: "categoryGrid-computer",  title: "RAM Sizes",          apiGroup: "computer.ram_size",          placeholder: "Add RAM size (e.g. 8GB)",       actionType: "toggle" },
    { key: "computer_storage_type",     gridId: "categoryGrid-computer",  title: "Storage Types",      apiGroup: "computer.storage_type",      placeholder: "Add storage type (e.g. SSD)",   actionType: "toggle" },
    { key: "computer_storage_capacity", gridId: "categoryGrid-computer",  title: "Storage Capacities", apiGroup: "computer.storage_capacity",  placeholder: "Add capacity (e.g. 512GB)",     actionType: "toggle" },
    { key: "printer_brand",             gridId: "categoryGrid-printer",   title: "Brands",             apiGroup: "printer.brand",              placeholder: "Add brand",                     actionType: "toggle" },
    { key: "printer_type",              gridId: "categoryGrid-printer",   title: "Printer Types",      apiGroup: "printer.printer_type",       placeholder: "Add printer type",              actionType: "toggle" },
    { key: "network_brand",             gridId: "categoryGrid-network",   title: "Brands",             apiGroup: "network_device.brand",       placeholder: "Add brand",                     actionType: "toggle" },
    { key: "network_device_type",       gridId: "categoryGrid-network",   title: "Device Types",       apiGroup: "network_device.device_type", placeholder: "Add device type",               actionType: "toggle" },
    { key: "ups_brand",                 gridId: "categoryGrid-ups",       title: "Brands",             apiGroup: "ups.brand",                  placeholder: "Add brand",                     actionType: "toggle" },
    { key: "software_license_type",     gridId: "categoryGrid-software",  title: "License Types",      apiGroup: "software.license_type",      placeholder: "Add license type",              actionType: "toggle" },
  ];

  // "Others" categories — departments, peripherals, vendors, and now programs.
  // Programs live in the Computer tab (gridId: "categoryGrid-computer") and use
  // the dedicated /program endpoint instead of the shared /category endpoint.
  const othersCategories = [
    {
      key: "programs",          gridId: "categoryGrid-computer", title: "Programs",           placeholder: "Add program",
      emptyLabel: "No programs yet.",           apiType: "program",    actionType: "edit",
      apiEndpoint: "program",     idField: "program_id",     valueField: "program_name",     bodyField: "programName",      postBodyField: "programName",
    },
    {
      key: "departments",       gridId: "categoryGrid-others", title: "Departments",       placeholder: "Add department",
      emptyLabel: "No departments yet.",        apiType: "department", actionType: "edit",
      apiEndpoint: "department",  idField: "department_id",  valueField: "department_name",  bodyField: "department_name",  postBodyField: "departmentName",
    },
    {
      key: "periphiraldevices", gridId: "categoryGrid-others", title: "Peripheral Devices", placeholder: "Add peripheral device",
      emptyLabel: "No peripheral devices yet.", apiType: "peripheral", actionType: "edit",
      apiEndpoint: "peripheral",  idField: "peripheral_id",  valueField: "peripheral_name",  bodyField: "peripheral_name",  postBodyField: "peripheralName",
    },
    {
      key: "vendors",           gridId: "categoryGrid-others", title: "Vendors",            placeholder: "Add vendor",
      emptyLabel: "No vendors yet.",            apiType: "vendor",     actionType: "edit",
      apiEndpoint: "vendor",      idField: "vendor_id",      valueField: "vendor_name",      bodyField: "vendor_name",      postBodyField: "vendorName",
    },
  ];

  const categoryCardTemplate = document.getElementById("categoryCardTemplate");

  const categoryData = {};

  // ─────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────
  function getAuthHeaders(includeJson = false) {
    const h = { Authorization: `Bearer ${token}` };
    if (includeJson) h["Content-Type"] = "application/json";
    return h;
  }

  function toActive(item) {
    if (item.is_active === true  || item.is_active === 1)  return true;
    if (item.isActive  === true  || item.isActive  === 1)  return true;
    return item.is_active === undefined && item.isActive === undefined;
  }

  function normalizeOthersItem(item, meta) {
    return {
      id:       item[meta.idField]    ?? item.id   ?? "",
      value:    item[meta.valueField] ?? item.name ?? "",
      isActive: toActive(item),
    };
  }

  function getCategoryMeta(categoryKey) {
    const grouped = groupedCategories.find(c => c.key === categoryKey);
    if (grouped) return { type: "grouped", meta: grouped };

    const others = othersCategories.find(c => c.key === categoryKey);
    if (others)  return { type: "others",  meta: others  };

    return null;
  }

  // ─────────────────────────────────────────────
  // Unified render
  // ─────────────────────────────────────────────
  function renderSection(categoryKey, title, emptyLabel) {
    const listEl  = document.getElementById(`${categoryKey}List`);
    const countEl = document.getElementById(`${categoryKey}Count`);
    const items   = categoryData[categoryKey] || [];

    if (!listEl) return;

    const resolved = getCategoryMeta(categoryKey);
    const meta     = resolved?.meta;

    countEl && (countEl.textContent = `${items.length} record${items.length !== 1 ? "s" : ""}`);

    listEl.innerHTML = "";

    if (!items.length) {
      const empty = document.createElement("div");
      empty.className   = "category-empty";
      empty.textContent = emptyLabel || `No ${title.toLowerCase()} loaded yet.`;
      listEl.appendChild(empty);
      return;
    }

    items.forEach((item) => {
      const row = document.createElement("div");
      row.className = `category-item ${item.isActive ? "is-active" : "is-inactive"}`;

      const content  = document.createElement("div");
      const name     = document.createElement("strong");
      name.textContent = item.value;
      content.appendChild(name);

      const actions = document.createElement("div");
      actions.className = "category-actions";

      if (meta?.actionType === "toggle") {
        const toggleBtn = document.createElement("button");
        toggleBtn.type            = "button";
        toggleBtn.textContent     = item.isActive ? "Disable" : "Enable";
        toggleBtn.className       = item.isActive ? "toggle-btn-disable" : "toggle-btn-enable";
        toggleBtn.dataset.action  = "toggle-category";
        toggleBtn.dataset.id      = item.id;
        toggleBtn.dataset.categoryKey = categoryKey;
        toggleBtn.dataset.isActive    = String(item.isActive);
        actions.appendChild(toggleBtn);
      }

      if (meta?.actionType === "edit") {
        const editBtn = document.createElement("button");
        editBtn.type           = "button";
        editBtn.className      = "edit-icon-btn";
        editBtn.title          = `Edit ${meta.apiType} name`;
        editBtn.dataset.id     = item.id;
        editBtn.dataset.action = `edit-${meta.apiType}`;
        editBtn.innerHTML      = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg>';
        actions.appendChild(editBtn);
      }

      row.appendChild(content);
      row.appendChild(actions);
      listEl.appendChild(row);
    });

    lucide.createIcons();
  }

  // ─────────────────────────────────────────────
  // Build cards into grids
  // ─────────────────────────────────────────────
  function buildCard(category) {
    const targetGrid = document.getElementById(category.gridId);
    if (!targetGrid) return;

    const fragment = categoryCardTemplate.content.cloneNode(true);
    const card     = fragment.querySelector(".category-card");
    const titleEl  = fragment.querySelector("h3");
    const countEl  = fragment.querySelector(".category-count");
    const inputEl  = fragment.querySelector("input");
    const addBtn   = fragment.querySelector(".category-add-btn");
    const listEl   = fragment.querySelector(".category-list");

    card.dataset.categoryKey   = category.key;
    titleEl.textContent        = category.title;
    countEl.id                 = `${category.key}Count`;
    listEl.id                  = `${category.key}List`;
    inputEl.id                 = `${category.key}Input`;
    inputEl.placeholder        = category.placeholder;
    addBtn.dataset.categoryKey = category.key;

    targetGrid.appendChild(fragment);
  }

  function initializeAllCards() {
    ["categoryGrid-computer","categoryGrid-printer","categoryGrid-network",
     "categoryGrid-ups","categoryGrid-software","categoryGrid-others"]
      .forEach((id) => { const el = document.getElementById(id); if (el) el.innerHTML = ""; });

    groupedCategories.forEach(buildCard);
    othersCategories.forEach(buildCard);
    lucide.createIcons();
  }

  // ─────────────────────────────────────────────
  // API: Grouped categories
  // ─────────────────────────────────────────────
  async function loadAllGroupedCategories() {
    await Promise.all(groupedCategories.map(async (c) => {
      try {
        const res  = await fetch(`${API_BASE}/category?group=${c.apiGroup}`, { headers: getAuthHeaders() });
        let data   = null;
        try { data = await res.json(); } catch { data = null; }

        if (!res.ok) { categoryData[c.key] = []; renderSection(c.key, c.title); return; }

        const raw      = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
        const filtered = raw.filter((item) => {
          const g = item.category_group ?? item.group ?? item.apiGroup ?? null;
          return g === null || g === c.apiGroup;
        });

        categoryData[c.key] = filtered.map((item) => ({
          id:       item.category_id ?? item.id,
          value:    item.category_value ?? item.value,
          isActive: toActive(item),
        }));
      } catch (err) {
        console.error(`Error loading ${c.apiGroup}:`, err);
        categoryData[c.key] = [];
      }
      renderSection(c.key, c.title);
    }));
  }

  async function addGroupedCategoryItem(category, value) {
    const res  = await fetch(`${API_BASE}/category`, {
      method: "POST", headers: getAuthHeaders(true),
      body:   JSON.stringify({ categoryGroup: category.apiGroup, categoryValue: value }),
    });
    let data = null;
    try { data = await res.json(); } catch { data = null; }

    if (res.status === 201 || res.ok) { await loadAllGroupedCategories(); return; }
    showAlertModal(data?.message || "Something went wrong.");
  }

  async function toggleGroupedCategoryItem(categoryKey, itemId, currentIsActive) {
    const targetStatus = !currentIsActive;
    const c = groupedCategories.find((c) => c.key === categoryKey);

    const local = categoryData[categoryKey]?.find((i) => String(i.id) === String(itemId));
    if (local) { local.isActive = targetStatus; renderSection(categoryKey, c?.title); }

    try {
      const res  = await fetch(`${API_BASE}/category/${itemId}`, {
        method: "PATCH", headers: getAuthHeaders(true),
        body:   JSON.stringify({ isActive: targetStatus, is_active: targetStatus }),
      });
      let data = null;
      try { data = await res.json(); } catch { data = null; }

      if (res.ok) { await loadAllGroupedCategories(); return; }
      showAlertModal(data?.message || "Something went wrong.");
    } catch (err) {
      console.error("Toggle error:", err);
      showAlertModal("Cannot connect to server.");
    }
    await loadAllGroupedCategories();
  }

  // ─────────────────────────────────────────────
  // API: Others categories
  // Handles departments, peripherals, vendors, AND programs.
  // Programs use GET /program → array of { program_id, program_name }
  // POST /program → { programName }
  // PUT  /program/:id → { programName }
  // The meta config above already sets the right field names, so the
  // generic load/add/update functions work for programs without changes.
  // ─────────────────────────────────────────────
  async function loadOthersCategory(meta) {
    try {
      const res  = await fetch(`${API_BASE}/${meta.apiEndpoint}`, { headers: getAuthHeaders() });
      let data   = null;
      try { data = await res.json(); } catch { data = null; }

      if (!res.ok) {
        categoryData[meta.key] = [];
        renderSection(meta.key, meta.title, meta.emptyLabel);
        return;
      }

      // Normalize the response — each endpoint may wrap its array differently.
      // /program returns { programs: [...] } or a bare array.
      // /department, /peripheral, /vendor return { departments: [...] } etc. or bare arrays.
      const pluralKey = meta.apiEndpoint + "s"; // "programs", "departments", …
      const raw =
        Array.isArray(data)                 ? data :
        Array.isArray(data?.[pluralKey])    ? data[pluralKey] :
        Array.isArray(data?.data)           ? data.data : [];

      categoryData[meta.key] = raw
        .map((i) => normalizeOthersItem(i, meta))
        .filter((i) => i.value);

    } catch (err) {
      console.error(`Error loading ${meta.apiEndpoint}:`, err);
      categoryData[meta.key] = [];
    }
    renderSection(meta.key, meta.title, meta.emptyLabel);
  }

  async function addOthersCategory(meta, name) {
    const res  = await fetch(`${API_BASE}/${meta.apiEndpoint}`, {
      method: "POST", headers: getAuthHeaders(true),
      body:   JSON.stringify({ [meta.postBodyField]: name }),
    });
    let data = null;
    try { data = await res.json(); } catch { data = null; }

    if (res.status === 201) { await loadOthersCategory(meta); return; }

    if (res.status === 409) { showAlertModal(data?.message || "A program with that name already exists."); return; }
    showAlertModal(data?.message || "Something went wrong.");
  }

  async function updateOthersCategory(meta, id, name) {
    try {
      const res  = await fetch(`${API_BASE}/${meta.apiEndpoint}/${id}`, {
        method: "PUT", headers: getAuthHeaders(true),
        body:   JSON.stringify({ [meta.bodyField]: name }),
      });
      let data = null;
      try { data = await res.json(); } catch { data = null; }

      if (res.status === 200) { await loadOthersCategory(meta); return; }
      if (res.status === 400) { showAlertModal(data?.message || "Missing or invalid input.");  return; }
      if (res.status === 401) { showAlertModal(data?.message || "Unauthorized.");              return; }
      if (res.status === 403) { showAlertModal(data?.message || "Forbidden.");                 return; }
      if (res.status === 404) { showAlertModal(data?.message || `${meta.title} not found.`);  return; }
      if (res.status === 409) { showAlertModal(data?.message || "Name already exists.");       return; }
      showAlertModal(data?.message || "Something went wrong.");
    } catch (err) {
      console.error(`Error updating ${meta.apiEndpoint}:`, err);
      showAlertModal("Cannot connect to server.");
    }
  }

  async function loadAllOthersCategories() {
    await Promise.all(othersCategories.map((meta) => loadOthersCategory(meta)));
  }

  // ─────────────────────────────────────────────
  // Global click delegation
  // ─────────────────────────────────────────────
  document.addEventListener("click", async (event) => {

    // ── Add button → open confirm modal ──
    const addBtn = event.target.closest(".category-add-btn");
    if (addBtn) {
      const card        = addBtn.closest(".category-card");
      const categoryKey = card?.dataset.categoryKey;
      const inputEl     = card?.querySelector("input");
      const value       = inputEl?.value.trim();

      if (!value) { showAlertModal("Please enter a value."); return; }

      const resolved = getCategoryMeta(categoryKey);
      if (!resolved) return;

      const { type, meta } = resolved;
      const sectionLabel   = meta.title ?? categoryKey;

      openConfirmModal(
        `Add to ${sectionLabel}`,
        `<p>You are about to add the following entry:</p>
         <div class="confirm-value-block">
           <span class="confirm-label">Section</span>
           <strong>${escHtml(sectionLabel)}</strong>
           <span class="confirm-label">Value</span>
           <strong>${escHtml(value)}</strong>
         </div>
         <p class="confirm-note">This will be saved immediately. Please verify before confirming.</p>`,
        async () => {
          if (type === "grouped") {
            await addGroupedCategoryItem(meta, value);
          } else {
            await addOthersCategory(meta, value);
          }
          inputEl.value = "";
        }
      );
      return;
    }

    // ── Toggle grouped category (Enable / Disable) ──
    const toggleBtn = event.target.closest('[data-action="toggle-category"]');
    if (toggleBtn) {
      const categoryKey  = toggleBtn.dataset.categoryKey;
      const itemId       = toggleBtn.dataset.id;
      const currentState = toggleBtn.dataset.isActive === "true";
      const category     = groupedCategories.find((c) => c.key === categoryKey);
      if (!category) return;
      const item = categoryData[categoryKey]?.find((i) => String(i.id) === String(itemId));
      const itemLabel = item?.value || itemId;
      const actionLabel = currentState ? "disable" : "enable";
      openConfirmModal(
        `${actionLabel === "disable" ? "Disable" : "Enable"} ${escHtml(category.title)}`,
        `<p>You are about to <strong>${actionLabel}</strong>:</p>
         <div class="confirm-value-block">
           <span class="confirm-label">Item</span>
           <strong>${escHtml(itemLabel)}</strong>
           <span class="confirm-label">Section</span>
           <strong>${escHtml(category.title)}</strong>
         </div>
         <p class="confirm-note">This change takes effect immediately.</p>`,
        () => toggleGroupedCategoryItem(categoryKey, itemId, currentState),
        "Confirm",
        `${actionLabel === "disable" ? "Disabling" : "Enabling"}…`
      );
      return;
    }

    // ── Edit any "others" category (department, peripheral, vendor, program) ──
    const editOthersBtn = event.target.closest('[data-action^="edit-"]');
    if (editOthersBtn) {
      const apiType = editOthersBtn.dataset.action.replace("edit-", "");
      const meta    = othersCategories.find((c) => c.apiType === apiType);
      if (!meta) return;

      const item = categoryData[meta.key]?.find((i) => String(i.id) === editOthersBtn.dataset.id);
      if (!item) return;

      // Derive a singular label for the prompt — strip trailing "s" from the
      // title when it's a clean plural (e.g. "Programs" → "Program").
      const singularTitle = meta.title.endsWith("s")
        ? meta.title.slice(0, -1)
        : meta.title;

      const next = meta.apiType === "program"
        ? await showEditProgramModal(item.value)
        : await showEditNameModal(`Update ${singularTitle} name:`, item.value);
      if (next === null) return;
      const trimmed = next.trim();
      if (!trimmed) { showAlertModal("Name cannot be empty."); return; }
      if (trimmed === item.value.trim()) return;
      openConfirmModal(
        `Update ${singularTitle}`,
        `<p>You are about to rename this ${singularTitle.toLowerCase()}:</p>
         <div class="confirm-value-block">
           <span class="confirm-label">Current</span>
           <strong>${escHtml(item.value)}</strong>
           <span class="confirm-label">New</span>
           <strong>${escHtml(trimmed)}</strong>
         </div>
         <p class="confirm-note">This change takes effect immediately.</p>`,
        () => updateOthersCategory(meta, item.id, trimmed),
        "Confirm",
        "Saving…"
      );
      return;
    }
  });

  // ── Enter key triggers Add in focused card ──
  document.addEventListener("keydown", async (event) => {
    if (event.key !== "Enter") return;
    const inputEl = event.target.closest(".category-card input");
    if (!inputEl) return;
    event.preventDefault();
    inputEl.closest(".category-card")?.querySelector(".category-add-btn")?.click();
  });

  // ─────────────────────────────────────────────
  // Escape helper
  // ─────────────────────────────────────────────
  function escHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  // ─────────────────────────────────────────────
  // Init
  // ─────────────────────────────────────────────
  initializeAllCards();
  await loadAllGroupedCategories();
  await loadAllOthersCategories();
});
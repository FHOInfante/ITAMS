/* ============================================================
   upsItem.js
   Logic for the UPS Detail / Edit page (upsItem.html)
   ============================================================ */

(() => {

    // ── DOM Helpers ──────────────────────────────────────────
    const qs  = (sel, ctx = document) => ctx.querySelector(sel);
    const qsa = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

    function getParam(name) {
        return new URLSearchParams(window.location.search).get(name);
    }

    // ── Toast ────────────────────────────────────────────────
    function showToast(msg, type = "success") {
        const t = qs("#toast");
        t.textContent = msg;
        t.className = `show ${type}`;
        clearTimeout(t._timer);
        t._timer = setTimeout(() => { t.className = ""; }, 3000);
    }

    // ── Utilities ────────────────────────────────────────────
    function statusClass(status) {
        if (!status) return "";
        const s = status.toLowerCase();
        if (s.includes("active"))    return "available";   // green
        if (s.includes("spare"))     return "assigned";    // blue
        if (s.includes("repair"))    return "repair";      // amber
        if (s.includes("defective")) return "retired";     // red
        return "retired";
    }

    function fmtDate(val) {
        if (!val) return "—";
        const d = new Date(val);
        if (isNaN(d)) return String(val);
        return d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
    }

    // Returns YYYY-MM-DD using LOCAL date parts so UTC ISO strings like
    // "2022-03-01T16:00:00.000Z" correctly read as 2022-03-02 in UTC+8
    function toLocalDateInput(val) {
        if (!val) return "";
        const d = new Date(val);
        if (isNaN(d)) return "";
        const yyyy = d.getFullYear();
        const mm   = String(d.getMonth() + 1).padStart(2, "0");
        const dd   = String(d.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
    }

    function escHtml(v) {
        if (v == null) return "";
        return String(v)
            .replace(/&/g, "&amp;")
            .replace(/"/g, "&quot;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    function val(v)  { return v || "—"; }
    function iVal(v) { return v != null ? v : ""; }

    // ── Confirm Modal (replaces window.confirm) ──────────────
    let confirmModalReady = false;
    function ensureConfirmModal() {
        if (confirmModalReady) return;
        confirmModalReady = true;
        const overlay = document.createElement("div");
        overlay.className = "confirm-modal-overlay";
        overlay.id = "confirmModalOverlay";
        overlay.innerHTML = `
            <div class="confirm-modal">
                <div class="confirm-modal-icon" id="confirmModalIcon"><i data-lucide="help-circle"></i></div>
                <p class="confirm-modal-title" id="confirmModalTitle">Are you sure?</p>
                <p class="confirm-modal-message" id="confirmModalMessage"></p>
                <div class="confirm-modal-actions">
                    <button type="button" class="confirm-modal-cancel" id="confirmModalCancel">Cancel</button>
                    <button type="button" class="confirm-modal-confirm" id="confirmModalConfirm">Confirm</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);
    }

    // Returns a Promise<boolean> — resolves true if confirmed, false if cancelled/dismissed.
    function showConfirmDialog({ title = "Are you sure?", message = "", confirmLabel = "Confirm", cancelLabel = "Cancel", danger = false } = {}) {
        ensureConfirmModal();
        const overlay    = qs("#confirmModalOverlay");
        const icon       = qs("#confirmModalIcon");
        const titleEl    = qs("#confirmModalTitle");
        const messageEl  = qs("#confirmModalMessage");
        const cancelBtn  = qs("#confirmModalCancel");
        const confirmBtn = qs("#confirmModalConfirm");

        titleEl.textContent   = title;
        messageEl.textContent = message;
        cancelBtn.textContent  = cancelLabel;
        confirmBtn.textContent = confirmLabel;
        icon.className          = `confirm-modal-icon${danger ? " danger" : ""}`;
        icon.innerHTML           = `<i data-lucide="${danger ? "alert-triangle" : "help-circle"}"></i>`;
        confirmBtn.className     = `confirm-modal-confirm${danger ? " danger" : ""}`;

        overlay.classList.add("open");
        if (typeof lucide !== "undefined") lucide.createIcons();

        return new Promise(resolve => {
            const cleanup = (result) => {
                overlay.classList.remove("open");
                cancelBtn.removeEventListener("click", onCancel);
                confirmBtn.removeEventListener("click", onConfirm);
                overlay.removeEventListener("click", onOverlayClick);
                document.removeEventListener("keydown", onKeydown);
                resolve(result);
            };
            const onCancel  = () => cleanup(false);
            const onConfirm = () => cleanup(true);
            const onOverlayClick = (e) => { if (e.target === overlay) cleanup(false); };
            const onKeydown = (e) => { if (e.key === "Escape") cleanup(false); };

            cancelBtn.addEventListener("click", onCancel);
            confirmBtn.addEventListener("click", onConfirm);
            overlay.addEventListener("click", onOverlayClick);
            document.addEventListener("keydown", onKeydown);
        });
    }

    // ── Permission Helpers ───────────────────────────────────
    // Permission 27 → Edit Asset - UPS (required for ALL edit buttons)
    // Permission 22 → Assign Asset - Computer (required alongside 27 for assignment section)
    function getUserPermissions() {
        try {
            const raw = localStorage.getItem("permissions");
            return raw ? JSON.parse(raw) : [];
        } catch { return []; }
    }

    function canEditGeneral() {
        const has = getUserPermissions().includes(27);
        console.log("[Permission 27 — Edit Asset: UPS]", has ? "GRANTED" : "DENIED", "| Permissions:", getUserPermissions());
        return has;
    }
    function canEditAssignment() {
        const perms = getUserPermissions();
        const has = perms.includes(22);
        console.log("[Permission 22 — Assign Asset: Computer (UPS)]", has ? "GRANTED" : "DENIED", "| Permissions:", perms);
        return has;
    }

    // ── State ────────────────────────────────────────────────
    let assetData  = null;
    let categories = {};   // keyed by category_group, e.g. categories["ups.brand"]
    let computers  = [];   // populated once by loadComputers()
    let vendors    = [];   // [{ vendor_id, vendor_name }] — from /api/vendor
    const upsId    = getParam("id");

    // Track whether the restricted Assigned Computer section is in edit mode
    const sectionEditState = { assignment: false };

    // Snapshots of form state taken the moment each edit mode is entered, used to
    // detect no-op saves (Save clicked with nothing actually changed) and skip the API call.
    let generalEditSnapshot    = null;
    const sectionEditSnapshots = { assignment: null };

    // ── Fetch Computers ───────────────────────────────────────
    async function loadComputers() {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch("/api/computer", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) computers = await res.json();
        } catch (err) {
            console.warn("Could not load computers:", err);
        }
    }

    // ── Fetch Categories ─────────────────────────────────────
    async function loadCategories() {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch("/api/category?asset=ups", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) return;
            const list = await res.json();
            categories = list
                .filter(c => c.is_active)
                .reduce((acc, c) => {
                    if (!acc[c.category_group]) acc[c.category_group] = [];
                    acc[c.category_group].push(c.category_value);
                    return acc;
                }, {});
        } catch (err) {
            console.warn("Could not load categories:", err);
        }
    }

    // Helper: build a <select> from a category_group key, with fallback
    function catSel(id, group, fallback, currentValue) {
        const opts = (categories[group] && categories[group].length)
            ? categories[group]
            : fallback;
        return sel(id, opts, currentValue);
    }

    // ── Fetch Vendors ────────────────────────────────────────
    // Same endpoint/pattern used by computer.js's vendor dropdown.
    async function loadVendors() {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch("/api/vendor", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) vendors = await res.json();
        } catch (err) {
            console.warn("Could not load vendors:", err);
        }
    }

    // ── Fetch Asset ──────────────────────────────────────────
    async function loadAsset() {
        if (!upsId) {
            renderError("No UPS ID specified in the URL.");
            return;
        }

        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`/api/ups/${upsId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            assetData = await res.json();

            // The API may return either a single object or a wrapped array
            if (Array.isArray(assetData)) assetData = assetData[0];

            renderPage(assetData);
        } catch (err) {
            console.error(err);
            renderError("Failed to load UPS. Please check the ID or try again.");
        }
    }

    // ── Render Page ──────────────────────────────────────────
    function renderPage(d) {
        const nameLabel = d.asset_tag || `UPS #${d.ups_id}`;

        qs("#breadcrumbName").textContent = nameLabel;
        qs("#pageTitle").textContent      = nameLabel;
        document.title = `${nameLabel} — UPS Detail`;

        const badge = qs("#statusBadge");
        badge.textContent = d.asset_status || "Unknown";
        badge.className   = `status-badge ${statusClass(d.asset_status)}`;

        qs("#pageContent").innerHTML = buildLayout(d);
        lucide.createIcons();
        applyGlobalEditButtonState();
        applyRestrictedSectionStates();
        applyDateConstraints();
        initVendorSearch();
    }

    function renderError(msg) {
        qs("#pageContent").innerHTML = `
        <div class="state-wrapper">
            <i data-lucide="alert-circle" style="color:#dc2626"></i>
            <p>${msg}</p>
            <button class="btn-secondary" onclick="history.back()">
                <i data-lucide="arrow-left"></i> Go Back
            </button>
        </div>`;
        lucide.createIcons();
    }

    // ── HTML Builder Helpers ─────────────────────────────────

    function fg(label, viewVal, inputHtml, required = false, full = false) {
        const req     = required ? '<span class="req edit-only">*</span>' : "";
        const cls     = full ? "form-group full" : "form-group";
        const display = viewVal && viewVal !== "—"
            ? viewVal
            : '<span class="empty">—</span>';

        return `
        <div class="${cls}">
            <label class="form-label">${label} ${req}</label>
            <span class="view-value view-only">${display}</span>
            <div class="edit-only">${inputHtml}</div>
        </div>`;
    }

    /**
     * Like fg() but uses section-specific edit classes instead of
     * global view-only / edit-only, so they're controlled by the
     * section's own edit button rather than the global Edit button.
     */
    function fgRestricted(section, label, viewVal, inputHtml, required = false, full = false) {
        const req     = required ? `<span class="req section-edit-only" data-section="${section}" style="display:none">*</span>` : "";
        const cls     = full ? "form-group full" : "form-group";
        const display = viewVal && viewVal !== "—"
            ? viewVal
            : '<span class="empty">—</span>';

        return `
        <div class="${cls}">
            <label class="form-label">${label} ${req}</label>
            <span class="view-value section-view-only" data-section="${section}">${display}</span>
            <div class="section-edit-only" data-section="${section}">${inputHtml}</div>
        </div>`;
    }

    function inp(id, value, type = "text", placeholder = "", required = false) {
        return `<input
            type="${type}"
            id="${id}"
            value="${escHtml(iVal(value))}"
            placeholder="${placeholder}"
            ${required ? "required" : ""}
        />`;
    }

    function sel(id, options, currentValue) {
        // Normalize to { value, label } objects
        const opts = options.map(o => {
            const v = typeof o === "object" ? o.value : o;
            const l = typeof o === "object" ? o.label : o;
            return { value: String(v), label: l };
        });

        // If the stored value isn't among the known options (legacy data, a
        // renamed/retired category value, etc.), inject it so edit mode shows
        // the actual current data instead of silently falling back to the
        // first/blank option.
        const cv = currentValue == null ? "" : String(currentValue);
        if (cv !== "" && !opts.some(o => o.value === cv)) {
            opts.push({ value: cv, label: cv });
        }

        const optHtml = opts
            .map(o => `<option value="${escHtml(o.value)}" ${cv === o.value ? "selected" : ""}>${escHtml(o.label)}</option>`)
            .join("");

        return `<select id="${id}">${optHtml}</select>`;
    }

    // ── Layout ───────────────────────────────────────────────
    function buildLayout(d) {
        return `
        ${buildQuickInfoBar(d)}
        <div class="main-col">
            ${buildBasicsCard(d)}
            ${buildSpecsCard(d)}
            ${buildProcurementCard(d)}
            ${buildAssignmentCard(d)}
        </div>`;
    }

    // ── Collapsible section header ───────────────────────────
    function sectionHeader(cardId, icon, title, subtitle, extraControls = "") {
        return `
        <div class="section-header collapsible-header" onclick="window.toggleSection('${cardId}', event)">
            <div class="section-icon"><i data-lucide="${icon}"></i></div>
            <div class="section-header-text">
                <div class="section-title-text">${title}</div>
                ${subtitle ? `<div class="section-subtitle">${subtitle}</div>` : ""}
            </div>
            ${extraControls}
            <div class="collapse-chevron"><i data-lucide="chevron-down"></i></div>
        </div>`;
    }

    // ── Section Cards ────────────────────────────────────────

    // ── Restricted Section Edit State ────────────────────────

    function applyRestrictedSectionStates() {
        ["assignment"].forEach(section => {
            const isEditing = sectionEditState[section];
            qsa(`.section-view-only[data-section="${section}"]`).forEach(el => {
                el.style.display = isEditing ? "none" : "";
            });
            qsa(`.section-edit-only[data-section="${section}"]`).forEach(el => {
                el.style.display = isEditing ? (el.tagName === "SPAN" ? "inline" : "flex") : "none";
            });

            const editBtn   = qs(`#sectionEditBtn-${section}`);
            const saveBtn   = qs(`#sectionSaveBtn-${section}`);
            const cancelBtn = qs(`#sectionCancelBtn-${section}`);
            if (editBtn)   editBtn.style.display   = isEditing ? "none"         : "inline-flex";
            if (saveBtn)   saveBtn.style.display   = isEditing ? "inline-flex"  : "none";
            if (cancelBtn) cancelBtn.style.display = isEditing ? "inline-flex"  : "none";
        });

        if (sectionEditState.assignment) initComputerSearch();
    }

    // ── Section Edit Button Builder ──────────────────────────

    function buildSectionEditControls(section, canEdit, permissionLabel) {
        if (!canEdit) {
            return `
            <div class="section-edit-controls">
                <div class="perm-btn-wrapper" data-tooltip="You need ${permissionLabel} to edit this section.">
                    <button class="btn-secondary section-edit-btn perm-locked" disabled>
                        <i data-lucide="lock"></i> Edit
                    </button>
                </div>
            </div>`;
        }

        return `
        <div class="section-edit-controls">
            <button id="sectionEditBtn-${section}"   class="btn-secondary" onclick="window.enterSectionEdit('${section}')">
                <i data-lucide="pencil"></i> Edit
            </button>
            <button id="sectionSaveBtn-${section}"   class="btn-primary"   onclick="window.saveSectionEdit('${section}')" style="display:none">
                <i data-lucide="save"></i> Save
            </button>
            <button id="sectionCancelBtn-${section}" class="btn-secondary" onclick="window.cancelSectionEdit('${section}')" style="display:none">
                <i data-lucide="x"></i> Cancel
            </button>
        </div>`;
    }

    function buildBasicsCard(d) {
        const statusOpts    = ["Active", "Spare", "Repair", "Defective"];
        const conditionOpts = ["New", "Used"];
        const brandFallback = ["APC", "Eaton", "CyberPower", "Vertiv", "Schneider Electric", "Delta", "Other"];

        return `
        <div class="section-card" id="card-basics">
            ${sectionHeader("card-basics", "battery-charging", "Asset Basics", "Identification and classification")}
            <div class="section-body form-grid">
                ${fg("Asset Tag",     val(d.asset_tag),       inp("asset_tag",       d.asset_tag,       "text", "e.g. TMCSL-UPS-001", false), false)}
                ${fg("Serial Number", val(d.serial_no),       inp("serial_no",       d.serial_no,       "text", "",                   true), true)}
                ${fg("Brand",         val(d.brand),           catSel("brand",        "ups.brand",       brandFallback, d.brand),               true)}
                ${fg("Model",         val(d.model),           inp("model",           d.model,           "text", "",                   true), true)}
                ${fg("Status",        val(d.asset_status),    sel("asset_status",    statusOpts,        d.asset_status),                       true)}
                ${fg("Condition",     val(d.asset_condition),  sel("asset_condition", conditionOpts,    d.asset_condition),                     true)}
            </div>
        </div>`;
    }

    function buildSpecsCard(d) {
        const capacityVal = d.capacity_va != null ? d.capacity_va : "";
        const batteryVal  = toLocalDateInput(d.battery_replace_date);

        return `
        <div class="section-card" id="card-specs">
            ${sectionHeader("card-specs", "zap", "UPS Specifications", "Capacity and battery information")}
            <div class="section-body form-grid">
                ${fg("Capacity (VA)",          val(d.capacity_va),         inp("capacity_va",          capacityVal, "number", "e.g. 1500", true), true)}
                ${fg("Battery Replacement Date", fmtDate(d.battery_replace_date), inp("battery_replace_date", batteryVal,  "date"),                 false, true)}
            </div>
        </div>`;
    }

    function buildProcurementCard(d) {
        const costDisplay = d.cost != null
            ? Number(d.cost).toLocaleString("en-PH", { minimumFractionDigits: 2 })
            : "—";
        const receivedVal = toLocalDateInput(d.received_date);
        const warrantyVal = toLocalDateInput(d.warranty_expiry);
        const deployedVal = toLocalDateInput(d.date_deployed);

        // Vendor searchable combo — mirrors computer.js's vendor field.
        // #vendor holds the display name that actually gets submitted; #vendorId is a
        // UI-only guard that must be set before saving is allowed, forcing the user
        // to pick a vendor from the list rather than free-typing one.
        const matchedVendor = vendors.find(v =>
            (v.vendor_name || "").toLowerCase() === String(d.vendor || "").toLowerCase()
        );
        const vendorInput = `
        <div class="dept-search-wrap" id="vendor-search-wrap">
            <input
                type="text"
                id="vendor"
                class="dept-search-input"
                placeholder="Search vendor…"
                autocomplete="off"
                value="${escHtml(iVal(d.vendor))}"
            />
            <div class="dept-dropdown" id="vendor-dropdown"></div>
            <input type="hidden" id="vendorId" value="${matchedVendor ? matchedVendor.vendor_id : ""}" />
        </div>`;

        return `
        <div class="section-card" id="card-procurement">
            ${sectionHeader("card-procurement", "receipt", "Procurement &amp; Warranty", "Cost, vendor, and warranty tracking")}
            <div class="section-body form-grid">
                ${fg("Vendor / Supplier", val(d.vendor),             vendorInput,                                                             true)}
                ${fg("Cost (₱)",          val(costDisplay),           inp("cost",            d.cost,        "number", "0.00"), false, true)}
                ${fg("Received Date",     fmtDate(d.received_date),   inp("received_date",   receivedVal,   "date",   "", true), true)}
                ${fg("Warranty Expiry",   fmtDate(d.warranty_expiry), inp("warranty_expiry", warrantyVal,   "date"), false, true)}
                ${fg("Date Deployed",     fmtDate(d.date_deployed),   inp("date_deployed",   deployedVal,   "date"), false, true)}
                ${fg("Remarks",           val(d.remarks), `<textarea id="remarks" placeholder="Any notes about this UPS…">${escHtml(d.remarks || "")}</textarea>`, false, true)}
            </div>
        </div>`;
    }

    // ── Assigned Computer Card (restricted) ──────────────────
    function buildAssignmentCard(d) {
        const canEdit = canEditAssignment();

        // Build the label shown in the combo input: "PC-HQ-001 (ASSET-TAG)"
        const currentComputerLabel = (() => {
            if (!d.assigned_to) return "";
            const match = computers.find(c => c.computer_id === d.computer_assigned_to);
            if (match && match.asset_tag) return `${match.computer_name} (${match.asset_tag})`;
            return d.assigned_to;
        })();

        const computerInput = `
        <div class="combo-wrapper" id="computer-search-wrap">
            <input
                type="text"
                id="computer-search-input"
                class="combo-input"
                placeholder="Search computer name or asset tag…"
                autocomplete="off"
                value="${escHtml(currentComputerLabel)}"
            />
            <ul class="combo-list hidden" id="computer-combo-list"></ul>
            <input type="hidden" id="computer_assigned_to" value="${escHtml(iVal(d.computer_assigned_to))}" />
        </div>`;

        return `
        <div class="section-card" id="section-card-assignment">
            ${sectionHeader("section-card-assignment", "monitor-check", "Assigned Computer", "Computer this UPS is attached to", buildSectionEditControls("assignment", canEdit, "Edit Asset: UPS (Assign Computer)"))}
            <div class="section-body form-grid">
                ${fgRestricted("assignment", "Assigned Computer", val(d.assigned_to), computerInput, false, true)}
                ${fgRestricted("assignment", "Department", val(d.department_name), `<span class="view-value">${val(d.department_name)}</span>`, false)}
                ${fgRestricted("assignment", "Location",   val(d.asset_location),  `<span class="view-value">${val(d.asset_location)}</span>`,  false)}
            </div>
        </div>`;
    }

    // ── Quick Info Bar (horizontal, top of page) ─────────────

    function buildQuickInfoBar(d) {
        const warrantyOk = d.warranty_expiry && new Date(d.warranty_expiry) > new Date();
        const wLabel = warrantyOk
            ? `<span style="color:#15803d">✓ Valid until ${fmtDate(d.warranty_expiry)}</span>`
            : (d.warranty_expiry
                ? `<span style="color:#dc2626">⚠ Expired ${fmtDate(d.warranty_expiry)}</span>`
                : "—");

        const batteryOk = d.battery_replace_date && new Date(d.battery_replace_date) > new Date();
        const bLabel = d.battery_replace_date
            ? (batteryOk
                ? `<span style="color:#15803d">${fmtDate(d.battery_replace_date)}</span>`
                : `<span style="color:#dc2626">⚠ ${fmtDate(d.battery_replace_date)}</span>`)
            : "—";

        const assignBlock = d.assigned_to
            ? `<div class="assigned-card quick-info-dept">
                   <div class="user-avatar" style="background:linear-gradient(135deg,#0891b2,#2563eb);">
                       <i data-lucide="monitor" style="width:18px;height:18px;color:#fff;"></i>
                   </div>
                   <div class="user-info">
                       <div class="name">${escHtml(d.assigned_to)}</div>
                       <div class="meta">
                           ${d.department_name ? escHtml(d.department_name) : ""}
                           ${d.department_name && d.asset_location ? " · " : ""}
                           ${d.asset_location ? `Location: ${escHtml(d.asset_location)}` : ""}
                       </div>
                   </div>
               </div>`
            : `<div class="no-user quick-info-dept">No computer assigned</div>`;

        return `
        <div class="section-card quick-info-bar">
            <div class="section-header">
                <div class="section-icon"><i data-lucide="info"></i></div>
                <div class="section-header-text">
                    <div class="section-title-text">Quick Info</div>
                </div>
                <a href="auditLogs.html?audit=ups:${d.ups_id}"
                class="audit-log-btn" title="View audit trail for this asset">
                    <i data-lucide="history"></i>
                    View History
                </a>
            </div>
            <div class="info-grid">
                <div class="info-cell"><span class="label">Asset Tag</span>       <span class="value">${val(d.asset_tag)}</span></div>
                <div class="info-cell"><span class="label">Serial No.</span>      <span class="value">${val(d.serial_no)}</span></div>
                <div class="info-cell"><span class="label">Brand / Model</span>   <span class="value">${val(d.brand)}${d.model ? " " + escHtml(d.model) : ""}</span></div>
                <div class="info-cell"><span class="label">Capacity</span>        <span class="value">${d.capacity_va != null ? d.capacity_va + " VA" : "—"}</span></div>
                <div class="info-cell"><span class="label">Warranty</span>        <span class="value">${wLabel}</span></div>
                <div class="info-cell"><span class="label">Battery Replace</span> <span class="value">${bLabel}</span></div>
                <div class="info-cell"><span class="label">Condition</span>       <span class="value">${val(d.asset_condition)}</span></div>
            </div>
            ${assignBlock}
        </div>`;
    }

    // ── Collapsible Sections ─────────────────────────────────

    window.toggleSection = function (cardId, event) {
        if (event && event.target.closest("button, .perm-btn-wrapper")) return;
        const card = qs(`#${cardId}`);
        if (!card) return;
        card.classList.toggle("collapsed");
    };

    // ── Global Edit Mode Controls ────────────────────────────

    // ── Global Edit Button State ─────────────────────────────
    // Mirrors the perm-locked tooltip pattern used by buildSectionEditControls().
    // Swaps the global Edit button into a disabled+tooltip state when the
    // user lacks permission 27, instead of alerting at click time.
    function applyGlobalEditButtonState() {
        const btn = qs("#viewActions button");
        if (!btn) return;
        const wrapper = btn.closest(".perm-btn-wrapper");

        if (canEditGeneral()) {
            // Unwrap back to a normal, enabled button if it was previously locked
            if (wrapper) wrapper.replaceWith(btn);
            btn.disabled = false;
            btn.classList.remove("perm-locked", "section-edit-btn");
            btn.innerHTML = `<i data-lucide="pencil"></i> Edit`;
        } else {
            if (!wrapper) {
                const newWrapper = document.createElement("div");
                newWrapper.className = "perm-btn-wrapper tooltip-bottom";
                newWrapper.dataset.tooltip = "You need Edit Asset: UPS permission to edit this asset.";
                btn.replaceWith(newWrapper);
                newWrapper.appendChild(btn);
            }
            btn.disabled = true;
            btn.classList.add("perm-locked", "section-edit-btn");
            btn.innerHTML = `<i data-lucide="lock"></i> Edit`;
        }
        lucide.createIcons();
    }

    // ── Change Detection Helpers ──────────────────────────────
    // Used to disallow "saving" a section when nothing was actually edited.

    function collectGeneralFormState() {
        const inputs = qsa("#pageContent input[id], #pageContent select[id], #pageContent textarea[id]");
        const raw = {};
        for (const el of inputs) {
            if (el.closest(".section-edit-only[data-section]")) continue;
            if (el.type === "number") {
                raw[el.id] = el.value !== "" ? parseFloat(el.value) : null;
            } else {
                raw[el.id] = el.value.trim() || null;
            }
        }
        return JSON.stringify(raw);
    }

    function collectSectionFormState(section) {
        const sectionCard = qs(`#section-card-${section}`);
        if (!sectionCard) return JSON.stringify({});
        const inputs = qsa("input[id], select[id], textarea[id]", sectionCard);
        const raw = {};
        for (const el of inputs) {
            raw[el.id] = el.value.trim() || null;
        }
        return JSON.stringify(raw);
    }

    window.enterEditMode = function () {
        if (!canEditGeneral()) return;   // button is disabled; guard kept as safety net
        document.body.className = "edit-mode";
        qs("#editModeBar").classList.add("visible");
        lucide.createIcons();
        generalEditSnapshot = collectGeneralFormState();
    };

    window.cancelEdit = async function () {
        const ok = await showConfirmDialog({
            title: "Discard unsaved changes?",
            message: "Any changes you made on this page will be lost.",
            confirmLabel: "Discard",
            danger: true,
        });
        if (!ok) return;
        document.body.className = "view-mode";
        qs("#editModeBar").classList.remove("visible");
        sectionEditState.assignment = false;
        renderPage(assetData);
    };


    // Wraps a YYYY-MM-DD value with the PH timezone offset before sending to the API,
    // preventing MySQL from shifting the date back when it interprets the value as UTC.
    function localDate(val) {
        if (!val) return null;
        const plain = String(val).substring(0, 10);
        return /^\d{4}-\d{2}-\d{2}$/.test(plain) ? plain + "T00:00:00+08:00" : val;
    }

    // ── Inline field error helper (mirrors computerItem.js) ────
    function setFieldError(id, message) {
        const el = qs(`#${id}`);
        if (!el) return;
        const group = el.closest(".form-group");
        if (!group) return;
        let errEl = group.querySelector(".field-error-msg");
        if (message) {
            el.classList.add("input-error");
            if (!errEl) {
                errEl = document.createElement("span");
                errEl.className = "field-error-msg";
                group.appendChild(errEl);
            }
            errEl.textContent = message;
            const clear = () => {
                el.classList.remove("input-error");
                errEl?.remove();
                el.removeEventListener("input",  clear);
                el.removeEventListener("change", clear);
            };
            el.addEventListener("input",  clear, { once: true });
            el.addEventListener("change", clear, { once: true });
        } else {
            el.classList.remove("input-error");
            errEl?.remove();
        }
    }

    // ── Date validation helpers (mirrors computerItem.js) ────
    function setDateError(inputId, message) {
        const input = qs(`#${inputId}`);
        if (!input) return;
        let msg = input.parentElement.querySelector(".date-error");
        if (message) {
            if (!msg) {
                msg = document.createElement("span");
                msg.className = "date-error";
                msg.style.cssText = "display:block;color:#e24b4a;font-size:12px;margin-top:4px;";
                input.parentElement.appendChild(msg);
            }
            msg.textContent = message;
            input.style.borderColor = "#e24b4a";
        } else {
            if (msg) msg.remove();
            input.style.borderColor = "";
        }
    }

    function validateDates() {
        const today = new Date().toISOString().split("T")[0];
        let valid = true;

        const received = qs("#received_date")?.value;
        if (received && received > today) {
            setDateError("received_date", "Received date cannot be a future date.");
            valid = false;
        } else {
            setDateError("received_date", null);
        }

        const deployed = qs("#date_deployed")?.value;
        if (deployed && deployed > today) {
            setDateError("date_deployed", "Date deployed cannot be a future date.");
            valid = false;
        } else {
            setDateError("date_deployed", null);
        }

        return valid;
    }

    // Set browser-level max constraints so the native calendar picker
    // greys out / disables future dates (mirrors computerItem.js)
    function applyDateConstraints() {
        const today = new Date().toISOString().split("T")[0];
        const recv = qs("#received_date");
        if (recv) recv.max = today;
        const dep = qs("#date_deployed");
        if (dep) dep.max = today;
    }

    window.saveChanges = async function () {
        // ── No-op guard: if nothing changed since edit mode was entered, don't save ──
        const currentGeneralState = collectGeneralFormState();
        if (generalEditSnapshot !== null && currentGeneralState === generalEditSnapshot) {
            showToast("No changes to save.", "info");
            document.body.className = "view-mode";
            qs("#editModeBar").classList.remove("visible");
            return;
        }

        const inputs = qsa("#pageContent input[id], #pageContent select[id], #pageContent textarea[id]");
        const raw    = {};

        for (const el of inputs) {
            // Skip restricted-section fields — they have their own save buttons
            if (el.closest(".section-edit-only[data-section]")) continue;

            if (el.type === "number") {
                raw[el.id] = el.value !== "" ? parseFloat(el.value) : null;
            } else {
                raw[el.id] = el.value.trim() || null;
            }
        }

        // ── Inline validation (mirrors computerItem.js validateStep) ──
        const requiredFields = [
            { id: "serial_no",      label: "Serial Number" },
            { id: "brand",          label: "Brand" },
            { id: "model",          label: "Model" },
            { id: "asset_status",   label: "Status" },
            { id: "asset_condition", label: "Condition" },
            { id: "capacity_va",    label: "Capacity (VA)" },
            { id: "vendor",         label: "Vendor / Supplier" },
            { id: "received_date",  label: "Received Date" },
        ];

        let valid = true;
        let firstInvalidId = null;
        requiredFields.forEach(({ id, label }) => {
            const v = raw[id];
            const isEmpty = v === null || v === undefined || v === "";
            if (isEmpty) {
                setFieldError(id, `${label} is required.`);
                valid = false;
                firstInvalidId = firstInvalidId || id;
            } else {
                setFieldError(id, null);
            }
        });

        // Vendor must be picked from the dropdown, not free-typed (mirrors computer.js).
        // Only checked once we know the field isn't simply empty (handled above).
        if (raw.vendor && !qs("#vendorId")?.value) {
            setFieldError("vendor", "Please select a vendor from the list.");
            valid = false;
            firstInvalidId = firstInvalidId || "vendor";
        }

        // Cost — optional, but if provided must be a valid number
        if (raw.cost !== null && isNaN(raw.cost)) {
            setFieldError("cost", "Cost must be a valid number.");
            valid = false;
            firstInvalidId = firstInvalidId || "cost";
        } else {
            setFieldError("cost", null);
        }

        // Warranty Expiry is now optional — clear any stale error state
        setFieldError("warranty_expiry", null);

        if (!valid) {
            showToast("Please fix the highlighted fields.", "error");
            if (firstInvalidId) qs(`#${firstInvalidId}`)?.focus();
            return;
        }

        // Date range validation
        if (!validateDates()) return;

        // Map snake_case input IDs → camelCase API field names for PUT /ups/{id}
        const payload = {
            assetTag:           raw.asset_tag,
            serialNo:           raw.serial_no,
            brand:              raw.brand,
            model:              raw.model,
            assetStatus:        raw.asset_status,
            assetCondition:     raw.asset_condition,
            capacityVa:         raw.capacity_va,
            batteryReplaceDate: localDate(raw.battery_replace_date) || null,
            vendor:             raw.vendor,
            cost:               raw.cost,
            receivedDate:       localDate(raw.received_date),
            warrantyExpiry:     localDate(raw.warranty_expiry),
            dateDeployed:       localDate(raw.date_deployed)   || null,
            remarks:            raw.remarks         || null,
            // Preserve the existing assignment — handled by its own section save
            computerAssignedTo: assetData.computer_assigned_to ?? null,
        };

        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`/api/ups/${upsId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({ message: "Unknown error" }));
                throw new Error(err.message || `HTTP ${res.status}`);
            }

            // Merge raw values back into local state (kept in snake_case internally)
            assetData = { ...assetData, ...raw };
            document.body.className = "view-mode";
            qs("#editModeBar").classList.remove("visible");
            renderPage(assetData);
            showToast("Changes saved successfully.", "success");

        } catch (err) {
            console.error(err);
            showToast(`Save failed: ${err.message}`, "error");
        }
    };

    // ── Restricted Section Edit Controls ─────────────────────

    window.enterSectionEdit = function (section) {
        sectionEditState[section] = true;
        applyRestrictedSectionStates();
        lucide.createIcons();
        sectionEditSnapshots[section] = collectSectionFormState(section);
    };

    window.cancelSectionEdit = async function (section) {
        const ok = await showConfirmDialog({
            title: "Discard changes to this section?",
            message: "Any changes you made to this section will be lost.",
            confirmLabel: "Discard",
            danger: true,
        });
        if (!ok) return;
        sectionEditState[section] = false;
        const card = qs(`#section-card-${section}`);
        if (card) {
            card.outerHTML = buildAssignmentCard(assetData);
            lucide.createIcons();
        }
        applyRestrictedSectionStates();
    };

    window.saveSectionEdit = async function (section) {
        const sectionCard = qs(`#section-card-${section}`);
        if (!sectionCard) return;

        // ── No-op guard: if nothing changed since section edit mode was entered, don't save ──
        const currentSectionState = collectSectionFormState(section);
        if (sectionEditSnapshots[section] !== null && currentSectionState === sectionEditSnapshots[section]) {
            showToast("No changes to save.", "info");
            sectionEditState[section] = false;
            const card = qs(`#section-card-${section}`);
            if (card) {
                card.outerHTML = buildAssignmentCard(assetData);
                lucide.createIcons();
            }
            applyRestrictedSectionStates();
            return;
        }

        const token = localStorage.getItem("token");

        // ── Assignment: PUT /ups/{id} ─────────────────────────
        if (section === "assignment") {
            const hiddenInput = qs("#computer_assigned_to", sectionCard);
            const rawVal = hiddenInput ? hiddenInput.value.trim() : "";
            const computerId = rawVal ? parseInt(rawVal) : null;

            // Safely parse numeric fields — API may store them as strings
            const parsedCost     = assetData.cost != null
                ? parseFloat(String(assetData.cost).replace(/,/g, ""))
                : null;
            const parsedCapacity = assetData.capacity_va != null
                ? parseInt(String(assetData.capacity_va).replace(/,/g, ""), 10)
                : 0;

            // Strip dates to YYYY-MM-DD in case they come back as full ISO timestamps
            const stripDate = v => { if (!v) return null; const d = new Date(v); if (isNaN(d)) return null; const yyyy = d.getFullYear(); const mm = String(d.getMonth()+1).padStart(2,'0'); const dd = String(d.getDate()).padStart(2,'0'); return `${yyyy}-${mm}-${dd}T00:00:00+08:00`; };

            const payload = {
                computerAssignedTo: computerId,
                // Preserve all existing asset fields required by the PUT endpoint
                assetTag:           assetData.asset_tag            ?? null,
                serialNo:           assetData.serial_no,
                brand:              assetData.brand,
                vendor:             assetData.vendor,
                model:              assetData.model,
                capacityVa:         isNaN(parsedCapacity) ? 0 : parsedCapacity,
                batteryReplaceDate: stripDate(assetData.battery_replace_date),
                assetStatus:        assetData.asset_status,
                assetCondition:     assetData.asset_condition,
                receivedDate:       stripDate(assetData.received_date),
                warrantyExpiry:     stripDate(assetData.warranty_expiry),
                dateDeployed:       stripDate(assetData.date_deployed),
                cost:               isNaN(parsedCost) ? null : parsedCost,
                remarks:            assetData.remarks ?? null,
            };

            try {
                const res = await fetch(`/api/ups/${upsId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                    body: JSON.stringify(payload)
                });

                if (!res.ok) {
                    const err = await res.json().catch(() => ({ message: "Unknown error" }));
                    throw new Error(err.message || `HTTP ${res.status}`);
                }

                // Resolve display fields from the selected computer (or clear if unassigned)
                const selectedComputer = computerId
                    ? computers.find(c => c.computer_id === computerId)
                    : null;

                // Read the visible combo label to keep the display name in sync
                const comboInputEl = qs("#computer-search-input");
                const displayName  = selectedComputer
                    ? selectedComputer.computer_name
                    : null;

                assetData = {
                    ...assetData,
                    computer_assigned_to: computerId,
                    assigned_to:          displayName,
                    department_name:      selectedComputer ? (selectedComputer.department_name ?? assetData.department_name ?? null) : null,
                    asset_location:       selectedComputer ? (selectedComputer.asset_location  ?? assetData.asset_location  ?? null) : null,
                };

            } catch (err) {
                console.error(err);
                showToast(`Save failed: ${err.message}`, "error");
                return;
            }
        }

        // Success — exit section edit mode and re-render the card
        sectionEditState[section] = false;
        const card = qs(`#section-card-${section}`);
        if (card) {
            card.outerHTML = buildAssignmentCard(assetData);
            lucide.createIcons();
        }
        applyRestrictedSectionStates();
        showToast("Section saved successfully.", "success");
    };

    // ── Shared Searchable Combobox Factory (mirrors ups.js) ────
    /**
     * options  : { id, label }[] — stored id goes into hiddenInput
     * inputEl  : the visible text <input>
     * listEl   : the <ul> dropdown
     * hiddenEl : the hidden <input> that receives the id
     */
    function initCombo(inputEl, listEl, hiddenEl, options) {
        if (!inputEl || !listEl) return;
        if (inputEl._comboInit) return;   // guard against double-binding
        inputEl._comboInit = true;

        function renderList(filter) {
            const q = filter.toLowerCase().trim();
            // Always include an "Unassign" entry
            const unassign = [{ id: "", label: "— No computer assigned —" }];
            const matches  = options.filter(o =>
                o.label.toLowerCase().includes(q)
            );
            const items = unassign.concat(matches.length ? matches : []);

            listEl.innerHTML = "";

            if (!matches.length && q) {
                const li = document.createElement("li");
                li.className   = "no-match";
                li.textContent = `No match for "${filter}"`;
                listEl.insertAdjacentElement("beforeend", li);
            }

            items.forEach(opt => {
                const li = document.createElement("li");
                li.textContent = opt.label;
                if (!opt.id) li.classList.add("no-match");   // style unassign entry subtly
                li.addEventListener("mousedown", e => {
                    e.preventDefault();
                    inputEl.value = opt.id ? opt.label : "";
                    if (hiddenEl) hiddenEl.value = opt.id;
                    listEl.classList.add("hidden");
                });
                listEl.appendChild(li);
            });
        }

        inputEl.addEventListener("focus", () => {
            renderList(inputEl.value);
            listEl.classList.remove("hidden");
        });
        inputEl.addEventListener("input", () => {
            if (hiddenEl) hiddenEl.value = "";
            renderList(inputEl.value);
            listEl.classList.remove("hidden");
        });
        inputEl.addEventListener("blur", () => {
            setTimeout(() => {
                listEl.classList.add("hidden");
                // If user typed but never selected, try to match or revert
                if (hiddenEl && !hiddenEl.value && inputEl.value.trim()) {
                    const match = options.find(o =>
                        o.label.toLowerCase() === inputEl.value.trim().toLowerCase()
                    );
                    if (match) {
                        hiddenEl.value = match.id;
                    } else {
                        // Revert to the last saved value
                        inputEl.value  = assetData.assigned_to          || "";
                        if (hiddenEl) hiddenEl.value = assetData.computer_assigned_to ?? "";
                    }
                }
            }, 150);
        });
        inputEl.addEventListener("keydown", e => {
            const items = [...listEl.querySelectorAll("li:not(.no-match)")];
            const cur   = listEl.querySelector("li.highlighted");
            const idx   = items.indexOf(cur);

            if (e.key === "ArrowDown") {
                e.preventDefault();
                cur?.classList.remove("highlighted");
                const next = items[idx + 1] || items[0];
                next?.classList.add("highlighted");
                next?.scrollIntoView({ block: "nearest" });
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                cur?.classList.remove("highlighted");
                const prev = items[idx - 1] || items[items.length - 1];
                prev?.classList.add("highlighted");
                prev?.scrollIntoView({ block: "nearest" });
            } else if (e.key === "Enter") {
                if (cur) {
                    e.preventDefault();
                    inputEl.value  = cur.textContent.trim() === "— No computer assigned —" ? "" : cur.textContent.trim();
                    if (hiddenEl) hiddenEl.value = cur.dataset.id || "";
                    listEl.classList.add("hidden");
                }
            } else if (e.key === "Escape") {
                listEl.classList.add("hidden");
            }
        });
    }

    // ── Wire up computer combo when assignment section enters edit mode ──
    function initComputerSearch() {
        const inputEl  = qs("#computer-search-input");
        const listEl   = qs("#computer-combo-list");
        const hiddenEl = qs("#computer_assigned_to");
        if (!inputEl || !listEl || !hiddenEl) return;

        const options = computers.map(c => ({
            id:    String(c.computer_id),
            label: c.computer_name + (c.asset_tag ? ` (${c.asset_tag})` : "")
        }));

        initCombo(inputEl, listEl, hiddenEl, options);
    }

    // ── Inject Combo Styles ──────────────────────────────────
    function injectComboStyles() {
        if (document.getElementById("ups-combo-styles")) return;
        const style = document.createElement("style");
        style.id = "ups-combo-styles";
        style.textContent = `
            /* ── Searchable Combobox (upsItem) ── */
            .combo-wrapper {
                position: relative;
                width: 100%;
            }
            .combo-wrapper .combo-input {
                width: 100%;
                padding: 8px 10px;
                border: 1px solid #ddd;
                border-radius: 6px;
                font-size: 13px;
                outline: none;
                box-sizing: border-box;
                font-family: inherit;
                background: #fff;
            }
            .combo-wrapper .combo-input:focus {
                border-color: #2563eb;
                box-shadow: 0 0 0 2px rgba(37,99,235,.1);
            }
            .combo-wrapper .combo-list {
                position: absolute;
                top: calc(100% + 4px);
                left: 0;
                right: 0;
                background: #fff;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                max-height: 220px;
                overflow-y: auto;
                z-index: 1000;
                list-style: none;
                margin: 0;
                padding: 4px 0;
                box-shadow: 0 8px 24px rgba(0,0,0,.10);
            }
            .combo-wrapper .combo-list li {
                padding: 9px 14px;
                font-size: 13px;
                cursor: pointer;
                color: #334155;
                line-height: 1.4;
                transition: background 0.1s;
            }
            .combo-wrapper .combo-list li:hover,
            .combo-wrapper .combo-list li.highlighted {
                background: #eef5ff;
                color: #2563eb;
            }
            .combo-wrapper .combo-list li.no-match {
                color: #94a3b8;
                cursor: default;
                font-style: italic;
                background: none;
            }
            /* "No computer assigned" unassign entry */
            .combo-wrapper .combo-list li:first-child {
                color: #64748b;
                border-bottom: 1px solid #f1f5f9;
                margin-bottom: 2px;
                font-style: italic;
            }
            .combo-wrapper .combo-list li:first-child:hover {
                background: #fff7ed;
                color: #ea580c;
            }

            /* Prevent parent cards from clipping the dropdown */
            .section-card,
            .section-body,
            .form-group,
            .section-edit-only {
                overflow: visible !important;
            }
        `;
        document.head.appendChild(style);
    }

    // ── Vendor Searchable Dropdown ────────────────────────────
    // Mirrors computer.js's vendorCombo: #vendor is the visible text input
    // holding the display name that gets submitted, #vendorId is a UI-only
    // guard that must be set (by picking an option) before saveChanges()
    // will allow a save.
    function initVendorSearch() {
        const searchInput = qs("#vendor");
        const dropdown    = qs("#vendor-dropdown");
        const hiddenInput = qs("#vendorId");
        if (!searchInput || !dropdown || !hiddenInput) return;

        function renderList(filter) {
            const q = filter.toLowerCase().trim();
            const matches = vendors.filter(v =>
                (v.vendor_name || "").toLowerCase().includes(q)
            );

            if (!matches.length) {
                dropdown.innerHTML = `<div class="dept-option dept-option-empty">No vendors found</div>`;
            } else {
                dropdown.innerHTML = matches.map(v => `
                    <div class="dept-option" data-id="${v.vendor_id}" data-name="${escHtml(v.vendor_name)}">
                        ${escHtml(v.vendor_name)}
                    </div>`).join("");
            }

            qsa(".dept-option[data-id]", dropdown).forEach(el => {
                el.addEventListener("mousedown", e => {
                    e.preventDefault();   // keep focus on input briefly so blur doesn't fire first
                    hiddenInput.value = el.dataset.id;
                    searchInput.value = el.dataset.name;
                    dropdown.classList.remove("open");
                    setFieldError("vendor", null);
                });
            });
        }

        searchInput.addEventListener("focus", () => {
            renderList(searchInput.value);
            dropdown.classList.add("open");
        });

        searchInput.addEventListener("input", () => {
            // Clear the picked id while the user is typing — forces them to pick from the list
            hiddenInput.value = "";
            renderList(searchInput.value);
            dropdown.classList.add("open");
        });

        searchInput.addEventListener("blur", () => {
            // Small delay so mousedown on an option fires first
            setTimeout(() => {
                dropdown.classList.remove("open");
                if (!hiddenInput.value) {
                    const match = vendors.find(v =>
                        (v.vendor_name || "").toLowerCase() === searchInput.value.toLowerCase()
                    );
                    if (match) {
                        hiddenInput.value = match.vendor_id;
                    } else {
                        // No exact match — revert to the last saved vendor value
                        const original = assetData?.vendor || "";
                        searchInput.value = original;
                        const originalMatch = vendors.find(v =>
                            (v.vendor_name || "").toLowerCase() === original.toLowerCase()
                        );
                        hiddenInput.value = originalMatch ? originalMatch.vendor_id : "";
                    }
                }
            }, 150);
        });
    }

    // ── Init ─────────────────────────────────────────────────
    document.addEventListener("DOMContentLoaded", async () => {
        injectComboStyles();
        await Promise.all([loadComputers(), loadCategories(), loadVendors()]);
        loadAsset();
    });

})();
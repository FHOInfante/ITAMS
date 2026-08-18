/* ============================================================
   softwareItem.js
   Logic for the Software Detail / Edit page (softwareItem.html)
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

    // ── Permission Helpers ───────────────────────
    // Permission 25 → Edit Asset - Software (required for global Edit button)
    // Permission 23 → Assign Asset - Software (required for End User Assignment section)
    // Permission 2  → View Audit Trail - Software
    function getUserPermissions() {
        try {
            const raw = localStorage.getItem("permissions");
            return raw ? JSON.parse(raw) : [];
        } catch { return []; }
    }

    function canViewAuditHistory() {
        return getUserPermissions().includes(2);
    }

    function canEditGeneral() {
        const has = getUserPermissions().includes(25);
        console.log("[Permission 25 — Edit Asset: Software]", has ? "GRANTED" : "DENIED", "| Permissions:", getUserPermissions());
        return has;
    }

    function canEditEndUser() {
        const has = getUserPermissions().includes(23);
        console.log("[Permission 23 — Assign Asset: Software]", has ? "GRANTED" : "DENIED", "| Permissions:", getUserPermissions());
        return has;
    }

    // ── Utilities ────────────────────────────────────────────
    function statusClass(status) {
        if (!status) return "";
        const s = status.toLowerCase();
        if (s === "active")                        return "active";
        if (s === "expired")                       return "expired";
        if (s.includes("renewal") || s === "renewal due") return "renewal-due";
        return "inactive";
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

    function initials(name) {
        if (!name) return "?";
        return name.trim().split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join("");
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

    // ── State ────────────────────────────────────────────────
    let assetData   = null;
    let departments = [];
    let categories  = {};
    let vendors     = [];   // [{ vendor_id, vendor_name }] — from /api/vendor
    let endUserList  = [];   // populated once by loadEndUsers()
    const softwareId = getParam("id");

    // Track which restricted sections are in edit mode
    const sectionEditState = { enduser: false };

    // Snapshots of form state taken the moment each edit mode is entered, used to
    // detect no-op saves (Save clicked with nothing actually changed) and skip the API call.
    let generalEditSnapshot    = null;
    const sectionEditSnapshots = { enduser: null };

    // Set when the user picks an *existing* employee from the name-search dropdown.
    // Drives the "reassign to existing user" branch in saveSectionEdit (PATCH /assign with empId+date only).
    // Reset to null whenever the enduser section edit is cancelled or saved.
    let selectedExistingEuId = null;

    // Fields that get autofilled + locked once an existing employee is picked
    // from the name-search dropdown. Same lock mechanism as computerItem.js.
    const LOCKED_EU_FIELD_IDS = ["eu_emp_id", "eu_name", "eu_division", "dept-search-input", "eu_location", "eu_email", "eu_contact_no", "eu_status"];

    // Tracks whether the Employee Record fields are currently greyed out.
    // Kept separate from selectedExistingEuId: fields also start locked on
    // entering edit mode whenever the asset already has an assigned user
    // (see enterSectionEdit), even before anyone touches the search box —
    // selectedExistingEuId only gets set once a *new* pick is made this session.
    let euFieldsLocked = false;

    // Disable/enable + grey out the autofilled employee-record fields so an
    // existing employee's details can't be hand-edited from this form.
    // Styles are set inline (not just via a CSS class) so this can't be
    // silently overridden by another stylesheet's rules for inputs/selects.
    function setEndUserFieldsLocked(locked) {
        euFieldsLocked = locked;
        LOCKED_EU_FIELD_IDS.forEach(id => {
            const el = qs(`#${id}`);
            if (!el) return;
            el.disabled = locked;
            el.classList.toggle("field-locked", locked);
            if (locked) {
                el.style.setProperty("background-color", "#f1f5f9", "important");
                el.style.setProperty("color", "#64748b", "important");
                el.style.setProperty("border-color", "#e2e8f0", "important");
                el.style.setProperty("cursor", "not-allowed", "important");
                el.style.setProperty("opacity", "1", "important");
                el.style.setProperty("box-shadow", "none", "important");
            } else {
                el.style.removeProperty("background-color");
                el.style.removeProperty("color");
                el.style.removeProperty("border-color");
                el.style.removeProperty("cursor");
                el.style.removeProperty("opacity");
                el.style.removeProperty("box-shadow");
            }
        });
        const clearBtn = qs("#eu-name-clear-btn");
        if (clearBtn) clearBtn.style.display = locked ? "flex" : "none";
    }

    // Fully undo an existing-employee selection: clear the tracked id and
    // unlock the fields so the user can either pick a different employee
    // or hand-type a brand-new one. Does NOT clear the field values —
    // typing in the name search box is what triggers this, and the
    // previously-autofilled values are a reasonable starting point to edit.
    function clearExistingEuSelection() {
        if (!euFieldsLocked) return; // nothing locked, nothing to do
        selectedExistingEuId = null;
        setEndUserFieldsLocked(false);
    }

    // ── Location options ─────────────────────────────────────
    const LOCATION_OPTS = ["B2","B1","GF","2F","3F","4F","5F","6F","7F","8F","PO"];

    // ── Fetch Departments ────────────────────────────────────
    async function loadDepartments() {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch("/api/department", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) departments = await res.json();
        } catch (err) {
            console.warn("Could not load departments:", err);
        }
    }

    // ── Fetch Categories ─────────────────────────────────────
    async function loadCategories() {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch("/api/category?asset=software", {
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

    // ── Fetch End Users ────────────────────────────────────────────────
    async function loadEndUsers() {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch("/api/end-user", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) return;
            const raw = await res.json();
            endUserList = Array.isArray(raw) ? raw : (raw.data ?? raw.users ?? raw.endUsers ?? []);
        } catch (err) {
            console.warn("Could not load end users:", err);
        }
    }

    // Helper: build a <select> from a category_group key with a fallback list.
    // No blank "please select" option is injected — sel() already grandfathers
    // in the asset's current value if it isn't in the category/fallback list
    // (e.g. a renamed category, or categories not yet loaded), so there's never
    // a dead placeholder state to land on.
    function catSel(id, group, fallback, currentValue) {
        const opts = (categories[group] && categories[group].length)
            ? categories[group]
            : fallback;
        return sel(id, opts, currentValue);
    }

    // Helper: build a searchable Vendor combobox from the live /api/vendor
    // list (same data source/endpoint as computer.js's vendor dropdown).
    // Reuses the same dept-search-wrap / dept-dropdown / dept-option markup
    // and CSS classes as the Department / Employee search combos below, so
    // no new styling is required.
    //
    // Enforcement: same rule as computer.js's vendorCombo — a value only
    // counts as "selected" if it was picked from the dropdown list. The
    // hidden #vendorId input tracks that; it's cleared the moment the user
    // free-types, and re-checked at save time via initVendorSearch()'s
    // _enforceSelection(). The asset's current value is still guaranteed to
    // be present (and pre-validated) as an option, mirroring catSel's
    // fallback-inclusion behaviour above.
    function vendorInput(currentValue) {
        const matched = vendors.find(v =>
            (v.vendor_name || "").toLowerCase() === String(currentValue || "").toLowerCase()
        );
        // If the saved vendor isn't in the live list (custom/legacy value),
        // grandfather it in as a pre-selected, valid option.
        const initialId = currentValue
            ? (matched ? matched.vendor_id : `current:${currentValue}`)
            : "";

        return `
        <div class="dept-search-wrap" id="vendor-search-wrap">
            <input
                type="text"
                id="vendor"
                class="dept-search-input"
                placeholder="Search vendor…"
                autocomplete="off"
                value="${escHtml(currentValue || "")}"
            />
            <div class="dept-dropdown" id="vendor-dropdown"></div>
            <input type="hidden" id="vendorId" value="${escHtml(String(initialId))}" />
        </div>`;
    }

    // ── Fetch Asset ──────────────────────────────────────────
    async function loadAsset() {
        if (!softwareId) {
            renderError("No software ID specified in the URL.");
            return;
        }

        try {
            const token = localStorage.getItem("token");

            const res = await fetch(`/api/software/${softwareId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            assetData = await res.json();

            // If an end user is assigned, fetch their full details
            if (assetData.assigned_user_id) {
                try {
                    const euRes = await fetch(`/api/end-user/${assetData.assigned_user_id}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (euRes.ok) {
                        const eu = await euRes.json();
                        assetData = {
                            ...assetData,
                            eu_id:           eu.eu_id,
                            eu_name:         eu.eu_name,
                            eu_emp_id:       eu.eu_emp_id,
                            eu_division:     eu.eu_division,
                            eu_department:   eu.eu_department,
                            department_name: eu.department_name,
                            eu_location:     eu.eu_location,
                            eu_email:        eu.eu_email,
                            eu_contact_no:   eu.eu_contact_no,
                            eu_status:       eu.eu_status ?? "Active",
                        };
                    }
                } catch (euErr) {
                    console.warn("Could not load end user details:", euErr);
                }
            }

            renderPage(assetData);
        } catch (err) {
            console.error(err);
            renderError("Failed to load software record. Please check the ID or try again.");
        }
    }

    // ── Render Page ──────────────────────────────────────────
    function renderPage(d) {
        const nameLabel = d.software_name || `Software #${d.software_id}`;

        qs("#breadcrumbName").textContent = nameLabel;
        qs("#pageTitle").textContent      = nameLabel;
        document.title = `${nameLabel} — Software Detail`;

        const badge = qs("#statusBadge");
        badge.textContent = d.software_status || "Unknown";
        badge.className   = `status-badge ${statusClass(d.software_status)}`;

        // Swap the header Edit button based on permission 25
        const viewActions = qs("#viewActions");
        if (viewActions) {
            if (canEditGeneral()) {
                viewActions.innerHTML = `
                    <button class="btn-secondary" onclick="enterEditMode()">
                        <i data-lucide="pencil"></i> Edit
                    </button>`;
            } else {
                viewActions.innerHTML = `
                    <div class="perm-btn-wrapper tooltip-bottom" data-tooltip="You need Edit Asset - Software to edit.">
                        <button class="btn-secondary section-edit-btn perm-locked" disabled>
                            <i data-lucide="lock"></i> Edit
                        </button>
                    </div>`;
            }
        }

        qs("#pageContent").innerHTML = buildLayout(d);
        lucide.createIcons();
        applyRestrictedSectionStates();
        applyDateConstraints();
        initVendorSearch();

        qs("#license_type")?.addEventListener("change", updateExpiryDateState);
        qs("#auto_renew")?.addEventListener("change", updateExpiryDateState);
        updateExpiryDateState();
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

    // Auto Renew checkbox — checking this (or a Perpetual license type)
    // makes Expiry Date not applicable; see updateExpiryDateState().
    function autoRenewCheckbox(currentValue) {
        return `
        <label style="display:flex; align-items:center; gap:8px; font-weight:400; cursor:pointer; margin:0;">
            <input type="checkbox" id="auto_renew" ${currentValue ? "checked" : ""}
                style="width:16px; height:16px; margin:0; cursor:pointer;" />
            Auto renew
        </label>`;
    }

    function sel(id, options, currentValue) {
        // Normalize to { value, label, disabled } objects
        const opts = options.map(o => {
            const v   = typeof o === "object" ? o.value : o;
            const l   = typeof o === "object" ? o.label : o;
            const dis = typeof o === "object" && o.disabled;
            return { value: String(v), label: l, disabled: dis };
        });

        // If the stored value isn't among the known options (legacy data, a
        // renamed/retired category value, etc.), inject it so edit mode shows
        // the actual current data instead of silently falling back to the
        // first/blank option.
        const cv = currentValue == null ? "" : String(currentValue);
        if (cv !== "" && !opts.some(o => o.value === cv)) {
            opts.push({ value: cv, label: cv, disabled: false });
        }

        const optHtml = opts
            .map(o => `<option value="${escHtml(o.value)}" ${cv === o.value ? "selected" : ""} ${o.disabled ? "disabled" : ""}>${escHtml(o.label)}</option>`)
            .join("");

        return `<select id="${id}">${optHtml}</select>`;
    }

    // Status is auto-calculated on the backend from the purchase/renewal/
    // expiry dates (Active, Expired, For Renewal, etc). The only status a
    // user can manually set is "Discontinued" — everything else stays
    // locked to its current, auto-managed value while editing.
    function statusSel(id, currentValue) {
        const current = currentValue || "";
        const isDiscontinued = current === "Discontinued";
        const opts = [];

        if (current && !isDiscontinued) {
            opts.push({ value: current, label: `${current} (auto)`, disabled: true });
        }
        opts.push({ value: "Discontinued", label: "Discontinued" });

        return sel(id, opts, isDiscontinued ? "Discontinued" : current);
    }

    // ── Restricted Section Edit State ────────────────────────
    function applyRestrictedSectionStates() {
        ["enduser"].forEach(section => {
            const isEditing = sectionEditState[section];
            qsa(`.section-view-only[data-section="${section}"]`).forEach(el => {
                el.style.display = isEditing ? "none" : "";
            });
            qsa(`.section-edit-only[data-section="${section}"]`).forEach(el => {
                el.style.display = isEditing ? (el.tagName === "SPAN" ? "inline" : "flex") : "none";
            });

            const editBtn     = qs(`#sectionEditBtn-${section}`);
            const saveBtn     = qs(`#sectionSaveBtn-${section}`);
            const cancelBtn   = qs(`#sectionCancelBtn-${section}`);
            const unassignBtn = qs(`#sectionUnassignBtn-${section}`);
            if (editBtn)     editBtn.style.display     = isEditing ? "none"        : "inline-flex";
            if (saveBtn)     saveBtn.style.display     = isEditing ? "inline-flex" : "none";
            if (cancelBtn)   cancelBtn.style.display   = isEditing ? "inline-flex" : "none";
            if (unassignBtn) unassignBtn.style.display = isEditing ? "inline-flex" : "none";
        });
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
            <button id="sectionUnassignBtn-${section}" class="btn-danger" onclick="window.unassignUser()" style="display:none">
                <i data-lucide="user-x"></i> Unassign
            </button>
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

    // ── Layout ───────────────────────────────────────────────
    function buildLayout(d) {
        return `
        ${buildQuickInfoBar(d)}
        <div class="detail-layout">
            <div class="main-col">
                ${buildBasicsCard(d)}
                ${buildLicenseCostCard(d)}
                ${buildAssignmentCard(d)}
            </div>
        </div>`;
    }

    // ── Collapsible section header builder ───────────────────
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

    // ── Section: Software Basics ─────────────────────────────
    function buildBasicsCard(d) {
        const licenseTypeFallback = ["Subscription", "Perpetual", "Open Source", "Trial", "Volume License"];

        return `
        <div class="section-card" id="card-basics">
            ${sectionHeader("card-basics", "package", "Software Basics", "Identification and licensing information")}
            <div class="section-body form-grid">
                ${fg("Software Name",   val(d.software_name),   inp("software_name",   d.software_name,   "text", "e.g. Microsoft Office 365", true), true, true)}
                ${fg("Vendor",          val(d.vendor),          vendorInput(d.vendor),                                                           true)}
                ${fg("License Type",    val(d.license_type),    catSel("license_type",  "software.license_type", licenseTypeFallback, d.license_type), true)}
                ${fg("Status",          val(d.software_status), statusSel("software_status", d.software_status), true)}
                ${fg("Subscription ID", val(d.subscription_id), inp("subscription_id",  d.subscription_id, "text", "e.g. MSO365-00123"), false, true)}
            </div>
        </div>`;
    }

    // ── Section: License & Cost ──────────────────────────────
    function buildLicenseCostCard(d) {
        const purchaseDateVal = toLocalDateInput(d.purchase_date);
        const expiryDateVal   = d.expiry_date     ? toLocalDateInput(d.expiry_date)     : "";

        const costDisplay = d.cost != null
            ? Number(d.cost).toLocaleString("en-PH", { minimumFractionDigits: 2 })
            : "—";
        const prevCostDisplay = d.previous_cost != null
            ? Number(d.previous_cost).toLocaleString("en-PH", { minimumFractionDigits: 2 })
            : "—";

        // Expiry warning indicator for view mode
        const today = new Date();
        let expiryDisplay = fmtDate(d.expiry_date);
        if (d.expiry_date) {
            const exp = new Date(d.expiry_date);
            const daysLeft = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
            if (daysLeft < 0) {
                expiryDisplay += `<span style="color:#dc2626;font-size:11px;font-weight:600;">⚠ Expired</span>`;
            } else if (daysLeft <= 30) {
                expiryDisplay += `<span style="color:#a16207;font-size:11px;font-weight:600;">⚠ Due in ${daysLeft}d</span>`;
            }
        }

        return `
        <div class="section-card" id="card-license-cost">
            ${sectionHeader("card-license-cost", "receipt", "License &amp; Cost", "Purchase, expiry, and cost information")}
            <div class="section-body form-grid">
                ${fg("Purchase Date",   fmtDate(d.purchase_date),   inp("purchase_date",   purchaseDateVal, "date", "", true), true)}
                ${fg("Auto Renew",      d.auto_renew ? "Yes" : "No", autoRenewCheckbox(d.auto_renew), false)}
                ${fg("Expiry Date",     expiryDisplay,              inp("expiry_date",     expiryDateVal,   "date", "", true), true)}
                ${fg("Cost (₱)",        val(costDisplay),            inp("cost",            d.cost,          "number", "0.00"), false, true)}
                ${fg("Previous Cost (₱)", val(prevCostDisplay),     inp("previous_cost",   d.previous_cost, "number", "0.00"))}
                ${fg("Remarks",         val(d.remarks), `<textarea id="remarks" placeholder="Any notes about this software…">${escHtml(d.remarks || "")}</textarea>`, false, true)}
            </div>
        </div>`;
    }

    // ── Section: End User Assignment ─────────────────────────
    function buildAssignmentCard(d) {
        const assignedDateVal = toLocalDateInput(d.assigned_date);
        const canEdit = canEditEndUser();
        const deptDisplay = d.department_name || d.eu_department || "—";

        const deptInput = `
        <div class="dept-search-wrap" id="dept-search-wrap">
            <input
                type="text"
                id="dept-search-input"
                class="dept-search-input"
                placeholder="Search department…"
                autocomplete="off"
                value="${escHtml(d.department_name || (departments.find(dep => dep.department_id === Number(d.eu_department))||{}).department_name || "")}"
            />
            <div class="dept-dropdown" id="dept-dropdown"></div>
            <input type="hidden" id="eu_department" value="${escHtml(iVal(d.eu_department))}" />
        </div>`;

        const locationInput = sel("eu_location", LOCATION_OPTS, d.eu_location);

        return `
        <div class="section-card" id="section-card-enduser">
            ${sectionHeader("section-card-enduser", "user-check", "End User Assignment", "Assigned employee information", buildSectionEditControls("enduser", canEdit, "Assign Asset - Software (permission 23)"))}
            <div class="section-body form-grid">
                <div class="group-label section-edit-only" data-section="enduser" style="display:none">Search Employee</div>
                <div class="form-group full section-edit-only" data-section="enduser" style="display:none">
                    <label class="form-label">Search by Name</label>
                    <div class="dept-search-wrap eu-search-wrap" id="eu-name-search-wrap">
                        <input
                            type="text"
                            id="eu-name-search-input"
                            class="dept-search-input"
                            placeholder="Search by employee name…"
                            autocomplete="off"
                        />
                        <button
                            type="button"
                            class="eu-search-clear-btn"
                            id="eu-name-clear-btn"
                            title="Remove selected employee"
                            aria-label="Remove selected employee"
                            style="display:none"
                        ><i data-lucide="x"></i></button>
                        <div class="dept-dropdown" id="eu-name-dropdown"></div>
                    </div>
                </div>
                <div class="group-label">Employee Record</div>
                ${fgRestricted("enduser", "Employee ID",  val(d.eu_emp_id),     inp("eu_emp_id",     d.eu_emp_id,     "text",  "", true), true)}
                ${fgRestricted("enduser", "Full Name",    val(d.eu_name),       inp("eu_name",       d.eu_name,       "text",  "", true), true)}
                ${fgRestricted("enduser", "Division",     val(d.eu_division),   inp("eu_division",   d.eu_division,   "text",  "", true), true)}
                ${fgRestricted("enduser", "Department",   val(deptDisplay),     deptInput,                            true)}
                ${fgRestricted("enduser", "Location",     val(d.eu_location),   locationInput,                        true)}
                ${fgRestricted("enduser", "Email",        val(d.eu_email),      inp("eu_email",      d.eu_email,      "email", "user@company.com"))}
                ${fgRestricted("enduser", "Contact No.",  val(d.eu_contact_no), inp("eu_contact_no", d.eu_contact_no, "text",  "+63…"))}
                ${fgRestricted("enduser", "Status",       val(d.eu_status),     sel("eu_status", [{ value: "Active", label: "Active" }, { value: "Inactive", label: "Inactive" }, { value: "Resigned", label: "Resigned" }], d.eu_status ?? "Active"), true)}
                <hr class="divider" />
                <div class="group-label">Assignment Details</div>
                ${fgRestricted("enduser", "Assigned Date", fmtDate(d.assigned_date), inp("assigned_date", assignedDateVal, "date"))}
            </div>
        </div>`;
    }

    // ── Quick Info Bar ────────────────────────────────────────
    function buildQuickInfoBar(d) {
        const today    = new Date();
        const expDate  = d.expiry_date ? new Date(d.expiry_date) : null;
        const isExpired = expDate && expDate < today;

        const expiryLabel = expDate
            ? isExpired
                ? `<span style="color:#dc2626">⚠ Expired ${fmtDate(d.expiry_date)}</span>`
                : `<span style="color:#15803d">✓ Valid until ${fmtDate(d.expiry_date)}</span>`
            : "—";

        const name = d.eu_name || d.assigned_user_name;
        const dept = d.department_name || d.eu_division;

        const userBlock = name
            ? `<div class="assigned-card quick-info-user">
                   <div class="user-avatar">${initials(name)}</div>
                   <div class="user-info">
                       <div class="name">${escHtml(name)}</div>
                       <div class="meta">
                           ${d.eu_emp_id ? `ID: ${escHtml(String(d.eu_emp_id))}` : ""}
                           ${d.eu_emp_id && dept ? " · " : ""}
                           ${escHtml(dept || "")}
                           ${d.eu_location ? ` · ${escHtml(d.eu_location)}` : ""}
                       </div>
                   </div>
               </div>`
            : `<div class="no-user quick-info-user">No user assigned</div>`;

        return `
        <div class="section-card quick-info-bar">
            <div class="section-header">
                <div class="section-icon"><i data-lucide="info"></i></div>
                <div class="section-header-text">
                    <div class="section-title-text">Quick Info</div>
                </div>
                ${canViewAuditHistory()
                    ? `<a href="auditLogs.html?audit=software:${d.software_id}"
                        class="audit-log-btn" title="View audit trail for this asset">
                            <i data-lucide="history"></i>
                            View History
                        </a>`
                    : `<div class="perm-btn-wrapper" data-tooltip="You need View Audit Trail - Software permission to view this asset's history.">
                        <span class="audit-log-btn audit-log-btn-disabled">
                            <i data-lucide="history"></i>
                            View History
                        </span>
                    </div>`
                }
            </div>
            <div class="info-grid">
                <div class="info-cell"><span class="label">Vendor</span>           <span class="value">${val(d.vendor)}</span></div>
                <div class="info-cell"><span class="label">License Type</span>     <span class="value">${val(d.license_type)}</span></div>
                <div class="info-cell"><span class="label">Subscription ID</span>  <span class="value">${val(d.subscription_id)}</span></div>
                <div class="info-cell"><span class="label">Expiry</span>           <span class="value">${expiryLabel}</span></div>
                <div class="info-cell"><span class="label">Cost</span>             <span class="value">${d.cost != null ? "₱" + Number(d.cost).toLocaleString("en-PH", { minimumFractionDigits: 2 }) : "—"}</span></div>
                <div class="info-cell"><span class="label">Purchase Date</span>    <span class="value">${fmtDate(d.purchase_date)}</span></div>
            </div>
            ${userBlock}
        </div>`;
    }

    // ── Collapsible Sections ─────────────────────────────────
    window.toggleSection = function (cardId, event) {
        if (event && event.target.closest("button, .perm-btn-wrapper")) return;
        const card = qs(`#${cardId}`);
        if (!card) return;
        card.classList.toggle("collapsed");
    };

    // ── Change Detection Helpers ──────────────────────────────
    // Used to disallow "saving" a section when nothing was actually edited.

    function collectGeneralFormState() {
        const inputs = qsa("#pageContent input[id], #pageContent select[id], #pageContent textarea[id]");
        const raw = {};
        for (const el of inputs) {
            if (el.closest(".section-edit-only[data-section]")) continue;
            if (el.type === "checkbox") {
                raw[el.id] = el.checked;
            } else if (el.id === "cost" || el.id === "previous_cost") {
                const parsed = parseFloat(el.value);
                raw[el.id] = isNaN(parsed) ? null : parsed;
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
        // For the end-user section, whether a different existing employee has been
        // picked via the search dropdown is also part of the editable state.
        const extra = section === "enduser" ? { reassignId: selectedExistingEuId } : {};
        return JSON.stringify({ raw, ...extra });
    }

    // ── Global Edit Mode Controls ────────────────────────────
    window.enterEditMode = function () {
        if (!canEditGeneral()) {
            showToast("You do not have permission to edit this asset. (Permission 25 required)", "error");
            return;
        }
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
        sectionEditState.enduser = false;
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

        const purchase = qs("#purchase_date")?.value;
        if (purchase && purchase > today) {
            setDateError("purchase_date", "Purchase date cannot be a future date.");
            valid = false;
        } else {
            setDateError("purchase_date", null);
        }

        return valid;
    }

    // Set browser-level max constraint so the native calendar picker
    // greys out / disables future dates (mirrors computerItem.js)
    function applyDateConstraints() {
        const today = new Date().toISOString().split("T")[0];
        const purchase = qs("#purchase_date");
        if (purchase) purchase.max = today;
    }

    // ── Expiry Date gating (Perpetual license / Auto Renew) ──────
    // Mirrors software.js's Add/Edit modal: Expiry Date is not applicable
    // when the license is Perpetual or when Auto Renew is checked — grey
    // it out, disable it, and clear any value/error so it can't be saved.
    function updateExpiryDateState() {
        const expiryEl      = qs("#expiry_date");
        const licenseTypeEl = qs("#license_type");
        const autoRenewEl   = qs("#auto_renew");
        if (!expiryEl || !licenseTypeEl || !autoRenewEl) return;

        const isPerpetual   = licenseTypeEl.value === "Perpetual";
        const isAutoRenew   = autoRenewEl.checked;
        const shouldDisable = isPerpetual || isAutoRenew;

        expiryEl.disabled = shouldDisable;
        expiryEl.classList.toggle("field-disabled", shouldDisable);

        if (shouldDisable) {
            expiryEl.value = "";
            setFieldError("expiry_date", null);
        }
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

            if (el.type === "checkbox") {
                raw[el.id] = el.checked;
            } else if (el.id === "cost" || el.id === "previous_cost") {
                const parsed = parseFloat(el.value);
                raw[el.id] = isNaN(parsed) ? null : parsed;
            } else {
                raw[el.id] = el.value.trim() || null;
            }
        }

        // Expiry Date is not applicable when disabled (Perpetual license or
        // Auto Renew checked) — force it null so it can't be saved as stale.
        const expiryDisabled = qs("#expiry_date")?.disabled;
        if (expiryDisabled) raw.expiry_date = null;

        // ── Inline validation (mirrors computerItem.js validateStep) ──
        const requiredFields = [
            { id: "software_name",    label: "Software Name" },
            { id: "vendor",           label: "Vendor" },
            { id: "license_type",     label: "License Type" },
            { id: "software_status",  label: "Status" },
            { id: "purchase_date",    label: "Purchase Date" },
            // Expiry Date is only required when it's actually applicable
            ...(expiryDisabled ? [] : [{ id: "expiry_date", label: "Expiry Date" }]),
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
        if (expiryDisabled) setFieldError("expiry_date", null);

        // Vendor must be picked from the dropdown, not free-typed (mirrors
        // computer.js's vendorId enforcement). Skip this when the field is
        // blank — the "required" check above already flags that case.
        if (raw.vendor) {
            const vendorOk = qs("#vendor-search-wrap")?._enforceSelection?.() ?? true;
            if (!vendorOk) {
                valid = false;
                firstInvalidId = firstInvalidId || "vendor";
            }
        }

        // Cost — optional, but if provided must be a valid number
        if (raw.cost !== null && isNaN(raw.cost)) {
            setFieldError("cost", "Cost must be a valid number.");
            valid = false;
            firstInvalidId = firstInvalidId || "cost";
        } else {
            setFieldError("cost", null);
        }

        // Previous Cost — optional, but if provided must be a valid number
        if (raw.previous_cost !== null && isNaN(raw.previous_cost)) {
            setFieldError("previous_cost", "Previous cost must be a valid number.");
            valid = false;
            firstInvalidId = firstInvalidId || "previous_cost";
        } else {
            setFieldError("previous_cost", null);
        }

        if (!valid) {
            showToast("Please fix the highlighted fields.", "error");
            if (firstInvalidId) qs(`#${firstInvalidId}`)?.focus();
            return;
        }

        // Date range validation
        if (!validateDates()) return;

        const payload = {
            softwareName:   raw.software_name,
            vendor:         raw.vendor,
            licenseType:    raw.license_type,
            subscriptionId: raw.subscription_id  || null,
            purchaseDate:   localDate(raw.purchase_date),
            autoRenew:      raw.auto_renew,
            expiryDate:     raw.expiry_date ? localDate(raw.expiry_date) : null,
            cost:           raw.cost,
            previousCost:   raw.previous_cost    || null,
            remarks:        raw.remarks           || null,
        };

        // Status is auto-calculated on the backend from purchase/expiry dates.
        // Only include it when the user actually changed it (i.e. manually
        // set it to "Discontinued") — otherwise the API rejects it, since
        // any other value can only come from the auto-calculation, not a
        // manual edit.
        if (raw.software_status !== assetData.software_status) {
            payload.softwareStatus = raw.software_status;
        }

        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`/api/software/${softwareId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({ message: "Unknown error" }));
                throw new Error(err.message || `HTTP ${res.status}`);
            }

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

    // ── Restricted Section (End User) Edit Controls ──────────

    window.enterSectionEdit = function (section) {
        sectionEditState[section] = true;
        applyRestrictedSectionStates();
        lucide.createIcons();
        if (section === "enduser") {
            initDeptSearch();
            initEndUserSearch();
            // The Employee Record fields show an existing employee's data
            // whenever the asset already has someone assigned — grey them
            // out immediately, same as if that person had just been picked
            // from the search dropdown. Only an unassigned asset (a brand
            // new assignment, Branch C) starts out editable.
            setEndUserFieldsLocked(Boolean(assetData.assigned_user_id));
        }
        sectionEditSnapshots[section] = collectSectionFormState(section);
    };

    // ── End-User Name Searchable Dropdown ───────────────────────
    function initEndUserSearch() {
        const searchInput = qs("#eu-name-search-input");
        const dropdown    = qs("#eu-name-dropdown");
        const clearBtn    = qs("#eu-name-clear-btn");
        if (!searchInput || !dropdown) return;

        function renderList(filter) {
            const q = filter.toLowerCase().trim();
            const matches = q
                ? endUserList.filter(u => (u.eu_name || "").toLowerCase().includes(q))
                : endUserList.slice(0, 20);

            dropdown.innerHTML = "";
            if (!matches.length) {
                dropdown.innerHTML = `<div class="dept-option dept-option-empty">${q ? `No employee found for "${filter}"` : "No employees available"}</div>`;
                return;
            }
            matches.forEach(u => {
                const div = document.createElement("div");
                div.className = "dept-option";
                div.textContent = `${u.eu_name}${u.eu_emp_id ? "  ·  " + u.eu_emp_id : ""}`;
                div.addEventListener("mousedown", e => {
                    e.preventDefault();
                    autofillEndUser(u);
                    searchInput.value = u.eu_name;
                    dropdown.classList.remove("open");
                });
                dropdown.appendChild(div);
            });
        }

        // Fully undo a selection from the X button: unlock + blank the
        // autofilled fields (unlike retyping in the search box, which
        // leaves the values in place to hand-edit) + clear the search box
        // itself so the user can search again from scratch.
        clearBtn?.addEventListener("click", () => {
            clearExistingEuSelection();
            LOCKED_EU_FIELD_IDS.forEach(id => {
                const el = qs(`#${id}`);
                if (el) el.value = "";
            });
            const deptHidden = qs("#eu_department");
            if (deptHidden) deptHidden.value = "";
            searchInput.value = "";
            searchInput.focus();
        });

        searchInput.addEventListener("focus", () => { renderList(searchInput.value); dropdown.classList.add("open"); });
        searchInput.addEventListener("input", () => {
            // Typing again after a prior pick means the old selection no longer
            // applies — unlock the fields so they can either pick someone new
            // from the list or hand-type a brand-new employee's details.
            clearExistingEuSelection();
            renderList(searchInput.value);
            dropdown.classList.add("open");
        });
        searchInput.addEventListener("blur",  () => { setTimeout(() => dropdown.classList.remove("open"), 150); });

        searchInput.addEventListener("keydown", e => {
            const items = [...dropdown.querySelectorAll(".dept-option:not(.dept-option-empty)")];
            const cur   = dropdown.querySelector(".dept-option.highlighted");
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
            } else if (e.key === "Enter" && cur) {
                e.preventDefault();
                const name = cur.textContent.split("·")[0].trim();
                const matched = endUserList.find(u => u.eu_name === name);
                if (matched) { autofillEndUser(matched); searchInput.value = matched.eu_name; }
                dropdown.classList.remove("open");
            } else if (e.key === "Escape") {
                dropdown.classList.remove("open");
            }
        });
    }

    function autofillEndUser(u) {
        // Track that the user picked an existing employee record from the search dropdown.
        // saveSectionEdit uses this to fire PATCH /assign (reassign) instead of PUT /end-user/:id (edit).
        selectedExistingEuId = u.eu_id ?? null;

        const setVal = (id, v) => { const el = qs(`#${id}`); if (el) el.value = v ?? ""; };
        setVal("eu_emp_id",     u.eu_emp_id);
        setVal("eu_name",       u.eu_name);
        setVal("eu_division",   u.eu_division);
        setVal("eu_email",      u.eu_email);
        setVal("eu_contact_no", u.eu_contact_no ?? u.eu_contact_number);
        const deptInput  = qs("#dept-search-input");
        const deptHidden = qs("#eu_department");
        if (deptInput)  deptInput.value  = u.department_name ?? "";
        if (deptHidden) deptHidden.value = u.eu_department   ?? u.department_id ?? "";
        const locEl = qs("#eu_location");
        if (locEl) locEl.value = u.eu_location ?? "";
        const statusEl = qs("#eu_status");
        if (statusEl) statusEl.value = u.eu_status ?? "Active";

        // Lock the autofilled fields so they can't be hand-edited while an
        // existing employee is selected. This also reveals the X button.
        setEndUserFieldsLocked(true);
    }

    // ── Vendor Searchable Dropdown (enforced pick-from-list) ─────
    // Mirrors computer.js's vendorCombo: the user must choose a vendor from
    // the dropdown — free-typed text that doesn't match a vendor is rejected
    // at save time via _enforceSelection(), exactly like computer.js does
    // with its own vendorId hidden input.
    function initVendorSearch() {
        const wrap        = qs("#vendor-search-wrap");
        const searchInput = qs("#vendor");
        const dropdown    = qs("#vendor-dropdown");
        const hiddenInput = qs("#vendorId");
        if (!wrap || !searchInput || !dropdown || !hiddenInput) return;

        function vendorOptions() {
            const opts = vendors.map(v => ({ id: String(v.vendor_id), label: v.vendor_name }));
            // Keep the asset's current value selectable even if it isn't in
            // the live vendor list (e.g. a custom/legacy vendor name), same
            // fallback-inclusion behaviour vendorInput() uses when rendering.
            const current = assetData?.vendor;
            if (current && !opts.some(o => o.label.toLowerCase() === current.toLowerCase())) {
                opts.unshift({ id: `current:${current}`, label: current });
            }
            return opts;
        }

        function renderList(filter) {
            const q = filter.toLowerCase().trim();
            const matches = vendorOptions().filter(o => o.label.toLowerCase().includes(q));

            dropdown.innerHTML = "";
            if (!matches.length) {
                dropdown.innerHTML = `<div class="dept-option dept-option-empty">${q ? `No vendor found for "${filter}"` : "No vendors available"}</div>`;
                return;
            }
            matches.forEach(o => {
                const div = document.createElement("div");
                div.className = "dept-option";
                div.dataset.id = o.id;
                div.textContent = o.label;
                div.addEventListener("mousedown", e => {
                    e.preventDefault();
                    searchInput.value = o.label;
                    hiddenInput.value = o.id;
                    dropdown.classList.remove("open");
                    setFieldError("vendor", null);
                });
                dropdown.appendChild(div);
            });
        }

        // A value only counts as "selected" if it was chosen from the
        // dropdown — i.e. the hidden vendorId got set. Exposed on the
        // wrapper so saveChanges() can force-check it before saving.
        function enforceSelection() {
            const ok = hiddenInput.value !== "";
            setFieldError("vendor", ok ? null : "Please select a vendor from the dropdown list.");
            return ok;
        }
        wrap._enforceSelection = enforceSelection;

        searchInput.addEventListener("focus", () => {
            renderList(searchInput.value);
            dropdown.classList.add("open");
        });

        searchInput.addEventListener("input", () => {
            hiddenInput.value = ""; // typing invalidates the previous pick
            renderList(searchInput.value);
            dropdown.classList.add("open");
        });

        searchInput.addEventListener("blur", () => {
            setTimeout(() => {
                dropdown.classList.remove("open");
                enforceSelection();
            }, 150);
        });

        searchInput.addEventListener("keydown", e => {
            const items = [...dropdown.querySelectorAll(".dept-option:not(.dept-option-empty)")];
            const cur   = dropdown.querySelector(".dept-option.highlighted");
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
            } else if (e.key === "Enter" && cur) {
                e.preventDefault();
                searchInput.value = cur.textContent;
                hiddenInput.value = cur.dataset.id;
                dropdown.classList.remove("open");
                setFieldError("vendor", null);
            } else if (e.key === "Escape") {
                dropdown.classList.remove("open");
            }
        });
    }

    // ── Department Searchable Dropdown ───────────────────────
    function initDeptSearch() {
        const searchInput = qs("#dept-search-input");
        const dropdown    = qs("#dept-dropdown");
        const hiddenInput = qs("#eu_department");
        if (!searchInput || !dropdown || !hiddenInput) return;

        function renderList(filter) {
            const q = filter.toLowerCase();
            const matches = departments.filter(d =>
                d.department_name.toLowerCase().includes(q)
            );

            if (!matches.length) {
                dropdown.innerHTML = `<div class="dept-option dept-option-empty">No departments found</div>`;
            } else {
                dropdown.innerHTML = matches.map(d => `
                    <div class="dept-option" data-id="${d.department_id}" data-name="${escHtml(d.department_name)}">
                        ${escHtml(d.department_name)}
                    </div>`).join("");
            }

            qsa(".dept-option[data-id]", dropdown).forEach(el => {
                el.addEventListener("mousedown", e => {
                    e.preventDefault();
                    hiddenInput.value  = el.dataset.id;
                    searchInput.value  = el.dataset.name;
                    dropdown.classList.remove("open");
                });
            });
        }

        searchInput.addEventListener("focus", () => {
            renderList(searchInput.value);
            dropdown.classList.add("open");
        });

        searchInput.addEventListener("input", () => {
            hiddenInput.value = "";
            renderList(searchInput.value);
            dropdown.classList.add("open");
        });

        searchInput.addEventListener("blur", () => {
            setTimeout(() => {
                dropdown.classList.remove("open");
                if (!hiddenInput.value) {
                    const match = departments.find(d =>
                        d.department_name.toLowerCase() === searchInput.value.toLowerCase()
                    );
                    if (match) {
                        hiddenInput.value = match.department_id;
                    } else {
                        searchInput.value = assetData.department_name || "";
                        hiddenInput.value = assetData.eu_department   || "";
                    }
                }
            }, 150);
        });
    }

    window.unassignUser = async function () {
        if (!assetData.assigned_user_id) return;
        const ok = await showConfirmDialog({
            title: "Unassign this user?",
            message: "This will remove the current user from this software license. This cannot be undone.",
            confirmLabel: "Unassign",
            danger: true,
        });
        if (!ok) return;

        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`/api/software/${softwareId}/assign`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify({ euEmpId: null })
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({ message: "Unknown error" }));
                throw new Error(err.message || `HTTP ${res.status}`);
            }

            // Clear all end user fields from local state
            assetData = {
                ...assetData,
                assigned_user_id: null,
                eu_id:            null,
                eu_name:          null,
                eu_emp_id:        null,
                eu_division:      null,
                eu_department:    null,
                department_name:  null,
                eu_location:      null,
                eu_email:         null,
                eu_contact_no:    null,
                assigned_date:    null,
            };

            renderPage(assetData);
            showToast("User unassigned successfully.", "success");

        } catch (err) {
            console.error(err);
            showToast(`Unassign failed: ${err.message}`, "error");
        }
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
        if (section === "enduser") selectedExistingEuId = null;
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
            if (section === "enduser") selectedExistingEuId = null;
            const card = qs(`#section-card-${section}`);
            if (card) {
                card.outerHTML = buildAssignmentCard(assetData);
                lucide.createIcons();
            }
            applyRestrictedSectionStates();
            return;
        }

        const inputs = qsa("input[id], select[id], textarea[id]", sectionCard);
        const raw    = {};
        for (const el of inputs) {
            raw[el.id] = el.value.trim() || null;
        }

        const token = localStorage.getItem("token");

        // ── End User save — three possible branches:
        //   A) selectedExistingEuId is set  → user picked a *different* existing employee from search
        //                                     → PATCH /assign with { euEmpId, assignedDate } only
        //   B) assetData.assigned_user_id   → editing the *current* user's own details
        //                                     → PUT /end-user/:id with full payload
        //   C) neither                      → no user at all yet, brand-new assignment
        //                                     → PATCH /assign with full payload
        if (section === "enduser") {
            const isReassignExisting = Boolean(selectedExistingEuId);
            const isEditCurrent      = Boolean(assetData.assigned_user_id) && !isReassignExisting;

            // Build required-field list based on branch
            const requiredEu = ["eu_emp_id"];
            if (!isReassignExisting) {
                requiredEu.push("eu_name", "eu_division", "eu_department", "eu_location");
            }
            if (!isEditCurrent) {
                requiredEu.push("assigned_date");
            }

            const euFieldLabels = {
                eu_emp_id:     "Employee ID",
                eu_name:       "Full Name",
                eu_division:   "Division",
                eu_department: "Department",
                eu_location:   "Location",
                assigned_date: "Assigned Date",
            };

            let euValid = true;
            let firstInvalidId = null;
            requiredEu.forEach((key) => {
                if (!raw[key]) {
                    setFieldError(key, `${euFieldLabels[key] || key} is required.`);
                    if (key === "eu_department") {
                        qs("#dept-search-input", sectionCard)?.classList.add("input-error");
                    }
                    euValid = false;
                    firstInvalidId = firstInvalidId || (key === "eu_department" ? "dept-search-input" : key);
                } else {
                    setFieldError(key, null);
                    if (key === "eu_department") {
                        qs("#dept-search-input", sectionCard)?.classList.remove("input-error");
                    }
                }
            });

            // Contact number — optional but must be valid if filled
            const contactVal = raw.eu_contact_no ? raw.eu_contact_no.trim() : "";
            if (contactVal && !/^09\d{9}$/.test(contactVal)) {
                setFieldError("eu_contact_no", "Must be 11 digits starting with 09 (e.g. 09000000000).");
                euValid = false;
                firstInvalidId = firstInvalidId || "eu_contact_no";
            } else {
                setFieldError("eu_contact_no", null);
            }

            if (!euValid) {
                showToast("Please fix the highlighted field(s).", "error");
                if (firstInvalidId) qs(`#${firstInvalidId}`, sectionCard)?.focus();
                return;
            }

            try {
                let res;

                if (isReassignExisting) {
                    // ── Branch A: reassign to a different existing employee ──
                    // API only needs euEmpId + assignedDate; sending full payload causes 409
                    const payload = {
                        euEmpId:      Number(raw.eu_emp_id),
                        assignedDate: raw.assigned_date,
                    };

                    res = await fetch(`/api/software/${softwareId}/assign`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                        body: JSON.stringify(payload)
                    });

                } else if (isEditCurrent) {
                    // ── Branch B: edit the current user's details ──
                    const payload = {
                        euName:       raw.eu_name,
                        euEmpId:      Number(raw.eu_emp_id),
                        euDivision:   raw.eu_division,
                        euDepartment: Number(raw.eu_department),
                        euLocation:   raw.eu_location,
                        euEmail:      raw.eu_email      || null,
                        euContactNo:  raw.eu_contact_no || null,
                        euStatus:     raw.eu_status     || "Active",
                    };

                    res = await fetch(`/api/end-user/${assetData.assigned_user_id}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                        body: JSON.stringify(payload)
                    });

                } else {
                    // ── Branch C: no user yet — brand-new assignment with full details ──
                    const payload = {
                        euEmpId:      Number(raw.eu_emp_id),
                        assignedDate: localDate(raw.assigned_date),
                        euName:       raw.eu_name,
                        euDivision:   raw.eu_division,
                        euDepartment: Number(raw.eu_department),
                        euLocation:   raw.eu_location,
                        euEmail:      raw.eu_email      || null,
                        euContactNo:  raw.eu_contact_no || null,
                    };

                    res = await fetch(`/api/software/${softwareId}/assign`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                        body: JSON.stringify(payload)
                    });
                }

                if (!res.ok) {
                    const err = await res.json().catch(() => ({ message: "Unknown error" }));
                    throw new Error(err.message || `HTTP ${res.status}`);
                }

                const resJson = await res.json().catch(() => ({}));

                // Resolve the department display name from the already-loaded departments list
                const resolvedDeptName =
                    departments.find(d => d.department_id === Number(raw.eu_department))?.department_name
                    ?? assetData.department_name
                    ?? null;

                // For Branch A (reassign existing), the new assigned_user_id comes from
                // the employee picked in the search dropdown.
                const newAssignedUserId = isReassignExisting
                    ? (selectedExistingEuId ?? resJson.assigned_user_id ?? resJson.eu_id ?? assetData.assigned_user_id)
                    : (assetData.assigned_user_id ?? resJson.assigned_user_id ?? resJson.eu_id ?? null);

                // Persist back to local state (snake_case)
                assetData = {
                    ...assetData,
                    assigned_user_id: newAssignedUserId,
                    eu_emp_id:        raw.eu_emp_id,
                    eu_status:        raw.eu_status     || assetData.eu_status || "Active",
                    assigned_date:    raw.assigned_date || assetData.assigned_date,
                    eu_name:          raw.eu_name,
                    eu_division:      raw.eu_division,
                    eu_department:    raw.eu_department,
                    department_name:  resolvedDeptName,
                    eu_location:      raw.eu_location,
                    eu_email:         raw.eu_email      || null,
                    eu_contact_no:    raw.eu_contact_no || null,
                };

                // Reset the reassign flag now that the save is complete
                selectedExistingEuId = null;

            } catch (err) {
                console.error(err);
                showToast(`Save failed: ${err.message}`, "error");
                return;
            }
        }

        // Success — exit section edit and re-render card
        sectionEditState[section] = false;
        const card = qs(`#section-card-${section}`);
        if (card) {
            card.outerHTML = buildAssignmentCard(assetData);
            lucide.createIcons();
        }
        applyRestrictedSectionStates();
        showToast("Section saved successfully.", "success");
    };

    // ── Init ─────────────────────────────────────────────────
    document.addEventListener("DOMContentLoaded", async () => {
        await Promise.all([loadDepartments(), loadCategories(), loadVendors(), loadEndUsers()]);
        loadAsset();
    });

})();
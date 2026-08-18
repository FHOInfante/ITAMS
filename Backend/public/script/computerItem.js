/* ============================================================
   computerItem.js
   Logic for the Asset Detail / Edit page (computerItem.html)
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

    // ── Permission Helpers ───────────────────────────────────
    // Permission 24 → Edit Asset - Computer (required for ALL 3 edit buttons)
    // Permission 29 → Edit Asset - Computer (Network Fields) (required alongside 24)
    // Permission 22 → Assign Asset - Computer (required alongside 24)
    // Permission 1  → View Audit Trail - Computer
    function getUserPermissions() {
        try {
            const raw = localStorage.getItem("permissions");
            return raw ? JSON.parse(raw) : [];
        } catch { return []; }
    }

    function canViewAuditHistory() {
        return getUserPermissions().includes(1);
    }

    function canEditGeneral() {
        const has = getUserPermissions().includes(24);
        console.log("[Permission 24 — Edit Asset: Computer]", has ? "GRANTED" : "DENIED", "| Permissions:", getUserPermissions());
        return has;
    }
    function canEditNetwork() {
        const perms = getUserPermissions();
        const has = perms.includes(29);
        console.log("[Permission 29 — Edit Asset: Computer (Network Fields)]", has ? "GRANTED" : "DENIED", "| Permissions:", perms);
        return has;
    }
    function canEditEndUser() {
        const perms = getUserPermissions();
        const has = perms.includes(22);
        console.log("[Permission 22 — Assign Asset: Computer]", has ? "GRANTED" : "DENIED", "| Permissions:", perms);
        return has;
    }

    // ── Utilities ────────────────────────────────────────────
    function statusClass(status) {
        if (!status) return "";
        const s = status.toLowerCase();
        if (s.includes("active") || s.includes("available") || s.includes("stock")) return "available";
        if (s.includes("spare")  || s.includes("assign"))                            return "assigned";
        if (s.includes("repair"))                                                     return "repair";
        if (s.includes("defective"))                                                  return "retired";
        return "retired";
    }

    function fmtDate(val) {
        if (!val) return "—";
        // Use local date parts to avoid UTC→local shift on ISO strings like "2022-03-02T16:00:00.000Z"
        const d = new Date(val);
        if (isNaN(d)) return String(val);
        return d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
    }

    // Converts any date value to YYYY-MM-DD for <input type="date"> using LOCAL date parts,
    // so "2022-03-02T16:00:00.000Z" (UTC) correctly yields "2022-03-02" in UTC+8, not "2022-03-01"
    function toLocalDateInput(val) {
        if (!val) return "";
        const d = new Date(val);
        if (isNaN(d)) return "";
        const yyyy = d.getFullYear();
        const mm   = String(d.getMonth() + 1).padStart(2, "0");
        const dd   = String(d.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
    }
    // Returns TODAY as YYYY-MM-DD using LOCAL date parts (not UTC), so users
    // in UTC+ timezones (e.g. PH) aren't blocked from picking "today" during
    // the early-morning hours when UTC is still "yesterday".
    function todayLocalDateInput() {
        const d = new Date();
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
    let assetData      = null;
    let departments    = [];   // populated once by loadDepartments()
    let vendors        = [];   // populated once by loadVendors() → [{ vendor_id, vendor_name }]
    let categories     = {};   // keyed by category_group, e.g. categories["computer.brand"]
    let peripheralList = [];   // populated once by loadPeripherals() → [{ peripheral_id, peripheral_name }]
    let endUserList    = [];   // populated once by loadEndUsers()    → [{ eu_id, eu_name, ... }]
    let programList    = [];   // populated once by loadPrograms()    → [{ program_id, program_name }]
    const computerId = getParam("id");

    // Track which restricted sections are in edit mode independently
    // 'general' = main Edit button scope, 'network' = network card, 'enduser' = assignment card
    const sectionEditState = { network: false, enduser: false };

    // Snapshots of form state taken the moment each edit mode is entered, used to
    // detect no-op saves (Save clicked with nothing actually changed) and skip the API call.
    let generalEditSnapshot    = null;
    const sectionEditSnapshots = { network: null, enduser: null };

    // Set when the user picks an *existing* employee from the name-search dropdown.
    // Drives the "reassign to existing user" branch in saveSectionEdit (PATCH /assign with empId+date only).
    // Reset to null whenever the enduser section edit is cancelled or saved.
    let selectedExistingEuId = null;

    // Fields that get autofilled + locked once an existing employee is picked
    // from the name-search dropdown. Mirrors the equivalent pattern on the
    // Add Asset modal (computer.js) — same lock mechanism, different field ids.
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

    // ── Fetch Vendors ─────────────────────────────────────────
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

    // ── Fetch Categories ─────────────────────────────────────
    async function loadCategories() {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch("/api/category?asset=computer", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) return;
            const list = await res.json();
            // Group by category_group, keeping only active entries
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

    // ── Fetch Peripherals ────────────────────────────────────
    async function loadPeripherals() {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch("/api/peripheral", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) peripheralList = await res.json();
        } catch (err) {
            console.warn("Could not load peripherals:", err);
        }
    }

    // ── Fetch Programs ───────────────────────────────────────
    async function loadPrograms() {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch("/api/program", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) return;
            const raw = await res.json();
            programList = Array.isArray(raw) ? raw : (raw.data ?? raw.programs ?? []);
        } catch (err) {
            console.warn("Could not load programs:", err);
        }
    }

    // ── Fetch End Users ─────────────────────────────────────
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

    // Helper: build a <select> from a category_group key, with a fallback list.
    // No blank "please select" option is injected — sel() already grandfathers
    // in the asset's current value if it isn't in the category/fallback list,
    // so there's never a dead placeholder state to land on.
    function catSel(id, group, fallback, currentValue) {
        const opts = (categories[group] && categories[group].length)
            ? categories[group]
            : fallback;
        return sel(id, opts, currentValue);
    }

    // ── Fetch Asset ──────────────────────────────────────────
    async function loadAsset() {
        if (!computerId) {
            renderError("No asset ID specified in the URL.");
            return;
        }

        try {
            const token = localStorage.getItem("token");

            // 1. Load the computer record
            const res = await fetch(`/api/computer/${computerId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            assetData = await res.json();

            // 2. If an end user is assigned, fetch their full details
            if (assetData.assigned_user_id) {
                try {
                    const euRes = await fetch(`/api/end-user/${assetData.assigned_user_id}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (euRes.ok) {
                        const eu = await euRes.json();
                        // Merge end user fields into assetData using the snake_case keys the page expects
                        assetData = {
                            ...assetData,
                            eu_id:          eu.eu_id,
                            eu_name:        eu.eu_name,
                            eu_emp_id:      eu.eu_emp_id,
                            eu_division:    eu.eu_division,
                            eu_department:  eu.eu_department,
                            department_name: eu.department_name,
                            eu_location:    eu.eu_location,
                            eu_email:       eu.eu_email,
                            eu_contact_no:  eu.eu_contact_no,
                            eu_status:      eu.eu_status ?? "Active",
                        };
                    }
                } catch (euErr) {
                    // Non-fatal: page still renders, end user section will show empty
                    console.warn("Could not load end user details:", euErr);
                }
            }

            console.log("[computerItem] raw assetData from API:", JSON.parse(JSON.stringify(assetData)));
            renderPage(assetData);
        } catch (err) {
            console.error(err);
            renderError("Failed to load asset. Please check the ID or try again.");
        }
    }

    // ── Render Page ──────────────────────────────────────────
    function renderPage(d) {
        const nameLabel = d.computer_name || `Asset #${d.computer_id}`;

        qs("#breadcrumbName").textContent = nameLabel;
        qs("#pageTitle").textContent      = nameLabel;
        document.title = `${nameLabel} — Asset Detail`;

        const badge = qs("#statusBadge");
        badge.textContent = d.computer_status || "Unknown";
        badge.className   = `status-badge ${statusClass(d.computer_status)}`;

        qs("#pageContent").innerHTML = buildLayout(d);
        lucide.createIcons();
        applyRestrictedSectionStates();
        applyGlobalEditButtonState();
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

    /**
     * Builds a single form-group containing both a read-only
     * view-value span and an editable input/select/textarea div.
     * CSS body.view-mode / body.edit-mode toggles which is shown.
     */
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
        // Normalize to { value, label, disabled } objects
        const opts = options.map(o => {
            const v = typeof o === "object" ? o.value : o;
            const l = typeof o === "object" ? o.label : o;
            const dis = typeof o === "object" && !!o.disabled;
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
            .map(o => {
                const attrs = [
                    cv === o.value ? "selected" : "",
                    o.disabled ? "disabled hidden" : ""
                ].filter(Boolean).join(" ");
                return `<option value="${escHtml(o.value)}" ${attrs}>${escHtml(o.label)}</option>`;
            })
            .join("");

        return `<select id="${id}">${optHtml}</select>`;
    }

    // ── Restricted Section Edit State ────────────────────────

    function applyRestrictedSectionStates() {
        ["network", "enduser"].forEach(section => {
            const isEditing = sectionEditState[section];
            qsa(`.section-view-only[data-section="${section}"]`).forEach(el => {
                el.style.display = isEditing ? "none" : "";
            });
            qsa(`.section-edit-only[data-section="${section}"]`).forEach(el => {
                el.style.display = isEditing ? (el.tagName === "SPAN" ? "inline" : "flex") : "none";
            });

            // Toggle button states
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

    function buildSectionEditControls(section, canEdit, permissionLabel, showUnassign = false) {
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

        const unassignBtn = showUnassign
            ? `<button id="sectionUnassignBtn-${section}" class="btn-danger" onclick="window.unassignUser()" style="display:none">
                <i data-lucide="user-x"></i> Unassign
            </button>`
            : "";

        return `
        <div class="section-edit-controls">
            ${unassignBtn}
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
                ${buildSpecsCard(d)}
                ${buildProcurementCard(d)}
                ${buildNetworkCard(d)}
                ${buildAssignmentCard(d)}
            </div>
        </div>`;
    }

    // ── Section Cards ────────────────────────────────────────

    // ── Collapsible section header builder ──────────────────
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

    function buildBasicsCard(d) {
        const statusOpts         = ["Active", "Spare", "Repair", "Defective"];
        const conditionOpts      = ["New", "Used"];
        const brandFallback      = ["Dell", "HP", "Lenovo", "Apple", "Acer", "Asus", "Other"];
        const deviceTypeFallback = ["Laptop", "Desktop", "Workstation", "Server", "Thin Client", "All-in-One"];

        // Parse currently attached peripherals from GROUP_CONCAT comma string
        const checkedNames = new Set(
            d.peripherals
                ? String(d.peripherals).split(",").map(s => s.trim()).filter(Boolean)
                : []
        );

        // View display: comma-joined names or em-dash
        const peripheralViewVal = checkedNames.size
            ? [...checkedNames].join(", ")
            : "—";

        // Edit display: one checkbox per peripheral from peripheralList
        const peripheralCheckboxes = peripheralList.length
            ? peripheralList.map(p => `
                <label class="checkbox-label">
                    <input
                        type="checkbox"
                        id="peripheral_${p.peripheral_id}"
                        data-peripheral-id="${p.peripheral_id}"
                        data-peripheral-name="${escHtml(p.peripheral_name)}"
                        class="peripheral-checkbox"
                        ${checkedNames.has(p.peripheral_name) ? "checked" : ""}
                    />
                    ${escHtml(p.peripheral_name)}
                </label>`).join("")
            : `<span class="empty">No peripherals available</span>`;

        const peripheralEditHtml = `<div class="checkbox-group">${peripheralCheckboxes}</div>`;

        // Parse currently installed programs from GROUP_CONCAT comma string
        const checkedPrograms = new Set(
            d.programs
                ? String(d.programs).split(",").map(s => s.trim()).filter(Boolean)
                : []
        );
        const programViewVal = checkedPrograms.size ? [...checkedPrograms].join(", ") : "—";
        const programCheckboxes = programList.length
            ? programList.map(p => `
                <label class="checkbox-label">
                    <input
                        type="checkbox"
                        id="program_${p.program_id}"
                        data-program-id="${p.program_id}"
                        data-program-name="${escHtml(p.program_name)}"
                        class="program-checkbox"
                        ${checkedPrograms.has(p.program_name) ? "checked" : ""}
                    />
                    ${escHtml(p.program_name)}
                </label>`).join("")
            : `<span class="empty">No programs available</span>`;
        const programEditHtml = `<div class="checkbox-group">${programCheckboxes}</div>`;

        return `
        <div class="section-card" id="card-basics">
            ${sectionHeader("card-basics", "monitor", "Asset Basics", "Identification and classification")}
            <div class="section-body form-grid">
                ${fg("Computer Name",   val(d.computer_name),  inp("computer_name",  d.computer_name, "text", "e.g. PC-FINANCE-01"))}
                ${fg("Serial Number",   val(d.serial_no),       inp("serial_no",       d.serial_no,     "text", "",                  true), true)}
                ${fg("Brand",           val(d.brand),           catSel("brand",        "computer.brand",       brandFallback,      d.brand),       true)}
                ${fg("Model",           val(d.model),           inp("model",           d.model,         "text", "",                  true), true)}
                ${fg("Device Type",     val(d.device_type),     catSel("device_type",  "computer.device_type", deviceTypeFallback, d.device_type), true)}
                ${fg("Status",          val(d.computer_status), sel("computer_status", statusOpts,             d.computer_status),                 true)}
                ${fg("Asset Condition", val(d.asset_condition), catSel("asset_condition", "computer.asset_condition", conditionOpts, d.asset_condition), true)}
                ${fg("Asset Tag",       val(d.asset_tag),       inp("asset_tag",       d.asset_tag,     "text", "e.g. IT-0001"),     false, true)}
                ${fg("MAC Address",     val(d.mac_address),     inp("mac_address",     d.mac_address,   "text", "e.g. AA:BB:CC:DD:EE:FF"), false, true)}
                ${fg("AnyDesk IP",      val(d.anydesk_ip),      inp("anydesk_ip",      d.anydesk_ip,    "text", "e.g. 123 456 789"),       false, true)}
                ${fg("Peripherals",     peripheralViewVal,      peripheralEditHtml,    false, true)}
                ${fg("Programs",        programViewVal,         programEditHtml,       false, true)}
            </div>
        </div>`;
    }

    function buildSpecsCard(d) {
        const osFallback      = ["Windows 10", "Windows 11", "Windows Server 2019", "Windows Server 2022", "macOS", "Ubuntu", "Other"];
        const ramFallback     = ["2 GB", "4 GB", "8 GB", "16 GB", "32 GB", "64 GB", "128 GB"];
        const stTypeFallback  = ["HDD", "SSD", "NVMe SSD", "eMMC", "Hybrid"];
        const stCapFallback   = ["128 GB", "256 GB", "512 GB", "1 TB", "2 TB", "4 TB"];

        return `
        <div class="section-card" id="card-specs">
            ${sectionHeader("card-specs", "cpu", "System Specifications", "Hardware and OS configuration")}
            <div class="section-body form-grid">
                ${fg("Operating System",  val(d.operating_system), catSel("operating_system", "computer.operating_system", osFallback,     d.operating_system), true)}
                ${fg("Processor",         val(d.processor),         inp("processor",            d.processor, "text", "e.g. Intel Core i7-1165G7", true),          true)}
                ${fg("RAM Size",          val(d.ram_size),          catSel("ram_size",          "computer.ram_size",        ramFallback,    d.ram_size),           true)}
                ${fg("Storage Type",      val(d.storage_type),      catSel("storage_type",      "computer.storage_type",    stTypeFallback, d.storage_type),       true)}
                ${fg("Storage Capacity",  val(d.storage_capacity),  catSel("storage_capacity",  "computer.storage_capacity",stCapFallback,  d.storage_capacity),   true)}
            </div>
        </div>`;
    }

    function buildNetworkCard(d) {
        const netOpts = [{ value: "", label: "Select connectivity", disabled: true }, "WIFI", "LAN", "WIFI & LAN"];
        const vpnOpts = [{ value: "Yes", label: "Yes" }, { value: "No", label: "No" }];
        const vpnDisp = d.has_vpn_access != null ? (d.has_vpn_access ? "Yes" : "No") : "—";
        const canEdit = canEditNetwork();

        return `
        <div class="section-card" id="section-card-network">
            ${sectionHeader("section-card-network", "network", "Network &amp; Connectivity", "IP address, VPN, and connectivity", buildSectionEditControls("network", canEdit, "Edit Asset: Computer"))}
            <div class="section-body form-grid">
                ${fgRestricted("network", "IP Address",           val(d.ip_address),           inp("ip_address",           d.ip_address,           "text", "e.g. 192.168.1.10", true), true)}
                ${fgRestricted("network", "VPN Access",           vpnDisp,                     sel("has_vpn_access",       vpnOpts,                vpnDisp),                       true)}
                ${fgRestricted("network", "Network Connectivity", val(d.network_connectivity), sel("network_connectivity", netOpts,                d.network_connectivity), true)}
            </div>
        </div>`;
    }

    function buildProcurementCard(d) {
        const costDisplay = d.cost != null
            ? Number(d.cost).toLocaleString("en-PH", { minimumFractionDigits: 2 })
            : "—";
        const receivedVal   = toLocalDateInput(d.received_date);
        const toReturnByVal = toLocalDateInput(d.to_return_by);
        const warrantyVal  = toLocalDateInput(d.warranty_expiry);

        // Vendor searchable combo — mirrors computer.js's "Add Asset" vendor field.
        // #vendor holds the display name that actually gets submitted; #vendorId is a
        // UI-only guard (mirrors computer.js) that must be set before saving is allowed,
        // forcing the user to pick a vendor from the list rather than free-typing one.
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
                ${fg("Vendor / Supplier", val(d.vendor),         vendorInput,             true)}
                ${fg("Cost (₱)",          val(costDisplay),       inp("cost",            d.cost,          "number", "0.00"), false, true)}
                ${fg("Received Date",     fmtDate(d.received_date),   inp("received_date",   receivedVal, "date",   "",     true), true)}
                ${fg("Warranty Expiry",   fmtDate(d.warranty_expiry), inp("warranty_expiry", warrantyVal, "date"), false, true)}
                ${fg("To Return By",      fmtDate(d.to_return_by),    inp("to_return_by",    toReturnByVal, "date"), false, true)}
                ${fg("Remarks",           val(d.remarks), `<textarea id="remarks" placeholder="Any notes about this asset…">${escHtml(d.remarks || "")}</textarea>`, false, true)}
            </div>
        </div>`;
    }

    function buildAssignmentCard(d) {
        const assignedDateVal = toLocalDateInput(d.assigned_date);
        const canEdit = canEditEndUser();
        const deptDisplay = d.department_name || d.eu_department || "—";

        // Build department searchable dropdown

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

        // Name search combo HTML (shown only in edit mode)
        const nameSearchHtml = `
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
        </div>`;

        return `
        <div class="section-card" id="section-card-enduser">
            ${sectionHeader("section-card-enduser", "user-check", "End User Assignment", "Assigned employee information", buildSectionEditControls("enduser", canEdit, "Edit Asset: Computer", true))}
            <div class="section-body form-grid">
                <div class="group-label section-edit-only" data-section="enduser" style="display:none">Search Employee</div>
                <div class="form-group full section-edit-only" data-section="enduser" style="display:none">
                    <label class="form-label">Search by Name</label>
                    <div>${nameSearchHtml}</div>
                </div>
                <div class="group-label">Employee Record</div>
                ${fgRestricted("enduser", "Employee ID", val(d.eu_emp_id),     inp("eu_emp_id",     d.eu_emp_id,     "text",  "", true), true)}
                ${fgRestricted("enduser", "Full Name",   val(d.eu_name),       inp("eu_name",       d.eu_name,       "text",  "", true), true)}
                ${fgRestricted("enduser", "Division",    val(d.eu_division),   inp("eu_division",   d.eu_division,   "text",  "", true), true)}
                ${fgRestricted("enduser", "Department",  val(deptDisplay),     deptInput,                            true)}
                ${fgRestricted("enduser", "Location",    val(d.eu_location),   locationInput,                        true)}
                ${fgRestricted("enduser", "Email",       val(d.eu_email),      inp("eu_email",      d.eu_email,      "email", "user@company.com"))}
                ${fgRestricted("enduser", "Contact No.", val(d.eu_contact_no), inp("eu_contact_no", d.eu_contact_no, "text",  "+63…"))}
                ${fgRestricted("enduser", "Status",      val(d.eu_status),     sel("eu_status", [{ value: "Active", label: "Active" }, { value: "Inactive", label: "Inactive" }, { value: "Resigned", label: "Resigned" }], d.eu_status ?? "Active"), true)}
                <hr class="divider" />
                <div class="group-label">Assignment Details</div>
                ${fgRestricted("enduser", "Assigned Date", fmtDate(d.assigned_date), inp("assigned_date", assignedDateVal, "date"))}
                ${fgRestricted("enduser", "To Return By", fmtDate(d.to_return_by), inp("eu_to_return_by", toLocalDateInput(d.to_return_by), "date"))}
            </div>
        </div>`;
    }

    // ── Quick Info Bar (full-width, top of page) ─────────────

    function buildQuickInfoBar(d) {
        const warrantyOk = d.warranty_expiry && new Date(d.warranty_expiry) > new Date();
        const wLabel = warrantyOk
            ? `<span style="color:#15803d">✓ Valid until ${fmtDate(d.warranty_expiry)}</span>`
            : (d.warranty_expiry
                ? `<span style="color:#dc2626">⚠ Expired ${fmtDate(d.warranty_expiry)}</span>`
                : "—");

        const name  = d.eu_name || d.assigned_user_name;
        const empId = d.eu_emp_id || d.assigned_user_emp_id;
        const dept  = d.department_name || d.eu_department;

        const userBlock = name
            ? `<div class="assigned-card quick-info-dept">
                   <div class="user-avatar">
                       ${initials(name)}
                   </div>
                   <div class="user-info">
                       <div class="name">${escHtml(name)}</div>
                       <div class="meta">
                           ${empId ? `ID: ${escHtml(String(empId))}` : ""}
                           ${empId && dept ? " · " : ""}
                           ${escHtml(dept || "")}
                           ${d.eu_location ? ` · Location: ${escHtml(d.eu_location)}` : ""}
                       </div>
                   </div>
               </div>`
            : `<div class="no-user quick-info-dept">No user assigned</div>`;

        return `
        <div class="section-card quick-info-bar">
            <div class="section-header">
                <div class="section-icon"><i data-lucide="info"></i></div>
                <div class="section-header-text">
                    <div class="section-title-text">Quick Info</div>
                </div>
                ${canViewAuditHistory()
                    ? `<a href="auditLogs.html?audit=computer:${d.computer_id}"
                        class="audit-log-btn" title="View audit trail for this asset">
                            <i data-lucide="history"></i>
                            View History
                        </a>`
                    : `<div class="perm-btn-wrapper" data-tooltip="You need View Audit Trail - Computer permission to view this asset's history.">
                        <span class="audit-log-btn audit-log-btn-disabled">
                            <i data-lucide="history"></i>
                            View History
                        </span>
                    </div>`
                }
            </div>
            <div class="info-grid">
                <div class="info-cell"><span class="label">Asset Tag</span>    <span class="value">${val(d.asset_tag)}</span></div>
                <div class="info-cell"><span class="label">Serial No.</span>   <span class="value">${val(d.serial_no)}</span></div>
                <div class="info-cell"><span class="label">Brand / Model</span><span class="value">${val(d.brand)}${d.brand && d.model ? " " : ""}${val(d.model)}</span></div>
                <div class="info-cell"><span class="label">Warranty</span>     <span class="value">${wLabel}</span></div>
                <div class="info-cell"><span class="label">Condition</span>    <span class="value">${val(d.asset_condition)}</span></div>
                <div class="info-cell"><span class="label">VPN Access</span>   <span class="value">${d.has_vpn_access ? "✓ Yes" : "✗ No"}</span></div>
                <div class="info-cell"><span class="label">AnyDesk IP</span>   <span class="value">${val(d.anydesk_ip)}</span></div>
            </div>
            ${userBlock}
        </div>`;
    }

    // ── Collapsible Sections ─────────────────────────────────

    window.toggleSection = function (cardId, event) {
        // Don't collapse when clicking buttons inside the header (edit/save/cancel)
        if (event && event.target.closest("button, .perm-btn-wrapper")) return;
        const card = qs(`#${cardId}`);
        if (!card) return;
        card.classList.toggle("collapsed");
    };

    // ── Change Detection Helpers ──────────────────────────────
    // Used to disallow "saving" a section when nothing was actually edited.

    // Collects the current state of the general (main Edit button) form fields,
    // mirroring the exact field selection used by saveChanges().
    function collectGeneralFormState() {
        const inputs = qsa("#pageContent input[id], #pageContent select[id], #pageContent textarea[id]");
        const raw = {};
        for (const el of inputs) {
            if (el.closest(".section-edit-only[data-section]")) continue;
            if (el.classList.contains("peripheral-checkbox")) continue;
            if (el.classList.contains("program-checkbox"))    continue;

            if (el.type === "checkbox") {
                raw[el.id] = el.checked;
            } else if (el.id === "cost") {
                const parsed = parseFloat(el.value);
                raw[el.id] = isNaN(parsed) ? null : parsed;
            } else {
                raw[el.id] = el.value.trim() || null;
            }
        }
        const peripherals = qsa(".peripheral-checkbox:checked").map(cb => cb.dataset.peripheralName).sort();
        const programs    = qsa(".program-checkbox:checked").map(cb => cb.dataset.programName).sort();
        return JSON.stringify({ raw, peripherals, programs });
    }

    // Collects the current state of a restricted section's (network/enduser) form fields,
    // mirroring the exact field selection used by saveSectionEdit().
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

    // ── Global Edit Button State ─────────────────────────────
    // Mirrors the perm-locked pattern used by buildSectionEditControls().
    // Called after every renderPage() to swap the static HTML edit button
    // into a disabled+tooltip state when the user lacks permission 24.
    function applyGlobalEditButtonState() {
        const container = qs("#globalEditBtnContainer");
        if (!container) return;

        if (canEditGeneral()) {
            container.innerHTML = `
            <button class="btn-secondary" onclick="window.enterEditMode()">
                <i data-lucide="pencil"></i> Edit
            </button>`;
        } else {
            container.innerHTML = `
            <div class="perm-btn-wrapper tooltip-bottom" data-tooltip="You need Edit Asset: Computer permission to edit this asset.">
                <button class="btn-secondary section-edit-btn perm-locked" disabled>
                    <i data-lucide="lock"></i> Edit
                </button>
            </div>`;
        }
        lucide.createIcons();
    }

    window.enterEditMode = function () {
        if (!canEditGeneral()) return;   // button is disabled; guard kept as safety net
        document.body.className = "edit-mode";
        qs("#editModeBar").classList.add("visible");
        generalEditSnapshot = collectGeneralFormState();
        lucide.createIcons();
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
        sectionEditState.network = false;
        sectionEditState.enduser = false;
        renderPage(assetData);
    };

    // ── Inline field error helper (mirrors computer.js) ────────
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

    // ── Date validation helpers (mirrors computer.js) ────────
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
        const today = todayLocalDateInput();
        let valid = true;
        const received = qs("#received_date")?.value;
        if (received && received > today) {
            setDateError("received_date", "Received date cannot be a future date.");
            valid = false;
        } else {
            setDateError("received_date", null);
        }
        setDateError("warranty_expiry", null);
        return valid;
    }

    // Set browser-level max constraint on the Received Date input so the
    // native calendar picker greys out / disables future dates (mirrors computer.js)
    function applyDateConstraints() {
        const today = todayLocalDateInput();
        const recv = qs("#received_date");
        if (recv) recv.max = today;   // no future dates
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
            // Peripheral and program checkboxes are collected separately below
            if (el.classList.contains("peripheral-checkbox")) continue;
            if (el.classList.contains("program-checkbox"))    continue;

            if (el.type === "checkbox") {
                raw[el.id] = el.checked;
            } else if (el.id === "cost") {
                const parsed = parseFloat(el.value);
                raw[el.id] = isNaN(parsed) ? null : parsed;
            } else {
                raw[el.id] = el.value.trim() || null;
            }
        }

        // ── Inline validation (mirrors computer.js validateStep) ──
        const requiredFields = [
            { id: "serial_no",        label: "Serial Number" },
            { id: "brand",            label: "Brand" },
            { id: "model",            label: "Model" },
            { id: "device_type",      label: "Device Type" },
            { id: "computer_status",  label: "Status" },
            { id: "asset_condition",  label: "Asset Condition" },
            { id: "operating_system", label: "Operating System" },
            { id: "processor",        label: "Processor" },
            { id: "ram_size",         label: "RAM Size" },
            { id: "storage_type",     label: "Storage Type" },
            { id: "storage_capacity", label: "Storage Capacity" },
            { id: "vendor",           label: "Vendor / Supplier" },
            { id: "received_date",    label: "Received Date" },
        ];

        let valid = true;
        requiredFields.forEach(({ id, label }) => {
            const v = raw[id];
            const isEmpty = v === null || v === undefined || v === "";
            if (isEmpty) {
                setFieldError(id, `${label} is required.`);
                valid = false;
            } else {
                setFieldError(id, null);
            }
        });

        // Vendor must be picked from the dropdown, not free-typed (mirrors computer.js).
        // Only checked once we know the field isn't simply empty (handled above).
        if (raw.vendor && !qs("#vendorId")?.value) {
            setFieldError("vendor", "Please select a vendor from the list.");
            valid = false;
        }

        // Cost — optional, but if provided must be a valid number
        if (raw.cost !== null && isNaN(raw.cost)) {
            setFieldError("cost", "Cost must be a valid number.");
            valid = false;
        } else {
            setFieldError("cost", null);
        }

        if (!valid) {
            showToast("Please fix the highlighted fields.", "error");
            return;
        }

        // Date range validation
        if (!validateDates()) return;

        // Collect checked peripheral checkboxes → [{ peripheral_name }]
        const peripherals = qsa(".peripheral-checkbox:checked").map(cb => ({
            peripheral_name: cb.dataset.peripheralName
        }));

        // Collect checked program checkboxes → [{ program_id, program_name }]
        const programs = qsa(".program-checkbox:checked").map(cb => ({
            program_id:   parseInt(cb.dataset.programId, 10),
            program_name: cb.dataset.programName
        }));

        // Map snake_case input IDs → camelCase API field names expected by PUT /computer/{id}
        const payload = {
            computerName:        raw.computer_name,
            serialNo:            raw.serial_no,
            brand:               raw.brand,
            model:               raw.model,
            deviceType:          raw.device_type,
            computerStatus:      raw.computer_status,
            assetCondition:      raw.asset_condition,
            assetTag:            raw.asset_tag            || null,
            macAddress:          raw.mac_address          || null,
            anyDeskIp:           raw.anydesk_ip           || null,
            operatingSystem:     raw.operating_system,
            processor:           raw.processor,
            ramSize:             raw.ram_size,
            storageType:         raw.storage_type,
            storageCapacity:     raw.storage_capacity,
            // Network fields — carry over current values (network has its own save button)
            ipAddress:           assetData.ip_address           || null,
            networkConnectivity: assetData.network_connectivity || null,
            hasVpnAccess:        assetData.has_vpn_access       ?? false,
            vendor:              raw.vendor,
            cost:                raw.cost,
            receivedDate:        raw.received_date,
            warrantyExpiry:      raw.warranty_expiry,
            remarks:             raw.remarks                    || null,
            toReturnBy:          raw.to_return_by               || null,
            peripherals,
            programs,
        };

        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`/api/computer/${computerId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({ message: "Unknown error" }));
                throw new Error(err.message || `HTTP ${res.status}`);
            }

            // Update local peripherals/programs state as comma strings to match GROUP_CONCAT format
            assetData = {
                ...assetData,
                ...raw,
                peripherals: peripherals.map(p => p.peripheral_name).join(","),
                programs:    programs.map(p => p.program_name).join(",")
            };
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

    window.unassignUser = async function () {
        if (!assetData.assigned_user_id) return;
        const ok = await showConfirmDialog({
            title: "Unassign this user?",
            message: "This will remove the current user from this asset. This cannot be undone.",
            confirmLabel: "Unassign",
            danger: true,
        });
        if (!ok) return;

        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`/api/computer/${computerId}/assign`, {
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
                to_return_by:     null,
            };

            renderPage(assetData);
            showToast("User unassigned successfully.", "success");

        } catch (err) {
            console.error(err);
            showToast(`Unassign failed: ${err.message}`, "error");
        }
    };

    // ── Vendor Searchable Dropdown ────────────────────────────
    // Mirrors initDeptSearch(): #vendor is the visible text input holding the
    // display name that gets submitted, #vendorId is a UI-only guard that must
    // be set (by picking an option) before saveChanges() will allow a save.
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

            // Click handler for each option
            qsa(".dept-option[data-id]", dropdown).forEach(el => {
                el.addEventListener("mousedown", e => {
                    e.preventDefault();   // keep focus on input briefly so blur doesn't fire first
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
            // Clear hidden value while user is typing (forces them to pick from list)
            hiddenInput.value = "";
            renderList(searchInput.value);
            dropdown.classList.add("open");
        });

        searchInput.addEventListener("blur", () => {
            // Small delay so mousedown on an option fires first
            setTimeout(() => {
                dropdown.classList.remove("open");
                // If user typed something but didn't pick, restore last valid name
                if (!hiddenInput.value) {
                    const match = departments.find(d =>
                        d.department_name.toLowerCase() === searchInput.value.toLowerCase()
                    );
                    if (match) {
                        hiddenInput.value = match.department_id;
                    } else {
                        // Revert to original value
                        searchInput.value = assetData.department_name || "";
                        hiddenInput.value = assetData.eu_department   || "";
                    }
                }
            }, 150);
        });
    }

    // ── End-User Name Searchable Dropdown ───────────────────
    function initEndUserSearch() {
        const searchInput = qs("#eu-name-search-input");
        const dropdown    = qs("#eu-name-dropdown");
        const clearBtn    = qs("#eu-name-clear-btn");
        if (!searchInput || !dropdown) return;

        function renderList(filter) {
            const q = filter.toLowerCase().trim();
            const matches = q
                ? endUserList.filter(u => (u.eu_name || "").toLowerCase().includes(q))
                : endUserList.slice(0, 20);  // show first 20 on blank focus

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

        searchInput.addEventListener("focus", () => {
            renderList(searchInput.value);
            dropdown.classList.add("open");
        });
        searchInput.addEventListener("input", () => {
            // Typing again after a prior pick means the old selection no longer
            // applies — unlock the fields so they can either pick someone new
            // from the list or hand-type a brand-new employee's details.
            clearExistingEuSelection();
            renderList(searchInput.value);
            dropdown.classList.add("open");
        });
        searchInput.addEventListener("blur", () => {
            setTimeout(() => dropdown.classList.remove("open"), 150);
        });

        // Keyboard navigation
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

        // Populate all editable end-user fields
        const setVal = (id, v) => { const el = qs(`#${id}`); if (el) el.value = v ?? ""; };

        setVal("eu_emp_id",     u.eu_emp_id);
        setVal("eu_name",       u.eu_name);
        setVal("eu_division",   u.eu_division);
        setVal("eu_email",      u.eu_email);
        setVal("eu_contact_no", u.eu_contact_no ?? u.eu_contact_number);

        // Department: text input + hidden id
        const deptInput  = qs("#dept-search-input");
        const deptHidden = qs("#eu_department");
        if (deptInput)  deptInput.value  = u.department_name ?? "";
        if (deptHidden) deptHidden.value = u.eu_department   ?? u.department_id ?? "";

        // Location: select
        const locEl = qs("#eu_location");
        if (locEl) locEl.value = u.eu_location ?? "";
        const statusEl = qs("#eu_status");
        if (statusEl) statusEl.value = u.eu_status ?? "Active";

        // Lock the autofilled fields so they can't be hand-edited while an
        // existing employee is selected. This also reveals the X button.
        setEndUserFieldsLocked(true);
    }

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
            card.outerHTML = section === "network" ? buildNetworkCard(assetData) : buildAssignmentCard(assetData);
            lucide.createIcons();
        }
        applyRestrictedSectionStates();
    };

    // to_return_by lives on the computer record — it's populated by GET /api/computer/:id
    // and, up to now, only ever saved through PUT /api/computer/:id (the same call
    // saveChanges() makes from the Procurement card). It does NOT live on /assign or
    // /end-user/:id, so those endpoints don't persist it even if you pass it in the body.
    // This rebuilds the exact same full payload saveChanges() sends, sourced from the
    // already-loaded assetData instead of the general edit form (which isn't open here),
    // with just to_return_by swapped for the new value — then PUTs it the same way.
    async function saveToReturnByOnComputer(newValue) {
        const token = localStorage.getItem("token");

        const peripherals = String(assetData.peripherals || "")
            .split(",")
            .map(n => n.trim())
            .filter(Boolean)
            .map(name => ({ peripheral_name: name }));

        const programs = String(assetData.programs || "")
            .split(",")
            .map(n => n.trim())
            .filter(Boolean)
            .map(name => {
                const match = programList.find(p => p.program_name === name);
                return { program_id: match ? match.program_id : null, program_name: name };
            });

        const payload = {
            computerName:        assetData.computer_name,
            serialNo:            assetData.serial_no,
            brand:               assetData.brand,
            model:               assetData.model,
            deviceType:          assetData.device_type,
            computerStatus:      assetData.computer_status,
            assetCondition:      assetData.asset_condition,
            assetTag:            assetData.asset_tag            || null,
            macAddress:          assetData.mac_address          || null,
            anyDeskIp:           assetData.anydesk_ip           || null,
            operatingSystem:     assetData.operating_system,
            processor:           assetData.processor,
            ramSize:             assetData.ram_size,
            storageType:         assetData.storage_type,
            storageCapacity:     assetData.storage_capacity,
            ipAddress:           assetData.ip_address           || null,
            networkConnectivity: assetData.network_connectivity || null,
            hasVpnAccess:        assetData.has_vpn_access        ?? false,
            vendor:              assetData.vendor,
            cost:                assetData.cost,
            receivedDate:        toLocalDateInput(assetData.received_date)   || null,
            warrantyExpiry:      toLocalDateInput(assetData.warranty_expiry) || null,
            remarks:             assetData.remarks              || null,
            toReturnBy:          newValue,
            peripherals,
            programs,
        };

        const res = await fetch(`/api/computer/${computerId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({ message: "Unknown error" }));
            throw new Error(err.message || `HTTP ${res.status}`);
        }
    }

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
                card.outerHTML = section === "network" ? buildNetworkCard(assetData) : buildAssignmentCard(assetData);
                lucide.createIcons();
            }
            applyRestrictedSectionStates();
            return;
        }

        // Collect raw values from this section's inputs (snake_case IDs)
        const inputs = qsa("input[id], select[id], textarea[id]", sectionCard);
        const raw    = {};
        for (const el of inputs) {
            raw[el.id] = el.value.trim() || null;
        }

        const token = localStorage.getItem("token");

        // ── Network: PATCH /computer/{id}/network ─────────────
        if (section === "network") {
            const networkRequired = [
                { id: "ip_address",           label: "IP Address" },
                { id: "network_connectivity", label: "Network Connectivity" },
            ];

            let netValid = true;
            networkRequired.forEach(({ id, label }) => {
                if (!raw[id]) {
                    setFieldError(id, `${label} is required.`);
                    netValid = false;
                } else {
                    setFieldError(id, null);
                }
            });

            if (!netValid) {
                showToast("Please fix the highlighted field(s).", "error");
                qs("#ip_address", sectionCard)?.focus();
                return;
            }

            const payload = {
                ipAddress:           raw.ip_address,
                networkConnectivity: raw.network_connectivity || null,
                hasVpnAccess:        raw.has_vpn_access === "Yes",
            };

            try {
                const res = await fetch(`/api/computer/${computerId}/network`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                    body: JSON.stringify(payload)
                });

                if (!res.ok) {
                    const err = await res.json().catch(() => ({ message: "Unknown error" }));
                    throw new Error(err.message || `HTTP ${res.status}`);
                }

                // Persist back to local state (snake_case)
                assetData = {
                    ...assetData,
                    ip_address:           raw.ip_address,
                    network_connectivity: raw.network_connectivity || null,
                    has_vpn_access:       raw.has_vpn_access === "Yes",
                };

            } catch (err) {
                console.error(err);
                showToast(`Save failed: ${err.message}`, "error");
                return;
            }
        }

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
                // Editing or creating — need all fields
                requiredEu.push("eu_name", "eu_division", "eu_department", "eu_location");
            }
            // assigned_date required for new assignment or reassign
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
                    // API only needs euEmpId + assignedDate; sending full payload causes 409.
                    const payload = {
                        euEmpId:      Number(raw.eu_emp_id),
                        assignedDate: raw.assigned_date,
                    };

                    res = await fetch(`/api/computer/${computerId}/assign`, {
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
                        assignedDate: raw.assigned_date,
                        euName:       raw.eu_name,
                        euDivision:   raw.eu_division,
                        euDepartment: raw.eu_department,
                        euLocation:   raw.eu_location,
                        euEmail:      raw.eu_email      || null,
                        euContactNo:  raw.eu_contact_no || null,
                    };

                    res = await fetch(`/api/computer/${computerId}/assign`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                        body: JSON.stringify(payload)
                    });
                }

                if (!res.ok) {
                    const err = await res.json().catch(() => ({ message: "Unknown error" }));
                    throw new Error(err.message || `HTTP ${res.status}`);
                }

                // to_return_by is a computer-record field — it never goes through
                // /assign or /end-user/:id (neither endpoint persists it). Whenever it
                // was changed in the End User Assignment box, save it separately through
                // the same computer PUT endpoint the Procurement card uses.
                const prevToReturnBy = toLocalDateInput(assetData.to_return_by) || "";
                const nextToReturnBy = raw.eu_to_return_by || "";
                if (prevToReturnBy !== nextToReturnBy) {
                    await saveToReturnByOnComputer(raw.eu_to_return_by || null);
                }

                const resJson = await res.json().catch(() => ({}));

                // Resolve the department display name from the already-loaded departments list
                const resolvedDeptName =
                    departments.find(d => d.department_id === Number(raw.eu_department))?.department_name
                    ?? assetData.department_name
                    ?? null;

                // For Branch A (reassign existing), the new assigned_user_id comes from the
                // employee that was picked in the search dropdown.
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
                    to_return_by:     raw.eu_to_return_by || null,
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

        // Success — exit section edit mode and re-render the card
        sectionEditState[section] = false;
        const card = qs(`#section-card-${section}`);
        if (card) {
            card.outerHTML = section === "network" ? buildNetworkCard(assetData) : buildAssignmentCard(assetData);
            lucide.createIcons();
        }
        applyRestrictedSectionStates();
        showToast("Section saved successfully.", "success");
    };

    // ── Init ─────────────────────────────────────────────────
    document.addEventListener("DOMContentLoaded", async () => {
        await Promise.all([loadDepartments(), loadVendors(), loadCategories(), loadPeripherals(), loadPrograms(), loadEndUsers()]);
        loadAsset();
    });

})();
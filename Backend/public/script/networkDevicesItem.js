/* ============================================================
   networkDevicesItem.js
   Logic for the Network Device Detail / Edit page (networkDevicesItem.html)
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

    // ── State ────────────────────────────────────────────────
    let assetData  = null;
    let categories = {};   // keyed by category_group, e.g. categories["network_device.brand"]
    let vendors    = [];   // [{ vendor_id, vendor_name }] — from /api/vendor
    const deviceId = getParam("id");

    // Snapshot of form state taken the moment edit mode is entered, used to detect
    // no-op saves (Save clicked with nothing actually changed) and skip the API call.
    let generalEditSnapshot = null;

    // ── Location options ─────────────────────────────────────
    const LOCATION_OPTS = ["B2","B1","GF","2F","3F","4F","5F","6F","7F","8F","PO"];

    // ── Fetch Categories ─────────────────────────────────────
    async function loadCategories() {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch("/api/category?asset=network_device", {
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

    // Helper: build a searchable combo box from a category_group key, with fallback
    function catCombo(id, group, fallback, currentValue) {
        const opts = (categories[group] && categories[group].length)
            ? categories[group]
            : fallback;
        return combo(id, opts, currentValue);
    }

    // ── Fetch Asset ──────────────────────────────────────────
    async function loadAsset() {
        if (!deviceId) {
            renderError("No network device ID specified in the URL.");
            return;
        }

        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`/api/network-device/${deviceId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            assetData = await res.json();

            // The API may return either a single object or a wrapped array
            if (Array.isArray(assetData)) assetData = assetData[0];

            renderPage(assetData);
        } catch (err) {
            console.error(err);
            renderError("Failed to load network device. Please check the ID or try again.");
        }
    }

    // ── Render Page ──────────────────────────────────────────
    function renderPage(d) {
        const nameLabel = d.network_device_name || d.asset_tag || `Device #${d.network_device_id}`;

        qs("#breadcrumbName").textContent = nameLabel;
        qs("#pageTitle").textContent      = nameLabel;
        document.title = `${nameLabel} — Network Device Detail`;

        const badge = qs("#statusBadge");
        badge.textContent = d.asset_status || "Unknown";
        badge.className   = `status-badge ${statusClass(d.asset_status)}`;

        // Swap the header Edit button based on permission 28
        const viewActions = qs("#viewActions");
        if (viewActions) {
            if (canEditNetwork()) {
                viewActions.innerHTML = `
                    <button class="btn-secondary" onclick="enterEditMode()">
                        <i data-lucide="pencil"></i> Edit
                    </button>`;
            } else {
                viewActions.innerHTML = `
                    <div class="perm-btn-wrapper tooltip-bottom" data-tooltip="You need Edit Asset - Network Device to edit.">
                        <button class="btn-secondary section-edit-btn perm-locked" disabled>
                            <i data-lucide="lock"></i> Edit
                        </button>
                    </div>`;
            }
        }

        qs("#pageContent").innerHTML = buildLayout(d);
        lucide.createIcons();
        initSearchableCombos();
        initVendorSearch();
        applyDateConstraints();
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

    // Searchable combo box (text input + dropdown list), with hidden value
    // matching the same input id (the input itself carries the value).
    function combo(id, options, currentValue) {
        return `
        <div class="dept-search-wrap" id="${id}-wrap">
            <input
                type="text"
                id="${id}"
                class="dept-search-input"
                placeholder="Search or type…"
                autocomplete="off"
                value="${escHtml(iVal(currentValue))}"
                data-combo-options='${escHtml(JSON.stringify(options))}'
            />
            <div class="dept-dropdown" id="${id}-dropdown"></div>
        </div>`;
    }

    // ── Layout ───────────────────────────────────────────────
    function buildLayout(d) {
        return `
        ${buildQuickInfoBar(d)}
        <div class="main-col">
            ${buildBasicsCard(d)}      
            ${buildProcurementCard(d)}
        </div>
        ${buildNetworkCard(d)}`;
    }

    // ── Permission Helpers ───────────────────────────────────
    // Permission 28 → Edit Asset - Network Device (required for all edit buttons)
    // Permission 5  → View Audit Trail - Network Device
    function getUserPermissions() {
        try {
            const raw = localStorage.getItem("permissions");
            return raw ? JSON.parse(raw) : [];
        } catch { return []; }
    }

    function canViewAuditHistory() {
        return getUserPermissions().includes(5);
    }

    function canEditNetwork() {
        const has = getUserPermissions().includes(28);
        console.log("[Permission 28 — Edit Asset: Network Device]", has ? "GRANTED" : "DENIED", "| Permissions:", getUserPermissions());
        return has;
    }


    // ── Collapsible section header ───────────────────────────
    function sectionHeader(cardId, icon, title, subtitle) {
        return `
        <div class="section-header collapsible-header" onclick="window.toggleSection('${cardId}', event)">
            <div class="section-icon"><i data-lucide="${icon}"></i></div>
            <div class="section-header-text">
                <div class="section-title-text">${title}</div>
                ${subtitle ? `<div class="section-subtitle">${subtitle}</div>` : ""}
            </div>
            <div class="collapse-chevron"><i data-lucide="chevron-down"></i></div>
        </div>`;
    }

    // ── Section Cards ────────────────────────────────────────

    function buildBasicsCard(d) {
        const statusOpts    = ["Active", "Spare", "Repair", "Defective"];
        const conditionOpts = ["New", "Used"];
        const typeOpts      = ["Switch", "Router", "Access Point", "Firewall", "Modem", "Patch Panel", "Other"];
        const brandFallback = ["Cisco", "Ubiquiti", "TP-Link", "Netgear", "Aruba", "Huawei", "Other"];

        return `
        <div class="section-card" id="card-basics">
            ${sectionHeader("card-basics", "router", "Device Basics", "Identification and classification")}
            <div class="section-body form-grid">
                ${fg("Serial Number",  val(d.serial_no),          inp("serial_no",  d.serial_no,  "text", "", true), true)}
                ${fg("Brand",          val(d.brand),              catCombo("brand", "network_device.brand", brandFallback, d.brand), true)}
                ${fg("Model",          val(d.model),              inp("model",      d.model,      "text", "e.g. Catalyst 2960", true), true)}
                ${fg("Device Type",    val(d.device_type),        catSel("device_type", "network_device.device_type", typeOpts, d.device_type), true)}
                ${fg("Status",         val(d.asset_status),       sel("asset_status",    statusOpts,    d.asset_status), true)}
                ${fg("Condition",      val(d.asset_condition),    sel("asset_condition", conditionOpts, d.asset_condition), true)}
                ${fg("Location",       val(d.asset_location),     sel("asset_location", LOCATION_OPTS, d.asset_location), true)}
                ${fg("Device Name",    val(d.network_device_name), inp("network_device_name", d.network_device_name, "text", "e.g. SW-HQ-001"), false)}
                ${fg("Asset Tag",      val(d.asset_tag),          inp("asset_tag",  d.asset_tag,  "text", "e.g. TMCSL-SW-001"), false)}
            </div>
        </div>`;
    }

    function buildNetworkCard(d) {
        return `
        <div class="section-card" id="card-network">
            ${sectionHeader("card-network", "network", "Network Configuration", "Connectivity and firmware details")}
            <div class="section-body form-grid">
                ${fg("IP Address",       val(d.ip_address),       inp("ip_address",       d.ip_address,       "text",   "e.g. 192.168.1.1"), false)}
                ${fg("MAC Address",      val(d.mac_address),      inp("mac_address",      d.mac_address,      "text",   "e.g. CC:DD:EE:FF:00:11"), false)}
                ${fg("Port Count",       val(d.port_count),        inp("port_count",       d.port_count,       "number", "e.g. 24"), false)}
                ${fg("Firmware Version", val(d.firmware_version),  inp("firmware_version", d.firmware_version, "text",   "e.g. 15.2(7)E3"), false)}
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
                ${fg("Vendor / Supplier", val(d.vendor),             vendorInput,                                                             true, true)}
                ${fg("Cost (₱)",          val(costDisplay),           inp("cost",            d.cost,      "number", "0.00"), false, true)}
                ${fg("Received Date",     fmtDate(d.received_date),   inp("received_date",   receivedVal, "date"), false, true)}
                ${fg("Warranty Expiry",   fmtDate(d.warranty_expiry), inp("warranty_expiry", warrantyVal, "date"), false, true)}
                ${fg("Date Deployed",     fmtDate(d.date_deployed),   inp("date_deployed",   deployedVal, "date"), false, true)}
                ${fg("Remarks",           val(d.remarks), `<textarea id="remarks" placeholder="Any notes about this device…">${escHtml(d.remarks || "")}</textarea>`, false, true)}
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

        return `
        <div class="section-card quick-info-bar">
            <div class="section-header">
                <div class="section-icon"><i data-lucide="info"></i></div>
                <div class="section-header-text">
                    <div class="section-title-text">Quick Info</div>
                </div>
                ${canViewAuditHistory()
                    ? `<a href="auditLogs.html?audit=network_device:${d.network_device_id}"
                        class="audit-log-btn" title="View audit trail for this asset">
                            <i data-lucide="history"></i>
                            View History
                        </a>`
                    : `<div class="perm-btn-wrapper" data-tooltip="You need View Audit Trail - Network Device permission to view this asset's history.">
                        <span class="audit-log-btn audit-log-btn-disabled">
                            <i data-lucide="history"></i>
                            View History
                        </span>
                    </div>`
                }
            </div>
            <div class="info-grid">
                <div class="info-cell"><span class="label">Asset Tag</span>     <span class="value">${val(d.asset_tag)}</span></div>
                <div class="info-cell"><span class="label">Serial No.</span>    <span class="value">${val(d.serial_no)}</span></div>
                <div class="info-cell"><span class="label">Brand / Model</span> <span class="value">${val(d.brand)}${d.model ? " " + escHtml(d.model) : ""}</span></div>
                <div class="info-cell"><span class="label">Device Type</span>   <span class="value">${val(d.device_type)}</span></div>
                <div class="info-cell"><span class="label">IP Address</span>    <span class="value">${val(d.ip_address)}</span></div>
                <div class="info-cell"><span class="label">Warranty</span>      <span class="value">${wLabel}</span></div>
                <div class="info-cell"><span class="label">Condition</span>     <span class="value">${val(d.asset_condition)}</span></div>
            </div>
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

    // Collects the current state of the edit-mode form fields, mirroring the
    // exact field selection used by saveChanges(). Used for no-op-save detection.
    function collectGeneralFormState() {
        const inputs = qsa("#pageContent input[id], #pageContent select[id], #pageContent textarea[id]");
        const raw = {};
        for (const el of inputs) {
            if (el.type === "number") {
                raw[el.id] = el.value !== "" ? parseFloat(el.value) : null;
            } else {
                raw[el.id] = el.value.trim() || null;
            }
        }
        return JSON.stringify(raw);
    }

    window.enterEditMode = function () {
        if (!canEditNetwork()) {
            showToast("You do not have permission to edit this asset.", "error");
            return;
        }
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
            if (el.type === "number") {
                raw[el.id] = el.value !== "" ? parseFloat(el.value) : null;
            } else {
                raw[el.id] = el.value.trim() || null;
            }
        }

        // ── Inline validation (mirrors computerItem.js validateStep) ──
        const requiredFields = [
            { id: "serial_no",       label: "Serial Number" },
            { id: "brand",           label: "Brand" },
            { id: "model",           label: "Model" },
            { id: "device_type",     label: "Device Type" },
            { id: "asset_status",    label: "Status" },
            { id: "asset_condition", label: "Condition" },
            { id: "asset_location",  label: "Location" },
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

        // Cost — optional, but if provided must be a valid number
        if (raw.cost !== null && isNaN(raw.cost)) {
            setFieldError("cost", "Cost must be a valid number.");
            valid = false;
            firstInvalidId = firstInvalidId || "cost";
        } else {
            setFieldError("cost", null);
        }

        // Vendor is optional, but if a name was typed it must be picked from
        // the dropdown, not free-typed (mirrors computer.js).
        if (raw.vendor && !qs("#vendorId")?.value) {
            setFieldError("vendor", "Please select a vendor from the list.");
            valid = false;
            firstInvalidId = firstInvalidId || "vendor";
        }

        // Warranty Expiry is optional — clear any stale error state
        setFieldError("warranty_expiry", null);

        if (!valid) {
            showToast("Please fix the highlighted fields.", "error");
            if (firstInvalidId) qs(`#${firstInvalidId}`)?.focus();
            return;
        }

        // Date range validation
        if (!validateDates()) return;

        // Map snake_case input IDs → camelCase API field names for PUT /network-device/{id}
        const payload = {
            deviceName:        raw.network_device_name || null,
            assetTag:          raw.asset_tag || null,
            assetLocation:     raw.asset_location,
            serialNo:          raw.serial_no,
            brand:             raw.brand,
            vendor:            raw.vendor || null,
            model:             raw.model,
            deviceType:        raw.device_type,
            assetStatus:       raw.asset_status,
            assetCondition:    raw.asset_condition,
            receivedDate:      localDate(raw.received_date)   || null,
            warrantyExpiry:    localDate(raw.warranty_expiry) || null,
            dateDeployed:      localDate(raw.date_deployed)   || null,
            cost:              raw.cost,
            remarks:           raw.remarks || null,
            // Network Configuration fields
            ipAddress:         raw.ip_address       || null,
            macAddress:        raw.mac_address      || null,
            portCount:         raw.port_count       ?? null,
            firmwareVersion:   raw.firmware_version || null,
        };

        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`/api/network-device/${deviceId}`, {
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



    function initSearchableCombos() {
        qsa(".dept-search-input[data-combo-options]").forEach(input => {
            if (input._comboInit) return;
            input._comboInit = true;

            let options = [];
            try { options = JSON.parse(input.dataset.comboOptions); } catch { options = []; }

            const dropdown = qs(`#${input.id}-dropdown`);
            if (!dropdown) return;

            function renderList(filter) {
                const q = (filter || "").toLowerCase();
                const matches = options.filter(o => String(o).toLowerCase().includes(q));

                let html = "";
                if (matches.length) {
                    html += matches.map(o => `
                        <div class="dept-option" data-value="${escHtml(o)}">
                            ${escHtml(o)}
                        </div>`).join("");
                } else {
                    html += `<div class="dept-option dept-option-empty">No matches — press Enter to use "${escHtml(filter)}"</div>`;
                }

                dropdown.innerHTML = html;

                qsa(".dept-option[data-value]", dropdown).forEach(el => {
                    el.addEventListener("mousedown", e => {
                        e.preventDefault();
                        input.value = el.dataset.value;
                        dropdown.classList.remove("open");
                    });
                });
            }

            input.addEventListener("focus", () => {
                renderList(input.value);
                dropdown.classList.add("open");
            });

            input.addEventListener("input", () => {
                renderList(input.value);
                dropdown.classList.add("open");
            });

            input.addEventListener("blur", () => {
                setTimeout(() => dropdown.classList.remove("open"), 150);
            });
        });
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
        await Promise.all([loadCategories(), loadVendors()]);
        loadAsset();
    });

})();
document.addEventListener("DOMContentLoaded", async () => {

    lucide.createIcons();

    // ── Shared lookup data ───────────────────────────────────────
    const token = localStorage.getItem("token");

    const LOCATION_OPTS = ["B2","B1","GF","2F","3F","4F","5F","6F","7F","8F","PO"];

    let categories  = {};   // keyed by category_group, e.g. categories["printer.brand"]
    let departments = [];   // [{ department_id, department_name }]
    let vendors     = [];   // [{ vendor_id, vendor_name }]

    async function loadCategories() {
        try {
            const res = await fetch("/api/category?asset=printer", {
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

    async function loadDepartments() {
        try {
            const res = await fetch("/api/department", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) departments = await res.json();
        } catch (err) {
            console.warn("Could not load departments:", err);
        }
    }

    async function loadVendors() {
        try {
            const res = await fetch("/api/vendor", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) vendors = await res.json();
        } catch (err) {
            console.warn("Could not load vendors:", err);
        }
    }

    // Fetch all in parallel before initialising combos
    await Promise.all([loadCategories(), loadDepartments(), loadVendors()]);

    // ── Helper: resolve options for a combo ──────────────────────
    function catOpts(group, fallback) {
        return (categories[group] && categories[group].length)
            ? categories[group]
            : fallback;
    }

    // ── Searchable Combobox factory ──────────────────────────────
    /**
     * options: string[] for normal combos
     *          OR { id, label }[] for department (stores id in hidden input)
     * hiddenId: if set, the combo writes the id to a hidden <input> of that id
     */
    function initCombo(wrapperId, options, hiddenId = null) {
        const wrapper = document.getElementById(wrapperId);
        if (!wrapper) return;
        const input  = wrapper.querySelector(".combo-input");
        const list   = wrapper.querySelector(".combo-list");
        const hidden = hiddenId ? document.getElementById(hiddenId) : null;

        // ── Enforce pick-from-list (no free-typed values) ──────────
        // A value only counts as "selected" if it was chosen from the
        // dropdown: for id-backed combos that means the hidden id got
        // set; for plain string combos it means the text exactly
        // matches one of the available options.
        function isValidSelection() {
            const val = input.value.trim();
            if (val === "") return true; // emptiness is handled by required-field checks
            if (hidden) return hidden.value !== "";
            return options.some(o => (typeof o === "object" ? o.label : o).toLowerCase() === val.toLowerCase());
        }

        // Highlights the input + shows an inline message when the value
        // wasn't actually picked from the dropdown list.
        function setComboError(message) {
            const group = input.closest(".form-group") || wrapper;
            let errEl = group.querySelector(".field-error-msg");
            if (message) {
                input.classList.add("input-error");
                if (!errEl) {
                    errEl = document.createElement("span");
                    errEl.className = "field-error-msg";
                    group.appendChild(errEl);
                }
                errEl.textContent = message;
            } else {
                input.classList.remove("input-error");
                errEl?.remove();
            }
        }

        function enforceSelection() {
            const ok = isValidSelection();
            setComboError(ok ? null : "Please select an option from the dropdown list.");
            return ok;
        }

        // Exposed on the wrapper element so step/save validation can
        // force-check this combo before letting the user proceed.
        wrapper._enforceSelection = enforceSelection;

        function renderList(filter) {
            const q = filter.toLowerCase().trim();
            const matches = options.filter(o => {
                const label = typeof o === "object" ? o.label : o;
                return label.toLowerCase().includes(q);
            });
            list.innerHTML = "";

            if (matches.length === 0) {
                const li = document.createElement("li");
                li.className = "no-match";
                li.textContent = q ? `No match — "${filter}" will be used as-is` : "No options available";
                list.appendChild(li);
            } else {
                matches.forEach(opt => {
                    const label = typeof opt === "object" ? opt.label : opt;
                    const id    = typeof opt === "object" ? opt.id    : null;
                    const li = document.createElement("li");
                    li.textContent = label;
                    // FIX 1: store id in dataset so keyboard Enter path can read it
                    if (id !== null) li.dataset.id = id;
                    li.addEventListener("mousedown", e => {
                        e.preventDefault();
                        input.value = label;
                        if (hidden && id !== null) hidden.value = id;
                        list.classList.add("hidden");
                        setComboError(null);
                    });
                    list.appendChild(li);
                });
            }
        }

        input.addEventListener("focus", () => {
            renderList(input.value);
            list.classList.remove("hidden");
        });
        input.addEventListener("input", () => {
            renderList(input.value);
            list.classList.remove("hidden");
            if (hidden) hidden.value = "";
        });
        input.addEventListener("blur", () => {
            setTimeout(() => {
                list.classList.add("hidden");
                enforceSelection();
            }, 150);
        });

        // Keyboard nav
        input.addEventListener("keydown", e => {
            const items = [...list.querySelectorAll("li:not(.no-match)")];
            const cur   = list.querySelector("li.highlighted");
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
                    // FIX 1 (cont): dataset.id is now populated so this correctly sets hidden.value
                    const id = cur.dataset.id || null;
                    input.value = cur.textContent;
                    if (hidden && id) hidden.value = id;
                    list.classList.add("hidden");
                    setComboError(null);
                }
            } else if (e.key === "Escape") {
                list.classList.add("hidden");
            }
        });
    }

    // ── Initialise all combos with live data ─────────────────────
    const brandFallback = ["Canon", "HP", "Epson", "Brother", "Xerox", "Ricoh", "Kyocera", "Lexmark", "Samsung", "Other"];

    initCombo("brandCombo",        catOpts("printer.brand", brandFallback));
    initCombo("assetLocationCombo", LOCATION_OPTS);

    // Department combo stores department_id in a hidden input
    const deptOptions = departments.map(d => ({ id: d.department_id, label: d.department_name }));
    initCombo("departmentCombo", deptOptions.length ? deptOptions : [], "departmentId");

    // Vendor combo stores vendor_id in a hidden input
    const vendorOptions = vendors.map(v => ({ id: v.vendor_id, label: v.vendor_name }));
    initCombo("vendorCombo", vendorOptions, "vendorId");

    // Populate native <select> elements from categories
    function populateSelect(id, group, fallback) {
        const el = document.getElementById(id);
        if (!el) return;
        const opts = catOpts(group, fallback);
        const current = el.value;
        el.innerHTML = `<option value="">${el.options[0]?.text || "Select…"}</option>`;
        opts.forEach(o => {
            const opt = document.createElement("option");
            opt.value = o;
            opt.textContent = o;
            if (o === current) opt.selected = true;
            el.appendChild(opt);
        });
    }

    const printerTypeFallback = ["Inkjet", "Laser", "Dot Matrix", "Thermal", "LED", "All-in-One"];
    populateSelect("printerType", "printer.printer_type", printerTypeFallback);

    let assets = [];

    const tbody       = document.getElementById("assetTableBody");
    const searchInput = document.getElementById("searchInput");

    // --- Stepper State -------------------------------------------
    let currentStep = 1;
    const totalSteps = 4;

    // --- Reset Modal ---------------------------------------------
    function resetModal() {
        document.querySelectorAll("#assetModal input, #assetModal select, #assetModal textarea").forEach(el => {
            if (el.type === "checkbox" || el.type === "radio") {
                el.checked = false;
            } else {
                el.value = "";
            }
        });
    }

    function openAssetModal() {
        resetModal();
        document.getElementById("stepper").classList.remove("hidden");
        document.getElementById("modalFooter").classList.remove("hidden");
        goToStep(1);
        document.getElementById("assetModal").classList.remove("hidden");
    }

    // --- Stepper Navigation --------------------------------------
    function goToStep(step) {
        if (step === 4) {
            populateReviewStep();
        }

        document.querySelectorAll(".step-panel").forEach(p => p.classList.add("hidden"));
        document.getElementById(`step-${step}`).classList.remove("hidden");

        document.querySelectorAll(".step").forEach(el => {
            const s = parseInt(el.dataset.step);
            el.classList.remove("active", "done", "inactive");
            if (s < step)        el.classList.add("done");
            else if (s === step) el.classList.add("active");
            else                 el.classList.add("inactive");
        });

        document.getElementById("backBtn").classList.toggle("hidden", step === 1);

        const nextBtn = document.getElementById("nextBtn");
        nextBtn.textContent = step === totalSteps ? "Submit" : "Next →";

        currentStep = step;
    }

    // --- Validation ----------------------------------------------
    // ── Date helpers ─────────────────────────────────────────────
    function todayISO() {
        return new Date().toISOString().split("T")[0];
    }

    // Same logic as computer.js / computerItem.js's fmtDate — use local date parts
    // to avoid UTC→local shift on ISO strings like "2022-03-02T16:00:00.000Z"
    function fmtDate(val) {
        if (!val) return "-";
        const d = new Date(val);
        if (isNaN(d)) return String(val);
        return d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
    }

    function setDateError(inputId, message) {
        const input = document.getElementById(inputId);
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
        const today = todayISO();
        let valid = true;

        // Date Deployed — must NOT be in the future
        const deployed = document.getElementById("dateDeployed")?.value;
        if (deployed) {
            if (deployed > today) {
                setDateError("dateDeployed", "Date deployed cannot be a future date.");
                valid = false;
            } else {
                setDateError("dateDeployed", null);
            }
        }

        // Received Date — must NOT be in the future
        const received = document.getElementById("receivedDate")?.value;
        if (received) {
            if (received > today) {
                setDateError("receivedDate", "Received date cannot be a future date.");
                valid = false;
            } else {
                setDateError("receivedDate", null);
            }
        }

        // Warranty Expiry — must NOT be in the past
        const warranty = document.getElementById("warrantyExpiry")?.value;
        if (warranty) {
            if (warranty < today) {
                setDateError("warrantyExpiry", "Warranty expiry cannot be a past date.");
                valid = false;
            } else {
                setDateError("warrantyExpiry", null);
            }
        }

        return valid;
    }

    function applyDateConstraints() {
        const today = todayISO();
        const deployed = document.getElementById("dateDeployed");
        if (deployed) deployed.max = today;
        const recv = document.getElementById("receivedDate");
        if (recv) recv.max = today;
        const warr = document.getElementById("warrantyExpiry");
        if (warr) warr.min = today;
    }

    applyDateConstraints();

    // ── Enforce numbers-only on cost ─────────────────────────────
    const costInput = document.getElementById("cost");
    if (costInput) {
        costInput.addEventListener("keypress", e => {
            if (!/[0-9.]/.test(e.key)) e.preventDefault();
            if (e.key === "." && costInput.value.includes(".")) e.preventDefault();
        });
        costInput.addEventListener("input", () => {
            costInput.value = costInput.value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
        });
    }

    // ── Inline field error helper ────────────────────────────────
    function setFieldError(id, message) {
        const el = document.getElementById(id);
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
                el.removeEventListener("input", clear);
                el.removeEventListener("change", clear);
            };
            el.addEventListener("input", clear, { once: true });
            el.addEventListener("change", clear, { once: true });
        } else {
            el.classList.remove("input-error");
            errEl?.remove();
        }
    }

    function validateStep(step) {
        if (step === 1) {
            const requiredFields = [
                { id: "serialNo",       label: "Serial Number" },
                { id: "brand",          label: "Brand" },
                { id: "model",          label: "Model" },
                { id: "assetStatus",    label: "Status" },
                { id: "assetCondition", label: "Asset Condition" },
            ];
            let valid = true;
            requiredFields.forEach(({ id, label }) => {
                const el = document.getElementById(id);
                const empty = !el || el.value.trim() === "";
                if (empty) { valid = false; setFieldError(id, `${label} is required.`); }
                else       { setFieldError(id, null); }
            });

            // Brand / Location must be picked from their dropdowns, not free-typed
            const brandOk = document.getElementById("brandCombo")?._enforceSelection?.() ?? true;
            const locOk   = document.getElementById("assetLocationCombo")?._enforceSelection?.() ?? true;
            if (!brandOk || !locOk) valid = false;

            return valid;

        } else if (step === 2) {
            const requiredFields = [
                { id: "printerType",    label: "Printer Type" },
                { id: "isColor",        label: "Color / Monochrome" },
                { id: "departmentName", label: "Department" },
                { id: "dateDeployed",   label: "Date Deployed" },
            ];
            let valid = true;
            requiredFields.forEach(({ id, label }) => {
                const el = document.getElementById(id);
                const empty = !el || el.value.trim() === "";
                if (empty) { valid = false; setFieldError(id, `${label} is required.`); }
                else       { setFieldError(id, null); }
            });

            // Department must be selected from the list, not free-typed
            const deptOk = document.getElementById("departmentCombo")?._enforceSelection?.() ?? true;
            if (!deptOk) valid = false;

            if (!valid) return false;
            return validateDates();

        } else if (step === 3) {
            const requiredFields = [
                { id: "receivedDate",   label: "Received Date" },
                { id: "vendor",         label: "Vendor / Supplier" },
                { id: "connectivity",   label: "Connectivity" },
            ];
            let valid = true;
            requiredFields.forEach(({ id, label }) => {
                const el = document.getElementById(id);
                const empty = !el || (el.type === "number" ? el.value === "" : el.value.trim() === "");
                if (empty) { valid = false; setFieldError(id, `${label} is required.`); }
                else       { setFieldError(id, null); }
            });

            if (!valid) return false;

            // Vendor must be selected from the list, not free-typed
            const vendorOk = document.getElementById("vendorCombo")?._enforceSelection?.() ?? true;
            if (!vendorOk) return false;

            // cost must be a non-negative number
            const costEl = document.getElementById("cost");
            if (costEl && costEl.value.trim() !== "") {
                const costVal = parseFloat(costEl.value);
                if (isNaN(costVal) || costVal < 0) {
                    setFieldError("cost", "Cost must be a valid non-negative number.");
                    return false;
                } else {
                    setFieldError("cost", null);
                }
            }

            return validateDates();

        } else if (step === 4) {
            return true;
        }
        return true;
    }

    // --- Populate Review Step ------------------------------------
    function populateReviewStep() {
        // Asset Basics
        document.getElementById("revPrinterName").textContent    = document.getElementById("printerName").value || "—";
        document.getElementById("revSerialNo").textContent       = document.getElementById("serialNo").value || "—";
        document.getElementById("revBrand").textContent          = document.getElementById("brand").value || "—";
        document.getElementById("revModel").textContent          = document.getElementById("model").value || "—";
        document.getElementById("revAssetStatus").textContent    = document.getElementById("assetStatus").value || "—";
        document.getElementById("revAssetCondition").textContent = document.getElementById("assetCondition").value || "—";
        document.getElementById("revAssetTag").textContent       = document.getElementById("assetTag").value || "—";
        document.getElementById("revAssetLocation").textContent  = document.getElementById("assetLocation").value || "—";

        // Printer Specifications
        document.getElementById("revPrinterType").textContent    = document.getElementById("printerType").value || "—";
        const isColorVal = document.getElementById("isColor").value;
        document.getElementById("revIsColor").textContent        = isColorVal === "true" ? "Yes — Color" : isColorVal === "false" ? "No — Monochrome" : "—";
        document.getElementById("revDepartment").textContent     = document.getElementById("departmentName").value || "—";
        document.getElementById("revDateDeployed").textContent   = document.getElementById("dateDeployed").value || "—";

        // Network, Cost & Warranty
        document.getElementById("revCost").textContent           = document.getElementById("cost").value || "—";
        document.getElementById("revReceivedDate").textContent   = document.getElementById("receivedDate").value || "—";
        document.getElementById("revWarrantyExpiry").textContent = document.getElementById("warrantyExpiry").value || "—";
        document.getElementById("revVendor").textContent         = document.getElementById("vendor").value || "—";
        document.getElementById("revConnectivity").textContent   = document.getElementById("connectivity").value || "—";
        document.getElementById("revIpAddress").textContent      = document.getElementById("ipAddress").value || "—";
        document.getElementById("revMacAddress").textContent     = document.getElementById("macAddress").value || "—";
        document.getElementById("revRemarks").textContent        = document.getElementById("remarks").value || "—";
    }

    // --- Modal Open / Close --------------------------------------

    // ── Permission gate: Add Asset — Printer (permission 11) ────
    // Parse permissions from localStorage; default to empty array on any failure
    let userPermissions = [];
    try {
        userPermissions = JSON.parse(localStorage.getItem("permissions") || "[]");
    } catch {
        userPermissions = [];
    }

    const canAddPrinter = userPermissions.includes(11);
    console.log("[Permission 11 — Add Asset: Printer]", canAddPrinter ? "GRANTED" : "DENIED", "| Permissions:", userPermissions);

    const addBtnContainer = document.getElementById("addAssetBtnContainer");
    if (addBtnContainer) {
        if (!canAddPrinter) {
            addBtnContainer.innerHTML = `
                <div class="perm-btn-wrapper" data-tooltip="You need Add Asset: Printer permission to add an asset.">
                    <button class="primary perm-locked" disabled>
                        <i data-lucide="lock"></i> Add Asset
                    </button>
                </div>`;
        } else {
            addBtnContainer.innerHTML = `
                <button id="addAssetBtn" class="primary">
                    <i data-lucide="plus"></i> Add Asset
                </button>`;
            document.getElementById("addAssetBtn").addEventListener("click", () => {
                applyDateConstraints();
                openAssetModal();
            });
        }
        lucide.createIcons();
    }

    document.getElementById("closeModal").addEventListener("click", () => {
        document.getElementById("assetModal").classList.add("hidden");
    });

    document.getElementById("cancelModal").addEventListener("click", () => {
        document.getElementById("assetModal").classList.add("hidden");
    });

    // --- Next / Back ---------------------------------------------
    document.getElementById("nextBtn").addEventListener("click", () => {
        if (!validateStep(currentStep)) {
            return;
        }
        if (currentStep < totalSteps) {
            goToStep(currentStep + 1);
        } else {
            handleSubmit();
        }
    });

    document.getElementById("backBtn").addEventListener("click", () => {
        if (currentStep > 1) goToStep(currentStep - 1);
    });

    // --- Custom Confirm Dialog -----------------------------------
    function showConfirmDialog() {
        return new Promise((resolve) => {
            const dialog    = document.getElementById("confirmDialog");
            const okBtn     = document.getElementById("confirmOkBtn");
            const cancelBtn = document.getElementById("confirmCancelBtn");

            dialog.classList.remove("hidden");

            function cleanup(result) {
                dialog.classList.add("hidden");
                okBtn.removeEventListener("click", onOk);
                cancelBtn.removeEventListener("click", onCancel);
                resolve(result);
            }

            function onOk()     { cleanup(true);  }
            function onCancel() { cleanup(false); }

            okBtn.addEventListener("click", onOk);
            cancelBtn.addEventListener("click", onCancel);
        });
    }

    function showErrorToast(message = "Something went wrong. Please try again.") {
        const toast = document.getElementById("errorToast");
        toast.querySelector("span").textContent = message;
        toast.classList.remove("hidden");
        setTimeout(() => toast.classList.add("hidden"), 4000);
    }

    // --- Submit --------------------------------------------------
    async function handleSubmit() {
        const confirmAdd = await showConfirmDialog();
        if (!confirmAdd) return;

        try {
            const token = localStorage.getItem("token");

            const isColorRaw = document.getElementById("isColor").value;

            const payload = {
                // Step 1 — Asset Basics
                printerName:    document.getElementById("printerName").value.trim(),
                serialNo:       document.getElementById("serialNo").value.trim(),
                brand:          document.getElementById("brand").value.trim(),
                model:          document.getElementById("model").value.trim(),
                assetStatus:    document.getElementById("assetStatus").value,
                assetCondition: document.getElementById("assetCondition").value,
                assetTag:       document.getElementById("assetTag").value.trim() || null,
                assetLocation:  document.getElementById("assetLocation").value.trim() || null,

                // Step 2 — Printer Specifications
                printerType:    document.getElementById("printerType").value,
                isColor:        isColorRaw === "true",
                department:     parseInt(document.getElementById("departmentId").value) || null,
                dateDeployed:   document.getElementById("dateDeployed").value || null,

                // Step 3 — Network, Cost & Warranty (Required)
                cost:           parseFloat(document.getElementById("cost").value) || 0,
                receivedDate:   document.getElementById("receivedDate").value,
                warrantyExpiry: document.getElementById("warrantyExpiry").value,
                vendor:         document.getElementById("vendor").value.trim(),
                // Step 3 — Optional
                connectivity:   document.getElementById("connectivity").value || null,
                ipAddress:      document.getElementById("ipAddress").value.trim() || null,
                macAddress:     document.getElementById("macAddress").value.trim() || null,
                remarks:        document.getElementById("remarks").value.trim() || null
            };

            console.log("Submitting payload:", payload);

            const response = await fetch("/api/printer", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
                console.error("API Error Response:", errorData);
                throw new Error(`API Error: ${response.status} - ${JSON.stringify(errorData)}`);
            }

            document.getElementById("assetModal").classList.add("hidden");
            resetModal();
            await loadAssets();
            console.log("Printer asset added successfully!");

        } catch (err) {
            console.error(err);
            showErrorToast("Something went wrong. Please try again.");
        }
    }

    // --- Load & Render Table -------------------------------------
    async function loadAssets() {
        try {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };

            const res = await fetch("/api/printer", { headers });
            const rawAssets = await res.json();
            console.log("Printers API response:", rawAssets);

            assets = Array.isArray(rawAssets)
                ? rawAssets
                : (rawAssets.data ?? rawAssets.printers ?? rawAssets.assets ?? []);

            renderTable(assets);
            updateSummaryCards(assets);
            console.log("Printer assets loaded:", assets);
        } catch (err) {
            console.error(err);
        }
    }

    // --- Summary Cards -------------------------------------------
    function updateSummaryCards(data) {
        let active    = 0;
        let spare     = 0;
        let repair    = 0;
        let defective = 0;

        data.forEach(asset => {
            const status = (asset.asset_status || "").toLowerCase();
            if (status === "active")    active++;
            if (status === "spare")     spare++;
            if (status === "repair")    repair++;
            if (status === "defective") defective++;
        });

        document.getElementById("activeCount").textContent    = active;
        document.getElementById("spareCount").textContent     = spare;
        document.getElementById("repairCount").textContent    = repair;
        document.getElementById("defectiveCount").textContent = defective;
    }

    // ── Column definitions ───────────────────────────────────────
    const ALL_COLUMNS = [
        { key: "asset_tag",       label: "Asset Tag" },
        { key: "printer_name",    label: "Printer Name" },
        { key: "serial_no",       label: "Serial No." },
        { key: "brand",           label: "Brand" },
        { key: "model",           label: "Model" },
        { key: "printer_type",    label: "Printer Type" },
        { key: "is_color",        label: "Color" },
        { key: "asset_status",    label: "Status" },
        { key: "asset_condition", label: "Condition" },
        { key: "asset_location",  label: "Location" },
        { key: "department_name", label: "Department" },
        { key: "connectivity",    label: "Connectivity" },
        { key: "ip_address",      label: "IP Address" },
        { key: "mac_address",     label: "MAC Address" },
        { key: "date_deployed",   label: "Date Deployed" },
        { key: "received_date",   label: "Received" },
        { key: "warranty_expiry", label: "Warranty Expiry" },
        { key: "vendor",          label: "Vendor" },
        { key: "cost",            label: "Cost" },
        { key: "remarks",         label: "Remarks" },
        { key: "action",          label: "Action" },
    ];

    // Default visible columns (mirrors original table)
    const DEFAULT_VISIBLE = new Set([
        "printer_name", "brand", "model", "printer_type",
        "connectivity", "ip_address", "asset_location", "is_color",
        "asset_status", "action"
    ]);

    let visibleCols = new Set(DEFAULT_VISIBLE);

    // ── Column (header) filters — populated from the same category API ──
    // used by the "Add Asset" dropdowns (populateSelect/catOpts/FILTERABLE_COLUMNS).
    // key -> Set of checked values. Empty Set = no filter applied (show all).
    const columnFilters = {};

    // ── Status Summary Cards (Active / Spare / Under Repair / Defective) ──
    // These act as one-click shortcuts into the same "asset_status" column
    // filter used by the Status column header, so keep the card's "selected"
    // look in sync with whatever asset_status is currently set to.
    function syncStatusCards() {
        const current = columnFilters["asset_status"];
        const activeStatus = (current && current.size === 1) ? [...current][0] : null;
        document.querySelectorAll(".status-card").forEach(card => {
            card.classList.toggle("selected", card.dataset.status === activeStatus);
        });
    }

    // Clicking a card applies that single status as the asset_status filter
    // (matching the column filter's checkbox + Apply behavior). Clicking the
    // already-active card again clears the filter.
    function applyStatusCardFilter(status) {
        const key = "asset_status";
        const th = document.querySelector(`#assetTable thead th[data-col="${key}"]`);
        if (!th || !th._filterPanel || !th._filterBtn) return;

        const current = columnFilters[key];
        const isActive = current && current.size === 1 && current.has(status);

        if (isActive) {
            columnFilters[key] = new Set();
            th._filterPanel.querySelectorAll("input[type=checkbox]").forEach(cb => cb.checked = false);
            th._filterBtn.classList.remove("active");
        } else {
            columnFilters[key] = new Set([status]);
            th._filterPanel.querySelectorAll("input[type=checkbox]").forEach(cb => {
                cb.checked = cb.value === status;
            });
            th._filterBtn.classList.add("active");
        }

        syncStatusCards();
        renderTable(searchAssets(searchInput.value));
    }

    document.querySelectorAll(".status-card").forEach(card => {
        card.addEventListener("click", () => applyStatusCardFilter(card.dataset.status));
    });

    function filterAssetsByColumns(data) {
        let result = data;
        Object.entries(columnFilters).forEach(([key, valueSet]) => {
            if (valueSet && valueSet.size > 0) {
                const transform = FILTER_TRANSFORMS[key];
                result = result.filter(asset => valueSet.has(transform ? transform(asset[key]) : asset[key]));
            }
        });
        return result;
    }

    // ── Column toggle UI ─────────────────────────────────────────
    function buildColPanel() {
        const list = document.getElementById("colCheckboxList");
        list.innerHTML = "";
        ALL_COLUMNS.forEach(col => {
            const label = document.createElement("label");
            label.className = "col-check-item";
            label.innerHTML = `
                <input type="checkbox" value="${col.key}" ${visibleCols.has(col.key) ? "checked" : ""} />
                ${col.label}
            `;
            label.querySelector("input").addEventListener("change", e => {
                if (e.target.checked) visibleCols.add(col.key);
                else visibleCols.delete(col.key);
                renderTable(searchAssets(searchInput.value));
            });
            list.appendChild(label);
        });
    }

    function applyColumnVisibility() {
        // Sync checkboxes
        document.querySelectorAll("#colCheckboxList input[type=checkbox]").forEach(cb => {
            cb.checked = visibleCols.has(cb.value);
        });
        // Show/hide <th>
        document.querySelectorAll("#assetTable thead th[data-col]").forEach(th => {
            th.style.display = visibleCols.has(th.dataset.col) ? "" : "none";
        });
        // Show/hide <td> by column index
        const colKeys = [...document.querySelectorAll("#assetTable thead th[data-col]")].map(th => th.dataset.col);
        document.querySelectorAll("#assetTableBody tr").forEach(row => {
            [...row.cells].forEach((td, i) => {
                td.style.display = visibleCols.has(colKeys[i]) ? "" : "none";
            });
        });
    }

    // Toggle panel open/close
    document.getElementById("colToggleBtn").addEventListener("click", e => {
        e.stopPropagation();
        const btn = document.getElementById("colToggleBtn");
        const panel = document.getElementById("colTogglePanel");
        const isOpen = !panel.classList.contains("hidden");
        if (isOpen) {
            panel.classList.add("hidden");
        } else {
            positionFilterPanel(panel, btn);
        }
    });
    window.addEventListener("resize", () => {
        document.getElementById("colTogglePanel").classList.add("hidden");
    });
    document.addEventListener("click", e => {
        const wrapper = document.querySelector(".col-toggle-wrapper");
        if (wrapper && !wrapper.contains(e.target)) {
            document.getElementById("colTogglePanel").classList.add("hidden");
        }
    });
    document.getElementById("colSelectAll").addEventListener("click", () => {
        ALL_COLUMNS.forEach(c => visibleCols.add(c.key));
        buildColPanel();
        renderTable(searchAssets(searchInput.value));
    });
    document.getElementById("colSelectNone").addEventListener("click", () => {
        visibleCols.clear();
        visibleCols.add("action");
        buildColPanel();
        renderTable(searchAssets(searchInput.value));
    });
    document.getElementById("colReset").addEventListener("click", () => {
        visibleCols = new Set(DEFAULT_VISIBLE);
        buildColPanel();
        renderTable(searchAssets(searchInput.value));
    });

    // Build panel immediately and hide non-default headers
    buildColPanel();
    applyColumnVisibility();

    // ── Column Value Filters (Excel/pivot-style checkbox filters) ─
    // Reuses the exact same category data + fallback lists that power
    // the Add Asset dropdowns (catOpts / brandFallback / printerTypeFallback)
    const FILTERABLE_COLUMNS = [
        { key: "brand",           group: "printer.brand",        fallback: brandFallback },
        { key: "printer_type",    group: "printer.printer_type", fallback: printerTypeFallback },
        { key: "is_color",        options: ["Yes", "No"], transform: v => (v === 1 || v === true) ? "Yes" : "No" },
        { key: "asset_status",    options: ["Active", "Repair", "Spare", "Defective"] },
        // Condition has no fixed category list — derive it from whatever
        // values actually exist in the loaded printer data.
        { key: "asset_condition", options: () => [...new Set(assets.map(a => a.asset_condition).filter(Boolean))].sort() },
        { key: "asset_location",  options: LOCATION_OPTS },
        { key: "department_name", options: () => [...new Set(departments.map(d => d.department_name).filter(Boolean))].sort() },
        // Connectivity has no fixed category list — derive it from whatever
        // values actually exist in the loaded printer data.
        { key: "connectivity",    options: () => [...new Set(assets.map(a => a.connectivity).filter(Boolean))].sort() },
        { key: "vendor",          options: () => [...new Set(vendors.map(v => v.vendor_name).filter(Boolean))].sort() },
    ];

    // key -> transform fn, applied to the raw asset value before matching
    // against the checked filter values (e.g. is_color 1/true -> "Yes"/"No")
    const FILTER_TRANSFORMS = {};
    FILTERABLE_COLUMNS.forEach(col => { if (col.transform) FILTER_TRANSFORMS[col.key] = col.transform; });

    function closeAllFilterPanels(except = null) {
        document.querySelectorAll(".col-filter-panel").forEach(p => {
            if (p !== except) p.classList.add("hidden");
        });
    }

    function positionFilterPanel(panel, btn) {
    	const margin = 12;
    
    	// Reveal off-screen first so we can measure the panel's real
    	// rendered size (it's "hidden" via display:none up to this point,
    	// so offsetWidth/offsetHeight would read 0 otherwise). This also
    	// lets the panel shrink responsively on narrow/mobile viewports
    	// via CSS (see .col-filter-panel width in assetsSharedStyle.css)
    	// instead of relying on a hardcoded desktop width.
    	panel.style.visibility = "hidden";
    	panel.style.top  = "-9999px";
    	panel.style.left = "-9999px";
    	panel.classList.remove("hidden");
    
    	const panelWidth  = panel.offsetWidth  || 220;
    	const panelHeight = panel.offsetHeight || 260;
    	const rect = btn.getBoundingClientRect();
    
    	// Horizontal: align to the button's right edge, clamped so the
    	// panel never runs past either side of the viewport.
    	let left = rect.right - panelWidth;
    	if (left < margin) left = margin;
    	if (left + panelWidth > window.innerWidth - margin) left = window.innerWidth - panelWidth - margin;
    	if (left < margin) left = margin; // panel wider than viewport (very small screens)
    
    	// Vertical: prefer below the button, but flip above it (or clamp
    	// to the viewport) when there isn't enough room below — this is
    	// what previously let panels run off the bottom of short mobile
    	// screens.
    	let top = rect.bottom + 6;
    	if (top + panelHeight > window.innerHeight - margin) {
    		const above = rect.top - panelHeight - 6;
    		top = above >= margin ? above : Math.max(margin, window.innerHeight - panelHeight - margin);
    	}
    
    	panel.style.left = `${left}px`;
    	panel.style.top  = `${top}px`;
    	panel.style.visibility = "";
    }

    function buildColumnFilterUI() {
        FILTERABLE_COLUMNS.forEach(col => {
            const th = document.querySelector(`#assetTable thead th[data-col="${col.key}"]`);
            if (!th) return;

            columnFilters[col.key] = new Set();

            const options   = col.group ? catOpts(col.group, col.fallback) : (typeof col.options === "function" ? col.options() : col.options);
            const labelText = th.textContent.trim();

            // Rebuild header cell: label + filter trigger button
            th.classList.add("filterable-th");
            th.innerHTML = "";

            const content = document.createElement("div");
            content.className = "th-content";

            const span = document.createElement("span");
            span.textContent = labelText;
            content.appendChild(span);

            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "col-filter-btn";
            btn.title = `Filter ${labelText}`;
            btn.innerHTML = `<i data-lucide="chevron-down"></i>`;
            content.appendChild(btn);

            th.appendChild(content);
            th._filterBtn = btn; // stashed for programmatic filtering (e.g. from URL params)

            // Dropdown panel — appended to <body> so it's never clipped
            // by the scrollable table wrapper, and positioned via JS.
            const panel = document.createElement("div");
            panel.className = "col-filter-panel hidden";
            panel.innerHTML = `
                <div class="col-toggle-header">
                    <span>Filter ${labelText}</span>
                    <div class="col-toggle-actions">
                        <button type="button" class="col-link-btn cf-all">All</button>
                        <span class="col-divider">·</span>
                        <button type="button" class="col-link-btn cf-none">None</button>
                    </div>
                </div>
                <div class="col-toggle-body cf-body"></div>
                <div class="col-filter-footer">
                    <button type="button" class="col-filter-clear">Clear</button>
                    <button type="button" class="col-filter-apply">Apply</button>
                </div>
            `;
            document.body.appendChild(panel);

            const body = panel.querySelector(".cf-body");
            options.forEach(opt => {
                const item = document.createElement("label");
                item.className = "col-check-item";
                item.innerHTML = `<input type="checkbox" value="${opt}" /> ${opt}`;
                body.appendChild(item);
            });

            th._filterPanel = panel; // stashed for programmatic filtering (e.g. from URL params)

            btn.addEventListener("click", e => {
                e.stopPropagation();
                const isOpen = !panel.classList.contains("hidden");
                closeAllFilterPanels(panel);
                if (isOpen) {
                    panel.classList.add("hidden");
                } else {
                    positionFilterPanel(panel, btn);
                }
            });

            panel.querySelector(".cf-all").addEventListener("click", () => {
                panel.querySelectorAll("input[type=checkbox]").forEach(cb => cb.checked = true);
            });
            panel.querySelector(".cf-none").addEventListener("click", () => {
                panel.querySelectorAll("input[type=checkbox]").forEach(cb => cb.checked = false);
            });
            panel.querySelector(".col-filter-clear").addEventListener("click", () => {
                columnFilters[col.key].clear();
                panel.querySelectorAll("input[type=checkbox]").forEach(cb => cb.checked = false);
                btn.classList.remove("active");
                panel.classList.add("hidden");
                if (col.key === "asset_status") syncStatusCards();
                renderTable(searchAssets(searchInput.value));
            });
            panel.querySelector(".col-filter-apply").addEventListener("click", () => {
                const checked = [...panel.querySelectorAll("input[type=checkbox]:checked")].map(cb => cb.value);
                columnFilters[col.key] = new Set(checked);
                btn.classList.toggle("active", checked.length > 0);
                panel.classList.add("hidden");
                if (col.key === "asset_status") syncStatusCards();
                renderTable(searchAssets(searchInput.value));
            });
        });

        // Close panels on outside click, on table scroll, or on resize
        document.addEventListener("click", e => {
            if (!e.target.closest(".col-filter-panel") && !e.target.closest(".col-filter-btn")) {
                closeAllFilterPanels();
            }
        });
        document.querySelector(".table-wrapper")?.addEventListener("scroll", () => closeAllFilterPanels());
        window.addEventListener("resize", () => closeAllFilterPanels());

        lucide.createIcons();
    }

    // NOTE: buildColumnFilterUI() is invoked after loadAssets() below, once
    // asset data is available (needed for the dynamic "connectivity" filter).

    // ── Status badge (Active / Spare / Repair / Defective) ───────
    const STATUS_BADGE_CLASS = {
        active:    "status-active",
        spare:     "status-spare",
        repair:    "status-repair",
        defective: "status-defective"
    };

    function statusBadge(status) {
        if (!status) return "—";
        const cls = STATUS_BADGE_CLASS[status.toLowerCase()] || "";
        return `<span class="status-badge ${cls}">${status}</span>`;
    }

    // --- Render Table --------------------------------------------
    function renderTable(data) {
        data = applySort(data);
        tbody.innerHTML = "";
        const fmt = v => (v === null || v === undefined || v === "") ? "—" : v;

        data.forEach(asset => {
            const isColor = asset.is_color === 1 || asset.is_color === true ? "Yes" : "No";
            const row = document.createElement("tr");

            const cells = [
                { key: "asset_tag",       html: fmt(asset.asset_tag) },
                { key: "printer_name",    html: fmt(asset.printer_name) },
                { key: "serial_no",       html: fmt(asset.serial_no) },
                { key: "brand",           html: fmt(asset.brand) },
                { key: "model",           html: fmt(asset.model) },
                { key: "printer_type",    html: fmt(asset.printer_type) },
                { key: "is_color",        html: isColor },
                { key: "asset_status",    html: statusBadge(asset.asset_status) },
                { key: "asset_condition", html: fmt(asset.asset_condition) },
                { key: "asset_location",  html: fmt(asset.asset_location) },
                { key: "department_name", html: fmt(asset.department_name) },
                { key: "connectivity",    html: fmt(asset.connectivity) },
                { key: "ip_address",      html: fmt(asset.ip_address) },
                { key: "mac_address",     html: fmt(asset.mac_address) },
                { key: "date_deployed",   html: fmtDate(asset.date_deployed) },
                { key: "received_date",   html: fmtDate(asset.received_date) },
                { key: "warranty_expiry", html: fmtDate(asset.warranty_expiry) },
                { key: "vendor",          html: fmt(asset.vendor) },
                { key: "cost",            html: asset.cost != null ? `₱${Number(asset.cost).toLocaleString()}` : "—" },
                { key: "remarks",         html: fmt(asset.remarks) },
                { key: "action",          html: `<a href="printerItem.html?id=${asset.printer_id || asset.id}" class="action-btn" title="Open"><i data-lucide="external-link"></i></a>` },
            ];

            cells.forEach(cell => {
                const td = document.createElement("td");
                td.innerHTML = cell.html;
                td.style.display = visibleCols.has(cell.key) ? "" : "none";
                row.appendChild(td);
            });

            tbody.appendChild(row);
        });
        lucide.createIcons();
        applyColumnVisibility();
    }

    // --- Search --------------------------------------------------
    const DATE_KEYS = ["date_deployed", "received_date", "warranty_expiry"];

    // ── Column Sorting (single dropdown button, like column filters) ──
    // Note: printers don't have an "assigned to" field, so there's nothing
    // to add alphabetical sorting for here — just the numeric/date columns.
    const SORTABLE_COLUMNS = ["cost", "date_deployed", "received_date", "warranty_expiry"];
    const ALPHA_SORT_COLUMNS = []; // no alphabetical (string) sort columns on this page
    let sortState = { key: null, dir: null }; // dir: "asc" | "desc" | null

    function applySort(data) {
        if (!sortState.key) return data;
        const key = sortState.key;
        const dir = sortState.dir;
        const isDateCol  = DATE_KEYS.includes(key);
        const isAlphaCol = ALPHA_SORT_COLUMNS.includes(key);

        if (isAlphaCol) {
            return [...data].sort((a, b) => {
                const va = (a[key] ?? "").toString().trim();
                const vb = (b[key] ?? "").toString().trim();
                // Blank values always sink to the bottom regardless of direction
                if (!va && !vb) return 0;
                if (!va) return 1;
                if (!vb) return -1;
                return dir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
            });
        }

        const getVal = v => {
            if (v === null || v === undefined || v === "") return null;
            const n = isDateCol ? new Date(v).getTime() : Number(v);
            return isNaN(n) ? null : n;
        };
        return [...data].sort((a, b) => {
            const va = getVal(a[key]);
            const vb = getVal(b[key]);
            // Blank/invalid values always sink to the bottom regardless of direction
            if (va === null && vb === null) return 0;
            if (va === null) return 1;
            if (vb === null) return -1;
            return dir === "asc" ? va - vb : vb - va;
        });
    }

    function buildSortableHeaders() {
        SORTABLE_COLUMNS.forEach(key => {
            const th = document.querySelector(`#assetTable thead th[data-col="${key}"]`);
            if (!th) return;

            const labelText = th.textContent.trim();
            const isAlphaCol = ALPHA_SORT_COLUMNS.includes(key);
            const ascLabel   = isAlphaCol ? "Sort A-Z" : "Ascending";
            const descLabel  = isAlphaCol ? "Sort Z-A" : "Descending";

            th.classList.add("sortable-th");
            th.innerHTML = "";

            const content = document.createElement("div");
            content.className = "th-content";

            const span = document.createElement("span");
            span.textContent = labelText;
            content.appendChild(span);

            // Single trigger button — opens a small dropdown panel with the
            // two direction options, same interaction pattern as column filters.
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "col-filter-btn col-sort-btn";
            btn.title = `Sort ${labelText}`;
            btn.innerHTML = `<i data-lucide="arrow-up-down"></i>`;
            content.appendChild(btn);

            th.appendChild(content);
            th._sortBtn = btn;

            // Dropdown panel — appended to <body> so it's never clipped by
            // the scrollable table wrapper, and positioned via JS.
            const panel = document.createElement("div");
            panel.className = "col-filter-panel col-sort-panel hidden";
            panel.innerHTML = `
                <div class="col-toggle-header">
                    <span>Sort ${labelText}</span>
                </div>
                <div class="col-toggle-body cf-body">
                    <label class="col-check-item">
                        <input type="radio" name="sort-${key}" value="asc" /> ${ascLabel}
                    </label>
                    <label class="col-check-item">
                        <input type="radio" name="sort-${key}" value="desc" /> ${descLabel}
                    </label>
                </div>
                <div class="col-filter-footer">
                    <button type="button" class="col-filter-clear">Clear</button>
                    <button type="button" class="col-filter-apply">Apply</button>
                </div>
            `;
            document.body.appendChild(panel);
            th._sortPanel = panel;

            function refreshButtonState() {
                btn.classList.toggle("active", sortState.key === key);
                panel.querySelectorAll("input[type=radio]").forEach(r => {
                    r.checked = (sortState.key === key && sortState.dir === r.value);
                });
            }

            btn.addEventListener("click", e => {
                e.stopPropagation();
                const isOpen = !panel.classList.contains("hidden");
                closeAllFilterPanels(panel);
                if (isOpen) {
                    panel.classList.add("hidden");
                } else {
                    refreshButtonState();
                    positionFilterPanel(panel, btn);
                }
            });

            panel.querySelector(".col-filter-clear").addEventListener("click", () => {
                sortState = (sortState.key === key) ? { key: null, dir: null } : sortState;
                panel.querySelectorAll("input[type=radio]").forEach(r => r.checked = false);
                btn.classList.remove("active");
                panel.classList.add("hidden");
                renderTable(searchAssets(searchInput.value));
            });

            panel.querySelector(".col-filter-apply").addEventListener("click", () => {
                const checked = panel.querySelector("input[type=radio]:checked");
                sortState = checked ? { key, dir: checked.value } : { key: null, dir: null };
                btn.classList.toggle("active", !!checked);
                panel.classList.add("hidden");
                renderTable(searchAssets(searchInput.value));
            });

            refreshButtonState();
        });

        lucide.createIcons();
    }

    function searchAssets(query) {
        const q = query.toLowerCase().trim();
        if (!q) return filterAssetsByColumns(assets);
        return filterAssetsByColumns(assets).filter(asset => {
            const searchable = Object.entries(asset).map(([k, v]) => {
                if (v == null) return "";
                if (DATE_KEYS.includes(k)) return fmtDate(v);
                if (Array.isArray(v)) return v.join(" ");
                return String(v);
            }).join(" ").toLowerCase();
            return searchable.includes(q);
        });
    }

    searchInput.addEventListener("input", () => {
        renderTable(searchAssets(searchInput.value));
    });

    // ── Refresh Button (clears search, column filters, and sorting) ──
    function resetAllFilters() {
        // Clear search box
        searchInput.value = "";

        // Clear every column filter (checkbox panels + filter button state)
        FILTERABLE_COLUMNS.forEach(col => {
            columnFilters[col.key] = new Set();
            const th = document.querySelector(`#assetTable thead th[data-col="${col.key}"]`);
            if (th?._filterPanel) {
                th._filterPanel.querySelectorAll("input[type=checkbox]").forEach(cb => cb.checked = false);
            }
            th?._filterBtn?.classList.remove("active");
        });

        // Clear sorting (radio panels + sort button state)
        sortState = { key: null, dir: null };
        SORTABLE_COLUMNS.forEach(key => {
            const th = document.querySelector(`#assetTable thead th[data-col="${key}"]`);
            if (th?._sortPanel) {
                th._sortPanel.querySelectorAll("input[type=radio]").forEach(r => r.checked = false);
            }
            th?._sortBtn?.classList.remove("active");
        });

        closeAllFilterPanels();
        syncStatusCards();
        renderTable(searchAssets(searchInput.value));
    }

    document.getElementById("refreshFiltersBtn")?.addEventListener("click", resetAllFilters);

    // Fire on page load
    await loadAssets();
    buildColumnFilterUI();
    buildSortableHeaders();

    // ── Apply column filters carried over via URL query params ───────
    // e.g. printers.html?status=Active&brand=HP
    // Lets other pages (like the Asset Overview dashboard) deep-link
    // straight into a pre-filtered view of this table.
    (function applyFiltersFromURL() {
        const params = new URLSearchParams(window.location.search);

        const paramsByColumnKey = {
            asset_status: params.get("status") || params.get("asset_status"),
            brand:        params.get("brand"),
        };

        let didApply = false;

        Object.entries(paramsByColumnKey).forEach(([key, raw]) => {
            if (!raw) return;

            const values = raw.split(",").map(v => v.trim()).filter(Boolean);
            if (values.length === 0) return;

            const th = document.querySelector(`#assetTable thead th[data-col="${key}"]`);
            if (!th || !th._filterPanel || !th._filterBtn) return;

            columnFilters[key] = new Set(values);
            didApply = true;

            th._filterPanel.querySelectorAll("input[type=checkbox]").forEach(cb => {
                cb.checked = values.includes(cb.value);
            });
            th._filterBtn.classList.add("active");
        });

        syncStatusCards();
        if (didApply) renderTable(filterAssetsByColumns(assets));
    })();

});
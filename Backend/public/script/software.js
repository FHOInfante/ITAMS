document.addEventListener("DOMContentLoaded", async () => {

	lucide.createIcons();

    // ── Shared lookup data ────────────────────────────────────────
    const token = localStorage.getItem("token");

    const LOCATION_OPTS = ["B2","B1","GF","2F","3F","4F","5F","6F","7F","8F","PO"];

    let categories  = {};   // keyed by category_group, e.g. categories["software.license_type"]
    let departments = [];   // [{ department_id, department_name }]
    let vendors     = [];   // [{ vendor_id, vendor_name }]
    let endUsers    = [];   // [{ eu_id, eu_name, eu_emp_id, eu_division, department_name, eu_location, eu_email, ... }]

    async function loadCategories() {
        try {
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

    async function loadEndUsers() {
        try {
            const res = await fetch("/api/end-user", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) return;
            const raw = await res.json();
            endUsers = Array.isArray(raw) ? raw : (raw.data ?? raw.users ?? raw.endUsers ?? []);
        } catch (err) {
            console.warn("Could not load end users:", err);
        }
    }

    async function loadVendors() {
        try {
            const res = await fetch("/api/vendor", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                vendors = await res.json();
            } else {
                console.warn("Could not load vendors:", res.status);
            }
        } catch (err) {
            console.warn("Could not load vendors:", err);
        }
    }

    // Fetch all in parallel before initialising combos
    await Promise.all([loadCategories(), loadDepartments(), loadVendors(), loadEndUsers()]);

    // ── Helper: resolve options for a combo ──────────────────────
    // For category combos — falls back to provided array if API returns nothing
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
                    li.addEventListener("mousedown", e => {
                        e.preventDefault();
                        input.value = label;
                        if (hidden && id !== null) hidden.value = id;
                        list.classList.add("hidden");
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
            // Clear hidden id when user types freely
            if (hidden) hidden.value = "";
        });
        input.addEventListener("blur", () => {
            setTimeout(() => list.classList.add("hidden"), 150);
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
                    const id = cur.dataset.id || null;
                    input.value = cur.textContent;
                    if (hidden && id) hidden.value = id;
                    list.classList.add("hidden");
                }
            } else if (e.key === "Escape") {
                list.classList.add("hidden");
            }
        });
    }

    // ── Enforced Searchable Combo ────────────────────────────────
    // Like initCombo but the user MUST pick from the list.
    // Free-typed text that was never confirmed via click/Enter/Tab
    // is cleared on blur and an inline error is shown.
    function initEnforcedCombo(wrapperId, options, hiddenId = null) {
        const wrapper = document.getElementById(wrapperId);
        if (!wrapper) return;
        const input  = wrapper.querySelector(".combo-input");
        const list   = wrapper.querySelector(".combo-list");
        const hidden = hiddenId ? document.getElementById(hiddenId) : null;

        // Tracks whether the current input.value was confirmed from the list
        let _confirmedByList = false;

        function getLabel(o) { return typeof o === "object" ? o.label : o; }
        function getId(o)    { return typeof o === "object" ? o.id    : null; }

        function confirm(label, id) {
            input.value = label;
            _confirmedByList = true;
            if (hidden) hidden.value = id ?? "";
            list.classList.add("hidden");
            // Clear any existing error
            clearFieldError(input);
        }

        function renderList(filter) {
            const q = filter.toLowerCase().trim();
            const matches = options.filter(o => getLabel(o).toLowerCase().includes(q));
            list.innerHTML = "";
            if (matches.length === 0) {
                const li = document.createElement("li");
                li.className = "no-match";
                li.textContent = q ? "No matching options" : "No options available";
                list.appendChild(li);
            } else {
                matches.forEach(opt => {
                    const li = document.createElement("li");
                    li.textContent = getLabel(opt);
                    li.addEventListener("mousedown", e => {
                        e.preventDefault();
                        confirm(getLabel(opt), getId(opt));
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
            _confirmedByList = false;    // user changed text — confirmation reset
            if (hidden) hidden.value = "";
            renderList(input.value);
            list.classList.remove("hidden");
        });

        input.addEventListener("blur", () => {
            setTimeout(() => {
                list.classList.add("hidden");
                // If something is typed but it wasn't confirmed from the list, reject it
                if (input.value.trim() !== "" && !_confirmedByList) {
                    input.value = "";
                    if (hidden) hidden.value = "";
                    setFieldError(input, "Please select a vendor from the list.");
                }
            }, 150);
        });

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
                    // Find the matching option object so we can get its id
                    const matched = options.find(o => getLabel(o) === cur.textContent);
                    confirm(cur.textContent, matched ? getId(matched) : null);
                }
            } else if (e.key === "Escape") {
                list.classList.add("hidden");
            }
        });
    }

    // ── Initialise all combos with live data ─────────────────────

    initCombo("euLocationCombo",  LOCATION_OPTS);

    // Department combo stores department_id in a hidden input
    const deptOptions = departments.map(d => ({ id: d.department_id, label: d.department_name }));
    initCombo("euDepartmentCombo", deptOptions.length ? deptOptions : [], "euDepartmentId");

    // Vendor combo stores vendor_id in a hidden input — same pattern/API
    // (/api/vendor) used by computer.js's vendor dropdown.
    const vendorOptions = vendors.map(v => ({ id: v.vendor_id, label: v.vendor_name }));
    initCombo("vendorCombo", vendorOptions, "vendorId");

    // ── Fields that get autofilled + locked when an existing employee is picked ──
    const LOCKED_EU_FIELD_IDS = ["euName", "euEmpId", "euDivision", "euDepartment", "euLocation", "euEmail"];

    // Disable/enable + grey out the autofilled fields so an existing
    // employee's details can't be edited from this form. Styles are also
    // applied inline (not just via the .field-locked class) so this can't
    // be silently overridden by another stylesheet's rules for inputs.
    function setEndUserFieldsLocked(locked) {
        LOCKED_EU_FIELD_IDS.forEach(id => {
            const el = document.getElementById(id);
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
    }

    // Swap the search input for a "selected employee" chip with a remove (×) button.
    function showSelectedEmployeeChip(u) {
        const chip     = document.getElementById("euSelectedChip");
        const chipText = document.getElementById("euSelectedChipText");
        const search   = document.getElementById("euSearch");
        if (chipText) chipText.textContent = `${u.eu_name}${u.eu_emp_id ? "  ·  " + u.eu_emp_id : ""}`;
        if (chip) chip.classList.remove("hidden");
        if (search) search.classList.add("hidden");
    }

    function hideSelectedEmployeeChip() {
        const chip   = document.getElementById("euSelectedChip");
        const search = document.getElementById("euSearch");
        if (chip) chip.classList.add("hidden");
        if (search) {
            search.classList.remove("hidden");
            search.value = "";
        }
    }

    // Fully undo an existing-employee selection: clear the id + all
    // autofilled values, unlock the fields, and restore the search box
    // so the user of the site can search again or type a brand-new entry.
    function clearEndUserSelection({ focusSearch = false } = {}) {
        LOCKED_EU_FIELD_IDS.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = "";
        });
        const deptHidden = document.getElementById("euDepartmentId");
        if (deptHidden) deptHidden.value = "";
        const selectedIdEl = document.getElementById("euSelectedId");
        if (selectedIdEl) selectedIdEl.value = "";

        setEndUserFieldsLocked(false);
        hideSelectedEmployeeChip();

        if (focusSearch) document.getElementById("euSearch")?.focus();
    }

    // ── End-user search combo with autofill ──────────────────────
    function initEndUserSearchCombo() {
        const wrapper = document.getElementById("euSearchCombo");
        if (!wrapper) return;
        const input = wrapper.querySelector(".combo-input");
        const list  = wrapper.querySelector(".combo-list");

        const clearBtn = document.getElementById("euClearSelectionBtn");
        clearBtn?.addEventListener("click", () => clearEndUserSelection({ focusSearch: true }));

        function renderList(filter) {
            const q = filter.toLowerCase().trim();
            const matches = q
                ? endUsers.filter(u => (u.eu_name || "").toLowerCase().includes(q))
                : endUsers;
            list.innerHTML = "";

            if (matches.length === 0) {
                const li = document.createElement("li");
                li.className = "no-match";
                li.textContent = q ? `No employee found for "${filter}"` : "No employees available";
                list.appendChild(li);
            } else {
                matches.forEach(u => {
                    const li = document.createElement("li");
                    li.textContent = `${u.eu_name}${u.eu_emp_id ? "  ·  " + u.eu_emp_id : ""}`;
                    li.addEventListener("mousedown", e => {
                        e.preventDefault();
                        autofillEndUser(u);
                        input.value = u.eu_name;
                        list.classList.add("hidden");
                    });
                    list.appendChild(li);
                });
            }
        }

        input.addEventListener("focus", () => { renderList(input.value); list.classList.remove("hidden"); });
        input.addEventListener("input", () => { renderList(input.value); list.classList.remove("hidden"); });
        input.addEventListener("blur",  () => { setTimeout(() => list.classList.add("hidden"), 150); });

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
            } else if (e.key === "Enter" && cur) {
                e.preventDefault();
                const matched = endUsers.find(u => cur.textContent.startsWith(u.eu_name));
                if (matched) { autofillEndUser(matched); input.value = matched.eu_name; }
                list.classList.add("hidden");
            } else if (e.key === "Escape") {
                list.classList.add("hidden");
            }
        });
    }

    function autofillEndUser(u) {
        // Store the selected eu_id
        const selectedIdEl = document.getElementById("euSelectedId");
        if (selectedIdEl) selectedIdEl.value = u.eu_id ?? "";

        // Text fields
        document.getElementById("euName").value  = u.eu_name   ?? "";
        document.getElementById("euEmpId").value = u.eu_emp_id ?? "";
        document.getElementById("euEmail").value = u.eu_email  ?? "";

        // Division combo
        const divInput = document.getElementById("euDivision");
        if (divInput) divInput.value = u.eu_division ?? "";

        // Department combo + hidden id
        const deptInput = document.getElementById("euDepartment");
        const deptHidden = document.getElementById("euDepartmentId");
        if (deptInput)  deptInput.value  = u.department_name ?? "";
        if (deptHidden) deptHidden.value = u.department_id   ?? "";

        // Location combo
        const locInput = document.getElementById("euLocation");
        if (locInput) locInput.value = u.eu_location ?? "";

        // Lock the autofilled fields so they can't be hand-edited while an
        // existing employee is selected, and show the "selected" chip in
        // place of the search box (with its own × to unselect).
        setEndUserFieldsLocked(true);
        showSelectedEmployeeChip(u);
    }

    initEndUserSearchCombo();

    // Populate native <select> elements from categories
    function populateSelect(id, group, fallback) {
        const el = document.getElementById(id);
        if (!el) return;
        const opts = catOpts(group, fallback);
        const current = el.value;
        // Preserve the placeholder with disabled/selected/hidden so it cannot be submitted
        const placeholderText = el.options[0]?.text || "Select…";
        el.innerHTML = `<option value="" disabled selected hidden>${placeholderText}</option>`;
        opts.forEach(o => {
            const opt = document.createElement("option");
            opt.value = o;
            opt.textContent = o;
            if (o === current) opt.selected = true;
            el.appendChild(opt);
        });
    }

    const licenseTypeFallback = ["Subscription", "Perpetual", "Open Source", "Trial", "Volume License"];
    const statusFallback      = ["Active", "For Renewal", "Expired", "Discontinued"];

    populateSelect("licenseType", "software.license_type", licenseTypeFallback);

	let assets = [];

	const tbody = document.getElementById("assetTableBody");
	const searchInput = document.getElementById("searchInput");

	const pageTitleMap = {
		software: "Software"
	};

	const pageApiMap = {
		software: "/api/software"
	};

	function getCurrentPageKey() {
		const fileName = window.location.pathname.split("/").pop().replace(".html", "") || "software";
		return pageTitleMap[fileName] ? fileName : "software";
	}

	function getApiEndpoint() {
		return pageApiMap[getCurrentPageKey()] || pageApiMap.software;
	}

	// --- Stepper State -------------------------------------------
	let currentStep = 1;
	const totalSteps = 4;

	// --- Assign User Toggle ---------------------------------------
	function toggleAssignUserFields() {
		const assignSelect = document.querySelector("input[name='willAssignUser']:checked");
		const assignFields = document.querySelector(".assign-user-fields");

		if (!assignSelect || !assignFields) return;

		const shouldShow = assignSelect.value === "Yes";

		// Use style.display directly so no CSS class conflict can override it
		assignFields.style.display = shouldShow ? "grid" : "none";

		// Toggle required on all inputs except the optional email and search/hidden fields
		assignFields.querySelectorAll("input").forEach(input => {
			if (input.id === "euEmail") return;
			if (input.id === "euSearch") return;
			if (input.id === "euSelectedId") return;
			input.required = shouldShow;
		});

		// Clear values when hiding
		if (!shouldShow) {
			assignFields.querySelectorAll("input").forEach(input => {
				input.value = "";
			});
			// Also unlock any fields left disabled from a prior existing-employee
			// selection, and restore the search box so the next "Yes" starts fresh.
			setEndUserFieldsLocked(false);
			hideSelectedEmployeeChip();
		}
	}

	function resetModal() {
		document.querySelectorAll("#assetModal input, #assetModal select, #assetModal textarea").forEach(el => {
			if (el.type === "checkbox" || el.type === "radio") {
				el.checked = false;
			} else {
				el.value = "";
			}
		});

		const assignNoOption = document.querySelector("input[name='willAssignUser'][value='No']");
		if (assignNoOption) assignNoOption.checked = true;

		toggleAssignUserFields();
		updateExpiryDateState();
		goToStep(1);
	}

	function openAssetModal() {
		resetModal();
		document.getElementById("assetModal").classList.remove("hidden");
	}

	function goToStep(step) {
		if (step === 4) {
			populateReviewStep();
		}

		// Show only the active step panel
		document.querySelectorAll(".step-panel").forEach(p => p.classList.add("hidden"));
		document.getElementById(`step-${step}`).classList.remove("hidden");

		// Update stepper tab styles
		document.querySelectorAll(".step").forEach(el => {
			const s = parseInt(el.dataset.step);
			el.classList.remove("active", "done", "inactive");
			if (s < step)        el.classList.add("done");
			else if (s === step) el.classList.add("active");
			else                 el.classList.add("inactive");
		});

		// Show/hide Back button
		document.getElementById("backBtn").classList.toggle("hidden", step === 1);

		// Change Next to Submit on last step
		const nextBtn = document.getElementById("nextBtn");
		nextBtn.textContent = step === totalSteps ? "Submit" : "Next →";

		currentStep = step;
	}

	// ── Field Error Helpers ──────────────────────────────────────
	function setFieldError(el, message) {
		if (!el) return;
		const anchor = el.closest(".form-group") || el.parentElement;
		let msg = anchor.querySelector(".field-error");
		if (message) {
			el.style.borderColor = "#e24b4a";
			el.style.boxShadow   = "0 0 0 3px rgba(226,75,74,.1)";
			if (!msg) {
				msg = document.createElement("span");
				msg.className = "field-error";
				msg.style.cssText = "display:block;color:#e24b4a;font-size:12px;margin-top:4px;";
				anchor.appendChild(msg);
			}
			msg.textContent = message;
		} else {
			el.style.borderColor = "";
			el.style.boxShadow   = "";
			if (msg) msg.remove();
		}
	}

	function clearFieldError(el) {
		setFieldError(el, null);
	}

	// ── Date helpers ─────────────────────────────────────────────
	function todayISO() {
		return new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"
	}

	/**
	 * Validate purchase date (no future). Renewal and expiry dates
	 * may be any date, including past dates.
	 */
	function validateDates() {
		const today = todayISO();
		let valid = true;

		// Purchase Date — must NOT be in the future
		const purchaseEl = document.getElementById("purchaseDate");
		if (purchaseEl?.value) {
			if (purchaseEl.value > today) {
				setFieldError(purchaseEl, "Purchase date cannot be a future date.");
				valid = false;
			} else {
				clearFieldError(purchaseEl);
			}
		}


		return valid;
	}

	/** Set browser-level min/max on date inputs so the picker enforces limits */
	function applyDateConstraints() {
		const today = todayISO();
		const purchase = document.getElementById("purchaseDate");
		if (purchase) purchase.max = today;          // no future dates

		// Renewal and expiry dates have no min/max constraint —
		// past dates are allowed.
	}

	applyDateConstraints();

	// ── Expiry Date gating (Perpetual license / Auto Renew) ───────
	// Expiry Date is not applicable when the license is Perpetual or
	// when Auto Renew is checked — grey it out and clear any value.
	function updateExpiryDateState() {
		const expiryEl = document.getElementById("expiryDate");
		const licenseTypeEl = document.getElementById("licenseType");
		const autoRenewEl = document.getElementById("autoRenew");
		if (!expiryEl || !licenseTypeEl || !autoRenewEl) return;

		const isPerpetual = licenseTypeEl.value === "Perpetual";
		const isAutoRenew = autoRenewEl.checked;
		const shouldDisable = isPerpetual || isAutoRenew;

		expiryEl.disabled = shouldDisable;
		expiryEl.classList.toggle("field-disabled", shouldDisable);

		if (shouldDisable) {
			expiryEl.value = "";
			clearFieldError(expiryEl);
		}
	}

	document.getElementById("licenseType")?.addEventListener("change", updateExpiryDateState);
	document.getElementById("autoRenew")?.addEventListener("change", updateExpiryDateState);
	updateExpiryDateState();

	// ── Permission popup close ────────────────────────────────────
	document.getElementById("permDeniedCloseBtn").addEventListener("click", () => {
		document.getElementById("permDeniedModal").classList.add("hidden");
	});
	document.getElementById("permDeniedModal").addEventListener("click", (e) => {
		if (e.target === document.getElementById("permDeniedModal")) {
			document.getElementById("permDeniedModal").classList.add("hidden");
		}
	});

	// Wire each validated field to self-clear its error on interaction
	function attachClearOnInput(id) {
		const el = document.getElementById(id);
		if (!el) return;
		const evt = (el.tagName === "SELECT") ? "change" : "input";
		el.addEventListener(evt, () => clearFieldError(el));
	}

	[
		"softwareName", "vendor", "licenseType", "subscriptionId",
		"purchaseDate", "expiryDate", "cost",
		"euName", "euEmpId", "euDivision",
		"euDepartment", "euLocation", "assignedDate"
	].forEach(attachClearOnInput);

	// ── Number-only enforcement ──────────────────────────────────
	// Blocks non-numeric keypresses and strips non-numeric pastes on
	// cost and previousCost (both type="number").
	function enforceNumberOnly(id) {
		const el = document.getElementById(id);
		if (!el) return;
		el.addEventListener("keydown", e => {
			const passthrough = [
				"Backspace","Delete","Tab","Escape","Enter",
				"ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Home","End","."
			];
			if (passthrough.includes(e.key)) return;
			if (e.ctrlKey || e.metaKey) return;
			if (!/^\d$/.test(e.key)) e.preventDefault();
		});
		el.addEventListener("paste", e => {
			const pasted = (e.clipboardData || window.clipboardData).getData("text");
			if (!/^\d*\.?\d*$/.test(pasted)) e.preventDefault();
		});
	}

	enforceNumberOnly("cost");
	enforceNumberOnly("previousCost");

	function validateStep(step) {
		let valid = true;

		if (step === 1) {
			// Plain text field
			const softwareNameEl = document.getElementById("softwareName");
			if (!softwareNameEl || softwareNameEl.value.trim() === "") {
				setFieldError(softwareNameEl, "Software Name is required.");
				valid = false;
			} else {
				clearFieldError(softwareNameEl);
			}

			// Vendor — must be picked from the dropdown, not free-typed
			// (same enforcement pattern as computer.js).
			const vendorEl = document.getElementById("vendor");
			const vendorId = document.getElementById("vendorId")?.value;
			if (!vendorEl || vendorEl.value.trim() === "") {
				setFieldError(vendorEl, "Vendor is required.");
				valid = false;
			} else if (!vendorId) {
				setFieldError(vendorEl, "Please select a vendor from the list.");
				valid = false;
			} else {
				clearFieldError(vendorEl);
			}

			// License Type combo
			const licenseTypeEl = document.getElementById("licenseType");
			if (!licenseTypeEl || licenseTypeEl.value.trim() === "") {
				setFieldError(licenseTypeEl, "License Type is required.");
				valid = false;
			} else {
				clearFieldError(licenseTypeEl);
			}

			// Subscription ID — optional
			const subscriptionIdEl = document.getElementById("subscriptionId");
			clearFieldError(subscriptionIdEl);

		} else if (step === 2) {
			// Required date fields
			const dateFields = [
				{ id: "purchaseDate", label: "Purchase Date" },
				{ id: "expiryDate",   label: "Expiry Date" },
			];
			dateFields.forEach(({ id, label }) => {
				const el = document.getElementById(id);
				if (el?.disabled) {
					clearFieldError(el);
					return;
				}
				if (!el || el.value.trim() === "") {
					setFieldError(el, `${label} is required.`);
					valid = false;
				} else {
					clearFieldError(el);
				}
			});

			// Date logic validation (no future purchase, no past renewal/expiry)
			if (!validateDates()) valid = false;

		} else if (step === 3) {
			const assignOption = document.querySelector("input[name='willAssignUser']:checked");
			if (!assignOption) {
				valid = false;
			} else if (assignOption.value === "Yes") {
				// Text fields
				const textFields = [
					{ id: "euName",  label: "Employee Name" },
					{ id: "euEmpId", label: "Employee ID" },
				];
				textFields.forEach(({ id, label }) => {
					const el = document.getElementById(id);
					if (!el || el.value.trim() === "") {
						setFieldError(el, `${label} is required.`);
						valid = false;
					} else {
						clearFieldError(el);
					}
				});

				// Combo fields
				const comboFields = [
					{ id: "euDivision",   label: "Division" },
					{ id: "euDepartment", label: "Department" },
					{ id: "euLocation",   label: "Location" },
				];
				comboFields.forEach(({ id, label }) => {
					const el = document.getElementById(id);
					if (!el || el.value.trim() === "") {
						setFieldError(el, `${label} is required.`);
						valid = false;
					} else {
						clearFieldError(el);
					}
				});

				// Date field
				const assignedDateEl = document.getElementById("assignedDate");
				if (!assignedDateEl || assignedDateEl.value.trim() === "") {
					setFieldError(assignedDateEl, "Assigned Date is required.");
					valid = false;
				} else {
					clearFieldError(assignedDateEl);
				}
			}
		}

		return valid;
	}

	// --- Modal Open / Close ----------------------------------------
	// ── Permission gate: Add Asset — Software (permission 10) ──
	function applyPageState() {
		const currentPage = getCurrentPageKey();
		const pageTitle = document.getElementById("pageTitle");
		if (pageTitle) {
			pageTitle.textContent = `IT Assets > ${pageTitleMap[currentPage]}`;
		}

		if (document.body) {
			document.body.dataset.assetPage = currentPage;
		}

		let userPermissions = [];
		try {
			userPermissions = JSON.parse(localStorage.getItem("permissions") || "[]");
		} catch {
			userPermissions = [];
		}

		const canAddSoftware = userPermissions.includes(10);
		console.log("[Permission 10 — Add Asset: Software]", canAddSoftware ? "GRANTED" : "DENIED", "| Permissions:", userPermissions);

		const addBtnContainer = document.getElementById("addAssetBtnContainer");
		if (addBtnContainer) {
			if (!canAddSoftware) {
				addBtnContainer.innerHTML = `
					<div class="perm-btn-wrapper" data-tooltip="You need Add Asset: Software permission to add a software record.">
						<button class="primary perm-locked" disabled>
							<i data-lucide="lock"></i> Add Software
						</button>
					</div>`;
				addBtnContainer.querySelector(".perm-btn-wrapper").addEventListener("click", () => {
					document.getElementById("permDeniedModal").classList.remove("hidden");
				});
			} else {
				addBtnContainer.innerHTML = `
					<button id="addAssetBtn" class="primary">
						<i data-lucide="plus"></i> Add Software
					</button>`;
				document.getElementById("addAssetBtn").addEventListener("click", () => {
					applyDateConstraints();
					openAssetModal();
				});
			}
			lucide.createIcons();
		}
	}

	function filterAssetsByTab(data) {
		let result = data;
		Object.entries(columnFilters).forEach(([key, valueSet]) => {
			if (valueSet && valueSet.size > 0) {
				result = result.filter(asset => valueSet.has(asset[key]));
			}
		});
		return result;
	}

	function populateReviewStep() {
		// Software Basics
		document.getElementById("revSoftwareName").textContent = document.getElementById("softwareName").value || "-";
		document.getElementById("revVendor").textContent = document.getElementById("vendor").value || "-";
		document.getElementById("revLicenseType").textContent = document.getElementById("licenseType").value || "-";
		document.getElementById("revSubscriptionId").textContent = document.getElementById("subscriptionId").value || "-";

		// License & Cost
		document.getElementById("revPurchaseDate").textContent = document.getElementById("purchaseDate").value || "-";
		document.getElementById("revExpiryDate").textContent = document.getElementById("expiryDate").value || "-";
		document.getElementById("revAutoRenew").textContent = document.getElementById("autoRenew").checked ? "Yes" : "No";
		document.getElementById("revCost").textContent = document.getElementById("cost").value || "-";
		document.getElementById("revPreviousCost").textContent = document.getElementById("previousCost").value || "-";
		document.getElementById("revRemarks").textContent = document.getElementById("remarks").value || "-";

		// Assigned Employee Details — show section only if Yes was selected
		const isAssigned = document.querySelector("input[name='willAssignUser']:checked")?.value === "Yes";
		const revAssignedSection = document.getElementById("revAssignedSection");

		if (isAssigned) {
			revAssignedSection.style.display = "flex";
			document.getElementById("revEuName").textContent = document.getElementById("euName").value || "-";
			document.getElementById("revEuEmpId").textContent = document.getElementById("euEmpId").value || "-";
			document.getElementById("revEuDivision").textContent = document.getElementById("euDivision").value || "-";
			document.getElementById("revEuDepartment").textContent = document.getElementById("euDepartment").value || "-";
			document.getElementById("revEuLocation").textContent = document.getElementById("euLocation").value || "-";
			document.getElementById("revEuEmail").textContent = document.getElementById("euEmail").value || "-";
			document.getElementById("revAssignedDate").textContent = document.getElementById("assignedDate").value || "-";
		} else {
			revAssignedSection.style.display = "none";
		}
	}

	// --- Modal Open / Close ----------------------------------------

	document.getElementById("closeModal").addEventListener("click", () => {
		document.getElementById("assetModal").classList.add("hidden");
	});

	document.getElementById("cancelModal").addEventListener("click", () => {
		document.getElementById("assetModal").classList.add("hidden");
	});

	document.querySelectorAll("input[name='willAssignUser']").forEach(radio => {
		radio.addEventListener("change", toggleAssignUserFields);
	});

	// --- Next / Back -------------------------------------------------
	document.getElementById("nextBtn").addEventListener("click", () => {
		if (!validateStep(currentStep)) {
			return; // inline field errors are shown — no alert needed
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

			const assignUserSelected = document.querySelector("input[name='willAssignUser']:checked")?.value === "Yes";

			const payload = {
				// Step 1 — Software Basics (Required)
				softwareName:    document.getElementById("softwareName").value.trim(),
				vendor:          document.getElementById("vendor").value.trim(),
				licenseType:     document.getElementById("licenseType").value,
				// Step 1 — Optional
				subscriptionId:  document.getElementById("subscriptionId").value.trim() !== ""
					? document.getElementById("subscriptionId").value.trim()
					: null,

				// Step 2 — License & Cost (Required)
				purchaseDate:    document.getElementById("purchaseDate").value,
				expiryDate:      document.getElementById("expiryDate").disabled
					? null
					: document.getElementById("expiryDate").value,
				autoRenew:       document.getElementById("autoRenew").checked,
				cost:            document.getElementById("cost").value !== ""
					? parseFloat(document.getElementById("cost").value)
					: null,
				// Step 2 — Optional
				previousCost:    document.getElementById("previousCost").value !== ""
					? parseFloat(document.getElementById("previousCost").value)
					: null,
				remarks:         document.getElementById("remarks").value.trim() || null,

				// Assigned user fields — only sent when assigning
				euSelectedId:    assignUserSelected ? (document.getElementById("euSelectedId").value || null) : null,
				euName:          assignUserSelected ? document.getElementById("euName").value.trim() : null,
				euEmpId:         assignUserSelected ? document.getElementById("euEmpId").value.trim() : null,
				euDivision:      assignUserSelected ? document.getElementById("euDivision").value.trim() : null,
				euDepartment:    assignUserSelected ? (document.getElementById("euDepartmentId").value || document.getElementById("euDepartment").value.trim() || null) : null,
				euLocation:      assignUserSelected ? document.getElementById("euLocation").value.trim() : null,
				euEmail:         assignUserSelected ? document.getElementById("euEmail").value.trim() || null : null,
				assignedDate:    assignUserSelected ? document.getElementById("assignedDate").value : null
			};

			console.log("Submitting payload:", payload);

			const response = await fetch(`${getApiEndpoint()}`, {
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

				// Backend rejects resigned employee assignment — show a toast and send
				// the user back to the assignment step to clear the selection
				if (errorData.message === "Cannot assign assets to a Resigned end user") {
					const euName = document.getElementById("euName")?.value || "This employee";
					showErrorToast(`${euName} is resigned and cannot be assigned to this asset.`);
					goToStep(3);
					clearEndUserSelection();
					return;
				}

				throw new Error(`API Error: ${response.status} - ${JSON.stringify(errorData)}`);
			}

			document.getElementById("assetModal").classList.add("hidden");

			await loadAssets();
			console.log("Software added successfully!");

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

			// Fetch software and end-users in parallel
			const [softwareRes, userRes] = await Promise.all([
				fetch(`${getApiEndpoint()}`, { headers }),
				fetch("/api/end-user", { headers })
			]);

			const rawUsers = await userRes.json();
			console.log("End-users API response:", rawUsers);
			const endUsers = Array.isArray(rawUsers)
				? rawUsers
				: (rawUsers.data ?? rawUsers.users ?? rawUsers.endUsers ?? []);

			// Build lookup map: eu_id → { department_name, eu_location }
			const userMap = {};
			endUsers.forEach(u => {
				userMap[u.eu_id] = {
					department_name: u.department_name || "-",
					eu_location:     u.eu_location     || "-"
				};
			});

			const rawAssets = await softwareRes.json();
			console.log("Software API response:", rawAssets);
			assets = Array.isArray(rawAssets)
				? rawAssets
				: (rawAssets.data ?? rawAssets.software ?? rawAssets.assets ?? []);

			// Attach department and location to each asset before rendering
			assets = assets.map(asset => ({
				...asset,
				department_name: asset.assigned_user_id
					? (userMap[asset.assigned_user_id]?.department_name ?? "-")
					: "-",
				eu_location: asset.assigned_user_id
					? (userMap[asset.assigned_user_id]?.eu_location ?? "-")
					: "-"
			}));

			renderTable(filterAssetsByTab(assets));
			updateSummaryCards(assets);
			console.log("Software assets loaded:", assets);
		} catch (err) {
			console.error(err);
		}
	}

	// --- Summary Cards -------------------------------------------
	function updateSummaryCards(data) {
		let active      = 0;
		let expired     = 0;
		let forRenewal  = 0;
		let discontinued = 0;

		data.forEach(asset => {
			const status = (asset.software_status || "").toLowerCase();

			if (status === "active")       active++;
			if (status === "expired")      expired++;
			if (status === "for renewal")  forRenewal++;
			if (status === "discontinued") discontinued++;
		});

		document.getElementById("activeCount").textContent     = active;
		document.getElementById("expiredCount").textContent    = expired;
		document.getElementById("forRenewalCount").textContent = forRenewal;
		document.getElementById("discontinuedCount").textContent = discontinued;
	}

	function formatDate(value) {
		if (!value) return "-";
		const d = new Date(value);
		if (isNaN(d)) return value;
		return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
	}

	// ── Column definitions (order matches <thead>) ───────────────
	const ALL_COLUMNS = [
		{ key: "software_name",        label: "Software Name" },
		{ key: "vendor",               label: "Vendor" },
		{ key: "license_type",         label: "License Type" },
		{ key: "subscription_id",      label: "Subscription ID" },
		{ key: "software_status",      label: "Status" },
		{ key: "purchase_date",        label: "Purchase Date" },
		{ key: "renewal_date",         label: "Renewal Date" },
		{ key: "expiry_date",          label: "Expiry Date" },
		{ key: "cost",                 label: "Cost" },
		{ key: "previous_cost",        label: "Previous Cost" },
		{ key: "assigned_user_name",   label: "Assigned User" },
		{ key: "assigned_user_emp_id", label: "Employee ID" },
		{ key: "department_name",      label: "Department" },
		{ key: "eu_location",          label: "Location" },
		{ key: "assigned_date",        label: "Assigned Date" },
		{ key: "remarks",              label: "Remarks" },
		{ key: "action",               label: "Action" },
	];

	// Default visible columns (mirrors the original table)
	const DEFAULT_VISIBLE = new Set([
		"software_name", "license_type", "renewal_date", "expiry_date",
		"assigned_user_name", "department_name", "software_status", "action"
	]);

	// Active visible set — start from default
	let visibleCols = new Set(DEFAULT_VISIBLE);

	// ── Column toggle UI ─────────────────────────────────────────
	function buildColPanel() {
		const list = document.getElementById("colCheckboxList");
		if (!list) return;
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
		// Sync checkboxes in panel
		document.querySelectorAll("#colCheckboxList input[type=checkbox]").forEach(cb => {
			cb.checked = visibleCols.has(cb.value);
		});
		// Show/hide header <th>
		document.querySelectorAll("#assetTable thead th[data-col]").forEach(th => {
			th.style.display = visibleCols.has(th.dataset.col) ? "" : "none";
		});
		// Show/hide body <td> by column index
		const headers = [...document.querySelectorAll("#assetTable thead th[data-col]")];
		const colKeys = headers.map(th => th.dataset.col);
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
		visibleCols.add("action"); // always keep action
		buildColPanel();
		renderTable(searchAssets(searchInput.value));
	});
	document.getElementById("colReset").addEventListener("click", () => {
		visibleCols = new Set(DEFAULT_VISIBLE);
		buildColPanel();
		renderTable(searchAssets(searchInput.value));
	});

	// Build panel on load and immediately hide non-default headers
	buildColPanel();
	applyColumnVisibility();

	// ── Column Value Filters (Excel/pivot-style checkbox filters) ─
	// Reuses the exact same category data + fallback lists that power
	// the Add Asset dropdowns (catOpts / vendorFallback / etc.)
	const FILTERABLE_COLUMNS = [
		{ key: "license_type",    group: "software.license_type", fallback: licenseTypeFallback },
		{ key: "software_status", group: "software.status",       fallback: statusFallback },
		{ key: "department_name", options: () => [...new Set(departments.map(d => d.department_name).filter(Boolean))].sort() },
		{ key: "eu_location",     options: LOCATION_OPTS },
	];

	// key -> Set of checked values. Empty Set = no filter applied (show all).
	const columnFilters = {};

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
				if (col.key === "software_status") syncStatusCards();
				renderTable(searchAssets(searchInput.value));
			});
			panel.querySelector(".col-filter-apply").addEventListener("click", () => {
				const checked = [...panel.querySelectorAll("input[type=checkbox]:checked")].map(cb => cb.value);
				columnFilters[col.key] = new Set(checked);
				btn.classList.toggle("active", checked.length > 0);
				panel.classList.add("hidden");
				if (col.key === "software_status") syncStatusCards();
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

	buildColumnFilterUI();

	// ── Status Summary Cards (Active / For Renewal / Expired / Discontinued) ──
	// These act as one-click shortcuts into the same "software_status" column
	// filter used by the Status column header, so keep the card's "selected"
	// look in sync with whatever software_status is currently set to.
	function syncStatusCards() {
		const current = columnFilters["software_status"];
		const activeStatus = (current && current.size === 1) ? [...current][0] : null;
		document.querySelectorAll(".status-card").forEach(card => {
			card.classList.toggle("selected", card.dataset.status === activeStatus);
		});
	}

	// Clicking a card applies that single status as the software_status
	// filter (matching the column filter's checkbox + Apply behavior).
	// Clicking the already-active card again clears the filter.
	function applyStatusCardFilter(status) {
		const key = "software_status";
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

	// ── Status badge (Active / Expired / Renewal Due / Inactive) ──
	const STATUS_BADGE_CLASS = {
		active:         "status-active",
		"for renewal":  "status-for-renewal",
		expired:        "status-expired",
		discontinued:   "status-discontinued"
	};

	function statusBadge(status) {
		if (!status) return "-";
		const cls = STATUS_BADGE_CLASS[status.toLowerCase()] || "";
		return `<span class="status-badge ${cls}">${status}</span>`;
	}

	function renderTable(data) {
		data = applySort(data);
		tbody.innerHTML = "";
		const fmt = v => (v === null || v === undefined || v === "") ? "-" : v;

		data.forEach(asset => {
			const row = document.createElement("tr");
			const cells = [
				{ key: "software_name",        html: fmt(asset.software_name) },
				{ key: "vendor",               html: fmt(asset.vendor) },
				{ key: "license_type",         html: fmt(asset.license_type) },
				{ key: "subscription_id",      html: fmt(asset.subscription_id) },
				{ key: "software_status",      html: statusBadge(asset.software_status) },
				{ key: "purchase_date",        html: formatDate(asset.purchase_date) },
				{ key: "renewal_date",         html: formatDate(asset.renewal_date) },
				{ key: "expiry_date",          html: formatDate(asset.expiry_date) },
				{ key: "cost",                 html: asset.cost != null ? `₱${Number(asset.cost).toLocaleString()}` : "-" },
				{ key: "previous_cost",        html: asset.previous_cost != null ? `₱${Number(asset.previous_cost).toLocaleString()}` : "-" },
				{ key: "assigned_user_name",   html: asset.assigned_user_name || "Unassigned" },
				{ key: "assigned_user_emp_id", html: fmt(asset.assigned_user_emp_id) },
				{ key: "department_name",      html: fmt(asset.department_name) },
				{ key: "eu_location",          html: fmt(asset.eu_location) },
				{ key: "assigned_date",        html: formatDate(asset.assigned_date) },
				{ key: "remarks",              html: fmt(asset.remarks) },
				{ key: "action",               html: `<a href="softwareItem.html?id=${asset.software_id}" class="action-btn" title="Open"><i data-lucide="external-link"></i></a>` },
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
	const DATE_KEYS = ["purchase_date", "renewal_date", "expiry_date", "assigned_date"];

	// ── Column Sorting (single dropdown button, like column filters) ──
	const SORTABLE_COLUMNS = ["purchase_date", "renewal_date", "expiry_date", "assigned_date", "cost", "assigned_user_name"];
	const ALPHA_SORT_COLUMNS = ["assigned_user_name"]; // sorted alphabetically instead of numerically
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
		if (!q) return filterAssetsByTab(assets);
		return filterAssetsByTab(assets).filter(asset => {
			const searchable = Object.entries(asset).map(([k, v]) => {
				if (v == null) return "";
				if (DATE_KEYS.includes(k)) return formatDate(v);
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
		renderTable(filterAssetsByTab(assets));
	}

	document.getElementById("refreshFiltersBtn")?.addEventListener("click", resetAllFilters);

	applyPageState();
	buildSortableHeaders();

	await loadAssets();

	// ── Apply filters carried over via URL query params ───────────────
	// e.g. software.html?status=Expired  or  software.html?software_name=Zoom
	// Lets other pages (like the Asset Overview dashboard) deep-link
	// straight into a pre-filtered view of this table.
	// "software_name" isn't an Excel-style column filter here, so it's
	// applied via the free-text search box instead — same as if the user
	// had typed it in themselves.
	(function applyFiltersFromURL() {
		const params = new URLSearchParams(window.location.search);
		const statusRaw = params.get("status") || params.get("software_status");
		const nameRaw   = params.get("software_name");

		let didApplyColumnFilter = false;

		if (statusRaw) {
			const values = statusRaw.split(",").map(v => v.trim()).filter(Boolean);
			const th = document.querySelector(`#assetTable thead th[data-col="software_status"]`);
			if (values.length && th && th._filterPanel && th._filterBtn) {
				columnFilters.software_status = new Set(values);
				didApplyColumnFilter = true;

				th._filterPanel.querySelectorAll("input[type=checkbox]").forEach(cb => {
					cb.checked = values.includes(cb.value);
				});
				th._filterBtn.classList.add("active");
			}
		}

		if (nameRaw) {
			searchInput.value = nameRaw;
		}

		syncStatusCards();
		if (didApplyColumnFilter || nameRaw) {
			renderTable(searchAssets(searchInput.value));
		}
	})();

});
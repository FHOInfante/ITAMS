document.addEventListener("DOMContentLoaded", async () => {

	lucide.createIcons();

	let assets = [];

	const tbody = document.getElementById("assetTableBody");
	const searchInput = document.getElementById("searchInput");

	// ─── Stepper State ───────────────────────────────────────────
	let currentStep = 1;
	const totalSteps = 4;

	// ─── Load Category-Driven Dropdown Options ───────────────────
	const token = localStorage.getItem("token");

	const LOCATION_OPTS = ["B2", "B1", "GF", "2F", "3F", "4F", "5F", "6F", "7F", "8F", "PO"];

	// Hoisted to outer scope (not just loadDropdownOptions) so the header
	// column filters below can reuse the exact same fallback lists.
	const brandFallback      = ["Cisco", "TP-Link", "Ubiquiti", "Netgear", "D-Link", "Huawei", "Other"];
	const deviceTypeFallback = ["Router", "Switch", "Access Point", "Firewall", "Modem", "Hub"];
	const assetConditionFallback = ["New", "Used"];


	// ─── Searchable Combobox Factory ─────────────────────────────
	// options: string[] for plain combos (e.g. location)
	//          OR { id, label }[] for combos that must enforce a list
	//          selection (e.g. vendor) — pass hiddenId to write the
	//          picked id into a hidden <input> of that id.
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
		// wasn't actually picked from the dropdown list. Reuses this
		// file's own setFieldError/clearFieldError helpers.
		function enforceSelection() {
			if (isValidSelection()) {
				clearFieldError(input);
				return true;
			}
			setFieldError(input, "Please select an option from the dropdown list.");
			return false;
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
					if (id !== null) li.dataset.id = id;
					li.addEventListener("mousedown", e => {
						e.preventDefault();
						input.value = label;
						if (hidden && id !== null) hidden.value = id;
						list.classList.add("hidden");
						clearFieldError(input);
					});
					list.appendChild(li);
				});
			}
		}

		input.addEventListener("focus", () => { renderList(input.value); list.classList.remove("hidden"); });
		input.addEventListener("input", () => {
			renderList(input.value);
			list.classList.remove("hidden");
			// Clear the enforced selection when the user types freely
			if (hidden) hidden.value = "";
		});
		input.addEventListener("blur",  () => {
			setTimeout(() => {
				list.classList.add("hidden");
				enforceSelection();
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
					const id = cur.dataset.id || null;
					input.value = cur.textContent;
					if (hidden && id) hidden.value = id;
					list.classList.add("hidden");
					clearFieldError(input);
				}
			} else if (e.key === "Escape") {
				list.classList.add("hidden");
			}
		});
	}

	let categories = {}; // keyed by category_group, e.g. categories["network_device.brand"]
	let vendors = [];    // [{ vendor_id, vendor_name }]

	// Same logic as computer.js / computerItem.js's fmtDate — use local date parts
	// to avoid UTC→local shift on ISO strings like "2022-03-02T16:00:00.000Z"
	function fmtDate(val) {
		if (!val) return "-";
		const d = new Date(val);
		if (isNaN(d)) return String(val);
		return d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
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

	async function loadCategories() {
		try {
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

	// Resolve options for a combo — falls back to provided array if API returns nothing
	function catOpts(group, fallback) {
		return (categories[group] && categories[group].length)
			? categories[group]
			: fallback;
	}

	// Populate native <select> elements from categories
	function populateSelect(id, group, fallback) {
		const el = document.getElementById(id);
		if (!el) return;
		const opts = catOpts(group, fallback);
		const current = el.value;
		// Preserve the placeholder option with disabled/selected/hidden attributes
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

	async function loadDropdownOptions() {
		await Promise.all([loadCategories(), loadVendors()]);

		populateSelect("brand",          "network_device.brand",          brandFallback);
		populateSelect("deviceType",     "network_device.device_type",    deviceTypeFallback);
		populateSelect("assetCondition", "network_device.asset_condition", assetConditionFallback);

		// Location searchable combobox — driven by category API, falls back to LOCATION_OPTS
		const locationOpts = catOpts("network_device.asset_location", LOCATION_OPTS);
		initCombo("assetLocationCombo", locationOpts);

		// Vendor combo stores vendor_id in a hidden input
		const vendorOptions = vendors.map(v => ({ id: v.vendor_id, label: v.vendor_name }));
		initCombo("vendorCombo", vendorOptions, "vendorId");
	}

	// ─── Modal Reset & Open ──────────────────────────────────────
	function resetModal() {
		document.getElementById("stepper").classList.add("hidden");
		document.getElementById("modalFooter").classList.add("hidden");

		document.querySelectorAll(".step-panel").forEach(panel => {
			panel.classList.add("hidden");
		});

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

	// ─── Stepper Navigation ──────────────────────────────────────
	function goToStep(step) {
		if (step === totalSteps) {
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

	// ─── Field Error Helpers ─────────────────────────────────────
	function setFieldError(el, message) {
		if (!el) return;
		let msg = el.parentElement.querySelector(".field-error");
		if (message) {
			el.style.borderColor = "#e24b4a";
			el.style.boxShadow   = "0 0 0 3px rgba(226,75,74,.1)";
			if (!msg) {
				msg = document.createElement("span");
				msg.className = "field-error";
				msg.style.cssText = "display:block;color:#e24b4a;font-size:12px;margin-top:4px;";
				el.parentElement.appendChild(msg);
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

	// Clear error on input / change
	function attachClearOnInput(id) {
		const el = document.getElementById(id);
		if (!el) return;
		const evt = (el.tagName === "SELECT") ? "change" : "input";
		el.addEventListener(evt, () => clearFieldError(el));
	}

	// ─── Number-only enforcement ─────────────────────────────────
	// portCount and cost are type="number" already — but we also
	// block non-numeric keypresses for a tighter UX.
	function enforceNumberOnly(id) {
		const el = document.getElementById(id);
		if (!el) return;
		el.addEventListener("keydown", e => {
			// Allow: backspace, delete, tab, escape, enter, arrows, home/end
			const allowed = ["Backspace","Delete","Tab","Escape","Enter","ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Home","End","."];
			if (allowed.includes(e.key)) return;
			// Allow Ctrl/Cmd combos (select all, copy, paste, etc.)
			if (e.ctrlKey || e.metaKey) return;
			// Block anything that isn't a digit
			if (!/^\d$/.test(e.key)) e.preventDefault();
		});
		// Strip on paste
		el.addEventListener("paste", e => {
			const pasted = (e.clipboardData || window.clipboardData).getData("text");
			if (!/^\d*\.?\d*$/.test(pasted)) e.preventDefault();
		});
	}

	// ─── Attach number-only to applicable numeric fields ─────────
	enforceNumberOnly("portCount");
	enforceNumberOnly("cost");

	// Attach clear-on-interaction to all validated fields
	[
		"deviceName", "assetLocation", "serialNumber", "brand",
		"model", "deviceType", "assetStatus", "assetCondition",
		"receivedDate", "warrantyExpiry", "vendor"
	].forEach(attachClearOnInput);

	// ─── Validation ──────────────────────────────────────────────
	// ── Date helpers ─────────────────────────────────────────────
	function todayISO() {
		return new Date().toISOString().split("T")[0];
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
			input.style.boxShadow   = "0 0 0 3px rgba(226,75,74,.1)";
		} else {
			if (msg) msg.remove();
			input.style.borderColor = "";
			input.style.boxShadow   = "";
		}
	}

	function validateDates() {
		const today = todayISO();
		let valid = true;

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

		return valid;
	}

	function applyDateConstraints() {
		const today = todayISO();
		const recv = document.getElementById("receivedDate");
		if (recv) recv.max = today;
		const warr = document.getElementById("warrantyExpiry");
		if (warr) warr.min = today;
		const dep = document.getElementById("dateDeployed");
		if (dep) dep.max = today;
	}

	applyDateConstraints();

	function validateStep(step) {
		let valid = true;

		if (step === 1) {
			// Text / combo fields
			const textFields = [
				{ id: "serialNumber", label: "Serial Number" },
				{ id: "model",        label: "Model" },
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

			// Combo (assetLocation) — reads from the text input
			const locationEl = document.getElementById("assetLocation");
			if (!locationEl || locationEl.value.trim() === "") {
				setFieldError(locationEl, "Asset Location is required.");
				valid = false;
			} else {
				clearFieldError(locationEl);
			}
			// Must match a real option from the dropdown, not free-typed
			if (!(document.getElementById("assetLocationCombo")?._enforceSelection?.() ?? true)) {
				valid = false;
			}

			// Dropdown fields
			const dropdowns = [
				{ id: "brand",          label: "Brand" },
				{ id: "deviceType",     label: "Device Type" },
				{ id: "assetStatus",    label: "Status" },
				{ id: "assetCondition", label: "Condition" },
			];
			dropdowns.forEach(({ id, label }) => {
				const el = document.getElementById(id);
				if (!el || el.value === "" || el.value === null) {
					setFieldError(el, `Please select a ${label}.`);
					valid = false;
				} else {
					clearFieldError(el);
				}
			});

		} else if (step === 3) {
			// Required date fields
			const dateFields = [
				{ id: "receivedDate",   label: "Received Date" },
			];
			dateFields.forEach(({ id, label }) => {
				const el = document.getElementById(id);
				if (!el || el.value.trim() === "") {
					setFieldError(el, `${label} is required.`);
					valid = false;
				} else {
					clearFieldError(el);
				}
			});

			// Vendor must be selected from the list, not free-typed
			const vendorEl = document.getElementById("vendor");
			if (!vendorEl || vendorEl.value.trim() === "") {
				setFieldError(vendorEl, "Vendor / Supplier is required.");
				valid = false;
			} else if (!(document.getElementById("vendorCombo")?._enforceSelection?.() ?? true)) {
				valid = false;
			} else {
				clearFieldError(vendorEl);
			}

			// Date logic validation (future/past checks)
			if (!validateDates()) valid = false;
		}

		// Step 2 (Network Details) is all optional — always valid
		return valid;
	}

	// ─── Populate Review (Step 4) ────────────────────────────────
	function populateReviewStep() {
		// Asset Basics
		document.getElementById("revDeviceName").textContent      = document.getElementById("deviceName").value || "-";
		document.getElementById("revAssetLocation").textContent   = document.getElementById("assetLocation").value || "-";
		document.getElementById("revSerialNumber").textContent    = document.getElementById("serialNumber").value || "-";
		document.getElementById("revBrand").textContent           = document.getElementById("brand").value || "-";
		document.getElementById("revModel").textContent           = document.getElementById("model").value || "-";
		document.getElementById("revDeviceType").textContent      = document.getElementById("deviceType").value || "-";
		document.getElementById("revAssetStatus").textContent     = document.getElementById("assetStatus").value || "-";
		document.getElementById("revAssetCondition").textContent  = document.getElementById("assetCondition").value || "-";
		document.getElementById("revAssetTag").textContent        = document.getElementById("assetTag").value || "-";

		// Network Details
		document.getElementById("revIpAddress").textContent       = document.getElementById("ipAddress").value || "-";
		document.getElementById("revMacAddress").textContent      = document.getElementById("macAddress").value || "-";
		document.getElementById("revPortCount").textContent       = document.getElementById("portCount").value || "-";
		document.getElementById("revFirmwareVersion").textContent = document.getElementById("firmwareVersion").value || "-";

		// Procurement & Details
		document.getElementById("revReceivedDate").textContent    = document.getElementById("receivedDate").value || "-";
		document.getElementById("revWarrantyExpiry").textContent  = document.getElementById("warrantyExpiry").value || "-";
		document.getElementById("revVendor").textContent          = document.getElementById("vendor").value || "-";
		document.getElementById("revDateDeployed").textContent    = document.getElementById("dateDeployed").value || "-";
		document.getElementById("revCost").textContent            = document.getElementById("cost").value || "-";
		document.getElementById("revRemarks").textContent         = document.getElementById("remarks").value || "-";
	}

	// ─── Modal Open / Close ──────────────────────────────────────
	// ── Permission gate: Add Asset — Network Device (permission 13) ──
	function applyPageState() {
		let userPermissions = [];
		try {
			userPermissions = JSON.parse(localStorage.getItem("permissions") || "[]");
		} catch {
			userPermissions = [];
		}

		const canAddNetworkDevice = userPermissions.includes(13);
		console.log("[Permission 13 — Add Asset: Network Device]", canAddNetworkDevice ? "GRANTED" : "DENIED", "| Permissions:", userPermissions);

		const addBtnContainer = document.getElementById("addAssetBtnContainer");
		if (addBtnContainer) {
			if (!canAddNetworkDevice) {
				addBtnContainer.innerHTML = `
					<div class="perm-btn-wrapper" data-tooltip="You need Add Asset: Network Device permission to add an asset.">
						<button class="primary perm-locked" disabled>
							<i data-lucide="lock"></i> Add Asset
						</button>
					</div>`;
				// Clicking the wrapper (tooltip area) opens the permission popup
				addBtnContainer.querySelector(".perm-btn-wrapper").addEventListener("click", () => {
					document.getElementById("permDeniedModal").classList.remove("hidden");
				});
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
	}

	applyPageState();

	// ── Permission popup close ────────────────────────────────────
	document.getElementById("permDeniedCloseBtn").addEventListener("click", () => {
		document.getElementById("permDeniedModal").classList.add("hidden");
	});
	document.getElementById("permDeniedModal").addEventListener("click", (e) => {
		if (e.target === document.getElementById("permDeniedModal")) {
			document.getElementById("permDeniedModal").classList.add("hidden");
		}
	});

	document.getElementById("closeModal").addEventListener("click", () => {
		document.getElementById("assetModal").classList.add("hidden");
	});

	document.getElementById("cancelModal").addEventListener("click", () => {
		document.getElementById("assetModal").classList.add("hidden");
	});

	// ─── Next / Back ─────────────────────────────────────────────
	document.getElementById("nextBtn").addEventListener("click", () => {
		if (!validateStep(currentStep)) {
			return; // inline field errors shown — no alert needed
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

	// ─── Custom Confirm Dialog ───────────────────────────────────
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

	// ─── Submit ──────────────────────────────────────────────────
	async function handleSubmit() {
		const confirmAdd = await showConfirmDialog();
		if (!confirmAdd) return;

		try {
			const token = localStorage.getItem("token");

			const portCountVal = document.getElementById("portCount").value;
			const costVal = document.getElementById("cost").value;

			const payload = {
				// Step 1 — Asset Basics
				deviceName:       document.getElementById("deviceName").value.trim() || null,
				assetLocation:    document.getElementById("assetLocation").value.trim(),
				serialNo:         document.getElementById("serialNumber").value.trim(),
				brand:            document.getElementById("brand").value.trim(),
				model:            document.getElementById("model").value.trim(),
				deviceType:       document.getElementById("deviceType").value,
				assetStatus:      document.getElementById("assetStatus").value,
				assetCondition:   document.getElementById("assetCondition").value,
				// Step 1 — Optional
				assetTag:         document.getElementById("assetTag").value.trim() || null,

				// Step 2 — Network Details (all optional)
				ipAddress:        document.getElementById("ipAddress").value.trim() || null,
				macAddress:       document.getElementById("macAddress").value.trim() || null,
				portCount:        portCountVal ? parseInt(portCountVal) : null,
				firmwareVersion:  document.getElementById("firmwareVersion").value.trim() || null,

				// Step 3 — Procurement & Details
				receivedDate:     document.getElementById("receivedDate").value,
				warrantyExpiry:   document.getElementById("warrantyExpiry").value,
				vendor:           document.getElementById("vendor").value.trim(),
				// Step 3 — Optional
				dateDeployed:     document.getElementById("dateDeployed").value || null,
				cost:             costVal ? parseFloat(costVal) : null,
				remarks:          document.getElementById("remarks").value.trim() || null,
			};

			console.log("Submitting network device payload:", JSON.stringify(payload, null, 2));

			const response = await fetch("/api/network-device", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify(payload)
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
				console.error("API Error Status:", response.status);
				console.error("API Error Response:", JSON.stringify(errorData, null, 2));
				throw new Error(`API Error: ${response.status} - ${JSON.stringify(errorData)}`);
			}

			document.getElementById("assetModal").classList.add("hidden");
			await loadAssets();
			console.log("Network device added successfully!");

		} catch (err) {
			console.error(err);
			showErrorToast("Something went wrong. Please try again.");
		}
	}

	// ─── Load & Render Table ─────────────────────────────────────
	async function loadAssets() {
		try {
			const token = localStorage.getItem("token");

			const response = await fetch("/api/network-device", {
				method: "GET",
				headers: {
					Authorization: `Bearer ${token}`
				}
			});

			const json = await response.json();
			assets = Array.isArray(json) ? json : (json.data ?? []);
			renderTable(assets);
			updateSummaryCards(assets);

		} catch (err) {
			console.error(err);
		}
	}

	function updateSummaryCards(data) {
		document.getElementById("activeCount").textContent    = data.filter(a => a.asset_status === "Active").length;
		document.getElementById("repairCount").textContent    = data.filter(a => a.asset_status === "Repair").length;
		document.getElementById("spareCount").textContent     = data.filter(a => a.asset_status === "Spare").length;
		document.getElementById("defectiveCount").textContent = data.filter(a => a.asset_status === "Defective").length;
	}

	// ── Column definitions ───────────────────────────────────────
	const ALL_COLUMNS = [
		{ key: "asset_tag",            label: "Asset Tag" },
		{ key: "network_device_name",  label: "Device Name" },
		{ key: "serial_no",            label: "Serial No." },
		{ key: "brand",                label: "Brand" },
		{ key: "model",                label: "Model" },
		{ key: "device_type",          label: "Device Type" },
		{ key: "asset_status",         label: "Status" },
		{ key: "asset_condition",      label: "Condition" },
		{ key: "asset_location",       label: "Location" },
		{ key: "ip_address",           label: "IP Address" },
		{ key: "mac_address",          label: "MAC Address" },
		{ key: "port_count",           label: "Port Count" },
		{ key: "firmware_version",     label: "Firmware" },
		{ key: "received_date",        label: "Received" },
		{ key: "warranty_expiry",      label: "Warranty Expiry" },
		{ key: "date_deployed",        label: "Date Deployed" },
		{ key: "vendor",               label: "Vendor" },
		{ key: "cost",                 label: "Cost" },
		{ key: "remarks",              label: "Remarks" },
		{ key: "action",               label: "Action" },
	];

	// Default visible columns (mirrors original table)
	const DEFAULT_VISIBLE = new Set([
		"network_device_name", "brand", "model",
		"device_type", "ip_address", "asset_location", "asset_status", "action"
	]);

	let visibleCols = new Set(DEFAULT_VISIBLE);

	// ── Column (header) filters — populated from the same category API ──
	// used by the "Add Asset" dropdowns (populateSelect/catOpts/FILTERABLE_COLUMNS).
	// key -> Set of checked values. Empty Set = no filter applied (show all).
	const columnFilters = {};

	function filterAssetsByColumns(data) {
		let result = data;
		Object.entries(columnFilters).forEach(([key, valueSet]) => {
			if (valueSet && valueSet.size > 0) {
				result = result.filter(asset => valueSet.has(asset[key]));
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
		document.querySelectorAll("#colCheckboxList input[type=checkbox]").forEach(cb => {
			cb.checked = visibleCols.has(cb.value);
		});
		document.querySelectorAll("#assetTable thead th[data-col]").forEach(th => {
			th.style.display = visibleCols.has(th.dataset.col) ? "" : "none";
		});
		const colKeys = [...document.querySelectorAll("#assetTable thead th[data-col]")].map(th => th.dataset.col);
		document.querySelectorAll("#assetTableBody tr").forEach(row => {
			[...row.cells].forEach((td, i) => {
				td.style.display = visibleCols.has(colKeys[i]) ? "" : "none";
			});
		});
	}

	// Panel open/close
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
	// the Add Asset dropdowns (catOpts / brandFallback / deviceTypeFallback / assetConditionFallback)
	const FILTERABLE_COLUMNS = [
		{ key: "brand",           group: "network_device.brand",           fallback: brandFallback },
		{ key: "device_type",     group: "network_device.device_type",     fallback: deviceTypeFallback },
		{ key: "asset_condition", group: "network_device.asset_condition", fallback: assetConditionFallback },
		{ key: "asset_status",    options: ["Active", "Repair", "Spare", "Defective"] },
		{ key: "asset_location",  group: "network_device.asset_location",  fallback: LOCATION_OPTS },
		{ key: "vendor",          options: () => [...new Set(vendors.map(v => v.vendor_name).filter(Boolean))].sort() },
	];

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

	// ── Status badge (Active / Spare / Repair / Defective) ───────
	const STATUS_BADGE_CLASS = {
		active:    "status-active",
		spare:     "status-spare",
		repair:    "status-repair",
		defective: "status-defective"
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
				{ key: "asset_tag",           html: fmt(asset.asset_tag) },
				{ key: "network_device_name", html: fmt(asset.network_device_name) },
				{ key: "serial_no",           html: fmt(asset.serial_no) },
				{ key: "brand",               html: fmt(asset.brand) },
				{ key: "model",               html: fmt(asset.model) },
				{ key: "device_type",         html: fmt(asset.device_type) },
				{ key: "asset_status",        html: statusBadge(asset.asset_status) },
				{ key: "asset_condition",     html: fmt(asset.asset_condition) },
				{ key: "asset_location",      html: fmt(asset.asset_location) },
				{ key: "ip_address",          html: fmt(asset.ip_address) },
				{ key: "mac_address",         html: fmt(asset.mac_address) },
				{ key: "port_count",          html: fmt(asset.port_count) },
				{ key: "firmware_version",    html: fmt(asset.firmware_version) },
				{ key: "received_date",       html: fmtDate(asset.received_date) },
				{ key: "warranty_expiry",     html: fmtDate(asset.warranty_expiry) },
				{ key: "date_deployed",       html: fmtDate(asset.date_deployed) },
				{ key: "vendor",              html: fmt(asset.vendor) },
				{ key: "cost",                html: asset.cost != null ? `₱${Number(asset.cost).toLocaleString()}` : "-" },
				{ key: "remarks",             html: fmt(asset.remarks) },
				{ key: "action",              html: `<a href="networkDevicesItem.html?id=${asset.network_device_id}" class="action-btn" title="Open"><i data-lucide="external-link"></i></a>` },
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

	// ─── Search ──────────────────────────────────────────────────
	const DATE_KEYS = ["received_date", "warranty_expiry", "date_deployed"];

	// ── Column Sorting (single dropdown button, like column filters) ──
	const SORTABLE_COLUMNS = ["received_date", "warranty_expiry", "date_deployed", "port_count", "cost"];
	let sortState = { key: null, dir: null }; // dir: "asc" | "desc" | null

	function applySort(data) {
		if (!sortState.key) return data;
		const key = sortState.key;
		const dir = sortState.dir;
		const isDateCol = DATE_KEYS.includes(key);
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
			const ascLabel  = "Ascending";
			const descLabel = "Descending";

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

		// Close panels on outside click, on table scroll, or on resize
		// (shared listeners already registered by buildColumnFilterUI cover
		// closeAllFilterPanels; nothing extra needed here since sort panels
		// use the same ".col-filter-panel" / ".col-filter-btn" classes.)

		lucide.createIcons();
	}

	function searchAssets(query) {
		const q = query.toLowerCase().trim();
		const base = filterAssetsByColumns(assets);
		if (!q) return base;
		return base.filter(asset => {
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

	await loadDropdownOptions();
	buildColumnFilterUI();
	buildSortableHeaders();
	await loadAssets();

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

	// Clicking a card applies that single status as the asset_status
	// filter (matching the column filter's checkbox + Apply behavior).
	// Clicking the already-active card again clears the filter.
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

	// ── Apply column filters carried over via URL query params ───────
	// e.g. networkDevices.html?status=Active&device_type=Switch
	// Lets other pages (like the Asset Overview dashboard) deep-link
	// straight into a pre-filtered view of this table.
	(function applyFiltersFromURL() {
		const params = new URLSearchParams(window.location.search);

		const paramsByColumnKey = {
			asset_status: params.get("status") || params.get("asset_status"),
			device_type:  params.get("device_type"),
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
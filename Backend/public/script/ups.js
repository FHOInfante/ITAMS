document.addEventListener("DOMContentLoaded", async () => {

	lucide.createIcons();

	// ─── Shared lookup data ───────────────────────────────────────
	const token = localStorage.getItem("token");

	let categories  = {};   // keyed by category_group, e.g. categories["ups.brand"]
	let computers   = [];   // [{ computer_id, computer_name, asset_tag }]
	let vendors     = [];   // [{ vendor_id, vendor_name }]
	let departments = [];   // [{ department_id, department_name }]

	const LOCATION_OPTS = ["B2","B1","GF","2F","3F","4F","5F","6F","7F","8F","PO"];

	async function loadCategories() {
		try {
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

	async function loadComputers() {
		try {
			const res = await fetch("/api/computer", {
				headers: { Authorization: `Bearer ${token}` }
			});
			if (res.ok) computers = await res.json();
		} catch (err) {
			console.warn("Could not load computers:", err);
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

	// Load lookup data before initialising combos
	await Promise.all([loadCategories(), loadComputers(), loadVendors(), loadDepartments()]);

	// ─── Helper: resolve category options with fallback ──────────
	function catOpts(group, fallback) {
		return (categories[group] && categories[group].length)
			? categories[group]
			: fallback;
	}

	// ── Date helpers ─────────────────────────────────────────────
	function todayISO() {
		const _d = new Date();
		return `${_d.getFullYear()}-${String(_d.getMonth()+1).padStart(2,"0")}-${String(_d.getDate()).padStart(2,"0")}`;
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

		// Warranty Expiry — past dates are allowed (warranty may already be expired)
		const warranty = document.getElementById("warrantyExpiry")?.value;
		if (warranty) {
			setDateError("warrantyExpiry", null);
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
		const deployed = document.getElementById("dateDeployed");
		if (deployed) deployed.max = today;
	}

	applyDateConstraints();

	// ── Enforce numbers-only on capacityVa and cost ──────────────
	const capacityInput = document.getElementById("capacityVa");
	if (capacityInput) {
		capacityInput.addEventListener("keypress", e => {
			if (!/[0-9]/.test(e.key)) e.preventDefault();
		});
		capacityInput.addEventListener("input", () => {
			capacityInput.value = capacityInput.value.replace(/[^0-9]/g, "");
		});
	}

	const costInput = document.getElementById("cost");
	if (costInput) {
		costInput.addEventListener("keypress", e => {
			// allow digits and one decimal point
			if (!/[0-9.]/.test(e.key)) e.preventDefault();
			if (e.key === "." && costInput.value.includes(".")) e.preventDefault();
		});
		costInput.addEventListener("input", () => {
			costInput.value = costInput.value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
		});
	}

	// ─── Searchable Combobox factory ─────────────────────────────
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

		// Keyboard navigation
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
					setComboError(null);
				}
			} else if (e.key === "Escape") {
				list.classList.add("hidden");
			}
		});
	}

	// ─── Enforced Searchable Combo ────────────────────────────────
	// Like initCombo but the user MUST pick from the list.
	// Free-typed text that was never confirmed via click or Enter
	// is cleared on blur and an inline error is shown.
	function initEnforcedCombo(wrapperId, options, hiddenId = null) {
		const wrapper = document.getElementById(wrapperId);
		if (!wrapper) return;
		const input  = wrapper.querySelector(".combo-input");
		const list   = wrapper.querySelector(".combo-list");
		const hidden = hiddenId ? document.getElementById(hiddenId) : null;

		let _confirmedByList = false;

		function getLabel(o) { return typeof o === "object" ? o.label : o; }
		function getId(o)    { return typeof o === "object" ? o.id    : null; }

		function confirmSelection(label, id) {
			input.value        = label;
			_confirmedByList   = true;
			if (hidden) hidden.value = id ?? "";
			list.classList.add("hidden");
			// Clear any existing error on this field
			setFieldError("vendor", null);
		}

		function renderList(filter) {
			const q       = filter.toLowerCase().trim();
			const matches = options.filter(o => getLabel(o).toLowerCase().includes(q));
			list.innerHTML = "";

			if (matches.length === 0) {
				const li = document.createElement("li");
				li.className   = "no-match";
				li.textContent = q ? "No matching options" : "No options available";
				list.appendChild(li);
			} else {
				matches.forEach(opt => {
					const li = document.createElement("li");
					li.textContent = getLabel(opt);
					li.addEventListener("mousedown", e => {
						e.preventDefault();
						confirmSelection(getLabel(opt), getId(opt));
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
			_confirmedByList = false;       // user is typing freely — reset confirmation
			if (hidden) hidden.value = "";
			renderList(input.value);
			list.classList.remove("hidden");
		});

		input.addEventListener("blur", () => {
			setTimeout(() => {
				list.classList.add("hidden");
				// Reject free-typed text that was never confirmed from the list
				if (input.value.trim() !== "" && !_confirmedByList) {
					input.value = "";
					if (hidden) hidden.value = "";
					setFieldError("vendor", "Please select a vendor from the list.");
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
					const matched = options.find(o => getLabel(o) === cur.textContent);
					confirmSelection(cur.textContent, matched ? getId(matched) : null);
				}
			} else if (e.key === "Escape") {
				list.classList.add("hidden");
			}
		});
	}

	// ─── Initialise combos with live API data ─────────────────────
	const brandFallback  = ["APC", "Eaton", "CyberPower", "Vertiv", "Schneider Electric", "Other"];

	initCombo("brandCombo", catOpts("ups.brand", brandFallback));

	// Vendor uses enforced selection — free-typed text is rejected on blur.
	// Sourced from the real /api/vendor list (same as computer.js), not the category API.
	const vendorOptions = vendors.map(v => ({ id: v.vendor_id, label: v.vendor_name }));
	initEnforcedCombo("vendorCombo", vendorOptions, "vendorId");

	const computerOptions = computers.map(c => ({
		id:    c.computer_id,
		label: `${c.computer_name}${c.asset_tag ? " (" + c.asset_tag + ")" : ""}`
	}));
	initCombo("computerAssignedToCombo", computerOptions, "computerAssignedToId");

	// ─── Table & Search state ─────────────────────────────────────
	let assets = [];

	const tbody       = document.getElementById("assetTableBody");
	const searchInput = document.getElementById("searchInput");

	// ─── Stepper State ───────────────────────────────────────────
	let currentStep = 1;
	const totalSteps = 3;

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

		["brand", "computerAssignedTo", "vendor"].forEach(id => {
			const el = document.getElementById(id);
			if (el) el.value = "";
		});
		const compHidden = document.getElementById("computerAssignedToId");
		if (compHidden) compHidden.value = "";
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

	// ─── Inline field error helper ─────────────────────────────
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

	// ─── Validation ──────────────────────────────────────────────
	function validateStep(step) {
		if (step === 1) {
			const requiredFields = [
				{ id: "serialNumber",   label: "Serial Number" },
				{ id: "brand",          label: "Brand" },
				{ id: "model",          label: "Model" },
				{ id: "upsStatus",      label: "Status" },
				{ id: "assetCondition", label: "Asset Condition" },
			];
			let valid = true;
			requiredFields.forEach(({ id, label }) => {
				const el = document.getElementById(id);
				const empty = !el || el.value.trim() === "";
				if (empty) { valid = false; setFieldError(id, `${label} is required.`); }
				else       { setFieldError(id, null); }
			});

			// Brand must be picked from its dropdown, not free-typed
			const brandOk = document.getElementById("brandCombo")?._enforceSelection?.() ?? true;
			// Assigned Computer (optional) must still come from the list if filled in
			const assignedOk = document.getElementById("computerAssignedToCombo")?._enforceSelection?.() ?? true;
			if (!brandOk || !assignedOk) valid = false;

			return valid;
		} else if (step === 2) {
			const requiredFields = [
				{ id: "capacityVa",    label: "Capacity (VA)" },
				{ id: "receivedDate",  label: "Received Date" },
				{ id: "vendor",        label: "Vendor / Supplier" },
			];
			let valid = true;
			requiredFields.forEach(({ id, label }) => {
				const el = document.getElementById(id);
				const empty = !el || el.value.trim() === "";
				if (empty) { valid = false; setFieldError(id, `${label} is required.`); }
				else       { setFieldError(id, null); }
			});
			if (!valid) return false;

			// capacityVa must be a positive integer
			const capEl = document.getElementById("capacityVa");
			if (capEl && capEl.value.trim() !== "") {
				const capVal = parseInt(capEl.value.trim(), 10);
				if (isNaN(capVal) || capVal <= 0) {
					setFieldError("capacityVa", "Capacity must be a positive number (e.g. 1500).");
					return false;
				} else {
					setFieldError("capacityVa", null);
				}
			}

			// cost must be a non-negative number if provided
			const costEl = document.getElementById("cost");
			if (costEl && costEl.value.trim() !== "") {
				const costVal = parseFloat(costEl.value.trim());
				if (isNaN(costVal) || costVal < 0) {
					setFieldError("cost", "Cost must be a valid non-negative number.");
					return false;
				} else {
					setFieldError("cost", null);
				}
			}

			return validateDates();
		}
		return true;
	}

	// ─── Populate Review (Step 3) ────────────────────────────────
	function populateReviewStep() {
		// Asset Basics
		document.getElementById("revSerialNumber").textContent       = document.getElementById("serialNumber").value || "-";
		document.getElementById("revBrand").textContent              = document.getElementById("brand").value || "-";
		document.getElementById("revModel").textContent              = document.getElementById("model").value || "-";
		document.getElementById("revUpsStatus").textContent          = document.getElementById("upsStatus").value || "-";
		document.getElementById("revAssetCondition").textContent     = document.getElementById("assetCondition").value || "-";
		document.getElementById("revAssetTag").textContent           = document.getElementById("assetTag").value || "-";
		document.getElementById("revComputerAssignedTo").textContent = document.getElementById("computerAssignedTo").value || "-";

		// Procurement & Details
		document.getElementById("revCapacityVa").textContent         = document.getElementById("capacityVa").value || "-";
		document.getElementById("revReceivedDate").textContent       = document.getElementById("receivedDate").value || "-";
		document.getElementById("revWarrantyExpiry").textContent     = document.getElementById("warrantyExpiry").value || "-";
		document.getElementById("revVendor").textContent             = document.getElementById("vendor").value || "-";
		document.getElementById("revBatteryReplaceDate").textContent = document.getElementById("batteryReplaceDate").value || "-";
		document.getElementById("revDateDeployed").textContent       = document.getElementById("dateDeployed").value || "-";
		document.getElementById("revCost").textContent               = document.getElementById("cost").value || "-";
		document.getElementById("revRemarks").textContent            = document.getElementById("remarks").value || "-";
	}

	// ─── Modal Open / Close ──────────────────────────────────────
	// ── Permission gate: Add Asset — UPS (permission 12) ────
	// Parse permissions from localStorage; default to empty array on any failure
	let userPermissions = [];
	try {
		userPermissions = JSON.parse(localStorage.getItem("permissions") || "[]");
	} catch {
		userPermissions = [];
	}

	const canAddUps = userPermissions.includes(12);
	console.log("[Permission 12 — Add Asset: UPS]", canAddUps ? "GRANTED" : "DENIED", "| Permissions:", userPermissions);

	const addBtnContainer = document.getElementById("addAssetBtnContainer");
	if (addBtnContainer) {
		if (!canAddUps) {
			addBtnContainer.innerHTML = `
				<div class="perm-btn-wrapper" data-tooltip="You need Add Asset: UPS permission to add an asset.">
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

	// ─── Next / Back ─────────────────────────────────────────────
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

			const computerIdVal = document.getElementById("computerAssignedToId").value
				|| document.getElementById("computerAssignedTo").value;

			const capacityRaw = document.getElementById("capacityVa").value.trim();
			const costRaw     = document.getElementById("cost").value.trim();

			const payload = {
				computerAssignedTo:  computerIdVal ? parseInt(computerIdVal, 10) : null,
				assetTag:            document.getElementById("assetTag").value.trim() || null,
				serialNo:            document.getElementById("serialNumber").value.trim(),
				brand:               document.getElementById("brand").value.trim(),
				vendor:              document.getElementById("vendor").value.trim(),
				model:               document.getElementById("model").value.trim(),
				capacityVa:          capacityRaw ? parseInt(capacityRaw, 10) : 0,
				batteryReplaceDate:  document.getElementById("batteryReplaceDate").value || null,
				assetStatus:         document.getElementById("upsStatus").value,
				assetCondition:      document.getElementById("assetCondition").value || "New",
				receivedDate:        document.getElementById("receivedDate").value,
				warrantyExpiry:      document.getElementById("warrantyExpiry").value || null,
				dateDeployed:        document.getElementById("dateDeployed").value || null,
				cost:                costRaw ? parseFloat(costRaw) : null,
				remarks:             document.getElementById("remarks").value.trim() || null,
			};

			console.log("UPS payload breakdown:", JSON.stringify(payload, null, 2));
			console.log("Submitting UPS payload:", payload);

			const response = await fetch("/api/ups", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify(payload)
			});

			if (!response.ok) {
				const rawText = await response.text();
				let errorData;
				try { errorData = JSON.parse(rawText); } catch { errorData = { raw: rawText }; }
				console.error("API Error Response:", errorData);
				console.error("Full response text:", rawText);
				throw new Error(`API Error: ${response.status} - ${rawText}`);
			}

			document.getElementById("assetModal").classList.add("hidden");
			await loadAssets();
			console.log("UPS asset added successfully!");

		} catch (err) {
			console.error(err);
			showErrorToast("Something went wrong. Please try again.");
		}
	}

	// ─── Update Summary Cards ─────────────────────────────────────
	function updateSummaryCards(data) {
		const active    = data.filter(a => a.asset_status === "Active").length;
		const spare     = data.filter(a => a.asset_status === "Spare").length;
		const repair    = data.filter(a => a.asset_status === "Repair").length;
		const defective = data.filter(a => a.asset_status === "Defective").length;

		document.getElementById("activeCount").textContent    = active;
		document.getElementById("spareCount").textContent     = spare;
		document.getElementById("repairCount").textContent    = repair;
		document.getElementById("defectiveCount").textContent = defective;
	}

	// ─── Load & Render Table ─────────────────────────────────────
	async function loadAssets() {
		try {
			const token = localStorage.getItem("token");

			const response = await fetch("/api/ups", {
				method: "GET",
				headers: {
					Authorization: `Bearer ${token}`
				}
			});

			assets = await response.json();
			renderTable(searchAssets(searchInput.value));
			updateSummaryCards(assets);

		} catch (err) {
			console.error(err);
		}
	}

	// ── Column definitions ───────────────────────────────────────
	const ALL_COLUMNS = [
		{ key: "asset_tag",            label: "Asset Tag" },
		{ key: "serial_no",            label: "Serial No." },
		{ key: "brand",                label: "Brand" },
		{ key: "model",                label: "Model" },
		{ key: "capacity_va",          label: "Capacity (VA)" },
		{ key: "asset_status",         label: "Status" },
		{ key: "asset_condition",      label: "Condition" },
		{ key: "department_name",      label: "Department" },
		{ key: "asset_location",       label: "Location" },
		{ key: "computer_assigned_to", label: "Assigned To" },
		{ key: "received_date",        label: "Received" },
		{ key: "warranty_expiry",      label: "Warranty Expiry" },
		{ key: "battery_replace_date", label: "Battery Replaced" },
		{ key: "date_deployed",        label: "Date Deployed" },
		{ key: "vendor",               label: "Vendor" },
		{ key: "cost",                 label: "Cost" },
		{ key: "remarks",              label: "Remarks" },
		{ key: "action",               label: "Action" },
	];

	// Default visible columns (mirrors original table)
	const DEFAULT_VISIBLE = new Set([
		"brand", "model", "capacity_va",
		"department_name", "asset_location", "asset_status", "action"
	]);

	let visibleCols = new Set(DEFAULT_VISIBLE);

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
	// the Add Asset dropdowns (catOpts / brandFallback / etc.)
	const FILTERABLE_COLUMNS = [
		{ key: "brand",           getOptions: () => catOpts("ups.brand", brandFallback) },
		{ key: "vendor",          getOptions: () => [...new Set(vendors.map(v => v.vendor_name).filter(Boolean))] },
		{ key: "asset_status",    getOptions: () => ["Active", "Repair", "Spare", "Defective"] },
		{ key: "asset_condition", getOptions: () => ["New", "Used"] },
		{ key: "department_name", getOptions: () => [...new Set(departments.map(d => d.department_name).filter(Boolean))].sort() },
		{ key: "asset_location",  getOptions: () => LOCATION_OPTS },
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

			const options   = col.getOptions();
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

	buildColumnFilterUI();

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
				{ key: "asset_tag",            html: fmt(asset.asset_tag) },
				{ key: "serial_no",            html: fmt(asset.serial_no) },
				{ key: "brand",                html: fmt(asset.brand) },
				{ key: "model",                html: fmt(asset.model) },
				{ key: "capacity_va",          html: fmt(asset.capacity_va) },
				{ key: "asset_status",         html: statusBadge(asset.asset_status) },
				{ key: "asset_condition",      html: fmt(asset.asset_condition) },
				{ key: "department_name",      html: fmt(asset.department_name) },
				{ key: "asset_location",       html: fmt(asset.asset_location) },
				{ key: "computer_assigned_to", html: (() => {
					const match = computers.find(c => c.computer_id === asset.computer_assigned_to);
					return fmt(match ? `${match.computer_name}${match.asset_tag ? " (" + match.asset_tag + ")" : ""}` : (asset.computer_name || asset.computer_assigned_to));
				})() },
				{ key: "received_date",        html: fmtDate(asset.received_date) },
				{ key: "warranty_expiry",      html: fmtDate(asset.warranty_expiry) },
				{ key: "battery_replace_date", html: fmtDate(asset.battery_replace_date) },
				{ key: "date_deployed",        html: fmtDate(asset.date_deployed) },
				{ key: "vendor",               html: fmt(asset.vendor) },
				{ key: "cost",                 html: asset.cost != null ? `₱${Number(asset.cost).toLocaleString()}` : "-" },
				{ key: "remarks",              html: fmt(asset.remarks) },
				{ key: "action",               html: `<a href="upsItem.html?id=${asset.ups_id}" class="action-btn" title="Open"><i data-lucide="external-link"></i></a>` },
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
	const DATE_KEYS = ["received_date", "warranty_expiry", "battery_replace_date", "date_deployed"];

	// ── Column Sorting (single dropdown button, like column filters) ──
	const SORTABLE_COLUMNS = ["capacity_va", "received_date", "warranty_expiry", "battery_replace_date", "date_deployed", "computer_assigned_to"];
	const ALPHA_SORT_COLUMNS = ["computer_assigned_to"]; // sorted alphabetically instead of numerically
	let sortState = { key: null, dir: null }; // dir: "asc" | "desc" | null

	// Resolves the same display label shown in the table's "Assigned To" cell,
	// so alphabetical sorting matches what the user actually sees.
	function getAssignedToLabel(asset) {
		const match = computers.find(c => c.computer_id === asset.computer_assigned_to);
		if (match) return `${match.computer_name}${match.asset_tag ? " (" + match.asset_tag + ")" : ""}`;
		return (asset.computer_name || asset.computer_assigned_to || "").toString();
	}

	function applySort(data) {
		if (!sortState.key) return data;
		const key = sortState.key;
		const dir = sortState.dir;
		const isDateCol  = DATE_KEYS.includes(key);
		const isAlphaCol = ALPHA_SORT_COLUMNS.includes(key);

		if (isAlphaCol) {
			return [...data].sort((a, b) => {
				const va = (key === "computer_assigned_to" ? getAssignedToLabel(a) : (a[key] ?? "")).toString().trim();
				const vb = (key === "computer_assigned_to" ? getAssignedToLabel(b) : (b[key] ?? "")).toString().trim();
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

	function applyColumnFilters(data) {
		let result = data;
		Object.entries(columnFilters).forEach(([key, valueSet]) => {
			if (valueSet && valueSet.size > 0) {
				result = result.filter(asset => valueSet.has(asset[key]));
			}
		});
		return result;
	}

	function searchAssets(query) {
		const q = query.toLowerCase().trim();
		const base = applyColumnFilters(assets);
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

	await loadAssets();
	buildSortableHeaders();

	// ── Apply column filters carried over via URL query params ───────
	// e.g. ups.html?status=Active&brand=APC
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
		if (didApply) renderTable(searchAssets(searchInput.value));
	})();

});
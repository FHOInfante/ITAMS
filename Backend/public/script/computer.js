document.addEventListener("DOMContentLoaded", async () => {
  lucide.createIcons();

  // ── Shared lookup data (mirroring computerItem.js) ───────────
  const token = localStorage.getItem("token");

  const LOCATION_OPTS = [
    "B2",
    "B1",
    "GF",
    "2F",
    "3F",
    "4F",
    "5F",
    "6F",
    "7F",
    "8F",
    "PO",
  ];

  let categories = {}; // keyed by category_group, e.g. categories["computer.brand"]
  let departments = []; // [{ department_id, department_name }]
  let vendors = []; // [{ vendor_id, vendor_name }]
  let endUsers = []; // [{ eu_id, eu_name, eu_emp_id, eu_division, department_name, eu_location, eu_email, eu_contact_number, ... }]

  async function loadCategories() {
    try {
      const res = await fetch("/api/category?asset=computer", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const list = await res.json();
      categories = list
        .filter((c) => c.is_active)
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
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) departments = await res.json();
    } catch (err) {
      console.warn("Could not load departments:", err);
    }
  }

  async function loadVendors() {
    try {
      const res = await fetch("/api/vendor", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) vendors = await res.json();
    } catch (err) {
      console.warn("Could not load vendors:", err);
    }
  }

  async function loadEndUsers() {
    try {
      const res = await fetch("/api/end-user", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const raw = await res.json();
      endUsers = Array.isArray(raw)
        ? raw
        : (raw.data ?? raw.users ?? raw.endUsers ?? []);
    } catch (err) {
      console.warn("Could not load end users:", err);
    }
  }

  // Fetch all in parallel before initialising combos
  await Promise.all([
    loadCategories(),
    loadDepartments(),
    loadVendors(),
    loadEndUsers(),
  ]);

  // ── Helper: resolve options for a combo ──────────────────────
  // For category combos — falls back to provided array if API returns nothing
  function catOpts(group, fallback) {
    return categories[group] && categories[group].length
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
    const input = wrapper.querySelector(".combo-input");
    const list = wrapper.querySelector(".combo-list");
    const hidden = hiddenId ? document.getElementById(hiddenId) : null;

    // ── Enforce pick-from-list (no free-typed values) ──────────
    // A value only counts as "selected" if it was chosen from the
    // dropdown: for id-backed combos that means the hidden id got
    // set; for plain string combos it means the text exactly
    // matches one of the available options.
    function isValidSelection() {
      const val = input.value.trim();
      if (val === "") return true; // emptiness is handled by required-field checks
      if (hidden) {
        if (hidden.value !== "") return true;
        // Fallback: the user typed a name that exactly matches an
        // option instead of clicking it — resolve the id from the
        // label so a correct value isn't rejected.
        const match = options.find(
          (o) =>
            (typeof o === "object" ? o.label : o).toLowerCase() ===
            val.toLowerCase(),
        );
        if (match) {
          hidden.value = typeof match === "object" ? match.id : "";
          return true;
        }
        return false;
      }
      return options.some(
        (o) =>
          (typeof o === "object" ? o.label : o).toLowerCase() ===
          val.toLowerCase(),
      );
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
      setComboError(
        ok ? null : "Please select an option from the dropdown list.",
      );
      return ok;
    }

    // Exposed on the wrapper element so step/save validation can
    // force-check this combo before letting the user proceed.
    wrapper._enforceSelection = enforceSelection;

    function renderList(filter) {
      const q = filter.toLowerCase().trim();
      const matches = options.filter((o) => {
        const label = typeof o === "object" ? o.label : o;
        return label.toLowerCase().includes(q);
      });
      list.innerHTML = "";

      if (matches.length === 0) {
        const li = document.createElement("li");
        li.className = "no-match";
        li.textContent = q
          ? `No match — "${filter}" will be used as-is`
          : "No options available";
        list.appendChild(li);
      } else {
        matches.forEach((opt) => {
          const label = typeof opt === "object" ? opt.label : opt;
          const id = typeof opt === "object" ? opt.id : null;
          const li = document.createElement("li");
          li.textContent = label;
          li.addEventListener("mousedown", (e) => {
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
      // Clear hidden id when user types freely
      if (hidden) hidden.value = "";
    });
    input.addEventListener("blur", () => {
      setTimeout(() => {
        list.classList.add("hidden");
        enforceSelection();
      }, 150);
    });

    // Keyboard nav
    input.addEventListener("keydown", (e) => {
      const items = [...list.querySelectorAll("li:not(.no-match)")];
      const cur = list.querySelector("li.highlighted");
      const idx = items.indexOf(cur);

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

  // ── Date helpers ─────────────────────────────────────────────
  function todayISO() {
    const _d = new Date();
    return `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, "0")}-${String(_d.getDate()).padStart(2, "0")}`; // "YYYY-MM-DD"
  }

  // Same logic as computerItem.js's fmtDate — use local date parts to avoid
  // UTC→local shift on ISO strings like "2022-03-02T16:00:00.000Z"
  function fmtDate(val) {
    if (!val) return "-";
    const d = new Date(val);
    if (isNaN(d)) return String(val);
    return d.toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  /** Show or clear an inline error message below a date input */
  function setDateError(inputId, message) {
    const input = document.getElementById(inputId);
    if (!input) return;
    let msg = input.parentElement.querySelector(".date-error");
    if (message) {
      if (!msg) {
        msg = document.createElement("span");
        msg.className = "date-error";
        msg.style.cssText =
          "display:block;color:#e24b4a;font-size:12px;margin-top:4px;";
        input.parentElement.appendChild(msg);
      }
      msg.textContent = message;
      input.style.borderColor = "#e24b4a";
    } else {
      if (msg) msg.remove();
      input.style.borderColor = "";
    }
  }

  /** Validate all three date fields; returns true if all pass */
  function validateDates() {
    const today = todayISO();
    let valid = true;

    // Received date — must NOT be in the future
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

    // Assigned Date — must NOT be in the future
    const assigned = document.getElementById("assignedDate")?.value;
    if (assigned) {
      if (assigned > today) {
        setDateError("assignedDate", "Assigned date cannot be a future date.");
        valid = false;
      } else {
        setDateError("assignedDate", null);
      }
    }

    // To Return By — must NOT be in the past (only when assign section is visible)
    const toReturn = document.getElementById("toReturnBy")?.value;
    if (toReturn) {
      if (toReturn < today) {
        setDateError("toReturnBy", "Return date cannot be a past date.");
        valid = false;
      } else {
        setDateError("toReturnBy", null);
      }
    }

    return valid;
  }

  // Set browser-level min/max constraints on the date inputs
  function applyDateConstraints() {
    const today = todayISO();
    const recv = document.getElementById("receivedDate");
    if (recv) recv.max = today; // no future dates

    const ret = document.getElementById("toReturnBy");
    if (ret) ret.min = today; // no past dates

    const asgn = document.getElementById("assignedDate");
    if (asgn) asgn.max = today; // no future dates
  }

  applyDateConstraints();

  // Re-apply constraints whenever the modal opens (dates stay fresh each open)
  // Date constraints re-applied inside the addAssetBtn click handler in applyPageState()

  // ── Contact number: digits only, max 11 chars ────────────────
  const contactNumberInput = document.getElementById("euContactNumber");
  if (contactNumberInput) {
    contactNumberInput.addEventListener("keypress", (e) => {
      if (!/\d/.test(e.key)) e.preventDefault();
    });
    contactNumberInput.addEventListener("input", () => {
      contactNumberInput.value = contactNumberInput.value
        .replace(/\D/g, "")
        .slice(0, 11);
    });
  }

  // ── Initialise all combos with live data ─────────────────────
  const brandFallback = [
    "Dell",
    "HP",
    "Lenovo",
    "Apple",
    "Acer",
    "Asus",
    "Other",
  ];
  const deviceTypeFallback = [
    "Laptop",
    "Desktop",
    "Workstation",
    "Server",
    "Thin Client",
    "All-in-One",
  ];
  const osFallback = [
    "Windows 10",
    "Windows 11",
    "Windows Server 2019",
    "Windows Server 2022",
    "macOS",
    "Ubuntu",
    "Other",
  ];
  const ramFallback = [
    "2 GB",
    "4 GB",
    "8 GB",
    "16 GB",
    "32 GB",
    "64 GB",
    "128 GB",
  ];
  const stTypeFallback = ["HDD", "SSD", "NVMe SSD", "eMMC", "Hybrid"];
  const stCapFallback = ["128 GB", "256 GB", "512 GB", "1 TB", "2 TB", "4 TB"];
  const assetConditionFallback = ["New", "Used"];

  initCombo("euLocationCombo", LOCATION_OPTS);

  // Department combo stores department_id in a hidden input
  const deptOptions = departments.map((d) => ({
    id: d.department_id,
    label: d.department_name,
  }));
  initCombo(
    "euDepartmentCombo",
    deptOptions.length ? deptOptions : [],
    "euDepartmentId",
  );

  // Vendor combo stores vendor_id in a hidden input
  const vendorOptions = vendors.map((v) => ({
    id: v.vendor_id,
    label: v.vendor_name,
  }));
  initCombo("vendorCombo", vendorOptions, "vendorId");

  // ── Fields that get autofilled + locked when an existing employee is picked ──
  const LOCKED_EU_FIELD_IDS = [
    "euName",
    "euEmpId",
    "euDivision",
    "euDepartment",
    "euLocation",
    "euEmail",
    "euContactNumber",
  ];

  // Disable/enable + grey out the autofilled fields so an existing
  // employee's details can't be edited from this form.
  // Styles are applied inline (not just via a CSS class) so this can't
  // be silently overridden by another stylesheet's rules for inputs.
  function setEndUserFieldsLocked(locked) {
    LOCKED_EU_FIELD_IDS.forEach((id) => {
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
    const chip = document.getElementById("euSelectedChip");
    const chipText = document.getElementById("euSelectedChipText");
    const search = document.getElementById("euSearch");
    if (chipText)
      chipText.textContent = `${u.eu_name}${u.eu_emp_id ? "  ·  " + u.eu_emp_id : ""}`;
    if (chip) chip.classList.remove("hidden");
    if (search) search.classList.add("hidden");
  }

  function hideSelectedEmployeeChip() {
    const chip = document.getElementById("euSelectedChip");
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
    LOCKED_EU_FIELD_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
    const deptHidden = document.getElementById("euDepartmentId");
    if (deptHidden) deptHidden.value = "";
    const selectedIdEl = document.getElementById("euSelectedId");
    if (selectedIdEl) selectedIdEl.value = "";

    setEndUserFieldsLocked(false);
    hideSelectedEmployeeChip();

    LOCKED_EU_FIELD_IDS.forEach((id) => setFieldError(id, null));

    const wrapper = document.getElementById("euSearchCombo");
    wrapper?._enforceSelection?.();

    if (focusSearch) document.getElementById("euSearch")?.focus();
  }

  // ── End-user search combo with autofill ──────────────────────
  function initEndUserSearchCombo() {
    const wrapper = document.getElementById("euSearchCombo");
    if (!wrapper) return;
    const input = wrapper.querySelector(".combo-input");
    const list = wrapper.querySelector(".combo-list");

    const clearBtn = document.getElementById("euClearSelectionBtn");
    clearBtn?.addEventListener("click", () =>
      clearEndUserSelection({ focusSearch: true }),
    );

    // A name only counts as "selected" once autofillEndUser() has run
    // and stamped euSelectedId — typing a name that was never picked
    // from the list must not silently pass validation.
    function isValidSelection() {
      const val = input.value.trim();
      if (val === "") return true; // emptiness is handled by required-field checks
      const selectedId = document.getElementById("euSelectedId")?.value;
      return !!selectedId;
    }

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
      setComboError(
        ok ? null : "Please select an employee from the dropdown list.",
      );
      return ok;
    }

    wrapper._enforceSelection = enforceSelection;

    function renderList(filter) {
      const q = filter.toLowerCase().trim();
      const matches = q
        ? endUsers.filter((u) => (u.eu_name || "").toLowerCase().includes(q))
        : endUsers;
      list.innerHTML = "";

      if (matches.length === 0) {
        const li = document.createElement("li");
        li.className = "no-match";
        li.textContent = q
          ? `No employee found for "${filter}"`
          : "No employees available";
        list.appendChild(li);
      } else {
        matches.forEach((u) => {
          const li = document.createElement("li");
          li.textContent = `${u.eu_name}${u.eu_emp_id ? "  ·  " + u.eu_emp_id : ""}`;
          li.addEventListener("mousedown", (e) => {
            e.preventDefault();
            autofillEndUser(u);
            input.value = u.eu_name;
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
    });
    input.addEventListener("blur", () => {
      setTimeout(() => {
        list.classList.add("hidden");
        enforceSelection();
      }, 150);
    });

    // Keyboard nav
    input.addEventListener("keydown", (e) => {
      const items = [...list.querySelectorAll("li:not(.no-match)")];
      const cur = list.querySelector("li.highlighted");
      const idx = items.indexOf(cur);
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
        const matched = endUsers.find((u) =>
          cur.textContent.startsWith(u.eu_name),
        );
        if (matched) {
          autofillEndUser(matched);
          input.value = matched.eu_name;
        }
        list.classList.add("hidden");
        setComboError(null);
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
    document.getElementById("euName").value = u.eu_name ?? "";
    document.getElementById("euEmpId").value = u.eu_emp_id ?? "";
    document.getElementById("euEmail").value = u.eu_email ?? "";
    document.getElementById("euContactNumber").value =
      u.eu_contact_number ?? u.eu_contact_no ?? "";

    // Division combo
    const divInput = document.getElementById("euDivision");
    if (divInput) divInput.value = u.eu_division ?? "";

    // Department combo + hidden id
    const deptInput = document.getElementById("euDepartment");
    const deptHidden = document.getElementById("euDepartmentId");
    if (deptInput) deptInput.value = u.department_name ?? "";
    if (deptHidden) deptHidden.value = u.department_id ?? "";

    // Location combo
    const locInput = document.getElementById("euLocation");
    if (locInput) locInput.value = u.eu_location ?? "";

    // Lock the autofilled fields so they can't be hand-edited while an
    // existing employee is selected, and show the "selected" chip in
    // place of the search box (with its own × to unselect).
    setEndUserFieldsLocked(true);
    showSelectedEmployeeChip(u);

    // Warn if the selected employee is resigned
    if ((u.eu_status ?? "").toLowerCase() === "resigned") {
      showResignedWarning(u.eu_name).then((confirmed) => {
        if (!confirmed) {
          clearEndUserSelection();
        }
      });
    }
  }

  initEndUserSearchCombo();

  // Populate native <select> elements from categories
  function populateSelect(id, group, fallback) {
    const el = document.getElementById(id);
    if (!el) return;
    const opts = catOpts(group, fallback);
    const current = el.value;
    // Keep the placeholder option, replace the rest
    el.innerHTML = `<option value="" disabled selected hidden>${el.options[0]?.text || "Select…"}</option>`;
    opts.forEach((o) => {
      const opt = document.createElement("option");
      opt.value = o;
      opt.textContent = o;
      if (o === current) opt.selected = true;
      el.appendChild(opt);
    });
  }

  populateSelect("brand", "computer.brand", brandFallback);
  populateSelect("deviceType", "computer.device_type", deviceTypeFallback);
  populateSelect("operatingSystem", "computer.operating_system", osFallback);
  populateSelect("ramSize", "computer.ram_size", ramFallback);
  populateSelect("storageType", "computer.storage_type", stTypeFallback);
  populateSelect("storageCapacity", "computer.storage_capacity", stCapFallback);
  populateSelect(
    "assetCondition",
    "computer.asset_condition",
    assetConditionFallback,
  );

  let assets = [];

  const tbody = document.getElementById("assetTableBody");
  const searchInput = document.getElementById("searchInput");

  const pageTitleMap = {
    assets: "Overview",
    computer: "Laptop / Desktop",
    ups: "UPS",
    printers: "Printers",
    networkDevices: "Network Devices",
  };

  const pageApiMap = {
    assets: "/api/computer",
    computer: "/api/computer",
    ups: "/api/ups",
    printers: "/api/printer",
    networkDevices: "/api/network-device",
  };

  function getCurrentPageKey() {
    const fileName =
      window.location.pathname.split("/").pop().replace(".html", "") ||
      "assets";
    return pageTitleMap[fileName] ? fileName : "assets";
  }

  function getApiEndpoint() {
    return pageApiMap[getCurrentPageKey()] || pageApiMap.assets;
  }

  // --- Stepper State -------------------------------------------
  let currentStep = 1;
  let selectedAssetType = null;
  const totalSteps = 4;

  // --- Assign User + Peripherals Toggle ------------------------
  function toggleAssignUserFields() {
    const assignSelect = document.querySelector(
      "input[name='willAssignUser']:checked",
    );
    const assignFields = document.querySelector(".assign-user-fields");

    if (!assignSelect || !assignFields) return;

    const shouldShow = assignSelect.value === "Yes";

    // Use style.display directly so no CSS class conflict can override it
    assignFields.style.display = shouldShow ? "grid" : "none";

    // Toggle required on all inputs except the optional email and to-return-by
    assignFields.querySelectorAll("input").forEach((input) => {
      // Skip checkboxes (peripherals) and optional fields
      if (input.type === "checkbox") return;
      if (input.id === "euEmail") return;
      if (input.id === "toReturnBy") return;
      if (input.id === "euContactNumber") return;
      input.required = shouldShow;
    });

    // Clear values when hiding
    if (!shouldShow) {
      assignFields.querySelectorAll("input").forEach((input) => {
        if (input.type === "checkbox") {
          input.checked = false;
        } else {
          input.value = "";
        }
      });
      // Also unlock any fields left disabled from a prior existing-employee
      // selection, and restore the search box so the next "Yes" starts fresh.
      setEndUserFieldsLocked(false);
      hideSelectedEmployeeChip();
    }
  }

  function resetModal() {
    selectedAssetType = null;

    document.getElementById("step-type").classList.remove("hidden");
    document.getElementById("stepper").classList.add("hidden");
    document.getElementById("modalFooter").classList.add("hidden");

    document.querySelectorAll(".step-panel").forEach((panel) => {
      if (panel.id !== "step-type") panel.classList.add("hidden");
    });

    document
      .querySelectorAll(".type-card-btn")
      .forEach((btn) => btn.classList.remove("selected"));
    document
      .querySelectorAll(
        "#assetModal input, #assetModal select, #assetModal textarea",
      )
      .forEach((el) => {
        if (el.type === "checkbox" || el.type === "radio") {
          el.checked = false;
        } else {
          el.value = "";
        }
      });

    const assignNoOption = document.querySelector(
      "input[name='willAssignUser'][value='No']",
    );
    if (assignNoOption) assignNoOption.checked = true;

    updateHardwareFieldsForType(null);
    toggleAssignUserFields();
  }

  function openAssetModal() {
    resetModal();
    // Skip type selection and default to Computer
    selectedAssetType = "Computer";
    document.getElementById("step-type").classList.add("hidden");
    document.getElementById("stepper").classList.remove("hidden");
    document.getElementById("modalFooter").classList.remove("hidden");
    updateHardwareFieldsForType("Computer");
    toggleAssignUserFields();
    goToStep(1);
    document.getElementById("assetModal").classList.remove("hidden");
  }

  function selectAssetType(type) {
    selectedAssetType = type;

    document.querySelectorAll(".type-card-btn").forEach((btn) => {
      btn.classList.remove("selected");
    });

    const selectedBtn = document.querySelector(`[data-type="${type}"]`);
    if (selectedBtn) selectedBtn.classList.add("selected");

    document.getElementById("step-type").classList.add("hidden");
    document.getElementById("stepper").classList.remove("hidden");
    document.getElementById("modalFooter").classList.remove("hidden");

    updateHardwareFieldsForType(type);
    toggleAssignUserFields();
    goToStep(1);
  }

  function updateHardwareFieldsForType(type) {
    document
      .querySelectorAll(
        ".computer-only, .printer-only, .ups-only, .network-only",
      )
      .forEach((el) => el.classList.add("hidden"));

    if (!type) return;

    const selectorMap = {
      Computer: ".computer-only",
      Printer: ".printer-only",
      UPS: ".ups-only",
      "Network Device": ".network-only",
    };
    const selector = selectorMap[type];
    if (selector) {
      document
        .querySelectorAll(selector)
        .forEach((el) => el.classList.remove("hidden"));
    }
  }

  function goToStep(step) {
    if (step === 4) {
      populateReviewStep();
    }

    // Show only the active step panel
    document
      .querySelectorAll(".step-panel")
      .forEach((p) => p.classList.add("hidden"));
    const activePanel = document.getElementById(`step-${step}`);
    activePanel.classList.remove("hidden");
    activePanel.scrollTop = 0;

    // Update stepper tab styles
    document.querySelectorAll(".step").forEach((el) => {
      const s = parseInt(el.dataset.step);
      el.classList.remove("active", "done", "inactive");
      if (s < step) el.classList.add("done");
      else if (s === step) el.classList.add("active");
      else el.classList.add("inactive");
    });

    // Show/hide Back button
    document.getElementById("backBtn").classList.toggle("hidden", step === 1);

    // Change Next to Submit on last step
    const nextBtn = document.getElementById("nextBtn");
    nextBtn.textContent = step === totalSteps ? "Submit" : "Next →";

    currentStep = step;
  }

  // ── Inline field error helper (used by all steps) ──────────
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
        { id: "computerName", label: "Computer Name" },
        { id: "serialNumber", label: "Serial Number" },
        { id: "brand", label: "Brand" },
        { id: "model", label: "Model" },
        { id: "deviceType", label: "Device Type" },
        { id: "computerStatus", label: "Status" },
        { id: "assetCondition", label: "Asset Condition" },
      ];
      let valid = true;
      requiredFields.forEach(({ id, label }) => {
        const el = document.getElementById(id);
        const empty = !el || el.value.trim() === "";
        if (empty) {
          valid = false;
          setFieldError(id, `${label} is required.`);
        } else {
          setFieldError(id, null);
        }
      });

      // Disallow adding a computer name that already exists in the table
      const nameEl = document.getElementById("computerName");
      const nameVal = nameEl ? nameEl.value.trim() : "";
      if (nameVal !== "") {
        const isDuplicate = assets.some(
          (asset) =>
            (asset.computer_name || "").trim().toLowerCase() ===
            nameVal.toLowerCase(),
        );
        if (isDuplicate) {
          valid = false;
          setFieldError(
            "computerName",
            "A computer with this name already exists.",
          );
        }
      }

      return valid;
    } else if (step === 2) {
      const requiredFields = [
        { id: "operatingSystem", label: "Operating System" },
        { id: "processor", label: "Processor" },
        { id: "ramSize", label: "RAM Size" },
        { id: "storageType", label: "Storage Type" },
        { id: "storageCapacity", label: "Storage Capacity" },
      ];
      let valid = true;
      requiredFields.forEach(({ id, label }) => {
        const el = document.getElementById(id);
        const empty = !el || el.value.trim() === "";
        if (empty) {
          valid = false;
          setFieldError(id, `${label} is required.`);
        } else {
          setFieldError(id, null);
        }
      });
      return valid;
    } else if (step === 3) {
      // Required fields with their friendly label for the error message
      const requiredFields = [
        { id: "ipAddress", label: "IP Address" },
        { id: "networkConnectivity", label: "Network Connectivity" },
        { id: "hasVpnAccess", label: "VPN Access" },
        { id: "receivedDate", label: "Received Date" },
        { id: "vendor", label: "Vendor / Supplier" },
      ];

      let stepValid = true;
      requiredFields.forEach(({ id, label }) => {
        const el = document.getElementById(id);
        const empty =
          !el ||
          (el.type === "number" ? el.value === "" : el.value.trim() === "");
        if (empty) {
          stepValid = false;
          setFieldError(id, `${label} is required.`);
        } else {
          setFieldError(id, null);
        }
      });

      if (!stepValid) return false;

      // Vendor must be picked from the dropdown, not free-typed
      const vendorId = document.getElementById("vendorId").value;
      if (!vendorId) {
        setFieldError("vendor", "Please select a vendor from the list.");
        return false;
      }

      // Date range validation (setDateError already handles display)
      if (!validateDates()) return false;

      const assignOption = document.querySelector(
        "input[name='willAssignUser']:checked",
      );
      if (!assignOption) return false;

      if (assignOption.value === "Yes") {
        const assignFields = [
          { id: "euName", label: "Full Name" },
          { id: "euEmpId", label: "Employee ID" },
          { id: "euDivision", label: "Division" },
          { id: "euDepartment", label: "Department" },
          { id: "euLocation", label: "Location" },
          { id: "assignedDate", label: "Assigned Date" },
        ];
        let assignValid = true;
        assignFields.forEach(({ id, label }) => {
          const el = document.getElementById(id);
          const empty = !el || el.value.trim() === "";
          if (empty) {
            assignValid = false;
            setFieldError(id, `${label} is required.`);
          } else {
            setFieldError(id, null);
          }
        });
        if (!assignValid) return false;

        // Name / Department / Location must be picked from their
        // respective dropdowns, not just typed in free-form
        const euNameOk =
          document.getElementById("euSearchCombo")?._enforceSelection?.() ??
          true;
        const deptOk =
          document.getElementById("euDepartmentCombo")?._enforceSelection?.() ??
          true;
        const locOk =
          document.getElementById("euLocationCombo")?._enforceSelection?.() ??
          true;
        if (!euNameOk || !deptOk || !locOk) return false;

        // Contact number — optional but must be valid if filled
        const contactInput = document.getElementById("euContactNumber");
        const contactVal = contactInput ? contactInput.value.trim() : "";
        if (contactVal !== "") {
          if (!/^09\d{9}$/.test(contactVal)) {
            setFieldError(
              "euContactNumber",
              "Must be 11 digits starting with 09 (e.g. 09000000000).",
            );
            return false;
          } else {
            setFieldError("euContactNumber", null);
          }
        }

        return true;
      }

      return true;
    } else if (step === 4) {
      return true;
    }
    return true;
  }

  function applyPageState() {
    const currentPage = getCurrentPageKey();
    const pageTitle = document.getElementById("pageTitle");
    if (pageTitle) {
      pageTitle.textContent = `IT Assets > ${pageTitleMap[currentPage]}`;
    }

    if (document.body) {
      document.body.dataset.assetPage = currentPage;
    }

    // ── Permission gate: Add Asset — Computer (permission 9) ───
    // Parse permissions from localStorage; default to empty array on any failure
    let userPermissions = [];
    try {
      userPermissions = JSON.parse(localStorage.getItem("permissions") || "[]");
    } catch {
      userPermissions = [];
    }

    const canAddComputer = userPermissions.includes(9);
    const addBtnContainer = document.getElementById("addAssetBtnContainer");
    if (addBtnContainer) {
      if (!canAddComputer) {
        addBtnContainer.innerHTML = `
					<div class="perm-btn-wrapper" data-tooltip="You need Add Asset: Computer permission to add an asset.">
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
  }

  function filterAssetsByTab(data) {
    let result = data;
    Object.entries(columnFilters).forEach(([key, valueSet]) => {
      if (valueSet && valueSet.size > 0) {
        const transform = FILTER_TRANSFORMS[key];
        result = result.filter((asset) =>
          valueSet.has(transform ? transform(asset[key]) : asset[key]),
        );
      }
    });
    return result;
  }

  // --- Populate Review Step (Step 4) ---------------------------
  function populateReviewStep() {
    // Asset Basics
    document.getElementById("revComputerName").textContent =
      document.getElementById("computerName").value || "-";
    document.getElementById("revSerialNumber").textContent =
      document.getElementById("serialNumber").value || "-";
    document.getElementById("revBrand").textContent =
      document.getElementById("brand").value || "-";
    document.getElementById("revModel").textContent =
      document.getElementById("model").value || "-";
    document.getElementById("revDeviceType").textContent =
      document.getElementById("deviceType").value || "-";
    document.getElementById("revComputerStatus").textContent =
      document.getElementById("computerStatus").value || "-";
    document.getElementById("revAssetCondition").textContent =
      document.getElementById("assetCondition").value || "-";
    document.getElementById("revAssetTag").textContent =
      document.getElementById("assetTag").value || "-";

    // System Specifications
    document.getElementById("revOperatingSystem").textContent =
      document.getElementById("operatingSystem").value || "-";
    document.getElementById("revProcessor").textContent =
      document.getElementById("processor").value || "-";
    document.getElementById("revRamSize").textContent =
      document.getElementById("ramSize").value || "-";
    document.getElementById("revStorageType").textContent =
      document.getElementById("storageType").value || "-";
    document.getElementById("revStorageCapacity").textContent =
      document.getElementById("storageCapacity").value || "-";

    // Network & Procurement
    document.getElementById("revIpAddress").textContent =
      document.getElementById("ipAddress").value || "-";
    document.getElementById("revMacAddress").textContent =
      document.getElementById("macAddress").value || "-";
    document.getElementById("revVpnAccess").textContent =
      document.getElementById("hasVpnAccess").value || "-";
    document.getElementById("revCost").textContent =
      document.getElementById("cost").value || "-";
    document.getElementById("revReceivedDate").textContent =
      document.getElementById("receivedDate").value || "-";
    document.getElementById("revWarrantyExpiry").textContent =
      document.getElementById("warrantyExpiry").value || "-";
    document.getElementById("revVendor").textContent =
      document.getElementById("vendor").value || "-";
    document.getElementById("revNetworkConnectivity").textContent =
      document.getElementById("networkConnectivity").value || "-";
    document.getElementById("revAnydeskIp").textContent =
      document.getElementById("anyDeskIp").value || "-";
    document.getElementById("revRemarks").textContent =
      document.getElementById("remarks").value || "-";

    // Assigned Employee Details — show section only if Yes was selected
    const isAssigned =
      document.querySelector("input[name='willAssignUser']:checked")?.value ===
      "Yes";
    const revAssignedSection = document.getElementById("revAssignedSection");

    if (isAssigned) {
      revAssignedSection.style.display = "flex";
      document.getElementById("revEuName").textContent =
        document.getElementById("euName").value || "-";
      document.getElementById("revEuEmpId").textContent =
        document.getElementById("euEmpId").value || "-";
      document.getElementById("revEuDivision").textContent =
        document.getElementById("euDivision").value || "-";
      document.getElementById("revEuDepartment").textContent =
        document.getElementById("euDepartment").value || "-";
      document.getElementById("revEuLocation").textContent =
        document.getElementById("euLocation").value || "-";
      document.getElementById("revEuEmail").textContent =
        document.getElementById("euEmail").value || "-";
      document.getElementById("revEuContactNumber").textContent =
        document.getElementById("euContactNumber").value || "-";
      document.getElementById("revAssignedDate").textContent =
        document.getElementById("assignedDate").value || "-";
      document.getElementById("revToReturnBy").textContent =
        document.getElementById("toReturnBy").value || "-";
    } else {
      revAssignedSection.style.display = "none";
    }

    // Peripherals — always shown regardless of assignment
    const checkedPeripherals = [
      ...document.querySelectorAll("input[name='peripheral']:checked"),
    ].map((cb) => cb.value);
    document.getElementById("revPeripherals").textContent =
      checkedPeripherals.length > 0 ? checkedPeripherals.join(", ") : "None";

    // Programs — always shown regardless of assignment
    const checkedPrograms = [
      ...document.querySelectorAll("input[name='program']:checked"),
    ].map((cb) => cb.value);
    document.getElementById("revPrograms").textContent =
      checkedPrograms.length > 0 ? checkedPrograms.join(", ") : "None";
  }

  // --- Modal Open / Close --------------------------------------
  // addAssetBtn click is wired dynamically inside applyPageState()

  document.getElementById("closeModal").addEventListener("click", () => {
    document.getElementById("assetModal").classList.add("hidden");
  });

  document.getElementById("cancelModal").addEventListener("click", () => {
    document.getElementById("assetModal").classList.add("hidden");
  });

  document.querySelectorAll(".type-card-btn").forEach((btn) => {
    btn.addEventListener("click", () => selectAssetType(btn.dataset.type));
  });

  document.querySelectorAll("input[name='willAssignUser']").forEach((radio) => {
    radio.addEventListener("change", toggleAssignUserFields);
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
      const dialog = document.getElementById("confirmDialog");
      const okBtn = document.getElementById("confirmOkBtn");
      const cancelBtn = document.getElementById("confirmCancelBtn");

      dialog.classList.remove("hidden");

      function cleanup(result) {
        dialog.classList.add("hidden");
        okBtn.removeEventListener("click", onOk);
        cancelBtn.removeEventListener("click", onCancel);
        resolve(result);
      }

      function onOk() {
        cleanup(true);
      }
      function onCancel() {
        cleanup(false);
      }

      okBtn.addEventListener("click", onOk);
      cancelBtn.addEventListener("click", onCancel);
    });
  }

  // ── Resigned employee warning dialog ─────────────────────────
  // Shows a non-blocking warning when a resigned employee is selected.
  // The user can choose to continue anyway or clear the selection.
  let _resignedWarningOpen = false;
  function showResignedWarning(euName) {
    if (_resignedWarningOpen) return Promise.resolve(false);
    _resignedWarningOpen = true;

    return new Promise((resolve) => {
      // Build the dialog inline so it doesn't need an HTML counterpart
      let dialog = document.getElementById("resignedWarningDialog");
      if (!dialog) {
        dialog = document.createElement("div");
        dialog.id = "resignedWarningDialog";
        dialog.className = "confirm-dialog-overlay";
        dialog.innerHTML = `
					<div class="confirm-dialog">
						<div class="confirm-icon" style="color:#b45309">
							<i data-lucide="alert-triangle"></i>
						</div>
						<h3 class="confirm-title">Resigned Employee</h3>
						<p class="confirm-message" id="resignedWarningMsg"></p>
						<div class="confirm-actions">
							<button class="btn-secondary" id="resignedCancelBtn">Clear Selection</button>
							<button class="btn-danger" id="resignedOkBtn" style="background:#fef3c7;color:#92400e;border-color:#fcd34d;">Continue Anyway</button>
						</div>
					</div>`;
        document.body.appendChild(dialog);
        lucide.createIcons();
      }

      document.getElementById("resignedWarningMsg").textContent =
        `${euName} has a status of "Resigned". Are you sure you want to assign this asset to them?`;

      dialog.classList.remove("hidden");

      const okBtn = document.getElementById("resignedOkBtn");
      const cancelBtn = document.getElementById("resignedCancelBtn");

      function cleanup(result) {
        dialog.classList.add("hidden");
        _resignedWarningOpen = false;
        okBtn.removeEventListener("click", onOk);
        cancelBtn.removeEventListener("click", onCancel);
        resolve(result);
      }

      function onOk() {
        cleanup(true);
      }
      function onCancel() {
        cleanup(false);
      }

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
  let _isSubmitting = false;
  async function handleSubmit() {
    if (_isSubmitting) return;
    _isSubmitting = true;
    const confirmAdd = await showConfirmDialog();
    if (!confirmAdd) {
      _isSubmitting = false;
      return;
    }

    try {
      const token = localStorage.getItem("token");

      const assignUserSelected =
        document.querySelector("input[name='willAssignUser']:checked")
          ?.value === "Yes";

      // Collect selected peripherals as array of objects for the API
      const selectedPeripherals = [
        ...document.querySelectorAll("input[name='peripheral']:checked"),
      ].map((cb) => ({ peripheral_name: cb.value }));

      // Collect selected programs as array of objects for the API
      const selectedPrograms = [
        ...document.querySelectorAll("input[name='program']:checked"),
      ].map((cb) => ({
        program_name: cb.value,
        program_id: parseInt(cb.dataset.id, 10),
      }));

      const payload = {
        // Step 1 — Asset Basics (Required)
        computerName: document.getElementById("computerName").value.trim(),
        serialNo: document.getElementById("serialNumber").value.trim(),
        brand: document.getElementById("brand").value.trim(),
        model: document.getElementById("model").value.trim(),
        deviceType: document.getElementById("deviceType").value,
        computerStatus: document.getElementById("computerStatus").value,
        assetCondition: document.getElementById("assetCondition").value,
        // Step 1 — Optional
        assetTag: document.getElementById("assetTag").value.trim() || null,

        // Step 2 — System Specifications (Required)
        operatingSystem: document.getElementById("operatingSystem").value,
        processor: document.getElementById("processor").value.trim(),
        ramSize: document.getElementById("ramSize").value,
        storageType: document.getElementById("storageType").value,
        storageCapacity: document.getElementById("storageCapacity").value,

        // Step 3 — Network & Connectivity (Required)
        ipAddress: document.getElementById("ipAddress").value.trim(),
        macAddress: document.getElementById("macAddress").value.trim() || null,
        hasVpnAccess: document.getElementById("hasVpnAccess").value === "Yes",
        networkConnectivity: document.getElementById("networkConnectivity")
          .value,
        cost: document.getElementById("cost").value
          ? parseFloat(document.getElementById("cost").value)
          : null,
        // Step 3 — Optional
        anyDeskIp: document.getElementById("anyDeskIp").value.trim() || null,
        remarks: document.getElementById("remarks").value.trim() || null,

        // Procurement & Warranty (Required)
        receivedDate: document.getElementById("receivedDate").value,
        warrantyExpiry: document.getElementById("warrantyExpiry").value || null,
        vendor: document.getElementById("vendor").value.trim(),

        // Assigned user fields — only sent when assigning
        euSelectedId: assignUserSelected
          ? document.getElementById("euSelectedId").value || null
          : null,
        euName: assignUserSelected
          ? document.getElementById("euName").value.trim()
          : null,
        euEmpId: assignUserSelected
          ? document.getElementById("euEmpId").value.trim()
          : null,
        euDivision: assignUserSelected
          ? document.getElementById("euDivision").value.trim()
          : null,
        euDepartment: assignUserSelected
          ? document.getElementById("euDepartmentId").value ||
            document.getElementById("euDepartment").value.trim() ||
            null
          : null,
        euLocation: assignUserSelected
          ? document.getElementById("euLocation").value.trim()
          : null,
        euEmail: assignUserSelected
          ? document.getElementById("euEmail").value.trim() || null
          : null,
        euContactNo: assignUserSelected
          ? document.getElementById("euContactNumber").value.trim() || null
          : null,
        assignedDate: assignUserSelected
          ? document.getElementById("assignedDate").value
          : null,
        toReturnBy: assignUserSelected
          ? document.getElementById("toReturnBy").value || null
          : null,

        // Peripherals
        peripherals: selectedPeripherals,

        // Programs
        programs: selectedPrograms,
      };

      console.log("Submitting payload:", payload);

      const response = await fetch("/api/computer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Unknown error" }));
        console.error("API Error Response:", errorData);

        // Backend rejects resigned employee assignment — show a toast and send
        // the user back to the assignment step to clear the selection
        if (
          errorData.message === "Cannot assign assets to a Resigned end user"
        ) {
          const euName =
            document.getElementById("euName")?.value || "This employee";
          showErrorToast(
            `${euName} is resigned and cannot be assigned to this asset.`,
          );
          _isSubmitting = false;
          goToStep(3);
          clearEndUserSelection();
          return;
        }

        throw new Error(
          `API Error: ${response.status} - ${JSON.stringify(errorData)}`,
        );
      }

      document.getElementById("assetModal").classList.add("hidden");

      // Reset modal data inputs back to clean states upon successful save
      const forms = document.getElementById("step-1").parentElement;
      if (forms && typeof forms.reset === "function") forms.reset();

      await loadAssets();
      console.log("Asset added successfully!");
    } catch (err) {
      console.error(err);
      showErrorToast("Something went wrong. Please try again.");
    } finally {
      _isSubmitting = false;
    }
  }

  // --- Load Peripherals Checkboxes -----------------------------
  async function loadPeripherals() {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/peripheral", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const rawPeripherals = await res.json();
      console.log("Peripherals API response:", rawPeripherals);
      const peripherals = Array.isArray(rawPeripherals)
        ? rawPeripherals
        : (rawPeripherals.data ?? rawPeripherals.peripherals ?? []);
      const container = document.getElementById("peripheralsCheckboxContainer");
      container.innerHTML = "";

      peripherals.forEach((p) => {
        const label = document.createElement("label");
        label.className = "checkbox-item";
        label.innerHTML = `
					<input
						type="checkbox"
						name="peripheral"
						value="${p.peripheral_name}"
						id="peripheral_${p.peripheral_id}"
					/>
					${p.peripheral_name}
				`;
        container.appendChild(label);
      });
    } catch (err) {
      console.error("Failed to load peripherals:", err);
      document.getElementById("peripheralsCheckboxContainer").innerHTML =
        `<span style="font-size:13px;color:#e24b4a;">Failed to load peripherals.</span>`;
    }
  }

  // --- Load Programs Checkboxes --------------------------------
  async function loadPrograms() {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/program", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const rawPrograms = await res.json();
      console.log("Programs API response:", rawPrograms);
      const programs = Array.isArray(rawPrograms)
        ? rawPrograms
        : (rawPrograms.data ?? rawPrograms.programs ?? []);
      const container = document.getElementById("programsCheckboxContainer");
      container.innerHTML = "";

      programs.forEach((p) => {
        const label = document.createElement("label");
        label.className = "checkbox-item";
        label.innerHTML = `
					<input
						type="checkbox"
						name="program"
						value="${p.program_name}"
						data-id="${p.program_id}"
						id="program_${p.program_id}"
					/>
					${p.program_name}
				`;
        container.appendChild(label);
      });
    } catch (err) {
      console.error("Failed to load programs:", err);
      document.getElementById("programsCheckboxContainer").innerHTML =
        `<span style="font-size:13px;color:#e24b4a;">Failed to load programs.</span>`;
    }
  }

  // --- Load & Render Table -------------------------------------
  async function loadAssets() {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch computers and end-users in parallel
      const [computerRes, userRes] = await Promise.all([
        fetch("/api/computer", { headers }),
        fetch("/api/end-user", { headers }),
      ]);

      const rawUsers = await userRes.json();
      console.log("End-users API response:", rawUsers);
      const endUsers = Array.isArray(rawUsers)
        ? rawUsers
        : (rawUsers.data ?? rawUsers.users ?? rawUsers.endUsers ?? []);

      // Build lookup map: eu_id → { department_name, eu_location }
      const userMap = {};
      endUsers.forEach((u) => {
        userMap[u.eu_id] = {
          department_name: u.department_name || "-",
          eu_location: u.eu_location || "-",
        };
      });

      const rawAssets = await computerRes.json();
      console.log("Computers API response:", rawAssets);
      assets = Array.isArray(rawAssets)
        ? rawAssets
        : (rawAssets.data ?? rawAssets.computers ?? rawAssets.assets ?? []);

      // Attach department/location to each asset before rendering
      assets = assets.map((asset) => ({
        ...asset,
        department_name: asset.assigned_user_id
          ? (userMap[asset.assigned_user_id]?.department_name ?? "-")
          : "-",
        eu_location: asset.assigned_user_id
          ? (userMap[asset.assigned_user_id]?.eu_location ?? "-")
          : "-",
      }));

      renderTable(filterAssetsByTab(assets));
      updateSummaryCards(assets);
      console.log("Assets loaded:", assets);
    } catch (err) {
      console.error(err);
    }
  }

  // --- Summary Cards -------------------------------------------
  function updateSummaryCards(data) {
    let assigned = 0;
    let unassigned = 0;
    let active = 0;
    let spare = 0;
    let repair = 0;
    let defective = 0;

    data.forEach((asset) => {
      const status = (asset.computer_status || "").toLowerCase();

      if (asset.assigned_user_id) assigned++;
      else unassigned++;

      if (status === "active") active++;
      if (status === "spare") spare++;
      if (status === "repair") repair++;
      if (status === "defective") defective++;
    });

    document.getElementById("activeCount").textContent = active;
    document.getElementById("spareCount").textContent = spare;
    document.getElementById("repairCount").textContent = repair;
    document.getElementById("defectiveCount").textContent = defective;
  }

  // ── Column definitions (order matches <thead>) ───────────────
  const ALL_COLUMNS = [
    { key: "asset_tag", label: "Asset Tag" },
    { key: "computer_name", label: "Computer Name" },
    { key: "serial_no", label: "Serial No." },
    { key: "brand", label: "Brand" },
    { key: "model", label: "Model" },
    { key: "device_type", label: "Type" },
    { key: "operating_system", label: "OS" },
    { key: "computer_status", label: "Status" },
    { key: "asset_condition", label: "Condition" },
    { key: "assigned_user_name", label: "Assigned User" },
    { key: "assigned_user_emp_id", label: "Employee ID" },
    { key: "department_name", label: "Department" },
    { key: "eu_location", label: "Location" },
    { key: "ip_address", label: "IP Address" },
    { key: "mac_address", label: "MAC Address" },
    { key: "network_connectivity", label: "Network" },
    { key: "has_vpn_access", label: "VPN" },
    { key: "anyDeskIp", label: "AnyDesk IP" },
    { key: "processor", label: "Processor" },
    { key: "ram_size", label: "RAM" },
    { key: "storage_type", label: "Storage Type" },
    { key: "storage_capacity", label: "Storage" },
    { key: "received_date", label: "Received" },
    { key: "warranty_expiry", label: "Warranty Expiry" },
    { key: "assigned_date", label: "Assigned Date" },
    { key: "to_return_by", label: "Return By" },
    { key: "vendor", label: "Vendor" },
    { key: "cost", label: "Cost" },
    { key: "peripherals", label: "Peripherals" },
    { key: "programs", label: "Programs" },
    { key: "remarks", label: "Remarks" },
    { key: "action", label: "Action" },
  ];

  // Default visible columns (mirrors the original table)
  const DEFAULT_VISIBLE = new Set([
    "computer_name",
    "brand",
    "model",
    "device_type",
    "assigned_user_name",
    "assigned_user_emp_id",
    "department_name",
    "ip_address",
    "eu_location",
    "computer_status",
    "anyDeskIp",
    "action",
  ]);

  // Active visible set — start from default
  let visibleCols = new Set(DEFAULT_VISIBLE);

  // ── Column toggle UI ─────────────────────────────────────────
  function buildColPanel() {
    const list = document.getElementById("colCheckboxList");
    list.innerHTML = "";
    ALL_COLUMNS.forEach((col) => {
      const label = document.createElement("label");
      label.className = "col-check-item";
      label.innerHTML = `
				<input type="checkbox" value="${col.key}" ${visibleCols.has(col.key) ? "checked" : ""} />
				${col.label}
			`;
      label.querySelector("input").addEventListener("change", (e) => {
        if (e.target.checked) visibleCols.add(col.key);
        else visibleCols.delete(col.key);
        renderCurrentView();
      });
      list.appendChild(label);
    });
  }

  function applyColumnVisibility() {
    // Sync checkboxes in panel
    document
      .querySelectorAll("#colCheckboxList input[type=checkbox]")
      .forEach((cb) => {
        cb.checked = visibleCols.has(cb.value);
      });
    // Show/hide header <th>
    document
      .querySelectorAll("#assetTable thead th[data-col]")
      .forEach((th) => {
        th.style.display = visibleCols.has(th.dataset.col) ? "" : "none";
      });
    // Show/hide body <td> by column index
    const headers = [
      ...document.querySelectorAll("#assetTable thead th[data-col]"),
    ];
    const colKeys = headers.map((th) => th.dataset.col);
    document.querySelectorAll("#assetTableBody tr").forEach((row) => {
      [...row.cells].forEach((td, i) => {
        td.style.display = visibleCols.has(colKeys[i]) ? "" : "none";
      });
    });
  }

  // Toggle panel open/close
  document.getElementById("colToggleBtn").addEventListener("click", (e) => {
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
  document.addEventListener("click", (e) => {
    const wrapper = document.querySelector(".col-toggle-wrapper");
    if (wrapper && !wrapper.contains(e.target)) {
      document.getElementById("colTogglePanel").classList.add("hidden");
    }
  });
  document.getElementById("colSelectAll").addEventListener("click", () => {
    ALL_COLUMNS.forEach((c) => visibleCols.add(c.key));
    buildColPanel();
    renderCurrentView();
  });
  document.getElementById("colSelectNone").addEventListener("click", () => {
    visibleCols.clear();
    visibleCols.add("action"); // always keep action
    buildColPanel();
    renderCurrentView();
  });
  document.getElementById("colReset").addEventListener("click", () => {
    visibleCols = new Set(DEFAULT_VISIBLE);
    buildColPanel();
    renderCurrentView();
  });

  // Build panel on load and immediately hide non-default headers
  buildColPanel();
  applyColumnVisibility();

  // ── Column Value Filters (Excel/pivot-style checkbox filters) ─
  // Reuses the exact same category data + fallback lists that power
  // the Add Asset dropdowns (catOpts / brandFallback / etc.)
  const FILTERABLE_COLUMNS = [
    { key: "brand", group: "computer.brand", fallback: brandFallback },
    {
      key: "device_type",
      group: "computer.device_type",
      fallback: deviceTypeFallback,
    },
    {
      key: "operating_system",
      group: "computer.operating_system",
      fallback: osFallback,
    },
    { key: "ram_size", group: "computer.ram_size", fallback: ramFallback },
    {
      key: "storage_type",
      group: "computer.storage_type",
      fallback: stTypeFallback,
    },
    {
      key: "storage_capacity",
      group: "computer.storage_capacity",
      fallback: stCapFallback,
    },
    {
      key: "asset_condition",
      group: "computer.asset_condition",
      fallback: assetConditionFallback,
    },
    { key: "network_connectivity", options: ["WIFI", "LAN", "WIFI & LAN"] },
    {
      key: "department_name",
      options: () =>
        [
          ...new Set(departments.map((d) => d.department_name).filter(Boolean)),
        ].sort(),
    },
    { key: "eu_location", options: LOCATION_OPTS },
    {
      key: "computer_status",
      options: ["Active", "Repair", "Spare", "Defective"],
    },
    {
      key: "has_vpn_access",
      options: ["Yes", "No"],
      transform: (v) => (v === true ? "Yes" : v === false ? "No" : ""),
    },
    {
      key: "vendor",
      options: () =>
        [...new Set(vendors.map((v) => v.vendor_name).filter(Boolean))].sort(),
    },
  ];

  // key -> transform fn, applied to the raw asset value before matching
  // against the checked filter values (e.g. boolean has_vpn_access -> "Yes"/"No")
  const FILTER_TRANSFORMS = {};
  FILTERABLE_COLUMNS.forEach((col) => {
    if (col.transform) FILTER_TRANSFORMS[col.key] = col.transform;
  });

  // key -> Set of checked values. Empty Set = no filter applied (show all).
  const columnFilters = {};

  // ── Status Summary Cards (Active / Spare / Under Repair / Defective) ──
  // These act as one-click shortcuts into the same "computer_status" column
  // filter used by the Status column header, so keep the card's "selected"
  // look in sync with whatever computer_status is currently set to.
  function syncStatusCards() {
    const current = columnFilters["computer_status"];
    const activeStatus = current && current.size === 1 ? [...current][0] : null;
    document.querySelectorAll(".status-card").forEach((card) => {
      card.classList.toggle("selected", card.dataset.status === activeStatus);
    });
  }

  // Clicking a card applies that single status as the computer_status
  // filter (matching the column filter's checkbox + Apply behavior).
  // Clicking the already-active card again clears the filter.
  function applyStatusCardFilter(status) {
    const key = "computer_status";
    const th = document.querySelector(
      `#assetTable thead th[data-col="${key}"]`,
    );
    if (!th || !th._filterPanel || !th._filterBtn) return;

    const current = columnFilters[key];
    const isActive = current && current.size === 1 && current.has(status);

    if (isActive) {
      columnFilters[key] = new Set();
      th._filterPanel
        .querySelectorAll("input[type=checkbox]")
        .forEach((cb) => (cb.checked = false));
      th._filterBtn.classList.remove("active");
    } else {
      columnFilters[key] = new Set([status]);
      th._filterPanel.querySelectorAll("input[type=checkbox]").forEach((cb) => {
        cb.checked = cb.value === status;
      });
      th._filterBtn.classList.add("active");
    }

    syncStatusCards();
    renderCurrentView();
  }

  document.querySelectorAll(".status-card").forEach((card) => {
    card.addEventListener("click", () =>
      applyStatusCardFilter(card.dataset.status),
    );
  });

  function closeAllFilterPanels(except = null) {
    document.querySelectorAll(".col-filter-panel").forEach((p) => {
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
    panel.style.top = "-9999px";
    panel.style.left = "-9999px";
    panel.classList.remove("hidden");

    const panelWidth = panel.offsetWidth || 220;
    const panelHeight = panel.offsetHeight || 260;
    const rect = btn.getBoundingClientRect();

    // Horizontal: align to the button's right edge, clamped so the
    // panel never runs past either side of the viewport.
    let left = rect.right - panelWidth;
    if (left < margin) left = margin;
    if (left + panelWidth > window.innerWidth - margin)
      left = window.innerWidth - panelWidth - margin;
    if (left < margin) left = margin; // panel wider than viewport (very small screens)

    // Vertical: prefer below the button, but flip above it (or clamp
    // to the viewport) when there isn't enough room below — this is
    // what previously let panels run off the bottom of short mobile
    // screens.
    let top = rect.bottom + 6;
    if (top + panelHeight > window.innerHeight - margin) {
      const above = rect.top - panelHeight - 6;
      top =
        above >= margin
          ? above
          : Math.max(margin, window.innerHeight - panelHeight - margin);
    }

    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
    panel.style.visibility = "";
  }

  // ── Keep summary counts in sync with the Device Type filter only ──
  // (Active/Spare/Repair/Defective cards should reflect the remaining
  // data when Type is filtered, but stay unaffected by other filters.)
  function updateSummaryCardsForTypeFilter() {
    const typeFilter = columnFilters["device_type"];
    if (typeFilter && typeFilter.size > 0) {
      updateSummaryCards(
        assets.filter((asset) => typeFilter.has(asset.device_type)),
      );
    } else {
      updateSummaryCards(assets);
    }
  }

  function buildColumnFilterUI() {
    FILTERABLE_COLUMNS.forEach((col) => {
      const th = document.querySelector(
        `#assetTable thead th[data-col="${col.key}"]`,
      );
      if (!th) return;

      columnFilters[col.key] = new Set();

      const options = col.group
        ? catOpts(col.group, col.fallback)
        : typeof col.options === "function"
          ? col.options()
          : col.options;
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
      options.forEach((opt) => {
        const item = document.createElement("label");
        item.className = "col-check-item";
        item.innerHTML = `<input type="checkbox" value="${opt}" /> ${opt}`;
        body.appendChild(item);
      });

      th._filterPanel = panel; // stashed for programmatic filtering (e.g. from URL params)

      btn.addEventListener("click", (e) => {
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
        panel
          .querySelectorAll("input[type=checkbox]")
          .forEach((cb) => (cb.checked = true));
      });
      panel.querySelector(".cf-none").addEventListener("click", () => {
        panel
          .querySelectorAll("input[type=checkbox]")
          .forEach((cb) => (cb.checked = false));
      });
      panel.querySelector(".col-filter-clear").addEventListener("click", () => {
        columnFilters[col.key].clear();
        panel
          .querySelectorAll("input[type=checkbox]")
          .forEach((cb) => (cb.checked = false));
        btn.classList.remove("active");
        panel.classList.add("hidden");
        if (col.key === "computer_status") syncStatusCards();
        if (col.key === "device_type") updateSummaryCardsForTypeFilter();
        renderCurrentView();
      });
      panel.querySelector(".col-filter-apply").addEventListener("click", () => {
        const checked = [
          ...panel.querySelectorAll("input[type=checkbox]:checked"),
        ].map((cb) => cb.value);
        columnFilters[col.key] = new Set(checked);
        btn.classList.toggle("active", checked.length > 0);
        panel.classList.add("hidden");
        if (col.key === "computer_status") syncStatusCards();
        if (col.key === "device_type") updateSummaryCardsForTypeFilter();
        renderCurrentView();
      });
    });

    // Close panels on outside click, on table scroll, or on resize
    document.addEventListener("click", (e) => {
      if (
        !e.target.closest(".col-filter-panel") &&
        !e.target.closest(".col-filter-btn")
      ) {
        closeAllFilterPanels();
      }
    });
    document
      .querySelector(".table-wrapper")
      ?.addEventListener("scroll", () => closeAllFilterPanels());
    window.addEventListener("resize", () => closeAllFilterPanels());

    lucide.createIcons();
  }

  buildColumnFilterUI();

  // ── Status badge (Active / Spare / Repair / Defective) ───────
  const STATUS_BADGE_CLASS = {
    active: "status-active",
    spare: "status-spare",
    repair: "status-repair",
    defective: "status-defective",
  };

  function statusBadge(status) {
    if (!status) return "-";
    const cls = STATUS_BADGE_CLASS[status.toLowerCase()] || "";
    return `<span class="status-badge ${cls}">${status}</span>`;
  }

  function renderTable(data) {
    data = applySort(data);
    tbody.innerHTML = "";
    const fmt = (v) => (v === null || v === undefined || v === "" ? "-" : v);
    const fmtArr = (v) => (Array.isArray(v) && v.length ? v.join(", ") : "-");

    data.forEach((asset) => {
      const row = document.createElement("tr");
      const cells = [
        { key: "asset_tag", html: fmt(asset.asset_tag) },
        { key: "computer_name", html: fmt(asset.computer_name) },
        { key: "serial_no", html: fmt(asset.serial_no) },
        { key: "brand", html: fmt(asset.brand) },
        { key: "model", html: fmt(asset.model) },
        { key: "device_type", html: fmt(asset.device_type) },
        { key: "operating_system", html: fmt(asset.operating_system) },
        { key: "computer_status", html: statusBadge(asset.computer_status) },
        { key: "asset_condition", html: fmt(asset.asset_condition) },
        {
          key: "assigned_user_name",
          html: asset.assigned_user_name || "Unassigned",
        },
        { key: "assigned_user_emp_id", html: fmt(asset.assigned_user_emp_id) },
        { key: "department_name", html: fmt(asset.department_name) },
        { key: "eu_location", html: fmt(asset.eu_location) },
        { key: "ip_address", html: fmt(asset.ip_address) },
        { key: "mac_address", html: fmt(asset.mac_address) },
        { key: "network_connectivity", html: fmt(asset.network_connectivity) },
        {
          key: "has_vpn_access",
          html: asset.has_vpn_access
            ? "Yes"
            : asset.has_vpn_access === false
              ? "No"
              : "-",
        },
        { key: "anyDeskIp", html: fmt(asset.anydesk_ip) },
        { key: "processor", html: fmt(asset.processor) },
        { key: "ram_size", html: fmt(asset.ram_size) },
        { key: "storage_type", html: fmt(asset.storage_type) },
        { key: "storage_capacity", html: fmt(asset.storage_capacity) },
        { key: "received_date", html: fmtDate(asset.received_date) },
        { key: "warranty_expiry", html: fmtDate(asset.warranty_expiry) },
        { key: "assigned_date", html: fmtDate(asset.assigned_date) },
        { key: "to_return_by", html: fmtDate(asset.to_return_by) },
        { key: "vendor", html: fmt(asset.vendor) },
        {
          key: "cost",
          html:
            asset.cost != null
              ? `₱${Number(asset.cost).toLocaleString()}`
              : "-",
        },
        { key: "peripherals", html: fmtArr(asset.peripherals) },
        { key: "programs", html: fmtArr(asset.programs) },
        { key: "remarks", html: fmt(asset.remarks) },
        {
          key: "action",
          html: `<a href="computerItem.html?id=${asset.computer_id}" class="action-btn" title="Open"><i data-lucide="external-link"></i></a>`,
        },
      ];

      cells.forEach((cell) => {
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
  const DATE_KEYS = [
    "received_date",
    "warranty_expiry",
    "assigned_date",
    "to_return_by",
  ];

  // ── Column Sorting (single dropdown button, like column filters) ──
  const SORTABLE_COLUMNS = [
    "cost",
    "received_date",
    "warranty_expiry",
    "assigned_date",
    "to_return_by",
    "assigned_user_name",
    "computer_name",
    "assigned_user_emp_id",
  ];
  const ALPHA_SORT_COLUMNS = [
    "assigned_user_name",
    "computer_name",
    "assigned_user_emp_id",
  ]; // sorted alphabetically instead of numerically
  let sortState = { key: null, dir: null }; // dir: "asc" | "desc" | null

  function applySort(data) {
    if (!sortState.key) return data;
    const key = sortState.key;
    const dir = sortState.dir;
    const isDateCol = DATE_KEYS.includes(key);
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

    const getVal = (v) => {
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

  function renderCurrentView() {
    const query = searchInput.value.toLowerCase().trim();
    if (!query) {
      const base = filterAssetsByTab(assets);
      renderTable(base);
      return;
    }

    const filtered = filterAssetsByTab(assets).filter((asset) => {
      // Build a searchable string from all fields, converting date fields
      // to the same human-readable format shown in the table via fmtDate()
      const searchable = Object.entries(asset)
        .map(([k, v]) => {
          if (v == null) return "";
          if (DATE_KEYS.includes(k)) return fmtDate(v);
          if (Array.isArray(v)) return v.join(" ");
          return String(v);
        })
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });

    renderTable(filtered);
  }

  function buildSortableHeaders() {
    SORTABLE_COLUMNS.forEach((key) => {
      const th = document.querySelector(
        `#assetTable thead th[data-col="${key}"]`,
      );
      if (!th) return;

      const labelText = th.textContent.trim();
      const isAlphaCol = ALPHA_SORT_COLUMNS.includes(key);
      const ascLabel = isAlphaCol ? "Sort A-Z" : "Ascending";
      const descLabel = isAlphaCol ? "Sort Z-A" : "Descending";

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
        panel.querySelectorAll("input[type=radio]").forEach((r) => {
          r.checked = sortState.key === key && sortState.dir === r.value;
        });
      }

      btn.addEventListener("click", (e) => {
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
        sortState =
          sortState.key === key ? { key: null, dir: null } : sortState;
        panel
          .querySelectorAll("input[type=radio]")
          .forEach((r) => (r.checked = false));
        btn.classList.remove("active");
        panel.classList.add("hidden");
        renderCurrentView();
      });

      panel.querySelector(".col-filter-apply").addEventListener("click", () => {
        const checked = panel.querySelector("input[type=radio]:checked");
        sortState = checked
          ? { key, dir: checked.value }
          : { key: null, dir: null };
        btn.classList.toggle("active", !!checked);
        panel.classList.add("hidden");
        renderCurrentView();
      });

      refreshButtonState();
    });

    // Close panels on outside click, on table scroll, or on resize
    // (shared listeners already registered by buildColumnFilterUI cover
    // closeAllFilterPanels; nothing extra needed here since sort panels
    // use the same ".col-filter-panel" / ".col-filter-btn" classes.)

    lucide.createIcons();
  }

  searchInput.addEventListener("input", renderCurrentView);

  // ── Refresh Button (clears search, column filters, and sorting) ──
  function resetAllFilters() {
    // Clear search box
    searchInput.value = "";

    // Clear every column filter (checkbox panels + filter button state)
    FILTERABLE_COLUMNS.forEach((col) => {
      columnFilters[col.key] = new Set();
      const th = document.querySelector(
        `#assetTable thead th[data-col="${col.key}"]`,
      );
      if (th?._filterPanel) {
        th._filterPanel
          .querySelectorAll("input[type=checkbox]")
          .forEach((cb) => (cb.checked = false));
      }
      th?._filterBtn?.classList.remove("active");
    });

    // Clear sorting (radio panels + sort button state)
    sortState = { key: null, dir: null };
    SORTABLE_COLUMNS.forEach((key) => {
      const th = document.querySelector(
        `#assetTable thead th[data-col="${key}"]`,
      );
      if (th?._sortPanel) {
        th._sortPanel
          .querySelectorAll("input[type=radio]")
          .forEach((r) => (r.checked = false));
      }
      th?._sortBtn?.classList.remove("active");
    });

    closeAllFilterPanels();
    syncStatusCards();
    updateSummaryCardsForTypeFilter();
    renderCurrentView();
  }

  document
    .getElementById("refreshFiltersBtn")
    ?.addEventListener("click", resetAllFilters);

  applyPageState();

  // ── Apply column filters carried over via URL query params ───────
  // e.g. computer.html?status=Active&device_type=Laptop
  // Lets other pages (like the Asset Overview dashboard) deep-link
  // straight into a pre-filtered view of this table.
  function applyFiltersFromURL() {
    const params = new URLSearchParams(window.location.search);

    // Accept both "status" (friendly) and "computer_status" (exact column key)
    const paramsByColumnKey = {
      computer_status: params.get("status") || params.get("computer_status"),
      device_type: params.get("device_type"),
    };

    let didApply = false;

    Object.entries(paramsByColumnKey).forEach(([key, raw]) => {
      if (!raw) return;

      const values = raw
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      if (values.length === 0) return;

      const th = document.querySelector(
        `#assetTable thead th[data-col="${key}"]`,
      );
      if (!th || !th._filterPanel || !th._filterBtn) return;

      columnFilters[key] = new Set(values);
      didApply = true;

      th._filterPanel.querySelectorAll("input[type=checkbox]").forEach((cb) => {
        cb.checked = values.includes(cb.value);
      });
      th._filterBtn.classList.add("active");
    });

    syncStatusCards();
    updateSummaryCardsForTypeFilter();
    if (didApply) {
      renderTable(filterAssetsByTab(assets));
    }
  }

  // Fire both fetches in parallel on page load
  await Promise.all([loadAssets(), loadPeripherals(), loadPrograms()]);
  buildSortableHeaders();

  // Assets are loaded and filter panels are built by this point — safe to apply.
  applyFiltersFromURL();
});

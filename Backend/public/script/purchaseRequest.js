document.addEventListener("DOMContentLoaded", () => {
  lucide.createIcons();

  const API_BASE = "/api";
  const RESOURCE = "purchase-request";
  const token = localStorage.getItem("token");

  const tableBody         = document.getElementById("purchaseRequestTableBody");
  const searchInput       = document.getElementById("searchInput");
  const filterDatePreset  = document.getElementById("filterDatePreset");
  const filterCustomDates = document.getElementById("filterCustomDates");
  const filterDateFrom    = document.getElementById("filterDateFrom");
  const filterDateTo      = document.getElementById("filterDateTo");
  const btnClearFilters   = document.getElementById("btnClearFilters");
  const addButton         = document.getElementById("addPurchaseRequestBtn");

  function showAlertModal(message) {
    const overlay = document.getElementById("alertModal");
    const msgEl = document.getElementById("alertModalMessage");
    const btn = document.getElementById("alertModalOk");
    if (!overlay) return alert(message);
    msgEl.textContent = message;
    overlay.classList.remove("hidden");
    btn.onclick = () => overlay.classList.add("hidden");
  }

  function showConfirmModal(message) {
    return new Promise((resolve) => {
      const modal = document.getElementById("confirmReceiveModal");
      const msgEl = document.getElementById("confirmReceiveMessage");
      const okBtn = document.getElementById("confirmReceiveBtn");
      const cancelBtn = document.getElementById("cancelConfirmReceiveBtn");
      const closeBtn = document.getElementById("closeConfirmReceiveModal");
      if (!modal || !msgEl || !okBtn || !cancelBtn) { resolve(true); return; }

      msgEl.textContent = message;
      modal.classList.remove("hidden");

      const cleanup = (result) => {
        modal.classList.add("hidden");
        okBtn.removeEventListener("click", onOk);
        cancelBtn.removeEventListener("click", onCancel);
        closeBtn.removeEventListener("click", onCancel);
        resolve(result);
      };
      const onOk = () => cleanup(true);
      const onCancel = () => cleanup(false);
      okBtn.addEventListener("click", onOk, { once: true });
      cancelBtn.addEventListener("click", onCancel, { once: true });
      closeBtn.addEventListener("click", onCancel, { once: true });
    });
  }
  const modal             = document.getElementById("purchaseRequestModal");
  const modalTitle        = document.getElementById("purchaseRequestModalTitle");
  const closeModalBtn     = document.getElementById("closePurchaseRequestModal");
  const cancelBtn         = document.getElementById("cancelPurchaseRequestBtn");
  const form              = document.getElementById("purchaseRequestForm");
  const addItemBtn        = document.getElementById("addItemBtn");
  const itemsContainer    = document.getElementById("itemsContainer");
  const receivedDetailsGroup = document.getElementById("receivedDetailsGroup");
  const remarksGroup      = document.getElementById("remarksGroup");
  const itemDescriptionOptions = document.getElementById("itemDescriptionOptions");

  const fields = {
    prNo:          document.getElementById("prNo"),
    prStatus:      document.getElementById("prStatus"),
    dateRequested: document.getElementById("dateRequested"),
    requestedBy:   document.getElementById("requestedBy"),
    dateReceived:  document.getElementById("dateReceived"),
    receivedBy:    document.getElementById("receivedBy"),
    remarks:       document.getElementById("remarks"),
  };

  const filterStatus   = document.getElementById("filterStatus");
  const sortDateBtn    = document.getElementById("sortDateBtn");
  const sortDateLabel  = document.getElementById("sortDateLabel");
  const saveBtn        = document.getElementById("savePurchaseRequestBtn");
  const tableEl        = document.getElementById("purchaseRequestTable");
  let formSnapshot     = null;

  let purchaseRequests = [];
  let activeIndex = null;
  let pendingReceiveItem = null;
  let pendingRemoveItem  = null;
  let pendingSaveData    = null;
  let pendingReceiveIds  = new Set();
  const PAGE_SIZE = 10;
  let currentPage = 1;

  // Column filter & sort state
  let columnFilters = {};
  let sortState = { key: null, dir: null };
  const expandedPrIds = new Set();

  // All item descriptions seen across every loaded purchase request, deduped
  // case-insensitively (key: lowercase/trimmed, value: original casing as
  // first typed). This is what powers the item-description suggestions —
  // rebuilt every time the PR list loads, so a brand-new item becomes a
  // suggestion for the very next add/edit once its PR is saved.
  let knownItemDescriptions = new Map();

  // ─────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────
  function toDateInputValue(value) {
    if (!value) return "";
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toISOString().split("T")[0];
    const s = String(value);
    return s.includes("T") ? s.split("T")[0] : s;
  }

  function formatDate(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      const opts = { year: "numeric", month: "long", day: "numeric" };
      return date.toLocaleDateString("en-US", opts);
    }
    return String(value);
  }

  function pick(...values) {
    return values.find((v) => v !== undefined && v !== null && v !== "") || "";
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function getRequestId(request) {
    return request.pr_id ?? request.id ?? request.purchase_request_id ?? null;
  }

  function normalizeItem(item) {
    const itemStatus = pick(item.itemStatus, item.item_status, "");
    return {
      itemId:         pick(item.itemId, item.item_id, item.id, item.purchase_request_item_id, null),
      itemDescription: pick(item.itemDescription, item.item_description, ""),
      itemQuantity:    Number(pick(item.itemQuantity, item.item_quantity, 0)),
      unitPrice:       Number(pick(item.unitPrice, item.unit_price, 0)),
      itemStatus:      itemStatus,
      isReceived:      itemStatus === "Received",
    };
  }

  // Finds the most recent unit price for a given item description across
  // all loaded purchase requests (newest request first). Returns null if
  // no match is found. The returned value can be edited freely by the user.
  function getLatestUnitPrice(description) {
    const desc = (description || "").trim().toLowerCase();
    if (!desc) return null;
    for (let i = purchaseRequests.length - 1; i >= 0; i--) {
      const items = getItems(purchaseRequests[i]);
      for (const item of items) {
        if ((item.itemDescription || "").trim().toLowerCase() === desc) {
          return item.unitPrice;
        }
      }
    }
    return null;
  }

  function getItems(request) {
    if (Array.isArray(request.items) && request.items.length > 0)
      return request.items.map(normalizeItem);
    if (Array.isArray(request.purchaseRequestItems) && request.purchaseRequestItems.length > 0)
      return request.purchaseRequestItems.map(normalizeItem);
    return [];
  }

  function getPrimaryItem(request) {
    const items = getItems(request);
    return items.length ? items[0] : null;
  }

  function normalizeRequest(request) {
    const items = getItems(request);
    const activeItems = items.filter(i => i.itemStatus !== "Voided");
    const receivedCount = activeItems.filter(i => i.isReceived).length;
    const rawStatus = pick(request.prStatus, request.pr_status, request.status);
    const prStatus = receivedCount > 0
      ? (receivedCount === activeItems.length ? "Received" : "Partial")
      : rawStatus;

    return {
      ...request,
      id:            getRequestId(request),
      prNo:          pick(request.prNo, request.pr_no),
      prStatus:      prStatus,
      dateRequested: pick(request.dateRequested, request.date_requested),
      requestedBy:   pick(request.requestedBy, request.requested_by),
      dateReceived:  pick(request.dateReceived, request.date_received),
      receivedBy:    pick(request.receivedBy, request.received_by),
      remarks:       pick(request.remarks),
      items:         items,
    };
  }

  function toggleOptionalFields() {
    const status      = fields.prStatus.value;
    const showReceived = status === "Received";
    const showRemarks  = ["On Hold", "In Process", "Received", "Cancelled", "Partial"].includes(status);

    receivedDetailsGroup.classList.toggle("hidden", !showReceived);
    remarksGroup.classList.toggle("hidden", !showRemarks);

    fields.dateReceived.required = showReceived;
    fields.receivedBy.required   = showReceived;

    const dateReceivedLabel = receivedDetailsGroup?.querySelector("label[for='dateReceived']");
    const receivedByLabel   = receivedDetailsGroup?.querySelector("label[for='receivedBy']");
    if (showReceived) {
      if (dateReceivedLabel && !dateReceivedLabel.querySelector(".required")) dateReceivedLabel.innerHTML += ' <span class="required">*</span>';
      if (receivedByLabel && !receivedByLabel.querySelector(".required")) receivedByLabel.innerHTML += ' <span class="required">*</span>';
    } else {
      dateReceivedLabel?.querySelector(".required")?.remove();
      receivedByLabel?.querySelector(".required")?.remove();
    }

    if (activeIndex !== null) {
      const request = purchaseRequests[activeIndex];
      if (request && request.prStatus === "Received") {
        fields.prStatus.disabled = true;
      }
    }

    // Disable "Cancelled" option when any item has been received
    const hasReceivedItem = [...itemsContainer.querySelectorAll("[data-item-row]")].some(row =>
      row.querySelector("[name='itemStatus']")?.textContent === "Received"
    );
    const cancelledOpt = [...(fields.prStatus?.options || [])].find(o => o.textContent === "Cancelled");
    if (cancelledOpt) {
      cancelledOpt.disabled = hasReceivedItem;
    }
    // If currently on Cancelled but items are received, reset to current value
    if (hasReceivedItem && fields.prStatus.value === "Cancelled") {
      fields.prStatus.value = [...fields.prStatus.options].find(o => !o.disabled)?.value || "In Process";
    }
  }

  // ─────────────────────────────────────────────
  // Item row builder — single-line layout
  // ─────────────────────────────────────────────
  function createItemRow(item = {}, isReceived = false) {
    const row = document.createElement("div");
    row.className      = "item-row";
    row.dataset.itemRow = "true";
    if (item.itemId) row.dataset.itemId = item.itemId;

    const itemStatus = item.isReceived ? "Received" : (item.itemStatus || "In Process");
    const showReceive = !isReceived;
    const receiveDisabled = !item.itemId || item.isReceived || item.itemStatus === "Voided";
    const voidDisabled = isReceived || item.isReceived || item.itemStatus === "Voided";
    const statusClass = itemStatus === "Received" ? "st-received" : itemStatus === "Voided" ? "st-voided" : "st-in-process";

    row.innerHTML = `
      <div class="if-desc">
        <input name="itemDescription" type="text" placeholder="Item description"
          list="itemDescriptionOptions" autocomplete="off" readonly
          class="item-ro-field"
          value="${escapeHtml(item.itemDescription ?? "")}" required>
        <span class="field-error">Please enter an item.</span>
      </div>
      <div class="if-status">
        <span name="itemStatus" class="status-display ${statusClass}">${escapeHtml(itemStatus)}</span>
      </div>
      <div class="if-qty">
        <input name="itemQuantity" type="number" min="1" readonly
          class="item-ro-field"
          value="${escapeHtml(item.itemQuantity ?? 1)}" required>
      </div>
      <div class="if-price">
        <input name="unitPrice" type="number" min="0" step="0.01" readonly
          class="item-ro-field"
          value="${escapeHtml(item.unitPrice ?? 0)}" required>
      </div>
      <div class="if-actions">
        ${showReceive
          ? `<button type="button" class="if-receive-btn" data-action="inline-receive" title="Mark as received"
               ${receiveDisabled ? "disabled style=\"opacity:0.3;cursor:not-allowed;\"" : ""}>
               <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
             </button>`
          : `<span class="if-action-placeholder"></span>`
        }
        <button type="button" class="if-remove-btn" data-action="void-item-inline"
          ${voidDisabled ? "disabled style=\"opacity:0.4;cursor:not-allowed;\"" : ""}>
          <i data-lucide="trash-2"></i>
        </button>
      </div>
    `;

    lucide.createIcons({ el: row });
    return row;
  }

  function renderItemsHeader() {
    if (itemsContainer.querySelector(".items-table-header")) return;
    const header = document.createElement("div");
    header.className = "items-table-header";
    header.innerHTML = `
      <span class="ih-desc">Description</span>
      <span class="ih-status">Status</span>
      <span class="ih-qty">Qty</span>
      <span class="ih-price">Unit Cost</span>
      <span class="ih-action">Action</span>
    `;
    itemsContainer.prepend(header);
  }

  function clearItems() { itemsContainer.innerHTML = ""; }

  function ensureAtLeastOneItemRow() {
    if (!itemsContainer.querySelector("[data-item-row]") && activeIndex !== null) {
      itemsContainer.appendChild(createItemRow());
    }
  }

  function addItemRow(item = {}, isReceived = false) {
    itemsContainer.appendChild(createItemRow(item, isReceived));
  }

  function getItemsFromForm() {
    return Array.from(itemsContainer.querySelectorAll("[data-item-row]"))
      .map((row) => ({
        itemId:         row.dataset.itemId || null,
        itemDescription: row.querySelector("[name='itemDescription']")?.value.trim() || "",
        itemQuantity:    Number(row.querySelector("[name='itemQuantity']")?.value || 0),
        unitPrice:       Number(row.querySelector("[name='unitPrice']")?.value || 0),
        itemStatus:      row.querySelector("[name='itemStatus']")?.textContent || "In Process",
      }))
      .filter((item) => item.itemDescription);
  }

  // ─────────────────────────────────────────────
  // Known items — powers the item-description suggestions
  // ─────────────────────────────────────────────

  // Re-derives knownItemDescriptions from whatever's currently in
  // purchaseRequests, then re-renders the shared datalist. Call this any time
  // purchaseRequests changes (initial load, after every save) so newly-saved
  // item descriptions show up as suggestions right away.
  function rebuildKnownItems() {
    knownItemDescriptions = new Map();

    purchaseRequests.forEach((request) => {
      getItems(request).forEach((item) => {
        const description = (item.itemDescription || "").trim();
        if (!description) return;

        const key = description.toLowerCase();
        // Keep the first-seen casing for a given description rather than
        // overwriting it on every match — purely cosmetic, doesn't affect
        // matching since the key itself is already lowercased.
        if (!knownItemDescriptions.has(key)) {
          knownItemDescriptions.set(key, description);
        }
      });
    });

    renderItemDescriptionOptions();
  }

  function renderItemDescriptionOptions() {
    if (!itemDescriptionOptions) return;

    const sortedDescriptions = Array.from(knownItemDescriptions.values())
      .sort((a, b) => a.localeCompare(b));

    itemDescriptionOptions.innerHTML = sortedDescriptions
      .map((description) => `<option value="${escapeHtml(description)}"></option>`)
      .join("");
  }

  // ── Date range resolution (Audit Log style) ──────────────────────
  function resolveDateRange() {
    const preset = filterDatePreset?.value || "";
    const now   = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const fmt = d => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };
    if (preset === "today") return { from: fmt(today), to: fmt(today) };
    if (preset === "7d")    return { from: fmt(new Date(today.getTime() - 6 * 86400000)), to: fmt(today) };
    if (preset === "30d")   return { from: fmt(new Date(today.getTime() - 29 * 86400000)), to: fmt(today) };
    if (preset === "custom") {
      return { from: filterDateFrom?.value || "", to: filterDateTo?.value || "" };
    }
    return { from: "", to: "" };
  }

  // ─────────────────────────────────────────────
  // Filtering — text search + date range
  // ─────────────────────────────────────────────
  function getFilteredRequests() {
    const query   = (searchInput?.value || "").trim().toLowerCase();

    let result = purchaseRequests.filter((request) => {
      // Column filters
      for (const [key, valueSet] of Object.entries(columnFilters)) {
        if (valueSet && valueSet.size > 0) {
          const val = String(request[key] ?? "");
          if (!valueSet.has(val)) return false;
        }
      }

      if (query) {
        const primaryItem = getPrimaryItem(request);
        const haystack = [
          request.prNo, request.prStatus, request.dateRequested,
          request.dateReceived, request.requestedBy, request.receivedBy,
          request.remarks, primaryItem?.itemDescription,
          primaryItem?.itemQuantity, primaryItem?.unitPrice,
        ].join(" ").toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      return true;
    });

    // Date range filter (client-side, from preset or custom dates)
    const { from: fromVal, to: toVal } = resolveDateRange();
    const fromDate = fromVal ? new Date(fromVal) : null;
    const toDate   = toVal   ? new Date(toVal)   : null;
    if (toDate) toDate.setHours(23, 59, 59, 999);

    if (fromDate || toDate) {
      result = result.filter(request => {
        const reqDate = request.dateRequested ? new Date(request.dateRequested) : null;
        if (!reqDate) return false;
        if (fromDate && reqDate < fromDate) return false;
        if (toDate   && reqDate > toDate)   return false;
        return true;
      });
    }

    // Sort by column sort state
    if (sortState.key && sortState.dir) {
      result.sort((a, b) => {
        const va = a[sortState.key];
        const vb = b[sortState.key];
        const da = va ? new Date(va).getTime() : 0;
        const db = vb ? new Date(vb).getTime() : 0;
        if (da !== db) return sortState.dir === "asc" ? da - db : db - da;
        return sortState.dir === "asc" ? (a.id ?? 0) - (b.id ?? 0) : (b.id ?? 0) - (a.id ?? 0);
      });
    }

    return result;
  }

  // ─────────────────────────────────────────────
  // Column filter/sort UI
  // ─────────────────────────────────────────────
  const FILTERABLE_COLUMNS = ["prStatus", "requestedBy", "receivedBy"];

  function closeAllFilterPanels(except) {
    document.querySelectorAll(".col-filter-panel").forEach(p => {
      if (p !== except) p.classList.add("hidden");
    });
  }

  function positionFilterPanel(panel, btn) {
    const rect = btn.getBoundingClientRect();
    panel.style.top  = (rect.bottom + 4) + "px";
    panel.style.left = Math.min(rect.left, window.innerWidth - 230) + "px";
  }

  function buildColumnFilterUI() {
    FILTERABLE_COLUMNS.forEach(key => {
      const th = tableEl?.querySelector(`thead th[data-col="${key}"]`);
      if (!th) return;

      columnFilters[key] = new Set();
      th.classList.add("filterable-th");

      const content = document.createElement("div");
      content.className = "th-content";

      const span = document.createElement("span");
      const labelText = th.textContent.trim();
      span.textContent = labelText;
      content.appendChild(span);

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "col-filter-btn";
      btn.title = `Filter ${labelText}`;
      btn.innerHTML = `<i data-lucide="filter"></i>`;
      content.appendChild(btn);
      th.innerHTML = "";
      th.appendChild(content);

      const panel = document.createElement("div");
      panel.className = "col-filter-panel hidden";
      panel.innerHTML = `
        <div class="col-toggle-header">
          <span>Filter ${escapeHtml(labelText)}</span>
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

      function populateFilterOptions() {
        const values = [...new Set(purchaseRequests.map(r => String(r[key] ?? "").trim()).filter(Boolean))].sort();
        body.innerHTML = values.map(opt => {
          const checked = columnFilters[key]?.has(opt) ? "checked" : "";
          return `<label class="col-check-item"><input type="checkbox" value="${escapeHtml(opt)}" ${checked} /> ${escapeHtml(opt)}</label>`;
        }).join("");
      }

      btn.addEventListener("click", e => {
        e.stopPropagation();
        const isOpen = !panel.classList.contains("hidden");
        closeAllFilterPanels(panel);
        if (isOpen) { panel.classList.add("hidden"); return; }
        populateFilterOptions();
        positionFilterPanel(panel, btn);
        panel.classList.remove("hidden");
      });

      panel.querySelectorAll(".cf-all, .cf-none").forEach(link => {
        link.addEventListener("click", () => {
          const check = link.classList.contains("cf-all");
          panel.querySelectorAll("input[type=checkbox]").forEach(cb => cb.checked = check);
        });
      });

      panel.querySelector(".col-filter-clear").addEventListener("click", () => {
        columnFilters[key].clear();
        btn.classList.remove("active");
        panel.classList.add("hidden");
        currentPage = 1;
        renderTable();
      });

      panel.querySelector(".col-filter-apply").addEventListener("click", () => {
        const checked = [...panel.querySelectorAll("input[type=checkbox]:checked")].map(cb => cb.value);
        columnFilters[key] = new Set(checked);
        btn.classList.toggle("active", checked.length > 0);
        panel.classList.add("hidden");
        currentPage = 1;
        renderTable();
      });
    });
  }

  function buildSortableHeaders() {
    document.querySelectorAll("#purchaseRequestTable thead th.sortable-th").forEach(th => {
      const key = th.dataset.col;
      if (!key) return;

      const labelText = th.textContent.trim();
      th.innerHTML = "";

      const content = document.createElement("div");
      content.className = "th-content";

      const span = document.createElement("span");
      span.textContent = labelText;
      content.appendChild(span);

      const sortGroup = document.createElement("div");
      sortGroup.className = "col-sort-group";

      const upBtn = document.createElement("button");
      upBtn.type = "button";
      upBtn.className = "col-sort-btn col-sort-up";
      upBtn.title = `Sort ${labelText} ascending`;
      upBtn.innerHTML = `<i data-lucide="chevron-up"></i>`;

      const downBtn = document.createElement("button");
      downBtn.type = "button";
      downBtn.className = "col-sort-btn col-sort-down";
      downBtn.title = `Sort ${labelText} descending`;
      downBtn.innerHTML = `<i data-lucide="chevron-down"></i>`;

      sortGroup.appendChild(upBtn);
      sortGroup.appendChild(downBtn);
      content.appendChild(sortGroup);
      th.appendChild(content);

      const refreshBtnStates = () => {
        document.querySelectorAll(".col-sort-btn").forEach(b => b.classList.remove("active"));
        if (sortState.key === key) {
          if (sortState.dir === "asc") upBtn.classList.add("active");
          else if (sortState.dir === "desc") downBtn.classList.add("active");
        }
      };

      upBtn.addEventListener("click", e => {
        e.stopPropagation();
        sortState = (sortState.key === key && sortState.dir === "asc")
          ? { key: null, dir: null }
          : { key, dir: "asc" };
        refreshBtnStates();
        currentPage = 1;
        renderTable();
      });

      downBtn.addEventListener("click", e => {
        e.stopPropagation();
        sortState = (sortState.key === key && sortState.dir === "desc")
          ? { key: null, dir: null }
          : { key, dir: "desc" };
        refreshBtnStates();
        currentPage = 1;
        renderTable();
      });
    });
  }

  // ─────────────────────────────────────────────
  // Render table
  // ─────────────────────────────────────────────
  function renderTable() {
    if (!tableBody) return;

    const filteredRequests = getFilteredRequests();
    const total            = filteredRequests.length;
    const start            = (currentPage - 1) * PAGE_SIZE;
    const end              = Math.min(start + PAGE_SIZE, total);
    const pageRequests     = filteredRequests.slice(start, end);

    tableBody.innerHTML = "";

    if (!pageRequests.length) {
      tableBody.innerHTML = `<tr><td colspan="8" class="empty-state">No purchase requests found.</td></tr>`;
      renderPagination(total);
      return;
    }

    pageRequests.forEach((request) => {
      const items       = getItems(request);
      const totalQty    = items.reduce((s, i) => s + i.itemQuantity, 0);
      const totalCost   = items.reduce((s, i) => s + i.itemQuantity * i.unitPrice, 0);
      const statusClass = ({
        "In Process": "status-in-process",
        "On Hold":    "status-on-hold",
        "Received":   "status-received",
        "Partial":    "status-partial",
        "Cancelled":  "status-cancelled",
      })[request.prStatus] || "";
      const requestId   = getRequestId(request);

      const mainRow = document.createElement("tr");
      mainRow.className     = "pr-main-row is-expandable";
      mainRow.dataset.prId  = String(requestId ?? "");

      mainRow.innerHTML = `
        <td>
          <div class="action-cell">
            <button type="button" class="expand-toggle" data-action="toggle-items"
              aria-expanded="false" aria-label="Show all items">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </button>
            ${escapeHtml(request.prNo || "-")}
          </div>
        </td>
        <td><span class="status-pill ${statusClass}">${escapeHtml(request.prStatus || "-")}</span></td>
        <td>${escapeHtml(request.requestedBy || "-")}</td>
        <td>${escapeHtml(formatDate(request.dateRequested))}</td>
        <td>${escapeHtml(formatDate(request.dateReceived))}</td>
        <td>${escapeHtml(request.receivedBy || "-")}</td>
        <td title="${escapeHtml(request.remarks || "")}">${escapeHtml(request.remarks || "-")}</td>
        <td>
          <div class="action-cell">
            ${request.prStatus === "Received" || request.prStatus === "Cancelled"
              ? `<span class="text-muted" style="font-size:12px;color:#94a3b8">—</span>`
              : `<button type="button" class="action-link" data-action="edit"
                data-id="${escapeHtml(String(requestId ?? ""))}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg>
                Edit</button>`
            }
          </div>
        </td>
      `;

      tableBody.appendChild(mainRow);

      // ── Items detail subtable ────────────────────────────────────────
      const detailRow = document.createElement("tr");
      detailRow.className         = "pr-items-detail hidden";
      detailRow.dataset.prDetail  = String(requestId ?? "");
      detailRow.dataset.prStatus  = request.prStatus;

      const prTerminal = request.prStatus === "Received" || request.prStatus === "Cancelled";
      const itemsHtml = items.map((item, idx) => {
        const itemStatus = item.isReceived ? "Received"
          : (item.itemStatus || "In Process");
        const itemStatusClass = ({
          "In Process": "status-in-process",
          "On Hold":    "status-on-hold",
          "Received":   "status-received",
          "Partial":    "status-partial",
          "Voided":     "status-voided",
        })[itemStatus] || "";
        const isReceivedStatus = itemStatus === "Received";
        const isVoidedStatus = itemStatus === "Voided";
        return `
          <div class="psi-row" data-item-index="${idx}">
            <div class="psr-desc">${escapeHtml(item.itemDescription || "-")}</div>
            <div class="psr-qty">${item.itemQuantity}</div>
            <div class="psr-price">₱${Number(item.unitPrice).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</div>
            <div class="psr-status">
              <span class="status-pill ${itemStatusClass}">${escapeHtml(itemStatus)}</span>
            </div>
            <div class="psr-actions">
              ${!isReceivedStatus && !isVoidedStatus
                ? `<button type="button" class="action-link action-receive" data-action="confirm-receive" data-item-index="${idx}">
                     <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                     Receive
                   </button>
                   <button type="button" class="action-link action-cancel" data-action="void-item" data-item-index="${idx}">
                     <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                     Void
                   </button>`
                : `<span style="color:#94a3b8;font-size:13px">—</span>`
              }
            </div>
          </div>`;
      }).join("");

      const totalsHtml = `
        <div class="psi-total">
          <div class="pst-label"><strong>Total</strong></div>
          <div class="pst-qty"><strong>${totalQty}</strong></div>
          <div class="pst-price"><strong>₱${totalCost.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</strong></div>
          <div class="pst-status"></div>
          <div class="pst-actions"></div>
        </div>`;

      detailRow.innerHTML = `
        <td colspan="8">
          <div class="pr-items-panel">
            <div class="psi-header">
              <span class="psh-desc">Item</span>
              <span class="psh-qty">Item Qty</span>
              <span class="psh-price">Unit Cost</span>
              <span class="psh-status">Status</span>
              <span class="psh-action">Action</span>
            </div>
            ${itemsHtml}${totalsHtml}
          </div>
        </td>
      `;

      tableBody.appendChild(detailRow);
    });

    lucide.createIcons();

    // Re-expand previously opened detail rows
    expandedPrIds.forEach(prId => {
      const detailRow = tableBody.querySelector(`tr[data-pr-detail="${prId}"]`);
      if (!detailRow) return;
      detailRow.classList.remove("hidden");
      const mainRow = tableBody.querySelector(`tr[data-pr-id="${prId}"]`);
      if (mainRow) {
        const chevron = mainRow.querySelector(".expand-toggle");
        if (chevron) chevron.setAttribute("aria-expanded", "true");
        mainRow.classList.add("is-expanded");
      }
    });

    renderPagination(total);
  }

  // ─────────────────────────────────────────────
  // Table click delegation
  // ─────────────────────────────────────────────
  tableBody?.addEventListener("click", (event) => {
    const editBtn = event.target.closest("button[data-action='edit']");
    if (editBtn) {
      const id = editBtn.getAttribute("data-id");
      const requestIndex = purchaseRequests.findIndex(
        (r) => String(getRequestId(r)) === String(id)
      );
      if (requestIndex >= 0) openModal("edit", requestIndex);
      return;
    }

    const toggleBtn = event.target.closest("button[data-action='toggle-items']");
    const mainRow   = event.target.closest("tr.is-expandable");

    if (toggleBtn || mainRow) {
      const row       = (toggleBtn ?? event.target).closest("tr.is-expandable");
      if (!row) return;
      const prId      = row.dataset.prId;
      const detailRow = tableBody.querySelector(`tr[data-pr-detail="${prId}"]`);
      const chevron   = row.querySelector(".expand-toggle");
      if (!detailRow) return;
      const isOpen = !detailRow.classList.contains("hidden");
      detailRow.classList.toggle("hidden", isOpen);
      chevron?.setAttribute("aria-expanded", String(!isOpen));
      row.classList.toggle("is-expanded", !isOpen);
      if (prId) {
        if (isOpen) expandedPrIds.delete(prId);
        else expandedPrIds.add(prId);
      }
      return;
    }

    // Confirm Receive button
    const confirmBtn = event.target.closest("button[data-action='confirm-receive']");
    if (confirmBtn) {
      const subRow    = confirmBtn.closest(".psi-row");
      const detailRow = confirmBtn.closest("tr[data-pr-detail]");
      if (!subRow || !detailRow) return;
      const prId      = detailRow.dataset.prDetail;
      const idx       = Number(subRow.dataset.itemIndex);
      const request   = purchaseRequests.find(r => String(getRequestId(r)) === String(prId));
      if (!request) return;
      const items     = getItems(request);
      const item      = items[idx];
      if (!item) return;

      pendingReceiveItem = { request, item, idx, prId };
      document.getElementById("confirmReceiveMessage").textContent =
        `Mark item "${item.itemDescription}" as received?`;
      document.getElementById("confirmReceiveModal").classList.remove("hidden");
      return;
    }

    // Void Item button
    const voidBtn = event.target.closest("button[data-action='void-item']");
    if (voidBtn) {
      const subRow    = voidBtn.closest(".psi-row");
      const detailRow = voidBtn.closest("tr[data-pr-detail]");
      if (!subRow || !detailRow) return;
      const prId      = detailRow.dataset.prDetail;
      const idx       = Number(subRow.dataset.itemIndex);
      const request   = purchaseRequests.find(r => String(getRequestId(r)) === String(prId));
      if (!request) return;
      const items     = getItems(request);
      const item      = items[idx];
      if (!item) return;

      pendingRemoveItem = { item, idx, prId, request };
      document.getElementById("confirmRemoveMessage").textContent =
        `Void item "${item.itemDescription}"? This action cannot be undone.`;
      document.getElementById("confirmRemoveModal").classList.remove("hidden");
      return;
    }

    const statusSelect = event.target.closest("select[data-action='change-item-status']");
    if (statusSelect) {
      const subRow    = statusSelect.closest(".psi-row");
      const detailRow = statusSelect.closest("tr[data-pr-detail]");
      if (!subRow || !detailRow) return;
      const prId      = detailRow.dataset.prDetail;
      const idx       = Number(subRow.dataset.itemIndex);
      const request   = purchaseRequests.find(r => String(getRequestId(r)) === String(prId));
      if (!request) return;
      const items     = getItems(request);
      const item      = items[idx];
      if (!item) return;

      item.itemStatus = statusSelect.value;

      const statusClassMap = {
        "In Process": "status-in-process",
        "On Hold":    "status-on-hold",
        "Voided":     "status-voided",
      };
      const newClass = statusClassMap[statusSelect.value] || "";
      statusSelect.className = `item-status-select${newClass ? " " + newClass : ""}`;
    }
  });

  // ─────────────────────────────────────────────
  // Load
  // ─────────────────────────────────────────────
  async function loadRequests() {
    try {
      const res = await fetch(`${API_BASE}/${RESOURCE}`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) throw new Error(`Failed to load purchase requests: ${res.status}`);

      const data = await res.json();
      const list = Array.isArray(data) ? data
        : Array.isArray(data.purchaseRequests) ? data.purchaseRequests
        : Array.isArray(data.data) ? data.data
        : [];

      purchaseRequests = list.map(normalizeRequest);
      purchaseRequests.sort((a, b) => {
        const da = a.dateRequested ? new Date(a.dateRequested).getTime() : 0;
        const db = b.dateRequested ? new Date(b.dateRequested).getTime() : 0;
        if (da !== db) return db - da;
        return (b.id ?? 0) - (a.id ?? 0);
      });
      rebuildKnownItems();
      buildColumnFilterUI();
      buildSortableHeaders();
      renderTable();
    } catch (error) {
      console.error("Failed to load purchase requests:", error);
      purchaseRequests = [];
      renderTable();
    }
  }

  // ─────────────────────────────────────────────
  // Modal
  // ─────────────────────────────────────────────
  function openModal(mode = "add", requestIndex = null) {
    if (!modal || !modalTitle || !form) return;

    activeIndex = requestIndex;
    form.reset();
    clearFormErrors();
    clearItems();
    renderItemsHeader();

    const isEdit = mode === "edit" && requestIndex !== null && purchaseRequests[requestIndex];
    let isReceived = false;

    if (isEdit) {
      const request = purchaseRequests[requestIndex];
      isReceived = request.prStatus === "Received";

      modalTitle.textContent     = "Edit Purchase Request";
      fields.prNo.value          = pick(request.prNo, request.pr_no, "");
      fields.prStatus.value      = pick(request.prStatus, request.pr_status, request.status, "In Process");
      fields.dateRequested.value = toDateInputValue(pick(request.dateRequested, request.date_requested, ""));
      fields.requestedBy.value   = pick(request.requestedBy, request.requested_by, "");
      fields.dateReceived.value  = toDateInputValue(pick(request.dateReceived, request.date_received, ""));
      fields.receivedBy.value    = pick(request.receivedBy, request.received_by, "");
      fields.remarks.value       = pick(request.remarks, "");

      // Make readonly fields non-editable and remove required
      fields.prNo.readOnly          = true;
      fields.dateRequested.readOnly = true;
      fields.requestedBy.readOnly   = true;
      fields.prNo.required          = false;
      fields.dateRequested.required = false;
      fields.requestedBy.required   = false;
      ["prNo", "dateRequested", "requestedBy"].forEach(id => {
        const label = document.querySelector(`label[for="${id}"]`);
        label?.querySelector(".required")?.remove();
      });

      const items = getItems(request);
      if (items.length) items.forEach((item) => addItemRow(item, isReceived));
      else addItemRow(null, isReceived);

      // If already Received, disable the status dropdown and mark all items "Received"
      if (isReceived) {
        fields.prStatus.disabled = true;
        items.forEach(item => { item.itemStatus = "Received"; });
      } else {
        fields.prStatus.disabled = false;
      }
    } else {
      modalTitle.textContent     = "Add Purchase Request";
      fields.prStatus.value      = "In Process";
      fields.dateRequested.value = new Date().toISOString().split("T")[0];
      fields.prStatus.disabled   = true;
      fields.prNo.readOnly          = false;
      fields.dateRequested.readOnly = false;
      fields.requestedBy.readOnly   = false;
      fields.prNo.required          = true;
      fields.dateRequested.required = true;
      fields.requestedBy.required   = true;
      ["prNo", "dateRequested", "requestedBy"].forEach(id => {
        const label = document.querySelector(`label[for="${id}"]`);
        if (label && !label.querySelector(".required")) label.innerHTML += ' <span class="required">*</span>';
      });
    }

    // Disable Add Item for received PRs
    const addPreviewRow = document.getElementById("addItemPreview");
    addItemBtn.disabled = isReceived;
    addItemBtn.style.opacity = isReceived ? "0.4" : "";
    addItemBtn.style.cursor = isReceived ? "not-allowed" : "";
    if (addPreviewRow) {
      addPreviewRow.style.opacity = isReceived ? "0.45" : "0.85";
      if (isReceived) addPreviewRow.style.pointerEvents = "none";
      else addPreviewRow.style.pointerEvents = "";
    }

    toggleOptionalFields();
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    if (window.lucide) lucide.createIcons();
    setTimeout(updateRemoveButtons, 0);

    // Take snapshot and disable save button if editing
    if (isEdit) {
      takeSnapshot();
      if (saveBtn) saveBtn.disabled = true;
    }
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
    activeIndex = null;
    pendingReceiveIds.clear();
  }

  // ── Validation ──────────────────────────────────────────────────
  function validateForm() {
    const rules = [
      { id: "prNo",          errId: "prNoError",          test: v => v.trim() !== "" },
      { id: "prStatus",      errId: "prStatusError",      test: v => v !== "" },
      { id: "dateRequested", errId: "dateRequestedError", test: v => v.trim() !== "" },
      { id: "requestedBy",   errId: "requestedByError",   test: v => v.trim() !== "" },
    ];

    // Validate Received fields when status is Received
    if (fields.prStatus.value === "Received") {
      rules.push({ id: "dateReceived", errId: null, test: v => v.trim() !== "" });
      rules.push({ id: "receivedBy",   errId: null, test: v => v.trim() !== "" });
    }

    let valid = true;
    rules.forEach(({ id, errId, test }) => {
      const el    = document.getElementById(id);
      const errEl = errId ? document.getElementById(errId) : null;
      if (!el) return;
      const ok = test(el.value ?? "");
      el.classList.toggle("input-error", !ok);
      if (errEl) errEl.classList.toggle("visible", !ok);
      if (!ok) valid = false;
    });

    // Validate each item row description
    const itemRows = itemsContainer.querySelectorAll("[data-item-row]");
    let itemValid = true;
    itemRows.forEach(row => {
      const desc   = row.querySelector("[name='itemDescription']");
      const errEl  = row.querySelector(".field-error");
      if (!desc) return;
      const ok = desc.value.trim() !== "";
      desc.classList.toggle("input-error", !ok);
      if (errEl) errEl.classList.toggle("visible", !ok);
      if (!ok) itemValid = false;
    });
    if (!itemValid) valid = false;

    return valid;
  }

  function clearFormErrors() {
    ["prNo", "prStatus", "dateRequested", "requestedBy"].forEach(id => {
      const el    = document.getElementById(id);
      const errEl = document.getElementById(`${id}Error`);
      if (el)    el.classList.remove("input-error");
      if (errEl) errEl.classList.remove("visible");
    });
    itemsContainer.querySelectorAll("[data-item-row]").forEach(row => {
      const desc  = row.querySelector("[name='itemDescription']");
      const errEl = row.querySelector(".field-error");
      if (desc)  desc.classList.remove("input-error");
      if (errEl) errEl.classList.remove("visible");
    });
  }

  // ── Change detection ───────────────────────────────────────────────────
  function takeSnapshot() {
    const items = getItemsFromForm();
    formSnapshot = {
      prNo:          fields.prNo.value,
      prStatus:      fields.prStatus.value,
      dateRequested: fields.dateRequested.value,
      requestedBy:   fields.requestedBy.value,
      dateReceived:  fields.dateReceived.value,
      receivedBy:    fields.receivedBy.value,
      remarks:       fields.remarks.value,
      items:         JSON.stringify(items),
    };
  }

  function hasFormChanged() {
    if (!formSnapshot) return true;
    const items = getItemsFromForm();
    return !(
      fields.prNo.value          === formSnapshot.prNo &&
      fields.prStatus.value      === formSnapshot.prStatus &&
      fields.dateRequested.value === formSnapshot.dateRequested &&
      fields.requestedBy.value   === formSnapshot.requestedBy &&
      fields.dateReceived.value  === formSnapshot.dateReceived &&
      fields.receivedBy.value    === formSnapshot.receivedBy &&
      fields.remarks.value       === formSnapshot.remarks &&
      JSON.stringify(items)      === formSnapshot.items
    );
  }

  function updateSaveButton() {
    if (!saveBtn) return;
    const isEditing = activeIndex !== null;
    if (isEditing) {
      saveBtn.disabled = !hasFormChanged();
    } else {
      saveBtn.disabled = false;
    }
  }

  // ─────────────────────────────────────────────
  // Save helpers
  // ─────────────────────────────────────────────
  function formatCurrency(n) {
    return "₱" + Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2 });
  }

  function buildConfirmContent() {
    const isEdit = activeIndex !== null;
    const items = getItemsFromForm();
    const totalQty = items.reduce((s, i) => s + i.itemQuantity, 0);
    const totalCost = items.reduce((s, i) => s + i.itemQuantity * i.unitPrice, 0);

    const summary = document.getElementById("confirmSaveSummary");
    summary.innerHTML = `
      <div class="confirm-summary-grid">
        <span class="label">PR No.</span>
        <span>${escapeHtml(fields.prNo.value)}</span>
        <span class="label">Date Requested</span>
        <span>${escapeHtml(fields.dateRequested.value)}</span>
        <span class="label">Requested By</span>
        <span>${escapeHtml(fields.requestedBy.value.trim())}</span>
        ${isEdit ? `<span class="label">Status</span><span>${escapeHtml(fields.prStatus.value)}</span>` : ""}
      </div>
    `;

    const wrapper = document.getElementById("confirmSaveItemsWrapper");
    if (items.length === 0) {
      wrapper.innerHTML = `<p class="no-items-msg">No items.</p>`;
    } else {
      wrapper.innerHTML = `
        <div class="confirm-items-card">
          <div class="confirm-items-header">
            <span>Item</span>
            <span class="right">Item Qty</span>
            <span class="right">Unit Cost</span>
            <span class="right">Total</span>
          </div>
          ${items.map(i => `
            <div class="confirm-items-row">
              <span class="desc">${escapeHtml(i.itemDescription)}</span>
              <span class="right">${i.itemQuantity}</span>
              <span class="right">${formatCurrency(i.unitPrice)}</span>
              <span class="right total-weight">${formatCurrency(i.itemQuantity * i.unitPrice)}</span>
            </div>
          `).join("")}
          <div class="confirm-items-footer">
            <span class="right">Total</span>
            <span class="right">${totalQty}</span>
            <span></span>
            <span class="right">${formatCurrency(totalCost)}</span>
          </div>
        </div>
      `;
    }
  }

  function saveRequest(event) {
    event.preventDefault();

    clearFormErrors();
    if (!validateForm()) return;

    const items = getItemsFromForm();
    const existingRequest = activeIndex !== null ? purchaseRequests[activeIndex] : null;
    const isEdit   = activeIndex !== null;
    const targetId = isEdit ? purchaseRequests[activeIndex]?.id : null;

    if (!isEdit && items.length === 0) {
      showAlertModal("Please add at least one item.");
      return;
    }

    if (isEdit && !targetId) {
      showAlertModal("Cannot update this purchase request because the record ID is missing.");
      return;
    }

    pendingSaveData = { items, existingRequest, isEdit, targetId };
    document.getElementById("confirmSaveTitle").textContent = isEdit ? "Confirm Changes" : "Confirm New Purchase Request";
    buildConfirmContent();
    modal.classList.add("hidden");
    document.getElementById("confirmSaveModal").classList.remove("hidden");
  }

  async function performSave() {
    if (!pendingSaveData) return;
    const { items, existingRequest, isEdit, targetId } = pendingSaveData;
    const confirmModal = document.getElementById("confirmSaveModal");

    try {
      if (!isEdit) {
        const payload = {
          prNo:          Number(fields.prNo.value),
          dateRequested: fields.dateRequested.value,
          requestedBy:   fields.requestedBy.value.trim(),
          items,
        };

        const res = await fetch(`${API_BASE}/${RESOURCE}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => null);
          throw new Error(errorData?.message || `Save failed: ${res.status}`);
        }

        confirmModal.classList.add("hidden");
        closeModal();
        await loadRequests();
        return;
      }

      // PATCH — update existing PR header fields
      const patchPayload = {};

      const snapStatus    = existingRequest?.prStatus || "";
      const snapRequested = existingRequest?.requestedBy || "";
      const snapReceived  = existingRequest?.receivedBy || existingRequest?.received_by || "";
      const snapDateRec   = existingRequest?.dateReceived || existingRequest?.date_received || "";
      const snapRemarks   = existingRequest?.remarks || "";

      const curStatus    = fields.prStatus.value;
      const curRequested = fields.requestedBy.value.trim();
      const curReceived  = fields.receivedBy.value.trim();
      const curDateRec   = fields.dateReceived.value;
      const curRemarks   = fields.remarks.value.trim();

      if (curStatus    && curStatus    !== snapStatus)    patchPayload.prStatus      = curStatus;
      if (curRequested && curRequested !== snapRequested) patchPayload.requestedBy    = curRequested;
      if (curReceived  && curReceived  !== snapReceived)  patchPayload.receivedBy     = curReceived;
      if (curDateRec   && curDateRec   !== snapDateRec)   patchPayload.dateReceived   = curDateRec;
      if (curRemarks   && curRemarks   !== snapRemarks)   patchPayload.remarks         = curRemarks;

      if (Object.keys(patchPayload).length > 0) {
        const headerRes = await fetch(`${API_BASE}/${RESOURCE}/${targetId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(patchPayload),
        });

        if (headerRes.status === 409) {
          const errData = await headerRes.json().catch(() => null);
          showAlertModal(errData?.message || "This purchase request is in a terminal state and cannot be edited.");
          return;
        }
        if (!headerRes.ok) {
          const errorData = await headerRes.json().catch(() => null);
          throw new Error(errorData?.message || `Header update failed: ${headerRes.status}`);
        }
      }

      // Process queued receives
      // Skip individual item calls when the header PATCH already set
      // prStatus="Received" — that forces ALL items to received on the backend.
      if (patchPayload.prStatus !== "Received") {
        for (const queuedId of pendingReceiveIds) {
          const recRes = await fetch(`${API_BASE}/purchase-request/item/${queuedId}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ itemStatus: "Received" }),
          });
          if (recRes.status === 409) {
            const errData = await recRes.json().catch(() => null);
            showAlertModal(errData?.message || "Item is already received or PR is in a terminal state.");
            return;
          }
          if (!recRes.ok) {
            const errData = await recRes.json().catch(() => null);
            showAlertModal(errData?.message || "Failed to mark item as received.");
            return;
          }
        }
      }
      pendingReceiveIds.clear();

      // Items added — POST /:id (send bare array)
      const addedItems = items.filter(i => !i.itemId);
      if (addedItems.length > 0) {
        const addRes = await fetch(`${API_BASE}/${RESOURCE}/${targetId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(addedItems),
        });
        if (addRes.status === 409) {
          const errData = await addRes.json().catch(() => null);
          showAlertModal(errData?.message || "Cannot add items — the PR is in a terminal state.");
          return;
        }
        if (!addRes.ok) {
          const errorData = await addRes.json().catch(() => null);
          showAlertModal(errorData?.message || "Failed to add items.");
          return;
        }
      }

      confirmModal.classList.add("hidden");
      closeModal();
      await loadRequests();
    } catch (error) {
      console.error("Error saving purchase request:", error);
      showAlertModal(error?.message || "Could not save the purchase request.");
    } finally {
      pendingSaveData = null;
      pendingReceiveIds.clear();
    }
  }

  // ── Pagination ─────────────────────────────────────────────
  function renderPagination(total) {
    const totalPages = Math.ceil(total / PAGE_SIZE);
    const start      = (currentPage - 1) * PAGE_SIZE + 1;
    const end        = Math.min(currentPage * PAGE_SIZE, total);

    const info = document.getElementById("paginationInfo");
    if (info) info.textContent = total === 0 ? "" : `Showing ${start}–${end} of ${total}`;

    const btns = document.getElementById("paginationBtns");
    if (!btns) return;
    btns.innerHTML = "";
    if (totalPages <= 1) return;

    getPaginationRange(currentPage, totalPages).forEach(p => {
      if (p === "…") {
        const el = document.createElement("span");
        el.style.cssText = "padding:0 4px;line-height:32px;color:#94a3b8;font-size:13px;";
        el.textContent = "…";
        btns.appendChild(el);
        return;
      }
      const btn = document.createElement("button");
      btn.className = `page-btn${p === currentPage ? " active" : ""}`;
      btn.textContent = p;
      btn.onclick = () => { currentPage = p; renderTable(); };
      btns.appendChild(btn);
    });
  }

  function getPaginationRange(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    if (current <= 4) return [1, 2, 3, 4, 5, "…", total];
    if (current >= total - 3) return [1, "…", total-4, total-3, total-2, total-1, total];
    return [1, "…", current-1, current, current+1, "…", total];
  }

  // ─────────────────────────────────────────────
  // Event listeners
  // ─────────────────────────────────────────────
  addButton?.addEventListener("click", () => openModal("add"));
  closeModalBtn?.addEventListener("click", closeModal);
  cancelBtn?.addEventListener("click", closeModal);
  form?.addEventListener("submit", saveRequest);

  addItemBtn?.addEventListener("click", () => {
    const previewRow = document.getElementById("addItemPreview");
    const desc   = previewRow?.querySelector("#previewDesc")?.value.trim();
    const qty    = Number(previewRow?.querySelector("#previewQty")?.value || 1);
    const price  = Number(previewRow?.querySelector("#previewPrice")?.value || 0);
    if (!desc) {
      previewRow?.querySelector("#previewDesc")?.focus();
      previewRow?.querySelector("#previewDesc")?.classList.add("input-error");
      return;
    }
    addItemRow({ itemDescription: desc, itemQuantity: qty, unitPrice: price, itemStatus: "In Process" });
    // Clear preview row
    if (previewRow) {
      previewRow.querySelector("#previewDesc").value = "";
      previewRow.querySelector("#previewDesc").classList.remove("input-error");
      previewRow.querySelector("#previewQty").value = 1;
      previewRow.querySelector("#previewPrice").value = 0;
      previewRow.querySelector("#previewDesc").focus();
    }
    lucide.createIcons();
    updateSaveButton();
    setTimeout(updateRemoveButtons, 0);
  });

  itemsContainer?.addEventListener("click", async (event) => {
    const inlineReceive = event.target.closest("button[data-action='inline-receive']");
    if (inlineReceive && !inlineReceive.disabled) {
      const row = inlineReceive.closest("[data-item-row]");
      if (!row) return;
      const itemId = row.dataset.itemId;
      if (!itemId) return;
      const descInput = row.querySelector("[name='itemDescription']");
      const itemDesc = descInput ? descInput.value.trim() : "this item";
      const confirmed = await showConfirmModal(`Mark "${itemDesc}" as received?`);
      if (!confirmed) return;

      if (activeIndex !== null) {
        // Edit mode — queue the receive; don't call the API yet
        pendingReceiveIds.add(itemId);
      } else {
        // Add mode — should never reach here (receive is disabled without itemId)
        return;
      }

      // Update the row UI
      const statusSpan = row.querySelector("[name='itemStatus']");
      if (statusSpan) {
        statusSpan.textContent = "Received";
        statusSpan.className = "status-display st-received";
      }
      inlineReceive.disabled = true;
      inlineReceive.style.opacity = "0.3";
      inlineReceive.style.cursor = "not-allowed";
      const voidBtn = row.querySelector("button[data-action='void-item-inline']");
      if (voidBtn) {
        voidBtn.disabled = true;
        voidBtn.style.opacity = "0.4";
        voidBtn.style.cursor = "not-allowed";
      }
      const allRows = itemsContainer.querySelectorAll("[data-item-row]");
      const allReceived = Array.from(allRows).every(r =>
        r.querySelector("[name='itemStatus']")?.textContent === "Received"
      );
      if (allReceived && fields.prStatus) {
        fields.prStatus.value = "Received";
        fields.prStatus.disabled = true;
        fields.prStatus.dispatchEvent(new Event("change"));
      }
      updateSaveButton();
      return;
    }

    const button = event.target.closest("button[data-action='void-item-inline']");
    if (!button || button.disabled) return;
    const row = button.closest("[data-item-row]");
    if (!row) return;
    if (row.dataset.itemId) {
      pendingRemoveItem = { row };
      document.getElementById("confirmRemoveMessage").textContent =
        `Void this item? This action cannot be undone.`;
      modal?.classList.add("hidden");
      document.getElementById("confirmRemoveModal").classList.remove("hidden");
      return;
    }
    row.remove();
    ensureAtLeastOneItemRow();
    updateSaveButton();
    setTimeout(updateRemoveButtons, 0);
  });

  function updateRemoveButtons() {
    const rows = itemsContainer.querySelectorAll("[data-item-row]");
    const isEdit = activeIndex !== null;
    rows.forEach((row) => {
      const btn = row.querySelector("button[data-action='void-item-inline']");
      if (!btn || btn.disabled) return;
      const disable = isEdit && rows.length <= 1;
      btn.disabled = disable;
      btn.style.opacity = disable ? "0.4" : "";
      btn.style.cursor = disable ? "not-allowed" : "";
    });
  }

  itemsContainer?.addEventListener("input", (event) => {
    updateRemoveButtons();
    const descInput = event.target.closest("[name='itemDescription']");
    if (!descInput) return;
    const row = descInput.closest("[data-item-row]");
    if (!row) return;
    const priceInput = row.querySelector("[name='unitPrice']");
    if (!priceInput) return;
    const price = getLatestUnitPrice(descInput.value);
    if (price !== null && price > 0) {
      priceInput.value = price;
    }
  });

  // Auto-fill unit cost on preview row
  const previewDesc = document.getElementById("previewDesc");
  previewDesc?.addEventListener("input", () => {
    const price = getLatestUnitPrice(previewDesc.value);
    if (price !== null && price > 0) {
      document.getElementById("previewPrice").value = price;
    }
  });

  fields.prStatus?.addEventListener("change", toggleOptionalFields);

  modal?.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
  });

  // Change detection for edit mode
  const changeFields = ["prNo", "prStatus", "dateRequested", "requestedBy", "dateReceived", "receivedBy", "remarks"];
  changeFields.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", updateSaveButton);
  });
  itemsContainer?.addEventListener("input", updateSaveButton);
  itemsContainer?.addEventListener("click", () => setTimeout(updateSaveButton, 0));

  // Auto-resize remarks textarea
  fields.remarks?.addEventListener("input", () => {
    fields.remarks.style.height = "auto";
    fields.remarks.style.height = fields.remarks.scrollHeight + "px";
  });

  // Date preset filter
  filterDatePreset?.addEventListener("change", () => {
    filterCustomDates?.classList.toggle("hidden", filterDatePreset.value !== "custom");
    currentPage = 1;
    renderTable();
  });

  filterDateFrom?.addEventListener("input", () => {
    if (filterDatePreset?.value !== "custom") {
      filterDatePreset.value = "custom";
      filterCustomDates?.classList.remove("hidden");
    }
    currentPage = 1;
    renderTable();
  });

  filterDateTo?.addEventListener("input", () => {
    if (filterDatePreset?.value !== "custom") {
      filterDatePreset.value = "custom";
      filterCustomDates?.classList.remove("hidden");
    }
    currentPage = 1;
    renderTable();
  });

  // Search input
  searchInput?.addEventListener("input", () => { currentPage = 1; renderTable(); });

  // Clear all filters (Audit Log style)
  btnClearFilters?.addEventListener("click", () => {
    if (searchInput)     searchInput.value = "";
    if (filterDatePreset) filterDatePreset.value = "";
    if (filterDateFrom)  filterDateFrom.value = "";
    if (filterDateTo)    filterDateTo.value = "";
    if (filterCustomDates) filterCustomDates.classList.add("hidden");

    // Clear per-column filters
    Object.values(columnFilters).forEach(s => s?.clear());
    document.querySelectorAll(".col-filter-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".col-filter-panel").forEach(p => p.classList.add("hidden"));

    currentPage = 1;
    renderTable();
  });

  // ── Confirm Receive Modal ──────────────────────────────────────────
  const confirmReceiveModal = document.getElementById("confirmReceiveModal");
  document.getElementById("closeConfirmReceiveModal")?.addEventListener("click", () => {
    confirmReceiveModal?.classList.add("hidden");
    pendingReceiveItem = null;
  });
  document.getElementById("cancelConfirmReceiveBtn")?.addEventListener("click", () => {
    confirmReceiveModal?.classList.add("hidden");
    pendingReceiveItem = null;
  });
  document.getElementById("confirmReceiveBtn")?.addEventListener("click", async () => {
    if (!pendingReceiveItem) return;
    const { request, item, idx, prId } = pendingReceiveItem;

    if (item.itemId) {
      try {
        const res = await fetch(`${API_BASE}/purchase-request/item/${item.itemId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ itemStatus: "Received" }),
        });
        if (res.status === 409) {
          const errData = await res.json().catch(() => null);
          showAlertModal(errData?.message || "This item is already received or the PR is in a terminal state.");
          confirmReceiveModal?.classList.add("hidden");
          pendingReceiveItem = null;
          renderTable();
          return;
        }
        if (!res.ok) {
          showAlertModal("Failed to confirm receive.");
          confirmReceiveModal?.classList.add("hidden");
          pendingReceiveItem = null;
          return;
        }
      } catch (err) {
        showAlertModal("Network error confirming receive.");
        confirmReceiveModal?.classList.add("hidden");
        pendingReceiveItem = null;
        return;
      }
    }

    confirmReceiveModal?.classList.add("hidden");
    pendingReceiveItem = null;
    await loadRequests();
  });

  // ── Confirm Remove Modal ──────────────────────────────────────────
  const confirmRemoveModal = document.getElementById("confirmRemoveModal");
  document.getElementById("closeConfirmRemoveModal")?.addEventListener("click", () => {
    confirmRemoveModal?.classList.add("hidden");
    if (pendingRemoveItem?.row) modal?.classList.remove("hidden");
    pendingRemoveItem = null;
  });
  document.getElementById("cancelConfirmRemoveBtn")?.addEventListener("click", () => {
    confirmRemoveModal?.classList.add("hidden");
    if (pendingRemoveItem?.row) modal?.classList.remove("hidden");
    pendingRemoveItem = null;
  });
  document.getElementById("confirmRemoveBtn")?.addEventListener("click", async () => {
    if (!pendingRemoveItem) return;
    const { item, sourceArr, idx, row, prId, request } = pendingRemoveItem;

    // If it's a row from the modal (unsaved item), just remove it
    if (row) {
      row.remove();
      ensureAtLeastOneItemRow();
      updateSaveButton();
      setTimeout(updateRemoveButtons, 0);
      confirmRemoveModal?.classList.add("hidden");
      modal?.classList.remove("hidden");
      pendingRemoveItem = null;
      return;
    }

    // If item has an ID, void it via PATCH
    if (item?.itemId) {
      try {
        const res = await fetch(`${API_BASE}/purchase-request/item/${item.itemId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ itemStatus: "Voided" }),
        });
        if (res.status === 409) {
          const d = await res.json().catch(() => null);
          showAlertModal(d?.message || "Cannot void item.");
          confirmRemoveModal?.classList.add("hidden");
          pendingRemoveItem = null;
          return;
        }
        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          showAlertModal(errData?.message || "Could not void item.");
          confirmRemoveModal?.classList.add("hidden");
          pendingRemoveItem = null;
          return;
        }
      } catch {
        showAlertModal("Network error voiding item.");
        confirmRemoveModal?.classList.add("hidden");
        pendingRemoveItem = null;
        return;
      }
    }

    confirmRemoveModal?.classList.add("hidden");
    pendingRemoveItem = null;
    await loadRequests();
  });

  // ── Confirm Save Modal ────────────────────────────────────────────
  const confirmSaveModal = document.getElementById("confirmSaveModal");
  document.getElementById("closeConfirmSaveModal")?.addEventListener("click", () => {
    confirmSaveModal?.classList.add("hidden");
    modal.classList.remove("hidden");
    pendingSaveData = null;
  });
  document.getElementById("cancelConfirmSaveBtn")?.addEventListener("click", () => {
    confirmSaveModal?.classList.add("hidden");
    modal.classList.remove("hidden");
    pendingSaveData = null;
  });
  document.getElementById("confirmSaveBtn")?.addEventListener("click", performSave);

  loadRequests();
});
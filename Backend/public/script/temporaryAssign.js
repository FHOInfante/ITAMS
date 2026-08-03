/* ============================================================
   temporaryAssign.js
   Logic for the Temporary Assignments list page
   ============================================================ */

(() => {

    // ── DOM Helpers ──────────────────────────────────────────
    const qs = (sel, ctx = document) => ctx.querySelector(sel);

    // ── Toast ────────────────────────────────────────────────
    function showToast(msg, type = "success") {
        const t = qs("#toast");
        t.textContent = msg;
        t.className = `show ${type}`;
        clearTimeout(t._timer);
        t._timer = setTimeout(() => { t.className = ""; }, 3500);
    }

    // ── Utilities ────────────────────────────────────────────
    function fmtDate(val) {
        if (!val) return "—";
        const d = new Date(val);
        if (isNaN(d)) return val;
        return d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
    }

    function initials(name) {
        if (!name) return "?";
        return name.trim().split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join("");
    }

    /**
     * Normalise a date string/Date to midnight local time (YYYY-MM-DD comparable).
     * Returns null if the value is empty or invalid.
     */
    function toLocalMidnight(val) {
        if (!val) return null;
        // Date inputs return "YYYY-MM-DD" strings — parse as local to avoid UTC shift
        const d = (typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val))
            ? new Date(`${val}T00:00:00`)
            : new Date(val);
        if (isNaN(d)) return null;
        d.setHours(0, 0, 0, 0);
        return d;
    }

    /**
     * Classify urgency based on days until return date.
     * Returns: "overdue" | "due-today" | "due-soon" | "upcoming" | ""
     */
    function getUrgency(toReturnBy) {
        if (!toReturnBy) return "";
        const today    = new Date(); today.setHours(0, 0, 0, 0);
        const returnDt = new Date(toReturnBy); returnDt.setHours(0, 0, 0, 0);
        const diffDays = Math.round((returnDt - today) / 86_400_000);

        if (diffDays < 0)  return "overdue";
        if (diffDays === 0) return "due-today";
        if (diffDays <= 3) return "due-soon";
        return "upcoming";
    }

    function urgencyLabel(urgency) {
        return {
            "overdue":   "Overdue",
            "due-today": "Due Today",
            "due-soon":  "Due Soon",
            "upcoming":  "Upcoming",
        }[urgency] || "";
    }

    function urgencyBadgeClass(urgency) {
        return {
            "overdue":   "badge-overdue",
            "due-today": "badge-today",
            "due-soon":  "badge-soon",
            "upcoming":  "badge-upcoming",
        }[urgency] || "badge-none";
    }

    function urgencyIcon(urgency) {
        return {
            "overdue":   "alert-circle",
            "due-today": "clock",
            "due-soon":  "timer",
            "upcoming":  "calendar-check",
        }[urgency] || "calendar";
    }

    // ── State ────────────────────────────────────────────────
    let allAssignments = [];   // raw sorted list from the server
    let pendingReturn  = null; // { computerId, computerName, userName } for the open modal

    // ── Load Assignments ─────────────────────────────────────
    window.loadAssignments = async function () {
        qs("#pageContent").innerHTML = `
            <div class="state-wrapper">
                <i data-lucide="loader-circle"></i>
                <p>Loading temporary assignments…</p>
            </div>`;
        lucide.createIcons();

        try {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };

            // Fetch computers and end-users in parallel (same as computer.js)
            const [computerRes, userRes] = await Promise.all([
                fetch("/api/computer", { headers }),
                fetch("/api/end-user", { headers })
            ]);
            if (!computerRes.ok) throw new Error(`HTTP ${computerRes.status}`);

            const rawUsers = await userRes.json();
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

            const all = await computerRes.json();

            // Keep only computers with a temporary assignment (has a return date and an assigned user)
            allAssignments = all
                .filter(c => c.to_return_by && c.assigned_user_id)
                // Attach department/location to each assignment before rendering (mirrors computer.js)
                .map(c => ({
                    ...c,
                    department_name: userMap[c.assigned_user_id]?.department_name ?? "-",
                    eu_location:     userMap[c.assigned_user_id]?.eu_location     ?? "-"
                }));

            // Sort by earliest return date (nulls last)
            allAssignments.sort((a, b) => {
                if (!a.to_return_by && !b.to_return_by) return 0;
                if (!a.to_return_by) return  1;
                if (!b.to_return_by) return -1;
                return new Date(a.to_return_by) - new Date(b.to_return_by);
            });

            renderSummaryChips(allAssignments);
            applyFilters();

        } catch (err) {
            console.error(err);
            qs("#pageContent").innerHTML = `
                <div class="state-wrapper">
                    <i data-lucide="alert-circle" style="color:#dc2626"></i>
                    <p>Failed to load assignments. Please try again.</p>
                </div>`;
            lucide.createIcons();
        }
    };

    // ── Summary Chips ─────────────────────────────────────────
    function renderSummaryChips(list) {
        const counts = { overdue: 0, "due-today": 0, "due-soon": 0, upcoming: 0 };
        for (const item of list) {
            const u = getUrgency(item.to_return_by);
            if (u in counts) counts[u]++;
        }

        qs("#summarychips").innerHTML = [
            counts.overdue   ? `<span class="summary-chip chip-overdue"><i data-lucide="alert-circle"></i>${counts.overdue} Overdue</span>`    : "",
            counts["due-today"] ? `<span class="summary-chip chip-today"><i data-lucide="clock"></i>${counts["due-today"]} Today</span>`        : "",
            counts["due-soon"]  ? `<span class="summary-chip chip-soon"><i data-lucide="timer"></i>${counts["due-soon"]} Soon</span>`           : "",
            counts.upcoming  ? `<span class="summary-chip chip-upcoming"><i data-lucide="calendar-check"></i>${counts.upcoming} Upcoming</span>` : "",
            `<span class="summary-chip chip-total"><i data-lucide="monitor"></i>${list.length} Total</span>`,
        ].join("");
        lucide.createIcons();
    }

    // ── Search Clear Button Visibility ────────────────────────
    function syncSearchClearBtn() {
        const val = qs("#searchInput")?.value || "";
        const btn = qs("#clearSearchBtn");
        if (!btn) return;
        btn.classList.toggle("visible", val.length > 0);
    }

    window.clearSearchInput = function () {
        qs("#searchInput").value = "";
        syncSearchClearBtn();
        applyFilters();
        qs("#searchInput").focus();
    };

    // ── Date Range Clear Button Visibility ────────────────────
    function syncClearBtn() {
        const from = qs("#dateFrom").value;
        const to   = qs("#dateTo").value;
        const btn  = qs("#clearRangeBtn");
        const group = btn.closest(".date-range-group");

        if (from || to) {
            btn.classList.add("visible");
            group.classList.add("active");
        } else {
            btn.classList.remove("visible");
            group.classList.remove("active");
        }
    }

    window.clearDateRange = function () {
        qs("#dateFrom").value = "";
        qs("#dateTo").value   = "";
        syncClearBtn();
        applyFilters();
    };

    // ── Filter / Search ───────────────────────────────────────
    window.applyFilters = function () {
        const query   = (qs("#searchInput")?.value || "").toLowerCase().trim();
        const urgency = qs("#urgencyFilter")?.value || "";
        const fromDt  = toLocalMidnight(qs("#dateFrom")?.value);
        const toDt    = toLocalMidnight(qs("#dateTo")?.value);

        // Keep the clear buttons in sync whenever filters run
        syncClearBtn();
        syncSearchClearBtn();

        let filtered = allAssignments.filter(item => {
            // Urgency filter
            if (urgency && getUrgency(item.to_return_by) !== urgency) return false;

            // Custom date range filter (against to_return_by)
            if (fromDt || toDt) {
                const returnDt = toLocalMidnight(item.to_return_by);
                if (!returnDt) return false;
                if (fromDt && returnDt < fromDt) return false;
                if (toDt   && returnDt > toDt)   return false;
            }

            // Text search
            if (query) {
                const haystack = [
                    item.assigned_user_name, item.assigned_user_emp_id,
                    item.department_name, item.eu_location,
                    item.computer_name, item.asset_tag, item.brand, item.model,
                ].map(v => (v ?? "").toString().toLowerCase()).join(" ");
                if (!haystack.includes(query)) return false;
            }

            return true;
        });

        renderList(filtered);
    };

    // ── Render List ───────────────────────────────────────────
    function renderList(items) {
        if (!items.length) {
            qs("#pageContent").innerHTML = `
                <div class="empty-state">
                    <i data-lucide="inbox"></i>
                    <p>No temporary assignments found.</p>
                    <p>Try adjusting your search or filter.</p>
                </div>`;
            lucide.createIcons();
            return;
        }

        qs("#pageContent").innerHTML = `
            <div class="assignment-list">
                ${items.map((item, idx) => buildCard(item, idx + 1)).join("")}
            </div>`;
        lucide.createIcons();
    }

    // ── Assignment Card ───────────────────────────────────────
    function buildCard(item, rank) {
        const urgency      = getUrgency(item.to_return_by);
        const badgeClass   = urgencyBadgeClass(urgency);
        const label        = urgencyLabel(urgency);
        const icon         = urgencyIcon(urgency);
        const cardClass    = urgency ? ` ${urgency}` : "";
        const initStr = initials(item.assigned_user_name);

        const urgencyBadge = label
            ? `<span class="urgency-badge ${badgeClass}">
                   <i data-lucide="${icon}"></i>${label}
               </span>`
            : `<span class="urgency-badge badge-none">No Return Date</span>`;

        return `
        <div class="assign-card${cardClass}" data-computer-id="${item.computer_id}">
            <div class="rank-badge">${rank}</div>

            <div class="user-avatar">${initStr}</div>

            <div class="assign-card-body">
                <span class="user-name">${item.assigned_user_name || "—"}</span>
                <span class="computer-name">
                    <i data-lucide="monitor" style="width:12px;height:12px;vertical-align:middle;margin-right:3px"></i>
                    ${item.computer_name || "—"}
                </span>

                <span class="assign-card-meta">
                    <i data-lucide="id-card"></i>
                    ${item.assigned_user_emp_id || "—"}
                </span>
                <span class="assign-card-meta">
                    <i data-lucide="tag"></i>
                    ${item.asset_tag || "—"}
                </span>

                <span class="assign-card-meta">
                    <i data-lucide="building-2"></i>
                    ${item.department_name || "—"}
                </span>
                <span class="assign-card-meta">
                    <i data-lucide="map-pin"></i>
                    ${item.eu_location || "—"}
                </span>

                <span class="assign-card-meta">
                    <i data-lucide="calendar"></i>
                    Assigned: ${fmtDate(item.assigned_date)}
                </span>
                <span class="assign-card-meta">
                    <i data-lucide="cpu"></i>
                    ${[item.brand, item.model].filter(Boolean).join(" · ") || "—"}
                </span>
            </div>

            <div class="return-block">
                ${urgencyBadge}
                <span class="return-date-label">Return by</span>
                <span class="return-date-value">${fmtDate(item.to_return_by)}</span>
            </div>

            <button
                class="btn-return"
                onclick="openReturnModal(${item.computer_id}, '${escAttr(item.computer_name)}', '${escAttr(item.assigned_user_name)}')"
                title="Confirm return"
            >
                <i data-lucide="check-circle-2"></i>
                Confirm Return
            </button>
        </div>`;
    }

    function escAttr(v) {
        return String(v ?? "").replace(/'/g, "\\'").replace(/"/g, "&quot;");
    }

    // ── Modal ─────────────────────────────────────────────────
    window.openReturnModal = function (computerId, computerName, userName) {
        pendingReturn = { computerId, computerName, userName };

        qs("#modalSubtitle").textContent = `${computerName}  ·  ${userName}`;
        qs("#confirmReturnBtn").disabled = false;
        qs("#confirmModal").style.display = "flex";
    };

    window.closeModal = function () {
        qs("#confirmModal").style.display = "none";
        pendingReturn = null;
    };

    // Close on backdrop click
    qs("#confirmModal").addEventListener("click", e => {
        if (e.target === qs("#confirmModal")) window.closeModal();
    });

    // ── Confirm Return ────────────────────────────────────────
    //   Uses the same PATCH /computer/{id}/assign endpoint as computerItem.js
    //   but sends { euEmpId: null } to remove the end user.
    window.confirmReturn = async function () {
        if (!pendingReturn) return;

        const btn = qs("#confirmReturnBtn");
        btn.disabled = true;
        btn.innerHTML = `<i data-lucide="loader-circle"></i> Processing…`;
        lucide.createIcons();

        const { computerId, computerName, userName } = pendingReturn;

        try {
            const token = localStorage.getItem("token");
            const res   = await fetch(`/api/computer/${computerId}/assign`, {
                method:  "PATCH",
                headers: {
                    "Content-Type":  "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({ euEmpId: null }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({ message: "Unknown error" }));
                throw new Error(err.message || `HTTP ${res.status}`);
            }

            window.closeModal();
            showToast(`${computerName} marked as returned.`, "success");

            // Remove from local list and re-render without a full reload
            allAssignments = allAssignments.filter(a => a.computer_id !== computerId);
            renderSummaryChips(allAssignments);
            applyFilters();

        } catch (err) {
            console.error(err);
            showToast(`Return failed: ${err.message}`, "error");
            btn.disabled = false;
            btn.innerHTML = `<i data-lucide="check"></i> Confirm Return`;
            lucide.createIcons();
        }
    };

    // ── Init ─────────────────────────────────────────────────
    document.addEventListener("DOMContentLoaded", () => {
        loadAssignments();
    });

})();
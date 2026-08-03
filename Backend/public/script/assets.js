document.addEventListener("DOMContentLoaded", async () => {

    lucide.createIcons();

    const token = localStorage.getItem("token");

    // Store full data per category for filtering
    const categoryData = {};

    // Currently-selected filter-dropdown value per category (e.g. device_type),
    // remembered so a click on the card/badges can carry it over as a URL param.
    const selectedFilter = {};

    // Build the destination URL for a card, optionally scoped to a status,
    // and carrying over whatever filter-dropdown value is currently selected.
    function buildTargetUrl(cfg, status) {
        const card = document.getElementById(cfg.countId)?.closest("a.category-card");
        const baseHref = card ? card.getAttribute("href") : "#";

        const params = new URLSearchParams();
        if (status) params.set("status", status);
        if (selectedFilter[cfg.countId]) params.set(cfg.filterKey, selectedFilter[cfg.countId]);

        const qs = params.toString();
        return qs ? `${baseHref}?${qs}` : baseHref;
    }

    const endpoints = [
        {
            countId:     "countComputer",
            statsId:     "statsComputer",
            filterId:    "filterComputer",
            url:         "/api/computer",
            statusKey:   "computer_status",
            filterKey:   "device_type",
            filterLabel: "Device Type"
        },
        {
            countId:     "countUps",
            statsId:     "statsUps",
            filterId:    "filterUps",
            url:         "/api/ups",
            statusKey:   "asset_status",
            filterKey:   "brand",
            filterLabel: "Brand"
        },
        {
            countId:     "countPrinter",
            statsId:     "statsPrinter",
            filterId:    "filterPrinter",
            url:         "/api/printer",
            statusKey:   "asset_status",
            filterKey:   "brand",
            filterLabel: "Brand"
        },
        {
            countId:     "countNetwork",
            statsId:     "statsNetwork",
            filterId:    "filterNetwork",
            url:         "/api/network-device",
            statusKey:   "asset_status",
            filterKey:   "device_type",
            filterLabel: "Device Type"
        },
    ];

    // ── Normalize raw status strings into one of four canonical buckets ──
    // Handles variations like "Under Repair", "under repair", "Repair", etc.
    function normalizeStatus(raw) {
        if (!raw) return null;
        const s = raw.trim().toLowerCase();
        if (s === "active")                          return "Active";
        if (s === "spare" || s === "available")      return "Spare";
        if (s === "repair" || s === "under repair")  return "Repair";
        if (s === "defective")                       return "Defective";
        // Log anything that falls through so you can extend the list above
        console.warn("[assets] Unrecognised status value:", JSON.stringify(raw));
        return null;
    }

    // ── Render the four hardware stat badges ─────────────────────────────
    // `cfg` is optional — when provided, badges become clickable and deep-link
    // straight into the filtered table view (status + any selected device type).
    function renderStats(statsEl, countEl, list, statusKey, cfg) {
        const tally = { Active: 0, Spare: 0, Repair: 0, Defective: 0 };

        list.forEach(item => {
            const canonical = normalizeStatus(item[statusKey]);
            if (canonical) tally[canonical]++;
        });

        countEl.textContent = list.length;

        const badges = [
            { label: "Active",        status: "Active" },
            { label: "Spare",         status: "Spare" },
            { label: "Under Repair",  status: "Repair" },
            { label: "Defective",     status: "Defective" },
        ];

        statsEl.innerHTML = badges.map(b => `
            <div class="stat-badge" data-status="${b.status}">
                <span class="stat-label">${b.label}</span>
                <span class="stat-num">${tally[b.status]}</span>
            </div>
        `).join("");

        if (cfg) {
            statsEl.querySelectorAll(".stat-badge").forEach(badge => {
                badge.addEventListener("click", e => {
                    e.preventDefault();
                    e.stopPropagation();
                    window.location.href = buildTargetUrl(cfg, badge.dataset.status);
                });
            });
        }
    }

    // ── Software (separate fetch logic) ──────────────────────────────────
    async function fetchAndRenderSoftware() {
        const countEl  = document.getElementById("countSoftware");
        const statsEl  = document.getElementById("statsSoftware");
        const filterEl = document.getElementById("filterSoftware");
        if (!countEl || !statsEl) return;

        try {
            const res = await fetch("/api/software", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const data = await res.json();
            const list = Array.isArray(data) ? data : [];

            // Unique software titles
            const uniqueNames = [...new Set(list.map(i => i.software_name).filter(Boolean))];
            countEl.textContent = uniqueNames.length;

            // Remembers whichever software title is currently selected in the
            // dropdown, so a badge/card click can carry it over as a URL param.
            let selectedSoftwareName = "";

            function buildSoftwareTargetUrl(statusBucket) {
                const card = countEl.closest("a.category-card");
                const baseHref = card ? card.getAttribute("href") : "#";

                const params = new URLSearchParams();
                if (statusBucket) params.set("status", statusBucket);
                if (selectedSoftwareName) params.set("software_name", selectedSoftwareName);

                const qs = params.toString();
                return qs ? `${baseHref}?${qs}` : baseHref;
            }

            // Tally directly off the software_status field so these badges
            // always match software.html's own Status column/filter 1:1
            // (previously this was computed from renewal/expiry dates, which
            // could drift out of sync with the actual status field).
            function calcSoftwareStats(rows) {
                const tally = { Active: 0, "For Renewal": 0, Expired: 0, Discontinued: 0 };
                rows.forEach(item => {
                    const status = item.software_status;
                    if (status && Object.prototype.hasOwnProperty.call(tally, status)) {
                        tally[status]++;
                    }
                });
                return tally;
            }

            function renderSoftwareStats(rows) {
                const tally = calcSoftwareStats(rows);
                const badges = [
                    { label: "Active Licenses", status: "Active" },
                    { label: "For Renewal",     status: "For Renewal" },
                    { label: "Expired",         status: "Expired" },
                    { label: "Discontinued",    status: "Discontinued" },
                ];

                statsEl.innerHTML = badges.map(b => `
                    <div class="stat-badge" data-status="${b.status}">
                        <span class="stat-label">${b.label}</span>
                        <span class="stat-num">${tally[b.status]}</span>
                    </div>
                `).join("");

                statsEl.querySelectorAll(".stat-badge").forEach(badge => {
                    badge.addEventListener("click", e => {
                        e.preventDefault();
                        e.stopPropagation();
                        window.location.href = buildSoftwareTargetUrl(badge.dataset.status);
                    });
                });
            }

            renderSoftwareStats(list);

            // Filter dropdown by software name
            if (filterEl && uniqueNames.length > 0) {
                filterEl.style.display = "flex";
                filterEl.innerHTML = `
                    <select class="filter-select" id="select-software">
                        <option value="">All Software</option>
                        ${uniqueNames.sort().map(n => `<option value="${n}">${n}</option>`).join("")}
                    </select>
                `;

                filterEl.querySelector("select").addEventListener("click", e => e.preventDefault());
                filterEl.querySelector("select").addEventListener("change", e => {
                    e.preventDefault();
                    const val = e.target.value;
                    selectedSoftwareName = val;
                    const filtered = val ? list.filter(i => i.software_name === val) : list;

                    const filteredNames = [...new Set(filtered.map(i => i.software_name).filter(Boolean))];
                    countEl.textContent = filteredNames.length;
                    renderSoftwareStats(filtered);
                });
            }

            // Clicking the card itself (outside a badge/dropdown) still opens
            // software.html, now carrying over any selected software title.
            const softwareCard = countEl.closest("a.category-card");
            if (softwareCard) {
                softwareCard.addEventListener("click", e => {
                    if (e.target.closest(".category-filter") || e.target.closest(".stat-badge")) return;
                    e.preventDefault();
                    window.location.href = buildSoftwareTargetUrl(null);
                });
            }

        } catch (err) {
            console.error("Failed to load software:", err);
            countEl.textContent = "—";
            statsEl.innerHTML = "";
        }
    }

    // ── Build filter dropdown for hardware categories ─────────────────────
    function buildDropdown(filterEl, list, filterKey, filterLabel, cfg) {
        const values = [...new Set(
            list.map(item => item[filterKey]).filter(Boolean)
        )].sort();

        if (values.length === 0) {
            filterEl.style.display = "none";
            return;
        }

        filterEl.style.display = "flex";
        filterEl.innerHTML = `
            <select class="filter-select" id="select-${cfg.countId}">
                <option value="">All ${filterLabel}s</option>
                ${values.map(v => `<option value="${v}">${v}</option>`).join("")}
            </select>
        `;

        // Stop the anchor link from firing when clicking the dropdown
        filterEl.querySelector("select").addEventListener("click", e => e.preventDefault());

        filterEl.querySelector("select").addEventListener("change", e => {
            e.preventDefault();
            const val = e.target.value;
            selectedFilter[cfg.countId] = val;

            const fullList = categoryData[cfg.countId];
            const filtered = val ? fullList.filter(item => item[filterKey] === val) : fullList;

            const statsEl = document.getElementById(cfg.statsId);
            const countEl = document.getElementById(cfg.countId);
            renderStats(statsEl, countEl, filtered, cfg.statusKey, cfg);
        });
    }

    // ── Fetch and render a hardware category ─────────────────────────────
    async function fetchAndRender(cfg) {
        const { countId, statsId, filterId, url, statusKey, filterKey, filterLabel } = cfg;
        const countEl  = document.getElementById(countId);
        const statsEl  = document.getElementById(statsId);
        const filterEl = document.getElementById(filterId);
        if (!countEl || !statsEl) return;

        try {
            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const data = await res.json();
            const list = Array.isArray(data) ? data : [];

            categoryData[countId] = list;
            selectedFilter[countId] = "";

            renderStats(statsEl, countEl, list, statusKey, cfg);

            if (filterEl) {
                buildDropdown(filterEl, list, filterKey, filterLabel, cfg);
            }

            // Clicking the card itself (outside a badge/dropdown) still opens
            // the target page, now carrying over any selected device-type filter.
            const card = countEl.closest("a.category-card");
            if (card) {
                card.addEventListener("click", e => {
                    if (e.target.closest(".category-filter") || e.target.closest(".stat-badge")) return;
                    e.preventDefault();
                    window.location.href = buildTargetUrl(cfg, null);
                });
            }

        } catch (err) {
            console.error(`Failed to load ${countId}:`, err);
            countEl.textContent = "—";
            statsEl.innerHTML = "";
        }
    }

    await Promise.all([
        ...endpoints.map(fetchAndRender),
        fetchAndRenderSoftware()
    ]);

});
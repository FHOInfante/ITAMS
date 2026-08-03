document.addEventListener("DOMContentLoaded", () => {

  const API_BASE         = "";
  const token            = localStorage.getItem("token");
  const LOCATION_OPTIONS = ["All Locations","B1","B2","B3","B4","B5","B6","B7","GF","2F","3F","4F","5F","6F","7F","PO"];

  // ── Column definitions for live endpoints ─────────────────────────────────
  // Each entry: { label: "Human Name", key: "db_column_name" }
  // Order here = order columns appear in the picker UI.
  const COMPUTER_COLUMNS = [
    { label: "Computer Name",       key: "computer_name"        },
    { label: "Asset Tag",           key: "asset_tag"            },
    { label: "Serial No.",          key: "serial_no"            },
    { label: "Brand",               key: "brand"                },
    { label: "Model",               key: "model"                },
    { label: "Device Type",         key: "device_type"          },
    { label: "Operating System",    key: "operating_system"     },
    { label: "Status",              key: "computer_status"      },
    { label: "Condition",           key: "asset_condition"      },
    { label: "Received Date",       key: "received_date"        },
    { label: "Warranty Expiry",     key: "warranty_expiry"      },
    { label: "Vendor",              key: "vendor"               },   
    { label: "Processor",           key: "processor"            },
    { label: "Ram Size",            key: "ram_size"             },
    { label: "Storage Type",        key: "storage_type"         },
    { label: "Storage Capacity",    key: "storage_capacity"     },
    { label: "IP Address",          key: "ip_address"           },
    { label: "MAC Address",         key: "mac_address"          },
    { label: "Network Connectivity",key: "network_connectivity" },
    { label: "VPN Access",          key: "has_vpn_access"       },
    { label: "Anydesk IP",          key: "anydesk_ip"           },
    { label: "Cost",                key: "cost"                 },
    { label: "Assigned User",       key: "assigned_user_name"   },
    { label: "Employee ID",         key: "assigned_user_emp_id" },
    { label: "Assigned Date",       key: "assigned_date"        },
    { label: "Return By",           key: "to_return_by"         },
    { label: "Peripherals",         key: "peripherals"          },
    { label: "Remarks",             key: "remarks"              },
  ];

  const SOFTWARE_COLUMNS = [
    { label: "Software Name",   key: "software_name"      },
    { label: "Vendor",          key: "vendor"             },
    // { label: "Version",         key: "version"            },
    { label: "License Type",    key: "license_type"       },
    { label: "Subscription ID", key: "subscription_id"    },
    { label: "Purchase Date",   key: "purchase_date"      },
    { label: "Renewal Date",    key: "renewal_date"       },
    { label: "Expiry Date",     key: "expiry_date"        },
    { label: "Cost",            key: "cost"               },
    { label: "Previous Cost",   key: "previous_cost"      },
    { label: "Status",          key: "software_status"    },
    { label: "Assigned User",   key: "assigned_user_name" },
    { label: "Employee ID",     key: "assigned_user_emp_id"    },
    { label: "Assigned Date",   key: "assigned_date"      },
    { label: "Remarks",         key: "remarks"            },
  ];

  const UPS_COLUMNS = [
    { label: "Asset Tag",               key: "asset_tag"                },
    { label: "Serial No.",              key: "serial_no"                },
    { label: "Brand",                   key: "brand"                    },
    { label: "Model",                   key: "model"                    },
    { label: "Vendor",                  key: "vendor"                   },
    { label: "Capacity (VA)",           key: "capacity_va"              },
    { label: "Battery Replacement Date",key: "battery_replaceme_date"   },
    { label: "Status",                  key: "asset_status"             },
    { label: "Condition",               key: "asset_condition"          },
    { label: "Received Date",           key: "received_date"            },
    { label: "Warranty Expiry",         key: "warranty_expiry"          },
    { label: "Date Deployed",           key: "date_deployed"            },
    { label: "Cost",                    key: "cost"                     },
    { label: "Assigned To",             key: "assigned_to"              },
    { label: "Department",              key: "department_name"          },
    { label: "Location",                key: "asset_location"           },
    { label: "Remarks",                 key: "remarks"                  },
  ];

  const PRINTER_COLUMNS = [
    { label: "Printer Name",    key: "printer_name"       },
    { label: "Department",      key: "department_name"    },
    { label: "Asset Tag",       key: "asset_tag"          },
    { label: "Location",        key: "asset_location"     },
    { label: "Serial No.",      key: "serial_no"          },
    { label: "Brand",           key: "brand"              },
    { label: "Model",           key: "model"              },
    { label: "Vendor",          key: "vendor"             },
    { label: "Printer Type",    key: "printer_type"       },
    { label: "Connectivity",    key: "connectivity"       },
    { label: "IP Address",      key: "ip_address"         },
    { label: "MAC Address",     key: "mac_address"        },
    { label: "Color",           key: "is_color"           },
    { label: "Status",          key: "asset_status"       },
    { label: "Condition",       key: "asset_condition"    },
    { label: "Received Date",   key: "received_date"      },
    { label: "Warranty Expiry", key: "warranty_expiry"    },
    { label: "Date Deployed",   key: "date_deployed"      },
    { label: "Cost",            key: "cost"               },
    { label: "Remarks",         key: "remarks"            },
  ];

  const NETWORK_DEVICE_COLUMNS = [
    { label: "Device Name",     key: "device_name"        },
    { label: "Asset Tag",       key: "asset_tag"          },
    { label: "Location",        key: "asset_location"     },
    { label: "Serial No.",      key: "serial_no"          },
    { label: "Brand",           key: "brand"              },
    { label: "Model",           key: "model"              },
    { label: "Device Type",     key: "device_type"        },
    { label: "Vendor",          key: "vendor"             },
    { label: "IP Address",      key: "ip_address"         },
    { label: "MAC Address",     key: "mac_address"        },
    { label: "Port Count",      key: "port_count"         },
    { label: "Firmware Version",key: "firmware_version"   },
    { label: "Status",          key: "asset_status"       },
    { label: "Condition",       key: "asset_condition"    },
    { label: "Received Date",   key: "received_date"      },
    { label: "Warranty Expiry", key: "warranty_expiry"    },
    { label: "Date Deployed",   key: "date_deployed"      },
    { label: "Cost",            key: "cost"               },
    { label: "Remarks",         key: "remarks"            },
  ];

  const END_USER_COLUMNS = [
    { label: "End User Name",    key: "eu_name"             },
    { label: "Employee ID",      key: "eu_emp_id"           },
    { label: "Division",         key: "eu_division"         },
    { label: "Department",       key: "department_name"     },
    { label: "Location",         key: "eu_location"         },
    { label: "Email",            key: "eu_email"            },
    { label: "Contact No.",      key: "eu_contact_no"       },
    { label: "Status",           key: "eu_status"           },
    { label: "Computer Count",   key: "computer_count"      },
    { label: "Assigned Computers",key: "assigned_computers"  },
    { label: "Software Count",   key: "software_count"      },
    { label: "Assigned Software",key: "assigned_software"   },
  ];

  // ── Report Definitions ────────────────────────────────────────────────────
  const REPORTS = {
    "end-users": {
      title: "End Users Report",
      subtitle: "End user asset assignments.",
      endpointName: "/api/report/end-user",
      endpoint: "/api/report/end-user",
      filename: "end_user_report.xlsx",
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>`,
      formats: ["Excel"],
      config: [
        { title: "Columns to include", type: "columns", columns: END_USER_COLUMNS },
        { title: "Departments to include", type: "departments" }
      ]
    },

    "computers": {
      title: "Computers Report",
      subtitle: "Hardware inventory with specs, condition, and assigned users.",
      endpointName: "/api/report/computer",
      endpoint: "/api/report/computer",
      filename: "computer_report.xlsx",
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2"/>
              <line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
            </svg>`,
      formats: ["Excel"],
      config: [
        { title: "Date Filter", type: "daterange", fromId: "comp_date_from", toId: "comp_date_to", filterLabel: "Filter by Received Date" },
        { title: "Columns to include", type: "columns", columns: COMPUTER_COLUMNS }
      ]
    },

    "software": {
      title: "Software Report",
      subtitle: "Software licenses, versions, and user assignments.",
      endpointName: "/api/report/software",
      endpoint: "/api/report/software",
      filename: "software_report.xlsx",
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
            </svg>`,
      formats: ["Excel"],
      config: [
        { title: "Date Filter", type: "daterange", fromId: "sw_date_from", toId: "sw_date_to", filterLabel: "Filter by Purchase Date" },
        { title: "Columns to include", type: "columns", columns: SOFTWARE_COLUMNS }
      ]
    },

    "printers": {
      title: "Printers Report",
      subtitle: "Printer inventory with network configuration and status.",
      endpointName: "/api/report/printer",
      endpoint: "/api/report/printer",
      filename: "printer_report.xlsx",
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 6 2 18 2 18 9"/>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>`,
      formats: ["Excel"],
      config: [
        { title: "Date Filter", type: "daterange", fromId: "pr_date_from", toId: "pr_date_to", filterLabel: "Filter by Received Date" },
        { title: "Columns to include", type: "columns", columns: PRINTER_COLUMNS }
      ]
    },

    "network-devices": {
      title: "Network Devices Report",
      subtitle: "Switches, routers, and access points with network configuration.",
      endpointName: "/api/report/network-device",
      endpoint: "/api/report/network-device",
      filename: "network_device_report.xlsx",
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="2" width="20" height="8" rx="2" ry="2"/>
              <rect x="2" y="14" width="20" height="8" rx="2" ry="2"/>
              <line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/>
            </svg>`,
      formats: ["Excel"],
      config: [
        { title: "Date Filter", type: "daterange", fromId: "nd_date_from", toId: "nd_date_to", filterLabel: "Filter by Received Date" },
        { title: "Columns to include", type: "columns", columns: NETWORK_DEVICE_COLUMNS }
      ]
    },

    "ups": {
      title: "UPS Units Report",
      subtitle: "Uninterruptible power supply inventory and assignment records.",
      endpointName: "/api/report/ups",
      endpoint: "/api/report/ups",
      filename: "ups_report.xlsx",
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>`,
      formats: ["Excel"],
      config: [
        { title: "Date Filter", type: "daterange", fromId: "ups_date_from", toId: "ups_date_to", filterLabel: "Filter by Received Date" },
        { title: "Columns to include", type: "columns", columns: UPS_COLUMNS }
      ]
    },

    "audit-trail": {
      title: "Audit Trail Report",
      subtitle: "Field-level audit trail — one row per changed field.",
      endpointName: "/api/report/audit",
      endpoint: "/api/report/audit",
      filename: "audit_report.xlsx",
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>`,
      formats: ["Excel"],
      config: [
        {
          title: "Audit Category",
          type: "radios",
          name: "auditCategory",
          radios: [
            { id: "at_computer",        label: "Computer" },
            { id: "at_software",        label: "Software" },
            { id: "at_printer",         label: "Printer" },
            { id: "at_network_device",  label: "Network Device" },
            { id: "at_ups",             label: "UPS" },
            { id: "at_purchase_request", label: "Purchase Request" },
            { id: "at_user",            label: "User" },
            { id: "at_end_user",        label: "End User" },
          ]
        },
        { title: "Date Filter", type: "daterange", fromId: "at_date_from", toId: "at_date_to", filterLabel: "Filter by interaction date." }
      ]
    },
  };

  const DEFAULT_REPORT_KEY = "end-users";

  // ── State ─────────────────────────────────────────────────────────────────
  let activeReport   = null;
  let selectedFormat = "Excel";

  // Per-report ordered column selections: { [reportKey]: { label, key }[] }
  const columnSelections = {};

  // ── Elements ──────────────────────────────────────────────────────────────
  const detailEmpty        = document.getElementById("detailEmpty");
  const detailLoaded       = document.getElementById("detailLoaded");
  const detailTitle        = document.getElementById("detailTitle");
  const detailSubtitle     = document.getElementById("detailSubtitle");
  const detailIcon         = document.getElementById("detailIcon");
  const detailConfig       = document.getElementById("detailConfig");
  const detailFormat       = document.getElementById("detailFormat");
  const detailEndpointName = document.getElementById("detailEndpointName");
  const btnDownload        = document.getElementById("btnDownload");
  const comingSoonBadge    = document.querySelector(".coming-soon-badge");
  const previewInfoBox     = document.querySelector(".preview-info");

  // ── Select a report ───────────────────────────────────────────────────────
  function selectReport(key) {
    activeReport = key;
    const report = REPORTS[key];
    const isLive = !!report.endpoint;

    document.querySelectorAll(".report-btn").forEach(b =>
      b.classList.toggle("active", b.dataset.report === key)
    );

    detailIcon.innerHTML           = report.icon;
    detailTitle.textContent        = report.title;
    detailSubtitle.textContent     = report.subtitle;
    detailEndpointName.textContent = report.endpointName;

    selectedFormat = report.formats[0];
    detailFormat.textContent = selectedFormat;

    comingSoonBadge.style.display = isLive ? "none" : "";
    previewInfoBox.style.display  = isLive ? "none" : "";

    detailConfig.innerHTML = "";

    if (!columnSelections[key]) {
      columnSelections[key] = [];
      // Pre-select all columns on first visit
      const colSection = report.config.find(s => s.type === "columns");
      if (colSection) {
        colSection.columns.forEach(c => columnSelections[key].push(c));
      }
    }

    // Dynamic config sections
    report.config.forEach(section => {
      const sec = document.createElement("div");
      sec.className = "config-section";

      if (section.type === "checkboxes") {
        const titleDiv = document.createElement("div");
        titleDiv.className = "config-section-title";
        titleDiv.textContent = section.title;
        sec.appendChild(titleDiv);
        const grid = document.createElement("div");
        grid.className = "column-toggles";
        section.checkboxes.forEach(cb => {
          const lbl = document.createElement("label");
          lbl.className = "col-toggle checked";
          const inp = document.createElement("input");
          inp.type = "checkbox";
          inp.id = cb.id;
          inp.checked = true;
          inp.addEventListener("change", () => lbl.classList.toggle("checked", inp.checked));
          const text = document.createElement("span");
          text.className = "col-toggle-text";
          text.textContent = cb.label;
          lbl.appendChild(inp);
          lbl.appendChild(text);
          grid.appendChild(lbl);
        });
        sec.appendChild(grid);

      } else if (section.type === "radios") {
        const titleDiv = document.createElement("div");
        titleDiv.className = "config-section-title";
        titleDiv.textContent = section.title;
        sec.appendChild(titleDiv);
        const grid = document.createElement("div");
        grid.className = "column-toggles";
        section.radios.forEach((r, i) => {
          const lbl = document.createElement("label");
          lbl.className = "col-toggle" + (i === 0 ? " checked" : "");
          const inp = document.createElement("input");
          inp.type = "radio";
          inp.name = section.name;
          inp.id = r.id;
          inp.checked = i === 0;
          inp.addEventListener("change", () => {
            section.radios.forEach(rr => {
              const el = document.getElementById(rr.id);
              if (el) el.closest(".col-toggle")?.classList.toggle("checked", el.checked);
            });
          });
          const text = document.createElement("span");
          text.className = "col-toggle-text";
          text.textContent = r.label;
          lbl.appendChild(inp);
          lbl.appendChild(text);
          grid.appendChild(lbl);
        });
        sec.appendChild(grid);

      } else if (section.type === "departments") {
        const headerRow = document.createElement("div");
        headerRow.className = "config-section-title-row";
        headerRow.innerHTML = `
          <span class="config-section-title" style="margin:0;border:none;padding:0;">${section.title}</span>
          <div style="display:flex;gap:8px">
            <button class="col-select-all-btn" type="button">Select All</button>
            <button class="col-clear-btn" type="button">Clear selection</button>
          </div>
        `;
        sec.appendChild(headerRow);
        const grid = document.createElement("div");
        grid.className = "column-toggles";
        grid.id = "departmentCheckboxes";
        sec.appendChild(grid);
        loadDepartmentsForReport(grid, headerRow);

      } else if (section.type === "columns") {
        sec.appendChild(buildColumnPicker(key, section.columns, section.title));

      } else if (section.type === "daterange") {
        sec.innerHTML = `
          <div class="config-section-title">${section.title}</div>
          ${section.filterLabel ? `<p class="col-picker-hint" style="margin-bottom:10px;">${section.filterLabel} — both fields are optional.</p>` : ""}
          <div class="config-grid">
            <div class="config-group">
              <label>From</label>
              <input type="date" id="${section.fromId}" />
            </div>
            <div class="config-group">
              <label>To</label>
              <input type="date" id="${section.toId}" />
            </div>
          </div>`;

      } else {
        const fieldsHtml = section.fields.map(f => {
          if (f.type === "select") {
            return `<div class="config-group">
              <label>${f.label}</label>
              <select id="${f.id}">
                ${f.options.map(o => `<option>${o}</option>`).join("")}
              </select>
            </div>`;
          }
          if (f.type === "date") {
            return `<div class="config-group">
              <label>${f.label}</label>
              <input type="date" id="${f.id}" />
            </div>`;
          }
          return `<div class="config-group">
            <label>${f.label}</label>
            <input type="text" id="${f.id}" placeholder="${f.placeholder || ""}" />
          </div>`;
        }).join("");
        sec.innerHTML = `<div class="config-section-title">${section.title}</div>
          <div class="config-grid">${fieldsHtml}</div>`;
      }

      detailConfig.appendChild(sec);
    });

    detailEmpty.style.display = "none";
    detailLoaded.classList.add("visible");

    // Restore button state after rebuilding
    updateDownloadButton(key);
  }

   // ── Ordered column picker ─────────────────────────────────────────────────
   // columns: { label, key }[]
   function buildColumnPicker(reportKey, columns, title) {
     const wrap = document.createElement("div");

     const headerRow = document.createElement("div");
     headerRow.className = "config-section-title-row";
     headerRow.innerHTML = `
       <span class="config-section-title" style="margin:0;border:none;padding:0;">${title}</span>
      <div style="display:flex;gap:8px">
        <button class="col-select-all-btn" type="button">Select All</button>
        <button class="col-clear-btn" type="button">Clear selection</button>
      </div>
    `;
    wrap.appendChild(headerRow);

    const hint = document.createElement("p");
    hint.className = "col-picker-hint";
    hint.textContent = "Check items in the order you want them to appear. Numbers show export order.";
    wrap.appendChild(hint);

    const grid = document.createElement("div");
    grid.className = "column-toggles";
    wrap.appendChild(grid);

    function rebuildToggles() {
      // Always read live — never cache; clear() replaces the array reference
      const selected = columnSelections[reportKey];
      grid.innerHTML = "";

      columns.forEach(col => {
        const idx       = selected.findIndex(c => c.key === col.key);
        const isChecked = idx !== -1;
        const order     = isChecked ? idx + 1 : null;

        const lbl = document.createElement("label");
        lbl.className = `col-toggle${isChecked ? " checked" : ""}`;
        lbl.title = col.key; // DB key visible on hover for reference

        // Build DOM nodes — avoid innerHTML so the checkbox change fires cleanly
        const cb = document.createElement("input");
        cb.type    = "checkbox";
        cb.value   = col.key;
        cb.checked = isChecked;

        const badge = document.createElement("span");
        badge.className = isChecked ? "col-order-badge" : "col-order-badge empty";
        if (isChecked) badge.textContent = String(order);

        const text = document.createElement("span");
        text.className   = "col-toggle-text";
        text.textContent = col.label;

        lbl.appendChild(cb);
        lbl.appendChild(badge);
        lbl.appendChild(text);

        cb.addEventListener("change", () => {
          // Re-read the live array every time — safe even after clear()
          const live = columnSelections[reportKey];
          if (cb.checked) {
            if (!live.find(c => c.key === col.key)) live.push(col);
          } else {
            const i = live.findIndex(c => c.key === col.key);
            if (i !== -1) live.splice(i, 1);
          }
          rebuildToggles();
          updateDownloadButton(reportKey);
        });

        grid.appendChild(lbl);
      });
    }

    headerRow.querySelector(".col-clear-btn").addEventListener("click", () => {
      // Splice in-place so any live reference inside an already-open rebuildToggles
      // call also sees the cleared state, then rebuild fresh.
      columnSelections[reportKey].splice(0);
      rebuildToggles();
      updateDownloadButton(reportKey);
    });

    headerRow.querySelector(".col-select-all-btn").addEventListener("click", () => {
      columnSelections[reportKey].splice(0);
      columns.forEach(col => columnSelections[reportKey].push(col));
      rebuildToggles();
      updateDownloadButton(reportKey);
    });

    rebuildToggles();
    return wrap;
  }

  function updateDownloadButton(reportKey) {
    const report  = REPORTS[reportKey];
    const isLive  = !!report.endpoint;
    const isAudit = reportKey === "audit-trail";
    const hasCols = isAudit || (columnSelections[reportKey] || []).length > 0;
    btnDownload.disabled = !isLive || !hasCols;
  }

  // ── Department picker ─────────────────────────────────────────────────
  let cachedDepartments = null;
  async function loadDepartmentsForReport(grid, headerRow) {
    grid.innerHTML = '<p class="col-picker-hint" style="margin-bottom:0;">Loading departments…</p>';
    try {
      if (!cachedDepartments) {
        const res = await fetch(`/api/department`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        const raw = Array.isArray(data)              ? data :
                    Array.isArray(data?.departments) ? data.departments :
                    Array.isArray(data?.data)        ? data.data : [];
        cachedDepartments = raw
          .map(d => ({ id: d.department_id ?? d.id, name: d.department_name ?? d.name }))
          .filter(d => d.name);
      }
      grid.innerHTML = "";
      cachedDepartments.forEach(dept => {
        const lbl = document.createElement("label");
        lbl.className = "col-toggle checked";
        const inp = document.createElement("input");
        inp.type = "checkbox";
        inp.value = dept.name;
        inp.checked = true;
        inp.dataset.deptId = dept.id;
        inp.addEventListener("change", () => lbl.classList.toggle("checked", inp.checked));
        const text = document.createElement("span");
        text.className = "col-toggle-text";
        text.textContent = dept.name;
        lbl.appendChild(inp);
        lbl.appendChild(text);
        grid.appendChild(lbl);
      });

      // Wire up Select All / Clear
      const selAll = headerRow.querySelector(".col-select-all-btn");
      const clr    = headerRow.querySelector(".col-clear-btn");
      if (selAll) {
        selAll.addEventListener("click", () => {
          grid.querySelectorAll("input[type=checkbox]").forEach(cb => {
            cb.checked = true;
            cb.closest(".col-toggle")?.classList.add("checked");
          });
        });
      }
      if (clr) {
        clr.addEventListener("click", () => {
          grid.querySelectorAll("input[type=checkbox]").forEach(cb => {
            cb.checked = false;
            cb.closest(".col-toggle")?.classList.remove("checked");
          });
        });
      }
    } catch (err) {
      console.error("Failed to load departments:", err);
      grid.innerHTML = '<p class="col-picker-hint" style="margin-bottom:0;color:#ef4444;">Failed to load departments.</p>';
    }
  }

  function getSelectedDepartments() {
    if (!cachedDepartments) return [];
    const checked = [];
    document.querySelectorAll("#departmentCheckboxes input[type=checkbox]").forEach(cb => {
      if (cb.checked) checked.push(cb.value);
    });
    return checked;
  }

  // ── Download Confirm Modal ────────────────────────────────────────────
  const confirmModal        = document.getElementById("downloadConfirmModal");
  const confirmMessage      = document.getElementById("downloadConfirmMessage");
  const btnConfirmDownload  = document.getElementById("btnConfirmDownload");
  const btnCancelDownload   = document.getElementById("btnCancelDownload");
  const btnCloseConfirm     = document.getElementById("btnCloseDownloadConfirm");
  let pendingDownload = null;

  function showDownloadConfirm(report, url) {
    if (!confirmModal) return;
    const format = selectedFormat || "Excel";
    let msg;
    if (activeReport === "end-users") {
      const colCount = (columnSelections["end-users"] || []).length;
      const deptCount = getSelectedDepartments().length;
      msg = `Download "${report.title}" as ${format} with ${colCount} column${colCount !== 1 ? "s" : ""} for ${deptCount} department${deptCount !== 1 ? "s" : ""}?`;
    } else if (activeReport === "audit-trail") {
      const CAT_LABELS = { at_computer:"Computer", at_software:"Software", at_printer:"Printer", at_network_device:"Network Device", at_ups:"UPS", at_purchase_request:"Purchase Request", at_user:"User", at_end_user:"End User" };
      const checked = document.querySelector("input[name=auditCategory]:checked");
      const catLabel = checked ? (CAT_LABELS[checked.id] || checked.value) : "none";
      msg = `Download "${report.title}" as ${format} (${catLabel})?`;
    } else {
      const colCount = (columnSelections[activeReport] || []).length;
      msg = `Download "${report.title}" as ${format} with ${colCount} column${colCount !== 1 ? "s" : ""}?`;
    }
    confirmMessage.textContent = msg;
    confirmModal.classList.remove("hidden");
    pendingDownload = { report, url };
  }

  function hideDownloadConfirm() {
    if (confirmModal) confirmModal.classList.add("hidden");
    pendingDownload = null;
  }

  if (btnCloseConfirm)   btnCloseConfirm.addEventListener("click", hideDownloadConfirm);
  if (btnCancelDownload) btnCancelDownload.addEventListener("click", hideDownloadConfirm);
  if (confirmModal) {
    confirmModal.addEventListener("click", e => {
      if (e.target === confirmModal) hideDownloadConfirm();
    });
  }

  // ── Download ──────────────────────────────────────────────────────────────
  btnDownload.addEventListener("click", async () => {
    if (!activeReport) return;
    const report = REPORTS[activeReport];
    if (!report.endpoint) return;

    // Build query params
    const params = new URLSearchParams();

    if (activeReport === "end-users") {
      const selectedCols = columnSelections["end-users"] || [];
      const hasComputer = selectedCols.some(c => c.key === "computer_count" || c.key === "assigned_computers");
      const hasSoftware = selectedCols.some(c => c.key === "software_count" || c.key === "assigned_software");
      const assetParts = [];
      if (hasComputer) assetParts.push("Computer");
      if (hasSoftware) assetParts.push("Software");
      if (assetParts.length) params.set("asset", assetParts.join(","));

      const deptValues = getSelectedDepartments();
      if (deptValues.length) params.set("department", deptValues.join(","));
    } else if (activeReport === "audit-trail") {
      const CAT_LABELS = { at_computer:"Computer", at_software:"Software", at_printer:"Printer", at_network_device:"Network Device", at_ups:"UPS", at_purchase_request:"Purchase Request", at_user:"User", at_end_user:"End User" };
      const checked = document.querySelector("input[name=auditCategory]:checked");
      if (!checked) {
        showToast("Please select an audit category before downloading.");
        return;
      }
      params.set("type", CAT_LABELS[checked.id] || checked.value);

      report.config.forEach(section => {
        if (section.type === "daterange") {
          const fromEl = document.getElementById(section.fromId);
          const toEl   = document.getElementById(section.toId);
          if (fromEl?.value) params.set("date_from", fromEl.value);
          if (toEl?.value)   params.set("date_to",   toEl.value);
        }
      });
    } else {
      const selected = columnSelections[activeReport] || [];
      if (selected.length === 0) {
        showToast("Please select at least one column before downloading.");
        return;
      }

      // columns — ordered DB keys joined by comma
      params.set("columns", selected.map(c => c.key).join(","));

      // date range — from daterange sections
      report.config.forEach(section => {
        if (section.type === "daterange") {
          const fromEl = document.getElementById(section.fromId);
          const toEl   = document.getElementById(section.toId);
          if (fromEl?.value) params.set("date_from", fromEl.value);
          if (toEl?.value)   params.set("date_to",   toEl.value);
        }
      });
    }

    const url = `${API_BASE}${report.endpoint}?${params.toString()}`;

    // Show confirmation before downloading
    showDownloadConfirm(report, url);
  });

  if (btnConfirmDownload) {
    btnConfirmDownload.addEventListener("click", async () => {
      if (!pendingDownload) return;
      const { report, url } = pendingDownload;
      hideDownloadConfirm();

      // Loading state
      btnDownload.disabled = true;
      btnDownload.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
        style="animation:spin .7s linear infinite;flex-shrink:0">
        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
      </svg>
      Downloading…`;

    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        // Try to read an error message if JSON was returned
        const ct = res.headers.get("content-type") || "";
        if (ct.includes("application/json")) {
          const err = await res.json();
          throw new Error(err.message || err.error || `HTTP ${res.status}`);
        }
        throw new Error(`HTTP ${res.status}`);
      }

      const blob    = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a       = document.createElement("a");
      a.href        = blobUrl;
      a.download    = report.filename || "report.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);

      showToast("Report downloaded successfully.");
    } catch (err) {
      console.error("Download failed:", err);
      showToast(`Download failed: ${err.message}`);
    } finally {
      btnDownload.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Download`;
      updateDownloadButton(activeReport);
    }
    });
  }

  document.querySelectorAll(".report-btn").forEach(btn => {
    btn.addEventListener("click", () => selectReport(btn.dataset.report));
  });

  // ── Toast ─────────────────────────────────────────────────────────────────
  let toastTimer = null;
  function showToast(msg) {
    const toast = document.getElementById("toast");
    document.getElementById("toastMsg").textContent = msg;
    toast.classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.add("hidden"), 3800);
  }

  lucide.createIcons();

  // Land on the default report type as soon as the page loads, instead of
  // showing the empty "No report selected" state.
  if (REPORTS[DEFAULT_REPORT_KEY]) {
    selectReport(DEFAULT_REPORT_KEY);
  }
});
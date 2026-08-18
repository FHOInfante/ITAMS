document.addEventListener("DOMContentLoaded", async () => {
  lucide.createIcons();

  const token = localStorage.getItem("token");

  const tableBody               = document.getElementById("userTableBody");
  const permissionsPanel        = document.getElementById("permissionsPanel");
  const permissionsModal        = document.getElementById("permissionsModal");
  const permissionsModalTitle   = document.getElementById("permissionsModalTitle");
  const permissionsModalSubtitle= document.getElementById("permissionsModalSubtitle");
  const permissionsModalBody    = document.getElementById("permissionsModalBody");
  const closePermissionsModalBtn = document.getElementById("closePermissionsModal");
  const cancelPermissionsBtn    = document.getElementById("cancelPermissionsBtn");
  const grantPermissionsBtn     = document.getElementById("grantPermissionsBtn");

  const editUserModal           = document.getElementById("editUserModal");
  const editUserModalTitle      = document.getElementById("editUserModalTitle");
  const editUserModalMeta       = document.getElementById("editUserModalMeta");
  const editUserForm            = document.getElementById("editUserForm");
  const editUserFullName        = document.getElementById("editUserFullName");
  const editUserUsername        = document.getElementById("editUserUsername");
  const editUserEmpId           = document.getElementById("editUserEmpId");
  const editUserEmail           = document.getElementById("editUserEmail");
  const editUserRole            = document.getElementById("editUserRole");
  const editUserResetPwdBtn     = document.getElementById("editUserResetPwdBtn");
  const editUserStatusBadge     = document.getElementById("editUserStatusBadge");
  const closeEditUserModalBtn   = document.getElementById("closeEditUserModal");
  const cancelEditUserBtn       = document.getElementById("cancelEditUserBtn");
  const saveEditUserBtn         = document.getElementById("saveEditUserBtn");
  const editUserFormError       = document.getElementById("editUserFormError");

  const createAccountBtn        = document.getElementById("createAccountBtn");
  const userModal               = document.getElementById("userModal");
  const modalTitle              = document.getElementById("modalTitle");
  const userForm                = document.getElementById("userForm");
  const defaultPassword         = "Tmcsl@12345";

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
      const modal = document.getElementById("confirmModal");
      const bodyEl = document.getElementById("confirmModalBody");
      const titleEl = document.getElementById("confirmModalTitle");
      const subtitleEl = document.getElementById("confirmModalSubtitle");
      const okBtn = document.getElementById("okConfirmBtn");
      const cancelBtn = document.getElementById("cancelConfirmBtn");
      const closeBtn = document.getElementById("closeConfirmModal");
      if (!modal || !bodyEl || !okBtn || !cancelBtn) { resolve(true); return; }

      if (titleEl) titleEl.textContent = "Confirm";
      if (subtitleEl) subtitleEl.textContent = "";
      bodyEl.innerHTML = `<p>${escHtml(message)}</p>`;
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
      okBtn.addEventListener("click", onOk);
      cancelBtn.addEventListener("click", onCancel);
      closeBtn.addEventListener("click", onCancel);
      modal.addEventListener("click", (e) => { if (e.target === modal) cleanup(false); }, { once: true });
    });
  }

  function showSnapshotConfirmModal({ title, subtitle, bodyHtml, confirmLabel }) {
    return new Promise((resolve) => {
      const modal = document.getElementById("confirmModal");
      const bodyEl = document.getElementById("confirmModalBody");
      const titleEl = document.getElementById("confirmModalTitle");
      const subtitleEl = document.getElementById("confirmModalSubtitle");
      const okBtn = document.getElementById("okConfirmBtn");
      const cancelBtn = document.getElementById("cancelConfirmBtn");
      const closeBtn = document.getElementById("closeConfirmModal");
      if (!modal || !bodyEl || !okBtn || !cancelBtn) { resolve(true); return; }

      if (titleEl) titleEl.textContent = title || "Confirm";
      if (subtitleEl) subtitleEl.textContent = subtitle || "";
      bodyEl.innerHTML = bodyHtml;
      okBtn.textContent = confirmLabel || "Confirm";
      modal.classList.remove("hidden");

      const cleanup = (result) => {
        modal.classList.add("hidden");
        okBtn.textContent = "Confirm";
        okBtn.removeEventListener("click", onOk);
        cancelBtn.removeEventListener("click", onCancel);
        closeBtn.removeEventListener("click", onCancel);
        resolve(result);
      };
      const onOk = () => cleanup(true);
      const onCancel = () => cleanup(false);
      okBtn.addEventListener("click", onOk);
      cancelBtn.addEventListener("click", onCancel);
      closeBtn.addEventListener("click", onCancel);
      modal.addEventListener("click", (e) => { if (e.target === modal) cleanup(false); }, { once: true });
    });
  }

  function escHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  const resetPasswordModal       = document.getElementById("resetPasswordModal");
  const resetPasswordModalTitle  = document.getElementById("resetPasswordModalTitle");
  const resetPasswordValue       = document.getElementById("resetPasswordValue");
  const closeResetPasswordModalBtn = document.getElementById("closeResetPasswordModal");
  const cancelResetPasswordBtn   = document.getElementById("cancelResetPasswordBtn");
  const confirmResetPasswordBtn  = document.getElementById("confirmResetPasswordBtn");

  const toggleStatusModal        = document.getElementById("toggleStatusModal");
  const toggleStatusModalTitle   = document.getElementById("toggleStatusModalTitle");
  const toggleStatusModalMessage = document.getElementById("toggleStatusModalMessage");
  const closeToggleStatusModalBtn = document.getElementById("closeToggleStatusModal");
  const cancelToggleStatusBtn    = document.getElementById("cancelToggleStatusBtn");
  const confirmToggleStatusBtn   = document.getElementById("confirmToggleStatusBtn");

  let pendingToggleUser   = null;
  let pendingToggleStatus = null;
  let pendingResetUser    = null;

  const API_BASE = "/api";

  // Roles available to assign to a system user (kept in the same order as the
  // original Add User form).
  const ROLE_OPTIONS = [
    "IT Helpdesk",
    "System Specialist",
    "Network Admin",
    "IT Supervisor",
    "IT Manager",
  ];

  // ─── Permission Catalog (42 permissions) ──────────────────────────────────

  let permissionCatalog = [
    { id: 1,  title: "View Audit Trails - Computer", description: "View the history of changes made to computer asset records." },
    { id: 2,  title: "View Audit Trails - Software", description: "View the history of changes made to software asset records." },
    { id: 3,  title: "View Audit Trails - Printer", description: "View the history of changes made to printer asset records." },
    { id: 4,  title: "View Audit Trails - UPS", description: "View the history of changes made to UPS asset records." },
    { id: 5,  title: "View Audit Trails - Network Device", description: "View the history of changes made to network device records." },
    { id: 6,  title: "View Audit Trails - System", description: "View system-wide activity and audit logs." },
    { id: 7,  title: "View Purchase Requests", description: "View submitted purchase requests and their current status." },
    { id: 8,  title: "View System Users", description: "View the list of system user accounts." },
    { id: 9,  title: "Add Asset - Computer", description: "Register a new computer asset in the system." },
    { id: 10, title: "Add Asset - Software", description: "Register a new software asset or license in the system." },
    { id: 11, title: "Add Asset - Printer", description: "Register a new printer asset in the system." },
    { id: 12, title: "Add Asset - UPS", description: "Register a new UPS asset in the system." },
    { id: 13, title: "Add Asset - Network Device", description: "Register a new network device asset in the system." },
    { id: 14, title: "Create Purchase Requests", description: "Submit a new purchase request." },
    { id: 15, title: "Add New Department", description: "Create a new department record." },
    { id: 16, title: "Add New Peripheral", description: "Create a new peripheral record." },
    { id: 17, title: "Add New Program", description: "Create a new software program record." },
    { id: 18, title: "Add New Dropdown Option", description: "Add a new option to a system dropdown list." },
    { id: 19, title: "Add New Vendor", description: "Create a new vendor record." },
    { id: 20, title: "Add New End Users", description: "Create a new end-user (non-system) record." },
    { id: 21, title: "Add New System User", description: "Create a new system user account." },
    { id: 22, title: "Assign Asset - Computer", description: "Assign a computer asset to an end user or department." },
    { id: 23, title: "Assign Asset - Software", description: "Assign a software asset or license to an end user or department." },
    { id: 24, title: "Edit Asset - Computer", description: "Modify the details of an existing computer asset." },
    { id: 25, title: "Edit Asset - Software", description: "Modify the details of an existing software asset." },
    { id: 26, title: "Edit Asset - Printer", description: "Modify the details of an existing printer asset." },
    { id: 27, title: "Edit Asset - UPS", description: "Modify the details of an existing UPS asset." },
    { id: 28, title: "Edit Asset - Network Device", description: "Modify the details of an existing network device asset." },
    { id: 29, title: "Edit Asset - Computer (Network Fields)", description: "Modify network-specific fields, such as IP and hostname, on a computer asset." },
    { id: 30, title: "Edit Asset - Printer (Network Fields)", description: "Modify network-specific fields, such as IP and hostname, on a printer asset." },
    { id: 31, title: "Edit Department Details", description: "Modify an existing department's details." },
    { id: 32, title: "Edit Peripheral Details", description: "Modify an existing peripheral's details." },
    { id: 33, title: "Edit Program Details", description: "Modify an existing software program's details." },
    { id: 34, title: "Edit Dropdown Option Status", description: "Enable or disable an existing dropdown option." },
    { id: 35, title: "Edit Vendor Details", description: "Modify an existing vendor's details." },
    { id: 36, title: "Edit End User Details", description: "Modify an existing end user's details." },
    { id: 37, title: "Edit Purchase Requests", description: "Modify an existing purchase request." },
    { id: 38, title: "Edit System User Account", description: "Modify an existing system user account's details." },
    { id: 39, title: "Grant Special Access", description: "Grant a temporary permission to a system user." },
    { id: 40, title: "Revoke Special Access", description: "Revoke a temporary permission from a system user." },
    { id: 41, title: "Reset System User Password", description: "Reset another system user's password to the default." },
    { id: 42, title: "Generate Report", description: "Generate and export system reports." },
  ];

  // ─── Display Groups (for collapsing tags in the modal and sidebar) ─────────
  // Full group → one collapsed tag. Partial → individual sub-label tags.

  const permissionDisplayGroups = [
    {
      title: "View Audit Trails",
      ids: [1, 2, 3, 4, 5, 6],
      labels: { 1: "Computer", 2: "Software", 3: "Printer", 4: "UPS", 5: "Network Device", 6: "System" },
    },
    {
      title: "View",
      ids: [7, 8],
      labels: { 7: "Purchase Requests", 8: "System Users" },
    },
    {
      title: "Add Asset",
      ids: [9, 10, 11, 12, 13],
      labels: { 9: "Computer", 10: "Software", 11: "Printer", 12: "UPS", 13: "Network Device" },
    },
    {
      title: "Add / Create",
      ids: [14, 15, 16, 17, 18, 19, 20, 21],
      labels: {
        14: "Purchase Request", 15: "Department", 16: "Peripheral",
        17: "Program", 18: "Dropdown Option", 19: "Vendor",
        20: "End Users", 21: "System User",
      },
    },
    {
      title: "Assign Asset",
      ids: [22, 23],
      labels: { 22: "Computer", 23: "Software" },
    },
    {
      title: "Edit Asset",
      ids: [24, 25, 26, 27, 28, 29, 30],
      labels: {
        24: "Computer", 25: "Software", 26: "Printer", 27: "UPS",
        28: "Network Device", 29: "Computer (Network Fields)", 30: "Printer (Network Fields)",
      },
    },
    {
      title: "Edit Records",
      ids: [31, 32, 33, 34, 35, 36, 37, 38],
      labels: {
        31: "Department", 32: "Peripheral", 33: "Program", 34: "Dropdown Option Status",
        35: "Vendor", 36: "End User", 37: "Purchase Requests", 38: "System User Account",
      },
    },
    {
      title: "User Management",
      ids: [39, 40, 41],
      labels: { 39: "Grant Special Access", 40: "Revoke Special Access", 41: "Reset Password" },
    },
    {
      title: "Generate Report",
      ids: [42],
      labels: {},
    },
  ];

  // These display groups represent permissions every account already has,
  // regardless of role, so they're noise in the normal UI and are hidden
  // from the sidebar and from the "Default permissions" list in the modal.
  const UNIVERSAL_GROUP_TITLES = [];
  const UNIVERSAL_PERMISSION_IDS = [];

  // ─── Grant Modal Groups (grouped checkboxes in the grant UI) ──────────────

  const permissionGrantGroups = [
    {
      category: "Add Asset",
      groups: [
        { label: null, ids: [9, 10, 11, 12, 13] },
      ],
    },
    {
      category: "Assign Asset",
      groups: [
        { label: null, ids: [22, 23] },
      ],
    },
    {
      category: "Edit Asset",
      groups: [
        { label: null, ids: [24, 25, 26, 27, 28, 29, 30] },
      ],
    },
    {
      category: "Manage End User",
      groups: [
        { label: null, ids: [20, 36] },
      ],
    },
    {
      category: "File Maintenance",
      groups: [
        { label: null, ids: [15, 16, 17, 18, 19, 31, 32, 33, 34, 35] },
      ],
    },
    {
      category: "Manage Purchase Request",
      groups: [
        { label: null, ids: [7, 14, 37] },
      ],
    },
    {
      category: "Manage System User / Administrative",
      groups: [
        { label: null, ids: [8, 21, 38, 39, 40, 41] },
      ],
    },
    {
      category: "Audit Trail Viewing",
      groups: [
        { label: null, ids: [1, 2, 3, 4, 5, 6] },
      ],
    },
    {
      category: "Generate Report",
      groups: [
        { label: null, ids: [42] },
      ],
    },
  ];

  // ─── Role → Permission Map (update IDs to match new catalog) ──────────────
  // Used only by renderPermissionPanel() (sidebar) to show what each role
  // should have. The actual user-level permission detection relies solely
  // on the API's user.permissions array (which the backend keeps in sync
  // via handleUserPermissionsByRole()).

  const rolePermissionMap = {
    "IT Manager":    permissionCatalog.map((p) => p.id),   // all 42
    "IT Supervisor": permissionCatalog.map((p) => p.id),   // all 42
    "System Specialist": [7, 14, 37],
    "Network Admin":     [1, 5, 13, 28, 29],
    "IT Helpdesk":       [9, 11, 12, 22],
  };

  let users = [];

  // Tracks ONLY the permissions granted through the temporary-access flow in
  // this session, per user_id — never the user's role/default permissions.
  // Keeping these separate is what lets the UI tell the difference between
  // "this is part of their normal access" and "this was actually granted as
  // a temporary, revokable permission".
  // Each entry: { permissionId, validFrom, validTo }
  const temporaryPermissionOverrides = {};

  const OVERRIDES_SESSION_KEY = "tempPermOverrides";

  function persistOverridesToSession() {
    try { sessionStorage.setItem(OVERRIDES_SESSION_KEY, JSON.stringify(temporaryPermissionOverrides)); }
    catch (e) { /* ignore quota errors */ }
  }

  // After fresh API data arrives, purge any local override entries whose
  // permissions the backend no longer reports as active temporary permissions.
  // This keeps the UI in sync when permissions expire or are revoked outside
  // of the current session.
  function reconcileOverrides() {
    for (const userId of Object.keys(temporaryPermissionOverrides)) {
      const user = users.find(u => String(u.user_id) === String(userId));
      if (!user) {
        delete temporaryPermissionOverrides[userId];
        continue;
      }
      const apiTempIds = new Set(getTemporaryFromApi(user).map(Number));
      temporaryPermissionOverrides[userId] = temporaryPermissionOverrides[userId]
        .filter(o => apiTempIds.has(Number(o.permissionId)));
      if (temporaryPermissionOverrides[userId].length === 0) {
        delete temporaryPermissionOverrides[userId];
      }
    }
    persistOverridesToSession();
  }

  function loadOverridesFromSession() {
    try {
      const raw = sessionStorage.getItem(OVERRIDES_SESSION_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      // Validate format — each entry must be an object with permissionId
      let valid = true;
      for (const key of Object.keys(data)) {
        if (!Array.isArray(data[key])) { valid = false; break; }
        for (const entry of data[key]) {
          if (typeof entry !== "object" || typeof entry.permissionId !== "number") {
            valid = false; break;
          }
        }
        if (!valid) break;
      }
      if (!valid) { sessionStorage.removeItem(OVERRIDES_SESSION_KEY); return; }
      Object.assign(temporaryPermissionOverrides, data);
    } catch (e) { /* ignore corrupt data */ }
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  function getDefaultPermissionIds(role) {
    const roleIds = rolePermissionMap[role] || [];
    return [...new Set([...roleIds])];
  }

  function getPermanentFromApi(user) {
    if (!Array.isArray(user.permissions)) return [];
    return user.permissions
      .filter(p => typeof p === "object" && !p.is_temporary)
      .map(p => Number(p.permission_id))
      .filter(Number.isFinite);
  }

  function getTemporaryFromApi(user) {
    if (!Array.isArray(user.permissions)) return [];
    return user.permissions
      .filter(p => typeof p === "object" && p.is_temporary)
      .map(p => Number(p.permission_id))
      .filter(Number.isFinite);
  }

  function getBasePermissionIds(user) {
    // The backend already stores role-default permissions in the user_permission
    // table via handleUserPermissionsByRole(). We rely on the API data only,
    // not the client-side rolePermissionMap, so the display always matches
    // what the backend actually assigned.
    return getPermanentFromApi(user);
  }

  function getTemporaryPermissionIds(user) {
    const fromApi = getTemporaryFromApi(user);
    const overrides = temporaryPermissionOverrides[user.user_id] || [];
    const fromOverrides = overrides.map(o => Number(o.permissionId)).filter(Number.isFinite);
    return [...new Set([...fromApi, ...fromOverrides])];
  }

  function getEffectivePermissionIds(user) {
    return [...new Set([...getBasePermissionIds(user), ...getTemporaryPermissionIds(user)])];
  }

  function getPermissionTitle(id) {
    const p = permissionCatalog.find(e => e.id === id);
    return p ? p.title : `Permission ${id}`;
  }


  // ─── Current user (for highlighting "this is you" in the table) ───────────

  function getCurrentUserId() {
    const storedId = localStorage.getItem("user_id") || localStorage.getItem("userId");
    if (storedId) return storedId;

    if (!token) return null;
    try {
      const payloadBase64 = token.split(".")[1];
      if (!payloadBase64) return null;
      const normalized = payloadBase64.replace(/-/g, "+").replace(/_/g, "/");
      const json = JSON.parse(atob(normalized));
      return json.user_id ?? json.userId ?? json.id ?? json.sub ?? null;
    } catch (error) {
      console.warn("Could not determine current user from token:", error);
      return null;
    }
  }

  // Clear field error as soon as user corrects the field
  [
    ["fullName",   "fullNameError"],
    ["username",   "usernameError"],
    ["employeeId", "employeeIdError"],
    ["email",      "emailError"],
    ["role",       "roleError"],
  ].forEach(([fieldId, errId]) => {
    const el = document.getElementById(fieldId);
    if (!el) return;
    const event = el.tagName === "SELECT" ? "change" : "input";
    el.addEventListener(event, () => {
      el.classList.remove("input-error");
      const errEl = document.getElementById(errId);
      if (errEl) errEl.classList.remove("visible");
    });
  });

  // Block non-digit keystrokes on employee ID
  const empIdEl = document.getElementById("employeeId");
  if (empIdEl) empIdEl.addEventListener("keydown", e => {
    const allowed = ["Backspace", "Delete", "Tab", "ArrowLeft", "ArrowRight", "Home", "End"];
    if (!allowed.includes(e.key) && !/^\d$/.test(e.key)) e.preventDefault();
  });

  // ─── Sidebar Panel ─────────────────────────────────────────────────────────
  function renderPermissionPanel() {
    if (!permissionsPanel) return;
    permissionsPanel.innerHTML = "";

    // Roles that resolve to the exact same permission set (e.g. IT Manager
    // and IT Supervisor both have all 42) are shown as one combined section
    // instead of two identical ones.
    const permissionSetGroups = [];
    Object.keys(rolePermissionMap).forEach((role) => {
      const roleIds = getDefaultPermissionIds(role);
      const key     = [...roleIds].sort((a, b) => a - b).join(",");

      const existing = permissionSetGroups.find((g) => g.key === key);
      if (existing) {
        existing.roles.push(role);
      } else {
        permissionSetGroups.push({ key, roles: [role], roleIds });
      }
    });

    permissionSetGroups.forEach(({ roles, roleIds }) => {
      const group = document.createElement("div");
      group.className = "permission-group";

      const groupTitle = document.createElement("h3");
      groupTitle.textContent = roles.join(" / ");
      group.appendChild(groupTitle);

      const grid = document.createElement("div");
      grid.className = "permission-grid";

      permissionDisplayGroups.forEach((displayGroup) => {
        // Permissions every account already has aren't useful to show per role.
        if (UNIVERSAL_GROUP_TITLES.includes(displayGroup.title)) return;

        const matchingIds = displayGroup.ids.filter(id => roleIds.includes(id));
        if (matchingIds.length === 0) return;

        if (matchingIds.length === displayGroup.ids.length) {
          const item = document.createElement("div");
          item.className = "permission-item permission-item-display";
          const lbl = document.createElement("span");
          lbl.className   = "permission-label";
          lbl.textContent = displayGroup.title;
          item.appendChild(lbl);

          grid.appendChild(item);
          return;
        }

        matchingIds.forEach(id => {
          const item = document.createElement("div");
          item.className = "permission-item permission-item-display";
          const lbl = document.createElement("span");
          lbl.className   = "permission-label";
          lbl.textContent = displayGroup.labels[id]
            ? `${displayGroup.title} — ${displayGroup.labels[id]}`
            : getPermissionTitle(id);
          item.appendChild(lbl);

          grid.appendChild(item);
        });
      });

      group.appendChild(grid);
      permissionsPanel.appendChild(group);
    });
  }

  // ─── Edit User Modal (role + permissions) ──────────────────────────────────

  async function openPermissionsModal(user) {
    if (!permissionsModal || !permissionsModalTitle || !permissionsModalBody) return;

    // Fetch fresh user data from the API so expired temp permissions are
    // reflected immediately, even if loadUsers() hasn't been called recently.
    try {
      const res = await fetch(`${API_BASE}/user/${user.user_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const fresh = await res.json();
        const idx = users.findIndex(u => String(u.user_id) === String(user.user_id));
        if (idx !== -1) users[idx] = { ...users[idx], ...fresh };
        user = users[idx] ?? user;
      }
    } catch (e) { /* fall back to stale data */ }

    reconcileOverrides();

    const baseIds   = getBasePermissionIds(user);
    const baseIdSet = new Set(baseIds.map(String));
    const tempIds   = getTemporaryPermissionIds(user);
    const tempIdSet = new Set(tempIds.map(String));
    const allCurrentIds = new Set([...baseIdSet, ...tempIdSet]);

    // Build map of permission_id → permission object for temp items (has valid_from/valid_to)
    const tempPermData = {};
    if (Array.isArray(user.permissions)) {
      user.permissions.forEach(p => {
        if (typeof p === "object" && p.is_temporary) {
          tempPermData[String(p.permission_id)] = p;
        }
      });
    }
    // Merge in locally-tracked overrides (granted this session, not yet re-fetched)
    const overrides = temporaryPermissionOverrides[user.user_id] || [];
    overrides.forEach(o => {
      const key = String(o.permissionId);
      if (!tempPermData[key]) {
        tempPermData[key] = {
          permission_id: o.permissionId,
          valid_from:    o.validFrom,
          valid_to:      o.validTo,
          is_temporary:  true,
        };
      }
    });

    permissionsModal.dataset.userId   = String(user.user_id);
    permissionsModal.dataset.userRole = user.user_role;
    permissionsModalTitle.textContent = `Manage Permissions`;
    if (permissionsModalSubtitle) permissionsModalSubtitle.textContent = `${user.user_name} · ${user.user_role}`;
    permissionsModalBody.innerHTML    = "";

    // ── Search + Remove All Temp ─────────────────────────────────────────
    const topBar = document.createElement("div");
    topBar.className = "perm-top-bar";

    const searchWrap     = document.createElement("div");
    searchWrap.className = "permissions-search-wrap";
    searchWrap.style.cssText = "flex:1;margin:0";
    const searchIcon     = document.createElement("i");
    searchIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;
    searchWrap.appendChild(searchIcon);
    const searchInput    = document.createElement("input");
    searchInput.type     = "text";
    searchInput.placeholder = "Search permissions…";
    searchInput.className = "permissions-search-input";
    searchWrap.appendChild(searchInput);
    topBar.appendChild(searchWrap);

    if (tempIds.length > 0) {
      const removeAllBtn = document.createElement("button");
      removeAllBtn.type = "button";
      removeAllBtn.className = "perm-remove-all-temp-btn";
      removeAllBtn.textContent = `Remove All Temporary (${tempIds.length})`;
      removeAllBtn.addEventListener("click", async () => {
        const ok = await showConfirmModal(`Remove all ${tempIds.length} temporary permission${tempIds.length > 1 ? "s" : ""} from ${user.user_name}?`);
        if (!ok) return;
        await revokePermission(user, tempIds);
      });
      topBar.appendChild(removeAllBtn);
    }

    permissionsModalBody.appendChild(topBar);

    // ── Grouped sections ─────────────────────────────────────────────────
    const entries = [];

    permissionGrantGroups.forEach(category => {
      const allIds = category.groups.flatMap(g => g.ids);
      const hasAny = allIds.some(id => !allCurrentIds.has(String(id)));
      const hasTemp = allIds.some(id => tempIdSet.has(String(id)));

      const section = document.createElement("div");
      section.className = "perm-group-section";

      const header = document.createElement("div");
      header.className = "perm-group-header";
      header.innerHTML = `<svg class="perm-group-toggle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`;
      const titleSpan = document.createElement("span");
      titleSpan.className = "perm-group-title";
      titleSpan.textContent = category.category;
      header.appendChild(titleSpan);

      if (hasTemp) {
        const removeGrpBtn = document.createElement("button");
        removeGrpBtn.type = "button";
        removeGrpBtn.className = "perm-group-remove-all";
        removeGrpBtn.textContent = "Remove All";
        removeGrpBtn.addEventListener("click", async (e) => {
          e.stopPropagation();
          const groupTempIds = allIds.filter(id => tempIdSet.has(String(id)));
          if (!groupTempIds.length) return;
          const ok = await showConfirmModal(`Remove ${groupTempIds.length} temporary permission${groupTempIds.length > 1 ? "s" : ""} from "${category.category}"?`);
          if (!ok) return;
          await revokePermission(user, groupTempIds);
        });
        header.appendChild(removeGrpBtn);
      }

      header.addEventListener("click", () => {
        header.classList.toggle("collapsed");
        body.classList.toggle("collapsed");
      });

      section.appendChild(header);

      const body = document.createElement("div");
      body.className = "perm-group-body";

      allIds.forEach(id => {
        const perm = permissionCatalog.find(p => p.id === id);
        if (!perm) return;

        const isBase = baseIdSet.has(String(id));
        const isTemp = tempIdSet.has(String(id));
        const isHeld = isBase || isTemp;

        const row = document.createElement("div");
        row.className = "perm-row";

        const checkWrap = document.createElement("div");
        checkWrap.className = "perm-check-wrap";
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.dataset.permId = String(id);
        cb.disabled = isHeld;
        if (isHeld) cb.checked = true;
        checkWrap.appendChild(cb);
        row.appendChild(checkWrap);

        const nameSpan = document.createElement("span");
        nameSpan.className = "perm-name";
        nameSpan.textContent = perm.title;
        if (perm.description) row.title = perm.description;
        row.appendChild(nameSpan);

        const badge = document.createElement("span");
        badge.className = "perm-badge";
        if (isTemp) {
          badge.className += " perm-badge-temporary";
          badge.textContent = "Temporary";
        } else if (isBase) {
          badge.className += " perm-badge-permanent";
          badge.textContent = "Permanent";
        } else {
          badge.className += " perm-badge-none";
          badge.textContent = "—";
        }
        row.appendChild(badge);

        if (isTemp) {
          const pData = tempPermData[String(id)];
          if (pData && (pData.valid_from || pData.valid_to)) {
            const dateSpan = document.createElement("span");
            dateSpan.className = "perm-date";
            const from = pData.valid_from ? formatDateShort(pData.valid_from) : "";
            const to   = pData.valid_to   ? formatDateShort(pData.valid_to)   : "";
            if (from && to) dateSpan.textContent = `${from} – ${to}`;
            else dateSpan.textContent = from || to;
            row.appendChild(dateSpan);
          }
          const revokeBtn = document.createElement("button");
          revokeBtn.type = "button";
          revokeBtn.className = "perm-revoke-btn";
          revokeBtn.textContent = "Revoke";
          revokeBtn.addEventListener("click", async () => {
            const ok = await showConfirmModal(`Revoke "${perm.title}" from ${user.user_name}?`);
            if (!ok) return;
            await revokePermission(user, [id]);
          });
          row.appendChild(revokeBtn);
        }

        body.appendChild(row);
        if (!isHeld) entries.push({ row, checkbox: cb, id, labelText: perm.title.toLowerCase(), section });
      });

      // Add Select All checkbox for groups with ≥ 2 non-disabled items
      const selectableInGroup = body.querySelectorAll("input[type=checkbox]:not(:disabled)");
      if (selectableInGroup.length >= 2) {
        const selectAllLbl = document.createElement("label");
        selectAllLbl.className = "perm-select-all-lbl";
        selectAllLbl.addEventListener("click", e => e.stopPropagation());
        const selectAllCb = document.createElement("input");
        selectAllCb.type = "checkbox";
        selectAllCb.className = "perm-select-all-cb";
        selectAllLbl.appendChild(selectAllCb);
        const selectAllTxt = document.createElement("span");
        selectAllTxt.textContent = "Select All";
        selectAllLbl.appendChild(selectAllTxt);
        header.appendChild(selectAllLbl);

        selectAllCb.addEventListener("change", (e) => {
          selectableInGroup.forEach(cb => { cb.checked = e.target.checked; });
          const count = entries.filter(e => e.checkbox.checked).length;
          selectedCount.textContent = count === 0
            ? "0 permissions selected"
            : `${count} permission${count > 1 ? "s" : ""} selected`;
        });
        // Keep Select All in sync when individual checkboxes change
        selectableInGroup.forEach(cb => {
          cb.addEventListener("change", () => {
            const allCbs = [...selectableInGroup];
            const checked = allCbs.filter(c => c.checked);
            selectAllCb.checked = checked.length === allCbs.length;
            selectAllCb.indeterminate = checked.length > 0 && checked.length < allCbs.length;
          });
        });
      }

      section.appendChild(body);
      permissionsModalBody.appendChild(section);
    });

    // ── Selected count ────────────────────────────────────────────────────
    const selectedCount = document.createElement("p");
    selectedCount.className = "permissions-selected-count";
    selectedCount.textContent = "0 permissions selected";
    permissionsModalBody.appendChild(selectedCount);

    // ── Grant schedule section ────────────────────────────────────────────
    const grantSection = document.createElement("div");
    grantSection.className = "perm-grant-section";

    const scheduleTitle = document.createElement("p");
    scheduleTitle.style.cssText = "font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#64748b;margin:0 0 4px;";
    scheduleTitle.textContent = "Grant Schedule (required for new grants)";
    grantSection.appendChild(scheduleTitle);

    const dateRow = document.createElement("div");
    dateRow.className = "scheduling-date-row";

    [{ id: "permissionStartDateTime", label: "Start Date & Time" },
     { id: "permissionEndDateTime", label: "End Date & Time" }].forEach(({ id, label }) => {
      const group = document.createElement("div");
      group.className = "datetime-group";
      const lbl = document.createElement("label");
      lbl.className = "scheduling-label";
      lbl.textContent = label;
      const input = document.createElement("input");
      input.type = "datetime-local";
      input.id = id;
      input.className = "scheduling-datetime-input";
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      input.min = now.toISOString().slice(0, 16);
      group.appendChild(lbl);
      group.appendChild(input);
      dateRow.appendChild(group);
      if (id === "permissionStartDateTime") {
        input.addEventListener("change", () => {
          const endInput = document.getElementById("permissionEndDateTime");
          if (input.value) endInput.min = input.value;
        });
      }
      });
    grantSection.appendChild(dateRow);

    const errorMsg = document.createElement("p");
    errorMsg.id = "permissionSchedulingError";
    errorMsg.className = "scheduling-error hidden";
    grantSection.appendChild(errorMsg);
    permissionsModalBody.appendChild(grantSection);

    // ── Search filtering ─────────────────────────────────────────────────
    searchInput.addEventListener("input", () => {
      const q = searchInput.value.toLowerCase().trim();
      permissionsModalBody.querySelectorAll(".perm-row").forEach(el => {
        const name = el.querySelector(".perm-name")?.textContent?.toLowerCase() || "";
        el.style.display = (!q || name.includes(q)) ? "" : "none";
      });
      permissionsModalBody.querySelectorAll(".perm-group-section").forEach(section => {
        const rows = [...section.querySelectorAll(".perm-row")];
        const hasVisible = rows.some(r => r.style.display !== "none");
        section.style.display = (!q || hasVisible) ? "" : "none";
      });
    });

    // ── Track changes to selected count ──────────────────────────────────
    entries.forEach(({ checkbox }) => {
      checkbox.addEventListener("change", () => {
        const count = entries.filter(e => e.checkbox.checked).length;
        selectedCount.textContent = count === 0
          ? "0 permissions selected"
          : `${count} permission${count > 1 ? "s" : ""} selected`;
      });
    });

    permissionsModal.classList.remove("hidden");
  }

  // ─── API: Update Role ───────────────────────────────────────────────────────

  async function updateUserRoleOnBackend(userId, newRole) {
    const res = await fetch(`${API_BASE}/user/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ user_role: newRole }),
    });

    let data = null;
    try { data = await res.json(); } catch (e) { console.warn("Non-JSON response:", e); }

    if (!res.ok) {
      throw new Error(data?.message || `Role update failed with status ${res.status}`);
    }
    return data;
  }

  // ─── API: Grant (array payload) ────────────────────────────────────────────

  async function grantPermissionsOnBackend(userId, permissionIds, validFrom, validTo) {
    if (!userId || isNaN(Number(userId))) {
      throw new Error(`Cannot grant permission: user_id is missing or invalid (got: ${userId}).`);
    }

    const payload = {
      user_id:       Number(userId),
      permission_id: permissionIds.map(Number),   // array — matches API contract
      validFrom,
      validTo,
    };

    console.log("[permission/grant] Payload:", JSON.stringify(payload, null, 2));

    const res = await fetch(`${API_BASE}/permission/grant`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    let data = null;
    try { data = await res.json(); } catch (e) { console.warn("Non-JSON response:", e); }

    console.log("[permission/grant] Status:", res.status, "Body:", data);

    if (!res.ok) {
      throw new Error(data?.message || `Permission grant failed with status ${res.status}`);
    }

    return data;
  }

  async function grantPermissions(userId, permissionIds, startDateTime, endDateTime) {
    const fmtStart = formatDateTimeForAPI(startDateTime);
    const fmtEnd   = formatDateTimeForAPI(endDateTime);

    await grantPermissionsOnBackend(userId, permissionIds, fmtStart, fmtEnd);

    // Track the newly granted ids as temporary with their schedule.
    // This lets the modal show valid_from/valid_to even before the next API fetch.
    const existingTemp = temporaryPermissionOverrides[userId] || [];
    const existingIds  = new Set(existingTemp.map(o => o.permissionId));
    const newEntries   = permissionIds.map(id => ({
      permissionId: Number(id),
      validFrom: fmtStart,
      validTo:   fmtEnd,
    }));
    temporaryPermissionOverrides[userId] = [
      ...existingTemp,
      ...newEntries.filter(e => !existingIds.has(e.permissionId)),
    ];
    persistOverridesToSession();
  }

  // ─── API: Revoke ───────────────────────────────────────────────────────────

  async function revokePermissionOnBackend(userId, permissionIds) {
    const payload = {
      user_id:       Number(userId),
      permission_id: permissionIds.map(Number),
    };

    const res = await fetch(`${API_BASE}/permission/revoke`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    let data = null;
    try { data = await res.json(); } catch (e) { console.warn("Non-JSON response:", e); }

    if (!res.ok) {
      throw new Error(data?.message || `Permission revoke failed with status ${res.status}`);
    }
    return data;
  }

  async function revokePermission(user, permissionIds) {
    try {
      const ids = Array.isArray(permissionIds) ? permissionIds : [permissionIds];
      await revokePermissionOnBackend(user.user_id, ids);

      const existingTemp = temporaryPermissionOverrides[user.user_id] || [];
      const idSet = new Set(ids.map(Number));
      temporaryPermissionOverrides[user.user_id] = existingTemp.filter(o => {
        if (typeof o === "number") return !idSet.has(o);
        return o && !idSet.has(o.permissionId);
      });
      persistOverridesToSession();

      closePermissionsModal();
      await loadUsers();

      const updatedUser = users.find(u => String(u.user_id) === String(user.user_id));
      if (updatedUser) openPermissionsModal(updatedUser);

      const count = ids.length;
      showAlertModal(`${count} permission${count > 1 ? "s" : ""} removed successfully.`);
    } catch (error) {
      console.error("Error revoking permission:", error);
      showAlertModal(error.message || "Could not remove permission.");
    }
  }

  // ─── Grant Selected from Permissions Modal ──────────────────────────────────

  async function grantPermissionsFromModal() {
    if (!permissionsModal || !permissionsModalBody) return;

    const userId = permissionsModal.dataset.userId;
    const user   = users.find(u => String(u.user_id) === String(userId));
    if (!user) { showAlertModal("User not found."); return; }

    const checkedCbs = [...permissionsModalBody.querySelectorAll(".perm-row input[type=checkbox]:not(:disabled):checked")];
    const checkedIds = checkedCbs.map(cb => Number(cb.dataset.permId)).filter(id => !isNaN(id));

    if (checkedIds.length === 0) {
      showAlertModal("No permissions selected. Check the permissions you want to grant, then click Grant Selected.");
      return;
    }

    const startInput = document.getElementById("permissionStartDateTime");
    const endInput   = document.getElementById("permissionEndDateTime");
    const errorMsg   = document.getElementById("permissionSchedulingError");

    if (!startInput.value || !endInput.value) {
      errorMsg.textContent = "Start and end date/time are required to grant permissions.";
      errorMsg.classList.remove("hidden");
      return;
    }
    const startDt = new Date(startInput.value);
    const endDt   = new Date(endInput.value);
    if (endDt <= startDt) {
      errorMsg.textContent = "End date/time must be after start date/time.";
      errorMsg.classList.remove("hidden");
      return;
    }
    errorMsg.classList.add("hidden");

    const permLabels = checkedCbs.map(cb => {
      const permId = Number(cb.dataset.permId);
      const found = permissionCatalog.find(p => p.id === permId);
      return found?.title || `Permission ${permId}`;
    });

    function fmtConfirmDateTime(isoStr) {
      if (!isoStr) return "\u2014";
      const dt = new Date(isoStr);
      if (isNaN(dt.getTime())) return isoStr;
      const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
      let hours = dt.getHours();
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12 || 12;
      const mins = String(dt.getMinutes()).padStart(2, "0");
      return `${months[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()} - ${hours}:${mins}${ampm}`;
    }

    const permListHtml = permLabels.map(name =>
      `<div class="confirm-perm-item">\u2022 ${escHtml(name)}</div>`
    ).join("");

    const confirmed = await showSnapshotConfirmModal({
      title: "Grant Permissions",
      subtitle: `Granting to ${user.user_name}`,
      bodyHtml: `<div class="confirm-value-block">
          <span class="confirm-label">Permissions</span>
          <div class="confirm-perm-list">${permListHtml}</div>
          <span class="confirm-label">Start</span>
          <strong>${escHtml(fmtConfirmDateTime(startInput.value))}</strong>
          <span class="confirm-label">End</span>
          <strong>${escHtml(fmtConfirmDateTime(endInput.value))}</strong>
        </div>
        <p class="confirm-note">These are temporary permissions that will expire automatically.</p>`,
      confirmLabel: "Grant Permissions",
    });
    if (!confirmed) return;

    try {
      await grantPermissions(user.user_id, checkedIds, startInput.value, endInput.value);
      closePermissionsModal();
      await loadUsers();
      const updatedUser = users.find(u => String(u.user_id) === String(userId));
      if (updatedUser) openPermissionsModal(updatedUser);
      showAlertModal(`${checkedIds.length} permission${checkedIds.length > 1 ? "s" : ""} granted successfully.`);
    } catch (error) {
      console.error("Error granting permissions:", error);
      showAlertModal(error.message || "Could not grant permissions.");
    }
  }

  // ─── Edit System User Modal ────────────────────────────────────────────────

  let pendingEditUser = null;

  function openEditUserModal(user) {
    if (!editUserModal) return;
    pendingEditUser = user;

    editUserModalTitle.textContent = `Edit System User`;
    if (editUserModalMeta) editUserModalMeta.textContent = `${user.user_name} · ${user.user_role}`;
    editUserFullName.value = user.user_name || "";
    editUserUsername.value = user.user_username || user.username || "";
    editUserEmpId.value    = user.user_emp_id ?? user.employee_id ?? user.emp_id ?? "";

    const email = user.user_email || user.email || "";
    editUserEmail.value = email;
    editUserEmailError?.classList.remove("visible");
    editUserEmail?.classList.remove("input-error");

    // Populate role select
    editUserRole.innerHTML = "";
    ROLE_OPTIONS.forEach(role => {
      const opt = document.createElement("option");
      opt.value = role;
      opt.textContent = role;
      if (role === user.user_role) opt.selected = true;
      editUserRole.appendChild(opt);
    });
    editUserRoleError?.classList.remove("visible");
    editUserRole?.classList.remove("input-error");

    // Status badge
    const isActive = String(user.user_status).toLowerCase() === "active";
    editUserStatusBadge.textContent = isActive ? "Active" : "Inactive";
    editUserStatusBadge.style.cssText = isActive
      ? "background:#dcfce7;color:#15803d;border:1px solid #bbf7d0;"
      : "background:#ffe4e6;color:#be123c;border:1px solid #fecdd3;";

    editUserFormError?.classList.add("hidden");
    editUserModal.classList.remove("hidden");
    lucide.createIcons();
  }

  function closeEditUserModal() {
    if (!editUserModal) return;
    editUserModal.classList.add("hidden");
    pendingEditUser = null;
  }

  async function submitEditUser(e) {
    e.preventDefault();
    if (!pendingEditUser) return;

    const email = editUserEmail.value.trim();
    const role  = editUserRole.value;

    // Validate
    let valid = true;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      editUserEmail?.classList.add("input-error");
      editUserEmailError?.classList.add("visible");
      valid = false;
    } else {
      editUserEmail?.classList.remove("input-error");
      editUserEmailError?.classList.remove("visible");
    }
    if (!role) {
      editUserRole?.classList.add("input-error");
      editUserRoleError?.classList.add("visible");
      valid = false;
    } else {
      editUserRole?.classList.remove("input-error");
      editUserRoleError?.classList.remove("visible");
    }
    if (!valid) return;

    const oldEmail = pendingEditUser.user_email || pendingEditUser.email || "";
    const oldRole  = pendingEditUser.user_role  || "";
    const emailChanged = email !== oldEmail;
    const roleChanged  = role  !== oldRole;
    if (!emailChanged && !roleChanged) { closeEditUserModal(); return; }

    const diffRows = [];
    if (emailChanged) {
      diffRows.push(`<span class="confirm-label">Email</span><span class="confirm-diff-old">${escHtml(oldEmail || "\u2014")}</span><span class="confirm-diff-arrow">\u2192</span><strong>${escHtml(email || "\u2014")}</strong>`);
    }
    if (roleChanged) {
      diffRows.push(`<span class="confirm-label">Role</span><span class="confirm-diff-old">${escHtml(oldRole)}</span><span class="confirm-diff-arrow">\u2192</span><strong>${escHtml(role)}</strong>`);
    }

    const confirmed = await showSnapshotConfirmModal({
      title: "Edit System User",
      subtitle: `Updating ${pendingEditUser.user_name}`,
      bodyHtml: `<div class="confirm-value-block">${diffRows.join("")}</div>
        <p class="confirm-note">Permissions will be re-synced to match the new role.</p>`,
      confirmLabel: "Save Changes",
    });
    if (!confirmed) return;

    const userId = pendingEditUser.user_id;
    try {
      const res = await fetch(`${API_BASE}/user/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ user_email: email, user_role: role }),
      });
      let data = null;
      try { data = await res.json(); } catch (e) { /* ignore */ }
      if (!res.ok) throw new Error(data?.message || `Update failed with status ${res.status}`);

      closeEditUserModal();
      delete temporaryPermissionOverrides[userId];
      await loadUsers();
      showAlertModal("User updated successfully.");
    } catch (error) {
      console.error("Error updating user:", error);
      if (editUserFormError) {
        editUserFormError.textContent = error.message;
        editUserFormError.classList.remove("hidden");
      } else {
        showAlertModal(error.message);
      }
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  function formatDateShort(d) {
    if (!d) return "";
    const dt = new Date(d.replace(" ", "T"));
    if (isNaN(dt.getTime())) return "";
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${months[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`;
  }

  function formatDateTimeForAPI(dateTimeString) {
    if (!dateTimeString) return null;
    const dt = new Date(dateTimeString);
    const pad = n => String(n).padStart(2, "0");
    return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;
  }

  // ─── Reset Password Modal ──────────────────────────────────────────────────

  function openResetPasswordModal(user) {
    if (!resetPasswordModal) return;
    pendingResetUser = user;
    resetPasswordModalTitle.textContent = `Reset Password — ${user.user_name}`;
    resetPasswordValue.textContent      = defaultPassword;
    resetPasswordModal.classList.remove("hidden");
  }

  function closeResetPasswordModal() {
    if (!resetPasswordModal) return;
    resetPasswordModal.classList.add("hidden");
    pendingResetUser = null;
  }

  function closePermissionsModal() {
    if (!permissionsModal) return;
    permissionsModal.classList.add("hidden");
    permissionsModal.dataset.userId = "";
  }

  // ─── Toggle Status Modal ───────────────────────────────────────────────────

  function openToggleStatusModal(user, newStatus) {
    if (!toggleStatusModal) return;
    pendingToggleUser   = user;
    pendingToggleStatus = newStatus;

    const action = newStatus === "Inactive" ? "Deactivate" : "Reactivate";
    toggleStatusModalTitle.textContent   = `${action} Account — ${user.user_name}`;
    toggleStatusModalMessage.innerHTML = newStatus === "Inactive"
      ? `Are you sure you want to deactivate <strong>${user.user_name}</strong>'s account?<br><br>
         Their permissions will be revoked and their password will be reset to the default: <strong>${defaultPassword}</strong>.<br><br>
         They will lose access immediately.`
      : `Are you sure you want to reactivate <strong>${user.user_name}</strong>'s account?`;

    toggleStatusModal.classList.remove("hidden");
  }

  function closeToggleStatusModal() {
    if (!toggleStatusModal) return;
    toggleStatusModal.classList.add("hidden");
    pendingToggleUser   = null;
    pendingToggleStatus = null;
  }

  // ─── Change Password Modal ────────────────────────────────────────────────

  const changePasswordModal     = document.getElementById("changePasswordModal");
  const changePasswordForm      = document.getElementById("changePasswordForm");
  const changePwdNew            = document.getElementById("changePwdNew");
  const changePwdConfirm        = document.getElementById("changePwdConfirm");
  const closeChangePasswordBtn  = document.getElementById("closeChangePasswordModal");
  const cancelChangePasswordBtn = document.getElementById("cancelChangePasswordBtn");

  function openChangePasswordModal() {
    if (!changePasswordModal) return;
    changePasswordForm?.reset();
    changePasswordModal.classList.remove("hidden");
    setTimeout(() => changePwdNew?.focus(), 50);
  }

  function closeChangePasswordModal() {
    if (!changePasswordModal) return;
    changePasswordModal.classList.add("hidden");
    changePasswordForm?.reset();
  }

  if (closeChangePasswordBtn) closeChangePasswordBtn.addEventListener("click", closeChangePasswordModal);
  if (cancelChangePasswordBtn) cancelChangePasswordBtn.addEventListener("click", closeChangePasswordModal);
  if (changePasswordModal) {
    changePasswordModal.addEventListener("click", e => {
      if (e.target === changePasswordModal) closeChangePasswordModal();
    });
  }

  if (changePasswordForm) {
    changePasswordForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const newPwd     = changePwdNew.value.trim();
      const confirmPwd = changePwdConfirm.value.trim();
      const apiError   = document.getElementById("changePasswordFormError");
      const errNew     = document.getElementById("changePwdNewError");
      const errConfirm = document.getElementById("changePwdConfirmError");

      // Clear previous errors
      [errNew, errConfirm].forEach(el => el?.classList.remove("visible"));
      [changePwdNew, changePwdConfirm].forEach(el => el?.classList.remove("input-error"));
      if (apiError) { apiError.classList.add("hidden"); apiError.textContent = ""; }

      if (!newPwd)     { changePwdNew.classList.add("input-error");     errNew?.classList.add("visible");     return; }
      if (newPwd !== confirmPwd) { changePwdConfirm.classList.add("input-error"); errConfirm?.classList.add("visible"); return; }

      const confirmed = await showSnapshotConfirmModal({
        title: "Change Password",
        bodyHtml: `<p>Are you sure you want to change your password?</p>
          <p class="confirm-note">You will need to log in again with the new password.</p>`,
        confirmLabel: "Change Password",
      });
      if (!confirmed) return;

      try {
        const res = await fetch(`${API_BASE}/user/password`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ newPassword: newPwd }),
        });

        let data = null;
        try { data = await res.json(); } catch (e) { console.warn("Non-JSON response:", e); }

        if (res.ok) {
          if (apiError) { apiError.classList.remove("hidden", "api-error--fail"); apiError.classList.add("api-error--success"); apiError.textContent = data?.message || "Password changed successfully."; }
          setTimeout(closeChangePasswordModal, 1500);
          return;
        }

        if (apiError) { apiError.classList.remove("hidden", "api-error--success"); apiError.classList.add("api-error--fail"); apiError.textContent = data?.message || "Failed to change password."; }
      } catch (error) {
        console.error("Error changing password:", error);
        if (apiError) { apiError.classList.remove("hidden", "api-error--success"); apiError.classList.add("api-error--fail"); apiError.textContent = "Cannot connect to server."; }
      }
    });
  }

  // ─── Load Permissions from API ─────────────────────────────────────────────

  async function loadPermissions() {
    try {
      const res = await fetch(`${API_BASE}/permission`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { console.warn("Failed to load permissions from API, using hardcoded."); return; }
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.permissions;
      if (!Array.isArray(list) || list.length === 0) { console.warn("Unexpected permissions format, using hardcoded."); return; }
      permissionCatalog = list.map(p => ({
        id:          p.permission_id,
        title:       p.permission_name,
        description: p.permission_desc,
      }));
    } catch (e) {
      console.warn("Could not fetch permissions, using hardcoded catalog.", e);
    }
  }

  // ─── Load Users ────────────────────────────────────────────────────────────

  async function loadUsers() {
    const res = await fetch(`${API_BASE}/user`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      console.error("Failed to load users:", res.status, res.statusText);
      users = [];
      renderTable();
      renderSummary();
      return;
    }

    const data = await res.json();
    console.log("API Response:", data);

    let rawUsers = [];
    if (Array.isArray(data.users)) rawUsers = data.users;
    else if (Array.isArray(data))  rawUsers = data;
    else console.warn("Unexpected users response format:", data);

    users = rawUsers.map(u => ({
      ...u,
      user_id: u.user_id ?? u.userId ?? u.id ?? null,
    }));

    const missing = users.filter(u => u.user_id === null);
    if (missing.length > 0) console.warn("Some users are missing a user_id:", missing);

    reconcileOverrides();
    renderTable();
    renderSummary();
  }

  async function resetUserPassword(user) {
    try {
      const res = await fetch(`${API_BASE}/user/${user.user_id}/reset-password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });

      let data = null;
      try { data = await res.json(); } catch (e) { console.warn("Non-JSON response:", e); }

      if (res.ok) { showAlertModal(data?.message || "Password reset successfully."); return; }

      const messages = { 400: "Bad request.", 401: "Unauthorized.", 403: "Forbidden.", 404: "User not found." };
      showAlertModal(data?.message || messages[res.status] || "Something went wrong.");
    } catch (error) {
      console.error("Error resetting password:", error);
      showAlertModal("Cannot connect to server.");
    }
  }

  async function toggleUserStatus(user, newStatus) {
    try {
      const res = await fetch(`${API_BASE}/user/${user.user_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ user_status: newStatus }),
      });

      let data = null;
      try { data = await res.json(); } catch (e) { console.warn("Non-JSON response:", e); }

      if (!res.ok) {
        const messages = { 400: "Bad request.", 401: "Unauthorized.", 403: "Forbidden.", 404: "User not found." };
        showAlertModal(data?.message || messages[res.status] || "Something went wrong.");
        return;
      }

      // Clear stale temporary permission overrides so the UI matches the backend
      delete temporaryPermissionOverrides[user.user_id];

      await loadUsers();
    } catch (error) {
      console.error("Error toggling user status:", error);
      showAlertModal("Cannot connect to server.");
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  function renderTable() {
    tableBody.innerHTML = "";
    const currentUserId = getCurrentUserId();

    const filtered = statusFilter
      ? users.filter(u => {
          if (statusFilter === "active") return String(u.user_status).toLowerCase() === "active";
          if (statusFilter === "inactive") return String(u.user_status).toLowerCase() !== "active";
          if (statusFilter === "admin") return u.user_role.includes("Manager") || u.user_role.includes("Supervisor");
          return true;
        })
      : users;

    const sorted = [...filtered].sort((a, b) => {
      const aActive = String(a.user_status).toLowerCase() === "active" ? 0 : 1;
      const bActive = String(b.user_status).toLowerCase() === "active" ? 0 : 1;
      return aActive - bActive;
    });

    sorted.forEach((user) => {
      const row       = document.createElement("tr");
      const permCount = getEffectivePermissionIds(user).length;
      const isActive  = String(user.user_status).toLowerCase() === "active";
      const isSelf    = currentUserId !== null && String(user.user_id) === String(currentUserId);

      row.dataset.userId = user.user_id;
      if (isSelf) row.classList.add("current-user-row");

      // The signed-in user can't deactivate, reset, or re-role themselves
      // from this table, so their row shows a Change Password button instead.
      const actionsHtml = isSelf
        ? `
          <div class="row-actions">
            <button type="button" class="action-btn action-btn-change-pwd" data-action="change-password" title="Change password">
              <i data-lucide="key-round"></i><span class="btn-label">Change Password</span>
            </button>
          </div>
        `
        : `
          <div class="row-actions">
            <button type="button" class="action-btn action-btn-edit" data-action="edit-user" title="Edit user" ${!isActive ? "disabled" : ""}>
              <i data-lucide="pencil"></i><span class="btn-label">Edit</span>
            </button>
            <button type="button" class="action-btn ${isActive ? "action-btn-deactivate" : "action-btn-activate"}" data-action="toggle-status" title="${isActive ? "Deactivate" : "Reactivate"}">
              <i data-lucide="${isActive ? "user-x" : "user-check"}"></i><span class="btn-label">${isActive ? "Deactivate" : "Reactivate"}</span>
            </button>
          </div>
        `;

      row.innerHTML = `
        <td>${user.user_name}${isSelf ? '<span class="current-user-badge">You</span>' : ""}</td>
        <td>${user.user_username || ""}</td>
        <td>${user.user_emp_id}</td>
        <td>${user.user_email || ""}</td>
        <td>${user.user_role}</td>
        <td>
          <span class="status-pill ${isActive ? "status-active" : "status-inactive"}">
            ${isActive ? "Active" : "Inactive"}
          </span>
        </td>
        <td>
          <button type="button" class="action-btn action-btn-credential access-manage-btn" data-action="manage-permissions" title="${permCount} permission${permCount !== 1 ? "s" : ""}" ${!isActive ? "disabled" : ""}>
            <i data-lucide="shield"></i>
            Manage
          </button>
        </td>
        <td>${actionsHtml}</td>
      `;
      tableBody.appendChild(row);
    });

    if (window.lucide) lucide.createIcons();
  }

  function renderSummary() {
    document.getElementById("activeCount").textContent =
      users.filter(u => u.user_status === "Active").length;
    document.getElementById("inactiveCount").textContent =
      users.filter(u => u.user_status !== "Active").length;
    document.getElementById("adminCount").textContent =
      users.filter(u => u.user_role.includes("Manager") || u.user_role.includes("Supervisor")).length;
  }

  // ─── Filter / Summary click toggles ────────────────────────────────────────

  let statusFilter = null; // null = show all, "active", "inactive", "admin"

  document.querySelectorAll(".summary-card").forEach((card, index) => {
    card.addEventListener("click", () => {
      const filters = ["active", "inactive", "admin"];
      const clicked = filters[index];
      statusFilter = statusFilter === clicked ? null : clicked;

      document.querySelectorAll(".summary-card").forEach(c => c.classList.remove("filter-active"));
      if (statusFilter) card.classList.add("filter-active");

      renderTable();
    });
  });

  // ─── Event Listeners ───────────────────────────────────────────────────────

  if (closePermissionsModalBtn) closePermissionsModalBtn.addEventListener("click", closePermissionsModal);
  if (cancelPermissionsBtn)     cancelPermissionsBtn.addEventListener("click", closePermissionsModal);
  if (grantPermissionsBtn)      grantPermissionsBtn.addEventListener("click", grantPermissionsFromModal);

  if (permissionsModal) {
    permissionsModal.addEventListener("click", e => {
      if (e.target === permissionsModal) closePermissionsModal();
    });
  }

  // ─── Edit System User Modal listeners ─────────────────────────────────
  if (closeEditUserModalBtn) closeEditUserModalBtn.addEventListener("click", closeEditUserModal);
  if (cancelEditUserBtn)     cancelEditUserBtn.addEventListener("click", closeEditUserModal);
  if (editUserForm)          editUserForm.addEventListener("submit", submitEditUser);
  if (editUserResetPwdBtn) {
    editUserResetPwdBtn.addEventListener("click", () => {
      if (pendingEditUser) {
        openResetPasswordModal(pendingEditUser);
        closeEditUserModal();
      }
    });
  }
  if (editUserModal) {
    editUserModal.addEventListener("click", e => {
      if (e.target === editUserModal) closeEditUserModal();
    });
  }

  if (createAccountBtn && userModal && modalTitle && userForm) {
    createAccountBtn.addEventListener("click", () => {
      modalTitle.textContent = "Add User";
      userForm.reset();
      clearAddUserFormErrors();
      userModal.classList.remove("hidden");
    });
  }

  // ── Add User Form Validation ──────────────────────────────────────────
  function validateAddUserForm() {
    const fields = [
      {
        id:    "fullName",
        errId: "fullNameError",
        test:  v => v.trim() !== "",
      },
      {
        id:    "username",
        errId: "usernameError",
        test:  v => v.trim() !== "",
      },
      {
        id:    "employeeId",
        errId: "employeeIdError",
        test:  v => /^\d{5}$/.test(v.trim()),
      },
      {
        id:    "email",
        errId: "emailError",
        test:  v => v.trim() !== "" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()),
      },
      {
        id:    "role",
        errId: "roleError",
        test:  v => v !== "",
      },
    ];

    let valid = true;

    fields.forEach(({ id, errId, test }) => {
      const el    = document.getElementById(id);
      const errEl = document.getElementById(errId);
      if (!el || !errEl) return;

      const ok = test(el.value ?? "");
      el.classList.toggle("input-error", !ok);
      errEl.classList.toggle("visible",  !ok);
      if (!ok) valid = false;
    });

    return valid;
  }

  function clearAddUserFormErrors() {
    ["fullName", "username", "employeeId", "email", "role"].forEach(id => {
      const el    = document.getElementById(id);
      const errEl = document.getElementById(`${id.charAt(0).toUpperCase() + id.slice(1)}Error`);
      // handle employeeId → employeeIdError capitalisation edge case
      const errElAlt = document.getElementById(`${id}Error`);
      if (el)             el.classList.remove("input-error");
      if (errEl)          errEl.classList.remove("visible");
      if (errElAlt)       errElAlt.classList.remove("visible");
    });
  }

  async function registerNewUser(payload) {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      let data = null;
      try { data = await res.json(); } catch (e) { console.warn("Non-JSON response:", e); }

      if (res.status === 201) {
        userModal.classList.add("hidden");
        userForm.reset();
        await loadUsers();
        return;
      }

      const messages = {
        400: "Missing required fields or employee ID already exists.",
        401: "Unauthorized. Please log in again.",
        403: "Forbidden: insufficient permissions.",
      };
      showAlertModal(data?.message || messages[res.status] || `Request failed with status ${res.status}`);
    } catch (error) {
      console.error("Network error while creating user:", error);
      showAlertModal("Something went wrong while creating the account.");
    }
  }

  if (userForm) {
    userForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (!validateAddUserForm()) return;

      const payload = {
        name:     document.getElementById("fullName").value.trim(),
        username: document.getElementById("username").value.trim(),
        empID:    document.getElementById("employeeId").value.trim(),
        email:    document.getElementById("email").value.trim(),
        role:     document.getElementById("role").value,
      };

      const confirmed = await showSnapshotConfirmModal({
        title: "Create Account",
        subtitle: "Review the account details before creating.",
        bodyHtml: `<div class="confirm-value-block">
            <span class="confirm-label">Name</span>
            <strong>${escHtml(payload.name)}</strong>
            <span class="confirm-label">Username</span>
            <strong>${escHtml(payload.username)}</strong>
            <span class="confirm-label">Employee ID</span>
            <strong>${escHtml(payload.empID)}</strong>
            <span class="confirm-label">Email</span>
            <strong>${escHtml(payload.email || "\u2014")}</strong>
            <span class="confirm-label">Role</span>
            <strong>${escHtml(payload.role)}</strong>
          </div>
          <p class="confirm-note">A default password (Tmcsl@12345) will be assigned.</p>`,
        confirmLabel: "Create Account",
      });
      if (!confirmed) return;

      await registerNewUser(payload);
    });
  }

  tableBody.addEventListener("click", async (e) => {
    const button = e.target.closest("button[data-action]");
    if (!button) return;

    const row    = button.closest("tr");
    const userId = row?.dataset.userId;
    const user   = users.find(entry => String(entry.user_id) === String(userId));
    if (!user) return;

    const action = button.dataset.action;

    const isInactive = String(user.user_status).toLowerCase() !== "active";
    if (isInactive && (action === "edit-user" || action === "reset-password")) return;

    if (action === "edit-user")       { openEditUserModal(user); return; }
    if (action === "reset-password")  { openResetPasswordModal(user); return; }
    if (action === "change-password") { openChangePasswordModal(); return; }
    if (action === "manage-permissions") { openPermissionsModal(user); return; }
    if (action === "toggle-status") {
      const newStatus = String(user.user_status).toLowerCase() === "active" ? "Inactive" : "Active";
      openToggleStatusModal(user, newStatus);
    }
  });

  if (closeResetPasswordModalBtn) closeResetPasswordModalBtn.addEventListener("click", closeResetPasswordModal);
  if (cancelResetPasswordBtn)     cancelResetPasswordBtn.addEventListener("click", closeResetPasswordModal);
  if (confirmResetPasswordBtn) {
    confirmResetPasswordBtn.addEventListener("click", async () => {
      if (!pendingResetUser) return;
      const u = pendingResetUser;
      closeResetPasswordModal();
      await resetUserPassword(u);
    });
  }
  if (resetPasswordModal) {
    resetPasswordModal.addEventListener("click", e => {
      if (e.target === resetPasswordModal) closeResetPasswordModal();
    });
  }

  if (closeToggleStatusModalBtn) closeToggleStatusModalBtn.addEventListener("click", closeToggleStatusModal);
  if (cancelToggleStatusBtn)     cancelToggleStatusBtn.addEventListener("click", closeToggleStatusModal);
  if (confirmToggleStatusBtn) {
    confirmToggleStatusBtn.addEventListener("click", async () => {
      if (!pendingToggleUser || !pendingToggleStatus) return;
      const u = pendingToggleUser;
      const s = pendingToggleStatus;
      closeToggleStatusModal();
      await toggleUserStatus(u, s);
    });
  }
  if (toggleStatusModal) {
    toggleStatusModal.addEventListener("click", e => {
      if (e.target === toggleStatusModal) closeToggleStatusModal();
    });
  }


  const closeModal    = document.getElementById("closeModal");
  const cancelUserBtn = document.getElementById("cancelUserBtn");
  if (closeModal)    closeModal.addEventListener("click", () => {
    userModal.classList.add("hidden");
    clearAddUserFormErrors();
  });
  if (cancelUserBtn) cancelUserBtn.addEventListener("click", () => {
    userModal.classList.add("hidden");
    clearAddUserFormErrors();
  });
  if (userModal) {
    userModal.addEventListener("click", e => {
      if (e.target === userModal) userModal.classList.add("hidden");
    });
  }

  window.openUser = function (id) {
    const user = users.find(entry => String(entry.user_id) === String(id));
    if (!user) return;
    openEditUserModal(user);
  };

  renderPermissionPanel();
  loadPermissions();
  loadOverridesFromSession();
  loadUsers();
});

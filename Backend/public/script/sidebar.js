// ─── Permission Map ─────────────────────────────────────────────────────────
// Each page maps to the permission IDs that grant access (any one suffices).
// The role is also checked — IT Manager and IT Supervisor always have access.
const PAGE_PERMISSIONS = {
    "computer.html":       { ids: [9, 22, 24, 29], roles: ["IT Manager", "IT Supervisor", "IT Helpdesk", "Network Admin"] },
    "ups.html":            { ids: [12, 27],         roles: ["IT Manager", "IT Supervisor", "IT Helpdesk"] },
    "printers.html":       { ids: [11, 26, 30],     roles: ["IT Manager", "IT Supervisor", "IT Helpdesk", "Network Admin"] },
    "networkDevices.html": { ids: [13, 28],          roles: ["IT Manager", "IT Supervisor", "Network Admin"] },
    "software.html":       { ids: [10, 23, 25],      roles: ["IT Manager", "IT Supervisor"] },
    "purchaseRequest.html":{ ids: [7, 14, 37],       roles: ["IT Manager", "IT Supervisor", "System Specialist"] },
    "filemaintenance.html":{ ids: [15,16,17,18,19,31,32,33,34,35], roles: ["IT Manager", "IT Supervisor"] },
    "userManagement.html": { ids: [8, 38, 39, 40, 41], roles: ["IT Manager", "IT Supervisor"] },
    "endUser.html":        { ids: [20, 36],          roles: ["IT Manager", "IT Supervisor"] },
    "temporaryAssign.html":{ ids: [22],              roles: ["IT Manager", "IT Supervisor", "IT Helpdesk"] },
    "reports.html":        { ids: [42],              roles: ["IT Manager", "IT Supervisor"] },
    "auditLogs.html":      { ids: [1, 2, 3, 4, 5, 6], roles: ["IT Manager", "IT Supervisor"] },
};

function getUserPermissions() {
    try {
        return JSON.parse(localStorage.getItem("permissions") || "[]");
    } catch { return []; }
}

function getUserRole() {
    return localStorage.getItem("role") || "";
}

function canAccessPage(page) {
    const rule = PAGE_PERMISSIONS[page];
    if (!rule) return true;
    const role = getUserRole();
    if (rule.roles.includes(role)) return true;
    const perms = getUserPermissions();
    return rule.ids.some(id => perms.includes(id));
}

const sidebarHtml = `
<div class="sidebar-overlay"></div>

<aside class="sidebar" id="sidebar">
    <div class="sidebar-header">
        <img src="../assets/itd-logo.png" class="logo">
        <span>IT Asset Management</span>
    </div>

    <nav class="nav">
        <a href="assets.html" class="nav-item">
            <i data-lucide="layout-dashboard"></i>
            Dashboard
        </a>

        <div class="nav-group">
            <a href="assets.html" class="nav-item nav-parent">
                <span class="nav-parent-label">
                    <i data-lucide="boxes"></i>
                    IT Assets
                </span>
                <i data-lucide="chevron-down" class="submenu-toggle-icon"></i>
            </a>

            <div class="nav-submenu" id="assetsSubmenu">
                <a href="computer.html" class="nav-subitem" data-page="computer.html">
                    <i data-lucide="monitor"></i>
                    Laptop / Desktop
                </a>

                <a href="ups.html" class="nav-subitem" data-page="ups.html">
                    <i data-lucide="zap"></i>
                    UPS
                </a>

                <a href="printers.html" class="nav-subitem" data-page="printers.html">
                    <i data-lucide="printer"></i>
                    Printers
                </a>

                <a href="networkDevices.html" class="nav-subitem" data-page="networkDevices.html">
                    <i data-lucide="server"></i>
                    Network Devices
                </a>
            </div>
        </div>

        <a href="software.html" class="nav-item" data-page="software.html">
            <i data-lucide="package"></i>
            Software Licenses
        </a>

        <a href="purchaseRequest.html" class="nav-item" data-page="purchaseRequest.html">
            <i data-lucide="clipboard-list"></i>
            Purchase Requests
        </a>

        <a href="filemaintenance.html" class="nav-item" data-page="filemaintenance.html">
            <i data-lucide="file-cog"></i>
            File Maintenance
        </a>

        <a href="userManagement.html" class="nav-item" data-page="userManagement.html">
            <i data-lucide="user-cog"></i>
            User Management
        </a>

        <a href="endUser.html" class="nav-item" data-page="endUser.html">
            <i data-lucide="user-round"></i>
            End Users
        </a>

        <a href="temporaryAssign.html" class="nav-item" data-page="temporaryAssign.html">
            <i data-lucide="clock"></i>
            Temporarily Assigned Assets
        </a>

        <a href="reports.html" class="nav-item" data-page="reports.html">
            <i data-lucide="bar-chart-3"></i>
            Reports
        </a>

        <a href="auditLogs.html" class="nav-item" data-page="auditLogs.html">
            <i data-lucide="history"></i>
            Audit Trail Logs
        </a>
    </nav>

    <div class="sidebar-user">
        <div>
            <p id="userName">User</p>
            <small id="userRole">Role</small>
        </div>

        <button id="logoutBtn">
            <i data-lucide="log-out"></i>
            Logout
        </button>
    </div>
</aside>

<!-- Mobile bottom navigation bar -->
<div class="mobile-bottom-nav" id="mobileBottomNav">
    <button class="menu-toggle" id="menuToggle" aria-label="Open menu">
        <i data-lucide="menu"></i>
    </button>
    <span class="mobile-bottom-nav-title" id="bottomNavTitle">IT Asset Management</span>
    <div class="mobile-bottom-nav-spacer"></div>
</div>
`;

function applySidebarPermissions() {
    const assetSubPages = ["computer.html", "ups.html", "printers.html", "networkDevices.html"];

    assetSubPages.forEach(page => {
        const links = document.querySelectorAll(`[data-page="${page}"]`);
        const allowed = canAccessPage(page);

        links.forEach(link => {
            link.style.display = allowed ? "" : "none";
        });
    });

    const navGroup = document.querySelector(".nav-group");
    if (navGroup) {
        const anyAssetAllowed = assetSubPages.some(p => canAccessPage(p));
        navGroup.style.display = anyAssetAllowed ? "" : "none";
    }

    const otherPages = [
        "software.html", "purchaseRequest.html", "filemaintenance.html",
        "userManagement.html", "endUser.html", "temporaryAssign.html",
        "reports.html", "auditLogs.html",
    ];

    otherPages.forEach(page => {
        const links = document.querySelectorAll(`[data-page="${page}"]`);
        const allowed = canAccessPage(page);

        links.forEach(link => {
            link.style.display = allowed ? "" : "none";
        });
    });
}

function loadSidebar() {
    const container = document.getElementById("sidebar-container");

    if (container) {
        container.innerHTML = sidebarHtml;
    } else {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = sidebarHtml;
        document.body.prepend(wrapper);
    }

    requestAnimationFrame(() => {
        if (window.lucide) {
            lucide.createIcons();
        }

        attachSidebarEvents();
        setActiveNav();
        applySidebarPermissions();
        guardPageAccess();
        refreshPermissionsFromAPI();
    });
}

function guardPageAccess() {
    const currentPage = window.location.pathname.split("/").pop() || "assets.html";
    if (currentPage === "assets.html" || currentPage === "" || currentPage === "index.html") return;
    if (!canAccessPage(currentPage)) {
        window.location.replace("assets.html");
    }
}

async function refreshPermissionsFromAPI() {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
        const res = await fetch("/api/auth/me", {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const user = await res.json();
        if (Array.isArray(user.permissions)) {
            localStorage.setItem("permissions", JSON.stringify(user.permissions));
        }
        if (user.user_role) {
            localStorage.setItem("role", user.user_role);
        }
        applySidebarPermissions();
        guardPageAccess();
    } catch { /* offline or error — keep using localStorage data */ }
}

document.addEventListener("DOMContentLoaded", loadSidebar);

function attachSidebarEvents() {
    const logoutBtn = document.getElementById("logoutBtn");
    const userNameEl = document.getElementById("userName");
    const userRoleEl = document.getElementById("userRole");

    logoutBtn?.addEventListener("click", () => {
        localStorage.clear();
        window.location.href = "../index.html";
    });

    const name = localStorage.getItem("name") || "User";
    const role = localStorage.getItem("role") || "Role";

    if (userNameEl) userNameEl.textContent = name;
    if (userRoleEl) userRoleEl.textContent = role;

    const menuToggle = document.querySelector(".menu-toggle");
    const sidebar = document.querySelector(".sidebar");
    const overlay = document.querySelector(".sidebar-overlay");

    const openSidebar = () => {
        sidebar?.classList.add("open");
        overlay?.classList.add("active");
        document.body.style.overflow = "hidden";
        document.body.classList.add("sidebar-open");
    };

    const closeSidebar = () => {
        sidebar?.classList.remove("open");
        overlay?.classList.remove("active");
        document.body.style.overflow = "";
        document.body.classList.remove("sidebar-open");
    };

    menuToggle?.addEventListener("click", () => {
        if (sidebar?.classList.contains("open")) {
            closeSidebar();
        } else {
            openSidebar();
        }
    });

    overlay?.addEventListener("click", closeSidebar);

    document.querySelectorAll(".nav-group").forEach(group => {
        const parentLink = group.querySelector(".nav-parent");
        const toggleIcon = group.querySelector(".submenu-toggle-icon");

        const toggleGroup = event => {
            event.preventDefault();
            event.stopPropagation();
            group.classList.toggle("open");
        };

        parentLink?.addEventListener("click", toggleGroup);
        toggleIcon?.addEventListener("click", toggleGroup);
    });

    document.querySelectorAll(".nav-item:not(.nav-parent)").forEach(link => {
        link.addEventListener("click", () => {
            if (window.innerWidth <= 1024) {
                closeSidebar();
            }
        });
    });

    document.addEventListener("keydown", e => {
        if (e.key === "Escape") {
            closeSidebar();
        }
    });

    window.addEventListener("resize", () => {
        if (window.innerWidth > 1024) {
            closeSidebar();
        }
    });
}

const pageTitles = {
    "assets.html": "Dashboard",
    "computer.html": "Laptop / Desktop",
    "ups.html": "UPS",
    "printers.html": "Printers",
    "networkDevices.html": "Network Devices",
    "software.html": "Software Licenses",
    "purchaseRequest.html": "Purchase Requests",
    "filemaintenance.html": "File Maintenance",
    "userManagement.html": "User Management",
    "endUser.html": "End Users",
    "temporaryAssign.html": "Temporarily Assigned Assets",
    "reports.html": "Reports",
    "auditLogs.html": "Audit Trail Logs",
};

function setActiveNav() {
    const currentPage = window.location.pathname.split("/").pop() || "assets.html";

    document.querySelectorAll(".nav-item, .nav-subitem").forEach(link => {
        link.classList.remove("active");
    });

    if (currentPage === "assets.html") {
        document.querySelector(".nav-item[href='assets.html']")?.classList.add("active");
        document.querySelector(".nav-subitem[href='assets.html']")?.classList.add("active");
        document.querySelector(".nav-group")?.classList.add("open");
    } else if (["computer.html", "ups.html", "printers.html", "networkDevices.html"].includes(currentPage)) {
        document.querySelector(".nav-item[href='assets.html']")?.classList.add("active");
        document.querySelector(`.nav-subitem[href='${currentPage}']`)?.classList.add("active");
        document.querySelector(".nav-group")?.classList.add("open");
    } else {
        document.querySelector(`.nav-item[href='${currentPage}']`)?.classList.add("active");
    }

    const titleEl = document.getElementById("bottomNavTitle");
    if (titleEl) {
        titleEl.textContent = pageTitles[currentPage] || "IT Asset Management";
    }
}
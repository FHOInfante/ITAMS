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
                <a href="computer.html" class="nav-subitem">
                    <i data-lucide="monitor"></i>
                    Laptop / Desktop
                </a>

                <a href="ups.html" class="nav-subitem">
                    <i data-lucide="zap"></i>
                    UPS
                </a>

                <a href="printers.html" class="nav-subitem">
                    <i data-lucide="printer"></i>
                    Printers
                </a>

                <a href="networkDevices.html" class="nav-subitem">
                    <i data-lucide="server"></i>
                    Network Devices
                </a>
            </div>
        </div>

        <a href="software.html" class="nav-item">
            <i data-lucide="package"></i>
            Software Licenses
        </a>

        <a href="purchaseRequest.html" class="nav-item">
            <i data-lucide="clipboard-list"></i>
            Purchase Requests
        </a>

        <a href="filemaintenance.html" class="nav-item">
            <i data-lucide="file-cog"></i>
            File Maintenance
        </a>

        <a href="userManagement.html" class="nav-item">
            <i data-lucide="user-cog"></i>
            User Management
        </a>

        <a href="endUser.html" class="nav-item">
            <i data-lucide="user-round"></i>
            End Users
        </a>

        <a href="temporaryAssign.html" class="nav-item">
            <i data-lucide="clock"></i>
            Temporarily Assigned Assets
        </a>

        <a href="reports.html" class="nav-item">
            <i data-lucide="bar-chart-3"></i>
            Reports
        </a>

        <a href="auditLogs.html" class="nav-item">
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
    });
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
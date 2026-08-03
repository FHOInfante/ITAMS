document.addEventListener("DOMContentLoaded", () => {

    console.log(localStorage.getItem("token"));
    console.log(localStorage.getItem("role"));
    console.log(localStorage.getItem("name"));
    console.log(JSON.parse(localStorage.getItem("permissions")));


    console
    // ICONS
    lucide.createIcons();

    // ======================
    // USER INFO
    // ======================
    const role = localStorage.getItem("role");
    const token = localStorage.getItem("token");

    const roleEl = document.getElementById("userRole");
    const logoutBtn = document.getElementById("logoutBtn");

    if (roleEl) {
        roleEl.textContent = role || "User";
    }

    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            localStorage.clear();
            window.location.href = "../index.html";
        });
    }

    // ======================
    // SIDEBAR TOGGLE (MOBILE)
    // ======================
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebarOverlay");
    const menuToggle = document.getElementById("menuToggle");

    function openSidebar() {
        sidebar?.classList.add("open");
        overlay?.classList.add("active");
    }

    function closeSidebar() {
        sidebar?.classList.remove("open");
        overlay?.classList.remove("active");
    }

    if (menuToggle) {
        menuToggle.addEventListener("click", openSidebar);
    }

    if (overlay) {
        overlay.addEventListener("click", closeSidebar);
    }

    document.querySelectorAll(".nav-item").forEach(item => {
        item.addEventListener("click", () => {
            if (window.innerWidth <= 768) closeSidebar();
        });
    });

});
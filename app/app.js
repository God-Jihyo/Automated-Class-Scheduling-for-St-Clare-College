console.log("App successfully loaded");

document.addEventListener("DOMContentLoaded", async () => {

    /************************************************************************
     * ==================================================================== *
     * 1. GLOBAL & NAVIGATION                                               *
     * ==================================================================== *
     ************************************************************************/
    
    let activeYear = "2025-2026";
    let activeSemester = 1;

    // --- ACADEMIC TERM LOGIC ---
    async function fetchSystemSettings() {
        try {
            const response = await fetch("../api/getSettings.php");
            const res = await response.json();
            if (res.status === "success" && res.data) {
                activeYear = res.data.current_year;
                activeSemester = parseInt(res.data.current_semester);
                
                // Update the UI Header
                document.getElementById("displayYear").textContent = "S.Y. " + activeYear;
                document.getElementById("displaySemester").textContent = activeSemester === 3 ? "Summer" : activeSemester + (activeSemester === 1 ? "st" : "nd") + " Semester";
            }
        } catch (err) {
            console.error("Error fetching settings:", err);
        }
    }

    

    window.openTermModal = function() {
        document.getElementById("termYearInput").value = activeYear;
        document.getElementById("termSemInput").value = activeSemester;
        document.getElementById("termModal").style.display = "block";
    };

    window.closeTermModal = function() {
        document.getElementById("termModal").style.display = "none";
    };
    
    window.saveActiveTerm = async function() {
        const newYear = document.getElementById("termYearInput").value.trim();
        const newSem = document.getElementById("termSemInput").value;
        
        if(!newYear) return alert("Year cannot be empty!");

        try {
            const response = await fetch("../api/updateSettings.php", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ current_year: newYear, current_semester: newSem })
            });
            const res = await response.json();
            
            if (res.status === "success") {
                alert("Active Term successfully updated!");
                location.reload(); 
            } else {
                alert("Error: " + res.message);
            }
        } catch (err) {
            console.error(err);
        }
    };
    await fetchSystemSettings();




    function updateRealTimeClock() {
        const dateTimeElement = document.getElementById('liveDateTime');
        if (!dateTimeElement) return;

        const now = new Date();
        const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };

        dateTimeElement.textContent = `${now.toLocaleDateString('en-US', dateOptions)} | ${now.toLocaleTimeString('en-US', timeOptions)}`;
    }
    updateRealTimeClock(); 
    setInterval(updateRealTimeClock, 1000); 

    const menuItems = document.querySelectorAll(".nav-menu a");
    const pages = document.querySelectorAll(".page");

    menuItems.forEach(item => {
        item.addEventListener("click", e => {
            if(item.id === "logoutBtn") return; 

            e.preventDefault();
            
            menuItems.forEach(i => i.classList.remove("active"));
            item.classList.add("active");

        const pageId = item.getAttribute("data-page");
            if (pageId) {
                pages.forEach(p => p.classList.add("hidden"));
                document.getElementById(pageId).classList.remove("hidden");

                 if (pageId === "rooms") {
                    renderAllRooms();
                }
                
                // NEW: Trigger the calendar render when the sidebar button is clicked!
                if (pageId === "calendar") {
                    if (typeof renderEventsPage === "function") renderEventsPage();
                }
                
                const manualEditor = document.getElementById("manualEditorGridContainer");
                const generatedSchedules = document.getElementById("generatedSchedulesContainer");
                
                if (manualEditor) {
                    manualEditor.classList.add("hidden");
                    manualEditor.style.display = "none";
                }
                
                // If returning to the sections tab, show the normal schedule cards again
                if (pageId === "sections" && generatedSchedules) {
                    generatedSchedules.classList.remove("hidden");
                }
            }

            if (window.innerWidth <= 900) {
                sidebar.classList.add("closed");
                content.classList.add("expanded");
                overlay.classList.remove("active");
            }
        });
    });

    const toggleBtn = document.querySelector(".togglebtn");
    const sidebar = document.querySelector(".sidebar");
    const content = document.querySelector(".content");
    const overlay = document.querySelector(".overlay");

    if (toggleBtn) {
        toggleBtn.addEventListener("click", () => {
            sidebar.classList.toggle("closed");
            content.classList.toggle("expanded");
            overlay.classList.toggle("active");
        });
    }

    if (overlay) {
        overlay.addEventListener("click", () => {
            sidebar.classList.add("closed");
            content.classList.add("expanded");
            overlay.classList.remove("active");
        });
    }

    window.addEventListener("resize", function () {
        if (window.innerWidth > 900) {
            sidebar.classList.remove("closed");
            content.classList.remove("expanded");
            overlay.classList.remove("active");
        } else {
            sidebar.classList.add("closed");
            content.classList.add("expanded");
            overlay.classList.remove("active");
        }
    });

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async (e) => {
            e.preventDefault(); 
            try {
                let res = await fetch("../logout.php", { method: "POST" });
                let data = await res.json();
                if (data.status === "success") window.location.href = "../login.html";
            } catch (error) {
                window.location.href = "../login.html"; 
            }
        });
    }

    
  

    /************************************************************************
     * ==================================================================== *
     * 3. SUBJECTS MANAGEMENT                                               *
     * ==================================================================== *
     ************************************************************************/
    
    const courseSelect = document.getElementById("Course");
    const yearSelect = document.getElementById("yearLevel");
    const subjectsBody = document.getElementById("subjectsBody");

    window.loadSubjects = function () {
        if (!courseSelect || !yearSelect || !subjectsBody) return;
        const course_id = courseSelect.value;
        const year_level = yearSelect.value;

        if (isNaN(course_id) || isNaN(year_level) || !course_id || !year_level) {
            subjectsBody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:#888;">Please select a Course and Year Level to view subjects.</td></tr>`;
            return;
        }

        fetch(`../api/getSubjects.php?course_id=${course_id}&year_level=${year_level}&semester=${activeSemester}`)
            .then(res => res.json())
            .then(data => {
                subjectsBody.innerHTML = "";
                if (data.length === 0) {
                    subjectsBody.innerHTML = `<tr><td colspan="3">No subjects found.</td></tr>`;
                    return;
                }
                data.forEach(sub => {
                    subjectsBody.innerHTML += `
                        <tr>
                            <td>${sub.code}</td>
                            <td>${sub.subject_description}</td>
                            <td class="action-cell">
                                <button class="editSubject action-btn" style="background-color: #f0ad4e;" data-id="${sub.subject_id || sub.id}">Edit</button>
                                <button class="delete-subject action-btn btn-delete" data-id="${sub.subject_id || sub.id}">DELETE</button>
                            </td>
                        </tr>
                    `;
                });
            });
    }

    if (courseSelect) courseSelect.addEventListener("change", loadSubjects);
    if (yearSelect) yearSelect.addEventListener("change", loadSubjects);

    const saveSubjectBtn = document.getElementById("saveSubject");
    if (saveSubjectBtn) {
        saveSubjectBtn.addEventListener("click", () => {
            const id = document.getElementById("editSubjectId").value;
            const code = document.getElementById("subCode").value.trim();
            const desc = document.getElementById("subDesc").value.trim();
            const courseID = document.getElementById("courseSelect").value;
            const yearLevel = document.getElementById("yearSelect").value;
            const semester = document.getElementById("semesterSelect").value;
            const units = document.getElementById("subUnits").value;

            let deliveryMode = null;
            if (document.getElementById("pref_online").checked) deliveryMode = 'online';
            if (document.getElementById("pref_ftf").checked) deliveryMode = 'ftf';

            if (!code || !desc || !courseID || !yearLevel) return alert("Please fill out all fields.");

            const executeSave = () => {
                const url = id ? "../api/editSubject.php" : "../api/addSubject.php";
                const payload = { code, subject_description: desc, course_id: courseID, year_level: yearLevel, semester: semester, delivery_mode: deliveryMode, units: units };
                if (id) payload.subject_id = id;

                fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
                .then(res => res.json())
                .then(data => {
                    alert(data.message);
                    if (data.status === "success") {
                        document.getElementById("addSubjectModal").style.display = "none";
                        if (courseSelect) courseSelect.value = courseID;
                        if (yearSelect) yearSelect.value = yearLevel;
                        loadSubjects();
                        resetSubjectModal();
                    }
                });
            };

            if (deliveryMode === 'ftf') {
                fetch(`../api/checkFTFLimit.php?course_id=${courseID}&year_level=${yearLevel}`)
                    .then(r => r.json())
                    .then(data => {
                        if (data.count >= 4) {
                            if (confirm(`WARNING: Limit reached (${data.count}). Proceed?`)) executeSave();
                        } else {
                            executeSave();
                        }
                    });
            } else {
                executeSave();
            }
        });
    }

    function resetSubjectModal() {
        document.getElementById("editSubjectId").value = "";
        document.getElementById("subCode").value = "";
        document.getElementById("subDesc").value = "";
        document.getElementById("subjectModalTitle").textContent = "Add Subject";
        document.getElementById("pref_online").checked = false;
        document.getElementById("pref_ftf").checked = false;
        document.getElementById("semesterSelect").value = "1";
        document.getElementById("subUnits").value = "3";
    }

  /************************************************************************
     * ==================================================================== *
     * 4. ROOMS MANAGEMENT                                                  *
     * ==================================================================== *
     ************************************************************************/
    // ====== DATA ======

    
    let rooms = []; // CRITICAL FIX: This was missing and caused the page to crash!
    
    const amenityList = ["Projector", "AC", "WiFi", "Computers", "Smart Board"];
    const amenityIconMap = { Projector: "projector", AC: "wind", WiFi: "wifi", Computers: "monitor", "Smart Board": "zap" };
    const statusColors = { available: "var(--emerald)", occupied: "var(--primary)", maintenance: "var(--amber)", reserved: "var(--blue)" };
    const statusLabels = { available: "Available", occupied: "Occupied", maintenance: "Maintenance", reserved: "Reserved" };

    let alerts = []; 
    let reservations = []; 

    function updateIcons() {
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    async function fetchRooms() {
            try {
                const response = await fetch('../api/getRooms.php');
                const result = await response.json();
                
                // CRITICAL FIX: Added Array.isArray check to prevent blank screen crashes
                if (result.success && Array.isArray(result.data)) {
                    rooms = result.data.map(r => ({
                        ...r,
                        status: (r.status || 'available').toLowerCase(),
                        type: (r.type || 'lecture').toLowerCase()
                    }));
                    renderAll(); 
                } else {
                    // If there's no data, just render an empty grid safely
                    rooms = [];
                    renderAll();
                }
            } catch (error) {
                console.error("Fetch Error:", error);
                showToast("System Error", "Could not connect to the API.");
            }
    }

    let viewMode = "grid";
    let lastUpdated = new Date();
    let selectedAmenities = [];

    // ====== UTILS ======

    window.showToast = function(title, desc) {
        let t = document.getElementById("toast");
        
        // Auto-generate the sleek HTML if it is missing from admin.html
        if (!t) {
            t = document.createElement("div");
            t.id = "toast";
            t.className = "toast";
            t.style.zIndex = "9999"; // Force it above all modals
            t.innerHTML = `
                <div style="display: flex; align-items: flex-start; gap: 12px;">
                    <div id="toastIconWrapper" style="margin-top: 2px;">
                        <i data-lucide="check-circle-2" id="toastIcon" style="width: 20px; height: 20px;"></i>
                    </div>
                    <div>
                        <div class="toast-title" id="toastTitle" style="font-weight: 600; font-size: 14px;"></div>
                        <div class="toast-desc" id="toastDesc" style="font-size: 12px; opacity: 0.9; margin-top: 2px;"></div>
                    </div>
                </div>
            `;
            document.body.appendChild(t);
        }

        // Update the text
        document.getElementById("toastTitle").textContent = title;
        document.getElementById("toastDesc").textContent = desc;

        // Dynamic Icon Logic: Green for Success, Red for Delete/Error
        const icon = document.getElementById("toastIcon");
        const titleLower = title.toLowerCase();
        
        if (titleLower.includes("error") || titleLower.includes("deleted") || titleLower.includes("removed")) {
            icon.setAttribute("data-lucide", "trash-2");
            icon.style.color = "var(--destructive)"; // Red
        } else {
            icon.setAttribute("data-lucide", "check-circle-2");
            icon.style.color = "var(--emerald)"; // Green
        }
        
        // Render the new icon
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        // Reset the animation so it works even if clicked multiple times quickly
        t.classList.remove("show");
        void t.offsetWidth; // Trigger browser reflow
        t.classList.add("show");

        // Clear previous timers so it doesn't disappear too fast
        if (window.toastTimer) clearTimeout(window.toastTimer);
        window.toastTimer = setTimeout(() => t.classList.remove("show"), 3000);
    };
    function updateTime() {
        const el = document.getElementById("lastUpdated");
        if(el) el.textContent = lastUpdated.toLocaleTimeString();
    }

    
    // ====== FETCH RESERVATIONS ======
    async function fetchReservations() {
        try {
            const response = await fetch('../api/getReservations.php');
            const result = await response.json();
            
            if (result.success) {
                reservations = result.data || [];
                if (result.alerts) alerts = result.alerts; 
            } else {
                console.error("Backend Error:", result.error);
                reservations = []; // Force empty array if database fails
            }
        } catch (error) { 
            console.error("Reservation Fetch Error:", error); 
            reservations = []; // Force empty array if network crashes
        } finally {
            // CRITICAL FIX: The "finally" block guarantees the tab is ALWAYS drawn!
            // If it succeeds, it draws the list. If it fails, it draws the "No active reservations" box!
            renderReservationsTab(); 
            if (typeof renderAlerts === 'function') renderAlerts(); 
        }
    }

// ====== RENDER RESERVATIONS TAB ======
    window.renderReservationsTab = function() {
        const container = document.getElementById("tab-reservations");
        if (!container) return;

        if (!reservations || reservations.length === 0) {
            container.innerHTML = `<div style="padding:60px; text-align:center; color:var(--muted);"><i data-lucide="calendar-x" style="width:48px;height:48px;margin-bottom:16px;opacity:0.5;"></i><p>No active facility reservations.</p></div>`;
            if (typeof lucide !== 'undefined') lucide.createIcons();
            return;
        }

        container.innerHTML = `<div class="card"><div style="overflow-x:auto"><table class="rooms-table" style="width:100%">
            <thead><tr>
                <th>Event Name</th><th>Room</th><th>Date & Time</th><th>Reserved By</th><th>Status</th>
            </tr></thead>
            <tbody>
                ${reservations.map(res => {
                    // Failsafe so it doesn't crash if conflicts are missing
                    const conflictsHtml = (res.status === 'conflict' && res.conflicts && res.conflicts.length > 0) 
                        ? `<div style="font-size:11px; color:var(--destructive); margin-top:4px;">Displaces: ${res.conflicts.join(", ")}</div>` 
                        : '';
                        
                    return `
                    <tr>
                        <td style="font-weight:600">${res.eventName || res.title || 'Untitled Event'}</td>
                        <td><i data-lucide="map-pin" style="width:12px;height:12px;color:var(--muted)"></i> ${res.roomName || 'Unknown'}</td>
                        <td>
                            <div>${res.date}</div>
                            <div style="font-size:11px;color:var(--muted)">${res.startTime} - ${res.endTime}</div>
                        </td>
                        <td>${res.organizer || res.reservedBy || 'Admin'}</td>
                        <td>
                            ${res.status === 'conflict'
                                ? `<span class="badge badge-critical"><i data-lucide="alert-triangle" style="width:12px;height:12px"></i> Overlap Detected</span>
                                   ${conflictsHtml}`
                                : `<span class="badge" style="background:var(--emerald);color:white;text-transform:capitalize;">${res.status || 'confirmed'}</span>`
                            }
                        </td>
                    </tr>
                `}).join("")}
            </tbody>
        </table></div></div>`;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    };
    // UPDATE this function to call fetchReservations when it finishes
    async function fetchRooms() {
        try {
            const response = await fetch('../api/getRooms.php');
            const result = await response.json();
            
            if (result.success && Array.isArray(result.data)) {
                rooms = result.data.map(r => ({
                    ...r,
                    status: (r.status || 'available').toLowerCase(),
                    type: (r.type || 'lecture').toLowerCase()
                }));
                renderAll(); 
                fetchReservations(); // <--- NEW: Grab reservations right after rooms
            } else {
                rooms = [];
                renderAll();
            }
        } catch (error) {
            console.error("Fetch Error:", error);
            showToast("System Error", "Could not connect to the API.");
        }
    }

    // ====== RENDER STATS ======
    function renderStats() {
        const grid = document.getElementById("statsGrid");
        if (!grid) return;

        const total = rooms.length;
        const available = rooms.filter(r => r.status === "available").length;
        const occupied = rooms.filter(r => r.status === "occupied").length;
        const maintenance = rooms.filter(r => r.status === "maintenance").length;
        const conflicts = reservations.filter(r => r.status === "conflict").length;

        grid.innerHTML = [
            { label:"Total Rooms", value:total, icon:"building-2", color:"var(--primary)" },
            { label:"Available", value:available, icon:"check-circle-2", color:"var(--emerald)" },
            { label:"Occupied", value:occupied, icon:"users", color:"var(--blue)" },
            { label:"Maintenance", value:maintenance, icon:"wrench", color:"var(--amber)" },
            { label:"Conflicts", value:conflicts, icon:"shield-alert", color:"var(--destructive)" },
        ].map(s => `
            <div class="card stat-card">
            <div class="stat-icon" style="background:${s.color}"><i data-lucide="${s.icon}" style="width:20px;height:20px"></i></div>
            <div><div class="stat-value">${s.value}</div><div class="stat-label">${s.label}</div></div>
            </div>
        `).join("");
        updateIcons();
    }

// ====== RENDER ALERT NOTIFICATIONS ======
    window.renderAlerts = function() {
        const list = document.getElementById("alertList");
        if (!list) return;

        let alertItems = [];

        // Scan through the safely loaded rooms
        if (typeof rooms !== 'undefined' && rooms.length > 0) {
            rooms.forEach(room => {
                const hasEvent = room.upcomingReservations && room.upcomingReservations.length > 0;
                const hasClass = room.currentClass !== null && room.currentClass !== undefined && room.currentClass !== "";
                
                if (room.status === 'conflict' || (hasClass && hasEvent)) {
                    // Extract the class name safely so we know who to contact
                    const className = room.currentClass || "an active class";

                    if (room.alerts && room.alerts.length > 0) {
                        room.alerts.forEach(msg => {
                            alertItems.push({ roomName: room.name, text: msg, className: className });
                        });
                    } else if (hasEvent && hasClass) {
                        const evName = room.upcomingReservations[0].eventName || room.upcomingReservations[0].name || "an event";
                        alertItems.push({ 
                            roomName: room.name, 
                            text: `Action Required: '${evName}' is scheduled here while the room is actively occupied by a class.`,
                            className: className
                        });
                    }
                }
            });
        }

        // Update the Notification Badges
        const badge = document.getElementById('alertNewBadge');
        const bellBadge = document.getElementById('alertBadge');
        
        if (alertItems.length === 0) {
            if (badge) badge.style.display = 'none';
            if (bellBadge) bellBadge.style.display = 'none';
            
            list.innerHTML = `
                <div style="padding: 20px 10px; text-align: center; color: var(--muted); font-size: 13px;">
                    <i data-lucide="check-circle" style="width:28px;height:28px;margin-bottom:8px;opacity:0.4;display:inline-block;"></i>
                    <p style="margin:0;">No active conflicts.</p>
                </div>
            `;
            if (typeof lucide !== 'undefined') lucide.createIcons();
            return;
        }

        if (badge) { badge.textContent = alertItems.length + ' New'; badge.style.display = 'inline-block'; }
        if (bellBadge) { bellBadge.textContent = alertItems.length; bellBadge.style.display = 'inline-flex'; }

        // Render the bright red alert boxes WITH the new Contact Button!
        list.innerHTML = alertItems.map((alert, index) => `
            <div style="padding: 12px; background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 6px; font-size: 13px; color: #7f1d1d; display: flex; gap: 10px; align-items: flex-start; margin-bottom: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                <i data-lucide="alert-triangle" style="width:16px;height:16px;color:#ef4444;flex-shrink:0;margin-top:2px;"></i>
                <div style="flex-grow: 1;">
                    <strong style="display:block; margin-bottom: 3px; font-size: 14px;">Conflict in ${alert.roomName}</strong>
                    <span style="opacity: 0.9; line-height: 1.4;">${alert.text}</span>
                    
                    <div style="margin-top: 10px;">
                        <button onclick="requestTeacherResolution('${alert.roomName}', '${alert.className}')" style="background: #ef4444; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 5px;">
                            <i class="fa-solid fa-paper-plane"></i> Contact Affected Teacher
                        </button>
                    </div>
                </div>
            </div>
        `).join("");

        if (typeof lucide !== 'undefined') lucide.createIcons();
    };

    // --- NEW FUNCTION: Safely triggers Step 2 ---
    window.requestTeacherResolution = function(roomName, className) {
        // For now, this just proves the button works. 
        // In Step 2, we will replace this alert with the actual notification API!
        alert(`STEP 1 SUCCESS! \n\nNext, this will send a direct notification to the teacher of [${className}] in [${roomName}], asking them to Go Online or Relocate.`);
    };


    // --- STEP 2: The Real Notification API Trigger ---
    window.requestTeacherResolution = async function(roomName, className) {
        // Grab the button that was clicked
        const btn = event.currentTarget;
        const originalText = btn.innerHTML;
        
        // Give the admin a cool visual loading effect
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Sending...`;
        btn.disabled = true;

        try {
            // Send the data safely to our new PHP file
            // Inside requestTeacherResolution in app.js
            const response = await fetch('../api/notifyTeacherConflict.php', { // Ensure the two dots are there
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomName: roomName, className: className })
            });
            const result = await response.json();

            if (result.success) {
                // Change the button to a green success state!
                btn.innerHTML = `<i class="fa-solid fa-check"></i> Teacher Notified!`;
                btn.style.background = "#10b981"; // Emerald Green
                btn.style.boxShadow = "0 0 10px rgba(16, 185, 129, 0.4)";
                
                // Confirm Step 2 is finished
                setTimeout(() => {
                    alert(`STEP 2 COMPLETE!\n\nAn official 'Action Required' request has been logged in the database for the teacher of [${className}]. \n\nWhenever you are ready, let me know and we will jump to Step 3 (The Teacher Portal)!`);
                }, 400);
            } else {
                alert("Error sending notification: " + result.error);
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        } catch (error) {
            console.error("Error:", error);
            alert("Network error while contacting teacher.");
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    };



    // ====== RENDER ROOMS (Grid) ======
   
    function renderRoomsGrid(filtered) {
        return `<div class="rooms-grid">${filtered.map(room => {
            const sc = statusColors[room.status] || "var(--muted)";
            const safeAmenities = Array.isArray(room.amenities) ? room.amenities : [];
            const roomName = room.name || room.room_name || "Unknown Room";
            const bldg = room.building || "No Building";
            const type = room.type || "lecture";
            
            return `
            <div class="card room-card">
                <div class="status-bar" style="background:${sc}"></div>
                <div class="room-header">
                <div>
                    <div class="room-title-wrapper" style="display:flex; align-items:center; gap:5px; position:relative;">
                        <div class="room-name">${roomName}</div>
                        <button class="btn btn-ghost btn-icon-sm" onclick="toggleRoomDropdown(event, '${room.id}')" style="padding:2px; height:auto; color:var(--muted);">
                            <i data-lucide="chevron-down" style="width:16px;height:16px"></i>
                        </button>
                        
                        <div class="room-dropdown-menu" id="dropdown-${room.id}" style="display:none; position:absolute; top:100%; left:0; background:white; border:1px solid #e2e8f0; border-radius:6px; box-shadow:0 4px 12px rgba(0,0,0,0.1); z-index:100; min-width:120px; flex-direction:column; overflow:hidden;">
                            <button onclick="openEditRoomModal('${room.id}')" style="padding:8px 12px; background:none; border:none; text-align:left; cursor:pointer; font-size:13px; display:flex; align-items:center; gap:8px; width:100%; border-bottom:1px solid #f1f5f9; color:var(--foreground);">
                                <i data-lucide="edit" style="width:14px;height:14px;color:#2980b9;"></i> Edit
                            </button>
                            <button onclick="deleteRoomDB('${room.id}')" style="padding:8px 12px; background:none; border:none; text-align:left; cursor:pointer; font-size:13px; display:flex; align-items:center; gap:8px; width:100%; color:#ef4444;">
                                <i data-lucide="trash-2" style="width:14px;height:14px;"></i> Delete
                            </button>
                        </div>
                    </div>
                    <div class="room-location"><i data-lucide="map-pin" style="width:12px;height:12px"></i> ${bldg} · Floor ${room.floor || 1}</div>
                </div>
                <span class="badge badge-${room.status}"><span class="status-dot" style="background:${sc}"></span> ${statusLabels[room.status] || room.status}</span>
                </div>
                <div class="room-body">
                <div class="room-row"><span class="label"><i data-lucide="users" style="width:14px;height:14px"></i> Capacity</span><span style="font-weight:500">${room.capacity || 30}</span></div>
                <div class="room-row"><span class="label">Type</span><span class="badge badge-secondary capitalize">${type}</span></div>
                
                <div style="margin: 12px 0; display: flex; flex-direction: column; gap: 8px;">
                    
                    ${room.currentClass ? `
                        <div class="current-use" style="border-left: 3px solid var(--primary); padding-left: 8px; background: transparent;">
                        <span style="font-size:10px; text-transform:uppercase; color:var(--primary); font-weight:700; letter-spacing:0.5px;">Currently Occupied By</span>
                        <p class="class-name" style="margin:2px 0;">${room.currentClass}</p>
                        ${room.nextAvailable ? `<p class="time" style="margin:0;"><i data-lucide="clock" style="width:12px;height:12px"></i> Free at ${room.nextAvailable}</p>` : ""}
                        </div>
                    ` : ""}

                    ${/* CRITICAL FIX: Changed from upcomingReservations to reservations! */ ""}
                    ${room.reservations && room.reservations.length > 0 ? `
                        <div class="current-use reservations-scroll-box" style="background: #f0fdf4; border: 1px solid #22c55e; padding: 0 8px 8px 8px; border-radius: 6px; max-height: 115px; overflow-y: auto;">
                            
                            <div style="position: sticky; top: 0; background: #f0fdf4; padding-top: 8px; padding-bottom: 4px; z-index: 10;">
                                <span style="font-size:10px; text-transform:uppercase; color:#16a34a; font-weight:700; letter-spacing:0.5px;">Reserved Events (${room.reservations.length})</span>
                            </div>

                            <div style="display: flex; flex-direction: column; gap: 8px;">
                            ${room.reservations.map((res, index) => {
                                const eName = res.eventName || res.title || res.event_name || "Event";
                                const eTime = res.startTime ? res.startTime.substring(0,5) : "TBA";
                                return `
                                <div style="${index !== room.reservations.length - 1 ? 'border-bottom: 1px solid #dcfce7; padding-bottom: 6px;' : ''}">
                                    <p class="class-name" style="margin:0 0 2px 0; font-size:13px; color:#166534; font-weight: 600;">${eName}</p>
                                    <p class="time" style="margin:0; font-size: 11px; color:#15803d;"><i data-lucide="calendar-check" style="width:11px;height:11px"></i> ${eTime}</p>
                                </div>
                                `;
                            }).join("")}
                            </div>
                        </div>
                    ` : `
                        <div style='font-size: 12px; color: #888; margin-top: 5px; text-align: center; padding: 10px; background: #f8fafc; border-radius: 6px; border: 1px dashed #e2e8f0;'>
                            <em>No upcoming events</em>
                        </div>
                    `}

                </div>

                <div class="amenities-row">
                    ${safeAmenities.map(a => `<span class="amenity-icon" title="${a}"><i data-lucide="${amenityIconMap[a] || 'zap'}" style="width:14px;height:14px"></i></span>`).join("")}
                </div>
                <div class="room-actions">
                    <select onchange="changeStatus('${room.id}', this.value)">
                    ${["available","occupied","maintenance","reserved"].map(s => `<option value="${s}" ${room.status === s ? "selected" : ""}>${statusLabels[s]}</option>`).join("")}
                    </select>
                </div>
                </div>
            </div>
            `;
        }).join("")}</div>`;
    }
    // ====== RENDER FLOOR VIEW ======
    window.renderFloorView = function() {
        const container = document.getElementById("tab-floor-view");
        if (!container) return;

        if (!rooms || rooms.length === 0) {
            container.innerHTML = `<div style="padding:60px; text-align:center; color:var(--muted);"><i data-lucide="layers" style="width:48px;height:48px;margin-bottom:16px;opacity:0.5;"></i><p>No rooms available for floor view.</p></div>`;
            if (typeof lucide !== 'undefined') lucide.createIcons();
            return;
        }

        // 1. Safely Group all rooms by Building, then by Floor
        const grouped = {};
        rooms.forEach(r => {
            const b = r.building || "Main Building";
            const f = r.floor || 1;
            if (!grouped[b]) grouped[b] = {};
            if (!grouped[b][f]) grouped[b][f] = [];
            grouped[b][f].push(r);
        });

        let html = '';

        // 2. Loop through each Building
        for (const building of Object.keys(grouped).sort()) {
            html += `<h2 style="margin: 24px 0 16px; color: var(--foreground); font-size: 1.25rem; display: flex; align-items: center; gap: 8px;">
                        <i data-lucide="building-2" style="width:24px;height:24px; color: var(--primary);"></i> ${building}
                     </h2>`;

            // Sort floors numerically
            const floors = Object.keys(grouped[building]).sort((a, b) => parseInt(a) - parseInt(b));

            // 3. Loop through each Floor in the Building
            floors.forEach(floor => {
                html += `
                <div class="card" style="margin-bottom: 24px; border-left: 4px solid var(--primary); overflow: hidden;">
                    <div style="padding: 12px 20px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
                        <h3 style="margin:0; font-size: 1.1rem; color: #334155;">Floor ${floor}</h3>
                        <span style="font-size: 12px; color: #64748b; font-weight: 600;">${grouped[building][floor].length} Rooms</span>
                    </div>
                    <div style="padding: 20px; display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; background: #ffffff;">
                `;

                // 4. CRITICAL FIX: Safe Sorting prevents "localeCompare" fatal crashes!
                const floorRooms = grouped[building][floor].sort((a, b) => 
                    String(a.name || "").localeCompare(String(b.name || ""), undefined, {numeric: true})
                );

                // 5. Draw each individual Room Card
                floorRooms.forEach(room => {
                    const sc = statusColors[room.status] || "var(--muted)";
                    const roomName = room.name || "Unnamed Room";
                    const capacity = room.capacity || 0;
                    const type = room.type || "lecture";
                    const currentUse = room.currentClass;
                    
                    // Adapt to our new Array format for reservations
                    const hasUpcomingRes = room.reservations && room.reservations.length > 0;
                    const upcomingResText = hasUpcomingRes ? (room.reservations[0].eventName || room.reservations[0].title || "Event") : null;
                    
                    html += `
                        <div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background: #fff; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.02);" 
                             onclick="openEditRoomModal('${room.id}')" 
                             onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 8px 16px rgba(0,0,0,0.08)';" 
                             onmouseout="this.style.transform='none'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.02)';">
                            
                            <div style="background: ${sc}; padding: 10px 14px; color: #fff; display: flex; justify-content: space-between; align-items: center;">
                                <span style="font-weight: 700; font-size: 14px;">${roomName}</span>
                                <span style="font-size: 10px; text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px;">${statusLabels[room.status] || room.status}</span>
                            </div>
                            
                            <div style="padding: 14px;">
                                <div style="display: flex; align-items: center; gap: 8px; font-size: 12px; color: #64748b; margin-bottom: 12px;">
                                    <i data-lucide="users" style="width:14px;height:14px;"></i> Capacity: ${capacity}
                                    <span style="color: #cbd5e1;">|</span>
                                    <span class="capitalize">${type}</span>
                                </div>
                                
                                <div style="font-size: 13px; font-weight: 600; min-height: 20px; display: flex; align-items: center; gap: 6px;">
                                    ${currentUse ? 
                                        `<i data-lucide="book-open" style="width:14px;height:14px; color: var(--primary);"></i> <span style="color: var(--primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${currentUse}</span>` : 
                                      (hasUpcomingRes ? 
                                        `<i data-lucide="calendar-check" style="width:14px;height:14px; color: var(--emerald);"></i> <span style="color: var(--emerald); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${upcomingResText}</span>` :
                                      (room.status === 'maintenance' ? 
                                        `<i data-lucide="wrench" style="width:14px;height:14px; color: var(--amber);"></i> <span style="color: var(--amber);">Under Repair</span>` : 
                                        `<i data-lucide="check-circle" style="width:14px;height:14px; color: #94a3b8;"></i> <span style="color: #94a3b8;">No Active Class</span>`))}
                                </div>
                            </div>
                        </div>
                    `;
                });

                html += `</div></div>`;
            });
        }

        container.innerHTML = html;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    };
    // ====== RENDER ROOMS (List) ======
    function renderRoomsList(filtered) {
        return `<div class="card"><div style="overflow-x:auto"><table class="rooms-table">
        <thead><tr>
            <th>Room</th><th>Location</th><th>Type</th><th class="text-center">Capacity</th><th>Status</th><th>Current Use</th><th class="text-center">Actions</th>
        </tr></thead>
        <tbody>${filtered.map(room => {
            const sc = statusColors[room.status] || "var(--muted)";
            return `<tr>
            <td style="font-weight:500">${room.name}</td>
            <td style="color:var(--muted)">${room.building} · F${room.floor}</td>
            <td><span class="badge badge-secondary capitalize">${room.type}</span></td>
            <td class="text-center">${room.capacity}</td>
            <td><span class="badge badge-${room.status}"><span class="status-dot" style="background:${sc}"></span> ${statusLabels[room.status] || room.status}</span></td>
            <td style="color:var(--muted);font-size:.75rem">${room.currentClass || "—"}</td>
            <td><div class="actions-cell" style="justify-content:center">
                <select onchange="changeStatus('${room.id}', this.value)">
                ${["available","occupied","maintenance","reserved"].map(s => `<option value="${s}" ${room.status === s ? "selected" : ""}>${statusLabels[s]}</option>`).join("")}
                </select>
                <button class="btn btn-ghost btn-icon-sm btn-destructive-ghost" onclick="deleteRoom('${room.id}')"><i data-lucide="trash-2" style="width:14px;height:14px"></i></button>
            </div></td>
            </tr>`;
        }).join("")}</tbody>
        </table></div></div>`;
    }

    // ====== FILTER & RENDER ALL ROOMS ======
    function getFilteredRooms() {
        const searchEl = document.getElementById("searchInput");
        const statusEl = document.getElementById("filterStatus");
        if(!searchEl || !statusEl) return rooms;

        const q = searchEl.value.toLowerCase();
        const s = statusEl.value;
        return rooms.filter(r => {
            const matchSearch = r.name.toLowerCase().includes(q) || r.building.toLowerCase().includes(q);
            const matchStatus = s === "all" || r.status === s;
            return matchSearch && matchStatus;
        });
    }

    function renderAllRooms() {
        const container = document.getElementById("tab-all-rooms");
        if (!container) return;
        const filtered = getFilteredRooms();
        container.innerHTML = viewMode === "grid" ? renderRoomsGrid(filtered) : renderRoomsList(filtered);
        updateIcons();
    }

    function renderAll() {
        renderStats();
        renderAlerts();
        renderAllRooms();
        if (typeof renderFloorView === "function") renderFloorView();
        checkRoomConflicts(); 
        updateTime();
        updateIcons();
    }


 
    
    // ====== ACTIONS ======
     
    window.toggleRoomDropdown = function(event, id) {
        event.stopPropagation();
        // Hide all other open dropdowns first
        document.querySelectorAll('.room-dropdown-menu').forEach(menu => {
            if (menu.id !== `dropdown-${id}`) menu.style.display = 'none';
        });
        const menu = document.getElementById(`dropdown-${id}`);
        if (menu) menu.style.display = menu.style.display === 'none' ? 'flex' : 'none';
    };

    // Close menus if user clicks anywhere outside
    document.addEventListener('click', () => {
        document.querySelectorAll('.room-dropdown-menu').forEach(menu => menu.style.display = 'none');
    });

    // Handle Edit Modal Population
    window.openEditRoomModal = function(id) {
        const room = rooms.find(r => r.id == id);
        if (!room) return;

        const modalEl = document.getElementById("addRoomModal"); 
        if(!modalEl) return;
        
        document.getElementById("roomModalTitle").textContent = "Edit Room"; 
        
        // Setup hidden input for ID
        let hiddenId = document.getElementById("editRoomId");
        if (!hiddenId) {
            hiddenId = document.createElement("input");
            hiddenId.type = "hidden";
            hiddenId.id = "editRoomId";
            modalEl.querySelector(".modal-content").prepend(hiddenId);
        }
        hiddenId.value = room.id;

        // Fill data
        document.getElementById("newRoomName").value = room.name || "";
        document.getElementById("newRoomBuilding").value = room.building || "Main Building";
        document.getElementById("newRoomFloor").value = room.floor || 1;
        document.getElementById("newRoomCapacity").value = room.capacity || 30;

        if (document.getElementById("newRoomDepartment")) document.getElementById("newRoomDepartment").value = room.department || "SHARED";

        const typeSelect = document.getElementById("newRoomType");
        if (typeSelect) {
            Array.from(typeSelect.options).forEach(opt => {
                if (opt.value.toLowerCase() === (room.type || "lecture").toLowerCase()) opt.selected = true;
            });
        }

        // CRITICAL FIX: Use the standard display logic for the thesis
        modalEl.classList.remove("hidden");
        modalEl.style.display = "flex";
        
        // Populate amenities
        renderAmenityToggles();
        selectedAmenities = Array.isArray(room.amenities) ? [...room.amenities] : [];
        document.querySelectorAll(".amenity-toggle").forEach(btn => {
            if (selectedAmenities.includes(btn.dataset.amenity)) btn.classList.add("selected");
        });
    };

    // Replace old Add/Save Room Logic safely
    const oldConfirmBtn = document.getElementById("confirmAddRoom");
    if (oldConfirmBtn) {
        const newConfirmBtn = oldConfirmBtn.cloneNode(true);
        oldConfirmBtn.parentNode.replaceChild(newConfirmBtn, oldConfirmBtn);
        
        newConfirmBtn.addEventListener("click", async () => {
            const editId = document.getElementById("editRoomId")?.value;
            const name = document.getElementById("newRoomName").value.trim();
            const building = document.getElementById("newRoomBuilding").value;
            const floor = parseInt(document.getElementById("newRoomFloor").value) || 1;
            const capacity = parseInt(document.getElementById("newRoomCapacity").value) || 30;
            const type = document.getElementById("newRoomType").value;
            const department = document.getElementById("newRoomDepartment") ? document.getElementById("newRoomDepartment").value : "SHARED";

            if (!name) return showToast("Error", "Room Name is required.");

            const payload = { name, building, floor, capacity, type, department };
            const endpoint = editId ? '../api/editRoom.php' : '../api/addRoom.php';
            if (editId) payload.id = editId;

            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const result = await response.json();
                
                if (result.success || result.status === 'success') {
                    showToast("Success", editId ? "Room updated successfully." : "Room added successfully.");
                    const modalEl = document.getElementById("addRoomModal");
                    modalEl.classList.add("hidden");
                    modalEl.style.display = "none";
                    fetchRooms(); // Refresh the grid
                } else {
                    alert("Database Error: " + (result.error || result.message));
                }
            } catch (error) {
                console.error("Save Error:", error);
                showToast("System Error", "Could not connect to API.");
            }
        });
    }

    // Fix the "Add Room" button so it clears the Edit ID when adding a NEW room
    const oldAddRoomBtn = document.getElementById("addRoomBtn");
    if (oldAddRoomBtn) {
        const newAddRoomBtn = oldAddRoomBtn.cloneNode(true);
        oldAddRoomBtn.parentNode.replaceChild(newAddRoomBtn, oldAddRoomBtn);
        
        newAddRoomBtn.addEventListener("click", () => {
            const modalEl = document.getElementById("addRoomModal");
            document.getElementById("roomModalTitle").textContent = "Add New Room";
            
            const hiddenId = document.getElementById("editRoomId");
            if (hiddenId) hiddenId.value = ""; 
            
            document.getElementById("newRoomName").value = "";
            document.getElementById("newRoomCapacity").value = "30";
            if (document.getElementById("newRoomDepartment")) document.getElementById("newRoomDepartment").value = "SHARED";
            selectedAmenities = [];
            renderAmenityToggles();
            
            modalEl.classList.remove("hidden");
            modalEl.style.display = "flex";
        });
    }

    // Handle Secure Database Deletion
    window.deleteRoomDB = async function(id) {
        if (!confirm("Are you sure you want to archive this room and its schedules?")) return;

        try {
            const response = await fetch('../api/deleteRoom.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // Sending both just to be 100% safe with all PHP versions
                body: JSON.stringify({ id: id, room_id: id }) 
            });
            
            const result = await response.json();
            
            if (result.status === 'success') {
                showToast("Archived", result.message); // Will now show "Archived room and X schedules"
                fetchRooms(); // Refresh the main grid
                if (window.loadArchivedRooms) loadArchivedRooms(); // Refresh the archive list if open
            } else {
                alert("Error: " + (result.message || "Unknown error occurred"));
            }
        } catch (error) {
            console.error("Delete Error:", error);
            showToast("Error", "Connection error while archiving.");
        }
    };

    window.changeStatus = async function(id, newStatus) {
        try {
            // 1. Send the new status to our backend API
            const response = await fetch('../api/updateRoomStatus.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: id, status: newStatus })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // 2. Show the beautiful green checkmark toast
                showToast("Status Updated", `Room status successfully changed to ${newStatus}.`);
                
                // 3. Fetch fresh data from the database so the colors and UI update perfectly
                if (typeof fetchRooms === "function") {
                    fetchRooms();
                }
            } else {
                alert("Database Error: " + (result.error || result.message));
                // Revert the dropdown visually if the database failed
                if (typeof fetchRooms === "function") fetchRooms();
            }
        } catch (error) {
            console.error("Status Update Error:", error);
            showToast("System Error", "Could not connect to the API to update status.");
            if (typeof fetchRooms === "function") fetchRooms();
        }
    };


   
    
    // Tabs Mapping
    // ====== TAB NAVIGATION & AUTO-FETCH ======
    document.querySelectorAll(".tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            // 1. Remove active states from all tabs
            document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
            document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
            
            // 2. Add active state to the clicked tab
            btn.classList.add("active");
            const target = document.getElementById("tab-" + btn.dataset.tab);
            
            if (target) {
                target.classList.add("active");
                
                // 3. CRITICAL FIX: Force data to render immediately when switching tabs
                if (btn.dataset.tab === "reservations") {
                    if (typeof fetchReservations === "function") fetchReservations();
                } else if (btn.dataset.tab === "floor-view") {
                    if (typeof renderFloorView === "function") renderFloorView(); // Forces the UI to paint the grid!
                }
            }
        });
    });

    // Search & Filter
    const searchInputEl = document.getElementById("searchInput");
    if(searchInputEl) searchInputEl.addEventListener("input", renderAllRooms);
    
    const filterStatusEl = document.getElementById("filterStatus");
    if(filterStatusEl) filterStatusEl.addEventListener("change", renderAllRooms);

    // View toggle
    const gridViewBtn = document.getElementById("gridViewBtn");
    const listViewBtn = document.getElementById("listViewBtn");
    
    if(gridViewBtn) {
        gridViewBtn.addEventListener("click", () => {
            viewMode = "grid";
            gridViewBtn.classList.add("active");
            if(listViewBtn) listViewBtn.classList.remove("active");
            renderAllRooms();
        });
    }
    
    if(listViewBtn) {
        listViewBtn.addEventListener("click", () => {
            viewMode = "list";
            listViewBtn.classList.add("active");
            if(gridViewBtn) gridViewBtn.classList.remove("active");
            renderAllRooms();
        });
    }

    // Alert panel toggles
    const alertsBtn = document.getElementById("alertsBtn");
    if(alertsBtn) {
        alertsBtn.addEventListener("click", () => document.getElementById("alertPanel")?.classList.toggle("hidden"));
    }
    const closeAlerts = document.getElementById("closeAlertPanel");
    if(closeAlerts) {
        closeAlerts.addEventListener("click", () => document.getElementById("alertPanel")?.classList.add("hidden"));
    }

    // Refresh
    const refreshBtn = document.getElementById("refreshBtn");
    if(refreshBtn) {
        refreshBtn.addEventListener("click", () => {
            showToast("Refreshing...", "Fetching latest room data.");
            fetchRooms(); // Actually fetch fresh data instead of just local update
        });
    }

    // Add Room Modal specific logic
    function renderAmenityToggles() {
        selectedAmenities = [];
        const toggleContainer = document.getElementById("amenityToggles");
        if(toggleContainer) {
            toggleContainer.innerHTML = amenityList.map(a =>
                `<button type="button" class="amenity-toggle" data-amenity="${a}" onclick="toggleAmenity(this, '${a}')">
                <i data-lucide="${amenityIconMap[a]}" style="width:12px;height:12px"></i> ${a}
                </button>`
            ).join("");
            updateIcons();
        }
    }

    // We have to bind toggleAmenity to the global window object since it's called via inline onclick
    window.toggleAmenity = function(btn, amenity) {
        if (selectedAmenities.includes(amenity)) {
            selectedAmenities = selectedAmenities.filter(a => a !== amenity);
            btn.classList.remove("selected");
        } else {
            selectedAmenities.push(amenity);
            btn.classList.add("selected");
        }
    };



    
    //  ROOM CONFLICT MANAGER (Banner & Actions)
  
    window.checkRoomConflicts = async function() {
        try {
            // Fetch conflicts specifically for the action banner
            const response = await fetch('../api/getConflicts.php');
            const data = await response.json();
            
            const alertContainer = document.getElementById('conflictAlertContainer');
            const messageEl = document.getElementById('conflictAlertMessage');
            const btnContainer = document.getElementById('conflictActionButtons');
            
            if (!alertContainer) return;

            let conflicts = Array.isArray(data) ? data : (data.data || []);

            if (conflicts.length > 0) {
                // We have a conflict! Show the banner
                const conflict = conflicts[0]; // Handle the first immediate conflict
                
                alertContainer.style.display = 'flex';
                
                const roomName = conflict.room_name || conflict.room || "A room";
                const eventName = conflict.event_name || conflict.title || "a Campus Event";
                
                messageEl.innerHTML = `<strong>${roomName}</strong> is booked for "<strong>${eventName}</strong>", overlapping with a scheduled class!`;
                
                // Inject the Relocate and Online buttons
                btnContainer.innerHTML = `
                    <button onclick="resolveConflict(${conflict.schedule_id || conflict.id}, 'relocate')" class="btn" style="background:white; color:#1e293b; border:1px solid #ccc; padding: 8px 12px; font-size:13px; border-radius: 6px; cursor: pointer; font-weight:600;">
                        <i data-lucide="map-location-dot" style="width:14px;height:14px;display:inline-block;margin-right:4px;"></i> Relocate
                    </button>
                    <button onclick="resolveConflict(${conflict.schedule_id || conflict.id}, 'online')" class="btn" style="background:#ef4444; color:white; border:none; padding: 8px 12px; font-size:13px; border-radius: 6px; cursor: pointer; font-weight:600;">
                        <i data-lucide="laptop" style="width:14px;height:14px;display:inline-block;margin-right:4px;"></i> Move to Online
                    </button>
                `;
                
                if (typeof lucide !== 'undefined') lucide.createIcons();
            } else {
                // No conflicts! Hide the banner completely
                alertContainer.style.display = 'none';
            }
        } catch (err) {
            console.error("Conflict Checker Error:", err);
        }
    };

    window.resolveConflict = async function(scheduleId, actionType) {
        if (!scheduleId) return showToast("Error", "Missing Schedule ID.");

        let newRoomId = 0; // 0 represents Online / TBA in your database

        if (actionType === 'online') {
            if(!confirm("Are you sure you want to move this class to Online?")) return;
            newRoomId = 0; 
        } 
        else if (actionType === 'relocate') {
            const promptRoom = prompt("Please enter the NEW Room ID for this class:");
            if(!promptRoom) return; 
            newRoomId = promptRoom;
        }

        try {
            // Update the schedule using your existing endpoint
            const response = await fetch('../api/editRoom.php', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ schedule_id: scheduleId, room_id: newRoomId })
            });
            const data = await response.json();
            
            if (data.success || data.status === 'success') {
                showToast("Resolved", "Class schedule successfully updated!");
                
                // Refresh everything so the banner disappears and the grid updates
                checkRoomConflicts(); 
                fetchRooms(); 
            } else {
                alert("Database Error: " + (data.message || data.error));
            }
        } catch (err) {
            showToast("Network Error", "Could not save the schedule change.");
        }
    };
   
    /************************************************************************
     * ==================================================================== *
     * 5. TEACHERS MANAGEMENT                                               *
     * ==================================================================== *
     ************************************************************************/

    const teachers_body = document.getElementById("teachers_body");
    const teacher_search = document.getElementById("teacherSearch");
    const teacher_department_filter = document.getElementById("teacher_department_filter");

    // --- LOAD SUBJECTS FOR THE TEACHER MODAL CHECKBOXES ---
    const tsSearch = document.getElementById("ts_search");
    const tsCourse = document.getElementById("ts_filter_course");
    const tsYear = document.getElementById("ts_filter_year");
    const tsList = document.getElementById("teacher_subject_list");

    function renderTeacherSubjects() {
        if (!tsList) return;
        
        fetch(`../api/getAllSubjects.php?semester=${activeSemester}`)
            .then(res => res.json())
            .then(data => {
                let filteredData = data;
                
                if (tsSearch && tsSearch.value.trim() !== "") {
                    const q = tsSearch.value.toLowerCase().trim();
                    filteredData = filteredData.filter(s => 
                        (s.code && s.code.toLowerCase().includes(q)) || 
                        (s.subject_description && s.subject_description.toLowerCase().includes(q))
                    );
                }
                
                if (tsCourse && tsCourse.value !== "") {
                    const selectedCourse = String(tsCourse.value);
                    filteredData = filteredData.filter(s => {
                        if (!s.course_ids) return false;
                        const idsArray = String(s.course_ids).split(',');
                        return idsArray.includes(selectedCourse) || idsArray.includes('SHARED');
                    });
                }
                
                if (tsYear && tsYear.value !== "") {
                    const selectedYear = String(tsYear.value);
                    filteredData = filteredData.filter(s => {
                        if (!s.year_levels) return false;
                        const yearsArray = String(s.year_levels).split(',');
                        return yearsArray.includes(selectedYear);
                    });
                }
                
                tsList.innerHTML = "";
                if (filteredData.length === 0) {
                    tsList.innerHTML = "<p style='padding:10px; color:#888; font-size:12px;'>No subjects match your filter.</p>";
                    return;
                }
                
                filteredData.forEach(sub => {
                    tsList.innerHTML += `
                        <label style="display:block; margin: 8px 0; color: #444; font-size: 13px;">
                            <input type="checkbox" class="pref-subject-cb auto-width" value="${sub.id}">
                            <strong>${sub.code}</strong> - ${sub.subject_description}
                        </label>
                    `;
                });
            })
            .catch(err => {
                console.error("Error loading subjects for teacher:", err);
                tsList.innerHTML = "<p style='color:red;'>Failed to load subjects.</p>";
            });
    }

    if (tsSearch) tsSearch.addEventListener("input", renderTeacherSubjects);
    if (tsCourse) tsCourse.addEventListener("change", renderTeacherSubjects);
    if (tsYear) tsYear.addEventListener("change", renderTeacherSubjects);


    window.load_teachers = function () {
        const q = teacher_search ? teacher_search.value.trim() : "";
        const dept = teacher_department_filter ? teacher_department_filter.value : "";
        const params = new URLSearchParams();
        if (q) params.append("q", q);
        if (dept) params.append("department", dept);

        fetch(`../api/getTeachers.php?${params.toString()}`)
            .then(r => r.json())
            .then(data => {
                if(!teachers_body) return;
                teachers_body.innerHTML = "";

                if (!Array.isArray(data) || data.length === 0) {
                    teachers_body.innerHTML = `<tr><td colspan="5">No teachers found.</td></tr>`;
                    return;
                }

              data.forEach(t => {
                    // Clean up the department string to match our CSS classes
                    let safeDept = t.department.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                    // Catch the BSED courses
                    if(t.department.toUpperCase().includes('ENG')) safeDept = 'ENG';
                    if(t.department.toUpperCase().includes('MATH')) safeDept = 'MATH';

                    teachers_body.innerHTML += `
                        <tr>
                            <td>${t.teacher_id}</td>
                            <td>${t.full_name}</td>
                            <td><span class="dept-badge dept-${safeDept}">${t.department}</span></td>
                            <td><strong>${t.computed_hours}</strong> hours</td>
                            <td>
                                <button class="view_teacher_btn action-btn btn-view" data-id="${t.teacher_id}">
                                    <i class="fa-solid fa-eye" style="margin-right: 5px;"></i> View
                                </button>
                            </td>
                        </tr>
                    `;
                });
            });
    }

    if (teacher_search) teacher_search.addEventListener("input", load_teachers);
    if (teacher_department_filter) teacher_department_filter.addEventListener("change", load_teachers);

    function load_teacher_details(teacher_id) {
        fetch(`../api/getTeacher.php?teacher_id=${teacher_id}`)
            .then(r => r.json())
            .then(data => {
                if (!data || !data.teacher_id) return alert("Teacher not found.");
               
                document.getElementById("unselected_teacher_state").style.display = "none";
                document.getElementById("selected_teacher_state").style.display = "flex";
                document.getElementById("detail_teacher_id").textContent = data.teacher_id;
                document.getElementById("detail_teacher_name").textContent = data.full_name || "No name";
                document.getElementById("detail_gender").textContent = data.gender || "-";
                document.getElementById("detail_email").textContent = data.email || "-";
                document.getElementById("detail_phone").textContent = data.phone || "-";
                document.getElementById("detail_department").textContent = data.department || "-";
                document.getElementById("detail_position").textContent = data.position || "-";
                document.getElementById("detail_teaching_load").textContent = data.computed_hours + " hours";

                document.getElementById("edit_teacher_btn").dataset.id = data.teacher_id;
                document.getElementById("delete_teacher_btn").dataset.id = data.teacher_id;


                const avatarDiv = document.querySelector("#selected_teacher_state .avatar");
                if (avatarDiv) {
                    const pic = data.profile_picture ? data.profile_picture : 'default.png';
                    avatarDiv.innerHTML = `<img src="../assets/profiles/${pic}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%; display: block;">`;
                    avatarDiv.style.padding = "0"; 
                    avatarDiv.style.background = "none";
                }
               
            const asList = document.getElementById("assigned_subjects_list");
            if (asList) {
                asList.innerHTML = "";
                if (!data.assigned_subjects || data.assigned_subjects.length === 0) {
                    asList.innerHTML = "<p class='empty-state-message'>No assigned subjects for this term.</p>";
                } else {
                    data.assigned_subjects.forEach(sub => {
                        const btn = document.createElement("div");
                        btn.className = "assigned-subject-btn";
                        btn.innerHTML = `<strong>${sub.code}</strong> <span class="assigned-subject-hours">${sub.total_hours} hrs</span>`;
                        
                        btn.onclick = () => openTeacherSubjectModal(sub);
                        asList.appendChild(btn);
                    });
                }
            }
            });
    }

    function openTeacherSubjectModal(subjectData) {
        document.getElementById("tsModalTitle").textContent = subjectData.description;
        document.getElementById("tsModalCode").textContent = subjectData.code + " (" + subjectData.total_hours + " Total Hours)";
        
        const tbody = document.getElementById("tsModalBody");
        tbody.innerHTML = "";
        
        // Dictionary to map course IDs to names
        const courseNames = { 1: "BSBA", 2: "BSCS", 3: "BSTM", 4: "BSHM", 5: "BEED", 6: "BSED-ENG", 7: "BSED-MATH", 8: "POLSCI" };

        // --- NEW LOGIC: Group identical classes together ---
        const groupedClasses = {};
        
        subjectData.classes.forEach(cls => {
            // Create a unique identifier for the class based on section, time, and room
            const key = `${cls.course}|${cls.year_level}|${cls.section_name}|${cls.time_slot}|${cls.room}`;
            
            if (!groupedClasses[key]) {
                groupedClasses[key] = {
                    course: cls.course,
                    year_level: cls.year_level,
                    section_name: cls.section_name,
                    time_slot: cls.time_slot,
                    room: cls.room || "Online",
                    days: [] // Array to hold the days
                };
            }
            
            // Add the day to our array if it isn't already there
            if (!groupedClasses[key].days.includes(cls.day)) {
                groupedClasses[key].days.push(cls.day);
            }
        });

        // The master order of days so they always sort correctly (e.g. Monday before Wednesday)
        const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

        // Now render the grouped classes!
        Object.values(groupedClasses).forEach(cls => {
            const courseName = courseNames[cls.course] || cls.course || "N/A";
            
            // Convert year (1) to (1st Yr)
            const s = ["th", "st", "nd", "rd"];
            const v = cls.year_level % 100;
            const yearStr = cls.year_level + (s[(v - 20) % 10] || s[v] || s[0]) + " Yr";
            
            // Sort the days chronologically and join them with a comma
            cls.days.sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));
            const daysDisplay = cls.days.join(', ');
            
            tbody.innerHTML += `
                <tr>
                    <td>
                        <span class="ts-modal-course-text">${courseName}</span><br>
                        <span class="ts-modal-section-text">${yearStr} - ${cls.section_name}</span>
                    </td>
                    <td>${daysDisplay}</td>
                    <td>${cls.time_slot}</td>
                    <td>${cls.room}</td>
                </tr>
            `;
        });
        
        const modal = document.getElementById("teacherSubjectModal");
        modal.classList.remove("hidden");
        modal.style.display = "flex";
    }

    // Modal Close Logic
    const closeTsModalBtn = document.getElementById("closeTeacherSubjectModal");
    if (closeTsModalBtn) {
        closeTsModalBtn.addEventListener("click", () => {
            const modal = document.getElementById("teacherSubjectModal");
            modal.classList.add("hidden");
            modal.style.display = "none";
        });
    }

    const save_teacher_btn = document.getElementById("saveTeacher");
    if (save_teacher_btn) {
        save_teacher_btn.addEventListener("click", () => {
            const id = document.getElementById("editTeacherId").value;
            const full_name = document.getElementById("teacher_full_name").value.trim();
            const department = document.getElementById("teacher_department").value;
            const teaching_load = document.getElementById("teacher_teaching_load").value.trim();

            const checkboxes = document.querySelectorAll(".pref-subject-cb:checked");
            const preferredSubjects = Array.from(checkboxes).map(cb => cb.value);
            const isStrict = document.getElementById("teacher_is_strict").checked;
            
            const preferredDayEl = document.getElementById("preferred_day");
            const prefDay = preferredDayEl ? preferredDayEl.value : "Any";

            if (!full_name || !department || !teaching_load) return alert("Name, Department, and Load are required.");

            const payload = {
                full_name, gender: document.getElementById("teacher_gender").value,
                email: document.getElementById("teacher_email").value.trim(),
                phone: document.getElementById("teacher_phone").value.trim(),
                department, position: document.getElementById("teacher_position").value.trim(),
                specialization: document.getElementById("teacher_specialization").value.trim(),
                teaching_load, preferred_subjects: preferredSubjects, is_strict: isStrict,
                preferred_day: prefDay
            };

            if (id) payload.teacher_id = id;
            const url = id ? "../api/editTeacher.php" : "../api/addTeacher.php";

            fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
            .then(r => r.json())
            .then(res => {
                alert(res.message);
                if (res.status === "success") {
                    document.getElementById("addTeacherModal").style.display = "none";
                    load_teachers();
                    resetTeacherModal();
                }
            });
        });
    }

    function resetTeacherModal() {
        document.getElementById("editTeacherId").value = ""; 
        document.getElementById("teacher_full_name").value = "";
        document.getElementById("teacher_email").value = "";
        document.getElementById("teacher_phone").value = "";
        document.getElementById("teacher_position").value = "";
        document.getElementById("teacher_specialization").value = "";
        document.getElementById("teacher_teaching_load").value = "";
        document.getElementById("teacher_is_strict").checked = false;
        if(document.getElementById("preferred_day")) document.getElementById("preferred_day").value = "Any";
        document.querySelectorAll(".pref-subject-cb").forEach(cb => cb.checked = false);
        const title = document.getElementById("teacherModalTitle");
        if(title) title.textContent = "Add Teacher";
    }

   /************************************************************************
     * ==================================================================== *
     * 6. SECTIONS & SCHEDULES                                              *
     * ==================================================================== *
     ************************************************************************/

   function loadSectionsDashboardCounts() {
        // THE FIX: Fetch from getSections.php (which actually calculates the 'Complete' status)
        // We add limit=1000 so it checks every single section, not just the first page!
        fetch("../api/getSections.php?limit=1000")
            .then(res => res.json())
            .then(data => {
                // Safely extract the array whether the API returns raw data or paginated data
                const sectionsList = Array.isArray(data) ? data : (data.sections || []);
                
                const completeCount = sectionsList.filter(sec => 
                    sec.schedule_status_text === 'Complete' || 
                    sec.schedule_status_class === 'status-complete' ||
                    sec.status === 'Complete'
                ).length;
                
                const countComplete = document.getElementById("sections_count_complete");
                if (countComplete) countComplete.textContent = completeCount;
            }).catch(e => console.error("Complete sections error:", e));
    }

    let currentCourseFilter = "";

    document.querySelectorAll('.course-pill').forEach(pill => {
        pill.addEventListener('click', (e) => {
            document.querySelectorAll('.course-pill').forEach(p => p.classList.remove('active'));
            e.target.classList.add('active');
            currentCourseFilter = e.target.dataset.course;
            loadSections(1);
        });
    });

    const getOrdinal = (n) => {
        const s = ["th", "st", "nd", "rd"];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    window.loadSections = function (page = 1) {
        const searchInput = document.getElementById("sectionSearch");
        const search = searchInput ? searchInput.value.trim() : "";
        let url = `../api/getSections.php?page=${page}`;
        if (search) url += `&q=${encodeURIComponent(search)}`;

        fetch(url)
            .then(res => res.json())
            .then(data => {
                const grid = document.getElementById("sectionsGrid");
                if (!grid) return;
                grid.innerHTML = "";

                let filteredSections = Array.isArray(data) ? data : (data.sections || []);

                if (currentCourseFilter !== "") {
                    filteredSections = filteredSections.filter(sec => sec.course == currentCourseFilter);
                }

                if (filteredSections.length === 0) {
                    grid.innerHTML = `<div style="grid-column: 1 / -1; text-align:center; padding: 40px; color:#888;">No sections found.</div>`;
                    const pagination = document.getElementById("sectionPagination");
                    if (pagination) pagination.innerHTML = "";
                    return;
                }

                const courseNames = { 1: "BSBA", 2: "BSCS", 3: "BSTM", 4: "BSHM", 5: "BEED", 6: "BSED-ENG", 7: "BSED-MATH", 8: "POLSCI" };
                
                filteredSections.forEach(sec => {
                    const cName = courseNames[sec.course] || sec.course;
                    const yearLevelStr = getOrdinal(sec.year_level) + " Year";
                    const safeRoom = sec.default_room_id ? sec.default_room_id : 'null';

                    // Notice overflow: visible is added so the dropdown isn't cut off!
                    grid.innerHTML += `
                        <div class="section-card" style="overflow: visible !important;">
                            <div class="section-card-header">
                                <h3 class="section-card-title">
                                    ${cName} - ${sec.section_name}
                                    <span class="status-badge ${sec.schedule_status_class || 'status-incomplete'}">${sec.schedule_status_text || 'Incomplete'}</span>
                                </h3>
                                
                                <div class="section-card-actions" style="position: relative; display: flex; align-items: center; gap: 5px;">
                                    <button class="generateSchedule" data-id="${sec.section_id}" title="Auto-Generate Schedule">
                                        <i class="fa-solid fa-wand-magic-sparkles"></i>
                                    </button>
                                    
                                    <button onclick="toggleSecMenu(${sec.section_id}, event)" style="background:none; border:none; cursor:pointer; color:#64748b; padding:4px 8px; border-radius:50%;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='none'">
                                        <i class="fa-solid fa-ellipsis-vertical"></i>
                                    </button>

                                    <div id="sec-menu-${sec.section_id}" class="hidden" style="position:absolute; top:100%; right:0; background:#fff; box-shadow:0 4px 12px rgba(0,0,0,0.2); border-radius:8px; z-index:9999; padding:5px; display:flex; flex-direction:column; min-width:160px; border:1px solid #e2e8f0; text-align:left;">
                                        <button onclick="manageSectionSubjects(${sec.section_id}, '${sec.section_name}')" style="padding:8px 10px; text-align:left; background:none; border:none; cursor:pointer; font-size:13px; border-radius:6px; color:#334155; width:100%;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='none'"><i class="fa-solid fa-book" style="margin-right:6px; color:#10b981;"></i> Manage Subjects</button>
                                        <button onclick="openEditSecModal(${sec.section_id}, '${sec.section_name}', '${sec.course}', ${sec.year_level}, ${safeRoom})" style="padding:8px 10px; text-align:left; background:none; border:none; cursor:pointer; font-size:13px; border-radius:6px; color:#334155; width:100%;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='none'"><i class="fa-solid fa-pen" style="margin-right:6px; color:#3b82f6;"></i> Edit Section</button>
                                        <button onclick="deleteSec(${sec.section_id})" style="padding:8px 10px; text-align:left; background:none; border:none; cursor:pointer; font-size:13px; color:#ef4444; border-radius:6px; width:100%;" onmouseover="this.style.background='#fee2e2'" onmouseout="this.style.background='none'"><i class="fa-solid fa-trash" style="margin-right:6px;"></i> Delete</button>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="section-card-body">
                                <div class="info-chip">
                                    <i class="fa-solid fa-graduation-cap"></i> 
                                    <span>${yearLevelStr}</span>
                                </div>
                                <div class="info-chip">
                                    <i class="fa-solid fa-book"></i> 
                                    <span><strong>${sec.subjects_count || 0}</strong> Subjects Added</span>
                                </div>
                                <div class="info-chip">
                                    <i class="fa-solid fa-users"></i> 
                                    <span><strong>${sec.students_count || 0}</strong> Students Enrolled</span>
                                </div>
                            </div>
                            
                            <div class="section-card-footer">
                                <button class="viewSchedule view-schedule-btn" data-id="${sec.section_id}" data-name="${sec.section_name}">
                                    <i class="fa-solid fa-calendar-days"></i> View Schedule
                                </button>
                            </div>
                        </div>
                    `;
                });

                if (typeof renderSectionPagination === 'function') {
                    renderSectionPagination(data.total || filteredSections.length, data.limit || 10, data.page || 1);
                }
            });
    }

    if(document.getElementById("sectionSearch")) {
        document.getElementById("sectionSearch").addEventListener("input", () => loadSections(1));
    }

    function renderSectionPagination(total, limit, currentPage) {
        const totalPages = Math.ceil(total / limit);
        const pagContainer = document.getElementById("sectionPagination");
        if (!pagContainer) return;
        pagContainer.innerHTML = "";

        if (totalPages <= 1) return;

        for (let i = 1; i <= totalPages; i++) {
            const btn = document.createElement("button");
            btn.textContent = i;
            btn.className = i === currentPage ? "pagination-btn active" : "pagination-btn";
            btn.addEventListener("click", () => loadSections(i));
            pagContainer.appendChild(btn);
        }
    }

    function loadSubjectsForSection() {
        const course = document.getElementById("sectionCourseSelect").value;
        const year = document.getElementById("sectionYearSelect").value;
        const sectionSubjectsDiv = document.getElementById("sectionSubjects");

        if (!course || !year) return sectionSubjectsDiv.innerHTML = "Select course and year first.";

        fetch(`../api/getSubjects.php?course_id=${course}&year_level=${year}&semester=${activeSemester}`)
            .then(res => res.json())
            .then(data => {
                if (!data.length) return sectionSubjectsDiv.innerHTML = "No subjects available.";
                sectionSubjectsDiv.innerHTML = data.map(sub => `
                    <label style="display:block; margin: 8px 0; color: #444;">
                        <input type="checkbox" class="subject-checkbox" value="${sub.subject_id || sub.id}"> ${sub.subject_description}
                    </label>
                `).join("");
            });
    }

    document.getElementById("sectionCourseSelect")?.addEventListener("change", loadSubjectsForSection);
    document.getElementById("sectionYearSelect")?.addEventListener("change", loadSubjectsForSection);

    const saveSectionBtn = document.getElementById("saveSection");
    if(saveSectionBtn) {
        saveSectionBtn.addEventListener("click", () => {
            const name = document.getElementById("sectionName").value.trim();
            const course = parseInt(document.getElementById("sectionCourseSelect").value);
            const year = parseInt(document.getElementById("sectionYearSelect").value);
            const subjects = [...document.querySelectorAll(".subject-checkbox:checked")].map(cb => parseInt(cb.value));

            if (!name || !course || !year) return alert("Please fill all fields.");
            if (!subjects.length) return alert("Select at least one subject.");

            fetch("../api/addSection.php", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ section_name: name, course, year_level: year, subjects })
            })
            .then(res => res.json())
            .then(data => {
                alert(data.message);
                if (data.status === "success") {
                    document.getElementById("addSectionModal").style.display = "none";
                    loadSections(); 
                }
            });
        });
    }

    function loadSchedule(section_id, sectionName = "", autoOpenEditor = false) {
        const container = document.getElementById("generatedSchedulesContainer");
        if (!container) return;
        container.innerHTML = "";
        
        const gridContainer = document.getElementById("manualEditorGridContainer");
        if(gridContainer) {
            gridContainer.classList.add("hidden");
            gridContainer.style.display = "none"; 
        }
        
        container.classList.remove("hidden");
        document.getElementById("btnSaveScheduleManual").style.display = "none";
        document.getElementById("btnViewAllSections").style.display = "inline-block";
        document.getElementById("activeSectionEditorPill").style.display = "none";
        
        const wrapper = document.createElement("div");
        wrapper.className = "schedule-box-wrapper";
        
        wrapper.innerHTML = `
            <div class="schedule-box-header">
                <h3 class="schedule-box-title">
                    <i class="fa-solid fa-calendar-check"></i> 
                    Schedule: <strong>${sectionName}</strong>
                </h3>
                <button class="edit-manual-btn create-btn" style="background-color: #2980b9; margin: 0; padding: 8px 15px;" data-id="${section_id}" data-name="${sectionName}">
                    <i class="fa-solid fa-pen-to-square"></i> Edit Manually
                </button>
            </div>
            <div class="schedule-table-container">
                <table class="schedule-table-custom">
                    <thead>
                        <tr>
                            <th>Subject</th>
                            <th>Teacher</th>
                            <th>Room</th>
                            <th>Days</th>
                            <th>Time</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
            </div>
        `;
        
        const tbody = wrapper.querySelector("tbody");

        fetch(`../api/getSchedule.php?section_id=${section_id}`)
            .then(res => res.json())
            .then(data => {
                if (!Array.isArray(data) || data.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="5" class="empty-state-message">No schedule has been generated for this section yet.</td></tr>`;
                    container.appendChild(wrapper);
                } else {
                    const grouped = {};
                    data.forEach(r => {
                        const key = `${r.subject}|||${r.teacher_name}|||${r.room_name}|||${r.time_slot}`;
                        if (!grouped[key]) grouped[key] = { subject: r.subject, teacher: r.teacher_name, room: r.room_name, time: r.time_slot, days: [] };
                        if (!grouped[key].days.includes(r.day_of_week)) grouped[key].days.push(r.day_of_week);
                    });

                    function compressDays(daysArray) {
                        const days = daysArray.slice().sort((a,b) => ['Monday','Tuesday','Wednesday','Thursday','Friday'].indexOf(a) - ['Monday','Tuesday','Wednesday','Thursday','Friday'].indexOf(b));
                        const hasAll = (pattern) => pattern.every(d => days.includes(d));
                        if (hasAll(['Monday','Wednesday','Friday'])) return 'MWF';
                        if (hasAll(['Tuesday','Thursday'])) return 'TTH';
                        return days.join(', ');
                    }

                    Object.values(grouped).forEach(item => {
                        tbody.insertAdjacentHTML('beforeend', `
                            <tr>
                                <td class="subj-col">${item.subject}</td>
                                <td>${item.teacher || '-'}</td>
                                <td>${item.room || 'Online'}</td>
                                <td class="day-col">${compressDays(item.days)}</td>
                                <td>${item.time}</td>
                            </tr>
                        `);
                    });
                    container.appendChild(wrapper);
                }

                if (autoOpenEditor) {
                    openManualEditor(section_id, sectionName);
                }
            });
    }

    const btnViewAll = document.getElementById('btnViewAllSections');
    if (btnViewAll) {
        btnViewAll.addEventListener('click', () => {
            const container = document.getElementById("generatedSchedulesContainer");
            document.getElementById("manualEditorGridContainer").classList.add("hidden");
            container.classList.remove("hidden");
            document.getElementById("btnSaveScheduleManual").style.display = "none";
            document.getElementById("btnViewAllSections").style.display = "inline-block";
            document.getElementById("activeSectionEditorPill").style.display = "none";

            const scheduleBoxes = container.querySelectorAll(".schedule-box");
            if (scheduleBoxes.length > 0) {
                scheduleBoxes.forEach(box => {
                    box.style.display = "block";
                    const btn = box.querySelector(".edit-manual-btn");
                    if (btn) btn.style.display = "inline-block";
                });
            } else {
                container.innerHTML = "<p style='text-align:center; color: #888; padding: 40px;'><i class='fa-solid fa-spinner fa-spin'></i> Loading all schedules...</p>";
                fetch('../api/getAllSections.php')
                    .then(res => res.json())
                    .then(sections => {
                        container.innerHTML = "";
                        sections.forEach(section => loadSchedule(section.section_id, section.section_name));
                    });
            }
        });
    }

    // ==========================================
    // --- BULK AUTO-GENERATE LOGIC           ---
    // ==========================================

    const openBulkModalBtn = document.getElementById("openBulkGenerateModal");
    const bulkGenerateModal = document.getElementById("bulkGenerateModal");
    const closeBulkModalBtn = document.getElementById("closeBulkModal");
    const startBulkGenerateBtn = document.getElementById("startBulkGenerateBtn");

    if (openBulkModalBtn) {
        openBulkModalBtn.addEventListener("click", () => {
            bulkGenerateModal.classList.remove("hidden");
            bulkGenerateModal.style.display = "flex";
            document.getElementById("bulkProgressContainer").style.display = "none";
            document.getElementById("bulkProgressBar").style.width = "0%";
            startBulkGenerateBtn.style.display = "block";
            startBulkGenerateBtn.disabled = false;
        });
    }

    if (closeBulkModalBtn) {
        closeBulkModalBtn.addEventListener("click", () => {
            bulkGenerateModal.classList.add("hidden");
            bulkGenerateModal.style.display = "none";
        });
    }

    if (startBulkGenerateBtn) {
        startBulkGenerateBtn.addEventListener("click", async () => {
            const courseId = document.getElementById("bulkCourseSelect").value;
            const yearLevel = document.getElementById("bulkYearSelect").value;

            if (!courseId || !yearLevel) return alert("Please select both a Course and Year Level.");
            if (!confirm("Are you sure? This will delete and overwrite any existing schedules for all sections in this Course and Year Level.")) return;

            startBulkGenerateBtn.disabled = true;
            document.getElementById("bulkProgressContainer").style.display = "block";
            document.getElementById("bulkProgressText").textContent = "Fetching sections...";

            try {
                const res = await fetch(`../api/getAllSections.php?course=${courseId}&year=${yearLevel}`);
                const sections = await res.json();

                if (!sections || sections.length === 0) {
                    document.getElementById("bulkProgressText").textContent = "No sections found for this selection.";
                    startBulkGenerateBtn.disabled = false;
                    return;
                }

                startBulkGenerateBtn.style.display = "none";
                let completed = 0;
                let failedCount = 0;
                const total = sections.length;
                const progressBar = document.getElementById("bulkProgressBar");

                for (let i = 0; i < total; i++) {
                    const sec = sections[i];
                    document.getElementById("bulkProgressText").textContent = `Generating ${sec.section_name} (${i + 1} of ${total})...`;
                    
                    try {
                        const schedRes = await fetch("../api/autoSchedule.php", {
                            method: "POST",
                            headers: {"Content-Type": "application/json"},
                            body: JSON.stringify({ section_id: sec.section_id })
                        });
                        
                        const schedData = await schedRes.json();
                        if (schedData.status === "success") completed++;
                        else failedCount++;
                    } catch (err) {
                        failedCount++;
                    }

                    const percent = Math.round(((i + 1) / total) * 100);
                    if(progressBar) progressBar.style.width = percent + "%";
                }

                let finalMessage = `<span style="color:#28a745;">✅ Successfully generated ${completed} out of ${total} schedules!</span>`;
                if (failedCount > 0) finalMessage += `<br><span style="color:#c83b3b; font-size:12px;">(${failedCount} sections failed or incomplete. Use the single generator to view detailed errors.)</span>`;
                
                document.getElementById("bulkProgressText").innerHTML = finalMessage;
                if (typeof loadSectionsDashboardCounts === "function") loadSectionsDashboardCounts();
                if (typeof loadSections === "function") loadSections(1);

                setTimeout(() => {
                    const bulkModal = document.getElementById("bulkGenerateModal");
                    if(bulkModal) {
                        bulkModal.classList.add("hidden");
                        bulkModal.style.display = "none";
                    }
                }, 3500);

            } catch (err) {
                document.getElementById("bulkProgressText").innerHTML = `<span style="color:red;">An error occurred. Check console.</span>`;
                startBulkGenerateBtn.style.display = "block";
                startBulkGenerateBtn.disabled = false;
            }
        });
    }

    // ==========================================
    // --- MANUAL EDITOR LOGIC                ---
    // ==========================================

    let draggedCard = null;
    let subjectColors = {}; 

    const colorPalette = [
        { border: '#ef4444', bg: '#fef2f2', text: '#991b1b' }, 
        { border: '#f97316', bg: '#fff7ed', text: '#9a3412' }, 
        { border: '#eab308', bg: '#fefce8', text: '#854d0e' }, 
        { border: '#22c55e', bg: '#f0fdf4', text: '#166534' }, 
        { border: '#06b6d4', bg: '#ecfeff', text: '#155e75' }, 
        { border: '#3b82f6', bg: '#eff6ff', text: '#1e40af' }, 
        { border: '#8b5cf6', bg: '#f5f3ff', text: '#5b21b6' }, 
        { border: '#d946ef', bg: '#fdf4ff', text: '#86198f' }  
    ];

    function renderTimeLabels() {
        const container = document.getElementById("manualEditorTimeLabels");
        if (!container) return;
        container.innerHTML = '<div class="time-label-spacer"></div>';
        for(let h = 7; h <= 20; h++) { 
            let ampm = h >= 12 ? 'PM' : 'AM';
            let hr12 = h > 12 ? h - 12 : (h === 0 ? 12 : h); 
            container.innerHTML += `<div class="time-label">${hr12}:00 ${ampm}</div>`;
        }
    }

    function timeToPixels(timeStr) {
        if (!timeStr) return 0;
        timeStr = timeStr.trim();
        let match12 = timeStr.match(/(\d+):(\d+)(?::\d+)?\s*(AM|PM)/i);
        let match24 = timeStr.match(/(\d+):(\d+)(?::\d+)?/);
        let hours = 0, minutes = 0;
        
        if (match12) {
            hours = parseInt(match12[1], 10);
            minutes = parseInt(match12[2], 10);
            if (hours === 12 && match12[3].toUpperCase() === 'AM') hours = 0;
            if (hours < 12 && match12[3].toUpperCase() === 'PM') hours += 12;
        } else if (match24) {
            hours = parseInt(match24[1], 10);
            minutes = parseInt(match24[2], 10);
        } else return 0; 
        
        return ((hours + (minutes / 60)) - 7) * 90;
    }

    function parseTimeSlot(timeSlot) {
        if (!timeSlot) return { top: 0, height: 90 };
        const parts = timeSlot.split('-');
        if(parts.length !== 2) return { top: 0, height: 90 };
        const top = timeToPixels(parts[0]);
        const bottom = timeToPixels(parts[1]);
        return { top: top, height: Math.max(bottom - top, 45) }; 
    }

    function addHoursToTime(timeStr, hoursToAdd) {
        let match12 = timeStr.trim().match(/(\d+):(\d+)\s*(AM|PM)/i);
        if(!match12) return timeStr;
        let h = parseInt(match12[1]);
        let m = parseInt(match12[2]);
        let ampm = match12[3].toUpperCase();
        
        if(h === 12 && ampm === 'AM') h = 0;
        if(h < 12 && ampm === 'PM') h += 12;
        
        let totalMins = (h * 60) + m + (hoursToAdd * 60);
        let newH = Math.floor(totalMins / 60) % 24;
        let newM = totalMins % 60;
        
        let newAmpm = newH >= 12 ? 'PM' : 'AM';
        let dispH = newH > 12 ? newH - 12 : (newH === 0 ? 12 : newH);
        let dispM = newM.toString().padStart(2, '0');
        
        return `${dispH}:${dispM} ${newAmpm}`;
    }

    function updateSidebarHours() {
        const sidebarCards = document.querySelectorAll('.unplaced-card');
        const gridCards = document.querySelectorAll('.schedule-class-card');

        sidebarCards.forEach(sidebarCard => {
            const codeEl = sidebarCard.querySelector('.subject-code');
            const titleEl = sidebarCard.querySelector('.subject-title');
            if(!codeEl || !titleEl) return;
            
            const code = codeEl.textContent.toLowerCase().trim();
            const title = titleEl.textContent.toLowerCase().trim();
            let placedHours = 0;
            
            gridCards.forEach(gridCard => {
                const subjectText = gridCard.querySelector('.class-card-subject').textContent.toLowerCase();
                if (subjectText.includes(code) || subjectText.includes(title)) {
                    const timeSlot = gridCard.dataset.timeSlot;
                    if (timeSlot && timeSlot.includes('-')) {
                        const parts = timeSlot.split('-');
                        const topPx = timeToPixels(parts[0]);
                        const bottomPx = timeToPixels(parts[1]);
                        placedHours += Math.max((bottomPx - topPx) / 90, 0); 
                    } else {
                        const h = parseFloat(gridCard.style.height) || 90;
                        placedHours += (h / 90); 
                    }
                }
            });

            placedHours = Math.round(placedHours * 10) / 10;
            const totalHours = 3; 
            const remaining = totalHours - placedHours;

            let metaContainer = sidebarCard.querySelector('.hours-tracker');
            if(!metaContainer) {
                metaContainer = document.createElement('span');
                metaContainer.className = 'hours-tracker meta-tag';
                metaContainer.style.fontWeight = 'bold';
                sidebarCard.querySelector('.meta-tags').appendChild(metaContainer);
            }

            if (remaining <= 0) { 
                sidebarCard.style.opacity = '0.4'; 
                sidebarCard.draggable = false;
                sidebarCard.style.cursor = 'not-allowed';
                metaContainer.textContent = `Completed (${placedHours}/${totalHours} hrs)`;
                metaContainer.style.backgroundColor = '#d1fae5'; 
                metaContainer.style.color = '#065f46';
            } else {
                sidebarCard.style.opacity = '1'; 
                sidebarCard.draggable = true;
                sidebarCard.style.cursor = 'grab';
                metaContainer.textContent = `${placedHours} / ${totalHours} hrs placed`;
                
                if(placedHours > 0) {
                    metaContainer.style.backgroundColor = '#fef3c7'; 
                    metaContainer.style.color = '#d97706';
                } else {
                    metaContainer.style.backgroundColor = '#f1f5f9'; 
                    metaContainer.style.color = '#64748b';
                    metaContainer.textContent = `3 hrs total`;
                }
            }
        });
    }

    function initializeEditorGrid() {
        const gridArea = document.getElementById("editorGridArea");
        if (!gridArea) return;
        
        gridArea.innerHTML = '<div class="grid-background"></div>';
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        for (let d = 0; d < days.length; d++) {
            for (let h = 0; h < 26; h++) { 
                const zone = document.createElement("div");
                zone.className = "drop-zone";
                zone.style.position = "absolute";
                zone.style.zIndex = "2";
                
                let hour = 7 + Math.floor(h / 2);
                let mins = (h % 2 === 0) ? "00" : "30";
                zone.dataset.day = days[d];
                
                let hr12 = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
                zone.dataset.time = `${hr12}:${mins} ${hour >= 12 ? "PM" : "AM"}`;
                
                zone.style.left = (d * 16.666) + "%";
                zone.style.top = (h * 45) + "px"; 
                zone.style.width = "16.666%";
                zone.style.height = "45px"; 
                
                zone.addEventListener("dragover", function(e) { e.preventDefault(); this.classList.add('hovered'); });
                zone.addEventListener("dragleave", function(e) { this.classList.remove('hovered'); });
                
                zone.addEventListener("drop", function(e) {
                    e.preventDefault();
                    this.classList.remove('hovered');
                    if (!draggedCard) return;

                    if (draggedCard.classList.contains('unplaced-card')) {
                        const subjectCode = draggedCard.querySelector('.subject-code').textContent;
                        const subjectTitle = draggedCard.querySelector('.subject-title').textContent;
                        const subjectId = draggedCard.dataset.subjectId; 
                        
                        const startTimeStr = this.dataset.time;
                        const endTimeStr = addHoursToTime(startTimeStr, 1.5);

                        const newCard = createGridCard({
                            id: 'new-' + Date.now(),
                            subject: subjectCode + ' - ' + subjectTitle,
                            exact_code: subjectCode,
                            exact_id: subjectId, 
                            teacher_name: 'TBA',
                            room_name: 'TBA',
                            time_slot: `${startTimeStr} - ${endTimeStr}`
                        });

                        newCard.style.left = `calc(${this.style.left} + 4px)`;
                        newCard.style.top = this.style.top;
                        newCard.style.height = "135px"; 
                        newCard.dataset.newDay = this.dataset.day;
                        newCard.dataset.newTime = this.dataset.time;
                        
                        gridArea.appendChild(newCard);
                        updateSidebarHours(); 
                    } 
                    else if (!draggedCard.classList.contains("is-locked")) {
                        draggedCard.style.left = `calc(${this.style.left} + 4px)`;
                        draggedCard.style.top = this.style.top;
                        draggedCard.dataset.newDay = this.dataset.day;
                        draggedCard.dataset.newTime = this.dataset.time;
                        
                        const startStr = this.dataset.time;
                        const currentHeight = parseFloat(draggedCard.style.height) || 90;
                        const hoursDuration = currentHeight / 90;
                        const endStr = addHoursToTime(startStr, hoursDuration);
                        draggedCard.dataset.timeSlot = `${startStr} - ${endStr}`;
                        
                        draggedCard.style.transform = "scale(1.02)";
                        setTimeout(() => draggedCard.style.transform = "none", 200); 
                    }
                });
                gridArea.appendChild(zone);
            }
        }
    }

    function createGridCard(item) {
        const card = document.createElement("div");
        card.className = "schedule-class-card";
        card.draggable = true;
        card.dataset.id = item.id || item.schedule_id || ""; 
        card.style.position = "absolute"; 
        card.style.zIndex = "5"; 
        card.style.width = "calc(16.666% - 8px)";

        let matchedColor = { border: '#cbd5e1', bg: '#ffffff', text: '#334155' }; 
        const itemSubjLower = (item.subject || "").toLowerCase();
        
        for (let key in subjectColors) {
            if (itemSubjLower.includes(key)) {
                matchedColor = subjectColors[key];
                break;
            }
        }
        
        card.dataset.subjectId = item.exact_id || item.subject_id || "";
        card.dataset.subjectCode = item.exact_code || (item.subject.includes(' - ') ? item.subject.split(' - ')[0].trim() : item.subject.trim());
        
        card.dataset.timeSlot = item.time_slot || "07:00 - 08:30";
        card.dataset.mode = item.room_name === 'Online' ? 'Online' : 'FTF';
        card.dataset.teacherId = item.teacher_id || "";
        card.dataset.roomName = item.room_name || "";

        card.style.borderLeft = `4px solid ${matchedColor.border}`;
        card.style.backgroundColor = matchedColor.bg;
        card.style.borderColor = matchedColor.border;
        
        card.innerHTML = `
            <div class="class-card-header">
                <h4 class="class-card-subject" style="color: ${matchedColor.text};">${item.subject}</h4>
                <div class="class-card-actions">
                    <button class="edit-slot-btn" title="Edit Time" style="color:${matchedColor.text};"><i class="fa-solid fa-pen"></i></button>
                    <button class="delete-slot-btn" title="Delete Class" style="color:${matchedColor.text};"><i class="fa-solid fa-trash"></i></button>
                    <button class="lock-btn" title="Lock Class" style="color:${matchedColor.text};"><i class="fa-solid fa-lock-open"></i></button>
                </div>
            </div>
            <div class="class-card-body" style="color: ${matchedColor.text};">
                <div class="class-card-info-row"><i class="fa-solid fa-user"></i> <span class="card-teacher-name">${item.teacher_name || 'TBA'}</span></div>
                <div class="class-card-info-row"><i class="fa-solid fa-door-open"></i> <span class="card-room-mode">${item.room_name || 'Online'}</span></div>
            </div>
        `;
        
        card.addEventListener("dragstart", function(e) {
            if (this.classList.contains("is-locked")) { e.preventDefault(); return; }
            draggedCard = this;
            setTimeout(() => this.classList.add("dragging"), 0);
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", this.dataset.id); 
        });
        
        card.addEventListener("dragend", function() {
            this.classList.remove("dragging");
            draggedCard = null;
        });

        card.querySelector(".lock-btn").addEventListener("click", function() {
            card.classList.toggle("is-locked");
            this.querySelector("i").className = card.classList.contains("is-locked") ? "fa-solid fa-lock" : "fa-solid fa-lock-open";
            card.draggable = !card.classList.contains("is-locked");
        });

        return card;
    }

    function loadEditorData(section_id) {
        const container = document.getElementById("unplacedSubjectsList");
        const gridArea = document.getElementById("editorGridArea");
        if(!container || !gridArea) return;
        
        container.innerHTML = "<p style='text-align:center; color:#888; font-size: 13px;'><i class='fa-solid fa-spinner fa-spin'></i> Loading data...</p>";
        subjectColors = {}; 

        Promise.all([
            fetch(`../api/getSectionSubjects.php?section_id=${section_id}`).then(res => res.json()),
            fetch(`../api/getSchedule.php?section_id=${section_id}`).then(res => res.json())
        ]).then(([subjectsData, scheduleData]) => {
            container.innerHTML = "";
            
            if (subjectsData.length === 0) {
                container.innerHTML = "<p style='text-align:center; color:#888; font-size: 13px;'>No subjects assigned to this section yet.</p>";
            }

            subjectsData.forEach((sub, index) => {
                const color = colorPalette[index % colorPalette.length];
                subjectColors[sub.code.toLowerCase()] = color; 
                subjectColors[sub.subject_description.toLowerCase()] = color;
                
                const scheduledInstances = scheduleData.filter(item => 
                    item.subject && (item.subject.toLowerCase().includes(sub.code.toLowerCase()) || item.subject.toLowerCase().includes(sub.subject_description.toLowerCase()))
                );

                const isScheduled = scheduledInstances.length > 0;
                let scheduleInfoHTML = "";

                if (isScheduled) {
                    const teacher = scheduledInstances[0].teacher_name || 'TBA';
                    const time = scheduledInstances[0].time_slot || '';
                    const days = scheduledInstances.map(s => s.day_of_week.substring(0,3)).join(', ');
                    
                    scheduleInfoHTML = `
                        <div style="margin-top: 8px; font-size: 11px; color: ${color.text}; background: rgba(255,255,255,0.7); padding: 6px; border-radius: 4px; border: 1px dashed ${color.border};">
                            <div style="margin-bottom: 3px; font-weight: bold;"><i class="fa-solid fa-user"></i> ${teacher}</div>
                            <div><i class="fa-solid fa-clock"></i> ${days} | ${time}</div>
                        </div>
                    `;
                }
                
                const card = document.createElement("div");
                card.className = "unplaced-card";
                card.draggable = true;
                card.dataset.subjectId = sub.id || sub.subject_id;
                
                card.style.borderLeft = `4px solid ${color.border}`;
                card.style.backgroundColor = color.bg;
                card.style.borderColor = color.border;
                if (isScheduled) card.style.opacity = "0.75"; 
                
                card.innerHTML = `
                    <span class="subject-code" style="color: ${color.text}; background: ${color.border}20;">${sub.code}</span>
                    <p class="subject-title" style="color: ${color.text};">${sub.subject_description}</p>
                    <div class="meta-tags" style="margin-top: 4px;">
                        <span class="meta-tag">${sub.hours_per_week || 3} hrs</span>
                        <span class="meta-tag">${sub.delivery_mode === 'online' ? 'Online' : 'FTF'}</span>
                    </div>
                    ${scheduleInfoHTML}
                `;

                card.addEventListener("dragstart", function(e) {
                    draggedCard = this;
                    setTimeout(() => this.classList.add("dragging"), 0);
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", "new-subject");
                });

                card.addEventListener("dragend", function() {
                    this.classList.remove("dragging");
                    draggedCard = null;
                });

                container.appendChild(card);
            });
            
            const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            scheduleData.forEach(item => {
                const itemSubjLower = (item.subject || "").toLowerCase();
                let exactCode = item.subject;
                let exactId = item.subject_id || item.id; 
                
                subjectsData.forEach(sub => {
                    if (itemSubjLower.includes(sub.code.toLowerCase()) || itemSubjLower.includes(sub.subject_description.toLowerCase())) {
                        exactCode = sub.code;
                        exactId = sub.id || sub.subject_id; 
                        item.subject = `${sub.code} - ${sub.subject_description}`; 
                    }
                });
                item.exact_code = exactCode; 
                item.exact_id = exactId; 

                const dayIndex = days.indexOf(item.day_of_week);
                if (dayIndex === -1) return; 
                
                const card = createGridCard(item);
                card.style.left = `calc(${dayIndex * 16.666}% + 4px)`;
                
                const dimensions = parseTimeSlot(item.time_slot);
                card.style.top = dimensions.top + "px";
                card.style.height = dimensions.height + "px";
                
                card.dataset.day = item.day_of_week;
                card.dataset.time = item.time_slot.split('-')[0].trim(); 
                
                gridArea.appendChild(card);
            });

            updateSidebarHours(); 
        });
    }

    function openManualEditor(section_id, sectionName) {
        // 1. Force the UI to hide the Master Editor and show the Single Editor
        if (typeof toggleEditorMode === 'function') {
            toggleEditorMode('single');
        }

        // 2. THIS IS YOUR EXACT ORIGINAL CODE VVV
        const container = document.getElementById("generatedSchedulesContainer");
        container.classList.remove("hidden");

        const scheduleBoxes = container.querySelectorAll(".schedule-box");
        scheduleBoxes.forEach(box => {
            const btn = box.querySelector(".edit-manual-btn");
            if (btn && btn.dataset.id == section_id) {
                box.style.display = "block"; 
                btn.style.display = "none";  
            } else {
                box.style.display = "none";  
            }
        });
    
        const editorGrid = document.getElementById("manualEditorGridContainer");
        editorGrid.classList.remove("hidden");
        editorGrid.style.display = "block"; 
        document.getElementById("editorActiveSectionNameDisplay").textContent = sectionName;
        document.getElementById("publishScheduleBtn").dataset.sectionId = section_id;

        const pill = document.getElementById("activeSectionEditorPill");
        if (pill) {
            pill.style.display = "inline-flex";
            document.getElementById("editorActiveSectionName").textContent = sectionName;
        }

        setTimeout(() => {
            if (editorGrid) editorGrid.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);

        renderTimeLabels();     
        initializeEditorGrid();
        loadEditorData(section_id); 
    }

    const editorFilterCourse = document.getElementById("editorFilterCourse");
    const editorFilterYear = document.getElementById("editorFilterYear");
    const editorFilterSection = document.getElementById("editorFilterSection");
    const refreshEditorBtn = document.getElementById("refreshEditorData");

    function loadEditorSectionDropdown() {
        const course = editorFilterCourse.value;
        const year = editorFilterYear.value;

        if (!course || !year) {
            editorFilterSection.innerHTML = '<option value="">Section</option>';
            return;
        }

        editorFilterSection.innerHTML = '<option value="">Loading...</option>';

        fetch(`../api/getAllSections.php?course=${course}&year=${year}`)
            .then(res => res.json())
            .then(data => {
                editorFilterSection.innerHTML = '<option value="">Select Section</option>';
                data.forEach(sec => {
                    editorFilterSection.innerHTML += `<option value="${sec.section_id}">${sec.section_name}</option>`;
                });
            });
    }

    if (editorFilterCourse) editorFilterCourse.addEventListener("change", loadEditorSectionDropdown);
    if (editorFilterYear) editorFilterYear.addEventListener("change", loadEditorSectionDropdown);

    if (editorFilterSection) {
        editorFilterSection.addEventListener("change", function() {
            const sectionId = this.value;
            if (!sectionId) return;

            const sectionName = this.options[this.selectedIndex].text;
            const courseName = editorFilterCourse.options[editorFilterCourse.selectedIndex].text;
            const fullSectionName = `${courseName} - ${sectionName}`;

            document.getElementById("editorActiveSectionNameDisplay").textContent = fullSectionName;
            document.getElementById("publishScheduleBtn").dataset.sectionId = sectionId;
            const pill = document.getElementById("editorActiveSectionName");
            if (pill) pill.textContent = fullSectionName;

            loadSchedule(sectionId, fullSectionName, true);
        });
    }

    if (refreshEditorBtn) {
        refreshEditorBtn.addEventListener("click", (e) => {
            e.preventDefault();
            const sectionId = document.getElementById("publishScheduleBtn").dataset.sectionId;
            
            if (sectionId) {
                const icon = refreshEditorBtn.querySelector('i');
                icon.classList.add('fa-spin');
                initializeEditorGrid();
                loadEditorData(sectionId);
                setTimeout(() => icon.classList.remove('fa-spin'), 1000);
            } else {
                alert("No section currently loaded.");
            }
        });
    }


    /************************************************************************
     * ==================================================================== *
     * 7. STUDENTS MANAGEMENT                                               *
     * ==================================================================== *
     ************************************************************************/

    // --- STUDENT FILTER PANEL LOGIC ---
    const studentFilterToggleBtn = document.getElementById("studentFilterToggleBtn");
    const studentFilterPanel = document.getElementById("studentFilterPanel");

    if (studentFilterToggleBtn && studentFilterPanel) {
        studentFilterToggleBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            studentFilterPanel.style.display = studentFilterPanel.style.display === "flex" ? "none" : "flex";
        });
        document.addEventListener("click", (e) => {
            if (!studentFilterPanel.contains(e.target) && e.target !== studentFilterToggleBtn) {
                studentFilterPanel.style.display = "none";
            }
        });
    }

window.load_students = function () {
        const q = document.getElementById("studentSearch")?.value.trim() || "";
        const courseId = document.getElementById("student_filter_course")?.value || "";
        const yearLevel = document.getElementById("student_filter_year")?.value || "";
        const sectionFilter = document.getElementById("student_filter_section")?.value || "";

        const params = new URLSearchParams();
        if (q) params.append("q", q);
        if (courseId) params.append("course", courseId);

        fetch(`../api/getStudents.php?${params.toString()}`)
            .then(r => r.json())
            .then(data => {
                const tbody = document.getElementById("students_body");
                if (!tbody) return;
                tbody.innerHTML = "";

                let filteredData = Array.isArray(data) ? data : [];

                // 1. Filter by Year Level if selected
                if (yearLevel !== "") {
                    filteredData = filteredData.filter(s => String(s.year_level) === String(yearLevel));
                }
                
                // 2. Filter by Section if selected
                if (sectionFilter !== "") {
                    filteredData = filteredData.filter(s => {
                        const sec = String(s.section || "").toUpperCase();
                        return sec.includes(String(sectionFilter).toUpperCase());
                    });
                }

                if (filteredData.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 20px; color: #888;">No students found matching your filters.</td></tr>`;
                    return;
                }

                filteredData.forEach(s => {
                    const isRegistered = s.user_id && s.user_id !== "0" && s.user_id !== null;
                    const statusBadge = isRegistered 
                        ? `<span class="lr-badge badge-green">✓ Registered</span>`
                        : `<span class="lr-badge badge-red">⚠ Unregistered</span>`;
                        
                    const inviteBtn = isRegistered 
                        ? `` 
                        : `<button class="register-account-btn action-btn" data-id="${s.student_id}" title="Send Credentials via Email">
                            <i class="fa-solid fa-envelope"></i> Send Invite
                        </button>`;

                    tbody.innerHTML += `
                        <tr>
                            <td>${s.student_id}</td>
                            <td>${s.full_name}</td>
                            <td>${s.course || '-'}</td>
                            <td>${s.section || '-'}</td>
                            <td>${statusBadge}</td>
                            <td class="action-cell">
                                    <div style="display: flex; gap: 5px; justify-content: center;">
                                        ${inviteBtn}
                                        
                                        <button class="view_student_btn action-btn btn-view" data-id="${s.student_id}" title="View Details">
                                            <i class="fa-solid fa-eye"></i> View
                                        </button>                                    
                                    </div>
                                </td>
                        </tr>
                    `;
                });
            })
            .catch(err => {
                console.error("Error loading students:", err);
                const tbody = document.getElementById("students_body");
                if(tbody) tbody.innerHTML = `<tr><td colspan="6" style="color:red; text-align:center;">Failed to load data.</td></tr>`;
            });
    }

    // Bind all filters to trigger instantly!
    document.getElementById("studentSearch")?.addEventListener("input", load_students);
    document.getElementById("student_filter_course")?.addEventListener("change", load_students);
    document.getElementById("student_filter_year")?.addEventListener("change", load_students);
    document.getElementById("student_filter_section")?.addEventListener("change", load_students);

    function load_student_details(id) {
        fetch(`../api/getStudent.php?student_id=${id}`)
            .then(r => r.json())
            .then(data => {
                if (!data || !data.student_id) return;
                document.getElementById("detail_student_name").textContent = data.full_name;
                document.getElementById("detail_student_id").textContent = data.student_id;
                document.getElementById("detail_student_gender").textContent = data.gender;
                document.getElementById("detail_student_email").textContent = data.email;
                document.getElementById("detail_student_phone").textContent = data.phone;
                document.getElementById("detail_student_course").textContent = data.course_name || data.course;
                document.getElementById("detail_student_section").textContent = data.section_name || data.section;
                document.getElementById("detail_student_year").textContent = data.year_level;
                
                // ... previous student detail code ...
                document.getElementById("delete_student_btn").dataset.id = data.student_id;
                document.getElementById("edit_student_btn").dataset.id = data.student_id;

                // 🚨 CORRECTED PROFILE PICTURE INJECTION 🚨
                // We now strictly target the avatar inside the #students section!
                const avatarDiv = document.querySelector("#students .rightside .avatar");
                
                if (avatarDiv) {
                    const pic = data.profile_picture ? data.profile_picture : 'default.png';
                    avatarDiv.innerHTML = `<img src="../assets/profiles/${pic}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%; display: block;">`;
                    avatarDiv.style.padding = "0"; 
                    avatarDiv.style.background = "none";
                }
            });
    }
    function load_section_dropdown() {
        const sCourse = document.getElementById("student_course");
        const sYear = document.getElementById("student_year_level");
        const sSection = document.getElementById("student_section");
        if (!sCourse || !sYear || !sSection) return;

        if (!sCourse.value || !sYear.value) return sSection.innerHTML = '<option value="">Select Course & Year</option>';

        fetch(`../api/getAllSections.php?course=${sCourse.value}&year=${sYear.value}`)
            .then(res => res.json())
            .then(data => {
                sSection.innerHTML = '<option value="">Select Section</option>';
                data.forEach(sec => sSection.innerHTML += `<option value="${sec.section_id}">${sec.section_name}</option>`);
            });
    }
    document.getElementById("student_course")?.addEventListener("change", load_section_dropdown);
    document.getElementById("student_year_level")?.addEventListener("change", load_section_dropdown);

    const save_student_btn = document.getElementById("saveStudent");
    if (save_student_btn) {
        save_student_btn.addEventListener("click", () => {
            const originalId = document.getElementById("editOriginalStudentId").value; 
            const newId = document.getElementById("input_student_id").value.trim();
            const name = document.getElementById("student_full_name").value.trim();

            if (!newId || !name) return alert("School ID and Name are required.");

            const body = {
                student_id: newId, full_name: name, gender: document.getElementById("student_gender").value,
                email: document.getElementById("student_email").value, phone: document.getElementById("student_phone").value,
                course: document.getElementById("student_course").value, year_level: document.getElementById("student_year_level").value,
                section: document.getElementById("student_section").value
            };
            if (originalId) body.original_student_id = originalId;

            fetch(originalId ? "../api/editStudent.php" : "../api/addStudent.php", {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
            }).then(r => r.json()).then(res => {
                alert(res.message);
                if (res.status === "success") {
                    document.getElementById("addStudentModal").style.display = "none";
                    load_students();
                }
            });
        });
    }

    
    // --- IRREGULAR STUDENT ENROLLMENT LOGIC ---
    window.openEnrollIrregularModal = function() {
        // 1. Fetch all students for the dropdown
        fetch('../api/getStudents.php').then(res=>res.json()).then(data=>{
            let sel = document.getElementById('irregStudentSelect');
            sel.innerHTML = '<option value="">-- Select Student --</option>';
            let students = data.data || data; 
            students.forEach(s => {
                sel.innerHTML += `<option value="${s.student_id}">${s.full_name} (${s.student_id})</option>`;
            });
        });

        // 2. Fetch all schedules and their 50-Seat Capacities!
        fetch('../api/getAvailableSchedules.php').then(res=>res.json()).then(data=>{
            let sel = document.getElementById('irregScheduleSelect');
            sel.innerHTML = '<option value="">-- Select Class to Enroll In --</option>';
            data.data.forEach(s => {
                // If it hits 50, gray it out so you can't select it!
                let isFull = parseInt(s.enrolled_count) >= 50;
                let fullText = isFull ? '⚠️ [FULL]' : `(${s.enrolled_count}/50 Seats)`;
                let text = `${s.course} ${s.year_level}-${s.section_name} | ${s.subject_code} | ${s.day_of_week} ${s.time_slot} | ${fullText}`;
                
                let opt = document.createElement('option');
                opt.value = s.schedule_id;
                opt.textContent = text;
                if(isFull) opt.disabled = true; // Prevents clicking if class is full
                sel.appendChild(opt);
            });
        });

        document.getElementById('enrollIrregularModal').classList.remove('hidden');
        document.getElementById('enrollIrregularModal').style.display = 'flex';
    };

    window.submitIrregularEnrollment = function() {
        const student_id = document.getElementById('irregStudentSelect').value;
        const schedule_id = document.getElementById('irregScheduleSelect').value;

        if(!student_id || !schedule_id) return alert("Please select both a student and a class!");

        fetch('../api/enrollStudentSubject.php', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({student_id, schedule_id})
        }).then(res=>res.json()).then(data=>{
            if(data.success) {
                alert(data.message);
                document.getElementById('enrollIrregularModal').style.display = 'none';
            } else {
                alert("Enrollment Error: " + data.error);
            }
        });
    }


    
    // ==========================================
    // MODAL OPEN & CLOSE LOGIC (Standardized)
    // ==========================================

   window.openCreateModal = function() { 
        const m = document.getElementById("createModal");
        if(!m) return;
        
        // BUGFIX: Safely map the correct room ID from your database!
        const roomSelect = document.getElementById("newRoom");
        if (roomSelect && typeof rooms !== 'undefined') {
            roomSelect.innerHTML = `<option value="">-- No specific room (Campus Wide) --</option>` +
                rooms.map(r => {
                    const safeId = r.id || r.room_id || "";
                    const safeName = r.name || r.room_name || "Unknown Room";
                    return `<option value="${safeId}">${safeName}</option>`;
                }).join("");
        }

        // Clear out old form data safely
        ["newTitle", "newDesc", "newStartDate", "newEndDate", "newLocation", "newOrganizer", "newAttendees"].forEach(id => {
            if (document.getElementById(id)) document.getElementById(id).value = "";
        });
        
        m.classList.remove("hidden");
        m.style.display = "flex"; 
        if (typeof lucide !== 'undefined') lucide.createIcons();
    };
    
    window.closeCreateModal = function() { 
        const m = document.getElementById("createModal");
        if(m) {
            m.classList.add("hidden");
            m.style.display = "none"; 
        }
    };

   
    // The Master Save Function for Events & Rooms!
    window.createEvent = async function() {
        const payload = {
            title: document.getElementById("newTitle").value.trim(),
            type: document.getElementById("newType").value,
            status: document.getElementById("newStatus").value,
            startDate: document.getElementById("newStartDate").value,
            endDate: document.getElementById("newEndDate").value,
            startTime: document.getElementById("newStartTime").value,
            endTime: document.getElementById("newEndTime").value,
            location: document.getElementById("newLocation").value,
            roomId: document.getElementById("newRoom").value,
            organizer: document.getElementById("newOrganizer").value,
            attendees: document.getElementById("newAttendees").value,
            description: document.getElementById("newDesc").value
        };

        if (!payload.title || !payload.startDate) {
            return alert("Event Title and Start Date are strictly required.");
        }

        const btn = document.querySelector("#createModal .btn-primary");
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
        btn.disabled = true;

        try {
            const response = await fetch('../api/addEvent.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            // BUGFIX: Safely extract text FIRST, then try to parse as JSON!
            const textResponse = await response.text();
            let result;
            try {
                result = JSON.parse(textResponse);
            } catch (e) {
                console.error("Backend did not return JSON. Raw output:", textResponse);
                alert("Database Crash! Please check your network tab.");
                return; // Stop execution before it breaks the app!
            }

            if (result.success) {
                closeCreateModal();
                fetchEvents(); 
                // Refresh BOTH the Calendar UI and the Rooms UI seamlessly!
                if (typeof renderEventsPage === "function") renderEventsPage();
                if (typeof fetchReservations === "function") fetchReservations();
                
                if (typeof showToast === "function") showToast("Success", "Event successfully created!");
                else alert("Event created successfully!");
                
            } else {
                alert("Database Error: " + (result.error || result.message));
            }
        } catch (error) {
            console.error("Event Creation Error:", error);
            alert("System error. Could not connect to the server.");
        } finally {
            btn.innerHTML = originalHtml;
            btn.disabled = false;
        }
    };

  
    /************************************************************************
     * ==================================================================== *
     * 8. LOGS, REPORTS & CONFLICTS                                         *
     * ==================================================================== *
     ************************************************************************/

function fetchConflictDetails() {
        const listContainer = document.getElementById("conflictDetailsList");
        const summary = document.getElementById("conflictSummary");

        fetch("../api/getConflicts.php")
        .then(res => res.text())
        .then(text => {
            try {
                const data = JSON.parse(text);
                
                // 🚨 NEW: Filter out merged/ignored conflicts
                let ignored = JSON.parse(localStorage.getItem('thesis_ignored_conflicts') || "[]");
                let activeConflicts = (data.details || []).filter(c => !ignored.includes(c.sec1_id + '_' + c.sec2_id));
                
                // Update Dashboard Counter
                const dashboardBadge = document.getElementById('conflictBadgeCount');
                if (dashboardBadge) dashboardBadge.textContent = activeConflicts.length;
                
                summary.innerHTML = `Found <strong><span style="color:rgb(158, 38, 38);">${activeConflicts.length}</span></strong> active conflicts.`;
                listContainer.innerHTML = ""; 

                if (activeConflicts.length > 0) {
                    let htmlContent = "";
                    for(let i = 0; i < Math.min(activeConflicts.length, 50); i++) {
                        let item = activeConflicts[i];
                        let safeObj = JSON.stringify(item).replace(/'/g, "&#39;");
                        
                        htmlContent += `
                            <div class="conflict-card">
                                <div class="conflict-card-header">
                                    <span class="conflict-title"><i class="fa-solid fa-triangle-exclamation" style="color:#c10d0d; margin-right: 5px;"></i> Schedule Issue</span>
                                    <span class="conflict-badge">${item.type}</span>
                                </div>
                                <div class="conflict-card-body">
                                    <p class="conflict-card-message">${item.message}</p>
                                    <div class="conflict-fix-container" style="display:flex; flex-wrap: wrap; gap: 5px; align-items:center;">
                                        <span class="conflict-fix-label" style="width:100%; margin-bottom:5px;">Resolution Options:</span>
                                        <button class="lr-btn btn-outline btn-sm auto-fix-conflict-btn" data-id="${item.sec1_id}" data-name="${item.sec1_name}" data-obj='${safeObj}' style="border-color:#2980b9; color:#2980b9;">
                                            <i class="fa-solid fa-wand-magic-sparkles"></i> Fix ${item.sec1_name}
                                        </button>
                                        <button class="lr-btn btn-outline btn-sm auto-fix-conflict-btn" data-id="${item.sec2_id}" data-name="${item.sec2_name}" data-obj='${safeObj}' style="border-color:#2980b9; color:#2980b9;">
                                            <i class="fa-solid fa-wand-magic-sparkles"></i> Fix ${item.sec2_name}
                                        </button>
                                        
                                        <button class="lr-btn btn-outline btn-sm merge-conflict-btn" data-signature="${item.sec1_id}_${item.sec2_id}" data-obj='${safeObj}' style="border-color:#10b981; color:#10b981; background: #f0fdf4;">
                                            <i class="fa-solid fa-link"></i> Keep & Merge Class
                                        </button>
                                    </div>
                                </div>
                            </div>`;
                    }
                    listContainer.innerHTML = htmlContent;
                } else {
                    listContainer.innerHTML = `<div style="text-align:center; padding: 30px; color: #666;"><i class="fa-solid fa-circle-check" style="font-size: 2.5rem; color: #28a745;"></i><p>No active schedule conflicts detected.</p></div>`;
                }
            } catch (e) {
                console.error("Dashboard JSON Error. Raw PHP Response:", text);
            }
        });
    }
   /************************************************************************
     * 9. UNIVERSAL EVENT DELEGATION (MODALS & ACTIONS)                     *
     ************************************************************************/

    document.addEventListener("click", function(e) {
        
        // --- 1. MODAL OPENING LOGIC ---
        const modalMap = {
            "openModal": "addSubjectModal",
            "openRoomModal": "addRoomModal",
            "openTeacherModal": "addTeacherModal",
            "openSectionModal": "addSectionModal",
            "openStudentModal": "addStudentModal",
            "openReportModal": "reportModal",
            "conflictCard": "conflictModal" 
        };

        for (const [btnId, modalId] of Object.entries(modalMap)) {
            if (e.target.closest("#" + btnId)) {
                e.preventDefault(); 
                const modal = document.getElementById(modalId);
                
                // Clear the form if we are Adding a NEW student!
                if(btnId === "openStudentModal") {
                    document.getElementById("editOriginalStudentId").value = "";
                    document.getElementById("input_student_id").value = "";
                    document.getElementById("student_full_name").value = "";
                    document.getElementById("student_email").value = "";
                    document.getElementById("student_phone").value = "";
                    if (modal.querySelector("h2")) modal.querySelector("h2").textContent = "Add Student";
                }

                if (modal) {
                    modal.classList.remove("hidden"); 
                    modal.style.display = "flex";     
                }
                if(btnId === 'openSectionModal') loadSubjectsForSection();
                if(btnId === 'openReportModal') loadReportDropdowns();
                if(btnId === 'conflictCard') fetchConflictDetails();
                return; 
            }
        }
        // --- 2. MODAL CLOSING LOGIC ---
        const closeBtnIds = ["closeModal", "closeRoomModal", "closeTeacherModal", "closeSectionModal", "closeStudentModal", "closeReportModal", "closeConflictBtn", "closeEditSlotModal", "cancelSlotEditBtn"];
        if (closeBtnIds.some(id => e.target.closest("#" + id) || e.target.classList.contains("close-btn"))) {
            e.preventDefault();
            const openModal = e.target.closest(".modal"); 
            if (openModal) {
                openModal.classList.add("hidden");
                openModal.style.display = "none";
            }
            return;
        }

        if (e.target.classList.contains("modal")) {
            e.target.classList.add("hidden");
            e.target.style.display = "none";
        }

        // --- 3. SUBJECT ACTIONS ---
        const editSubBtn = e.target.closest(".editSubject");
        if (editSubBtn) {
            const id = editSubBtn.dataset.id;
            fetch(`../api/getSubject.php?id=${id}`)
                .then(res => res.json())
                .then(data => {
                    if(data.status === 'error') return alert(data.message);
                    document.getElementById("editSubjectId").value = data.id;
                    document.getElementById("subCode").value = data.code;
                    document.getElementById("subDesc").value = data.subject_description;
                    document.getElementById("courseSelect").value = data.course_id;
                    document.getElementById("yearSelect").value = data.year_level;
                    document.getElementById("semesterSelect").value = data.semester || 1;
                    document.getElementById("subUnits").value = data.units || 3;
                    const cbOnline = document.getElementById("pref_online");
                    const cbFtf = document.getElementById("pref_ftf");
                    if(cbOnline) cbOnline.checked = (data.delivery_mode === 'online');
                    if(cbFtf) cbFtf.checked = (data.delivery_mode === 'ftf');
                    document.getElementById("subjectModalTitle").textContent = "Edit Subject";
                    
                    const sModal = document.getElementById("addSubjectModal");
                    sModal.classList.remove("hidden");
                    sModal.style.display = "flex";
                });
        }

        // --- 4. TEACHER ACTIONS ---
        const editTeacherBtn = e.target.closest("#edit_teacher_btn");
        if (editTeacherBtn) {
            const tid = editTeacherBtn.dataset.id;
            if (!tid) return alert("No teacher selected.");
            fetch(`../api/getTeacher.php?teacher_id=${tid}`).then(r => r.json()).then(data => {
                document.getElementById("editTeacherId").value = data.teacher_id;
                document.getElementById("teacher_full_name").value = data.full_name;
                document.getElementById("teacher_gender").value = data.gender;
                document.getElementById("teacher_email").value = data.email;
                document.getElementById("teacher_phone").value = data.phone;
                document.getElementById("teacher_department").value = data.department;
                document.getElementById("teacher_position").value = data.position;
                document.getElementById("teacher_specialization").value = data.specialization;
                document.getElementById("teacher_teaching_load").value = data.teaching_load;
                if (document.getElementById("teacher_is_strict")) document.getElementById("teacher_is_strict").checked = (data.is_strict == 1);
                
                document.querySelectorAll(".pref-subject-cb").forEach(cb => cb.checked = false);
                if (data.preferred_subjects) {
                    data.preferred_subjects.forEach(subId => {
                        const cb = document.querySelector(`.pref-subject-cb[value="${subId}"]`);
                        if (cb) cb.checked = true;
                    });
                }
                const title = document.getElementById("teacherModalTitle");
                if(title) title.textContent = "Edit Teacher";
                
                const tModal = document.getElementById("addTeacherModal");
                tModal.classList.remove("hidden");
                tModal.style.display = "flex";
            });
        }

        const viewTeacherBtn = e.target.closest(".view_teacher_btn");
        if (viewTeacherBtn) load_teacher_details(viewTeacherBtn.dataset.id);
        

        // --- 5. STUDENT ACTIONS ---
        const editPanelStudentBtn = e.target.closest("#edit_student_btn");
        if (editPanelStudentBtn) {
            e.preventDefault();
            const sid = editPanelStudentBtn.dataset.id;
            if (!sid) return alert("No student selected.");
            
            fetch(`../api/getStudent.php?student_id=${sid}`).then(r => r.json()).then(data => {
                document.getElementById("editOriginalStudentId").value = data.student_id;
                document.getElementById("input_student_id").value = data.student_id;
                document.getElementById("student_full_name").value = data.full_name;
                document.getElementById("student_gender").value = data.gender || "Male";
                document.getElementById("student_email").value = data.email || "";
                document.getElementById("student_phone").value = data.phone || "";
                document.getElementById("student_course").value = data.course || "1";
                document.getElementById("student_year_level").value = data.year_level || "1";
                
                // Trigger the section dropdown loader to get the available sections
                if (typeof load_section_dropdown === 'function') load_section_dropdown();
                
                // Wait a fraction of a second for the dropdown to load, then select their section
                setTimeout(() => {
                    const secEl = document.getElementById("student_section");
                    if(secEl) {
                        for(let i = 0; i < secEl.options.length; i++) {
                            if(secEl.options[i].text === data.section || secEl.options[i].value == data.section) {
                                secEl.selectedIndex = i;
                                break;
                            }
                        }
                    }
                }, 300);
                
                // Change Title and open modal
                const modal = document.getElementById("addStudentModal");
                const title = modal.querySelector("h2");
                if (title) title.textContent = "Edit Student";
                
                modal.classList.remove("hidden");
                modal.style.display = "flex";
            });
        }

        const viewStudentBtn = e.target.closest(".view_student_btn");
        if (viewStudentBtn) {
            e.preventDefault();
            const id = viewStudentBtn.dataset.id;
            
            // Just load the details into the side panel! No annoying popups!
            load_student_details(id); 
            
            // (Optional) If you have side panel display toggles like the teachers page, this safely reveals them:
            const unselectedState = document.getElementById("unselected_student_state");
            const selectedState = document.getElementById("selected_student_state");
            if (unselectedState) unselectedState.style.display = "none";
            if (selectedState) selectedState.style.display = "flex";
        }

        const registerBtn = e.target.closest(".register-account-btn");
        if (registerBtn) {
            e.preventDefault();
            const studentId = registerBtn.dataset.id;
            const originalHTML = registerBtn.innerHTML;
            registerBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';
            registerBtn.disabled = true;

            fetch("../api/registerStudentAccount.php", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ student_id: studentId })
            })
            .then(res => res.json())
            .then(data => {
                alert(data.message);
                load_students(); 
            })
            .catch(err => {
                alert("Network error.");
                registerBtn.innerHTML = originalHTML;
                registerBtn.disabled = false;
            });
        }

        // --- 6. SCHEDULING & EDITOR ACTIONS ---
        const viewSchedBtn = e.target.closest(".viewSchedule");
        if (viewSchedBtn) {
            loadSchedule(viewSchedBtn.dataset.id, viewSchedBtn.dataset.name, true);
            switchToScheduleTab(); 
        }

        const genSchedBtn = e.target.closest(".generateSchedule");
        if (genSchedBtn) {
            e.preventDefault();
            const id = genSchedBtn.dataset.id;
            const card = genSchedBtn.closest(".section-card");
            let sectionName = "this section";
            if (card) {
                const titleEl = card.querySelector(".section-card-title");
                if (titleEl) sectionName = titleEl.textContent.split(" - ")[1] || titleEl.textContent;
            }

            const confirmModal = document.getElementById("publishConfirmModal");
            const confirmTitle = document.getElementById("publishConfirmTitle");
            const confirmMessage = document.getElementById("publishConfirmMessage");
            const confirmBtn = document.getElementById("confirmPublishBtn");
            const cancelBtn = document.getElementById("cancelPublishBtn");
            const iconWrapper = document.querySelector(".publish-warning-icon-wrapper");
            const iconEl = document.querySelector(".publish-warning-icon");

            confirmTitle.textContent = "Auto-Generate Schedule";
            confirmTitle.style.color = "#a84444"; 
            confirmMessage.innerHTML = `Are you sure you want to automatically generate a schedule for <strong>${sectionName}</strong>?<br><br><span style="font-size: 13px; color: #888;">Any existing schedule for this section will be deleted and overwritten.</span>`;
            confirmBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Yes, Auto-Generate';
            confirmBtn.style.backgroundColor = "#a84444";
            cancelBtn.style.display = "block"; 
            
            if (iconWrapper && iconEl) {
                iconWrapper.style.background = "#f1d4d4"; 
                iconEl.className = "fa-solid fa-wand-magic-sparkles publish-warning-icon";
                iconEl.style.color = "#a84444";
            }

            confirmModal.classList.remove("hidden");
            confirmModal.style.display = "flex";

            cancelBtn.onclick = () => {
                confirmModal.classList.add("hidden");
                confirmModal.style.display = "none";
            };

            confirmBtn.onclick = () => {
                confirmModal.classList.add("hidden");
                confirmModal.style.display = "none";

                const originalHtml = genSchedBtn.innerHTML;
                genSchedBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
                genSchedBtn.disabled = true;

                fetch("../api/autoSchedule.php", { method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({ section_id: id }) })
                .then(res => res.json())
                .then(data => {
                    genSchedBtn.innerHTML = originalHtml;
                    genSchedBtn.disabled = false;
                    
                    if (data.status === "success") {
                        confirmTitle.textContent = "Success!";
                        confirmTitle.style.color = "#28a745"; 
                        confirmMessage.innerHTML = data.message;
                        confirmBtn.innerHTML = '<i class="fa-solid fa-check"></i> Awesome!';
                        confirmBtn.style.backgroundColor = "#28a745";
                        cancelBtn.style.display = "none"; 
                        
                        if (iconWrapper && iconEl) {
                            iconWrapper.style.background = "#d4edda"; 
                            iconEl.className = "fa-solid fa-circle-check publish-warning-icon";
                            iconEl.style.color = "#28a745";
                        }
                        
                        confirmModal.classList.remove("hidden");
                        confirmModal.style.display = "flex";
                        
                        confirmBtn.onclick = () => {
                            confirmModal.classList.add("hidden");
                            confirmModal.style.display = "none";
                            loadSchedule(id, sectionName, true);
                            switchToScheduleTab(); 
                        };
                    } else {
                        confirmTitle.textContent = "Scheduling Incomplete";
                        confirmTitle.style.color = "#c83b3b"; 
                        confirmMessage.innerHTML = `<strong>Could not fully generate the schedule for ${sectionName}.</strong><br>
                        <div style="background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 6px; color: #721c24; font-size: 13px; margin-top: 15px; line-height: 1.5; text-align: left; box-shadow: inset 0 1px 3px rgba(0,0,0,0.05);">
                            ${data.message}
                        </div>
                        <p style="font-size: 12px; color: #666; margin-top: 15px;">The AI saved what it could. You can manually place the remaining subjects by jumping into the Timetable Editor.</p>`;
                        
                        confirmBtn.innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Edit Manually';
                        confirmBtn.style.backgroundColor = "#c83b3b"; 
                        cancelBtn.style.display = "none"; 
                        
                        if (iconWrapper && iconEl) {
                            iconWrapper.style.background = "#f8d7da"; 
                            iconEl.className = "fa-solid fa-circle-xmark publish-warning-icon"; 
                            iconEl.style.color = "#c83b3b";
                        }
                        
                        confirmModal.classList.remove("hidden");
                        confirmModal.style.display = "flex";
                        
                        confirmBtn.onclick = () => {
                            confirmModal.classList.add("hidden");
                            confirmModal.style.display = "none";
                            loadSchedule(id, sectionName, true);
                            switchToScheduleTab(); 
                        };
                    }
                })
                .catch(err => {
                    genSchedBtn.innerHTML = originalHtml;
                    genSchedBtn.disabled = false;
                    confirmTitle.textContent = "System Error";
                    confirmMessage.innerHTML = `<strong>A critical error occurred while generating the schedule.</strong>`;
                    confirmBtn.innerHTML = 'Close';
                    confirmBtn.style.backgroundColor = "#6c757d";
                    cancelBtn.style.display = "none"; 
                    confirmModal.classList.remove("hidden");
                    confirmModal.style.display = "flex";
                    confirmBtn.onclick = () => {
                        confirmModal.classList.add("hidden");
                        confirmModal.style.display = "none";
                    };
                });
            };
        }

        const autoFixBtn = e.target.closest(".auto-fix-conflict-btn");
        if (autoFixBtn) {
            e.preventDefault();
            const sectionId = autoFixBtn.dataset.id;
            const sectionName = autoFixBtn.dataset.name;
            const rawObj = autoFixBtn.dataset.obj;

            if (confirm(`Do you want the system to fix this issue by re-generating a new schedule for ${sectionName}?`)) {
                const originalHTML = autoFixBtn.innerHTML;
                autoFixBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Fixing...';
                autoFixBtn.disabled = true;

                fetch("../api/autoSchedule.php", {
                    method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({ section_id: sectionId })
                })
                .then(res => res.json())
                .then(data => {
                    alert(`Result for ${sectionName}: ${data.message}`);
                    if (data.status === "success") {
                        if (rawObj) {
                            let item = JSON.parse(rawObj);
                            item.status = "resolved";
                            item.date_formatted = new Date().toLocaleDateString();
                            let history = JSON.parse(localStorage.getItem('thesis_conflict_history') || "[]");
                            history.unshift(item);
                            localStorage.setItem('thesis_conflict_history', JSON.stringify(history));
                        }
                        if (typeof fetchConflictDetails === "function") fetchConflictDetails();
                        if (typeof loadLRConflicts === "function") loadLRConflicts();
                        if (typeof loadSectionsDashboardCounts === "function") loadSectionsDashboardCounts();
                        if (typeof loadSections === "function") loadSections();
                    } else {
                        autoFixBtn.innerHTML = originalHTML;
                        autoFixBtn.disabled = false;
                    }
                });
            }
        }

        // --- 🚨 NEW: MERGE / KEEP CLASS LOGIC ---
        const mergeBtn = e.target.closest(".merge-conflict-btn");
        if (mergeBtn) {
            e.preventDefault();
            const rawObj = mergeBtn.dataset.obj;
            const signature = mergeBtn.dataset.signature;

            if (confirm("Are you sure you want to merge these classes? This will ignore the conflict warning and permanently allow them to share this time slot and room.")) {
                
                const originalHTML = mergeBtn.innerHTML;
                mergeBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Merging...';
                mergeBtn.disabled = true;

                // 1. Save signature to the ignored list so it never bothers you again
                let ignored = JSON.parse(localStorage.getItem('thesis_ignored_conflicts') || "[]");
                if (!ignored.includes(signature)) {
                    ignored.push(signature);
                    localStorage.setItem('thesis_ignored_conflicts', JSON.stringify(ignored));
                }

                // 2. Add to resolved history so it shows beautifully in the Logs
                if (rawObj) {
                    let item = JSON.parse(rawObj);
                    item.status = "resolved";
                    item.type = "Merged Class";
                    item.message = "<strong>[MERGED SUCCESSFULLY]</strong> " + item.message;
                    item.date_formatted = new Date().toLocaleDateString();
                    
                    let history = JSON.parse(localStorage.getItem('thesis_conflict_history') || "[]");
                    history.unshift(item);
                    localStorage.setItem('thesis_conflict_history', JSON.stringify(history));
                }

                setTimeout(() => {
                    alert("Classes successfully merged! The conflict warning has been removed.");
                    
                    // 3. Refresh ALL UIs
                    if (typeof fetchConflictDetails === "function") fetchConflictDetails();
                    if (typeof loadLRConflicts === "function") loadLRConflicts();
                    if (typeof refreshDashboardStats === "function") refreshDashboardStats();
                }, 500);
            }
        }

        

        const editManualBtn = e.target.closest(".edit-manual-btn");
        if (editManualBtn) openManualEditor(editManualBtn.dataset.id, editManualBtn.dataset.name);

        const editSlotBtn = e.target.closest(".edit-slot-btn");
        if (editSlotBtn) {
            e.preventDefault();
            const card = editSlotBtn.closest(".schedule-class-card");
            if (card.classList.contains("is-locked")) return alert("Unlock class to edit.");

            document.getElementById("editSlotCardId").value = card.dataset.id;
            document.getElementById("editSlotDay").value = card.dataset.newDay || card.dataset.day || "Monday";
            document.getElementById("editSlotMode").value = card.dataset.mode || "FTF";

            fetch('../api/getTeachers.php').then(res => res.json()).then(data => {
                const teacherSelect = document.getElementById("editSlotTeacher");
                teacherSelect.innerHTML = '<option value="">TBA (Unassigned)</option>';
                data.forEach(t => {
                    const selected = (t.teacher_id == card.dataset.teacherId) ? "selected" : "";
                    teacherSelect.innerHTML += `<option value="${t.teacher_id}" ${selected}>${t.full_name}</option>`;
                });
            });
            fetch('../api/getRooms.php').then(res => res.json()).then(result => {
                const roomSelect = document.getElementById("editSlotRoom");
                roomSelect.innerHTML = '<option value="">TBA (Unassigned)</option>';
                
                // Safely extract the data whether it's wrapped in 'success' or just a raw array
                const roomList = result.success ? result.data : (Array.isArray(result) ? result : []);
                
                roomList.forEach(r => {
                    const safeName = r.name || r.room_name || "Unknown Room";
                    const safeId = r.id || r.room_id || "";
                    const selected = (safeName === card.dataset.roomName) ? "selected" : "";
                    roomSelect.innerHTML += `<option value="${safeId}" ${selected}>${safeName}</option>`;
                });
            }).catch(err => console.error("Error loading rooms for editor:", err));

            const timeStr = card.dataset.timeSlot || "07:00-08:30";
            const parts = timeStr.split('-');
            if(parts.length === 2) {
                let cleanStart = parts[0].trim().replace(/[AP]M/i, '').trim();
                let cleanEnd = parts[1].trim().replace(/[AP]M/i, '').trim();
                if(cleanStart.length === 4) cleanStart = "0" + cleanStart;
                if(cleanEnd.length === 4) cleanEnd = "0" + cleanEnd;
                document.getElementById("editSlotStartTime").value = cleanStart;
                document.getElementById("editSlotEndTime").value = cleanEnd;
            }
            const modal = document.getElementById("editScheduleSlotModal");
            modal.classList.remove("hidden");
            modal.style.display = "flex";
        }


        // --- 🚨 THE MISSING FIX: APPLY CHANGES IN EDITOR 🚨 ---
        const saveSlotEditBtn = e.target.closest("#saveSlotEditBtn");
        if (saveSlotEditBtn) {
            e.preventDefault();
            
            // 1. Grab all the new values from the modal
            const cardId = document.getElementById("editSlotCardId").value;
            const newDay = document.getElementById("editSlotDay").value;
            const startTime = document.getElementById("editSlotStartTime").value;
            const endTime = document.getElementById("editSlotEndTime").value;
            const newMode = document.getElementById("editSlotMode").value;

            const teacherSelect = document.getElementById("editSlotTeacher");
            const newTeacherId = teacherSelect.value;
            const newTeacherName = teacherSelect.options[teacherSelect.selectedIndex].text;

            const roomSelect = document.getElementById("editSlotRoom");
            const newRoomId = roomSelect.value;
            const newRoomName = roomSelect.options[roomSelect.selectedIndex].text;

            if (!startTime || !endTime) return alert("Please select a valid time slot.");

            // 2. Find the exact card on the screen
            const card = document.querySelector(`.schedule-class-card[data-id="${cardId}"]`);
            if (!card) return alert("Could not find the class card to update.");

            // 3. Convert 24hr time (14:30) to 12hr time (02:30 PM) for the UI
            function formatAmPm(time24) {
                let parts = time24.split(':');
                let h = parseInt(parts[0]);
                let m = parts[1];
                let ampm = h >= 12 ? 'PM' : 'AM';
                let h12 = h % 12 || 12;
                h12 = h12.toString().padStart(2, '0');
                return `${h12}:${m} ${ampm}`;
            }
            const timeSlotStr = `${formatAmPm(startTime)} - ${formatAmPm(endTime)}`;

            // 4. Update the Card's hidden data
            card.dataset.newDay = newDay;
            card.dataset.timeSlot = timeSlotStr;
            card.dataset.mode = newMode;
            card.dataset.teacherId = newTeacherId;
            card.dataset.roomName = newRoomName;

            // 5. Update the Card's visual text
            const teacherSpan = card.querySelector('.card-teacher-name');
            if (teacherSpan) teacherSpan.textContent = newTeacherId ? newTeacherName : 'TBA';

            const roomSpan = card.querySelector('.card-room-mode');
            if (roomSpan) roomSpan.textContent = newRoomName;

            // 6. Physically move the card to the new Day column
            const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const dayIndex = days.indexOf(newDay);
            if (dayIndex !== -1) {
                card.style.left = `calc(${dayIndex * 16.666}% + 4px)`;
            }

            // 7. Physically stretch and position the card to the new Time Slot
            if (typeof parseTimeSlot === 'function') {
                const dimensions = parseTimeSlot(timeSlotStr);
                card.style.top = dimensions.top + "px";
                card.style.height = dimensions.height + "px";
            }

            // 8. Add a cool flash animation to show it updated
            card.style.transform = "scale(1.05)";
            setTimeout(() => card.style.transform = "none", 200);

            // 9. Close Modal
            document.getElementById("editScheduleSlotModal").classList.add("hidden");
            document.getElementById("editScheduleSlotModal").style.display = "none";
        }


        
        const publishBtn = e.target.closest("#publishScheduleBtn");
        if (publishBtn) {
            e.preventDefault();
            const sectionId = publishBtn.dataset.sectionId;
            if (!sectionId) return alert("Error: No section selected.");
            const unplacedCards = Array.from(document.querySelectorAll('.unplaced-card'))
                                       .filter(card => card.style.display !== 'none' && card.style.opacity !== '0.4');
            const confirmModal = document.getElementById("publishConfirmModal");
            const confirmTitle = document.getElementById("publishConfirmTitle");
            const confirmMessage = document.getElementById("publishConfirmMessage");
            const confirmBtn = document.getElementById("confirmPublishBtn");
            const cancelBtn = document.getElementById("cancelPublishBtn");

            if (unplacedCards.length > 0) {
                confirmTitle.textContent = "Incomplete Schedule!";
                confirmMessage.innerHTML = "You still have <strong>unplaced subjects</strong>. Publish anyway?";
                confirmBtn.innerHTML = "Yes, Publish Anyway";
            } else {
                confirmTitle.textContent = "Publish Schedule";
                confirmMessage.innerHTML = "Manually publish and overwrite the live schedule?";
                confirmBtn.innerHTML = "Yes, Publish Schedule";
            }

            confirmModal.classList.remove("hidden");
            confirmModal.style.display = "flex";
            cancelBtn.onclick = () => { confirmModal.classList.add("hidden"); confirmModal.style.display = "none"; };
            confirmBtn.onclick = () => {
                confirmModal.classList.add("hidden");
                confirmModal.style.display = "none";
                const payload = [];
                document.querySelectorAll('#editorGridArea .schedule-class-card').forEach(card => {
                    payload.push({
                        subject_id: card.dataset.subjectId, 
                        subject_code: card.dataset.subjectCode,
                        teacher_id: card.dataset.teacherId || "",
                        room_name: card.querySelector('.card-room-mode').textContent.trim(),
                        day: card.dataset.newDay || card.dataset.day,
                        time_slot: card.dataset.timeSlot
                    });
                });
                fetch('../api/publishSchedule.php', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ section_id: sectionId, schedules: payload })
                })
                .then(res => res.json())
                .then(data => {
                    if (data.status === 'success') {
                        loadSections();
                        const btnViewAll = document.getElementById("btnViewAllSections");
                        if (btnViewAll) btnViewAll.click();
                        loadSchedule(sectionId, document.getElementById("editorActiveSectionNameDisplay").textContent);
                    }
                });
            };
        }

        // --- 7. DELETE ACTIONS ---
        const delSubBtn = e.target.closest(".delete-subject");
        if (delSubBtn) {
            if (!confirm("Delete this subject?")) return;
            fetch("../api/deleteSubject.php", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subject_id: delSubBtn.dataset.id }) })
            .then(res => res.json()).then(data => { alert(data.message); loadSubjects(); });
        }

        const delRoomBtn = e.target.closest(".deleteRoom");
        if (delRoomBtn) {
            const roomId = delRoomBtn.dataset.id;
            if (!confirm("Archive this room and its schedules?")) return;

            fetch("../api/deleteRoom.php", { 
                method: "POST", 
                headers: { "Content-Type": "application/json" }, 
                body: JSON.stringify({ id: roomId }) 
            })
            .then(res => res.json())
            .then(data => { 
                if (data.status === 'success') {
                    alert(data.message); 
                    loadRooms(); // Refresh main list
                    if (typeof loadArchivedRooms === 'function') loadArchivedRooms(); // Refresh archive list
                } else {
                    alert("Error: " + data.message);
                }
            })
            .catch(err => console.error("Request failed", err));
        }

        const delTeacherBtn = e.target.closest("#delete_teacher_btn");
        if (delTeacherBtn) {
            if (!confirm("Delete this teacher?")) return;
            fetch("../api/deleteTeacher.php", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ teacher_id: delTeacherBtn.dataset.id }) })
            .then(r => r.json()).then(res => { alert(res.message); load_teachers(); });
        }
        
        const delStudentBtn = e.target.closest("#delete_student_btn");
        if (delStudentBtn) {
            if (!confirm("Delete this student?")) return;
            fetch("../api/deleteStudent.php", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ student_id: delStudentBtn.dataset.id }) })
            .then(r => r.json()).then(res => { alert(res.message); load_students(); loadArchivedStudents(); });
        }

        const deleteSlotBtn = e.target.closest(".delete-slot-btn");
        if (deleteSlotBtn) {
            e.preventDefault();
            const card = deleteSlotBtn.closest(".schedule-class-card");
            if (card.classList.contains("is-locked")) return alert("Unlock class to delete.");
            if (confirm("Remove this schedule block?")) { card.remove(); updateSidebarHours(); }
        }

        // --- 8. MISC ACTIONS ---
        const importBtn = e.target.closest("#importExcelBtn");
        if (importBtn) { e.preventDefault(); document.getElementById("excelFileInput").click(); }

        function switchToScheduleTab() {
            document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
            document.getElementById('schedule').classList.remove('hidden');
            document.querySelectorAll('.nav-menu a').forEach(i => i.classList.remove('active'));
            const scheduleLink = document.querySelector('.nav-menu a[data-page="schedule"]');
            if (scheduleLink) scheduleLink.classList.add('active');
        }
        


    });

       /* ==========================================================================
        * 10. LOGS & REPORTS SECTION LOGIC
        * ========================================================================== */

        const lrAvailableReports = [
            { name: "Master Schedule Report", description: "Complete timetable for all sections, rooms, and teachers", icon: "📅", category: "Schedule" },
        ];

        function statusBadgeHTML(status) {
            const map = { success: ['badge-green', '✓ Success'], warning: ['badge-amber', '⚠ Warning'], destructive: ['badge-red', '✕ Error'] };
            const [cls, text] = map[status] || ['badge-outline', status];
            return `<span class="lr-badge ${cls}">${text}</span>`;
        }

        function conflictTypeBadge(type) {
            const map = { 'Room Conflict': 'badge-red', 'Teacher Overlap': 'badge-amber', 'Overload': 'badge-purple', 'Time Gap': 'badge-blue' };
            return `<span class="lr-badge ${map[type] || 'badge-outline'}">${type}</span>`;
        }

        function actionIconHTML(action) {
            const colors = { Created: 'var(--lr-emerald)', Updated: 'var(--lr-blue)', Deleted: 'var(--lr-red)', Generated: 'var(--lr-purple)', Resolved: 'hsl(38,92%,40%)', Failed: 'var(--lr-red)' };
            const symbols = { Created: '+', Updated: '✎', Deleted: '🗑', Generated: '↻', Resolved: '✓', Failed: '✕' };
            return `<span class="action-icon" style="color:${colors[action] || 'var(--lr-muted)'}">${symbols[action] || '•'} ${action}</span>`;
        }

        // --- LIVE ACTIVITY LOGS LOGIC ---
        let allActivityLogs = []; 
        let currentActivityPage = 1;    
        const activityItemsPerPage = 20;
        
        function loadActivityLogs() {
            fetch('../api/getLogs.php')
                .then(res => res.json())
                .then(data => {
                    allActivityLogs = data.map(row => {
                        let actionText = "Updated";
                        let moduleText = "System";
                        let statusText = "success";

                        const at = (row.action_type || "").toUpperCase();
                        const desc = (row.description || "").toLowerCase();

                        if (at.includes("ADD") || at.includes("CREATE") || at.includes("INSERT")) actionText = "Created";
                        else if (at.includes("DELETE") || at.includes("REMOVE")) actionText = "Deleted";
                        else if (at.includes("PUBLISH") || at.includes("GENERATE") || at.includes("AUTO")) actionText = "Generated";
                        else if (at.includes("LOGIN") || at.includes("LOGOUT")) actionText = "Resolved"; 

                        if (at.includes("SUBJECT") || desc.includes("subject")) moduleText = "Subjects";
                        else if (at.includes("TEACHER") || desc.includes("teacher")) moduleText = "Teachers";
                        else if (at.includes("STUDENT") || desc.includes("student")) moduleText = "Students";
                        else if (at.includes("ROOM") || desc.includes("room")) moduleText = "Rooms";
                        else if (at.includes("SECTION") || desc.includes("section")) moduleText = "Sections";
                        else if (at.includes("SCHEDULE") || desc.includes("schedule")) moduleText = "Schedules";

                        if (desc.includes("fail") || desc.includes("error") || at.includes("ERROR")) statusText = "destructive";
                        else if (desc.includes("warn") || desc.includes("conflict")) statusText = "warning";

                        return {
                            timestamp: row.formatted_date || row.timestamp,
                            action: actionText,
                            module: moduleText,
                            description: row.description || row.action_type,
                            status: statusText
                        };
                    });
                    renderLRActivityTable();
                })
                .catch(err => console.error("Error fetching logs:", err));
        }

        function renderLRActivityTable() {
            const search = document.getElementById('lrSearchInput')?.value.toLowerCase() || "";
            const modFilter = document.getElementById('lrModuleFilter')?.value.toLowerCase() || "all";
            const statFilter = document.getElementById('lrStatusFilter')?.value.toLowerCase() || "all";

            const filtered = allActivityLogs.filter(log => {
                const matchSearch = log.description.toLowerCase().includes(search) || log.action.toLowerCase().includes(search);
                const matchMod = modFilter === 'all' || log.module.toLowerCase() === modFilter;
                const matchStat = statFilter === 'all' || log.status.toLowerCase() === statFilter;
                return matchSearch && matchMod && matchStat;
            });

            const totalPages = Math.ceil(filtered.length / activityItemsPerPage);
            if (currentActivityPage > totalPages && totalPages > 0) currentActivityPage = totalPages;
            if (currentActivityPage < 1) currentActivityPage = 1;

            const startIndex = (currentActivityPage - 1) * activityItemsPerPage;
            const endIndex = startIndex + activityItemsPerPage;
            const paginatedLogs = filtered.slice(startIndex, endIndex); 

            const tbody = document.getElementById('activityTableBody');
            if (!tbody) return;

            if (paginatedLogs.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px; color: #888;">No matching activity logs found.</td></tr>`;
            } else {
                tbody.innerHTML = paginatedLogs.map(log => `
                    <tr>
                    <td class="text-mono">${log.timestamp}</td>
                    <td>${actionIconHTML(log.action)}</td>
                    <td><span class="lr-badge badge-outline">${log.module}</span></td>
                    <td class="text-truncate">${log.description}</td>
                    <td>${statusBadgeHTML(log.status)}</td>
                    </tr>
                `).join('');
            }

            const logCountEl = document.getElementById('logCount');
            if (logCountEl) {
                const startDisplay = filtered.length === 0 ? 0 : startIndex + 1;
                const endDisplay = Math.min(endIndex, filtered.length);
                logCountEl.textContent = `Showing ${startDisplay} to ${endDisplay} of ${filtered.length} entries`;
            }

            const prevBtn = document.getElementById('lrPrevPageBtn');
            const nextBtn = document.getElementById('lrNextPageBtn');
            
            if (prevBtn) prevBtn.disabled = currentActivityPage === 1;
            if (nextBtn) nextBtn.disabled = currentActivityPage >= totalPages || totalPages === 0;
        }

        // --- Event Listeners for Activity Logs ---
        document.getElementById('lrSearchInput')?.addEventListener('input', () => { currentActivityPage = 1; renderLRActivityTable(); });
        document.getElementById('lrModuleFilter')?.addEventListener('change', () => { currentActivityPage = 1; renderLRActivityTable(); });
        document.getElementById('lrStatusFilter')?.addEventListener('change', () => { currentActivityPage = 1; renderLRActivityTable(); });

        document.getElementById('lrPrevPageBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation(); 
            if (currentActivityPage > 1) {
                currentActivityPage--;
                renderLRActivityTable();
            }
        });

        document.getElementById('lrNextPageBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation(); 
            currentActivityPage++;
            renderLRActivityTable();
        });

        
       
            // --- LIVE CONFLICT LOGS LOGIC ---
function loadLRConflicts() {
        fetch('../api/getConflicts.php')
            .then(res => res.text())
            .then(text => {
                try {
                    const data = JSON.parse(text);
                    const tbody = document.getElementById('conflictTableBody');
                    if (!tbody) return;

                    // 🚨 NEW: Filter out merged/ignored conflicts
                    let ignored = JSON.parse(localStorage.getItem('thesis_ignored_conflicts') || "[]");
                    let activeConflicts = (data.details || []).filter(c => !ignored.includes(c.sec1_id + '_' + c.sec2_id));
                    
                    activeConflicts.forEach(c => c.status = 'active'); 

                    let history = JSON.parse(localStorage.getItem('thesis_conflict_history') || "[]");
                    const activeIds = activeConflicts.map(c => c.id);
                    history = history.filter(h => !activeIds.includes(h.id));
                    localStorage.setItem('thesis_conflict_history', JSON.stringify(history));

                    const unresolvedBadge = document.querySelector('#tab-conflicts .badge-red');
                    if (unresolvedBadge) unresolvedBadge.textContent = `${activeConflicts.length} Unresolved`;

                    const allLogs = [...activeConflicts, ...history];

                    if (allLogs.length === 0) {
                        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 40px; color: #888;">
                            <i class="fa-solid fa-circle-check" style="color: #28a745; font-size: 32px; margin-bottom: 12px; display:block;"></i>
                            No schedule conflicts have been recorded. Your schedule is clear!
                        </td></tr>`;
                        return;
                    }

                    tbody.innerHTML = allLogs.map((item, index) => {
                        const isActive = item.status === 'active';
                        const safeObj = JSON.stringify(item).replace(/'/g, "&#39;");
                        
                        const badgeHTML = isActive 
                            ? '<span class="lr-badge badge-red">⚠ Unresolved</span>' 
                            : '<span class="lr-badge badge-green">✓ Resolved</span>';
                        
                        const pointerMsg = isActive 
                            ? `<br><span style="font-size: 11px; color: #2980b9; margin-top: 8px; display: inline-block; font-weight: bold;"><i class="fa-solid fa-hand-pointer"></i> Click row to view fix options ▾</span>` 
                            : '';
                        
                        const actionRow = isActive ? `
                            <tr id="conflict-action-${index}" class="lr-conflict-row-action" style="display: none; background-color: #f8fafc;">
                                <td colspan="7" style="padding: 15px 20px; border-top: 1px dashed #cbd5e1; border-bottom: 2px solid #e2e8f0;">
                                    <div style="display:flex; gap:10px; justify-content: flex-end; align-items: center;">
                                        <span style="font-size: 13px; color: #64748b; margin-right: auto;">
                                            <i class="fa-solid fa-screwdriver-wrench"></i> <strong>Resolution Options:</strong>
                                        </span>
                                        <button class="lr-btn btn-outline btn-sm auto-fix-conflict-btn" data-id="${item.sec1_id}" data-name="${item.sec1_name}" data-obj='${safeObj}' style="border-color:#2980b9; color:#2980b9; background: white;">
                                            <i class="fa-solid fa-wand-magic-sparkles"></i> Fix ${item.sec1_name}
                                        </button>
                                        <button class="lr-btn btn-outline btn-sm auto-fix-conflict-btn" data-id="${item.sec2_id}" data-name="${item.sec2_name}" data-obj='${safeObj}' style="border-color:#2980b9; color:#2980b9; background: white;">
                                            <i class="fa-solid fa-wand-magic-sparkles"></i> Fix ${item.sec2_name}
                                        </button>
                                        
                                        <button class="lr-btn btn-outline btn-sm merge-conflict-btn" data-signature="${item.sec1_id}_${item.sec2_id}" data-obj='${safeObj}' style="border-color:#10b981; color:#10b981; background: #f0fdf4;">
                                            <i class="fa-solid fa-link"></i> Keep & Merge Class
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ` : '';

                        return `
                            <tr class="${isActive ? 'lr-conflict-row-main' : ''}" data-target="conflict-action-${index}" style="cursor: ${isActive ? 'pointer' : 'default'}; transition: background 0.2s; opacity: ${isActive ? '1' : '0.6'}; background-color: ${isActive ? 'transparent' : '#fcfcfc'};">
                                <td class="text-mono" style="white-space: nowrap; font-weight: bold; color: ${isActive ? '#c83b3b' : '#28a745'};">${item.date_formatted || 'Active'}</td>
                                <td>${conflictTypeBadge(item.type)}</td>
                                <td style="font-weight:500;">
                                    ${item.sec1_name} <br><span style="font-size:10px; color:#888; margin: 2px 0; display:inline-block;">vs</span><br> ${item.sec2_name}
                                </td>
                                <td colspan="3" class="text-muted" style="line-height: 1.6; font-size: 13px;">
                                    ${item.message} 
                                    ${pointerMsg}
                                </td>
                                <td style="white-space: nowrap;">${badgeHTML}</td>
                            </tr>
                            ${actionRow}
                        `;
                    }).join('');
                } catch (e) {
                    console.error("Logs JSON Error:", text);
                }
            })
            .catch(err => console.error("Error fetching logs:", err));
        }
    

        // Accordion Row Click Listener
        document.addEventListener('click', e => {
            const mainRow = e.target.closest('.lr-conflict-row-main');
            if (mainRow) {
                const targetId = mainRow.getAttribute('data-target');
                const targetRow = document.getElementById(targetId);
                
                if (targetRow) {
                    const isHidden = targetRow.style.display === 'none' || targetRow.style.display === '';
                    
                    document.querySelectorAll('.lr-conflict-row-action').forEach(row => row.style.display = 'none');
                    document.querySelectorAll('.lr-conflict-row-main').forEach(row => row.style.backgroundColor = 'transparent');

                    if (isHidden) {
                        targetRow.style.display = 'table-row';
                        mainRow.style.backgroundColor = '#f1f5f9'; 
                    }
                }
            }
        });
        function renderLRReportsGrid() {
            const grid = document.getElementById('reportsGrid');
            if(!grid) return;
            grid.innerHTML = lrAvailableReports.map(r => `
                <div class="report-card">
                <div class="report-top">
                    <div class="report-icon" style="font-size:24px">${r.icon}</div>
                    <div class="report-info">
                    <span class="lr-badge badge-outline badge-category">${r.category}</span>
                    <h3>${r.name}</h3>
                    <p>${r.description}</p>
                    </div>
                </div>
                <hr class="report-separator">
                <div class="report-actions">
                    <button class="lr-btn btn-primary btn-sm">⬇ Download</button>
                </div>
                </div>
            `).join('');
        }

        // Tab Switching
        document.querySelectorAll('#logs_reports .tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                document.querySelectorAll('#logs_reports .tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('#logs_reports .tab-content').forEach(c => c.classList.remove('active'));
                btn.classList.add('active');
                const tabId = 'tab-' + btn.dataset.tab;
                const targetTab = document.getElementById(tabId);
                if(targetTab) targetTab.classList.add('active');

                if (btn.dataset.tab === 'analytics' && !window._lrChartsInit) {
                    initLRCharts();
                    window._lrChartsInit = true;
                }
            });
        });

        function initLRCharts() {
            const baseOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: 'hsl(220,13%,91%)' } }, x: { grid: { display: false } } } };
            const sChart = document.getElementById('chartSchedules');
            const rChart = document.getElementById('chartRooms');
            const cChart = document.getElementById('chartConflicts');
            const tChart = document.getElementById('chartTeachers');

            if(sChart) new Chart(sChart, { type: 'bar', data: { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], datasets: [{ data: [28, 32, 26, 30, 24, 8], backgroundColor: 'hsl(0,72%,51%)', borderRadius: 6 }] }, options: baseOptions });
            if(rChart) new Chart(rChart, { type: 'doughnut', data: { labels: ['Lecture', 'Labs', 'Auditorium', 'Others'], datasets: [{ data: [45, 40, 10, 5], backgroundColor: ['hsl(0,72%,51%)', 'hsl(0,72%,65%)', 'hsl(0,72%,80%)', 'hsl(220,14%,75%)'], borderWidth: 0 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { padding: 16, font: { size: 12 } } } } } });
            if(cChart) new Chart(cChart, { type: 'line', data: { labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'], datasets: [{ label: 'Conflicts', data: [8, 5, 12, 3], borderColor: 'hsl(0,72%,51%)', borderWidth: 2, tension: 0.3, fill: false }, { label: 'Resolved', data: [6, 5, 9, 2], borderColor: 'hsl(142,72%,40%)', borderWidth: 2, tension: 0.3, fill: false }] }, options: { ...baseOptions, plugins: { legend: { display: true, position: 'bottom' } } } });
            if(tChart) new Chart(tChart, { type: 'bar', data: { labels: ['0-12 hrs', '13-18 hrs', '19-24 hrs', '25+ hrs'], datasets: [{ data: [4, 12, 8, 2], backgroundColor: 'hsl(0,72%,65%)', borderRadius: 6 }] }, options: baseOptions });
        }

        function loadLRSummaryStats() {
            fetch('../api/getDashboardCounts.php')
                .then(response => response.json())
                .then(data => {
                    const sectionsCount = document.getElementById('lr_stat_sections');
                    const conflictsCount = document.getElementById('lr_stat_conflicts');
                    const teachersCount = document.getElementById('lr_stat_teachers');
                    const roomsCount = document.getElementById('lr_stat_rooms');

                    if (sectionsCount) sectionsCount.textContent = data.sections || 0;
                    if (conflictsCount) conflictsCount.textContent = data.conflicts || 0;
                    if (teachersCount) teachersCount.textContent = data.teachers || 0;
                    if (roomsCount) roomsCount.textContent = data.rooms || 0;
                })
                .catch(error => console.error("Error loading LR stats:", error));
        }

    
        // --- EXCEL FILE LISTENER ---
        const fileInput = document.getElementById('excelFileInput');
        if (fileInput) {
            fileInput.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = function(e) {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, {type: 'array'});
                    
                    // Assume the first sheet is the one we want
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    
                    // Convert to JSON
                    const json = XLSX.utils.sheet_to_json(worksheet);
                    
                    if(json.length === 0) return alert("The Excel file is empty!");
                    
                    // Standardize the keys (expecting columns like: student_id, full_name, email, course, year_level)
                   // THE MAGIC FIX: Read the exact headers from your newly generated Excel file!
                    const formattedData = json.map(row => {
                    return {
                        student_id: row['School ID'] || row['student_id'] || row['ID'] || '',
                        full_name: row['Full Name'] || row['Name'] || row['full_name'] || '',
                        email: row['Email'] || row['email'] || '',
                        course: row['Course'] || row['course'] || '',
                        year_level: row['Year Level'] || row['Year'] || row['year_level'] || 1,
                        section: row['Section'] || row['section'] || ''
                    };
                });

                    // Send to PHP
                    alert("Processing " + formattedData.length + " rows. Please wait...");
                    fetch("../api/importStudents.php", {
                        method: "POST", headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(formattedData)
                    })
                    .then(res => res.json())
                    .then(data => {
                        alert(data.message);
                        load_students(); 
                        fileInput.value = ""; 
                    });
                };
                reader.readAsArrayBuffer(file);
            });
        }
       
    // ==========================================
    // DASHBOARD LIVE REFRESHER (FINAL & CLEAN)
    // ==========================================
    window.refreshDashboardStats = function() {
    // 1. Main Dashboard Counts (Teachers, Rooms, Students, Subjects)
    fetch('../api/getDashboardCounts.php')
        .then(res => res.text())
        .then(text => {
            try {
                const data = JSON.parse(text);
                const mappings = {
                    'count_teachers': data.total_teachers,
                    'count_rooms': data.total_rooms,
                    'count_subjects': data.total_subjects,
                    'count_students': data.total_students,
                    
                    'teachers_count_total': data.total_teachers,
                    'rooms_count_total': data.total_rooms,
                    'students_count_total': data.total_students
                };

                for (const [id, value] of Object.entries(mappings)) {
                    const el = document.getElementById(id);
                    if (el && value !== undefined) el.textContent = value;
                }
            } catch (err) { }
        });

    // 2. Safely Update the Red Conflict Warnings
    fetch('../api/getConflicts.php')
        .then(res => res.text()) 
        .then(text => {
            try {
                const data = JSON.parse(text);
                let conflictsList = Array.isArray(data) ? data : (data.details || data.data || []);

                let ignored = JSON.parse(localStorage.getItem('thesis_ignored_conflicts') || "[]");
                conflictsList = conflictsList.filter(c => {
                    if (c.sec1_id && c.sec2_id) return !ignored.includes(c.sec1_id + '_' + c.sec2_id);
                    return true;
                });
                
                const conflictCount = conflictsList.length;

                const dashConflicts = document.getElementById('count_conflicts');
                if (dashConflicts) dashConflicts.textContent = conflictCount;

                const secConflicts = document.getElementById('sections_count_conflicts');
                if (secConflicts) secConflicts.textContent = conflictCount;

                const lrConflicts = document.getElementById('lr_stat_conflicts');
                if (lrConflicts) lrConflicts.textContent = conflictCount;
            } catch(err) { }
        });

    // 3. 🚨 THE DIAGNOSTIC SECTIONS SCANNER 🚨
    fetch('../api/getSections.php?limit=5000') 
        .then(res => res.text())
        .then(text => {
            try {
                const data = JSON.parse(text);
                const sectionsList = Array.isArray(data) ? data : (data.sections || data.data || []);
                
                console.log("✅ SUCCESS! Sections found:", sectionsList.length);
                console.log("📦 Raw Data:", data);

                const trueTotalSections = sectionsList.length;

                let completeCount = 0;
                sectionsList.forEach(sec => {
                    const statusText = (sec.schedule_status_text || sec.schedule_status || sec.status || '').toLowerCase();
                    const scheduled = parseFloat(sec.scheduled_hours || 0);
                    const required = parseFloat(sec.total_hours || sec.required_hours || 0);
                    
                    if (statusText.includes('complete') || (required > 0 && scheduled >= required)) {
                        completeCount++;
                    }
                });

                const dashTotalEl = document.getElementById('count_sections');
                if (dashTotalEl && trueTotalSections > 0) dashTotalEl.textContent = trueTotalSections;

                const pageTotalEl = document.getElementById('sections_count_total');
                if (pageTotalEl && trueTotalSections > 0) pageTotalEl.textContent = trueTotalSections;

                const countCompleteEl = document.getElementById('sections_count_complete');
                if (countCompleteEl) {
                    countCompleteEl.style.transform = 'scale(1.2)';
                    countCompleteEl.style.transition = '0.2s';
                    countCompleteEl.textContent = completeCount;
                    setTimeout(() => countCompleteEl.style.transform = 'scale(1)', 200);
                }
                
            } catch(e) {
                // 🚨 PRINT THE HIDDEN ERROR TO THE CONSOLE! 🚨
                console.error("❌ THE SECTIONS SCANNER CRASHED!");
                console.error("PHP Error Message:", text);
            }
        }).catch(err => {
            console.error("❌ NETWORK ERROR:", err);
        });
        // 2. Fetch data and Draw Charts
        fetch('../api/getChartData.php')
            .then(res => res.json())
            .then(data => {
                const canvases = document.querySelectorAll('canvas');
                if (canvases.length === 0) return;

                const studentCanvas = canvases[0];
                if (window.studentChart) window.studentChart.destroy();
                window.studentChart = new Chart(studentCanvas, {
                    type: 'bar',
                    data: {
                        labels: data.students.labels.length ? data.students.labels : ['No Data'], 
                        datasets: [{
                            label: 'Students',
                            data: data.students.values.length ? data.students.values : [0], 
                            backgroundColor: '#f34848',
                            borderRadius: 4
                        }]
                    },
                    options: { 
                        responsive: true, maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: { y: { beginAtZero: true, ticks: { stepSize: 5 } } }
                    }
                });

                if (canvases.length > 1) {
                    const roomCanvas = canvases[1];
                    if (window.roomChart) window.roomChart.destroy();

                    const centerTextPlugin = {
                        id: 'centerText',
                        beforeDraw: function(chart) {
                            if (chart.config.type !== 'doughnut') return;
                            const ctx = chart.ctx || chart.chart.ctx;
                            const width = chart.width || chart.chart.width;
                            const height = chart.height || chart.chart.height;
                            ctx.restore();
                            
                            ctx.font = "14px sans-serif";
                            ctx.textBaseline = "middle";
                            ctx.fillStyle = "#64748b";
                            const labelText = "Total Rooms";
                            const labelX = Math.round((width - ctx.measureText(labelText).width) / 2);
                            const labelY = (height / 2) - 15;
                            ctx.fillText(labelText, labelX, labelY);

                            ctx.font = "bold 36px sans-serif";
                            ctx.fillStyle = "#0f172a";
                            const total = data.rooms && data.rooms.total ? data.rooms.total : 0;
                            const numberText = total.toString();
                            const numberX = Math.round((width - ctx.measureText(numberText).width) / 2);
                            const numberY = (height / 2) + 15;
                            ctx.fillText(numberText, numberX, numberY);
                            ctx.save();
                        }
                    };

                    window.roomChart = new Chart(roomCanvas, {
                        type: 'doughnut',
                        data: {
                            labels: data.rooms.labels.length ? data.rooms.labels : ['Shared / General'],
                            datasets: [{ data: data.rooms.values.length ? data.rooms.values : [1], backgroundColor: ['rgb(31, 30, 30)', '#fc4e4e', '#9971f5', '#65d678', '#5693f5'], borderWidth: 0 }]
                        },
                        options: { responsive: true, maintainAspectRatio: false, cutoutPercentage: 75, cutout: '75%', plugins: { legend: { position: 'bottom' } }, legend: { position: 'bottom' } },
                        plugins: [centerTextPlugin] 
                    });
                }
            }).catch(e => console.error("Chart Error:", e));
    };

    
    // --- SECTION EDIT/DELETE DROPDOWN LOGIC ---
    window.toggleSecMenu = function(id, e) {
        e.stopPropagation(); // Stop clicking from doing other things
        
        // Hide all other open menus first
        document.querySelectorAll('[id^="sec-menu-"]').forEach(m => {
            if(m.id !== `sec-menu-${id}`) m.classList.add('hidden');
        });
        
        // Toggle the clicked one
        const menu = document.getElementById(`sec-menu-${id}`);
        if(menu) menu.classList.toggle('hidden');
    };

    // Close menus when clicking anywhere else on the screen
    document.addEventListener('click', () => {
        document.querySelectorAll('[id^="sec-menu-"]').forEach(m => m.classList.add('hidden'));
    });

    window.openEditSecModal = function(id, name, course, year, roomId) {
        document.getElementById('editSecId').value = id;
        document.getElementById('editSecName').value = name;
        document.getElementById('editSecCourse').value = course;
        document.getElementById('editSecYear').value = year;
        
        const roomSelect = document.getElementById('editSecRoom');
        fetch('../api/getRooms.php').then(res=>res.json()).then(data=>{
            let roomList = data.success ? data.data : (Array.isArray(data) ? data : []);
            roomSelect.innerHTML = '<option value="">None (Auto-Assign)</option>';
            roomList.forEach(r => {
                const rName = r.name || r.room_name;
                const rId = r.id || r.room_id;
                let sel = (rId == roomId) ? 'selected' : '';
                roomSelect.innerHTML += `<option value="${rId}" ${sel}>${rName}</option>`;
            });
            document.getElementById('editSectionModal').classList.remove('hidden');
            document.getElementById('editSectionModal').style.display = 'flex';
        });
    };

    window.saveEditedSection = function() {
        const id = document.getElementById('editSecId').value;
        const name = document.getElementById('editSecName').value;
        const course = document.getElementById('editSecCourse').value;
        const year = document.getElementById('editSecYear').value;
        const room = document.getElementById('editSecRoom').value;

        fetch('../api/editSection.php', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({id, name, course, year, room})
        }).then(res=>res.json()).then(data=>{
            if(data.success) {
                document.getElementById('editSectionModal').style.display = 'none';
                loadSections(); // Reload the UI!
            } else {
                alert("Error updating section: " + data.error);
            }
        });
    };

    window.deleteSec = function(id) {
        if(!confirm("Are you sure you want to delete this section? This will also remove its assigned subjects and generated schedule!")) return;
        
        fetch('../api/deleteSection.php', { // Make sure this filename matches your archive script
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({section_id: id}) // Using section_id to match our new PHP logic
        })
        .then(res => res.json())
        .then(data => {
            // MATCH THE PHP KEYS: 'status' instead of 'success'
            if(data.status === 'success') {
                alert(data.message); 
                loadSections(); // Refresh the list
            } else {
                // MATCH THE PHP KEYS: 'message' instead of 'error'
                alert("Error deleting section: " + (data.message || "Unknown error"));
            }
        })
        .catch(err => {
            console.error("Fetch error:", err);
            alert("System Error: Check console.");
        });
    };
    // --- MANAGE SUBJECTS LOGIC ---
    window.manageSectionSubjects = function(sectionId, sectionName) {
        document.getElementById('manageSubjSecId').value = sectionId;
        document.getElementById('manageSubjTitle').textContent = `Manage Subjects: ${sectionName}`;
        
        const listDiv = document.getElementById('manageSubjList');
        listDiv.innerHTML = '<div style="text-align:center; padding: 30px; color:#888;"><i class="fa-solid fa-spinner fa-spin" style="font-size: 24px; margin-bottom: 10px; color: var(--primary);"></i><br>Loading Subjects...</div>';
        
        document.getElementById('manageSectionSubjectsModal').classList.remove('hidden');
        document.getElementById('manageSectionSubjectsModal').style.display = 'flex';

        // 1. Fetch section details to get course and year
        fetch('../api/getAllSections.php')
        .then(res => res.json())
        .then(sections => {
            const sec = sections.find(s => s.section_id == sectionId);
            if (!sec) return listDiv.innerHTML = '<div style="color:red; text-align:center; padding: 20px;">Error: Section not found.</div>';

            // 2. Fetch ALL subjects for this course/year AND CURRENTLY assigned subjects
            const p1 = fetch(`../api/getSubjects.php?course_id=${sec.course}&year_level=${sec.year_level}`).then(r=>r.json());
            const p2 = fetch(`../api/getSectionSubjects.php?section_id=${sectionId}`).then(r=>r.json());

            Promise.all([p1, p2]).then(([allSubs, assignedSubs]) => {
                if (!allSubs.length) {
                    listDiv.innerHTML = '<div style="color:#888; text-align:center; padding: 20px;">No subjects exist in the database for this course and year level.</div>';
                    return;
                }

                const assignedIds = assignedSubs.map(sub => sub.id || sub.subject_id);

                // 3. Draw the checkboxes
                listDiv.innerHTML = allSubs.map(sub => {
                    const subId = sub.id || sub.subject_id;
                    const isChecked = assignedIds.includes(subId) ? 'checked' : '';
                    const boxStyle = isChecked ? 'border-color: var(--primary); background: #f0f9ff;' : 'border-color: #e2e8f0; background: #fff;';
                    
                    return `
                        <label style="display: flex; align-items: center; gap: 12px; padding: 12px; margin-bottom: 10px; border-radius: 8px; border: 2px solid transparent; ${boxStyle} transition: all 0.2s; cursor: pointer;" onmouseover="this.style.transform='translateX(4px)'" onmouseout="this.style.transform='none'">
                            <input type="checkbox" class="manage-sub-cb" value="${subId}" ${isChecked} style="width: 18px; height: 18px; cursor: pointer; accent-color: var(--primary);">
                            <div style="flex: 1;">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <strong style="color: #1e293b; font-size: 14px;">${sub.code}</strong>
                                    <span class="badge" style="font-size: 10px; background: #e2e8f0; color: #475569;">${sub.units || 3} Units</span>
                                </div>
                                <div style="font-size: 13px; color: #64748b; margin-top: 2px;">${sub.subject_description}</div>
                            </div>
                        </label>
                    `;
                }).join('');
                
                // Add event listeners to checkboxes to change styling when clicked
                document.querySelectorAll('.manage-sub-cb').forEach(cb => {
                    cb.addEventListener('change', function() {
                        const label = this.closest('label');
                        if (this.checked) {
                            label.style.borderColor = 'var(--primary)';
                            label.style.background = '#f0f9ff';
                        } else {
                            label.style.borderColor = '#e2e8f0';
                            label.style.background = '#fff';
                        }
                    });
                });
            });
        });
    };

    window.saveSectionSubjects = function() {
        const sectionId = document.getElementById('manageSubjSecId').value;
        const checkboxes = document.querySelectorAll('.manage-sub-cb:checked');
        const subjects = Array.from(checkboxes).map(cb => parseInt(cb.value));

        if (subjects.length === 0) {
            if (!confirm("Warning: You haven't selected any subjects! This will remove all subjects and delete the schedule for this section. Continue?")) return;
        }

        const btn = document.querySelector('#manageSectionSubjectsModal .btn-primary');
        const ogText = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
        btn.disabled = true;

        fetch('../api/updateSectionSubjects.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ section_id: sectionId, subjects: subjects })
        })
        .then(res => res.json())
        .then(data => {
            btn.innerHTML = ogText;
            btn.disabled = false;
            if (data.success) {
                document.getElementById('manageSectionSubjectsModal').style.display = 'none';
                showToast("Success", "Subjects updated successfully!");
                loadSections(); // Refreshes the grid so the subject count updates!
            } else {
                alert("Database Error: " + data.error);
            }
        }).catch(err => {
            btn.innerHTML = ogText;
            btn.disabled = false;
            alert("Network error.");
        });
    };
    // --- IRREGULAR STUDENT ENROLLMENT LOGIC ---
    let allAvailableSubjects = []; // Holds subjects so we can search/filter them

    window.openIrregularManager = function(studentId, studentName) {
        document.getElementById('irregStudentId').value = studentId;
        document.getElementById('irregStudentName').innerText = studentName;
        document.getElementById('irregularModal').classList.remove('hidden');
        document.getElementById('irregularModal').style.display = 'flex';
        loadIrregularSubjects(studentId);
    };

    window.loadIrregularSubjects = function(studentId) {
        const enrolledDiv = document.getElementById('enrolledSubjectsList');
        const availableDiv = document.getElementById('availableSubjectsList');
        
        enrolledDiv.innerHTML = '<div style="padding:15px; text-align:center;">Loading...</div>';
        availableDiv.innerHTML = '<div style="padding:15px; text-align:center;">Loading...</div>';

        fetch(`../api/getIrregularSubjects.php?student_id=${studentId}`)
        .then(res => res.json())
        .then(data => {
            if(!data.success) return alert("Error loading subjects");
            
            const enrolled = data.data.filter(s => s.is_enrolled > 0);
            allAvailableSubjects = data.data.filter(s => s.is_enrolled == 0); 
            
            // 1. Draw the Enrolled List
            if(enrolled.length === 0) {
                enrolledDiv.innerHTML = '<div style="padding:15px; text-align:center; color:#64748b;">Not enrolled in any subjects yet.</div>';
            } else {
                enrolledDiv.innerHTML = `<table style="width:100%; text-align:left; border-collapse:collapse;">
                    <thead style="background:#f8fafc; font-size:13px;"><tr><th style="padding:10px;">Subject</th><th style="padding:10px;">Section</th><th style="padding:10px;">Schedule</th><th style="padding:10px;">Action</th></tr></thead>
                    <tbody>` + enrolled.map(s => `
                        <tr style="border-top:1px solid #e2e8f0; font-size:13px;">
                            <td style="padding:10px;"><strong>${s.subject_code}</strong></td>
                            <td style="padding:10px;">${s.section_name}</td>
                            <td style="padding:10px;">${s.day_of_week} ${s.time_slot}</td>
                            <td style="padding:10px;"><button onclick="toggleIrregular('${studentId}', ${s.schedule_id}, 'remove')" style="background:#fee2e2; color:#dc2626; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-weight:600;">Drop Class</button></td>
                        </tr>
                    `).join('') + `</tbody></table>`;
            }

            // 2. Draw the Available List
            renderAvailableSubjects(allAvailableSubjects);
        });
    };

    window.renderAvailableSubjects = function(subjects) {
        const availableDiv = document.getElementById('availableSubjectsList');
        const studentId = document.getElementById('irregStudentId').value;
        
        if(subjects.length === 0) {
            availableDiv.innerHTML = '<div style="padding:15px; text-align:center; color:#64748b;">No matching subjects found.</div>';
            return;
        }

        availableDiv.innerHTML = `<table style="width:100%; text-align:left; border-collapse:collapse;">
            <thead style="background:#f8fafc; font-size:13px;"><tr><th style="padding:10px;">Subject</th><th style="padding:10px;">Section</th><th style="padding:10px;">Schedule</th><th style="padding:10px;">Seats</th><th style="padding:10px;">Action</th></tr></thead>
            <tbody>` + subjects.map(s => {
                const isFull = s.enrolled_count >= 50; // The 50 Student Limit Checker!
                const seatColor = isFull ? "color:#dc2626; font-weight:bold;" : "color:#059669;";
                const btn = isFull 
                    ? `<span style="color:#dc2626; font-size:12px; font-weight:bold;">CLASS FULL</span>` 
                    : `<button onclick="toggleIrregular('${studentId}', ${s.schedule_id}, 'add')" style="background:#dbeafe; color:#2563eb; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-weight:600;">+ Enroll</button>`;
                
                return `
                <tr style="border-top:1px solid #e2e8f0; font-size:13px;">
                    <td style="padding:10px;"><strong>${s.subject_code}</strong><br><span style="font-size:11px;color:#64748b;">${s.subject_description}</span></td>
                    <td style="padding:10px;">${s.section_name}</td>
                    <td style="padding:10px;">${s.day_of_week} <span style="font-size:11px;color:#64748b;">${s.time_slot}</span></td>
                    <td style="padding:10px;"><span style="${seatColor}">${s.enrolled_count} / 50</span></td>
                    <td style="padding:10px;">${btn}</td>
                </tr>
                `;
            }).join('') + `</tbody></table>`;
    };
        // thesis/app/app.js

        // 🚀 UPGRADED NAVIGATION ENGINE
        window.showPage = function(pageId) {
            console.log("Navigating to:", pageId);

            // 1. Hide every single section with the 'page' class
            const pages = document.querySelectorAll('.page');
            pages.forEach(page => {
                page.classList.add('hidden');
                page.style.display = 'none'; // Explicitly hide
            });

            // 2. Show our target page
            const target = document.getElementById(pageId);
            if (target) {
                target.classList.remove('hidden');
                target.style.display = 'block'; // Explicitly show
                
                // 3. If we are entering the Master Editor, trigger the data loaders
                if (pageId === 'masterEditor') {
                    if (typeof loadMasterSections === 'function') loadMasterSections();
                    if (typeof loadMasterSubjects === 'function') loadMasterSubjects();
                }
            }

            // 4. Update the sidebar UI so the user knows where they are
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
                // Check if the click action matches the pageId
                if (item.getAttribute('onclick')?.includes(pageId)) {
                    item.classList.add('active');
                }
            });
        };




    
    setTimeout(window.refreshDashboardStats, 500);
      // Initial load sequence
    loadSubjects();
    load_teachers();
    loadSections();
    load_students();
    fetchRooms();
    setInterval(fetchRooms, 60000);
    loadActivityLogs();
    loadLRConflicts();
    renderLRReportsGrid();
    loadLRSummaryStats();
    
}); // End of DOMContentLoaded

//archive filter logic

/** * 1. LOADERS OBJECT
 * Maps the 'data-type' from your buttons to the correct function
 */
const loaders = {
    students: loadArchivedStudents,
    teachers: loadArchivedTeachers,
    sections: loadArchivedSections,
    subjects: loadArchivedSubjects,
    rooms: loadArchivedRooms,
};

/** * 2. FILTER LOGIC
 * Handles switching between tabs
 */
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', function () {
        const type = this.dataset.type;
        const targetId = this.dataset.target;

        // UI Update: Buttons
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');

        // UI Update: Table Visibility
        document.querySelectorAll('.archive-table-wrapper').forEach(w => w.classList.add('hidden'));
        document.getElementById(targetId).classList.remove('hidden');

        // Trigger the specific loader
        if (loaders[type]) {
            loaders[type]();
        }
    });
});

//get the archives

function loadArchivedStudents() {
    fetch('../api/getArchivedStudents.php')
    .then(res => res.json())
    .then(data => {
        const table = document.getElementById("archiveTable");
        let rows = "";

        if (!data || data.length === 0) {
            table.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align:center;">No archived students found</td>
                </tr>
            `;
            return;
        }

        data.forEach(student => {
            rows += `
                <tr>
                    <td>${student.student_id}</td>
                    <td>${student.fullname}</td>
                    <td>${student.course_name ?? 'N/A'}</td>
                    <td>${student.year_level ?? 'N/A'}</td>
                    <td>${student.deleted_at}</td>
                    <td>
                        <button class="btn_restore" data-id="${student.student_id}" data-type="students">
                            Restore
                        </button>
                    </td>
                </tr>
            `;
        });

        table.innerHTML = rows;
    })
    .catch(err => {
        console.error("Error loading archived students:", err);
    });
}

loadArchivedStudents();

function loadArchivedTeachers() {
    fetch('../api/getArchivedTeachers.php')
    .then(res => res.json())
    .then(data => {
        const tbody = document.getElementById("teacherTable");
        let rows = "";

        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No archived teachers found</td></tr>`;
            return;
        }

        data.forEach(teacher => {
            rows += `
                <tr>
                    <td>${teacher.fullname}</td>
                    <td>${teacher.dept}</td>
                    <td>${teacher.email}</td>
                    <td>${teacher.deleted_at}</td>
                    <td>
                        <button class="btn_restore" data-id="${teacher.teacher_id}" data-type="teachers">
                            Restore
                        </button>
                    </td>
                </tr>`;
        });
        tbody.innerHTML = rows;
    });
}

function loadArchivedSubjects() {
    fetch('../api/getArchivedSubjects.php')
    .then(res => res.json())
    .then(data => {
        const tbody = document.getElementById("subjectTable");
        let rows = "";

        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No archived subjects found</td></tr>`;
            return;
        }

        data.forEach(sub => {
            rows += `
                <tr>
                    <td>${sub.subject_code}</td>
                    <td>${sub.description}</td>
                    <td>${sub.units}</td>
                    <td>${sub.deleted_at}</td>
                    <td>
                        <button class="btn_restore" onclick="restoreRecord('subject', ${sub.subject_id})">
                            Restore
                        </button>
                    </td>
                </tr>`;
        });
        tbody.innerHTML = rows;
    });
}

function loadArchivedRooms() {
    fetch('../api/getArchivedRooms.php')
    .then(res => res.json())
    .then(data => {
        const tbody = document.getElementById("roomTable");
        let rows = "";

        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No archived rooms found</td></tr>`;
            return;
        }

        data.forEach(room => {
            rows += `
                <tr>
                    <td>${room.room_name}</td>
                    <td>${room.department}</td>
                    <td>${room.capacity}</td>
                    <td>${room.deleted_at}</td>
                    <td>
                        <button class="btn_restore" data-id="${room.room_id}" data-type="rooms">
                            Restore
                        </button>
                    </td>
                </tr>`;
        });
        tbody.innerHTML = rows;
    });
}

function loadArchivedSubjects() {
    fetch('../api/getArchivedSubjects.php')
        .then(res => res.json())
        .then(data => {
            const tbody = document.getElementById('subjectTable');
            tbody.innerHTML = ''; // Clear existing rows

            if (data.status === "success" && data.data.length > 0) {
                data.data.forEach(subject => {
                    const row = `
                        <tr>
                            <td>${subject.code}</td>
                            <td>${subject.subject_description}</td>
                            <td>${subject.units}</td>
                            <td>${new Date(subject.archived_at).toLocaleDateString()}</td>
                            <td>
                                <button class="restore-btn" onclick="restoreRecord('subjects', ${subject.subject_id})">
                                    Restore
                                </button>
                            </td>
                        </tr>
                    `;
                    tbody.insertAdjacentHTML('beforeend', row);
                });
            } else {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No archived subjects found.</td></tr>';
            }
        })
        .catch(err => console.error("Error loading archived subjects:", err));
}

function loadArchivedSections() {
    fetch('../api/getArchivedSections.php')
        .then(res => res.json())
        .then(data => {
            const tbody = document.getElementById('sectionTable');
            tbody.innerHTML = ''; // Clear existing rows

            if (data.status === "success" && data.data.length > 0) {
                data.data.forEach(section => {
                    const row = `
                        <tr>
                            <td>${section.section_name}</td>
                            <td>${section.course}</td>
                            <td>${section.year_level}</td>
                            <td>${new Date(section.archived_at).toLocaleDateString()}</td>
                            <td>
                                <button class="restore-btn" onclick="restoreRecord('sections', ${section.section_id})">
                                    Restore
                                </button>
                            </td>
                        </tr>
                    `;
                    tbody.insertAdjacentHTML('beforeend', row);
                });
            } else {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No archived sections found.</td></tr>';
            }
        })
        .catch(err => {
            console.error("Error loading archived sections:", err);
            document.getElementById('sectionTable').innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;">Failed to load archive.</td></tr>';
        });
}

//attach restore function

// Add this once in your main JS file
document.querySelector('.archive-content').addEventListener('click', function(e) {
    // Look for the closest element with the class 'btn_restore'
    const btn = e.target.closest('.btn_restore');

    // If a restore button was found
    if (btn) {
        const type = btn.getAttribute('data-type');
        const id = btn.getAttribute('data-id');
        
        // Safety check: ensure we actually got the attributes
        if (type && id) {
            restoreRecord(type, id);
        } else {
            console.error("Missing data attributes on button", btn);
        }
    }
});

// The restoreRecord function stays largely the same, but remove the parameters 
// if you want to handle everything in one block, or keep it as is:
function restoreRecord(type, id) {
    if (!confirm(`Are you sure you want to restore this ${type}?`)) return;

    const endpointMap = {
        students: '../api/restoreStudent.php',
        teachers: '../api/restoreTeacher.php',
        sections: '../api/restoreSection.php',
        subjects: '../api/restoreSubject.php',
        rooms: '../api/restoreRoom.php'
    };

    const payloadMap = {
        students: { student_id: id },
        teachers: { teacher_id: id },
        sections: { section_id: id},
        subjects: { subject_id: id },
        rooms: { id: id }
    };

    fetch(endpointMap[type], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadMap[type])
    })
    .then(res => res.json())
    .then(data => {
        alert(data.message);
        if (data.status === "success") {
            loaders[type](); //refresh tables 
            load_students();
            load_teachers();
            loadSections();
            loadSubjects();
            loadRooms();
        }
    })
    .catch(err => console.error("Restore failed:", err));
}



// ====== 1. INJECT PREVIEW MODAL ======
document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('schedulePreviewModal')) {
        const modalHtml = `
        <div id="schedulePreviewModal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15,23,42,0.6); z-index:9999; align-items:center; justify-content:center; backdrop-filter:blur(3px);">
            <div style="background:white; width:95%; max-width:900px; border-radius:12px; overflow:hidden; box-shadow:0 20px 25px -5px rgba(0,0,0,0.1); display:flex; flex-direction:column; max-height: 85vh;">
                <div style="background:#3b82f6; padding:15px 20px; display:flex; justify-content:space-between; align-items:center; color:white;">
                    <h3 style="margin:0; font-size:16px; font-weight:600;"><i class="fa-solid fa-file-csv" style="margin-right:5px;"></i> Master Schedule Export</h3>
                    <button onclick="document.getElementById('schedulePreviewModal').style.display='none'" style="background:none; border:none; color:white; font-size:22px; cursor:pointer;">&times;</button>
                </div>
                
                <div style="padding:15px 20px; background:#f8fafc; border-bottom:1px solid #e2e8f0; display:grid; grid-template-columns: repeat(5, 1fr); gap:12px;">
                    <div><label style="font-size:12px; font-weight:bold; color:#64748b; display:block; margin-bottom:4px;">Course</label>
                    <select id="prevCourse" class="form-control form-control-sm" onchange="updateSectionDropdown()"><option value="">All</option></select></div>
                    
                    <div><label style="font-size:12px; font-weight:bold; color:#64748b; display:block; margin-bottom:4px;">Year Level</label>
                    <select id="prevYear" class="form-control form-control-sm" onchange="updateSectionDropdown()"><option value="">All</option></select></div>
                    
                    <div><label style="font-size:12px; font-weight:bold; color:#64748b; display:block; margin-bottom:4px;">Section</label>
                    <select id="prevSection" class="form-control form-control-sm" onchange="refreshExportPreview()"><option value="">All</option></select></div>
                    
                    <div><label style="font-size:12px; font-weight:bold; color:#64748b; display:block; margin-bottom:4px;">Teacher</label>
                    <select id="prevTeacher" class="form-control form-control-sm" onchange="refreshExportPreview()"><option value="">All</option></select></div>

                    <div><label style="font-size:12px; font-weight:bold; color:#64748b; display:block; margin-bottom:4px;">Room</label>
                    <select id="prevRoom" class="form-control form-control-sm" onchange="refreshExportPreview()"><option value="">All</option></select></div>
                </div>
                
                <div style="padding:0; overflow-y:auto; flex-grow:1; background:white;">
                    <table class="table table-sm table-hover" style="margin:0; font-size:13px; width: 100%;">
                        <thead style="position:sticky; top:0; background:#f1f5f9; box-shadow:0 1px 2px rgba(0,0,0,0.05);">
                            <tr><th style="padding:10px 15px;">Subject</th><th style="padding:10px 15px;">Section</th><th style="padding:10px 15px;">Teacher</th><th style="padding:10px 15px;">Day & Time</th><th style="padding:10px 15px;">Room</th></tr>
                        </thead>
                        <tbody id="previewTableBody">
                            <tr><td colspan="5" style="text-align:center; padding:30px; color:#64748b;"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</td></tr>
                        </tbody>
                    </table>
                </div>
                
                <div style="padding:15px 20px; background:#f8fafc; border-top:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center;">
                    <span id="previewCountBadge" style="font-size:13px; color:#3b82f6; font-weight:600; background:#eff6ff; padding:5px 12px; border-radius:12px;">Found 0 records</span>
                    <button onclick="downloadFilteredReport()" class="btn btn-success" style="background:#10b981; border:none; padding:8px 20px; font-weight:600; border-radius:6px; color:white; cursor:pointer;">
                        <i class="fa-solid fa-download"></i> Download CSV
                    </button>
                </div>
            </div>
        </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
});

// ====== 2. CASCADING DROPDOWN LOGIC ======
window.exportFilterData = null;

window.populateExportFilters = function() {
    fetch('../api/getExportFilters.php').then(res => res.json()).then(data => {
        if (data.success) {
            window.exportFilterData = data.filters; // Save for cascading!
            const f = data.filters;
            const populate = (id, arr) => {
                const sel = document.getElementById(id); const currentVal = sel.value; 
                if(sel) sel.innerHTML = '<option value="">All</option>' + arr.map(x => `<option value="${x}">${x}</option>`).join('');
                sel.value = currentVal; 
            };
            populate('prevCourse', f.courses); populate('prevYear', f.years); 
            populate('prevTeacher', f.teachers); populate('prevRoom', f.rooms);
            window.updateSectionDropdown(); // Initialize Sections
        }
    });
};

window.updateSectionDropdown = function() {
    if (!window.exportFilterData) return;
    const sCourse = document.getElementById('prevCourse').value;
    const sYear = document.getElementById('prevYear').value;
    const selSec = document.getElementById('prevSection');
    const currVal = selSec.value;
    
    // 🚨 UNIVERSAL DATABASE ID TRANSLATOR 🚨
    const courseIds = {
        'BSBA': '1', 'BSCS': '2', 'BSTM': '3', 'BSHM': '4', 
        'BEED': '5', 'BSED-ENG': '6', 'BSED-MATH': '7', 'POLSCI': '8'
    };
    const mappedCourseId = courseIds[sCourse] || sCourse;

    // Filter sections based on Course and Year!
    let vSec = window.exportFilterData.sections;
    
    if (sCourse) {
        // Check for both the Text ("BSCS") and the Database ID ("2")
        vSec = vSec.filter(s => String(s.course) === String(sCourse) || String(s.course) === String(mappedCourseId));
    }
    
    if (sYear) {
        // Safely check for year using multiple possible database column names
        vSec = vSec.filter(s => String(s.year) === String(sYear) || String(s.year_level) === String(sYear));
    }
    
    // Extract the section names safely
    let secNames = [...new Set(vSec.map(s => s.name || s.section_name))].sort();
    
    selSec.innerHTML = '<option value="">All</option>' + secNames.map(x => `<option value="${x}">${x}</option>`).join('');
    
    if (secNames.includes(currVal)) selSec.value = currVal; else selSec.value = "";
    
    refreshExportPreview(); // Update table automatically
};

// ====== 3. THE LASER-FOCUSED SMART INTERCEPTOR ======
document.addEventListener('click', function(e) {
    const btn = e.target.closest('.btn, button, .action-btn');
    if (!btn || btn.closest('#sidebar, .sidebar, .navbar, .nav-menu')) return;
    
    // Allow the Preview Modal buttons to work natively
    if (btn.closest('#schedulePreviewModal')) return; 

    // 🚨 FIX 2: THE SURGICAL BYPASS! 
    // We strictly ignore the Export buttons on the Activity and Conflicts tabs.
    // BUT we do NOT ignore the whole 'logs_reports' section, so the Master Modal can still work!
    if (btn.closest('#tab-activity') || btn.closest('#tab-conflicts')) {
        return; 
    }

    const btnData = (btn.innerText + " " + btn.outerHTML).toLowerCase();
    
    // Check if the button is an Export button
    if (btnData.includes('export') || btnData.includes('csv') || btnData.includes('download') || btnData.includes('fa-file-csv')) {
        
        // Find the container holding the button
        let container = btn.closest('.card, .stat-card, .box, div[class*="col-"]');
        if (!container) container = btn.parentElement.parentElement;
        
        if (container) {
            const txt = container.innerText.toLowerCase();
            
            // If the container is for a Schedule or Master Export, launch the Modal!
            if (txt.includes('schedule') || txt.includes('master')) {
                e.preventDefault();
                e.stopPropagation();
                
                // Launch the Master Schedule Modal
                const modal = document.getElementById('schedulePreviewModal');
                if (modal) modal.style.display = 'flex';
                if (typeof populateExportFilters === 'function') populateExportFilters();
            }
        }
    }
});
// ====== 4. PREVIEW AND DOWNLOAD ======
let previewTimeout;
window.refreshExportPreview = function() {
    clearTimeout(previewTimeout);
    previewTimeout = setTimeout(() => {
        const c = document.getElementById('prevCourse').value; const y = document.getElementById('prevYear').value;
        const s = document.getElementById('prevSection').value; const t = document.getElementById('prevTeacher').value; const r = document.getElementById('prevRoom').value; 
        const tbody = document.getElementById('previewTableBody');
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:30px;"><i class="fa-solid fa-spinner fa-spin"></i> Filtering...</td></tr>`;

        fetch(`../api/getSchedulePreview.php?course=${c}&year=${y}&section=${s}&teacher=${t}&room=${r}`).then(res => res.json()).then(data => {
            if (data.success) {
                document.getElementById('previewCountBadge').innerHTML = `<i class="fa-solid fa-database"></i> Ready to export ${data.total} rows`;
                if (data.preview.length === 0) { tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:30px; color:#ef4444;">No schedules match.</td></tr>`; return; }
                tbody.innerHTML = data.preview.map(row => `<tr>
                    <td style="padding:8px 15px; border-bottom:1px solid #f1f5f9;"><strong>${row.subject}</strong></td>
                    <td style="padding:8px 15px; border-bottom:1px solid #f1f5f9; color:#64748b;">${row.section}</td>
                    <td style="padding:8px 15px; border-bottom:1px solid #f1f5f9; color:#64748b;">${row.teacher}</td>
                    <td style="padding:8px 15px; border-bottom:1px solid #f1f5f9; color:#3b82f6; font-size:12px;">${row.datetime}</td>
                    <td style="padding:8px 15px; border-bottom:1px solid #f1f5f9; color:#64748b;">${row.room}</td>
                </tr>`).join('');
            } else tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red;">Error: ${data.error}</td></tr>`;
        });
    }, 200); 
};



window.triggerExportDownload = function(type, btn) {
    const orig = btn.innerHTML; btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>...`; btn.style.pointerEvents = 'none';
    window.location.href = `../api/generateReport.php?type=${type}`;
    setTimeout(() => { btn.innerHTML = orig; btn.style.pointerEvents = 'auto'; }, 2500);
};
window.downloadFilteredReport = async function(event) {
    // Optional: Make the button spin while downloading!
    const btn = event ? event.currentTarget : document.querySelector('.btn-success');
    let origText = "";
    if (btn) {
        origText = btn.innerHTML;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Downloading...`;
        btn.style.pointerEvents = 'none';
    }

    const c = document.getElementById('prevCourse').value;
    const y = document.getElementById('prevYear').value;
    const s = document.getElementById('prevSection').value;
    const t = document.getElementById('prevTeacher').value;
    const r = document.getElementById('prevRoom').value; 

    // Construct the URL
    const url = `../api/generateReport.php?type=schedules&course=${encodeURIComponent(c)}&year=${encodeURIComponent(y)}&section=${encodeURIComponent(s)}&teacher=${encodeURIComponent(t)}&room=${encodeURIComponent(r)}`;

    try {
        // 🚨 SILENT DOWNLOAD TRICK: Fetch the data in the background (Bypasses HTTP warning)
        const response = await fetch(url);
        const blob = await response.blob();
        
        // Convert the raw data into a temporary internal browser link
        const downloadUrl = window.URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.setAttribute('download', 'SCC_Schedule_Export.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up the memory
        window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
        console.error("Download failed:", error);
        alert("Network error while downloading the file.");
    } finally {
        // Reset the button
        if (btn) {
            btn.innerHTML = origText;
            btn.style.pointerEvents = 'auto';
        }
    }
};


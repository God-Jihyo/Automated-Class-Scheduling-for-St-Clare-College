// thesis/app/master-editor.js
document.addEventListener("DOMContentLoaded", () => {
    console.log("Master Editor Engine Loaded (Double-Catch & Exact Filter Mode)");

    window.masterSelectedDays = [];
    window.masterSelectedRoomId = null;
    window.masterAllSections = [];
    window.masterAllSubjects = []; 

    // 1. SAFE TOGGLE SWITCH
    window.toggleEditorMode = function(mode) {
        const singleView = document.getElementById('singleEditorView');
        const masterView = document.getElementById('masterEditorView');
        const btnSingle = document.getElementById('btnSingleMode');
        const btnMaster = document.getElementById('btnMasterMode');

        if (!singleView || !masterView) return;

        if (mode === 'master') {
            singleView.classList.add('hidden');
            singleView.style.display = 'none';
            masterView.classList.remove('hidden');
            masterView.style.display = 'block';
            if (btnMaster) btnMaster.classList.add('active');
            if (btnSingle) btnSingle.classList.remove('active');
            
            loadMasterSections();
            loadMasterSubjects();
        } else {
            masterView.classList.add('hidden');
            masterView.style.display = 'none';
            singleView.classList.remove('hidden');
            singleView.style.display = 'block';
            if (btnSingle) btnSingle.classList.add('active');
            if (btnMaster) btnMaster.classList.remove('active');
        }
    };

    window.toggleMasterDay = function(btn, day) {
        if (window.masterSelectedDays.includes(day)) {
            window.masterSelectedDays = window.masterSelectedDays.filter(d => d !== day);
            btn.classList.remove("active-day");
        } else {
            window.masterSelectedDays.push(day);
            btn.classList.add("active-day");
        }
    };

    // 3. EXACT PAIRING FILTER LOGIC
    window.filterMasterGrid = function() {
        const courseFilter = document.getElementById('masterFilterCourse')?.value.toUpperCase() || '';
        const yearFilter = document.getElementById('masterFilterYear')?.value || '';

        // A. Filter Sections
        const filteredSections = window.masterAllSections.filter(sec => {
            const secCourse = String(sec.course || sec.course_id || sec.course_code || "").toUpperCase();
            const secYear = String(sec.year_level || sec.year || "");
            const secName = String(sec.section_name || "").toUpperCase();

            const matchCourse = courseFilter === '' || secCourse === courseFilter || secName.includes(courseFilter);
            const matchYear = yearFilter === '' || secYear === yearFilter || secName.includes(`${yearFilter}A`) || secName.includes(`${yearFilter}B`) || secName.includes(`-${yearFilter}`);

            return matchCourse && matchYear;
        });
        renderMasterGrid(filteredSections);

        // B. Filter Subjects
        let filteredSubjects = window.masterAllSubjects.filter(sub => {
            if (courseFilter === '' && yearFilter === '') return true; 

            const assignedCombos = sub.assigned_combos;

            // If we successfully stitched the exact database keys
            if (assignedCombos && assignedCombos.length > 0) {
                if (courseFilter !== '' && yearFilter !== '') {
                    return assignedCombos.includes(`${courseFilter}-${yearFilter}`); // Strict BSCS-4
                } else if (courseFilter !== '') {
                    return assignedCombos.some(combo => combo.startsWith(courseFilter));
                } else if (yearFilter !== '') {
                    return assignedCombos.some(combo => combo.endsWith(`-${yearFilter}`));
                }
            } else {
                // Extreme Failsafe: if DB joining fails, do a broad search so it doesn't blank out
                const vals = Object.values(sub).join(" ").toUpperCase();
                const matchCourse = courseFilter === '' || vals.includes(courseFilter);
                const matchYear = yearFilter === '' || vals.includes(yearFilter);
                return matchCourse && matchYear;
            }
            return false;
        });

        renderMasterSubjects(filteredSubjects);
    };

    // 4. LOAD & RENDER SECTIONS
    async function loadMasterSections() {
        try {
            const response = await fetch('../api/getAllSections.php');
            const data = await response.json();
            window.masterAllSections = Array.isArray(data) ? data : (data.data || []);
            renderMasterGrid(window.masterAllSections); 
        } catch (error) {
            console.error("Error loading sections:", error);
        }
    }

    function renderMasterGrid(sections) {
        const tbody = document.getElementById("masterGridBody");
        if (!tbody) return;

        if (!sections || sections.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="padding: 20px; text-align: center; color: #64748b;">No sections match this exact filter.</td></tr>`;
            return;
        }

        tbody.innerHTML = sections.map(sec => {
            const vals = Object.values(sec);
            const secId = sec.section_id || sec.id || vals[0];
            const secName = sec.section_name || sec.name || sec.section || vals[1] || "Unnamed Section";
            
            return `
                <tr>
                    <td style="padding:15px; border:1px solid var(--border); font-weight:700; background:#f8fafc; color:var(--primary);">
                        ${secName}
                    </td>
                    <td class="drop-zone" data-section-id="${secId}" data-time="07:30:00" ondragover="masterAllowDrop(event)" ondrop="masterHandleDrop(event)"></td>
                    <td class="drop-zone" data-section-id="${secId}" data-time="09:00:00" ondragover="masterAllowDrop(event)" ondrop="masterHandleDrop(event)"></td>
                    <td class="drop-zone" data-section-id="${secId}" data-time="10:30:00" ondragover="masterAllowDrop(event)" ondrop="masterHandleDrop(event)"></td>
                    <td class="drop-zone" data-section-id="${secId}" data-time="13:00:00" ondragover="masterAllowDrop(event)" ondrop="masterHandleDrop(event)"></td>
                    <td class="drop-zone" data-section-id="${secId}" data-time="14:30:00" ondragover="masterAllowDrop(event)" ondrop="masterHandleDrop(event)"></td>
                </tr>
            `;
        }).join("");
    }

    // 5. LOAD & RENDER SUBJECTS (DOUBLE-CATCH MODE)
    async function loadMasterSubjects() {
        try {
            let data = null;

            // Attempt 1: Fetch exact pairs
            try {
                const res = await fetch('../api/getMasterSubjects.php');
                const text = await res.text(); // Reads as text so JSON parse error doesn't crash the code
                data = JSON.parse(text);
            } catch (e) {
                console.log("Master Linker JSON failed. Falling back to basic list.");
            }

            // Attempt 2: If Attempt 1 failed or returned null, use standard basic subjects!
            if (!data || !data.data) {
                const fallbackRes = await fetch('../api/getAllSubjects.php');
                data = await fallbackRes.json();
            }
            
            window.masterAllSubjects = Array.isArray(data) ? data : (data.data || []);
            renderMasterSubjects(window.masterAllSubjects);
        } catch (error) {
            console.error("Total error loading subjects:", error);
        }
    }

    function renderMasterSubjects(subjects) {
        const pool = document.getElementById("masterSubjectPool");
        if (!pool) return;

        let html = `
            <div style="margin-bottom: 15px; position: sticky; top: 0; background: white; z-index: 5;">
                <input type="text" id="masterSubjectSearch" placeholder="🔍 Quick search..." 
                       onkeyup="searchMasterSubjects()" 
                       style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);">
            </div>
            <div id="masterSubjectListContainer" style="display: flex; flex-direction: column; gap: 8px;">
        `;

        if (!subjects || subjects.length === 0) {
            html += `
            <div style="padding:15px; text-align:center; color:#64748b; font-size:12px; background:#f8fafc; border-radius:6px; border:1px dashed #cbd5e1;">
                No subjects assigned to this exact pairing.<br><br>
                <strong>Set filters to 'All'</strong> to see the full list, or use the Search Bar!
            </div>`;
        } else {
            html += subjects.map(sub => {
                const subId = sub.id || sub.subject_id;
                const subName = sub.subject_name || sub.subject_code || sub.name || sub.title || "Unnamed Subject";

                return `
                <div class="subject-card master-sub-item" 
                     draggable="true" 
                     ondragstart="masterHandleDragStart(event)" 
                     data-id="${subId}" 
                     data-name="${subName}"
                     style="padding: 10px; background: white; border: 1px solid #e2e8f0; border-radius: 6px; cursor: grab; font-size: 13px; font-weight: 600;">
                    <i class="fa-solid fa-book" style="color: var(--primary); margin-right: 5px;"></i> <span class="sub-text-label">${subName}</span>
                </div>
                `;
            }).join("");
        }

        html += `</div>`;
        pool.innerHTML = html;
    }

    window.searchMasterSubjects = function() {
        const q = document.getElementById("masterSubjectSearch").value.toLowerCase();
        document.querySelectorAll(".master-sub-item").forEach(item => {
            const text = item.querySelector(".sub-text-label").textContent.toLowerCase();
            item.style.display = text.includes(q) ? "block" : "none";
        });
    };

    // 6. DRAG AND DROP & RADAR
    window.masterAllowDrop = function(ev) {
        ev.preventDefault();
        const hoveredTime = ev.target.dataset.time;
        
        if (hoveredTime && window.masterSelectedDays.length > 0 && ev.target !== window.lastHoveredCell) {
            window.lastHoveredCell = ev.target;
            updateRoomRadar(hoveredTime, window.masterSelectedDays);
        }
    };

    window.masterHandleDragStart = function(ev) {
        ev.dataTransfer.setData("subjectId", ev.target.dataset.id);
        ev.dataTransfer.setData("subjectName", ev.target.dataset.name);
    };

    window.masterSelectRoom = function(roomId, element) {
        window.masterSelectedRoomId = roomId;
        document.querySelectorAll('.radar-room-card').forEach(card => {
            card.style.borderColor = '#e2e8f0';
            card.style.borderWidth = '1px';
            card.style.background = 'white';
        });
        element.style.borderColor = 'var(--primary)';
        element.style.borderWidth = '2px';
        element.style.background = '#f8fafc';
    };

    window.masterHandleDrop = async function(ev) {
        ev.preventDefault();
        const subId = ev.dataTransfer.getData("subjectId");
        const subName = ev.dataTransfer.getData("subjectName");
        const secId = ev.target.dataset.sectionId;
        const time = ev.target.dataset.time;

        if (window.masterSelectedDays.length === 0) {
            alert("Please select at least one day (M, T, W...) before dropping!");
            return;
        }
        if (!window.masterSelectedRoomId) {
            alert("Please click an available room in the Live Room Radar before dropping!");
            return;
        }

        try {
            const response = await fetch('../api/saveMasterSchedule.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subject_id: subId,
                    section_id: secId,
                    room_id: window.masterSelectedRoomId,
                    time: time,
                    days: window.masterSelectedDays
                })
            });
            
            const result = await response.json();
            
            if (result.success || result.status === 'success') {
                ev.target.innerHTML = `<div style="background:#dcfce7; color:#166534; padding:6px; border-radius:4px; font-size:11px; font-weight:bold; border:1px solid #22c55e;">${subName}</div>`;
                window.masterSelectedRoomId = null; 
            } else {
                alert("Database Error: " + (result.error || result.message));
            }
        } catch (error) {
            console.error("Save Error:", error);
            alert("Network error while saving schedule.");
        }
    };

    async function updateRoomRadar(time, days) {
        const radarList = document.getElementById("radarRoomList");
        if (!radarList) return;

        try {
            const response = await fetch(`../api/getAvailableRooms.php?time=${time}&days=${days.join(',')}`);
            const data = await response.json();
            const rooms = Array.isArray(data) ? data : (data.data || []);

            if (rooms.length === 0) {
                radarList.innerHTML = '<p style="font-size:12px; color:#ef4444; padding: 10px;">❌ No rooms free at this time.</p>';
            } else {
                radarList.innerHTML = rooms.map(room => {
                    const vals = Object.values(room);
                    const roomId = room.id || room.room_id || vals[0];
                    const roomName = room.room_name || room.name || vals[1] || "Unnamed Room";
                    const roomType = room.type || room.room_type || "Standard";
                    const roomCap = room.capacity || "N/A";

                    return `
                    <div class="radar-room-card" onclick="masterSelectRoom('${roomId}', this)" style="padding: 10px; background: white; border: 1px solid #e2e8f0; border-radius: 6px; cursor: pointer; margin-bottom: 8px; transition: all 0.2s;">
                        <div style="font-weight:700;"><i class="fa-solid fa-door-open" style="color:var(--primary); margin-right:5px;"></i> ${roomName}</div>
                        <div style="font-size:10px; color: #64748b; margin-top:4px;">Type: ${roomType} • Capacity: ${roomCap}</div>
                    </div>
                    `;
                }).join("");
            }
        } catch (error) {
            console.error("Radar Error:", error);
            radarList.innerHTML = '<p style="font-size:12px; color:#ef4444; padding: 10px;">Network error checking rooms.</p>';
        }
    }
});
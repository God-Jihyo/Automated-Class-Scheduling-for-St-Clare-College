// ====== 1. PORTAL INITIALIZATION (Dashboard & Sidebar) ======
document.addEventListener('DOMContentLoaded', () => {
    initializeTeacherPortal();
    prepareConflictData(); 
    setInterval(prepareConflictData, 5000); 
});

async function initializeTeacherPortal() {
    try {
        const response = await fetch('../check_session.php');
        const sessionData = await response.json();

        if (!sessionData.logged_in || sessionData.role !== 'teacher') {
            console.warn("Unauthorized access. Redirecting to login.");
            window.location.href = '../login.html';
            return;
        }

        const teacherProfile = sessionData.profile;
        window.currentTeacherId = teacherProfile.teacher_id;

        const sidebarName = document.getElementById('sidebarName');
        const sidebarId = document.getElementById('sidebarId');
        if (sidebarName) sidebarName.textContent = teacherProfile.full_name;
        if (sidebarId) sidebarId.textContent = `ID: ${teacherProfile.teacher_id}`;

        const headerName = document.getElementById('welcomeName');
        if (headerName) {
            const firstName = teacherProfile.full_name.split(' ')[0].replace(',', '');
            headerName.innerHTML = `Hello, ${firstName}! 👋`;
        }

        const dateDisplay = document.getElementById('currentDate');
        if (dateDisplay) {
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            dateDisplay.textContent = new Date().toLocaleDateString('en-US', options);
        }

        loadDashboardStats();

    } catch (error) {
        console.error("Error initializing teacher portal:", error);
    }
}

async function loadDashboardStats() {
    try {
        const response = await fetch(`../api/get_dashboard_stats.php?teacher_id=${window.currentTeacherId}`);
        const data = await response.json();

        if (data.success) {
            const totalSubjectsEl = document.getElementById('totalSubjectsCount');
            const classesTodayEl = document.getElementById('classesTodayCount');
            const consultationCountEl = document.getElementById('consultationCount');

            if (totalSubjectsEl) totalSubjectsEl.textContent = data.total_subjects;
            if (classesTodayEl) classesTodayEl.textContent = data.classes_today;
            
            if (consultationCountEl) {
                consultationCountEl.textContent = data.active_consultations; 
                
                const card = consultationCountEl.closest('.stat-card');
                if (card) {
                    card.style.cursor = 'pointer';
                    card.addEventListener('click', () => {
                        document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active-view'));
                        const consultView = document.getElementById('consultationsView');
                        if(consultView) consultView.classList.add('active-view');
                        
                        document.querySelectorAll('.nav-menu li').forEach(li => li.classList.remove('active'));
                        document.querySelectorAll('.nav-menu a').forEach(link => {
                            if (link.innerText.toLowerCase().includes('consultation') || link.innerText.toLowerCase().includes('communication')) {
                                link.parentElement.classList.add('active');
                            }
                        });
                    });
                }
            }
        }
    } catch (error) {
        console.error("Error fetching dashboard stats:", error);
    }
}

// ====== 2. CONFLICT RESOLUTION ENGINE ======
window.activeConflictId = null;
window.conflictClassName = null;
window.conflictRoomName = null;

async function prepareConflictData() {
    try {
        const response = await fetch(`../api/getTeacherConflicts.php`);
        const result = await response.json();
        if (result.success && result.data && result.data.length > 0) {
            window.activeConflictId = result.data[0].id;
            window.conflictClassName = result.data[0].class_name;
            window.conflictRoomName = result.data[0].room_name;
        }
    } catch (e) { }
}

// THE UNIVERSAL CLICK INTERCEPTOR
document.addEventListener('click', function(e) {
    // 🚨 THE FIX: If they are clicking inside the Modal, LEAVE THEM ALONE! Let the buttons work!
    if (e.target.closest('#conflictModalOverlay')) {
        return; 
    }

    let target = e.target;
    let isOurNotification = false;

    while (target && target !== document.body) {
        const text = target.innerText || target.textContent || '';
        if (text.includes("Action Required") || text.includes("Click here to resolve")) {
            isOurNotification = true;
            break;
        }
        target = target.parentElement;
    }

    if (isOurNotification) {
        e.preventDefault();
        e.stopPropagation(); 
        
        if (window.activeConflictId) {
            openConflictModal(); 
        } else {
            alert("Loading conflict details, please try clicking again in a second.");
            prepareConflictData(); 
        }
    }
}, true); 

window.openConflictModal = function() {
    const modal = document.getElementById('conflictModalOverlay');
    const descBox = document.getElementById('conflictDescription');
    
    if (modal && descBox) {
        const cName = window.conflictClassName || "your assigned class";
        const rName = window.conflictRoomName || "the assigned room";
        
        descBox.innerHTML = `Your <strong>${cName}</strong> class in <strong>${rName}</strong> has been displaced by a scheduled campus event. Please select a resolution.`;
        modal.style.display = 'flex'; 
        
        const dropdowns = document.querySelectorAll('.notif-dropdown, .show, .active');
        dropdowns.forEach(dd => {
            dd.classList.remove('show');
            dd.classList.remove('active');
        });
    }
};

// ====== RESOLUTION ENGINE: SMART CAMPUS SCANNER ======
window.resolveClassConflict = async function(mode) {
    if (!window.activeConflictId) return;

    const descBox = document.getElementById('conflictDescription');
    
    if (mode === 'relocate') {
        const actionDiv = document.querySelector('.modal-actions') || descBox.nextElementSibling;
        if (actionDiv) actionDiv.style.display = 'none';

        descBox.innerHTML = `
            <div style="text-align: center; padding: 30px 10px;">
                <i class="fa-solid fa-spinner fa-spin" style="font-size: 28px; color: #3b82f6;"></i>
                <p style="margin-top: 15px; font-weight: 600; color: #1e293b; font-size: 14px;">Scanning campus for available rooms...</p>
                <p style="font-size: 12px; color: #64748b; margin-top: 5px;">Cross-checking schedules and events...</p>
            </div>
        `;

        try {
            const response = await fetch(`../api/getReplacementRooms.php?conflict_id=${window.activeConflictId}`);
            const result = await response.json();

            if (result.success) {
                if (result.rooms.length > 0) {
                    let roomCards = result.rooms.slice(0, 6).map(r => `
                        <button type="button" onclick="submitFinalResolution('relocate', '${r.name}')" 
                                style="width: 100%; text-align: left; padding: 14px; margin-bottom: 8px; border: 1px solid #cbd5e1; border-radius: 8px; background: #f8fafc; cursor: pointer; transition: all 0.2s ease; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 2px rgba(0,0,0,0.05);"
                                onmouseover="this.style.borderColor='#3b82f6'; this.style.backgroundColor='#eff6ff'; this.style.transform='translateY(-1px)';" 
                                onmouseout="this.style.borderColor='#cbd5e1'; this.style.backgroundColor='#f8fafc'; this.style.transform='translateY(0)';">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <i class="fa-solid fa-door-open" style="color: #64748b;"></i>
                                <span style="font-weight: 600; color: #0f172a; font-size: 14px;">${r.name}</span>
                            </div>
                            <span style="font-size: 11px; font-weight: 600; color: #3b82f6; background: #dbeafe; padding: 4px 8px; border-radius: 12px;">${r.building}</span>
                        </button>
                    `).join('');

                    descBox.innerHTML = `
                        <div style="margin-bottom: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">
                            <strong style="display: block; color: #0f172a; font-size: 15px;">Available Rooms Found</strong>
                            <span style="font-size: 12px; color: #64748b;">Slot: ${result.slot}</span>
                        </div>
                        <div style="max-height: 250px; overflow-y: auto; padding-right: 5px; margin-bottom: 15px;">
                            ${roomCards}
                        </div>
                        <button type="button" onclick="submitFinalResolution('online', 'Online')" style="width: 100%; padding: 12px; background: white; border: 1px dashed #94a3b8; color: #64748b; border-radius: 8px; cursor: pointer; font-weight: 600; transition: 0.2s;" onmouseover="this.style.color='#0f172a'; this.style.borderColor='#0f172a'" onmouseout="this.style.color='#64748b'; this.style.borderColor='#94a3b8'">
                            <i class="fa-solid fa-laptop" style="margin-right: 5px;"></i> Or Switch to Online Class
                        </button>
                    `;
                } else {
                    descBox.innerHTML = `
                        <div style="text-align: center; padding: 20px 10px;">
                            <div style="width: 50px; height: 50px; background: #fee2e2; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 15px;">
                                <i class="fa-solid fa-triangle-exclamation" style="font-size: 24px; color: #ef4444;"></i>
                            </div>
                            <p style="font-weight: 600; color: #0f172a; font-size: 16px; margin-bottom: 5px;">No Physical Rooms Available</p>
                            <p style="font-size: 13px; color: #64748b; margin-bottom: 20px;">All other rooms are currently occupied by classes or events during this time slot.</p>
                            
                            <button type="button" onclick="submitFinalResolution('online', 'Online')" style="width: 100%; padding: 12px; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px; transition: 0.2s;" onmouseover="this.style.backgroundColor='#2563eb'" onmouseout="this.style.backgroundColor='#3b82f6'">
                                <i class="fa-solid fa-video" style="margin-right: 5px;"></i> Switch to Online Class
                            </button>
                        </div>
                    `;
                }
            } else {
                descBox.innerHTML = `<p style="color:red; text-align:center; padding: 20px;"><b>Database Error:</b><br>${result.error}</p>`;
            }
        } catch (e) {
            descBox.innerHTML = `<p style="color:red; text-align:center;">Network error while scanning campus.</p>`;
        }
        return;
    }

    submitFinalResolution('online', 'Online');
};

// ====== THE FINAL SUBMISSION (This is what was missing!) ======
// ====== THE FINAL SUBMISSION ======
window.submitFinalResolution = async function(mode, targetRoom) {
    if (!window.activeConflictId) return;
    
    const descBox = document.getElementById('conflictDescription');
    descBox.innerHTML = `
        <div style="text-align: center; padding: 30px;">
            <i class="fa-solid fa-spinner fa-spin" style="font-size: 30px; color: #10b981;"></i>
            <p style="margin-top: 15px; font-weight: 600;">Confirming resolution and notifying students...</p>
        </div>
    `;

    try {
        const response = await fetch('../api/resolveTeacherConflict.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                conflict_id: window.activeConflictId,
                mode: mode,
                target_room: targetRoom
            })
        });
        
        const result = await response.json();

        if (result.success) {
            // Dynamically show how many students were notified!
            let studentText = result.notified_students > 0 
                ? ` and <strong>${result.notified_students} students</strong> have been notified.` 
                : ' has been notified.';

            descBox.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <i class="fa-solid fa-circle-check" style="font-size: 40px; color: #10b981;"></i>
                    <p style="margin-top: 15px; font-weight: bold; font-size: 16px;">Resolution Confirmed!</p>
                    <p style="font-size: 13px; color: #64748b; margin-top: 5px;">The Admin${studentText}</p>
                </div>
            `;
            
            setTimeout(() => {
                document.getElementById('conflictModalOverlay').style.display = 'none';
                window.activeConflictId = null; 
                if (typeof fetchNotifications === 'function') fetchNotifications();
                else window.location.reload(); 
            }, 3500); // Give them extra time to read the success message
            
        } else {
            alert("Error: " + result.error);
            window.resolveClassConflict('relocate'); 
        }
    } catch (e) {
        alert("Network Error while saving resolution.");
        window.resolveClassConflict('relocate'); 
    }
};

// ==========================================
// VIRTUAL LINKS LOGIC (From Assigned Subjects)
// ==========================================
window.openLinkSetup = function(subjectCode, sectionName) {
    // Fill the hidden fields
    document.getElementById('sl_subject_code').value = subjectCode;
    document.getElementById('sl_section_name').value = sectionName;
    document.getElementById('setupClassName').innerText = `${subjectCode} - ${sectionName}`;
    
    // Clear old inputs
    document.getElementById('sl_gmeet').value = '';
    document.getElementById('sl_classcode').value = '';
    
    // Show the modal
    document.getElementById('setupLinksModal').style.display = 'flex';
};

const setupLinksForm = document.getElementById('setupLinksForm');
if (setupLinksForm) {
    setupLinksForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const btn = this.querySelector('button[type="submit"]');
        const originalText = btn.innerHTML;
        btn.innerHTML = 'Saving...'; 
        btn.disabled = true;

        // 🚨 ADD THE TEACHER ID MANUALLY TO THE FORM DATA
        const formData = new FormData(this);
        if (window.currentTeacherId) {
            formData.append('teacher_id', window.currentTeacherId);
        }

        fetch('../api/save_virtual_links.php', {
            method: 'POST',
            body: formData
        })
        .then(res => res.json())
        .then(data => {
            btn.innerHTML = originalText; 
            btn.disabled = false;
            
            if (data.success) {
                alert(data.message);
                document.getElementById('setupLinksModal').style.display = 'none';
                
                // Refresh the tables to show the new links
                if(typeof loadMySchedule === 'function') loadMySchedule();
                if(typeof loadAssignedSubjects === 'function') loadAssignedSubjects();
            } else {
                // This will now tell us EXACTLY what is missing or failing
                alert('Action Failed: ' + data.message); 
            }
        }).catch(err => {
            btn.innerHTML = originalText; 
            btn.disabled = false;
            alert('A network or server error occurred. Check your PHP file.');
        });
    });
}
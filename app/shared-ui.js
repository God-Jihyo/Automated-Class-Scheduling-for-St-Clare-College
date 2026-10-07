// app/shared-ui.js

document.addEventListener('DOMContentLoaded', () => {
    initializePosterCarousel(); 
    loadEventTicker();
    setupNavigation();
    setupCommunicationHub();
    loadMessageRecipients(); 
    loadMessages('inbox'); 
    createToastContainer();
    loadUserProfile(); 
    loadAccountSettings();
    if (document.getElementById('scheduleContainer')) {
        loadMySchedule();
    }
    if (document.getElementById('enrolledSubjectsBody')) {
        loadEnrolledSubjects();
    }
    if (document.getElementById('assignedSubjectsBody')) {
        loadAssignedSubjects();
    }
    if (document.getElementById('eventsFeedContainer')) {
        loadCampusEvents();
    }
});

// --- FETCH USER PROFILE (FIXES MISSING NAME/ID) ---
// --- UNIVERSAL PROFILE & DASHBOARD GREETING ENGINE ---
async function loadUserProfile() {
    try {
        const response = await fetch('../check_session.php');
        const data = await response.json();

        if (data.logged_in) {
            // 1. Safely extract the Name and ID (Works for both Students and Teachers!)
            let fullName = "User";
            let idNum = "Unknown ID";

            if (data.profile) {
                fullName = data.profile.full_name || data.profile.name || data.profile.first_name || 'User';
                idNum = data.role === 'teacher' ? (data.profile.teacher_id || data.account_id) : (data.profile.student_id || data.account_id);
            }

            // 2. Update the Sidebar Profile
            const topName = document.getElementById('topBarName');
            const topId = document.getElementById('topBarId');
            
            if (topName) topName.innerText = fullName;
            if (topId) topId.innerText = `ID: ${idNum}`;

            // 3. Update the Dashboard Greeting 
            const welcomeName = document.getElementById('welcomeName');
            if (welcomeName) {
                // If the name is "Gahum, Sean", this cleanly grabs just "Gahum"
                const shortName = fullName.includes(',') ? fullName.split(',')[0] : fullName.split(' ')[0];
                welcomeName.innerHTML = `Hello, ${shortName}! <span style="font-size: 1.5rem;">👋</span>`;
            }

// 4. Generate the Live Date (Fixes the "undefined" bug forever!)
            const dateElement = document.getElementById('currentDate');
            if (dateElement) {
                const now = new Date();
                const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                dateElement.innerText = now.toLocaleDateString('en-US', options);
            }

            // --- NEW: POPULATE THE SETTINGS PAGE ---
            const setFullName = document.getElementById('set-fullName');
            const setIdNum = document.getElementById('set-idNum');
            const setDepartment = document.getElementById('set-department');
            const setRole = document.getElementById('set-role');
            const setEmail = document.getElementById('set-email');
            const setPhone = document.getElementById('set-phone');

            if (setFullName) setFullName.innerText = fullName;
            if (setIdNum) setIdNum.innerText = idNum;
            if (setRole) setRole.innerText = data.role;
            
            if (data.profile) {
                // Determine Department/Course based on role
                let deptText = "N/A";
                if (data.role === 'student' && data.profile.course_year) deptText = data.profile.course_year;
                if (data.role === 'teacher' && data.profile.department) deptText = data.profile.department;
                if (setDepartment) setDepartment.innerText = deptText;

                // Fill contact info
                if (setEmail) setEmail.value = data.profile.email || '';
                if (setPhone) setPhone.value = data.profile.contact_number || data.profile.phone || '';
            }

        } 
    } catch (error) {
        console.error("Error loading profile data:", error);
    }
}


// thesis/app/shared-ui.js



async function handleLogout() {
    if (!confirm("Are you sure you want to log out?")) return;

    try {
        const response = await fetch('../logout.php');
        const data = await response.json();

        if (data.status === "success") {
            // This physically moves the browser back to the login page
            window.location.replace('../login.html');
        }
    } catch (error) {
        console.error("Logout failed:", error);
        // Fallback in case of network issues
        window.location.replace('../login.html');
    }
}
// --- NOTIFICATION ENGINE ---
function toggleNotifications() {
    const dropdown = document.getElementById('notifDropdown');
    if (dropdown) dropdown.classList.toggle('active');
}

// Close the dropdown if you click anywhere else on the screen
document.addEventListener('click', function(event) {
    const wrapper = document.getElementById('notifWrapper');
    const dropdown = document.getElementById('notifDropdown');
    if (wrapper && dropdown && !wrapper.contains(event.target)) {
        dropdown.classList.remove('active');
    }
});

async function fetchNotifications() {
    const list = document.getElementById('notifList');
    const badge = document.getElementById('notifBadge');
    if (!list || !badge) return;

    try {
        const response = await fetch('../api/get_notifications.php');
        const result = await response.json();

        if (result.success) {
            // Update the Red Badge!
            if (result.unread > 0) {
                badge.innerText = result.unread > 9 ? '9+' : result.unread;
                badge.style.display = 'block';
            } else {
                badge.style.display = 'none';
            }

            // Draw the list!
            list.innerHTML = '';
            if (result.data.length === 0) {
                list.innerHTML = `<div style="padding: 30px 20px; text-align: center; color: #94a3b8;"><i class="fa-regular fa-bell-slash" style="font-size: 2rem; margin-bottom: 10px;"></i><br>You're all caught up!</div>`;
                return;
            }

            result.data.forEach(notif => {
                const unreadClass = notif.is_read == 0 ? 'unread' : '';
                
                // Pick an icon based on the type of notification
                let iconHtml = '<i class="fa-solid fa-circle-info" style="color: #0ea5e9;"></i>';
                if (notif.type === 'success') iconHtml = '<i class="fa-solid fa-circle-check" style="color: #10b981;"></i>';
                if (notif.type === 'alert') iconHtml = '<i class="fa-solid fa-triangle-exclamation" style="color: #f59e0b;"></i>';
                
                // 🚨 THE FIX: NATIVE CLICKABLE NOTIFICATIONS 🚨
                let clickAction = '';
                let customStyle = '';
                
                // If this is the Conflict Resolution alert, turn it into a physical button!
                if (notif.message.includes("Action Required") || notif.message.includes("Click here")) {
                    clickAction = `onclick="if(typeof window.openConflictModal === 'function') { window.openConflictModal(); event.stopPropagation(); }"`;
                    customStyle = `cursor: pointer; background-color: #fef2f2; border: 1px solid #fecaca; transition: 0.2s;`;
                    
                    // Make the text look like a link to prompt the user
                    notif.message = notif.message.replace("Click here to resolve.", `<strong style="color: #ef4444; text-decoration: underline;">Click here to resolve.</strong>`);
                }
                // 🚨 NEW: If this is a Class Relocation alert for STUDENTS!
                else if (notif.message.includes("CLASS UPDATE:")) {
                    clickAction = `onclick="if(typeof window.openStudentUpdateModal === 'function') { window.openStudentUpdateModal('${encodeURIComponent(notif.message)}'); event.stopPropagation(); }"`;
                    customStyle = `cursor: pointer; background-color: #eff6ff; border: 1px solid #bfdbfe; transition: 0.2s;`;
                    
                    notif.message = notif.message.replace("CLASS UPDATE:", "<strong>CLASS UPDATE:</strong>") + `<br><span style="color: #3b82f6; font-size: 12px; font-weight: bold; margin-top: 5px; display: inline-block; text-decoration: underline;"><i class="fa-solid fa-expand" style="margin-right: 3px;"></i> Click to view details</span>`;
                }
                
                list.innerHTML += `
                    <div class="notif-item ${unreadClass}" style="${customStyle}" ${clickAction}>
                        <div class="notif-icon">${iconHtml}</div>
                        <div>
                            <div class="notif-text">${notif.message}</div>
                            <span class="notif-time">${notif.formatted_time}</span>
                        </div>
                    </div>
                `;
            });
        }
    } catch (e) {
        console.error("Failed to load notifications:", e);
        list.innerHTML = `<div style="padding: 30px 20px; text-align: center; color: #ef4444;"><i class="fa-solid fa-triangle-exclamation" style="font-size: 2rem; margin-bottom: 10px;"></i><br>Database connection failed.</div>`;
    }
}
// --- MARK NOTIFICATIONS AS READ ---
async function markNotificationsRead() {
    try {
        const response = await fetch('../api/mark_notifications_read.php', { method: 'POST' });
        const result = await response.json();
        
        if (result.success) {
            // Instantly reload the notifications list to clear the red badge!
            fetchNotifications();
        }
    } catch (e) {
        console.error("Failed to mark notifications read", e);
    }
}
// Call it immediately when the page loads!
document.addEventListener('DOMContentLoaded', () => {
    fetchNotifications();
});

// --- NAVIGATION LOGIC (WITH TRIPLE-PULSE WAKEUP) ---
function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-menu a');
    const views = document.querySelectorAll('.view-section');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const anchor = e.target.closest('a');
            if (!anchor) return;
            
            let targetId = anchor.getAttribute('data-target');
            if (!targetId && anchor.getAttribute('onclick')) {
                const match = anchor.getAttribute('onclick').match(/'([^']+)'/);
                if (match) targetId = match[1];
            }

            if (!targetId) return;
            e.preventDefault(); 

            document.querySelectorAll('.nav-menu li').forEach(li => li.classList.remove('active'));
            anchor.closest('li').classList.add('active');

            views.forEach(view => view.classList.remove('active-view'));

            const targetView = document.getElementById(targetId);
            if (targetView) targetView.classList.add('active-view');

            // THE FIX: Fire 'resize' 3 times to GUARANTEE the browser catches it after painting the tab!
            setTimeout(() => window.dispatchEvent(new Event('resize')), 10);
            setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
            setTimeout(() => window.dispatchEvent(new Event('resize')), 300);
        });
    });
}


// --- SETTINGS TAB SWITCHER ---
function switchSettingsTab(tabName) {
    // Hide all panes
    document.querySelectorAll('.settings-pane').forEach(pane => {
        pane.style.display = 'none';
    });
    // Remove active class from all buttons
    document.querySelectorAll('.settings-tab').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show target pane and highlight button
    document.getElementById(`tab-${tabName}`).style.display = 'block';
    
    // Find the button that was clicked (based on the onclick attribute)
    const targetBtn = Array.from(document.querySelectorAll('.settings-tab')).find(btn => btn.getAttribute('onclick').includes(tabName));
    if (targetBtn) targetBtn.classList.add('active');
}


// --- LOAD VISUAL SCHEDULE (WITH SMART MAKE-UP CLASS INJECTION) ---
// --- LOAD VISUAL SCHEDULE (WITH SLEEK CLICKABLE CARDS & VIRTUAL POPUPS) ---
async function loadMySchedule() {
    const container = document.getElementById('scheduleContainer');
    if (!container) return;

    try {
        const [schedResponse, eventsResponse] = await Promise.all([
            fetch('../api/get_my_schedule.php'),
            fetch('../api/get_new_events.php') 
        ]);

        const rawText = await schedResponse.text(); 
        let result;
        try { 
            result = JSON.parse(rawText); 
        } catch (e) { 
            container.innerHTML = `<div style="color:red; padding:20px; text-align:left; background:#fee2e2; border-radius:8px;"><h4 style="margin:0 0 10px 0;">PHP Error Detected:</h4><pre style="white-space: pre-wrap; font-size: 12px;">${rawText}</pre></div>`;
            return; 
        }
        
        let eventsResult = { data: [] };
        try { 
            const eventsRaw = await eventsResponse.text();
            eventsResult = JSON.parse(eventsRaw); 
        } catch (e) {}

        if (result.success) {
            container.innerHTML = ''; 

            const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const scheduleByDay = { 'Monday': [], 'Tuesday': [], 'Wednesday': [], 'Thursday': [], 'Friday': [], 'Saturday': [] };

            // 1. Load regular schedule safely
            if(result.data && Array.isArray(result.data)) {
                result.data.forEach(cls => {
                    if (scheduleByDay[cls.day_of_week]) {
                        scheduleByDay[cls.day_of_week].push({...cls, isMakeup: false});
                    }
                });
            }

            // 2. Inject Make-up Classes
            if(eventsResult.data && Array.isArray(eventsResult.data)) {
                eventsResult.data.forEach(ev => {
                    const titleUpper = (ev.title || '').toUpperCase();
                    if (titleUpper.includes('MAKE-UP') || titleUpper.includes('MAKEUP') || titleUpper.includes('RESCHEDULE')) {
                        let isMyClass = false;
                        if (result.role === 'student') {
                            isMyClass = true; 
                        } else if (result.role === 'teacher') {
                            Object.values(scheduleByDay).flat().forEach(myClass => {
                                if (titleUpper.includes((myClass.subject_name || '').toUpperCase()) || 
                                   (myClass.course_no && titleUpper.includes((myClass.course_no || '').toUpperCase()))) {
                                    isMyClass = true;
                                }
                            });
                        }

                        if (isMyClass) {
                            let safeDateStr = ev.startDate;
                            if (safeDateStr && !safeDateStr.includes('T')) safeDateStr += 'T12:00:00'; 
                            
                            const dateObj = new Date(safeDateStr);
                            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
                            
                            if (scheduleByDay[dayName]) {
                                scheduleByDay[dayName].push({
                                    isMakeup: true,
                                    time_slot: (ev.startTime ? ev.startTime.substring(0,5) : '') + (ev.endTime ? '-' + ev.endTime.substring(0,5) : ''),
                                    subject_name: ev.title,
                                    room_name: ev.location || 'TBA',
                                    detail: ev.announcement || 'No announcement provided.',
                                    full_date: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                });
                            }
                        }
                    }
                });
            }

            // 3. Sort by time
            Object.keys(scheduleByDay).forEach(day => {
                scheduleByDay[day].sort((a, b) => {
                    if (!a.time_slot || !b.time_slot) return 0;
                    return a.time_slot.localeCompare(b.time_slot);
                });
            });

            // 4. Draw the Grid
            daysOfWeek.forEach(day => {
                const dayColumn = document.createElement('div');
                dayColumn.className = 'schedule-day';
                let contentHTML = `<div class="day-header">${day}</div><div class="day-content">`;
                
                if (scheduleByDay[day].length === 0) {
                    contentHTML += `
                    <div class="empty-day" style="text-align: center; padding: 30px 10px; color: #94a3b8; background: #f8fafc; border-radius: 12px; border: 1px dashed #cbd5e1; margin-top: 10px;">
                        <i class="fa-solid fa-mug-hot" style="font-size: 25px; margin-bottom: 8px; color: #cbd5e1;"></i>
                        <div style="font-size: 13px; font-weight: 600; color: #64748b;">No classes</div>
                    </div>`;
                } else {
                    scheduleByDay[day].forEach(cls => {
                        let timeString = cls.time_slot || 'TBA';
                        if(timeString.includes('-')) {
                            let parts = timeString.split('-');
                            timeString = formatTime(parts[0]) + ' - ' + formatTime(parts[1]);
                        }

                        if (cls.isMakeup) {
                            const safeTitle = encodeURIComponent(cls.subject_name);
                            const safeRoom = encodeURIComponent(cls.room_name);
                            const safeDetail = encodeURIComponent(cls.detail || '');

                            contentHTML += `
                                <div onclick="showMakeupDetails('${safeTitle}', '${cls.full_date}', '${timeString}', '${safeRoom}', '${safeDetail}')" style="position: relative; cursor: pointer; transition: all 0.2s ease; border-radius: 12px; padding: 15px; border: 1px solid #fde68a; background: #fffbeb; box-shadow: 0 2px 4px rgba(0,0,0,0.02); margin-bottom: 12px;" onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 10px 15px -3px rgba(245,158,11,0.2)';" onmouseout="this.style.transform='none'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.02)';">
                                    <div style="font-size: 0.65rem; font-weight: 800; color: #d97706; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; display: flex; align-items: center; gap: 5px;"><i class="fa-solid fa-triangle-exclamation"></i> Rescheduled</div>
                                    <div style="font-size: 0.75rem; color: #92400e; font-weight: 600; margin-bottom: 6px;"><i class="fa-regular fa-clock"></i> ${timeString}</div>
                                    <div style="font-size: 0.95rem; font-weight: 700; color: #78350f; margin-bottom: 4px;">${cls.subject_name}</div>
                                    <div style="font-size: 0.75rem; color: #92400e;"><i class="fa-solid fa-location-dot"></i> ${cls.room_name}</div>
                                </div>
                            `;
                        } else {
                            // NORMAL CLEAN CLASS CARD
                            let sectionBadge = '';
                            if (cls.section_name) {
                                sectionBadge = `<div style="margin-top: 10px; font-size: 0.75rem; color: #0284c7; font-weight: 700; display: flex; align-items: center; gap: 5px;"><i class="fa-solid fa-users-rectangle"></i> ${cls.section_name}</div>`;
                            }

                            // Tiny Video Icon if Links exist
                            let linkIndicator = '';
                            if ((cls.gmeet_link && cls.gmeet_link !== 'null') || (cls.classroom_code && cls.classroom_code !== 'null')) {
                                linkIndicator = `<div style="position: absolute; top: 12px; right: 12px; color: #3b82f6; font-size: 13px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 50%; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center;" title="Virtual Access Available"><i class="fa-solid fa-video"></i></div>`;
                            }

                            // The Reschedule button (Teacher Only)
                            let rescheduleIcon = '';
                            if (result.role === 'teacher') {
                                const safeSubj = (cls.subject_name || '').replace(/'/g, "\\'");
                                const safeSec = (cls.section_name || cls.detail || '').replace(/'/g, "\\'");
                                rescheduleIcon = `<button onclick="event.stopPropagation(); openRescheduleModal('${safeSubj}', 'Session', '${safeSec}')" title="Request Make-up Class" style="position: absolute; bottom: 12px; right: 12px; background: #fffbeb; border: 1px solid #fde68a; color: #f59e0b; cursor: pointer; font-size: 0.9rem; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: all 0.2s;" onmouseover="this.style.background='#fef3c7'; this.style.transform='scale(1.1)';" onmouseout="this.style.background='#fffbeb'; this.style.transform='none';"><i class="fa-solid fa-calendar-plus"></i></button>`;
                            }

                            // Safe Encoding for Modal
                            const safeTitle = encodeURIComponent(cls.subject_name || 'Unknown Subject');
                            const safeCode = encodeURIComponent(cls.subject_code || '');
                            const safeRoom = encodeURIComponent(cls.room_name || 'TBA');
                            const safeSection = encodeURIComponent(cls.section_name || cls.detail || 'TBA');
                            const safeGmeet = encodeURIComponent(cls.gmeet_link || '');
                            const safeClassCode = encodeURIComponent(cls.classroom_code || '');
                            const safeTime = encodeURIComponent(timeString);

                            // The Beautiful Clickable Container
                            contentHTML += `
                                <div onclick="openUniversalClassModal('${safeCode}', '${safeTitle}', '${safeSection}', '${safeRoom}', '${safeTime}', '${day}', '${safeGmeet}', '${safeClassCode}')" style="position: relative; cursor: pointer; transition: all 0.2s ease; border-radius: 12px; padding: 16px; border: 1px solid #e2e8f0; background: #dae7fa; box-shadow: 0 2px 4px rgba(0,0,0,0.02); margin-bottom: 12px;" onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 12px 20px -5px rgba(0,0,0,0.1)'; this.style.borderColor='#cbd5e1';" onmouseout="this.style.transform='none'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.02)'; this.style.borderColor='#e2e8f0';">
                                    ${linkIndicator}
                                    <div style="font-size: 0.75rem; color: #64748b; font-weight: 600; margin-bottom: 8px; display: flex; align-items: center; gap: 5px;"><i class="fa-regular fa-clock"></i> ${timeString}</div>
                                    <div style="font-size: 1rem; font-weight: 800; color: #0f172a; margin-bottom: 2px; padding-right: 25px;">${cls.subject_code}</div>
                                    <div style="font-size: 0.85rem; color: #475569; margin-bottom: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${cls.subject_name}">${cls.subject_name}</div>
                                    <div style="font-size: 0.8rem; color: #64748b; display: flex; align-items: center; gap: 5px;"><i class="fa-solid fa-location-dot"></i> ${cls.room_name}</div>
                                    ${sectionBadge}
                                    ${rescheduleIcon}
                                </div>
                            `;
                        }
                    });
                }
                dayColumn.innerHTML = contentHTML + '</div>';
                container.appendChild(dayColumn);
            });
        } else {
            container.innerHTML = `<div style="text-align:center; color:red; padding:20px;">${result.message || 'Failed to load schedule.'}</div>`;
        }
    } catch (error) { 
        container.innerHTML = `<div style="text-align:center; color:red; padding:20px;">Network error while loading schedule.</div>`;
    }
}

// ==============================================================
// THE NEW UNIVERSAL CLASS DETAILS MODAL (Auto-Generates!)
// ==============================================================
window.openUniversalClassModal = function(code, title, section, room, time, day, gmeet, classcode) {
    // Decode data
    code = decodeURIComponent(code); title = decodeURIComponent(title);
    section = decodeURIComponent(section); room = decodeURIComponent(room);
    time = decodeURIComponent(time); day = decodeURIComponent(day);
    gmeet = decodeURIComponent(gmeet); classcode = decodeURIComponent(classcode);

    // Build the beautiful links layout
    let linksHTML = '';
    if ((!gmeet || gmeet === 'null') && (!classcode || classcode === 'null')) {
        linksHTML = `<div style="text-align:center; padding: 15px; color: #10366b; font-size: 0.85rem; background: #f8fafc; border-radius: 8px; border: 1px dashed #cbd5e1;">No virtual links assigned for this class.</div>`;
    } else {
        linksHTML = `<div style="display: flex; flex-direction: column; gap: 10px;">`;
        if (gmeet && gmeet !== 'null') {
            linksHTML += `
            <a href="${gmeet}" target="_blank" style="display: flex; align-items: center; justify-content: space-between; background: #eff6ff; border: 1px solid #bfdbfe; padding: 12px 15px; border-radius: 8px; text-decoration: none; color: #1d4ed8; transition: all 0.2s;" onmouseover="this.style.background='#dbeafe'" onmouseout="this.style.background='#eff6ff'">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="background: #3b82f6; color: white; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px;"><i class="fa-solid fa-video"></i></div>
                    <div>
                        <div style="font-weight: 700; font-size: 0.95rem;">Google Meet</div>
                        <div style="font-size: 0.75rem; color: #3b82f6; opacity: 0.9;">Click to join meeting room</div>
                    </div>
                </div>
                <i class="fa-solid fa-arrow-up-right-from-square"></i>
            </a>`;
        }
        if (classcode && classcode !== 'null') {
            linksHTML += `
            <div style="display: flex; align-items: center; justify-content: space-between; background: #f0fdf4; border: 1px solid #bbf7d0; padding: 12px 15px; border-radius: 8px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="background: #22c55e; color: white; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px;"><i class="fa-solid fa-chalkboard-user"></i></div>
                    <div>
                        <div style="font-weight: 700; font-size: 0.95rem; color: #15803d;">Classroom Code</div>
                        <div style="font-size: 0.95rem; font-family: monospace; color: #166534; font-weight: bold; letter-spacing: 1px;">${classcode}</div>
                    </div>
                </div>
                <button onclick="navigator.clipboard.writeText('${classcode}'); this.innerHTML='<i class=\\'fa-solid fa-check\\'></i> Copied!'; this.style.background='#22c55e'; this.style.color='white'; setTimeout(()=>{this.innerHTML='<i class=\\'fa-regular fa-copy\\'></i> Copy'; this.style.background='white'; this.style.color='#22c55e';}, 2000);" style="background: white; border: 1px solid #bbf7d0; color: #22c55e; height: 32px; padding: 0 12px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 6px; font-weight: bold; font-size: 0.8rem; transition: all 0.2s;" title="Copy Code">
                    <i class="fa-regular fa-copy"></i> Copy
                </button>
            </div>`;
        }
        linksHTML += `</div>`;
    }

    // Auto-create Modal if it doesn't exist
    let modal = document.getElementById('universalClassModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'universalClassModal';
        modal.style.cssText = 'display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15, 23, 42, 0.6); z-index:9999; justify-content:center; align-items:center; backdrop-filter: blur(4px);';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div style="background: white; width: 90%; max-width: 420px; border-radius: 16px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); animation: popIn 0.3s ease-out;">
            <style>@keyframes popIn { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }</style>
            
            <div style="background: linear-gradient(135deg, #c0c4ff 0%, #e0f2fe 100%); padding: 25px 20px; border-bottom: 1px solid #bae6fd; position: relative;">
                <button onclick="document.getElementById('universalClassModal').style.display='none'" style="position:absolute; top: 15px; right: 15px; background:white; border:1px solid #bae6fd; width:30px; height:30px; border-radius:50%; font-size: 14px; color: #0284c7; cursor: pointer; display:flex; align-items:center; justify-content:center; transition: background 0.2s;" onmouseover="this.style.background='#e0f2fe'" onmouseout="this.style.background='white'"><i class="fa-solid fa-xmark"></i></button>
                <div style="font-size: 0.75rem; font-weight: 800; color: #0284c7; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;"><i class="fa-regular fa-calendar" style="margin-right:4px;"></i> ${day}</div>
                <h2 style="margin: 0; color: #0f172a; font-size: 1.5rem; font-weight: 800; letter-spacing: -0.5px;">${code}</h2>
                <p style="margin: 4px 0 0 0; color: #475569; font-size: 0.95rem; line-height: 1.4;">${title}</p>
            </div>

            <div style="padding: 20px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 25px;">
                    <div style="background: #f8fafc; padding: 12px; border-radius: 10px; border: 1px solid #f1f5f9;">
                        <div style="font-size: 0.65rem; color: #64748b; text-transform: uppercase; font-weight: 800; margin-bottom: 4px; letter-spacing: 0.5px;">Time</div>
                        <div style="font-size: 0.9rem; color: #0f172a; font-weight: 700;"><i class="fa-regular fa-clock" style="color:#94a3b8; margin-right:4px;"></i> ${time}</div>
                    </div>
                    <div style="background: #f8fafc; padding: 12px; border-radius: 10px; border: 1px solid #f1f5f9;">
                        <div style="font-size: 0.65rem; color: #64748b; text-transform: uppercase; font-weight: 800; margin-bottom: 4px; letter-spacing: 0.5px;">Room</div>
                        <div style="font-size: 0.9rem; color: #0f172a; font-weight: 700;"><i class="fa-solid fa-location-dot" style="color:#94a3b8; margin-right:4px;"></i> ${room}</div>
                    </div>
                    <div style="background: #f8fafc; padding: 12px; border-radius: 10px; border: 1px solid #f1f5f9; grid-column: span 2;">
                        <div style="font-size: 0.65rem; color: #64748b; text-transform: uppercase; font-weight: 800; margin-bottom: 4px; letter-spacing: 0.5px;">Section / Group</div>
                        <div style="font-size: 0.9rem; color: #0f172a; font-weight: 700;"><i class="fa-solid fa-users-rectangle" style="color:#94a3b8; margin-right:4px;"></i> ${section}</div>
                    </div>
                </div>

                <h4 style="margin: 0 0 12px 0; color: #334155; font-size: 0.95rem; font-weight: 800; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px;"><i class="fa-solid fa-laptop" style="color:#3b82f6;"></i> Virtual Class Access</h4>
                ${linksHTML}
            </div>
        </div>
    `;
    modal.style.display = 'flex';
};

// --- SHOW MAKEUP DETAILS MODAL ---
function showMakeupDetails(encTitle, date, time, encRoom, encMessage) {
    // Unpack the safe text back into normal text!
    const title = decodeURIComponent(encTitle);
    const room = decodeURIComponent(encRoom);
    const message = decodeURIComponent(encMessage);

    let modal = document.getElementById('studentEventModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'studentEventModal';
        modal.className = 'modal';
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('active');
        });
        document.body.appendChild(modal);
    }

    // Format the Teacher's message nicely
    let noticeHtml = message ? `<div style="background:#fff3cd; border-left:4px solid #f59e0b; padding:15px; border-radius:8px; color:#92400e; margin-top: 20px; white-space: pre-wrap; line-height: 1.5; font-size: 0.95rem;"><i class="fa-solid fa-circle-exclamation"></i> <strong>TEACHER'S MESSAGE:</strong><br><br>${message}</div>` : '';

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px; text-align: left;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                <span class="event-badge" style="background: #ef4444; color: white; padding: 4px 10px; border-radius: 12px; font-weight: bold; font-size: 0.8rem; margin: 0; box-shadow: 0 2px 5px rgba(239,68,68,0.3);"><i class="fa-solid fa-triangle-exclamation"></i> URGENT SCHEDULE UPDATE</span>
                <span class="close-btn" style="cursor: pointer; font-size: 1.5rem;" onclick="document.getElementById('studentEventModal').classList.remove('active')">&times;</span>
            </div>
            <h2 style="font-size: 1.5rem; color: #0f172a; margin-bottom: 20px;">${title}</h2>
            <div style="background: #f8fafc; padding: 15px; border-radius: 10px; display: grid; grid-template-columns: 1fr; gap: 10px; margin-bottom: 10px; border: 1px solid #e2e8f0;">
                <div><strong><i class="fa-regular fa-calendar" style="color: #f59e0b;"></i> New Date:</strong> ${date}</div>
                <div><strong><i class="fa-regular fa-clock" style="color: #f59e0b;"></i> New Time:</strong> ${time}</div>
                <div><strong><i class="fa-solid fa-location-dot" style="color: #f59e0b;"></i> New Room:</strong> ${room}</div>
            </div>
            ${noticeHtml}
        </div>
    `;
    modal.classList.add('active');
}

function formatTime(time24) {
    if (!time24) return '';
    let parts = time24.split(':');
    if (parts.length < 2) return time24;
    let hours = parseInt(parts[0]);
    const minutes = parts[1];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${ampm}`;
}

// --- CAROUSEL LOGIC ---
function initializePosterCarousel() {
    const track = document.getElementById('posterTrack');
    if (!track) return; 
    const slides = track.querySelectorAll('.poster-slide');
    if (slides.length <= 1) return; 
    let currentIndex = 0;
    setInterval(() => {
        currentIndex++;
        if (currentIndex >= slides.length) currentIndex = 0;
        track.style.transform = `translateX(${-(currentIndex * 100)}%)`;
    }, 5000);
}

// --- TICKER LOGIC ---
async function loadEventTicker() {
    try {
        const response = await fetch('../api/get_ticker_events.php');
        const data = await response.json();
        if (data.success && document.getElementById('tickerText')) {
            document.getElementById('tickerText').innerHTML = data.ticker_text;
        }
    } catch (error) {}
}

// --- COMMUNICATION HUB LOGIC (Tabs & Modals) ---
function setupCommunicationHub() {
    const composeModal = document.getElementById('composeModal');
    const btnCompose = document.getElementById('btnComposeNew');
    const closeCompose = document.getElementById('closeComposeModal');
    if (btnCompose && composeModal && closeCompose) {
        btnCompose.addEventListener('click', () => composeModal.classList.add('active'));
        closeCompose.addEventListener('click', () => composeModal.classList.remove('active'));
        composeModal.addEventListener('click', (e) => { if (e.target === composeModal) composeModal.classList.remove('active'); });
    }

    const chatModal = document.getElementById('chatModal');
    const closeChat = document.getElementById('closeChatModal');
    if (chatModal && closeChat) {
        closeChat.addEventListener('click', () => chatModal.classList.remove('active'));
        chatModal.addEventListener('click', (e) => { if (e.target === chatModal) chatModal.classList.remove('active'); });
    }

    const tabInbox = document.getElementById('tabInbox');
    const tabSent = document.getElementById('tabSent');
    if (tabInbox && tabSent) {
        tabInbox.addEventListener('click', () => {
            tabInbox.classList.add('active'); tabSent.classList.remove('active');
            document.getElementById('colPersonHeader').innerText = "From";
            loadMessages('inbox'); 
        });
        tabSent.addEventListener('click', () => {
            tabSent.classList.add('active'); tabInbox.classList.remove('active');
            document.getElementById('colPersonHeader').innerText = "To";
            loadMessages('sent'); 
        });
    }
}

// --- LOAD RECIPIENTS ---
async function loadMessageRecipients() {
    try {
        const response = await fetch('../api/get_message_recipients.php');
        const data = await response.json();
        if (data.success) {
            const datalist = document.getElementById('usersDatalist');
            if (!datalist) return;
            datalist.innerHTML = ''; 
            data.users.forEach(user => {
                const option = document.createElement('option');
                option.value = `${user.name} (${user.role.toUpperCase()})`; 
                option.setAttribute('data-id', user.id);
                option.setAttribute('data-role', user.role);
                datalist.appendChild(option);
            });
        }
    } catch (error) {}
}

// --- LOAD MESSAGES TABLE ---
async function loadMessages(folder = 'inbox') {
    const tbody = document.getElementById('messagingTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Loading messages...</td></tr>';
    try {
        const response = await fetch(`../api/get_messages.php?folder=${folder}`);
        const data = await response.json();
        if (data.success) {
            tbody.innerHTML = ''; 
            if (data.messages.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #64748b;">No ${folder} messages found.</td></tr>`;
                return;
            }
            data.messages.forEach(msg => {
                const dateObj = new Date(msg.created_at);
                const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + '<br><small style="color:#64748b;">' + dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) + '</small>';
                let badgeClass = 'status-pending'; 
                if (msg.status === 'in_progress') badgeClass = 'status-pending'; 
                if (msg.status === 'resolved') badgeClass = 'status-approved';   
                if (msg.status === 'declined') badgeClass = 'status-declined';   
                if (msg.status === 'overdue') badgeClass = 'status-overdue';
                if (msg.status === 'disputed') badgeClass = 'status-disputed';
                const statusText = msg.status.replace('_', ' ');
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${formattedDate}</td><td><strong>${msg.person_name}</strong><br><small style="text-transform: capitalize; color: #64748b;">${msg.person_role}</small></td><td>${msg.subject}</td><td><span class="status-badge ${badgeClass}">${statusText}</span></td><td><button class="btn-submit" style="padding: 6px 12px; font-size: 0.8rem; width: auto;" onclick="openChatModal(${msg.id})"><i class="fa-solid fa-comments"></i> View</button></td>`;
                tbody.appendChild(tr);
            });
        }
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: red;">Failed to load data. Please try again.</td></tr>';
    }
}

// --- HANDLE SENDING A NEW MESSAGE ---
document.addEventListener('DOMContentLoaded', () => {
    const composeForm = document.getElementById('composeForm');
    if (composeForm) composeForm.addEventListener('submit', handleComposeSubmit);
});

async function handleComposeSubmit(e) {
    e.preventDefault(); 
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';
    submitBtn.disabled = true;
    try {
        const searchInput = document.getElementById('recipientSearchInput').value;
        const subject = document.getElementById('composeSubject').value;
        const messageText = document.getElementById('composeMessage').value;
        const fileInput = document.getElementById('composeFile');
        let targetId = null; let targetRole = null;
        document.querySelectorAll('#usersDatalist option').forEach(option => {
            if (option.value === searchInput) { targetId = option.getAttribute('data-id'); targetRole = option.getAttribute('data-role'); }
        });
        if (!targetId || !targetRole) {
            showToast("Please select a valid person from the dropdown list.", "error");
            submitBtn.innerHTML = originalBtnText; submitBtn.disabled = false; return;
        }
        const formData = new FormData();
        formData.append('recipient_id', targetId); formData.append('recipient_role', targetRole);
        formData.append('subject', subject); formData.append('message', messageText);
        if (fileInput && fileInput.files.length > 0) formData.append('file', fileInput.files[0]);
        const response = await fetch('../api/submit_message.php', { method: 'POST', body: formData });
        const data = await response.json();
        if (data.success) {
            showToast(data.message, "success");
            document.getElementById('composeModal').classList.remove('active');
            e.target.reset(); document.getElementById('tabSent').click(); 
        } else { showToast(data.message, "error"); }
    } catch (error) { showToast("A network error occurred.", "error");
    } finally { submitBtn.innerHTML = originalBtnText; submitBtn.disabled = false; }
}





// --- TOAST NOTIFICATIONS ---
function createToastContainer() {
    const container = document.createElement('div'); container.id = 'toastContainer'; container.className = 'toast-container'; document.body.appendChild(container);
}
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer'); if (!container) return;
    const toast = document.createElement('div'); toast.className = `toast ${type === 'error' ? 'toast-error' : ''}`;
    let icon = type === 'error' ? '<i class="fa-solid fa-circle-xmark toast-icon"></i>' : '<i class="fa-solid fa-check-circle toast-icon"></i>'; 
    toast.innerHTML = `${icon}<span class="toast-message">${message}</span><i class="fa-solid fa-xmark toast-close"></i>`;
    container.appendChild(toast); setTimeout(() => toast.classList.add('active'), 10);
    toast.querySelector('.toast-close').addEventListener('click', () => { toast.classList.remove('active'); setTimeout(() => toast.remove(), 300); });
    setTimeout(() => { if (toast.parentNode) { toast.classList.remove('active'); setTimeout(() => toast.remove(), 300); } }, 5000);
}

// --- CHAT MODAL LOGIC ---
async function openChatModal(consultationId) {
    const modal = document.getElementById('chatModal'); if (!modal) return;
    modal.classList.add('active'); document.getElementById('chatThread').innerHTML = '<div style="text-align:center; padding: 20px; color:#64748b;">Loading thread...</div>';
    try {
        const response = await fetch(`../api/get_thread.php?id=${consultationId}`);
        const data = await response.json();
        if (data.success) {
            document.getElementById('chatSubject').innerText = data.main.subject;
            const myId = data.current_user_id; const mainIsMe = data.main.sender_id === myId; 
            const statusText = data.main.status.replace('_', ' ').toUpperCase();
            let statusColor = '#f59e0b'; 
            if(data.main.status === 'resolved') statusColor = '#10b981'; 
            if(data.main.status === 'declined') statusColor = '#ef4444'; 
            if(data.main.status === 'overdue') statusColor = '#ef4444'; 
            if(data.main.status === 'disputed') statusColor = '#991b1b'; 

            let actionButtons = '';
            if(data.main.status !== 'resolved' && data.main.status !== 'declined') {
                actionButtons = `<div style="margin-top: 10px;"><button class="btn-submit" style="background-color: #10b981; width: auto; padding: 5px 12px; font-size: 0.8rem; margin-right: 5px;" onclick="updateThreadStatus(${consultationId}, 'resolved')"><i class="fa-solid fa-check"></i> Mark Resolved</button><button class="btn-submit" style="background-color: #ef4444; width: auto; padding: 5px 12px; font-size: 0.8rem;" onclick="updateThreadStatus(${consultationId}, 'declined')"><i class="fa-solid fa-xmark"></i> Decline</button></div>`;
                document.getElementById('replyForm').style.display = 'flex'; 
            } else {
                document.getElementById('replyForm').style.display = 'none'; 
                if (mainIsMe) {
                    actionButtons = `<div style="margin-top: 10px;"><button class="btn-submit" style="background-color: #dc2626; width: auto; padding: 5px 12px; font-size: 0.8rem;" onclick="updateThreadStatus(${consultationId}, 'disputed')"><i class="fa-solid fa-triangle-exclamation"></i> I Still Need Response</button><div style="font-size: 0.75rem; color: #64748b; margin-top: 4px;">Click here if your issue was not actually resolved.</div></div>`;
                }
            }

            document.getElementById('chatParticipants').innerHTML = `Between <strong>${data.main.sender_name}</strong> and <strong>${data.main.recipient_name}</strong> <span class="${data.main.status === 'overdue' ? 'status-overdue' : ''}" style="margin-left: 10px; padding: 3px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: bold; background-color: ${statusColor}; color: white;">${statusText}</span> ${actionButtons}`;
            const threadContainer = document.getElementById('chatThread'); threadContainer.innerHTML = '';
            document.getElementById('replyConsultationId').value = consultationId;
            threadContainer.appendChild(createChatBubble(data.main.sender_name, data.main.message, data.main.created_at, mainIsMe, data.main.attachment_file));
            data.replies.forEach(rep => {
                const repIsMe = rep.sender_id === myId;
                threadContainer.appendChild(createChatBubble(rep.sender_name, rep.message, rep.created_at, repIsMe, rep.attachment_file));
            });
            setTimeout(() => threadContainer.scrollTop = threadContainer.scrollHeight, 100);
        } else { showToast(data.message, 'error'); modal.classList.remove('active'); }
    } catch (error) { showToast("Failed to load thread.", "error"); modal.classList.remove('active'); }
}

function createChatBubble(name, message, time, isMe, attachment) {
    const div = document.createElement('div'); div.className = `chat-bubble ${isMe ? 'chat-right' : 'chat-left'}`;
    const dateObj = new Date(time); const timeStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' at ' + dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    let attachHTML = '';
    if (attachment) attachHTML = `<div style="margin-top: 10px;"><a href="../${attachment}" target="_blank" style="color: ${isMe ? '#f8fafc' : 'var(--primary-red)'}; font-weight: 600;"><i class="fa-solid fa-paperclip"></i> View Attachment</a></div>`;
    div.innerHTML = `<div class="chat-meta">${isMe ? 'You' : name} • ${timeStr}</div><div>${message}</div>${attachHTML}`;
    return div;
}

// --- HANDLE SENDING A REPLY ---
document.addEventListener('DOMContentLoaded', () => {
    const replyForm = document.getElementById('replyForm');
    if (replyForm) { const replyBtn = replyForm.querySelector('button'); if (replyBtn) replyBtn.removeAttribute('onclick'); replyForm.addEventListener('submit', handleReplySubmit); }
});

async function handleReplySubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button'); const originalHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>'; btn.disabled = true;
    const consultId = document.getElementById('replyConsultationId').value; const msg = document.getElementById('replyMessage').value;
    try {
        const response = await fetch('../api/submit_reply.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ consultation_id: consultId, message: msg }) });
        const data = await response.json();
        if (data.success) { document.getElementById('replyMessage').value = ''; openChatModal(consultId); } 
        else { showToast(data.message, 'error'); }
    } catch (error) { showToast("Network error while replying.", "error"); } 
    finally { btn.innerHTML = originalHtml; btn.disabled = false; }
}

// --- UPDATE THREAD STATUS ---
async function updateThreadStatus(consultId, newStatus) {
    if(!confirm(`Are you sure you want to mark this request as ${newStatus.toUpperCase()}?`)) return;
    try {
        const response = await fetch('../api/update_status.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ consultation_id: consultId, status: newStatus }) });
        const data = await response.json();
        if (data.success) {
            showToast(data.message, 'success'); openChatModal(consultId); 
            const activeTab = document.querySelector('.tab-btn.active');
            if (activeTab && activeTab.innerText.toLowerCase().includes('inbox')) loadMessages('inbox'); else loadMessages('sent');
        } else { showToast(data.message, 'error'); }
    } catch (error) { showToast("Network error while updating status.", "error"); }
}
// --- LOAD ENROLLED SUBJECTS TABLE ---
async function loadEnrolledSubjects() {
    const tbody = document.getElementById('enrolledSubjectsBody');
    const totalLabel = document.getElementById('totalUnitsLabel');
    if (!tbody) return;

    try {
        const response = await fetch('../api/get_enrolled_subjects.php');
        const rawText = await response.text();
        
        let result;
        try { result = JSON.parse(rawText); } 
        catch (e) {
            tbody.innerHTML = `<tr><td colspan="7" style="color:red; text-align:left;"><pre>${rawText}</pre></td></tr>`;
            return;
        }

        if (result.success) {
            tbody.innerHTML = '';
            
            if (result.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #64748b;">No enrolled subjects found for your section.</td></tr>';
                if(totalLabel) totalLabel.innerText = '0';
                return;
            }

            result.data.forEach((subj, index) => {
                // Reuse our smart time formatter from the visual schedule!
                let timeString = subj.time_slot;
                if(timeString && timeString.includes('-')) {
                    let parts = timeString.split('-');
                    timeString = formatTime(parts[0]) + ' - ' + formatTime(parts[1]);
                }

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="color: #64748b;">${index + 1}</td>
                    <td><strong>${subj.course_no}</strong></td>
                    <td>${subj.subject_description}</td>
                    <td style="font-weight:bold;">${subj.units}</td>
                    <td>${timeString}</td>
                    <td><span style="background:#f1f5f9; padding:2px 8px; border-radius:4px; font-weight:600;">${subj.days}</span></td>
                    <td>${subj.room_name}</td>
                `;
                tbody.appendChild(tr);
            });

            if(totalLabel) totalLabel.innerText = result.total_units;

        } else {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: red;">Error: ${result.message}</td></tr>`;
        }
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: red;">Network connection failed.</td></tr>';
    }
}

// --- LOAD ASSIGNED SUBJECTS TABLE (TEACHER) ---
async function loadAssignedSubjects() {
    const tbody = document.getElementById('assignedSubjectsBody');
    const totalLabel = document.getElementById('totalTeachingUnitsLabel');
    if (!tbody) return;

    try {
        const response = await fetch('../api/get_assigned_subjects.php');
        const rawText = await response.text();
        
        let result;
        try { result = JSON.parse(rawText); } 
        catch (e) {
            tbody.innerHTML = `<tr><td colspan="8" style="color:red; text-align:left;"><pre>${rawText}</pre></td></tr>`;
            return;
        }

        if (result.success) {
            tbody.innerHTML = '';
            
            if (result.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #dd0000;">No assigned subjects found for this semester.</td></tr>';
                if(totalLabel) totalLabel.innerText = '0';
                return;
            }

            result.data.forEach((subj, index) => {
                // Reuse the smart AM/PM formatter
                let timeString = subj.time_slot;
                if(timeString && timeString.includes('-')) {
                    let parts = timeString.split('-');
                    timeString = formatTime(parts[0]) + ' - ' + formatTime(parts[1]);
                }

                const tr = document.createElement('tr');
                    // Replace the tr.innerHTML inside loadAssignedSubjects() with this:
                    tr.innerHTML = `
                        <td style="color: #8b6464;">${index + 1}</td>
                        <td><strong>${subj.course_no}</strong></td>
                        <td>${subj.subject_description}</td>
                        <td style="font-weight:bold;">${subj.units}</td>
                        <td><span style="color:#0284c7; font-weight:700;"><i class="fa-solid fa-users-rectangle"></i> ${subj.section_name}</span></td>
                        <td>${timeString}</td>
                        <td><span style="background:#f1f5f9; padding:2px 8px; border-radius:4px; font-weight:600;">${subj.days}</span></td>
                        <td>${subj.room_name}</td>
                        <td>
                            <button onclick="openLinkSetup('${subj.course_no}', '${subj.section_name}')" style="background:#f59e0b; color:white; border:none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 12px;">
                                <i class="fa-solid fa-link"></i> Add Links
                            </button>
                        </td>
                    `;
                tbody.appendChild(tr);
            });

            if(totalLabel) totalLabel.innerText = result.total_units;

        } else {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: red;">Error: ${result.message}</td></tr>`;
        }
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: red;">Network connection failed.</td></tr>';
    }
}


// --- LOAD CAMPUS EVENTS FEED ---
// --- CAMPUS EVENTS: FEED & CALENDAR ENGINE ---
let globalCampusEvents = [];
let currentCalMonth = new Date().getMonth();
let currentCalYear = new Date().getFullYear();

async function loadCampusEvents() {
    const feedContainer = document.getElementById('eventsFeedContainer');
    if (!feedContainer) return;

    // 1. Setup the Toggle Button
    const btnFeed = document.getElementById('btnViewFeed');
    const btnCal = document.getElementById('btnViewCal');
    const calContainer = document.getElementById('eventsCalendarContainer');

    if (btnFeed && btnCal) {
        btnFeed.addEventListener('click', () => {
            btnFeed.style.background = 'white'; btnFeed.style.color = '#0f172a'; btnFeed.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
            btnCal.style.background = 'transparent'; btnCal.style.color = '#64748b'; btnCal.style.boxShadow = 'none';
            feedContainer.style.display = 'block'; calContainer.style.display = 'none';
            
            // Force it to recalculate when switching back to the feed!
            setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
        });
        btnCal.addEventListener('click', () => {
            btnCal.style.background = 'white'; btnCal.style.color = '#0f172a'; btnCal.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
            btnFeed.style.background = 'transparent'; btnFeed.style.color = '#64748b'; btnFeed.style.boxShadow = 'none';
            calContainer.style.display = 'block'; feedContainer.style.display = 'none';
            renderEventsCalendar(); 
        });
    
    }

    // 2. Fetch the Data
    try {
        const response = await fetch('../api/get_new_events.php');
        const result = await response.json();

        if (result.success) {
            globalCampusEvents = result.data;
            renderEventsFeed();
        } else {
            feedContainer.innerHTML = `<div style="color:red; padding:20px;">Error: ${result.message}</div>`;
        }
    } catch (error) {
        feedContainer.innerHTML = `<div style="color:red; padding:20px;">Network Connection Failed.</div>`;
    }
}

// --- COVER FLOW CAROUSEL ENGINE ---
let currentFeedSlide = 0;
let feedCarouselInterval;

function renderEventsFeed() {
    const container = document.getElementById('eventsFeedContainer');
    container.innerHTML = '';
    
    if (globalCampusEvents.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding: 50px; background: white; border-radius: 10px; border: 1px dashed #cbd5e1;"><h3>No Upcoming Events</h3></div>`;
        return;
    }

    let trackHtml = `
        <div class="events-carousel-wrapper">
            <button class="carousel-btn prev" id="feedPrevBtn"><i class="fa-solid fa-chevron-left"></i></button>
            <button class="carousel-btn next" id="feedNextBtn"><i class="fa-solid fa-chevron-right"></i></button>
            <div class="events-carousel-track" id="eventsCarouselTrack">
    `;

    globalCampusEvents.forEach((ev, index) => {
        const dateObj = new Date(ev.startDate);
        const month = dateObj.toLocaleString('en-US', { month: 'short' });
        const day = dateObj.getDate();
        let timeStr = ev.startTime ? formatTime(ev.startTime.substring(0, 5)) : '';

        let badgeClass = 'badge-other';
        const typeLower = ev.type.toLowerCase();
        if (typeLower.includes('academic')) badgeClass = 'badge-academic';
        if (typeLower.includes('sport')) badgeClass = 'badge-sports';
        if (typeLower.includes('social')) badgeClass = 'badge-social';

        let posterHtml = '';
            if (ev.posterUrl) {
                const posterSrc = ev.posterUrl.includes('http') ? ev.posterUrl : '../' + ev.posterUrl;
                posterHtml = `<img src="${posterSrc}" style="width: 100%; height: 100%; object-fit: cover;">`;
        } else {
            posterHtml = `<div style="height: 100%; display: flex; align-items: center; justify-content: center; color: #cbd5e1;"><i class="fa-solid fa-image" style="font-size: 4rem;"></i></div>`;
        }

        // We add onclick to open the full details modal!
        trackHtml += `
            <div class="event-carousel-card" onclick="openEventDetailsModal(${index})">
                <div class="carousel-img-wrap">
                    ${posterHtml}
                    <span class="event-badge ${badgeClass}" style="position: absolute; top: 15px; left: 15px; margin: 0; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">${ev.type}</span>
                </div>
                <div class="carousel-text-wrap">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <h3 class="event-title">${ev.title}</h3>
                        <div style="text-align: right; line-height: 1.1; margin-left: 10px;">
                            <span style="display: block; font-size: 0.75rem; font-weight: bold; color: #1b5e20; text-transform: uppercase;">${month}</span>
                            <span style="display: block; font-size: 1.4rem; font-weight: 800; color: #0f172a;">${day}</span>
                        </div>
                    </div>
                    <div class="event-meta" style="font-size: 0.8rem; margin-bottom: 8px; color: #64748b; font-weight: 600;">
                        <span><i class="fa-regular fa-clock"></i> ${timeStr}</span> &nbsp;|&nbsp; 
                        <span><i class="fa-solid fa-location-dot"></i> ${ev.location}</span>
                    </div>
                    <p class="event-desc">${ev.description}</p>
                </div>
            </div>
        `;
    });

    trackHtml += `</div></div>`;
    container.innerHTML = trackHtml;

    setupFeedCarousel();
}

function setupFeedCarousel() {
    const track = document.getElementById('eventsCarouselTrack');
    const prevBtn = document.getElementById('feedPrevBtn');
    const nextBtn = document.getElementById('feedNextBtn');
    if (!track) return;

    const cards = track.querySelectorAll('.event-carousel-card');
    if (cards.length <= 1) {
        if(prevBtn) prevBtn.style.display = 'none';
        if(nextBtn) nextBtn.style.display = 'none';
        if(cards[0]) cards[0].classList.add('active-card');
        
        // Still center it if there's only 1 card!
        if(cards[0]) {
            setTimeout(() => {
                const wrapperW = track.parentElement.offsetWidth;
                if(wrapperW > 0) track.style.transform = `translateX(${(wrapperW - cards[0].offsetWidth) / 2}px)`;
            }, 100);
        }
        return;
    }

    currentFeedSlide = 0;



    function updateCarousel() {
        if (!cards[0]) return;
        
        let visibleCards = window.innerWidth >= 1024 ? 3 : (window.innerWidth >= 768 ? 2 : 1);
        
        // 1. Assign classes
        cards.forEach((card, index) => {
            card.classList.remove('active-card', 'silhouette-card');
            if (index >= currentFeedSlide && index < currentFeedSlide + visibleCards) {
                card.classList.add('active-card');
            } 
            else if (index === currentFeedSlide - 1 || index === currentFeedSlide + visibleCards) {
                card.classList.add('silhouette-card');
            }
        });

        // 2. Safe Fallback Math
        const wrapperWidth = track.parentElement.offsetWidth || 0;
        const cardWidth = cards[0].offsetWidth || 0;

        // CRITICAL: If width is 0, abort this math immediately so it doesn't break!
        if (wrapperWidth === 0 || cardWidth === 0) return; 

        const gap = 20; 
        let actualVisible = Math.min(cards.length, visibleCards);
        const activeBlockWidth = (actualVisible * cardWidth) + ((actualVisible - 1) * gap);
        
        // 3. Absolute Translation (No CSS Calc() needed)
        const centerOffset = (wrapperWidth - activeBlockWidth) / 2;
        const slideShift = currentFeedSlide * (cardWidth + gap);
        const finalX = centerOffset - slideShift;

        track.style.transform = `translateX(${finalX}px)`;
    }

    function next() {
        let visibleCards = window.innerWidth >= 1024 ? 3 : (window.innerWidth >= 768 ? 2 : 1);
        let maxSlide = cards.length - visibleCards;
        if (maxSlide < 0) maxSlide = 0;

        currentFeedSlide++;
        if (currentFeedSlide > maxSlide) currentFeedSlide = 0; 
        updateCarousel();
    }

    function prev() {
        let visibleCards = window.innerWidth >= 1024 ? 3 : (window.innerWidth >= 768 ? 2 : 1);
        let maxSlide = cards.length - visibleCards;
        if (maxSlide < 0) maxSlide = 0;

        currentFeedSlide--;
        if (currentFeedSlide < 0) currentFeedSlide = maxSlide; 
        updateCarousel();
    }

    nextBtn?.addEventListener('click', () => { next(); resetAuto(); });
    prevBtn?.addEventListener('click', () => { prev(); resetAuto(); });
    window.addEventListener('resize', updateCarousel);

    function resetAuto() {
        clearInterval(feedCarouselInterval);
        feedCarouselInterval = setInterval(next, 5000); 
    }
    
    resetAuto();
    setTimeout(updateCarousel, 50); // Initial draw
}

// --- FULL DETAIL MODAL (Opens when a card is clicked) ---
function openEventDetailsModal(index) {
    const ev = globalCampusEvents[index];
    if (!ev) return;

    // Check if modal exists, if not, create it
// Check if modal exists, if not, create it
    let modal = document.getElementById('studentEventModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'studentEventModal';
        modal.className = 'modal';
        
        // NEW: If they click the dark background outside the white box, close it!
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
        
        document.body.appendChild(modal);
    }
    const dateObj = new Date(ev.startDate);
    const fullDate = dateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    let timeStr = ev.startTime ? formatTime(ev.startTime.substring(0, 5)) : '';

    let posterHtml = '';
    if (ev.posterUrl) {
        const posterSrc = ev.posterUrl.includes('http') ? ev.posterUrl : '../uploads/' + ev.posterUrl;
        posterHtml = `<img src="${posterSrc}" style="width: 100%; border-radius: 10px; margin-bottom: 20px;">`;
    }

let noticeHtml = ev.announcement ? `<div style="background:#fff3cd; border-left:4px solid #f59e0b; padding:15px; border-radius:8px; color:#92400e; margin-top: 20px;"><i class="fa-solid fa-circle-exclamation"></i> <strong>NOTICE:</strong> ${ev.announcement}</div>` : '';

    // 🔥 THE NEW LOGIC: Only show the Delete button on the Teacher Portal for Make-Up Classes!
    let cancelBtnHtml = '';
    if (window.location.pathname.includes('teacher') && ev.title.includes('MAKE-UP CLASS')) {
        // We pass the exact title and date to the delete function
        const safeTitle = ev.title.replace(/'/g, "\\'");
        cancelBtnHtml = `
            <hr style="border: none; border-top: 1px dashed #cbd5e1; margin: 20px 0;">
            <button class="btn-submit" style="background-color: #ef4444; width: 100%;" onclick="cancelMakeupClass('${safeTitle}', '${ev.startDate}')">
                <i class="fa-solid fa-trash-can"></i> Cancel Make-Up Class
            </button>
        `;
    }

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px; text-align: left;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                <span class="event-badge badge-other" style="background: #1e293b; color: white;">${ev.type.toUpperCase()}</span>
                <span class="close-btn" style="cursor: pointer; font-size: 1.5rem;" onclick="document.getElementById('studentEventModal').classList.remove('active')">&times;</span>
            </div>
            <h2 style="font-size: 1.8rem; color: #0f172a; margin-bottom: 20px;">${ev.title}</h2>
            ${posterHtml}
            <div style="background: #f8fafc; padding: 15px; border-radius: 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; border: 1px solid #e2e8f0;">
                <div><strong><i class="fa-regular fa-calendar" style="color: #1b5e20;"></i> Date:</strong><br> ${fullDate}</div>
                <div><strong><i class="fa-regular fa-clock" style="color: #1b5e20;"></i> Time:</strong><br> ${timeStr}</div>
                <div><strong><i class="fa-solid fa-location-dot" style="color: #1b5e20;"></i> Location:</strong><br> ${ev.location}</div>
                <div><strong><i class="fa-solid fa-bullhorn" style="color: #1b5e20;"></i> Organizer:</strong><br> ${ev.organizer || 'Teacher'}</div>
            </div>
            <p style="font-size: 1rem; color: #334155; line-height: 1.6;">${ev.description || 'No additional description provided.'}</p>
            ${noticeHtml}
            ${cancelBtnHtml}
        </div>
    `;

    modal.classList.add('active'); 
}

// --- CANCEL MAKE-UP CLASS LOGIC ---
async function cancelMakeupClass(title, date) {
    if (!confirm("Are you sure you want to cancel this Make-Up Class? It will be permanently removed from the system and the room will be freed.")) {
        return;
    }

    try {
        const formData = new FormData();
        formData.append('title', title);
        formData.append('date', date);

        const response = await fetch('../api/cancel_makeup_class.php', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();

        if (data.success) {
            showToast(data.message, "success");
            
            // Close the modal
            document.getElementById('studentEventModal').classList.remove('active');
            
            // Refresh the Feed and Calendar instantly!
            if (typeof loadCampusEvents === 'function') loadCampusEvents();
            if (typeof loadMySchedule === 'function') loadMySchedule();
        } else {
            showToast(data.message, "error");
        }
    } catch (error) {
        showToast("Network Error: Could not connect to server.", "error");
    }
}

// Draw the Visual Calendar Grid!
function renderEventsCalendar() {
    const calContainer = document.getElementById('eventsCalendarContainer');
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    
    let html = `
        <div style="background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); overflow: hidden;">
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 20px; border-bottom: 1px solid #e2e8f0; background: #f8fafc;">
                <h2 style="font-size: 20px; font-weight: 700; color: #1e293b; margin: 0;">${monthNames[currentCalMonth]} ${currentCalYear}</h2>
                <div style="display: flex; gap: 8px;">
                    <button class="btn-submit" id="prevMonthUserBtn" style="width: auto; padding: 8px 12px; background: white; color: #1e293b; border: 1px solid #cbd5e1;"><i class="fa-solid fa-chevron-left"></i></button>
                    <button class="btn-submit" id="todayUserBtn" style="width: auto; padding: 8px 15px; background: var(--primary-green); color: white;">Today</button>
                    <button class="btn-submit" id="nextMonthUserBtn" style="width: auto; padding: 8px 12px; background: white; color: #1e293b; border: 1px solid #cbd5e1;"><i class="fa-solid fa-chevron-right"></i></button>
                </div>
            </div>
            <div style="display: grid; grid-template-columns: repeat(7, 1fr); background: #1b5e20; color: white;">
    `;

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    days.forEach(day => {
        html += `<div style="padding: 12px 10px; text-align: center; font-weight: 600; font-size: 13px;">${day}</div>`;
    });
    
    html += `</div><div style="display: grid; grid-template-columns: repeat(7, 1fr); grid-auto-rows: minmax(120px, auto); background: #e2e8f0; gap: 1px;">`;

    const firstDay = new Date(currentCalYear, currentCalMonth, 1).getDay();
    const daysInMonth = new Date(currentCalYear, currentCalMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentCalYear, currentCalMonth, 0).getDate();

    // Fill previous month blanks
    for (let i = 0; i < firstDay; i++) {
        html += `<div style="background: #f8fafc; padding: 10px; color: #cbd5e1; font-size: 14px;">${daysInPrevMonth - firstDay + i + 1}</div>`;
    }

    // Fill current month days
    for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${currentCalYear}-${String(currentCalMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const dayEvents = globalCampusEvents.filter(e => e.startDate === dateStr);
        
        let eventsHtml = '';
        dayEvents.forEach(e => {
            let dotColor = '#64748b';
            const typeLower = e.type.toLowerCase();
            if (typeLower.includes('academic')) dotColor = '#3b82f6';
            if (typeLower.includes('sport')) dotColor = '#f59e0b';
            if (typeLower.includes('social')) dotColor = '#ec4899';

            eventsHtml += `
                <div title="${e.title}" style="margin-top: 4px; font-size: 11px; padding: 4px 6px; background: white; border-left: 3px solid ${dotColor}; border-radius: 3px; box-shadow: 0 1px 2px rgba(0,0,0,0.1); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: left;">
                    <strong>${e.title}</strong>
                </div>
            `;
        });

        const isToday = new Date().getDate() === i && new Date().getMonth() === currentCalMonth && new Date().getFullYear() === currentCalYear;
        const circleStyle = isToday ? `background: var(--primary-red); color: white; border-radius: 50%; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; font-weight: 700; box-shadow: 0 2px 4px rgba(0,0,0,0.2);` : `color: #334155; font-weight: 600;`;

        html += `
            <div style="background: white; padding: 10px; display: flex; flex-direction: column;">
                <div style="font-size: 14px; margin-bottom: 8px; ${isToday ? 'display:flex; justify-content:center;' : 'text-align:right;'}"><span style="${circleStyle}">${i}</span></div>
                <div style="flex: 1; display: flex; flex-direction: column; gap: 3px; overflow-y: auto;">
                    ${eventsHtml}
                </div>
            </div>
        `;
    }

    // Fill next month blanks
    const totalCells = firstDay + daysInMonth;
    const remainingCells = (Math.ceil(totalCells / 7) * 7) - totalCells;
    for (let i = 1; i <= remainingCells; i++) {
        html += `<div style="background: #f8fafc; padding: 10px; color: #cbd5e1; font-size: 14px;">${i}</div>`;
    }

    html += `</div></div>`;
    calContainer.innerHTML = html;

    // Attach Calendar Navigation Logic
    document.getElementById("prevMonthUserBtn")?.addEventListener("click", () => {
        currentCalMonth--; if(currentCalMonth < 0) { currentCalMonth = 11; currentCalYear--; } renderEventsCalendar();
    });
    document.getElementById("nextMonthUserBtn")?.addEventListener("click", () => {
        currentCalMonth++; if(currentCalMonth > 11) { currentCalMonth = 0; currentCalYear++; } renderEventsCalendar();
    });
    document.getElementById("todayUserBtn")?.addEventListener("click", () => {
        currentCalMonth = new Date().getMonth(); currentCalYear = new Date().getFullYear(); renderEventsCalendar();
    });
}

// --- SMART MAKE-UP CLASS LOGIC ---
// --- SMART MAKE-UP CLASS LOGIC ---
let activeRescheduleTarget = ""; // Store the class name globally so the submit button can grab it!

async function openRescheduleModal(courseCode, courseTitle, sectionName) {
    const modal = document.getElementById('rescheduleModal');
    if (!modal) return;

    // 1. Set the Target Class
    activeRescheduleTarget = `${courseCode} (${sectionName})`;
    document.getElementById('rescheduleClassTarget').innerText = `${courseCode}: ${courseTitle} (${sectionName})`;

    // 2. Fetch Live Rooms from the Database for the Dropdown!

    const roomSelect = document.getElementById('makeupRoom');
    // Upgraded to <= 3 just in case, and forces the fetch!
    if (roomSelect && roomSelect.options.length <= 3) {
        try {
            const roomRes = await fetch('../api/getRooms.php');
            const roomData = await roomRes.json();
            
            // Checks multiple data structures just in case your API format varies
            const roomArray = roomData.data || roomData.rooms || roomData; 
            
            if (roomArray && roomArray.length > 0) {
                roomSelect.innerHTML = '<option value="">Select a Room...</option>';
                roomArray.forEach(r => {
                    // Safely grab the room name from your specific database table structure
                    const rName = r.room_name || r.name || r.room || 'Unknown Room'; 
                    roomSelect.innerHTML += `<option value="${rName}">${rName}</option>`;
                });
            } else {
                roomSelect.innerHTML = '<option value="">No rooms found in database</option>';
            }
        } catch (e) {
            console.error("Failed to load rooms", e);
            roomSelect.innerHTML = '<option value="">Database connection error</option>';
        }
    }

    // 3. Generate the Smart Auto-Announcement Text!
    const textBox = document.getElementById('makeupAnnouncement');
    textBox.value = `ATTENTION ${sectionName}:\n\nPlease be advised that our regular class for ${courseCode} (${courseTitle}) will be temporarily rescheduled. \n\nPlease check your updated Calendar/Feed for the new date and room assignment. Attendance is strictly required.\n\nThank you.`;

    // 4. Modal Triggers
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
    });
    modal.classList.add('active');
}

// THE SUBMIT FUNCTION
async function submitMakeupClass() {
    const btn = document.querySelector('#rescheduleModal .btn-submit');
    const date = document.getElementById('makeupDate').value;
    const room = document.getElementById('makeupRoom').value;
    const startTime = document.getElementById('makeupStartTime').value;
    const endTime = document.getElementById('makeupEndTime').value;
    const announcement = document.getElementById('makeupAnnouncement').value;

    if (!date || !room || !startTime || !endTime) {
        showToast("Please select a Date, Room, and Time.", "error");
        return;
    }

    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Checking Conflicts...';
    btn.disabled = true;

    try {
        const formData = new FormData();
        formData.append('date', date);
        formData.append('room', room);
        formData.append('start_time', startTime);
        formData.append('end_time', endTime);
        formData.append('target_class', activeRescheduleTarget);
        formData.append('announcement', announcement);

        const response = await fetch('../api/request_makeup_class.php', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();

        if (data.success) {
            showToast(data.message, "success");
            document.getElementById('rescheduleModal').classList.remove('active');
            document.getElementById('rescheduleForm').reset();
            
            // Reload the events feed in the background so the teacher sees it immediately!
            if (typeof loadCampusEvents === 'function') loadCampusEvents();
        } else {
            // CONFLICT DETECTED!
            showToast(data.message, "error");
        }
    } catch (error) {
        showToast("Network Error: Could not connect to server.", "error");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}
// --- LOAD ACCOUNT SETTINGS DATA ---
async function loadAccountSettings() {
    try {
        const response = await fetch('../check_session.php');
        const data = await response.json();

        if (data.logged_in && data.profile) {
            // 1. Determine Name and ID safely
            let fullName = 'User';
            if (data.profile.first_name && data.profile.last_name) {
                fullName = data.profile.first_name + ' ' + data.profile.last_name;
            } else if (data.profile.full_name) {
                fullName = data.profile.full_name;
            } else if (data.profile.name) {
                fullName = data.profile.name;
            }

            const idNum = data.role === 'teacher' ? (data.profile.teacher_id || data.account_id) : (data.profile.student_id || data.account_id);

            // 2. Populate the Official Record (Read-Only)
            const setFullName = document.getElementById('set-fullName');
            const setIdNum = document.getElementById('set-idNum');
            const setRole = document.getElementById('set-role');
            const setDept = document.getElementById('set-department');
            
            if (setFullName) setFullName.innerText = fullName;
            if (setIdNum) setIdNum.innerText = idNum;
            if (setRole) setRole.innerText = data.role;
            
            if (setDept) {
                let deptText = "N/A";
                if (data.role === 'student') deptText = data.profile.course_year || data.profile.section || "N/A";
                if (data.role === 'teacher') deptText = data.profile.department || "N/A";
                setDept.innerText = deptText;
            }

            // 3. Populate Contact Info (Editable)
            const setEmail = document.getElementById('set-email');
            const setPhone = document.getElementById('set-phone');
            
            if (setEmail) setEmail.value = data.profile.email || '';
            // Checks multiple possible DB column names for phone number
            if (setPhone) setPhone.value = data.profile.contact_number || data.profile.phone || '';
        }
    } catch (error) {
        console.error("Failed to load settings data:", error);
    }
}
// --- PASSWORD VISIBILITY TOGGLE ---
function togglePasswordVisibility(inputId, iconElement) {
    const passwordInput = document.getElementById(inputId);
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        iconElement.classList.remove('fa-eye');
        iconElement.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        iconElement.classList.remove('fa-eye-slash');
        iconElement.classList.add('fa-eye');
    }
}
// --- SUBMIT PASSWORD CHANGE ---
async function changePassword() {
    const current = document.getElementById('set-currentPass').value;
    const newPass = document.getElementById('set-newPass').value;
    const confirm = document.getElementById('set-confirmPass').value;

    if (newPass !== confirm) {
        showToast("New passwords do not match!", "error");
        return;
    }

    try {
        const formData = new FormData();
        formData.append('current_pass', current);
        formData.append('new_pass', newPass);

        const response = await fetch('../api/change_password.php', {
            method: 'POST',
            body: formData
        });
        const result = await response.json();

        if (result.success) {
            showToast(result.message, "success");
            document.getElementById('passwordSettingsForm').reset();
        } else {
            showToast(result.message, "error");
        }
    } catch (e) {
        showToast("Network error occurred.", "error");
    }
}

// ==========================================
// PROFILE PICTURE UPLOAD (SETTINGS TAB)
// ==========================================
window.uploadProfilePicture = function(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        const btn = input.previousElementSibling;
        const originalText = btn.innerHTML;
        
        // 1. Show immediate preview on BOTH the settings tab and the sidebar
        const reader = new FileReader();
        reader.onload = function(e) {
            const sidebarImg = document.getElementById('userProfileImg');
            const settingsImg = document.getElementById('settingsProfilePreview');
            if (sidebarImg) sidebarImg.src = e.target.result;
            if (settingsImg) settingsImg.src = e.target.result;
        }
        reader.readAsDataURL(file);

        // 2. UI Loading State
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploading...';
        btn.disabled = true;

        // 3. Upload to Server
        const formData = new FormData();
        formData.append('profile_image', file);

        fetch('../api/upload_profile_pic.php', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            btn.innerHTML = originalText;
            btn.disabled = false;

            if (data.success) {
                // Lock in the final image from the server
                const finalPath = '../assets/profiles/' + data.new_image;
                const sidebarImg = document.getElementById('userProfileImg');
                const settingsImg = document.getElementById('settingsProfilePreview');
                
                if (sidebarImg) sidebarImg.src = finalPath;
                if (settingsImg) settingsImg.src = finalPath;
                
                alert('Profile picture successfully updated!');
            } else {
                alert('Upload Failed: ' + data.message);
                location.reload(); 
            }
        })
        .catch(error => {
            btn.innerHTML = originalText;
            btn.disabled = false;
            alert('A network error occurred while uploading.');
        });
    }
};

// ==========================================
// FETCH AND SET PROFILE PICTURE ON LOAD
// ==========================================
function loadUserProfilePicture() {
    fetch('../api/getUserDetails.php') 
    .then(res => res.json())
    .then(data => {
        // Only override if they actually uploaded a custom picture!
        if (data.success && data.profile_picture && data.profile_picture !== 'default.png') {
            const finalPath = '../assets/profiles/' + data.profile_picture;
            const sidebarImg = document.getElementById('userProfileImg');
            const settingsImg = document.getElementById('settingsProfilePreview');
            
            if (sidebarImg) sidebarImg.src = finalPath;
            if (settingsImg) settingsImg.src = finalPath;
        }
    })
    .catch(err => console.error("Could not load profile picture.", err));
}

// Trigger it automatically when the page loads
document.addEventListener('DOMContentLoaded', loadUserProfilePicture);
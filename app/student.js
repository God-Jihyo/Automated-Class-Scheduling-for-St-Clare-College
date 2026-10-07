// app/student.js

document.addEventListener('DOMContentLoaded', () => {
    initializeStudentPortal();
    
});

async function initializeStudentPortal() {
    try {
        // 1. Verify Session & Identity from the database
        const response = await fetch('../check_session.php');
        const sessionData = await response.json();

        // 2. Validate Role specifically for Students
        if (!sessionData.logged_in || sessionData.role !== 'student') {
            console.warn("Unauthorized access. Redirecting to login.");
            window.location.href = '../login.html';
            return;
        }

        const studentProfile = sessionData.profile;
        console.log("Logged in as Student:", studentProfile.full_name);

        // 3. Inject data into the Sidebar
        const sidebarName = document.getElementById('sidebarName');
        const sidebarId = document.getElementById('sidebarId');
        
        if (sidebarName) sidebarName.textContent = studentProfile.full_name;
        if (sidebarId) sidebarId.textContent = `ID: ${studentProfile.student_id}`;

        // 4. Inject data into the Top Header (Greeting & Date)
        const headerName = document.getElementById('headerName');
        const dateDisplay = document.getElementById('currentDateDisplay');

        if (headerName) {
            // Get just the first name for a friendlier greeting
            const firstName = studentProfile.full_name.split(' ')[0];
            headerName.textContent = firstName;
        }

        if (dateDisplay) {
            // Format today's date nicely (e.g., "Monday, April 17, 2026")
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            dateDisplay.textContent = new Date().toLocaleDateString('en-US', options);
        }

        // 5. Store crucial IDs globally for future API calls
        window.currentStudentId = studentProfile.student_id;
        window.currentSectionId = parseInt(studentProfile.section, 10); 

        // Add this line to trigger the stats update!
        loadDashboardStats();
        loadTeachersForDropdown();
        loadConsultationHistory();

    } catch (error) {
        console.error("Error initializing student portal:", error);
    }

    async function loadDashboardStats() {
        try {
            // We use the global section ID we saved during login
            const response = await fetch(`../api/get_dashboard_stats.php?section_id=${window.currentSectionId}`);
            const data = await response.json();

            if (data.success) {
                const totalSubjectsEl = document.getElementById('totalSubjectsCount');
                const classesTodayEl = document.getElementById('classesTodayCount');

                // Inject the real numbers into the HTML
               if (totalSubjectsEl) totalSubjectsEl.textContent = data.total_subjects;
                if (classesTodayEl) classesTodayEl.textContent = data.classes_today;
                
                // FIXED: Populate the 3rd card with actual database numbers!
                const consultationCountEl = document.getElementById('consultationCount');
                if (consultationCountEl) {
                    consultationCountEl.textContent = data.active_consultations; 
                    
                    // NEW: Make the card clickable! Jump to the Hub when clicked.
                    const card = consultationCountEl.closest('.stat-card');
                    if (card) {
                        card.style.cursor = 'pointer';
                        card.addEventListener('click', () => {
                            // Find the navigation button for Consultations and click it
                            const hubLink = Array.from(document.querySelectorAll('.nav-menu a')).find(el => el.innerText.includes('Consultation'));
                            if(hubLink) hubLink.click();
                            else {
                                // Fallback: Manually switch views
                                document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active-view'));
                                document.getElementById('consultationsView').classList.add('active-view');
                                document.querySelectorAll('.nav-menu li').forEach(li => li.classList.remove('active'));
                                document.querySelectorAll('.nav-menu li')[4].classList.add('active'); // Assumes Consultations is the 5th menu item
                            }
                        });
                    }
                }
            } else {
                console.error("Failed to load student stats:", data.message);
            }
        } catch (error) {
            console.error("Error fetching dashboard stats:", error);
        }
    }
}

async function loadTeachersForDropdown() {
    try {
        const response = await fetch('../api/get_teachers_list.php');
        const data = await response.json();

        if (data.success) {
            const datalistEl = document.getElementById('teacherDatalist');
            if (!datalistEl) return;

            // Clear any old data
            datalistEl.innerHTML = ''; 

            // Inject the actual teachers
            data.teachers.forEach(teacher => {
                const option = document.createElement('option');
                // The value is what shows up in the search box (The Teacher's Name)
                option.value = teacher.full_name;
                // We secretly store the ID inside a data attribute so we can send it to the database later!
                option.setAttribute('data-id', teacher.teacher_id);
                datalistEl.appendChild(option);
            });
        }
    } catch (error) {
        console.error("Error loading teachers datalist:", error);
    }
}
// Add to the bottom of app/student.js

document.addEventListener('DOMContentLoaded', () => {
    // Wait for everything to load, then setup the form
    const form = document.getElementById('consultationForm');
    if (form) {
        form.addEventListener('submit', handleConsultationSubmit);
    }
    setCurrentDateTime();
});

async function handleConsultationSubmit(e) {
    e.preventDefault(); // Stop the page from reloading!

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';
    submitBtn.disabled = true;

    try {
        // 1. Get all the inputs
        const searchInput = document.getElementById('teacherSearchInput').value;
        const date = document.getElementById('consultDate').value;
        const time = document.getElementById('consultTime').value;
        const reason = document.getElementById('consultReason').value;
        const link = document.getElementById('consultLink').value;
        const fileInput = document.getElementById('consultFile');

        // 2. Find the Teacher ID from the datalist based on the typed name
        let targetTeacherId = null;
        const datalistOptions = document.querySelectorAll('#teacherDatalist option');
        
        datalistOptions.forEach(option => {
            if (option.value === searchInput) {
                targetTeacherId = option.getAttribute('data-id');
            }
        });

        // 3. Validation
        if (!targetTeacherId) {
            alert("Please select a valid teacher from the dropdown list.");
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;
            return;
        }

        // 4. Pack the data into FormData (required for file uploads)
        const formData = new FormData();
        formData.append('student_id', window.currentStudentId); // We saved this during login!
        formData.append('teacher_id', targetTeacherId);
        formData.append('date', date);
        formData.append('time', time);
        formData.append('reason', reason);
        formData.append('link', link);
        
        if (fileInput.files.length > 0) {
            formData.append('file', fileInput.files[0]);
        }

        // 5. Send to our new API
        const response = await fetch('../api/submit_consultation.php', {
            method: 'POST',
            body: formData // Note: Do NOT set Content-Type header when sending FormData!
        });

        const data = await response.json();

        if (data.success) {
            alert("Success: " + data.message);
            e.target.reset(); 
           setCurrentDateTime(); 
            loadConsultationHistory();
        } else {
            alert("Error: " + data.message);
        }

    } catch (error) {
        console.error("Submission error:", error);
        alert("A network error occurred. Please try again.");
    } finally {
        // Reset the button state
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
    }
}
// Add this to the very bottom of app/student.js
function setCurrentDateTime() {
    const dateInput = document.getElementById('consultDate');
    const timeInput = document.getElementById('consultTime');

    if (dateInput && timeInput) {
        const now = new Date();

        // Format Date to YYYY-MM-DD (Required by HTML5 date inputs)
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        dateInput.value = `${year}-${month}-${day}`;

        // Format Time to HH:MM (Required by HTML5 time inputs)
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        timeInput.value = `${hours}:${minutes}`;
    }
}
// Add to the bottom of app/student.js

async function loadConsultationHistory() {
    try {
        const response = await fetch(`../api/get_student_consultations.php?student_id=${window.currentStudentId}`);
        const data = await response.json();

        const tbody = document.getElementById('consultationTableBody');
        if (!tbody) return;

        if (data.success) {
            tbody.innerHTML = ''; // Clear the "Loading..." text

            // If they have no requests, show a friendly message
            if (data.consultations.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #64748b;">No consultation requests found.</td></tr>';
                return;
            }

            // Loop through each request and create a table row
            data.consultations.forEach(c => {
                // 1. Format the Date nicely (e.g., Oct 15, 2026)
                const dateObj = new Date(c.consultation_date);
                const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                
                // 2. Format Time to 12-hour AM/PM
                const [hourString, minute] = c.consultation_time.split(':');
                const hour = +hourString % 24;
                const formattedTime = (hour % 12 || 12) + ':' + minute + (hour < 12 ? ' AM' : ' PM');

                // 3. Determine the Status Badge Color
                let badgeClass = 'status-pending'; // Default yellow
                if (c.status === 'approved') badgeClass = 'status-approved'; // Green
                if (c.status === 'declined') badgeClass = 'status-declined'; // Red

                // 4. Build the Attachment Icons (if they attached anything)
                let attachHTML = '<span style="color: #cbd5e1;">None</span>';
                let links = [];
                if (c.attachment_file) {
                    links.push(`<a href="../${c.attachment_file}" target="_blank" style="color: var(--primary-red); margin-right: 10px;" title="View File"><i class="fa-solid fa-file-arrow-down"></i> File</a>`);
                }
                if (c.attachment_link) {
                    links.push(`<a href="${c.attachment_link}" target="_blank" style="color: var(--primary-red);" title="View Link"><i class="fa-solid fa-link"></i> Link</a>`);
                }
                if (links.length > 0) attachHTML = links.join('');

                // 5. Inject the Row!
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${formattedDate}</strong><br><small style="color:#64748b;">${formattedTime}</small></td>
                    <td>${c.teacher_name}</td>
                    <td><span class="status-badge ${badgeClass}">${c.status}</span></td>
                    <td>${attachHTML}</td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (error) {
        console.error("Error loading consultation history:", error);
        document.getElementById('consultationTableBody').innerHTML = '<tr><td colspan="4" style="text-align: center; color: red;">Failed to load data.</td></tr>';
    }
}
// ====== CLASS UPDATE MODAL (STUDENT PORTAL) ======

// 1. Dynamically create and inject the modal into the page
document.addEventListener('DOMContentLoaded', () => {
    const modalHtml = `
        <div id="studentUpdateModalOverlay" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.6); z-index: 9999; align-items: center; justify-content: center; backdrop-filter: blur(3px);">
            <div style="background: white; width: 90%; max-width: 400px; border-radius: 16px; padding: 0; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); animation: popIn 0.3s ease-out;">
                
                <div style="background: #3b82f6; padding: 20px; text-align: center; position: relative;">
                    <div style="width: 50px; height: 50px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        <i class="fa-solid fa-map-location-dot" style="font-size: 22px; color: #3b82f6;"></i>
                    </div>
                    <h3 style="margin: 0; color: white; font-size: 18px; font-weight: 600; letter-spacing: 0.5px;">Room Assignment Update</h3>
                </div>
                
                <div id="studentUpdateBody" style="padding: 24px; text-align: center; color: #334155; font-size: 15px; line-height: 1.6;">
                    Loading details...
                </div>
                
                <div style="padding: 16px 24px 24px; text-align: center;">
                    <button onclick="document.getElementById('studentUpdateModalOverlay').style.display = 'none'" style="width: 100%; padding: 12px; background: #f1f5f9; color: #475569; border: none; border-radius: 8px; font-weight: 600; font-size: 15px; cursor: pointer; transition: 0.2s;" onmouseover="this.style.backgroundColor='#e2e8f0'; this.style.color='#0f172a';" onmouseout="this.style.backgroundColor='#f1f5f9'; this.style.color='#475569';">
                        Got it, thanks!
                    </button>
                </div>
                
                <style>
                    @keyframes popIn {
                        0% { transform: scale(0.9); opacity: 0; }
                        100% { transform: scale(1); opacity: 1; }
                    }
                </style>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
});

// 2. The function triggered by the notification click
window.openStudentUpdateModal = function(encodedMessage) {
    const modal = document.getElementById('studentUpdateModalOverlay');
    const bodyBox = document.getElementById('studentUpdateBody');
    
    if (modal && bodyBox) {
        // Decode the message safely
        const message = decodeURIComponent(encodedMessage);
        
        // Format the text beautifully
        let formattedText = message.replace('CLASS UPDATE:', '<strong style="display:block; font-size: 16px; color: #0f172a; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Important Schedule Change</strong>');
        
        // Highlight exactly where they need to go
        if (formattedText.includes('ONLINE')) {
            formattedText = formattedText.replace('ONLINE.', '<br><br><strong style="color: #10b981; font-size: 18px; padding: 6px 12px; background: #d1fae5; border-radius: 6px; display: inline-block;">ONLINE CLASS <i class="fa-solid fa-laptop"></i></strong>');
        } else {
            formattedText = formattedText.replace('relocated to ', 'relocated to <br><br><strong style="color: #3b82f6; font-size: 20px; padding: 6px 12px; background: #eff6ff; border-radius: 6px; display: inline-block;"><i class="fa-solid fa-door-open"></i> ');
            formattedText = formattedText.replace('. Please proceed', '</strong><br><br>Please proceed');
        }

        bodyBox.innerHTML = formattedText;
        modal.style.display = 'flex';
        
        // Aggressively close the notification dropdown so it doesn't block the screen
        const dropdowns = document.querySelectorAll('.notif-dropdown, .show, .active');
        dropdowns.forEach(dd => {
            dd.classList.remove('show');
            dd.classList.remove('active');
        });
    }
};
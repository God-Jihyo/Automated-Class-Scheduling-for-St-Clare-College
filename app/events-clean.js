// thesis/app/events-clean.js
document.addEventListener("DOMContentLoaded", () => {
    const typeConfig = {
        academic: {label: "Academic", cls: "type-academic", icon: "book-open"},
        exam: {label: "Examination", cls: "type-exam", icon: "alert-circle"},
        sports: {label: "Sports", cls: "type-sports", icon: "trophy"},
        cultural: {label: "Cultural", cls: "type-cultural", icon: "party-popper"},
        meeting: {label: "Meeting", cls: "type-meeting", icon: "users"},
        holiday: {label: "Holiday", cls: "type-holiday", icon: "star"}
    };

    let cleanEvents = [];
    let currentMonth = new Date().getMonth();
    let currentYear = new Date().getFullYear();
    let currentSlide = 0;
    let slideshowInterval;

    // 1. Smart Reload
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('eventAdded') === 'true') {
        setTimeout(() => {
            document.querySelectorAll(".nav-menu a").forEach(i => i.classList.remove("active"));
            const calNav = document.querySelector(".nav-menu a[data-page='calendar']");
            if(calNav) calNav.classList.add("active");
            
            document.querySelectorAll(".page").forEach(p => p.classList.add("hidden"));
            const calPage = document.getElementById("calendar");
            if(calPage) calPage.classList.remove("hidden");
            
            document.getElementById("eventListViewBtn")?.click();
            window.history.replaceState({}, document.title, window.location.pathname);
        }, 100);
    }

    // 2. Fetch Data
    function loadCleanEvents() {
        fetch('../api/get_new_events.php')
            .then(res => res.json())
            .then(data => {
                cleanEvents = Array.isArray(data) ? data : (data.events || data.data || []);
                updateEventStats();
                drawCleanList();
                renderCalendar();
                drawFeaturedSlideshow(); 
            })
            .catch(err => {
                console.error("Error loading events:", err);
                cleanEvents = []; 
                updateEventStats();
                drawCleanList();
                renderCalendar();
            });
    }

    const formatDate = d => new Date(d + "T00:00:00").toLocaleDateString("en-US", {month:"short", day:"numeric", year:"numeric"});
    const formatTime = t => {
        if (!t || t === "00:00:00") return "";
        const [h, m] = t.split(":").map(Number);
        return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
    };

    // 3. Stats
    function updateEventStats() {
        const statsRow = document.getElementById("statsRow");
        if (!statsRow) return;

        if (document.getElementById("lr_total_events")) {
            updateStatNumbers();
            return;
        }

        statsRow.innerHTML = `
            <div class="stat-card"><div class="stat-info"><span class="stat-label">TOTAL EVENTS</span><h2 id="lr_total_events">0</h2></div><div class="stat-icon icon-blue"><i data-lucide="calendar-check"></i></div></div>
            <div class="stat-card"><div class="stat-info"><span class="stat-label">UPCOMING</span><h2 id="lr_upcoming_events">0</h2></div><div class="stat-icon icon-orange"><i data-lucide="clock"></i></div></div>
            <div class="stat-card"><div class="stat-info"><span class="stat-label">ROOMS RESERVED</span><h2 id="lr_rooms_reserved">0</h2></div><div class="stat-icon icon-green"><i data-lucide="door-open"></i></div></div>
            <div class="stat-card"><div class="stat-info"><span class="stat-label">THIS MONTH</span><h2 id="lr_this_month_events">0</h2></div><div class="stat-icon" style="color: #8b5cf6; background: #ede9fe; width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center;"><i data-lucide="calendar-days"></i></div></div>
        `;
        if (typeof lucide !== 'undefined') lucide.createIcons();
        updateStatNumbers();
    }

    function updateStatNumbers() {
        const totalEvents = cleanEvents.length;
        const upcomingEvents = cleanEvents.filter(e => e.status === 'upcoming').length;
        const roomsReserved = cleanEvents.filter(e => e.location && e.location.includes('Room')).length;
        const now = new Date(); const thisMonth = now.getMonth(); const thisYear = now.getFullYear();
        const eventsThisMonth = cleanEvents.filter(e => { if (!e.startDate) return false; const eventDate = new Date(e.startDate); return eventDate.getMonth() === thisMonth && eventDate.getFullYear() === thisYear; }).length;

        if (document.getElementById("lr_total_events")) document.getElementById("lr_total_events").textContent = totalEvents;
        if (document.getElementById("lr_upcoming_events")) document.getElementById("lr_upcoming_events").textContent = upcomingEvents;
        if (document.getElementById("lr_rooms_reserved")) document.getElementById("lr_rooms_reserved").textContent = roomsReserved;
        if (document.getElementById("lr_this_month_events")) document.getElementById("lr_this_month_events").textContent = eventsThisMonth;
    }

    // 4. NEW 3-CARD CAROUSEL SLIDESHOW
    function drawFeaturedSlideshow() {
        const statsRow = document.getElementById("statsRow");
        if (!statsRow) return;
        if (document.getElementById("featuredSlideshow")) return; 

        // Now allows ALL upcoming events, even without posters!
        const featured = cleanEvents.filter(e => e.status === 'upcoming');
        if (featured.length === 0) return; 

        const slideshowHtml = `
            <div id="featuredSlideshow" style="grid-column: 1 / -1; margin-bottom: 25px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding: 0 5px;">
                    <h3 style="margin: 0; font-size: 18px; color: #1e293b; font-weight: 700;"><i data-lucide="star" style="width:18px;height:18px;display:inline-block;margin-right:5px;color:var(--primary)"></i> Upcoming Featured Events</h3>
                    <div style="display: flex; gap: 8px;">
                        <button class="slide-nav prev btn btn-ghost" style="padding: 6px; border-radius: 50%;"><i data-lucide="chevron-left" style="width:20px;height:20px"></i></button>
                        <button class="slide-nav next btn btn-ghost" style="padding: 6px; border-radius: 50%;"><i data-lucide="chevron-right" style="width:20px;height:20px"></i></button>
                    </div>
                </div>
                
                <div style="overflow: hidden; padding: 5px;">
                    <div class="slideshow-wrapper" style="display: flex; gap: 20px; transition: transform 0.4s ease-in-out;">
                        ${featured.map(e => {
                            // Render standard cards that take exactly 33.333% width minus the gap
                          const poster = e.posterUrl ? (e.posterUrl.includes('http') ? e.posterUrl : '../' + e.posterUrl) : null;
                            const safeType = typeConfig[e.type] ? typeConfig[e.type] : typeConfig['academic'];
                            return `
                            <div class="slide card" style="flex: 0 0 calc(33.333% - 13.5px); margin: 0; overflow:hidden; cursor:pointer; border-radius:12px; background: white; box-shadow: 0 4px 6px rgba(0,0,0,0.05);" onclick="openCleanDetail('${e.id}')">
                                <div style="height:140px; background:#f1f5f9; position:relative; overflow:hidden;">
                                    ${poster ? `<img src="${poster}" style="width:100%; height:100%; object-fit:cover;">` : `<div style="height:100%; display:flex; align-items:center; justify-content:center; color:#cbd5e1;"><i data-lucide="image" style="width:40px;height:40px;"></i></div>`}
                                    <span class="badge ${safeType.cls}" style="position:absolute; top:10px; left:10px; font-size:11px;">${safeType.label}</span>
                                </div>
                                <div style="padding:15px;">
                                    <h3 style="font-size:16px; font-weight:700; margin-bottom:8px; margin-top:0; color:#1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${e.title}</h3>
                                    <div style="display:flex; flex-direction:column; gap:4px; font-size:12px; color:#64748b;">
                                        <span style="display:flex; align-items:center; gap:6px;"><i data-lucide="calendar" style="width:12px;height:12px;"></i> ${formatDate(e.startDate)}</span>
                                        <span style="display:flex; align-items:center; gap:6px;"><i data-lucide="clock" style="width:12px;height:12px;"></i> ${formatTime(e.startTime)}</span>
                                    </div>
                                </div>
                            </div>
                            `;
                        }).join("")}
                    </div>
                </div>
            </div>
        `;
        statsRow.insertAdjacentHTML('beforebegin', slideshowHtml);
        if (typeof lucide !== 'undefined') lucide.createIcons();
        initSlideshowControls(featured.length);
    }

    function initSlideshowControls(totalSlides) {
        const wrapper = document.querySelector("#featuredSlideshow .slideshow-wrapper");
        const prevBtn = document.querySelector("#featuredSlideshow .slide-nav.prev");
        const nextBtn = document.querySelector("#featuredSlideshow .slide-nav.next");

        const visibleItems = 3; // We display 3 cards at once
        
        if (totalSlides <= visibleItems) {
            // If 3 or less items, no need to slide, hide arrows
            if(prevBtn) prevBtn.style.display = 'none';
            if(nextBtn) nextBtn.style.display = 'none';
            return;
        }

        // The maximum number of slides to shift to the left
        let maxSlide = totalSlides - visibleItems;

        function gotoSlide(n) {
            currentSlide = n;
            if (currentSlide > maxSlide) currentSlide = 0; // Wrap to beginning
            if (currentSlide < 0) currentSlide = maxSlide; // Wrap to end
            
            // Math to shift left by exactly 1 card width + 1 gap (33.333% + gap compensation)
            wrapper.style.transform = `translateX(calc(-${currentSlide} * (33.333% + 6.67px)))`;
        }

        function nextSlide() { gotoSlide(currentSlide + 1); }
        function prevSlide() { gotoSlide(currentSlide - 1); }
        
        function startAuto() {
            clearInterval(slideshowInterval);
            slideshowInterval = setInterval(nextSlide, 5000); 
        }

        nextBtn?.addEventListener("click", () => { nextSlide(); startAuto(); });
        prevBtn?.addEventListener("click", () => { prevSlide(); startAuto(); });
        
        startAuto(); 
    }

    // 5. Draw Main List
    function drawCleanList() {
        const listView = document.getElementById("listView");
        if (!listView) return;

        if (cleanEvents.length === 0) {
            listView.innerHTML = `<div class="card" style="padding:48px;text-align:center"><p>No events found</p></div>`;
            return;
        }

        listView.innerHTML = `<div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap:20px; padding:10px;">` + 
            cleanEvents.map(e => {
                const poster = e.posterUrl ? (e.posterUrl.includes('http') ? e.posterUrl : '../' + e.posterUrl) : null;
                const safeType = typeConfig[e.type] ? typeConfig[e.type] : typeConfig['academic'];
                return `
                <div class="card" onclick="openCleanDetail('${e.id}')" style="overflow:hidden; cursor:pointer; border-radius:12px; background: white; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                    <div style="height:180px; background:#f1f5f9; position:relative; overflow:hidden;">
                        ${poster ? `<img src="${poster}" style="width:100%; height:100%; object-fit:cover;">` : `<div style="height:100%; display:flex; align-items:center; justify-content:center; color:#cbd5e1;"><i data-lucide="image" style="width:48px;height:48px;"></i></div>`}
                        <span class="badge ${safeType.cls}" style="position:absolute; top:12px; left:12px;">${safeType.label}</span>
                    </div>
                    <div style="padding:20px;">
                        <h3 style="font-size:18px; font-weight:700; margin-bottom:8px; margin-top:0; color:#1e293b;">${e.title}</h3>
                        <div style="display:flex; flex-direction:column; gap:6px; font-size:13px; color:#64748b;">
                            <span style="display:flex; align-items:center; gap:6px;"><i data-lucide="calendar" style="width:14px;height:14px;"></i> ${formatDate(e.startDate)}</span>
                            <span style="display:flex; align-items:center; gap:6px;"><i data-lucide="clock" style="width:14px;height:14px;"></i> ${formatTime(e.startTime)} - ${formatTime(e.endTime)}</span>
                            <span style="display:flex; align-items:center; gap:6px;"><i data-lucide="map-pin" style="width:14px;height:14px;"></i> ${e.location}</span>
                        </div>
                    </div>
                </div>`;
            }).join("") + `</div>`;
            
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    // 6. Draw Calendar
    function renderCalendar() {
        const calView = document.getElementById("calendarView");
        if (!calView) return;

        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        
        let html = `
            <div style="background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); overflow: hidden; margin-top: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 20px; border-bottom: 1px solid #e2e8f0;">
                    <h2 style="font-size: 20px; font-weight: 700; color: #1e293b; margin: 0;">${monthNames[currentMonth]} ${currentYear}</h2>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn btn-ghost" id="prevMonthBtn" style="padding: 8px;"><i data-lucide="chevron-left" style="width:20px;height:20px"></i></button>
                        <button class="btn btn-ghost" id="todayBtn" style="font-weight:600;">Today</button>
                        <button class="btn btn-ghost" id="nextMonthBtn" style="padding: 8px;"><i data-lucide="chevron-right" style="width:20px;height:20px"></i></button>
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: repeat(7, 1fr); background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
        `;

        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        days.forEach(day => {
            html += `<div style="padding: 12px 10px; text-align: center; font-weight: 600; color: #64748b; font-size: 13px;">${day}</div>`;
        });
        
        html += `</div><div style="display: grid; grid-template-columns: repeat(7, 1fr); grid-auto-rows: minmax(120px, auto); background: #e2e8f0; gap: 1px;">`;

        const firstDay = new Date(currentYear, currentMonth, 1).getDay();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

        for (let i = 0; i < firstDay; i++) {
            const dayNum = daysInPrevMonth - firstDay + i + 1;
            html += `<div style="background: #f8fafc; padding: 10px; color: #cbd5e1; font-size: 14px;">${dayNum}</div>`;
        }

        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const dayEvents = cleanEvents.filter(e => e.startDate === dateStr);
            
            let eventsHtml = '';
            dayEvents.forEach(e => {
                const safeType = typeConfig[e.type] ? typeConfig[e.type] : typeConfig['academic'];
                const timeStr = e.startTime && e.startTime !== "00:00:00" ? e.startTime.substring(0,5) + " " : "";
                eventsHtml += `
                    <div onclick="openCleanDetail('${e.id}')" class="badge ${safeType.cls}" style="display: block; margin-top: 4px; font-size: 11px; padding: 4px 6px; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: left; transition: transform 0.1s;" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                        <strong>${timeStr}</strong>${e.title}
                    </div>
                `;
            });

            const isToday = new Date().getDate() === i && new Date().getMonth() === currentMonth && new Date().getFullYear() === currentYear;
            const circleStyle = isToday ? `background: var(--primary); color: white; border-radius: 50%; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; font-weight: 700; box-shadow: 0 2px 4px rgba(0,0,0,0.1);` : `color: #334155; font-weight: 600;`;

            html += `
                <div style="background: white; padding: 10px; display: flex; flex-direction: column;">
                    <div style="font-size: 14px; margin-bottom: 8px; ${isToday ? 'display:flex; justify-content:center;' : 'text-align:right;'}"><span style="${circleStyle}">${i}</span></div>
                    <div style="flex: 1; display: flex; flex-direction: column; gap: 3px; overflow-y: auto;">
                        ${eventsHtml}
                    </div>
                </div>
            `;
        }

        const totalCells = firstDay + daysInMonth;
        const remainingCells = (Math.ceil(totalCells / 7) * 7) - totalCells;
        for (let i = 1; i <= remainingCells; i++) {
            html += `<div style="background: #f8fafc; padding: 10px; color: #cbd5e1; font-size: 14px;">${i}</div>`;
        }

        html += `</div></div>`;
        calView.innerHTML = html;

        document.getElementById("prevMonthBtn")?.addEventListener("click", () => {
            currentMonth--; if(currentMonth < 0) { currentMonth = 11; currentYear--; } renderCalendar();
        });
        document.getElementById("nextMonthBtn")?.addEventListener("click", () => {
            currentMonth++; if(currentMonth > 11) { currentMonth = 0; currentYear++; } renderCalendar();
        });
        document.getElementById("todayBtn")?.addEventListener("click", () => {
            currentMonth = new Date().getMonth(); currentYear = new Date().getFullYear(); renderCalendar();
        });
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    // 7. Detail Modal
    window.openCleanDetail = function(id) {
        const e = cleanEvents.find(x => String(x.id) === String(id));
        const modal = document.getElementById("detailModal");
        const content = document.getElementById("detailContent");
        if (!e || !modal || !content) return;

        const poster = e.posterUrl ? (e.posterUrl.includes('http') ? e.posterUrl : '../' + e.posterUrl) : null;
        const safeType = typeConfig[e.type] ? typeConfig[e.type] : typeConfig['academic'];

        content.innerHTML = `
            <div style="margin-bottom:20px">
                <span class="badge ${safeType.cls}">${safeType.label}</span>
                <h2 style="font-size:24px; font-weight:800; margin-top:10px">${e.title}</h2>
            </div>
            ${poster ? `<img src="${poster}" style="width:100%; border-radius:12px; margin-bottom:20px;">` : ''}
            <div style="background:#f8fafc; padding:15px; border-radius:12px; display:grid; grid-template-columns:1fr 1fr; gap:15px; margin-bottom:20px; font-size:14px">
                <div style="display:flex; align-items:center; gap:6px;"><strong><i data-lucide="calendar" style="width:14px;height:14px;"></i> Date:</strong> ${formatDate(e.startDate)}</div>
                <div style="display:flex; align-items:center; gap:6px;"><strong><i data-lucide="clock" style="width:14px;height:14px;"></i> Time:</strong> ${formatTime(e.startTime)}</div>
                <div style="display:flex; align-items:center; gap:6px;"><strong><i data-lucide="map-pin" style="width:14px;height:14px;"></i> Location:</strong> ${e.location}</div>
                <div style="display:flex; align-items:center; gap:6px;"><strong><i data-lucide="users" style="width:14px;height:14px;"></i> Type:</strong> ${safeType.label}</div>
            </div>
            <div style="line-height:1.6; margin-bottom:20px;">${e.description || "No description."}</div>
            ${e.announcement ? `<div style="background:#fff3cd; border-left:4px solid #f59e0b; padding:15px; border-radius:8px; color:#92400e; display:flex; flex-direction:column; gap:5px;"><strong style="display:flex; align-items:center; gap:5px;"><i data-lucide="megaphone" style="width:16px;height:16px;"></i> NOTICE:</strong> ${e.announcement}</div>` : ''}
            <div style="margin-top:25px; display:flex; justify-content:flex-end">
                <button class="btn" style="background:#f1f5f9; color:#475569; font-weight:600;" onclick="document.getElementById('detailModal').style.display='none';">Close</button>
            </div>
        `;
        modal.style.display = "flex";
        modal.classList.remove("hidden");
        if (typeof lucide !== 'undefined') lucide.createIcons();
    };

    // 8. Toggles & Buttons
    const listBtn = document.getElementById("eventListViewBtn");
    const calBtn = document.getElementById("eventCalViewBtn");
    const newEventBtn = document.getElementById("openNewEventBtn");
    const createModal = document.getElementById("createModal");
    
    if (newEventBtn && createModal) {
        newEventBtn.addEventListener("click", () => {
            createModal.classList.remove("hidden"); createModal.style.display = "flex";
        });
    }
    
    if(listBtn && calBtn) {
        listBtn.addEventListener("click", () => {
            listBtn.classList.add("active"); calBtn.classList.remove("active");
            document.getElementById("calendarView").classList.add("hidden");
            document.getElementById("listView").classList.remove("hidden");
        });
        calBtn.addEventListener("click", () => {
            calBtn.classList.add("active"); listBtn.classList.remove("active");
            document.getElementById("listView").classList.add("hidden");
            document.getElementById("calendarView").classList.remove("hidden");
            renderCalendar(); 
        });
    }

    // 9. Load Room Dropdown
    function loadRoomDropdown() {
        const roomSelect = document.getElementById("newRoom");
        if (!roomSelect) return;

        fetch('../api/getRooms.php')
            .then(res => res.json())
            .then(data => {
                roomSelect.innerHTML = '<option value="0">No Room (Campus Wide)</option>';
                const roomList = data.success ? data.data : (Array.isArray(data) ? data : []);
                roomList.forEach(room => {
                    const opt = document.createElement("option");
                    opt.value = room.id;
                    opt.textContent = `${room.name} — ${room.building || 'Campus'} (Cap: ${room.capacity || '?'})`;
                    roomSelect.appendChild(opt);
                });
            })
            .catch(err => console.error("Error loading rooms:", err));
    }

    // 10. Start Engine
    loadRoomDropdown();
    loadCleanEvents(); 
});

// --- BULLETPROOF FORM SUBMISSION INTERCEPTOR ---
document.addEventListener('submit', function(e) {
    // Check if the thing being submitted is our exact form
    if (e.target && e.target.id === 'createEventForm') {
        e.preventDefault(); // Stop the white screen!
        
        const form = e.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        
        // 1. Double check our required fields manually just in case HTML5 validation fails
        const title = form.querySelector('input[name="title"]').value.trim();
        const startDate = form.querySelector('input[name="startDate"]').value;
        if (!title || !startDate) {
            alert("Please make sure the Event Title and Start Date are filled out!");
            return;
        }

        // 2. Set button to loading state
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
        submitBtn.disabled = true;

        // 3. Package the text and the image file
        const formData = new FormData(form);

        // 4. Send to PHP
        fetch(form.action, {
            method: 'POST',
            body: formData
        })
        .then(async res => {
            const rawText = await res.text(); // Grab the raw response from PHP
            try {
                return JSON.parse(rawText); // Try to read it as JSON
            } catch (err) {
                // If PHP spat out a raw error, this catches it and shows it to you!
                throw new Error("PHP CRASH LOG:\n\n" + rawText); 
            }
        })
        .then(data => {
            // Reset button
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;

            if (data.status === 'success') {
                alert(data.message);
                document.getElementById('createModal').style.display = 'none'; // Close modal
                form.reset(); // Clear the form inputs
                
                // Clear the image preview
                const preview = document.getElementById('posterPreviewContainer');
                if (preview) {
                    preview.style.display = 'none';
                    document.getElementById('posterPreviewImage').src = '#';
                }
                
                // Refresh the calendar!
                if (typeof load_events_calendar === 'function') load_events_calendar();
            } else {
                alert("Database Error: " + data.message);
            }
        })
        .catch(error => {
            // Reset button on failure and show the EXACT PHP Error
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
            alert(error.message); // This will pop up with the real reason!
            console.error("Diagnostic error log:", error);
        });
    }
});


// Show live preview of the poster image when selected
document.addEventListener('DOMContentLoaded', function() {
    const posterInput = document.getElementById('newPosterFile');
    if(posterInput) {
        posterInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    document.getElementById('posterPreviewImage').src = event.target.result;
                    document.getElementById('posterPreviewContainer').classList.remove('hidden');
                    document.getElementById('posterPreviewContainer').style.display = 'block';
                }
                reader.readAsDataURL(file);
            }
        });
    }
});

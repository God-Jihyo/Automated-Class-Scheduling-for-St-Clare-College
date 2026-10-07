<?php
// thesis/api/autoSchedule.php (STRICT HIERARCHY UPDATE)
error_reporting(0);
ini_set('display_errors', 0);
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

header("Content-Type: application/json");
ob_start();

try {

    require_once '../config/db_connection.php';
    
    // --- 1. CRITICAL FAIL-SAFES ---
    $tc = $conn->query("SELECT COUNT(*) as c FROM teachers")->fetch_assoc()['c'];
    if ($tc == 0) throw new Exception("CRITICAL ERROR: You have no Teachers in the database!");
    
    $rc = $conn->query("SELECT COUNT(*) as c FROM rooms")->fetch_assoc()['c'];
    if ($rc == 0) throw new Exception("CRITICAL ERROR: You have no Rooms in the database!");
    
    $sc = $conn->query("SELECT COUNT(*) as c FROM time_slots")->fetch_assoc()['c'];
    if ($sc == 0) throw new Exception("CRITICAL ERROR: You have no Time Slots in the database!");

    $data = json_decode(file_get_contents("php://input"), true);
    $section_id = (int)($data['section_id'] ?? 0);

    if (!$section_id) throw new Exception("Invalid section ID provided.");

    $secStmt = $conn->prepare("SELECT * FROM sections WHERE section_id = ? LIMIT 1");
    $secStmt->bind_param("i", $section_id); $secStmt->execute();
    $secResult = $secStmt->get_result();

    if ($secResult->num_rows === 0) throw new Exception("Section not found in the database.");
    $sec = $secResult->fetch_assoc();

    $conn->query("DELETE FROM schedule WHERE section_id = $section_id");

    $course_id = $sec['course'] ?? null;
    $year = (int)($sec['year_level'] ?? 0);
    $default_online_days = ($year === 1 || $year === 3) ? "MWF" : "TTH";

    // --- CONTINUOUS CHAINING LOGIC ---
    $sec_name = strtoupper(trim($sec['section_name']));
    $sec_letter = '';
    if (preg_match('/[A-Z]$/', $sec_name, $m)) { $sec_letter = $m[0]; }
    elseif (preg_match('/[A-Z]/', $sec_name, $m)) { $sec_letter = $m[0]; }

    $leader_letter = null;
    if ($sec_letter === 'B') $leader_letter = 'A';
    if ($sec_letter === 'C') $leader_letter = 'B';
    if ($sec_letter === 'E') $leader_letter = 'D';
    if ($sec_letter === 'F') $leader_letter = 'E';

    $ideal_start_mwf = 0;
    $ideal_start_tth = 0;

    if ($leader_letter) {
        $lStmt = $conn->prepare("SELECT section_id FROM sections WHERE course = ? AND year_level = ? AND UPPER(section_name) LIKE ? LIMIT 1");
        $likeStr = "%" . $leader_letter . "%";
        $lStmt->bind_param("iis", $course_id, $year, $likeStr);
        $lStmt->execute();
        $lRes = $lStmt->get_result();
        if ($lRes->num_rows > 0) {
            $leader_id = $lRes->fetch_assoc()['section_id'];
            
            $qMwf = $conn->query("SELECT time_slot FROM schedule WHERE section_id = $leader_id AND day_of_week IN ('Monday','Wednesday','Friday')");
            while($r = $qMwf->fetch_assoc()){
                $end_str = explode('-', $r['time_slot'])[1];
                $ts = strtotime("1970-01-01 " . trim($end_str));
                if($ts > $ideal_start_mwf) $ideal_start_mwf = $ts;
            }
            
            $qTth = $conn->query("SELECT time_slot FROM schedule WHERE section_id = $leader_id AND day_of_week IN ('Tuesday','Thursday')");
            while($r = $qTth->fetch_assoc()){
                $end_str = explode('-', $r['time_slot'])[1];
                $ts = strtotime("1970-01-01 " . trim($end_str));
                if($ts > $ideal_start_tth) $ideal_start_tth = $ts;
            }
        }
    }

    // 2. GET SUBJECTS
    $subQ = $conn->prepare("SELECT ss.subject_id, s.* FROM section_subjects ss JOIN subjects s ON ss.subject_id = s.id WHERE ss.section_id = ?");
    $subQ->bind_param("i", $section_id); $subQ->execute();
    $subR = $subQ->get_result();

    $subjects = []; $subject_modes = []; $subject_codes = []; $subject_units = [];
    while ($r = $subR->fetch_assoc()) {
        $sid = (int)($r['subject_id'] ?? $r['id'] ?? 0);
        if($sid === 0) continue;
        $subjects[] = $sid;
        $subject_modes[$sid] = strtolower(trim($r['delivery_mode'] ?? 'ftf')); 
        $subject_codes[$sid] = $r['code'] ?? 'SUBJ';
        $subject_units[$sid] = (int)($r['units'] ?? 3); 
    }

    if (empty($subjects)) throw new Exception("No subjects have been assigned to this section yet.");

    // 3. GET TIMESLOTS
    $raw_ranges = [];
    $slot_res = $conn->query("SELECT DISTINCT start_time, end_time FROM time_slots");
    while ($row = $slot_res->fetch_assoc()) {
        $raw_ranges[] = trim($row['start_time']) . "-" . trim($row['end_time']);
    }
    $raw_ranges = array_values(array_unique($raw_ranges));
    usort($raw_ranges, function($a, $b) {
        return strtotime("1970-01-01 " . explode('-', $a)[0]) - strtotime("1970-01-01 " . explode('-', $b)[0]);
    });
    $all_ranges = $raw_ranges;

    function filterRangesByDuration($ranges, $target_duration) {
        $filtered = [];
        foreach ($ranges as $r) {
            $times = explode('-', $r);
            if (count($times) !== 2) continue;
            $start_ts = strtotime("1970-01-01 " . trim($times[0]));
            $end_ts = strtotime("1970-01-01 " . trim($times[1]));
            $dur = round(($end_ts - $start_ts) / 3600, 2);
            if (abs($dur - $target_duration) < 0.1) {
                $filtered[] = $r;
            }
        }
        return !empty($filtered) ? $filtered : $ranges; 
    }

    function filterRangesByStartTime($ranges, $ideal_start_ts) {
        if ($ideal_start_ts <= 0) return $ranges;
        $filtered = [];
        foreach ($ranges as $r) {
            $start_str = explode('-', $r)[0];
            $ts = strtotime("1970-01-01 " . trim($start_str));
            if ($ts >= $ideal_start_ts) $filtered[] = $r;
        }
        return $filtered;
    }

    // 4. GET ROOMS
    $roomsQuery = $conn->query("SELECT * FROM rooms");
    $rooms = [];
    while ($r = $roomsQuery->fetch_assoc()) { 
        $r_name = strtolower(trim($r['room_name'] ?? ''));
        if (strpos($r_name, 'online') !== false || strpos($r_name, 'tba') !== false) continue;
        $rooms[] = $r; 
    }
    $section_home_room_id = !empty($sec['default_room_id']) ? (int)$sec['default_room_id'] : null;

    // --- DYNAMIC AI HELPERS ---

    function checkOverlap($slot1, $slot2) {
        if (!$slot1 || !$slot2) return false;
        $p1 = explode('-', $slot1);
        $p2 = explode('-', $slot2);
        if (count($p1) !== 2 || count($p2) !== 2) return false;
        
        $s1 = strtotime("1970-01-01 " . trim($p1[0]));
        $e1 = strtotime("1970-01-01 " . trim($p1[1]));
        $s2 = strtotime("1970-01-01 " . trim($p2[0]));
        $e2 = strtotime("1970-01-01 " . trim($p2[1]));
        
        return ($s1 < $e2) && ($e1 > $s2);
    }

    // --- NEW: THE HIERARCHY GENERATOR ---
    function getTeacherHierarchy($conn, $subject_id) {
        // Find preferred teachers for this specific subject
        $preferred_raw = [];
        $stmt = $conn->prepare("SELECT teacher_id FROM teacher_subjects WHERE subject_id = ?");
        $stmt->bind_param("i", $subject_id); $stmt->execute();
        $res = $stmt->get_result();
        while ($row = $res->fetch_assoc()) {
            $preferred_raw[] = $row['teacher_id'];
        }

        // Get all teachers and their strict status
        $all_teachers = [];
        $q = $conn->query("SELECT * FROM teachers");
        while ($row = $q->fetch_assoc()) {
            $tid = $row['teacher_id'] ?? $row['id'];
            $all_teachers[$tid] = (int)($row['is_strict'] ?? 0);
        }

        $tier1 = []; // Strict & Preferred
        $tier2 = []; // Flexible & Preferred
        $tier3 = []; // Flexible General

        // Sort the preferred teachers into Tier 1 and Tier 2
        foreach ($preferred_raw as $tid) {
            if (isset($all_teachers[$tid]) && $all_teachers[$tid] === 1) {
                $tier1[] = $tid;
            } else {
                $tier2[] = $tid;
            }
        }

        // Drop everyone else into Tier 3 (Only if they are flexible)
        foreach ($all_teachers as $tid => $is_strict) {
            if ($is_strict === 0 && !in_array($tid, $tier1) && !in_array($tid, $tier2)) {
                $tier3[] = $tid;
            }
        }

        return [$tier1, $tier2, $tier3];
    }

    // --- UPDATED HIERARCHY TEACHER SELECTOR ---
    function getBestTeacherForSubjectDayGroup($conn, $subject_id, $range, $dows_array) {
        $tiers = getTeacherHierarchy($conn, $subject_id);
        
        // Check Tier 1 first, then Tier 2, then Tier 3
        foreach ($tiers as $candidates) {
            if (empty($candidates)) continue;
            
            $best_teacher = null; 
            $lowest_load = 99999;

            foreach (array_unique($candidates) as $tid) {
                $tid = (int)$tid; 
                $is_free = true;
                foreach ($dows_array as $d) {
                    $chk = $conn->query("SELECT time_slot FROM schedule WHERE teacher_id = $tid AND day_of_week = '$d'");
                    while ($row = $chk->fetch_assoc()) {
                        if (checkOverlap($range, $row['time_slot'])) { $is_free = false; break; }
                    }
                    if (!$is_free) break;
                }
                if (!$is_free) continue; 
                
                // If multiple teachers in the SAME TIER are free, compare their loads
                $q = $conn->query("SELECT COUNT(*) as cnt FROM schedule WHERE teacher_id = $tid");
                $current_load = $q ? $q->fetch_assoc()['cnt'] : 0;
                if ($current_load < $lowest_load) { $lowest_load = $current_load; $best_teacher = $tid; }
            }
            
            // If we found a free teacher in this tier, STOP SEARCHING! 
            // This prevents Tier 3 from stealing subjects from Tier 1.
            if ($best_teacher) return $best_teacher; 
        }
        return null;
    }

    function resolveRoomForSubjectDayGroup($conn, $sid, $range, $is_online, $subject_codes, &$home_room, $all_rooms, $dows_array) {
        if ($is_online) return null; 
        
        $code = strtoupper($subject_codes[$sid] ?? '');
        $isSpecial = (strpos($code, 'PE') !== false || strpos($code, 'PATHFIT') !== false || strpos($code, 'NSTP') !== false || strpos($code, 'CWTS') !== false);

        if ($isSpecial) {
            foreach ($all_rooms as $r) {
                $r_id = (int)($r['room_id'] ?? $r['id']);
                if (stripos($r['room_name'] ?? '', 'Gym') !== false) {
                    $is_free = true;
                    foreach ($dows_array as $d) {
                        $chk = $conn->query("SELECT time_slot FROM schedule WHERE room_id = $r_id AND day_of_week = '$d'");
                        while ($row = $chk->fetch_assoc()) {
                            if (checkOverlap($range, $row['time_slot'])) { $is_free = false; break; }
                        }
                        if (!$is_free) break;
                    }
                    if ($is_free) return $r_id;
                }
            }
            return false; 
        } else {
            if ($home_room) {
                $is_free = true;
                foreach ($dows_array as $d) {
                    $chk = $conn->query("SELECT time_slot FROM schedule WHERE room_id = $home_room AND day_of_week = '$d'");
                    while ($row = $chk->fetch_assoc()) {
                        if (checkOverlap($range, $row['time_slot'])) { $is_free = false; break; }
                    }
                    if (!$is_free) break;
                }
                if ($is_free) return $home_room;
            }
            foreach ($all_rooms as $r) {
                $r_id = (int)($r['room_id'] ?? $r['id']);
                if (stripos($r['room_name'] ?? '', 'Gym') !== false) continue;
                $is_free = true;
                foreach ($dows_array as $d) {
                    $chk = $conn->query("SELECT time_slot FROM schedule WHERE room_id = $r_id AND day_of_week = '$d'");
                    while ($row = $chk->fetch_assoc()) {
                        if (checkOverlap($range, $row['time_slot'])) { $is_free = false; break; }
                    }
                    if (!$is_free) break;
                }
                if ($is_free) { 
                    if (!$home_room) $home_room = $r_id;
                    return $r_id; 
                }
            }
            return false; 
        }
    }

    // --- SCHEDULING ENGINE ---
    function assign_subject($conn, $section_id, $sid, $ranges, $all_rooms, &$home_room, $is_online, $subject_codes, $subject_units, $start_hours, &$assigned_teacher_for_subj, $target_dows, $strict_alignment) {
        $needed_hours = (float)($subject_units[$sid] ?? 3);
        $assigned_hours = $start_hours;

        foreach ($ranges as $range) {
            if (round($assigned_hours, 2) >= round($needed_hours, 2)) break;

            $times = explode('-', $range);
            $start_ts = strtotime("1970-01-01 " . trim($times[0]));
            $end_ts = strtotime("1970-01-01 " . trim($times[1]));
            $slot_duration = ($end_ts - $start_ts) / 3600; 
            
            if ($slot_duration <= 0) continue;

            $free_dows = [];
            foreach ($target_dows as $dow) {
                $sec_free = true;
                $chk_sec = $conn->query("SELECT time_slot FROM schedule WHERE section_id=$section_id AND day_of_week='$dow'");
                while ($row = $chk_sec->fetch_assoc()) {
                    if (checkOverlap($range, $row['time_slot'])) { $sec_free = false; break; }
                }
                if ($sec_free) {
                    $free_dows[] = $dow;
                }
            }

            if (empty($free_dows)) continue;
            
            $slots_needed_this_round = ceil(round($needed_hours - $assigned_hours, 2) / $slot_duration);
            $slots_needed_this_round = min($slots_needed_this_round, count($target_dows));

            if ($strict_alignment && count($free_dows) < $slots_needed_this_round) continue; 

            $days_to_take = min($slots_needed_this_round, count($free_dows));
            $dows_to_check = array_slice($free_dows, 0, $days_to_take);

            $tid = null;
            if (isset($assigned_teacher_for_subj[$sid])) {
                $locked_tid = $assigned_teacher_for_subj[$sid];
                $t_free = true;
                foreach ($dows_to_check as $d) {
                    $chk = $conn->query("SELECT time_slot FROM schedule WHERE teacher_id = $locked_tid AND day_of_week = '$d'");
                    while ($row = $chk->fetch_assoc()) {
                        if (checkOverlap($range, $row['time_slot'])) { $t_free = false; break; }
                    }
                    if (!$t_free) break;
                }
                if ($t_free) $tid = $locked_tid;
            } else {
                $tid = getBestTeacherForSubjectDayGroup($conn, $sid, $range, $dows_to_check);
            }

            if (!$tid) continue; 

            $room_id = resolveRoomForSubjectDayGroup($conn, $sid, $range, $is_online, $subject_codes, $home_room, $all_rooms, $dows_to_check);
            if ($room_id === false && !$is_online) continue;

            // INSERTION
            foreach ($dows_to_check as $dow) {
                if (round($assigned_hours, 2) >= round($needed_hours, 2)) break;

                $r_val = ($room_id !== false && $room_id !== null) ? (int)$room_id : "NULL";
                $t_val = $tid ? (int)$tid : "NULL";

                $conn->query("INSERT INTO schedule (section_id, subject_id, teacher_id, room_id, day_of_week, time_slot) VALUES ($section_id, $sid, $t_val, $r_val, '$dow', '$range')");
                $assigned_hours += $slot_duration; 
            }

            if (!isset($assigned_teacher_for_subj[$sid])) {
                $assigned_teacher_for_subj[$sid] = $tid;
            }
        }
        return $assigned_hours - $start_hours;
    }

    // --- SATURDAY ENGINE (UPDATED HIERARCHY) ---
    function assign_saturday_schedule($conn, $section_id, &$pending_subjects, $ranges, $all_rooms, &$section_home_room_id, $subject_modes, $subject_codes, $subject_units, &$assigned_teacher_for_subj) {
        if (empty($pending_subjects) || empty($ranges)) return;
        usort($ranges, function($a, $b) { return strtotime("1970-01-01 " . explode('-', $a)[0]) - strtotime("1970-01-01 " . explode('-', $b)[0]); });

        foreach ($pending_subjects as $key => $sid) {
            $needed_hours = (float)($subject_units[$sid] ?? 3); 
            
            for ($i = 0; $i < count($ranges); $i++) {
                $window = [];
                $accumulated_hours = 0;
                $is_contiguous = true;
                
                for ($w = $i; $w < count($ranges); $w++) {
                    $window[] = $ranges[$w];
                    $times = explode('-', $ranges[$w]);
                    $start_ts = strtotime("1970-01-01 " . trim($times[0]));
                    $end_ts = strtotime("1970-01-01 " . trim($times[1]));
                    $slot_duration = ($end_ts - $start_ts) / 3600;
                    $accumulated_hours += $slot_duration;
                    
                    if (count($window) > 1) {
                        $prev_times = explode('-', $window[count($window)-2]);
                        $prev_end_ts = strtotime("1970-01-01 " . trim($prev_times[1]));
                        if ($start_ts != $prev_end_ts) { $is_contiguous = false; break; }
                    }
                    if (round($accumulated_hours, 2) >= round($needed_hours, 2)) break;
                }
                
                if (!$is_contiguous || round($accumulated_hours, 2) < round($needed_hours, 2)) continue;

                $tid = null;
                if (isset($assigned_teacher_for_subj[$sid])) {
                    $locked_tid = $assigned_teacher_for_subj[$sid];
                    $free = true;
                    foreach($window as $w_slot) {
                        $chk = $conn->query("SELECT time_slot FROM schedule WHERE teacher_id = $locked_tid AND day_of_week = 'Saturday'");
                        while ($row = $chk->fetch_assoc()) {
                            if (checkOverlap($w_slot, $row['time_slot'])) { $free = false; break; }
                        }
                        if (!$free) break;
                    }
                    if ($free) $tid = $locked_tid;
                } else {
                    // Check Saturday using strict Hierarchy
                    $tiers = getTeacherHierarchy($conn, $sid);
                    
                    foreach($tiers as $candidates) {
                        if (empty($candidates)) continue;
                        $lowest_load = 99999;
                        
                        foreach(array_unique($candidates) as $c_tid) {
                            $c_tid = (int)$c_tid;
                            $free = true;
                            foreach($window as $w_slot) {
                                $chk = $conn->query("SELECT time_slot FROM schedule WHERE teacher_id = $c_tid AND day_of_week = 'Saturday'");
                                while ($row = $chk->fetch_assoc()) {
                                    if (checkOverlap($w_slot, $row['time_slot'])) { $free = false; break; }
                                }
                                if (!$free) break;
                            }
                            if($free) {
                                $q = $conn->query("SELECT COUNT(*) as cnt FROM schedule WHERE teacher_id = $c_tid");
                                $cl = $q ? $q->fetch_assoc()['cnt'] : 0;
                                if ($cl < $lowest_load) { $lowest_load = $cl; $tid = $c_tid; }
                            }
                        }
                        if ($tid) break; // Found one! Stop searching lower tiers
                    }
                }
                
                if(!$tid) continue;

                $is_online = (strtolower($subject_modes[$sid] ?? '') === 'online');
                $room_id = null; $window_available = true;

                foreach ($window as $slot_range) {
                    $sec_free = true;
                    $chk_sec = $conn->query("SELECT time_slot FROM schedule WHERE section_id=$section_id AND day_of_week='Saturday'");
                    while ($row = $chk_sec->fetch_assoc()) {
                        if (checkOverlap($slot_range, $row['time_slot'])) { $sec_free = false; break; }
                    }
                    if (!$sec_free) { $window_available = false; break; }

                    if ($room_id === null) {
                        $room_id = resolveRoomForSubjectDayGroup($conn, $sid, $slot_range, $is_online, $subject_codes, $section_home_room_id, $all_rooms, ['Saturday']);
                        if ($room_id === false && !$is_online) { $window_available = false; break; }
                    } else if (!$is_online) {
                        $r_free = true;
                        $chk_r = $conn->query("SELECT time_slot FROM schedule WHERE room_id = $room_id AND day_of_week = 'Saturday'");
                        while ($row = $chk_r->fetch_assoc()) {
                            if (checkOverlap($slot_range, $row['time_slot'])) { $r_free = false; break; }
                        }
                        if (!$r_free) { $window_available = false; break; }
                    }
                }

                if ($window_available) {
                    foreach ($window as $slot_range) {
                        $r_val = ($room_id !== false && $room_id !== null) ? (int)$room_id : "NULL";
                        $t_val = $tid ? (int)$tid : "NULL";
                        $conn->query("INSERT INTO schedule (section_id, subject_id, teacher_id, room_id, day_of_week, time_slot) VALUES ($section_id, $sid, $t_val, $r_val, 'Saturday', '$slot_range')");
                    }
                    if (!isset($assigned_teacher_for_subj[$sid])) $assigned_teacher_for_subj[$sid] = $tid; 
                    unset($pending_subjects[$key]);
                    break; 
                }
            }
        }
    }

    // 4. RUN SCHEDULING
    $failed_subjects = [];
    $assigned_teacher_for_subj = []; 
    $saturday_subjects = [];

    foreach ($subjects as $sid) {
        $tStmt = @$conn->query("SELECT t.preferred_day FROM teacher_subjects ts JOIN teachers t ON ts.teacher_id = t.teacher_id WHERE ts.subject_id = $sid LIMIT 1");
        $pref_day = ($tStmt && $tStmt->num_rows > 0) ? ($tStmt->fetch_assoc()['preferred_day'] ?? 'Any') : 'Any';

        if ($pref_day === 'Saturday') {
            $saturday_subjects[] = $sid;
            continue;
        }

        $target_dows = [];
        $is_online = (strtolower($subject_modes[$sid] ?? '') === 'online');

        if ($pref_day === 'MWF') { $target_dows = ['Monday', 'Wednesday', 'Friday']; } 
        elseif ($pref_day === 'TTH') { $target_dows = ['Tuesday', 'Thursday']; } 
        else {
            if ($is_online) {
                if ($default_online_days === 'MWF') { $target_dows = ['Monday', 'Wednesday', 'Friday']; } 
                else { $target_dows = ['Tuesday', 'Thursday']; }
            } else { 
                if ($default_online_days === 'MWF') { $target_dows = ['Tuesday', 'Thursday']; } 
                else { $target_dows = ['Monday', 'Wednesday', 'Friday']; }
            }
        }

        $needed_hours = (float)($subject_units[$sid] ?? 3);
        
        $ideal_ts = ($target_dows === ['Monday', 'Wednesday', 'Friday']) ? $ideal_start_mwf : $ideal_start_tth;
        $chained_ranges = filterRangesByStartTime($all_ranges, $ideal_ts);
        if (empty($chained_ranges)) $chained_ranges = $all_ranges;

        $max_days = count($target_dows);
        $ideal_duration = ($max_days > 0) ? ($needed_hours / $max_days) : $needed_hours;
        $duration_ranges = filterRangesByDuration($chained_ranges, $ideal_duration);

        // Pass 1: Strict Horizontal Alignment on Primary Target
        $assigned_hours = assign_subject($conn, $section_id, $sid, $duration_ranges, $rooms, $section_home_room_id, $is_online, $subject_codes, $subject_units, 0, $assigned_teacher_for_subj, $target_dows, true);

        // Pass 2: Boundary Overflow Failsafe
        if (round($assigned_hours, 2) < round($needed_hours, 2)) {
            $conn->query("DELETE FROM schedule WHERE section_id = $section_id AND subject_id = $sid");
            $assigned_hours = 0;
            unset($assigned_teacher_for_subj[$sid]); 

            $alt_dows = ($target_dows === ['Monday', 'Wednesday', 'Friday']) ? ['Tuesday', 'Thursday'] : ['Monday', 'Wednesday', 'Friday'];
            $alt_ideal_ts = ($alt_dows === ['Monday', 'Wednesday', 'Friday']) ? $ideal_start_mwf : $ideal_start_tth;
            
            $alt_chained_ranges = filterRangesByStartTime($all_ranges, $alt_ideal_ts);
            if (empty($alt_chained_ranges)) $alt_chained_ranges = $all_ranges;

            $alt_max_days = count($alt_dows);
            $alt_ideal_duration = ($alt_max_days > 0) ? ($needed_hours / $alt_max_days) : $needed_hours;
            $alt_duration_ranges = filterRangesByDuration($alt_chained_ranges, $alt_ideal_duration);

            $assigned_hours += assign_subject($conn, $section_id, $sid, $alt_duration_ranges, $rooms, $section_home_room_id, $is_online, $subject_codes, $subject_units, 0, $assigned_teacher_for_subj, $alt_dows, true);
        }

        // Pass 3: Relaxed Horizontal Alignment
        if (round($assigned_hours, 2) < round($needed_hours, 2)) {
            $conn->query("DELETE FROM schedule WHERE section_id = $section_id AND subject_id = $sid");
            $assigned_hours = 0;
            unset($assigned_teacher_for_subj[$sid]); 

            $assigned_hours += assign_subject($conn, $section_id, $sid, $chained_ranges, $rooms, $section_home_room_id, $is_online, $subject_codes, $subject_units, 0, $assigned_teacher_for_subj, $target_dows, false);
        }

        // Pass 4: Saturday Emergency Overflow
        if (round($assigned_hours, 2) < round($needed_hours, 2)) {
            $conn->query("DELETE FROM schedule WHERE section_id = $section_id AND subject_id = $sid");
            $assigned_hours = 0;
            unset($assigned_teacher_for_subj[$sid]); 

            $temp_arr = [0 => $sid];
            assign_saturday_schedule($conn, $section_id, $temp_arr, $all_ranges, $rooms, $section_home_room_id, $subject_modes, $subject_codes, $subject_units, $assigned_teacher_for_subj);
            if (empty($temp_arr)) $assigned_hours = $needed_hours;
        }

        if (round($assigned_hours, 2) < round($needed_hours, 2)) {
            $failed_subjects[] = $sid;
        }
    }

    if (!empty($saturday_subjects)) {
        assign_saturday_schedule($conn, $section_id, $saturday_subjects, $all_ranges, $rooms, $section_home_room_id, $subject_modes, $subject_codes, $subject_units, $assigned_teacher_for_subj);
    }

    // 5. DIAGNOSTIC REPORT
    if (count($failed_subjects) > 0) {
        $errors = [];
        foreach ($failed_subjects as $sid) {
            $code = $subject_codes[$sid] ?? "Unknown";
            $isSpecial = (strpos(strtoupper($code), 'PE') !== false || strpos(strtoupper($code), 'NSTP') !== false);
            
            if ($isSpecial) {
                $errors[] = "<li style='margin-bottom: 6px;'><strong>$code:</strong> No 'Gym' available in the entire week.</li>";
            } else {
                $errors[] = "<li style='margin-bottom: 6px;'><strong>$code:</strong> The Monday-Friday schedule was completely full, and the emergency Saturday overflow also ran out of physical space or teachers.</li>";
            }
        }
        
        $errorList = "<ul style='margin-top: 10px; margin-bottom: 0; padding-left: 20px;'>" . implode("", $errors) . "</ul>";
        throw new Exception("The AI placed some subjects, but ran out of space for the following:" . $errorList);
    }
    
    $fChk = $conn->query("SELECT COUNT(*) as c FROM schedule WHERE section_id = $section_id");
    if($fChk && $fChk->fetch_assoc()['c'] == 0) {
        throw new Exception("Total Failure: 0 classes were assigned. Please ensure you have added Teachers and Rooms to the system.");
    }

    $conn->query("INSERT INTO activity_logs (user_role, action_type, description) VALUES ('Admin', 'Generated Schedule', 'Generated Strict Mode AI Schedule for Section $section_id')");

    $output = ob_get_clean(); 
    echo json_encode(["status" => "success", "message" => "Schedule generated perfectly! Subjects cleanly separated and Teacher Priorities strictly enforced."]);

} catch (\Throwable $e) {
    $output = ob_get_clean(); 
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
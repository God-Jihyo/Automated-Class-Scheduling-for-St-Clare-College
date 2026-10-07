<?php
// thesis/api/getExportFilters.php
error_reporting(0);
ini_set('display_errors', 0);
header('Content-Type: application/json');
ob_start();

try {
    require_once '../config/db_connection.php';
    $data = ['courses' => [], 'years' => [], 'sections' => [], 'teachers' => [], 'rooms' => []];

    function getCols($conn, $table) {
        $cols = [];
        $res = $conn->query("SHOW COLUMNS FROM `$table`");
        if ($res) { while($row = $res->fetch_assoc()) { $cols[] = $row['Field']; } }
        return $cols;
    }

    $secCols = getCols($conn, 'sections');
    $tables = [];
    $tRes = $conn->query("SHOW TABLES");
    if ($tRes) { while($t = $tRes->fetch_array()) { $tables[] = current($t); } }

    $hasCourses = in_array('courses', $tables);
    $courseMap = []; 

    // 1. FORCE GET 100% OF COURSES DIRECTLY FROM THE COURSES TABLE
    if ($hasCourses) {
        $cCols = getCols($conn, 'courses');
        $cIdCol = in_array('course_id', $cCols) ? 'course_id' : 'id';
        $cNameCol = in_array('course_code', $cCols) ? 'course_code' : (in_array('course_name', $cCols) ? 'course_name' : (in_array('name', $cCols) ? 'name' : 'id'));
        
        $q = $conn->query("SELECT `$cIdCol` AS id, `$cNameCol` AS name FROM courses");
        if ($q) {
            while ($r = $q->fetch_assoc()) {
                $cName = trim($r['name']);
                if ($cName) {
                    $data['courses'][] = $cName;
                    $courseMap[$r['id']] = $cName; // Save ID mapping for cascading
                }
            }
        }
    } else if (in_array('course', $secCols)) {
        // Fallback just in case
        $q = $conn->query("SELECT DISTINCT course FROM sections WHERE course IS NOT NULL AND course != ''");
        if ($q) { while ($r = $q->fetch_assoc()) { $data['courses'][] = $r['course']; } }
    }

    // 2. GET SECTIONS & YEARS AND SAFELY MAP THEM FOR CASCADING
    $sectCol = in_array('section_name', $secCols) ? 'section_name' : (in_array('name', $secCols) ? 'name' : (in_array('section', $secCols) ? 'section' : ''));
    $yearCol = in_array('year_level', $secCols) ? 'year_level' : (in_array('year', $secCols) ? 'year' : '');
    $secCourseCol = in_array('course_id', $secCols) ? 'course_id' : (in_array('course', $secCols) ? 'course' : '');

    if ($sectCol) {
        $selSec = "s.`$sectCol` AS sec_val";
        $selYear = $yearCol ? "s.`$yearCol` AS year_val" : "'' AS year_val";
        $selCourse = $secCourseCol ? "s.`$secCourseCol` AS sec_course_val" : "'' AS sec_course_val";

        $q = $conn->query("SELECT $selSec, $selYear, $selCourse FROM sections s WHERE s.`$sectCol` IS NOT NULL AND s.`$sectCol` != ''");
        
        $secList = [];
        if ($q) { 
            while ($r = $q->fetch_assoc()) { 
                if (!empty($r['year_val'])) $data['years'][] = $r['year_val'];
                
                // Swap the backend course_id number for the beautiful text name!
                $cVal = $r['sec_course_val'];
                if ($hasCourses && in_array('course_id', $secCols) && isset($courseMap[$cVal])) {
                    $cVal = $courseMap[$cVal];
                }

                $secList[] = ['name' => $r['sec_val'], 'course' => $cVal, 'year' => $r['year_val']];
            } 
        }
        
        $data['years'] = array_values(array_unique($data['years'])); sort($data['years']);
        $data['sections'] = array_map("unserialize", array_unique(array_map("serialize", $secList)));
        $data['sections'] = array_values($data['sections']);
    }

    $data['courses'] = array_values(array_unique($data['courses'])); sort($data['courses']);

    // 3. GET TEACHERS
    $tq = $conn->query("SELECT * FROM teachers");
    if ($tq) {
        while ($r = $tq->fetch_assoc()) {
            $name = !empty($r['full_name']) ? $r['full_name'] : trim(($r['first_name'] ?? '') . ' ' . ($r['last_name'] ?? ''));
            if ($name) $data['teachers'][] = $name;
        }
        $data['teachers'] = array_values(array_unique($data['teachers'])); sort($data['teachers']);
    }

    // 4. GET ROOMS
    $rq = $conn->query("SELECT * FROM rooms");
    if ($rq) {
        while ($r = $rq->fetch_assoc()) {
            $name = !empty($r['room_name']) ? $r['room_name'] : ($r['name'] ?? '');
            if ($name) $data['rooms'][] = $name;
        }
        $data['rooms'] = array_values(array_unique($data['rooms'])); sort($data['rooms']);
    }

    ob_end_clean();
    echo json_encode(['success' => true, 'filters' => $data]);

} catch (Throwable $e) {
    ob_end_clean();
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
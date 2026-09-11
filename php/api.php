<?php
/**
 * F.A.S.E - API Automatizada en PHP
 * Sirve datos estructurados desde SQL para cada sección
 */

declare(strict_types=1);

require_once __DIR__ . '/db.php';

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$action = $_GET['action'] ?? 'all';

if (isset($db_error)) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Error de conexión a la base de datos SQL: ' . $db_error
    ]);
    exit;
}

try {
    switch ($action) {
        case 'obras':
            $data = fetchAll($pdo, 'obras', 'title ASC');
            // Decodificar campos JSON para entrega limpia
            foreach ($data as &$row) {
                if (!empty($row['cast_team'])) $row['cast_team'] = json_decode($row['cast_team'], true);
                if (!empty($row['technical_rider'])) $row['technical_rider'] = json_decode($row['technical_rider'], true);
                if (!empty($row['economics'])) $row['economics'] = json_decode($row['economics'], true);
                if (!empty($row['dossier_highlights'])) $row['dossier_highlights'] = json_decode($row['dossier_highlights'], true);
            }
            echo json_encode(['success' => true, 'data' => $data]);
            break;

        case 'leads':
            $data = fetchAll($pdo, 'leads', 'name ASC');
            echo json_encode(['success' => true, 'data' => $data]);
            break;

        case 'rd_projects':
            $data = fetchAll($pdo, 'rd_projects', 'progress DESC');
            foreach ($data as &$row) {
                if (!empty($row['tags'])) $row['tags'] = json_decode($row['tags'], true);
            }
            echo json_encode(['success' => true, 'data' => $data]);
            break;

        case 'finances':
            $data = fetchAll($pdo, 'finances', 'date DESC');
            echo json_encode(['success' => true, 'data' => $data]);
            break;

        case 'inventory':
            $data = fetchAll($pdo, 'inventory', 'code ASC');
            echo json_encode(['success' => true, 'data' => $data]);
            break;

        case 'venues':
            $data = fetchAll($pdo, 'venues', 'name ASC');
            echo json_encode(['success' => true, 'data' => $data]);
            break;

        case 'events':
            $data = fetchAll($pdo, 'events', 'date ASC');
            echo json_encode(['success' => true, 'data' => $data]);
            break;

        case 'all':
        default:
            $allData = [
                'obras' => fetchAll($pdo, 'obras'),
                'leads' => fetchAll($pdo, 'leads'),
                'rdProjects' => fetchAll($pdo, 'rd_projects'),
                'venues' => fetchAll($pdo, 'venues'),
                'events' => fetchAll($pdo, 'events'),
                'inventory' => fetchAll($pdo, 'inventory'),
                'finances' => fetchAll($pdo, 'finances'),
                'processLogs' => fetchAll($pdo, 'process_logs'),
                'riders' => fetchAll($pdo, 'riders'),
                'team' => fetchAll($pdo, 'team')
            ];
            echo json_encode([
                'success' => true,
                'data' => $allData,
                'source' => 'Cloud SQL (PostgreSQL)',
                'timestamp' => date('c')
            ]);
            break;
    }
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

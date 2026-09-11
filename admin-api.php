<?php
/**
 * ATHA CRM PHP Admin — Backend API
 * Endpoint base: /api.php?a=<ruta>
 * Rutas:
 *   GET    a=meta/tables                → lista de tablas + relaciones FK
 *   GET    a=meta/table/{name}          → esquema de la tabla (columnas)
 *   GET    a=data/{table}?limit=&offset= → paginado de rows
 *   GET    a=data/{table}/{id}          → row individual
 *   POST   a=data/{table}               → crear row
 *   PUT    a=data/{table}/{id}          → actualizar row
 *   DELETE a=data/{table}/{id}          → borrar row
 *   GET    a=schema-map                 → mapa de conexión CRM ↔ SQL
 */
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$db = new PDO('sqlite:/tmp/atha_crm.db');
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

// Self-initialize DB if empty
if (filesize('/tmp/atha_crm.db') < 100) {
    $schema = file_get_contents(__DIR__ . '/schema_sqlite.sql');
    $db->exec($schema);
}
$aParam = $_GET['a'] ?? null;
$method = $_SERVER['REQUEST_METHOD'];

if ($aParam) {
    // Ruta limpia sin api.php base
    $path = '/' . ltrim($aParam, '/');
} else {
    // Fallback: parsear REQUEST_URI y quitar /api.php
    $rawPath = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $path = str_replace('/api.php', '', $rawPath);
}

$segments = array_values(array_filter(explode('/', trim($path, '/'))));

function send($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

// 1. Schema map (modular ecosistema CRM ↔ SQL)
$schemaMap = [
    'crm-atha' => [
        'modulo' => 'CRM-atha Frontend',
        'description' => 'SPA principal de gestión cultural — Vite + Express',
        'tables' => ['users', 'artist_profiles', 'projects', 'project_members', 'leads', 'venues', 'inventory_items', 'finance_records', 'grants', 'events', 'tasks'],
        'conexion' => 'Consumes /api/v1/crm/* (proxy a crm-v1-uc)'
    ],
    'fase-user-panel' => [
        'modulo' => 'Fase User Panel',
        'description' => 'Admin de credenciales y usuarios',
        'tables' => ['users'],
        'conexion' => 'CRUD directo sobre tabla users (role, public_profile, role_title)'
    ],
    'ATHA-Planner' => [
        'modulo' => 'ATHA Planner',
        'description' => 'Planificación I+D y roadmap',
        'tables' => ['project_plans', 'plan_checkpoints', 'daily_logs', 'automations'],
        'conexion' => 'Embebido dentro de crm-atha; consume projects + users'
    ],
    'ticketerapp' => [
        'modulo' => 'Ticketera',
        'description' => 'Gestión de tickets y ventas',
        'tables' => ['leads', 'venues', 'events'],
        'conexion' => 'Filtra leads tipo=sala|festival; events para calendario'
    ],
    'buscador-de-fondos' => [
        'modulo' => 'Buscador de Fondos',
        'description' => 'Búsqueda de convocatorias y fondos',
        'tables' => ['grants'],
        'conexion' => 'Filtra grants por status, priority, deadline'
    ]
];

// GET a=meta/tables
if ($method === 'GET' && count($segments) === 2 && $segments[0] === 'meta' && $segments[1] === 'tables') {
    $stmt = $db->query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
    $tables = [];
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $tname = $row['name'];
        $cols = $db->query("PRAGMA table_info($tname)")->fetchAll(PDO::FETCH_ASSOC);
        $fks = $db->query("PRAGMA foreign_key_list($tname)")->fetchAll(PDO::FETCH_ASSOC);
        $tables[] = [
            'name' => $tname,
            'columns' => array_column($cols, 'name'),
            'fks' => array_map(function($fk) {
                return [
                    'column' => $fk['from'],
                    'ref_table' => $fk['table'],
                    'ref_column' => $fk['to']
                ];
            }, $fks)
        ];
    }
    send(['tables' => $tables]);
}

// GET a=meta/table/{name}
if ($method === 'GET' && count($segments) === 3 && $segments[0] === 'meta' && $segments[1] === 'table') {
    $table = $segments[2];
    $cols = $db->query("PRAGMA table_info($table)")->fetchAll(PDO::FETCH_ASSOC);
    send([
        'table' => $table,
        'columns' => array_map(function($c) {
            return [
                'name' => $c['name'],
                'type' => $c['type'],
                'notnull' => (bool)$c['notnull'],
                'dflt_value' => $c['dflt_value'],
                'pk' => (int)$c['pk']
            ];
        }, $cols)
    ]);
}

// GET a=schema-map
if ($method === 'GET' && count($segments) === 1 && $segments[0] === 'schema-map') {
    send(['modules' => $schemaMap]);
}

// GET/POST a=data/{table}
if ($method === 'GET' && count($segments) === 2 && $segments[0] === 'data') {
    $table = $segments[1];
    $limit = (int)($_GET['limit'] ?? 50);
    $offset = (int)($_GET['offset'] ?? 0);
    try {
        $stmt = $db->prepare("SELECT * FROM $table LIMIT ? OFFSET ?");
        $stmt->execute([$limit, $offset]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $total = (int)$db->query("SELECT COUNT(*) FROM $table")->fetchColumn();
        send([
            'table' => $table,
            'count' => count($rows),
            'total' => $total,
            'offset' => $offset,
            'limit' => $limit,
            'items' => $rows
        ]);
    } catch (Exception $e) {
        send(['error' => $e->getMessage()], 400);
    }
}

// GET/PUT/DELETE a=data/{table}/{id}
if (in_array($method, ['GET', 'PUT', 'DELETE']) && count($segments) === 3 && $segments[0] === 'data') {
    $table = $segments[1];
    $id = $segments[2];

    $pkCol = $db->query("PRAGMA table_info($table)")->fetch(PDO::FETCH_ASSOC);
    while ($pkCol && !$pkCol['pk']) {
        $pkCol = $db->query("PRAGMA table_info($table)")->fetch(PDO::FETCH_ASSOC);
    }
    $pkName = $pkCol['name'] ?? 'id';

    if ($method === 'GET') {
        $stmt = $db->prepare("SELECT * FROM $table WHERE $pkName = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) send(['error' => 'Not found'], 404);
        send(['table' => $table, 'data' => $row]);
    }

    if ($method === 'DELETE') {
        $stmt = $db->prepare("DELETE FROM $table WHERE $pkName = ?");
        $stmt->execute([$id]);
        send(['deleted' => $id, 'table' => $table]);
    }

    // PUT
    $input = json_decode(file_get_contents('php://input'), true);
    $cols = [];
    $params = [];
    foreach ($input as $col => $val) {
        if ($col === $pkName) continue;
        $cols[] = "$col = ?";
        $params[] = $val;
    }
    $params[] = $id;
    $stmt = $db->prepare("UPDATE $table SET " . implode(', ', $cols) . " WHERE $pkName = ?");
    $stmt->execute($params);
    send(['updated' => $id, 'table' => $table]);
}

// POST a=data/{table}
if ($method === 'POST' && count($segments) === 2 && $segments[0] === 'data') {
    $table = $segments[1];
    $input = json_decode(file_get_contents('php://input'), true);
    $cols = array_keys($input);
    $placeholders = str_repeat('?,', count($cols) - 1) . '?';
    $stmt = $db->prepare("INSERT INTO $table (" . implode(',', $cols) . ") VALUES ($placeholders)");
    $stmt->execute(array_values($input));
    send(['created_id' => $db->lastInsertId(), 'table' => $table], 201);
}

send(['error' => 'Endpoint no encontrado'], 404);

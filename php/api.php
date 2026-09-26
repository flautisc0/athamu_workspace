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

        case 'auth_google':
            $input = json_decode(file_get_contents('php://input'), true);

            if (empty($input['id_token'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Falta id_token']);
                break;
            }

            $idToken = $input['id_token'];
            $parts = explode('.', $idToken);
            if (count($parts) !== 3) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Token inválido']);
                break;
            }

            $payload = json_decode(base64_decode(strtr($parts[1], '-_', '+/')), true);

            if (empty($payload['sub']) || empty($payload['email'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Token sin datos válidos']);
                break;
            }

            $userId  = $payload['sub'];
            $email   = $payload['email'];
            $name    = $input['name'] ?? ($payload['name'] ?? $email);
            $picture = $input['picture'] ?? ($payload['picture'] ?? '');

            $usersTableExists = false;
            try {
                $pdo->query("SELECT 1 FROM users LIMIT 1");
                $usersTableExists = true;
            } catch (PDOException $e) {
                $usersTableExists = false;
            }

            if ($usersTableExists) {
                $stmt = $pdo->prepare("SELECT id, name, email, role, role_title FROM users WHERE email = ?");
                $stmt->execute([$email]);
                $existingUser = $stmt->fetch(PDO::FETCH_ASSOC);

                if ($existingUser) {
                    echo json_encode([
                        'success' => true,
                        'data' => [
                            'id'         => $existingUser['id'],
                            'name'       => $existingUser['name'],
                            'email'      => $existingUser['email'],
                            'role'       => $existingUser['role'] ?? 'director',
                            'role_title' => $existingUser['role_title'] ?? '',
                        ],
                        'message' => 'Inicio de sesión exitoso'
                    ]);
                } else {
                    $insertStmt = $pdo->prepare("INSERT INTO users (id, name, email, role, role_title, provider, created_at) VALUES (?, ?, ?, 'director', 'Director General', 'google', NOW()) ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW() RETURNING id, name, email, role, role_title");
                    $insertStmt->execute([$userId, $name, $email]);
                    $newUser = $insertStmt->fetch(PDO::FETCH_ASSOC);

                    try {
                        $companyCheck = $pdo->prepare("SELECT 1 FROM company_members WHERE user_id = ?");
                        $companyCheck->execute([$userId]);
                        if (!$companyCheck->fetch()) {
                            $companyInsert = $pdo->prepare("INSERT INTO company_members (user_id, company_id, role_in_company, created_at) VALUES (?, 1, 'director', NOW()) ON CONFLICT (user_id) DO NOTHING");
                            $companyInsert->execute([$userId]);
                        }
                    } catch (PDOException $e) {
                        // company_members no disponible - continuar
                    }

                    echo json_encode([
                        'success' => true,
                        'data' => [
                            'id'         => $newUser['id'] ?? $userId,
                            'name'       => $newUser['name'] ?? $name,
                            'email'      => $newUser['email'] ?? $email,
                            'role'       => $newUser['role'] ?? 'director',
                            'role_title' => $newUser['role_title'] ?? 'Director General',
                        ],
                        'message' => 'Nuevo usuario registrado'
                    ]);
                }
            } else {
                echo json_encode([
                    'success' => true,
                    'data' => [
                        'id'         => $userId,
                        'name'       => $name,
                        'email'      => $email,
                        'role'       => 'director',
                        'role_title' => 'Director General',
                    ],
                    'message' => 'Modo local - tabla users no disponible'
                ]);
            }
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

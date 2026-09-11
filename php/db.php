<?php
/**
 * F.A.S.E - Plataforma de Gestión Escénica
 * Conexión a Base de Datos PostgreSQL (Cloud SQL)
 */

declare(strict_types=1);

header('Content-Type: text/html; charset=UTF-8');

$host = getenv('SQL_HOST') ?: '127.0.0.1';
$port = getenv('SQL_PORT') ?: '5432';
$dbname = getenv('SQL_DB_NAME') ?: 'defaultdb';
$user = getenv('SQL_USER') ?: 'postgres';
$password = getenv('SQL_PASSWORD') ?: '';

try {
    $dsn = "pgsql:host={$host};port={$port};dbname={$dbname}";
    $pdo = new PDO($dsn, $user, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
} catch (PDOException $e) {
    // Si la conexión directa falla o está en modo local, retornar error controlado
    $db_error = $e->getMessage();
}

/**
 * Función auxiliar para obtener datos de una tabla
 */
function fetchAll(PDO $pdo, string $table, string $orderBy = 'created_at DESC'): array {
    $allowed = ['obras', 'leads', 'rd_projects', 'venues', 'events', 'inventory', 'finances', 'process_logs', 'riders', 'team'];
    if (!in_array($table, $allowed, true)) {
        throw new InvalidArgumentException("Tabla no permitida: " . htmlspecialchars($table));
    }
    $stmt = $pdo->query("SELECT * FROM {$table} ORDER BY {$orderBy}");
    return $stmt->fetchAll();
}

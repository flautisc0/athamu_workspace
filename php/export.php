<?php
/**
 * F.A.S.E - Exportador de Archivos en PHP
 * Permite descargar datos en formato JSON, CSV o SQL Dump
 */

declare(strict_types=1);

require_once __DIR__ . '/db.php';

$format = $_GET['format'] ?? 'json';
$table = $_GET['table'] ?? 'all';

if (isset($db_error)) {
    die("Error de conexión a la base de datos: " . htmlspecialchars($db_error));
}

// Descargar tabla específica o completa
$allowedTables = ['obras', 'leads', 'rd_projects', 'venues', 'events', 'inventory', 'finances', 'process_logs', 'riders', 'team'];

if ($table !== 'all' && !in_array($table, $allowedTables, true)) {
    die("Tabla no válida especificada.");
}

$filenameBase = "fase_export_{$table}_" . date('Y-m-d_His');

if ($format === 'csv') {
    if ($table === 'all') {
        $table = 'obras'; // CSV requiere una tabla individual
    }
    header('Content-Type: text/csv; charset=UTF-8');
    header("Content-Disposition: attachment; filename=\"{$filenameBase}.csv\"");
    $output = fopen('php://output', 'w');
    fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF)); // BOM UTF-8

    $stmt = $pdo->query("SELECT * FROM {$table}");
    $first = true;
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        if ($first) {
            fputcsv($output, array_keys($row));
            $first = false;
        }
        fputcsv($output, array_values($row));
    }
    fclose($output);
    exit;
}

if ($format === 'sql') {
    header('Content-Type: application/sql; charset=UTF-8');
    header("Content-Disposition: attachment; filename=\"{$filenameBase}.sql\"");
    
    echo "-- ========================================================\n";
    echo "-- F.A.S.E - DUMP SQL EXPORTADO AUTOMÁTICAMENTE\n";
    echo "-- Fecha: " . date('c') . "\n";
    echo "-- Motor: PostgreSQL (Cloud SQL)\n";
    echo "-- ========================================================\n\n";

    $tablesToExport = ($table === 'all') ? $allowedTables : [$table];
    foreach ($tablesToExport as $tbl) {
        $stmt = $pdo->query("SELECT * FROM {$tbl}");
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        if (empty($rows)) continue;

        echo "-- Tabla: {$tbl}\n";
        foreach ($rows as $row) {
            $cols = implode(', ', array_map(fn($c) => "\"{$c}\"", array_keys($row)));
            $vals = implode(', ', array_map(function($v) use ($pdo) {
                if ($v === null) return 'NULL';
                return $pdo->quote((string)$v);
            }, array_values($row)));
            echo "INSERT INTO \"{$tbl}\" ({$cols}) VALUES ({$vals}) ON CONFLICT DO NOTHING;\n";
        }
        echo "\n";
    }
    exit;
}

// Por defecto: JSON
header('Content-Type: application/json; charset=UTF-8');
header("Content-Disposition: attachment; filename=\"{$filenameBase}.json\"");

if ($table === 'all') {
    $exportData = [];
    foreach ($allowedTables as $tbl) {
        $exportData[$tbl] = fetchAll($pdo, $tbl);
    }
    echo json_encode($exportData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
} else {
    $data = fetchAll($pdo, $table);
    echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}
exit;

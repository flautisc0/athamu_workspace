<?php
/**
 * F.A.S.E - Importador de Archivos en PHP
 * Permite subir archivos JSON o CSV para poblar y sincronizar tablas SQL
 */

declare(strict_types=1);

require_once __DIR__ . '/db.php';

$message = null;
$messageType = 'info';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['import_file'])) {
    $file = $_FILES['import_file'];
    $targetTable = $_POST['table'] ?? 'obras';

    if ($file['error'] !== UPLOAD_ERR_OK) {
        $message = "Error en la subida del archivo. Código de error: " . $file['error'];
        $messageType = 'error';
    } else {
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $content = file_get_contents($file['tmp_name']);

        try {
            if ($ext === 'json') {
                $decoded = json_decode($content, true);
                if (!is_array($decoded)) {
                    throw new Exception("El archivo JSON no tiene un formato válido.");
                }

                // Detectar si es un dump completo o una tabla individual
                $count = 0;
                if (isset($decoded['obras']) || isset($decoded['leads'])) {
                    // Export completo multi-tabla
                    foreach ($decoded as $tblName => $rows) {
                        if (is_array($rows)) {
                            foreach ($rows as $row) {
                                if (is_array($row) && isset($row['id'])) {
                                    $cols = array_keys($row);
                                    $colList = implode(', ', array_map(fn($c) => "\"{$c}\"", $cols));
                                    $placeholders = implode(', ', array_fill(0, count($cols), '?'));
                                    
                                    $stmt = $pdo->prepare("INSERT INTO \"{$tblName}\" ({$colList}) VALUES ({$placeholders}) ON CONFLICT DO NOTHING");
                                    $stmt->execute(array_values($row));
                                    $count++;
                                }
                            }
                        }
                    }
                    $message = "Importación completada: se procesaron {$count} registros en la base de datos.";
                    $messageType = 'success';
                } else {
                    // Array de registros para la tabla seleccionada
                    foreach ($decoded as $row) {
                        if (is_array($row) && isset($row['id'])) {
                            $cols = array_keys($row);
                            $colList = implode(', ', array_map(fn($c) => "\"{$c}\"", $cols));
                            $placeholders = implode(', ', array_fill(0, count($cols), '?'));
                            
                            $stmt = $pdo->prepare("INSERT INTO \"{$targetTable}\" ({$colList}) VALUES ({$placeholders}) ON CONFLICT DO NOTHING");
                            $stmt->execute(array_values($row));
                            $count++;
                        }
                    }
                    $message = "Importación de {$targetTable} completada: {$count} registros procesados.";
                    $messageType = 'success';
                }
            } elseif ($ext === 'csv') {
                $handle = fopen($file['tmp_name'], 'r');
                $headers = fgetcsv($handle);
                $count = 0;
                if ($headers) {
                    $colList = implode(', ', array_map(fn($c) => "\"{$c}\"", $headers));
                    $placeholders = implode(', ', array_fill(0, count($headers), '?'));
                    $stmt = $pdo->prepare("INSERT INTO \"{$targetTable}\" ({$colList}) VALUES ({$placeholders}) ON CONFLICT DO NOTHING");

                    while (($row = fgetcsv($handle)) !== false) {
                        if (count($row) === count($headers)) {
                            $stmt->execute($row);
                            $count++;
                        }
                    }
                }
                fclose($handle);
                $message = "Archivo CSV procesado con éxito para {$targetTable}: {$count} filas insertadas.";
                $messageType = 'success';
            } else {
                throw new Exception("Formato no soportado. Por favor sube un archivo .json o .csv.");
            }
        } catch (Throwable $e) {
            $message = "Error durante la importación: " . $e->getMessage();
            $messageType = 'error';
        }
    }
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Importar Archivos | F.A.S.E PHP</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-[#140D0C] text-stone-100 font-sans min-h-screen p-8">
    <div class="max-w-xl mx-auto bg-[#221513] border border-stone-800 p-6 rounded-xl">
        <h1 class="text-xl font-bold mb-2 text-[#E05A47]">Subir Archivos para Importación</h1>
        <p class="text-xs text-stone-400 mb-6">Sube archivos JSON o CSV para poblar y sincronizar la base de datos PostgreSQL de F.A.S.E.</p>

        <?php if ($message): ?>
            <div class="p-3 mb-6 rounded text-sm <?= $messageType === 'success' ? 'bg-emerald-950 border border-emerald-700 text-emerald-300' : 'bg-rose-950 border border-rose-700 text-rose-300' ?>">
                <?= htmlspecialchars($message) ?>
            </div>
        <?php endif; ?>

        <form method="POST" enctype="multipart/form-data" class="space-y-4">
            <div>
                <label class="block text-xs uppercase tracking-wider text-stone-300 mb-2">Tabla de Destino</label>
                <select name="table" class="w-full bg-[#140D0C] border border-stone-700 rounded px-3 py-2 text-sm text-stone-100">
                    <option value="obras">Catálogo de Obras (obras)</option>
                    <option value="leads">CRM Leads (leads)</option>
                    <option value="finances">Finanzas & Rendiciones (finances)</option>
                    <option value="inventory">Inventario Técnico (inventory)</option>
                    <option value="venues">Salas y Teatros (venues)</option>
                    <option value="events">Agenda de Eventos (events)</option>
                    <option value="rd_projects">Proyectos I+D (rd_projects)</option>
                </select>
            </div>

            <div>
                <label class="block text-xs uppercase tracking-wider text-stone-300 mb-2">Seleccionar Archivo (.json o .csv)</label>
                <input type="file" name="import_file" accept=".json,.csv" required class="w-full bg-[#140D0C] border border-stone-700 rounded px-3 py-2 text-sm text-stone-300 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-[#E05A47] file:text-white hover:file:bg-[#FF6B4A]">
            </div>

            <div class="pt-4 flex gap-3">
                <button type="submit" class="px-5 py-2.5 bg-[#E05A47] hover:bg-[#FF6B4A] text-white text-sm font-medium rounded-lg transition">Subir e Importar a SQL</button>
                <a href="index.php" class="px-5 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-300 text-sm font-medium rounded-lg transition">Volver al Panel</a>
            </div>
        </form>
    </div>
</body>
</html>

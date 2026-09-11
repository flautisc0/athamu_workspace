<?php
/**
 * F.A.S.E - Sección CRM de Salas y Festivales en PHP
 * Datos servidos directamente desde PostgreSQL (Cloud SQL)
 */

declare(strict_types=1);

require_once __DIR__ . '/db.php';

$leadsList = [];
if (!isset($db_error)) {
    try {
        $leadsList = fetchAll($pdo, 'leads', 'name ASC');
    } catch (PDOException $e) {
        $query_error = $e->getMessage();
    }
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>CRM Leads & Festivales | F.A.S.E PHP</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-[#140D0C] text-stone-100 font-sans min-h-screen">
    <header class="border-b border-stone-800 bg-[#1D1110] px-6 py-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
            <a href="index.php" class="font-bold text-xl tracking-tight text-[#E05A47]">F.A.S.E</a>
            <span class="text-stone-500">•</span>
            <span class="text-xs uppercase tracking-widest text-stone-300">CRM de Salas & Programadores (SQL)</span>
        </div>
        <div class="flex items-center gap-3">
            <a href="export.php?table=leads&format=csv" class="px-3 py-1.5 bg-stone-800 text-stone-200 text-xs rounded hover:bg-stone-700 transition">Descargar CSV</a>
            <a href="export.php?table=leads&format=json" class="px-3 py-1.5 bg-[#E05A47]/20 text-[#FF6B4A] border border-[#E05A47]/40 text-xs rounded hover:bg-[#E05A47]/30 transition">Descargar JSON</a>
            <a href="index.php" class="text-xs text-stone-400 hover:text-white transition">Volver</a>
        </div>
    </header>

    <main class="max-w-7xl mx-auto px-6 py-8">
        <div class="flex items-center justify-between mb-6">
            <h1 class="text-2xl font-bold text-stone-100">Cartera y Oportunidades CRM (<?= count($leadsList) ?>)</h1>
            <span class="text-xs text-stone-400 font-mono">Tabla SQL: `leads`</span>
        </div>

        <div class="overflow-x-auto bg-[#221513] border border-stone-800 rounded-xl">
            <table class="w-full text-left text-xs">
                <thead class="bg-[#1A0F0E] text-stone-400 uppercase tracking-wider border-b border-stone-800">
                    <tr>
                        <th class="px-4 py-3">Contacto</th>
                        <th class="px-4 py-3">Organización</th>
                        <th class="px-4 py-3">Tipo</th>
                        <th class="px-4 py-3">Estado</th>
                        <th class="px-4 py-3">Ciudad</th>
                        <th class="px-4 py-3">Valor Estimado</th>
                        <th class="px-4 py-3">Responsable</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-stone-800/60">
                    <?php foreach ($leadsList as $lead): ?>
                        <tr class="hover:bg-stone-800/20">
                            <td class="px-4 py-3 font-semibold text-stone-200"><?= htmlspecialchars($lead['name']) ?></td>
                            <td class="px-4 py-3 text-stone-300"><?= htmlspecialchars($lead['organization']) ?></td>
                            <td class="px-4 py-3 text-stone-400"><?= htmlspecialchars($lead['type']) ?></td>
                            <td class="px-4 py-3">
                                <span class="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-[#E05A47]/20 text-[#FF6B4A] border border-[#E05A47]/40">
                                    <?= htmlspecialchars($lead['status']) ?>
                                </span>
                            </td>
                            <td class="px-4 py-3 text-stone-400"><?= htmlspecialchars($lead['city']) ?></td>
                            <td class="px-4 py-3 font-mono text-emerald-400">$<?= number_format((float)$lead['estimated_value_clp'], 0, ',', '.') ?> CLP</td>
                            <td class="px-4 py-3 text-stone-400"><?= htmlspecialchars($lead['assigned_to']) ?></td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </main>
</body>
</html>

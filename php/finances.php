<?php
/**
 * F.A.S.E - Sección Finanzas & Rendiciones en PHP
 * Datos servidos directamente desde PostgreSQL (Cloud SQL)
 */

declare(strict_types=1);

require_once __DIR__ . '/db.php';

$financesList = [];
$totalIngresos = 0;
$totalGastos = 0;

if (!isset($db_error)) {
    try {
        $financesList = fetchAll($pdo, 'finances', 'date DESC');
        foreach ($financesList as $f) {
            $amt = (int)$f['amount_clp'];
            if ($f['type'] === 'Ingreso') {
                $totalIngresos += $amt;
            } else {
                $totalGastos += $amt;
            }
        }
    } catch (PDOException $e) {
        $query_error = $e->getMessage();
    }
}
$balance = $totalIngresos - $totalGastos;
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Finanzas & Rendiciones | F.A.S.E PHP</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-[#140D0C] text-stone-100 font-sans min-h-screen">
    <header class="border-b border-stone-800 bg-[#1D1110] px-6 py-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
            <a href="index.php" class="font-bold text-xl tracking-tight text-[#E05A47]">F.A.S.E</a>
            <span class="text-stone-500">•</span>
            <span class="text-xs uppercase tracking-widest text-stone-300">Finanzas & Rendición Escénica (SQL)</span>
        </div>
        <div class="flex items-center gap-3">
            <a href="export.php?table=finances&format=csv" class="px-3 py-1.5 bg-stone-800 text-stone-200 text-xs rounded hover:bg-stone-700 transition">Descargar CSV</a>
            <a href="export.php?table=finances&format=json" class="px-3 py-1.5 bg-[#E05A47]/20 text-[#FF6B4A] border border-[#E05A47]/40 text-xs rounded hover:bg-[#E05A47]/30 transition">Descargar JSON</a>
            <a href="index.php" class="text-xs text-stone-400 hover:text-white transition">Volver</a>
        </div>
    </header>

    <main class="max-w-7xl mx-auto px-6 py-8">
        <!-- Tarjetas Resumen -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div class="bg-[#221513] border border-stone-800 p-4 rounded-xl">
                <div class="text-xs text-stone-400 uppercase tracking-wider">Total Ingresos</div>
                <div class="text-xl font-bold text-emerald-400 mt-1 font-mono">$<?= number_format($totalIngresos, 0, ',', '.') ?> CLP</div>
            </div>
            <div class="bg-[#221513] border border-stone-800 p-4 rounded-xl">
                <div class="text-xs text-stone-400 uppercase tracking-wider">Total Gastos / Rendiciones</div>
                <div class="text-xl font-bold text-rose-400 mt-1 font-mono">$<?= number_format($totalGastos, 0, ',', '.') ?> CLP</div>
            </div>
            <div class="bg-[#221513] border border-stone-800 p-4 rounded-xl">
                <div class="text-xs text-stone-400 uppercase tracking-wider">Balance Operativo</div>
                <div class="text-xl font-bold <?= $balance >= 0 ? 'text-emerald-400' : 'text-rose-400' ?> mt-1 font-mono">$<?= number_format($balance, 0, ',', '.') ?> CLP</div>
            </div>
        </div>

        <div class="overflow-x-auto bg-[#221513] border border-stone-800 rounded-xl">
            <table class="w-full text-left text-xs">
                <thead class="bg-[#1A0F0E] text-stone-400 uppercase tracking-wider border-b border-stone-800">
                    <tr>
                        <th class="px-4 py-3">Fecha</th>
                        <th class="px-4 py-3">Proyecto</th>
                        <th class="px-4 py-3">Tipo</th>
                        <th class="px-4 py-3">Categoría</th>
                        <th class="px-4 py-3">Monto</th>
                        <th class="px-4 py-3">Estado</th>
                        <th class="px-4 py-3">Factura / Boleta</th>
                        <th class="px-4 py-3">Responsable</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-stone-800/60">
                    <?php foreach ($financesList as $item): ?>
                        <tr class="hover:bg-stone-800/20">
                            <td class="px-4 py-3 text-stone-400 font-mono"><?= htmlspecialchars($item['date']) ?></td>
                            <td class="px-4 py-3 font-semibold text-stone-200"><?= htmlspecialchars($item['project_name']) ?></td>
                            <td class="px-4 py-3">
                                <span class="px-2 py-0.5 rounded text-[10px] uppercase font-bold <?= $item['type'] === 'Ingreso' ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-rose-950 text-rose-300 border border-rose-700' ?>">
                                    <?= htmlspecialchars($item['type']) ?>
                                </span>
                            </td>
                            <td class="px-4 py-3 text-stone-300"><?= htmlspecialchars($item['category']) ?></td>
                            <td class="px-4 py-3 font-mono font-bold <?= $item['type'] === 'Ingreso' ? 'text-emerald-400' : 'text-rose-400' ?>">
                                <?= $item['type'] === 'Ingreso' ? '+' : '-' ?>$<?= number_format((float)$item['amount_clp'], 0, ',', '.') ?>
                            </td>
                            <td class="px-4 py-3 text-stone-400"><?= htmlspecialchars($item['status']) ?></td>
                            <td class="px-4 py-3 font-mono text-stone-400"><?= htmlspecialchars($item['invoice_ref']) ?></td>
                            <td class="px-4 py-3 text-stone-400"><?= htmlspecialchars($item['responsible']) ?></td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </main>
</body>
</html>

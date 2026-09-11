<?php
/**
 * F.A.S.E - Sección Catálogo de Obras en PHP
 * Datos servidos directamente desde PostgreSQL (Cloud SQL)
 */

declare(strict_types=1);

require_once __DIR__ . '/db.php';

$obrasList = [];
if (!isset($db_error)) {
    try {
        $obrasList = fetchAll($pdo, 'obras', 'title ASC');
    } catch (PDOException $e) {
        $query_error = $e->getMessage();
    }
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Catálogo de Obras | F.A.S.E PHP</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-[#140D0C] text-stone-100 font-sans min-h-screen">
    <header class="border-b border-stone-800 bg-[#1D1110] px-6 py-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
            <a href="index.php" class="font-bold text-xl tracking-tight text-[#E05A47]">F.A.S.E</a>
            <span class="text-stone-500">•</span>
            <span class="text-xs uppercase tracking-widest text-stone-300">Catálogo Obras (SQL Dinámico)</span>
        </div>
        <div class="flex items-center gap-3">
            <a href="export.php?table=obras&format=csv" class="px-3 py-1.5 bg-stone-800 text-stone-200 text-xs rounded hover:bg-stone-700 transition">Descargar CSV</a>
            <a href="export.php?table=obras&format=json" class="px-3 py-1.5 bg-[#E05A47]/20 text-[#FF6B4A] border border-[#E05A47]/40 text-xs rounded hover:bg-[#E05A47]/30 transition">Descargar JSON</a>
            <a href="index.php" class="text-xs text-stone-400 hover:text-white transition">Volver</a>
        </div>
    </header>

    <main class="max-w-7xl mx-auto px-6 py-8">
        <div class="flex items-center justify-between mb-6">
            <h1 class="text-2xl font-bold text-stone-100">Catálogo de Obras y Montajes (<?= count($obrasList) ?>)</h1>
            <span class="text-xs text-stone-400 font-mono">Tabla SQL: `obras`</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <?php foreach ($obrasList as $obra): 
                $cast = !empty($obra['cast_team']) ? json_decode($obra['cast_team'], true) : [];
                $econ = !empty($obra['economics']) ? json_decode($obra['economics'], true) : [];
            ?>
                <div class="bg-[#221513] border border-stone-800 rounded-xl overflow-hidden flex flex-col hover:border-[#E05A47]/50 transition">
                    <?php if (!empty($obra['image'])): ?>
                        <div class="h-44 w-full bg-cover bg-center" style="background-image: url('<?= htmlspecialchars($obra['image']) ?>');"></div>
                    <?php endif; ?>
                    <div class="p-5 flex-1 flex flex-col">
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-[11px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-[#E05A47]/10 text-[#FF6B4A] border border-[#E05A47]/30">
                                <?= htmlspecialchars($obra['discipline']) ?>
                            </span>
                            <span class="text-[11px] text-stone-400 font-mono"><?= htmlspecialchars($obra['status']) ?></span>
                        </div>
                        <h2 class="text-lg font-bold text-stone-100"><?= htmlspecialchars($obra['title']) ?></h2>
                        <p class="text-xs text-stone-400 mt-2 line-clamp-3 leading-relaxed"><?= htmlspecialchars($obra['synopsis']) ?></p>

                        <div class="mt-4 pt-4 border-t border-stone-800/80 text-xs text-stone-300 space-y-1">
                            <div><strong class="text-stone-400">Duración:</strong> <?= htmlspecialchars($obra['duration']) ?> • <?= htmlspecialchars($obra['format']) ?></div>
                            <?php if (isset($econ['feeCLP'])): ?>
                                <div><strong class="text-stone-400">Caché ref.:</strong> $<?= number_format((float)$econ['feeCLP'], 0, ',', '.') ?> CLP</div>
                            <?php endif; ?>
                        </div>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
    </main>
</body>
</html>

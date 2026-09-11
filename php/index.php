<?php
/**
 * F.A.S.E - Plataforma de Gestión Escénica
 * Panel Principal Automatizado en PHP & SQL
 */

declare(strict_types=1);

require_once __DIR__ . '/db.php';

$title = "Panel F.A.S.E | Datos Servidos en Vivo";
$isConnected = !isset($db_error);

$stats = [
    'obras' => 0,
    'leads' => 0,
    'rd' => 0,
    'venues' => 0,
    'events' => 0,
    'inventory' => 0,
    'finances' => 0,
];

if ($isConnected) {
    try {
        $stats['obras'] = (int)$pdo->query("SELECT COUNT(*) FROM obras")->fetchColumn();
        $stats['leads'] = (int)$pdo->query("SELECT COUNT(*) FROM leads")->fetchColumn();
        $stats['rd'] = (int)$pdo->query("SELECT COUNT(*) FROM rd_projects")->fetchColumn();
        $stats['venues'] = (int)$pdo->query("SELECT COUNT(*) FROM venues")->fetchColumn();
        $stats['events'] = (int)$pdo->query("SELECT COUNT(*) FROM events")->fetchColumn();
        $stats['inventory'] = (int)$pdo->query("SELECT COUNT(*) FROM inventory")->fetchColumn();
        $stats['finances'] = (int)$pdo->query("SELECT COUNT(*) FROM finances")->fetchColumn();
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
    <title><?= htmlspecialchars($title) ?></title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        :root {
            --primary: #E05A47;
            --primary-hover: #FF6B4A;
            --bg-dark: #140D0C;
            --card-dark: #221513;
        }
    </style>
</head>
<body class="bg-[#140D0C] text-stone-100 font-sans min-h-screen">
    <nav class="border-b border-stone-800 bg-[#1D1110] px-6 py-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
            <span class="font-bold text-xl tracking-tight text-[#E05A47]">F.A.S.E</span>
            <span class="text-stone-500">•</span>
            <span class="text-xs uppercase tracking-widest text-stone-400">Servidor PHP + PostgreSQL</span>
        </div>
        <div class="flex items-center gap-4 text-sm">
            <a href="obras.php" class="hover:text-[#E05A47] transition">Obras</a>
            <a href="crm.php" class="hover:text-[#E05A47] transition">CRM Leads</a>
            <a href="finances.php" class="hover:text-[#E05A47] transition">Finanzas</a>
            <a href="export.php" class="hover:text-[#E05A47] transition">Exportar</a>
            <a href="import.php" class="hover:text-[#E05A47] transition">Importar</a>
            <a href="api.php?action=all" target="_blank" class="px-3 py-1 bg-[#E05A47]/20 text-[#FF6B4A] border border-[#E05A47]/40 rounded text-xs font-mono">API JSON</a>
        </div>
    </nav>

    <main class="max-w-6xl mx-auto px-6 py-8">
        <header class="mb-8">
            <div class="flex items-center justify-between">
                <div>
                    <h1 class="text-2xl font-bold text-stone-100">Automatización y Ordenamiento de Datos</h1>
                    <p class="text-sm text-stone-400 mt-1">Datos servidos dinámicamente desde Cloud SQL PostgreSQL para F.A.S.E</p>
                </div>
                <div class="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium <?= $isConnected ? 'bg-emerald-950/80 border border-emerald-700/50 text-emerald-300' : 'bg-rose-950/80 border border-rose-700/50 text-rose-300' ?>">
                    <span class="w-2 h-2 rounded-full <?= $isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400' ?>"></span>
                    <?= $isConnected ? 'PostgreSQL Conectado' : 'Sin conexión a BD' ?>
                </div>
            </div>
        </header>

        <!-- Métricas del Sistema -->
        <section class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div class="bg-[#221513] border border-stone-800 p-4 rounded-xl">
                <div class="text-xs text-stone-400 uppercase tracking-wider">Catálogo Obras</div>
                <div class="text-2xl font-bold text-stone-100 mt-1"><?= $stats['obras'] ?></div>
                <a href="obras.php" class="text-xs text-[#E05A47] hover:underline mt-2 inline-block">Ver catálogo &rarr;</a>
            </div>
            <div class="bg-[#221513] border border-stone-800 p-4 rounded-xl">
                <div class="text-xs text-stone-400 uppercase tracking-wider">Leads CRM</div>
                <div class="text-2xl font-bold text-stone-100 mt-1"><?= $stats['leads'] ?></div>
                <a href="crm.php" class="text-xs text-[#E05A47] hover:underline mt-2 inline-block">Ver pipeline &rarr;</a>
            </div>
            <div class="bg-[#221513] border border-stone-800 p-4 rounded-xl">
                <div class="text-xs text-stone-400 uppercase tracking-wider">Salas & Redes</div>
                <div class="text-2xl font-bold text-stone-100 mt-1"><?= $stats['venues'] ?></div>
                <a href="api.php?action=venues" class="text-xs text-[#E05A47] hover:underline mt-2 inline-block">Ver salas &rarr;</a>
            </div>
            <div class="bg-[#221513] border border-stone-800 p-4 rounded-xl">
                <div class="text-xs text-stone-400 uppercase tracking-wider">Movimientos Finanzas</div>
                <div class="text-2xl font-bold text-stone-100 mt-1"><?= $stats['finances'] ?></div>
                <a href="finances.php" class="text-xs text-[#E05A47] hover:underline mt-2 inline-block">Ver rendiciones &rarr;</a>
            </div>
        </section>

        <!-- Secciones Rápidas -->
        <section class="grid md:grid-cols-2 gap-6">
            <div class="bg-[#221513] border border-stone-800 rounded-xl p-6">
                <h2 class="text-lg font-semibold mb-3 text-stone-200">Exportación e Importación de Archivos</h2>
                <p class="text-sm text-stone-400 mb-4">Descarga copias de seguridad de cualquier tabla o sube archivos CSV y JSON para sincronizar la base de datos SQL.</p>
                <div class="flex flex-wrap gap-3">
                    <a href="export.php" class="px-4 py-2 bg-[#E05A47] text-white rounded-lg text-sm font-medium hover:bg-[#FF6B4A] transition">Descargar Archivos (Exportar)</a>
                    <a href="import.php" class="px-4 py-2 bg-stone-800 text-stone-200 rounded-lg text-sm font-medium hover:bg-stone-700 transition">Subir Archivos (Importar)</a>
                </div>
            </div>

            <div class="bg-[#221513] border border-stone-800 rounded-xl p-6">
                <h2 class="text-lg font-semibold mb-3 text-stone-200">Servicio de Datos en Vivo (REST API)</h2>
                <p class="text-sm text-stone-400 mb-4">Los datos están organizados y automatizados para alimentar tanto la aplicación React como módulos PHP autónomos.</p>
                <div class="space-y-2 text-xs font-mono text-stone-300">
                    <div class="bg-black/40 p-2 rounded flex justify-between">
                        <span>GET /php/api.php?action=obras</span>
                        <span class="text-emerald-400">200 OK</span>
                    </div>
                    <div class="bg-black/40 p-2 rounded flex justify-between">
                        <span>GET /php/api.php?action=leads</span>
                        <span class="text-emerald-400">200 OK</span>
                    </div>
                    <div class="bg-black/40 p-2 rounded flex justify-between">
                        <span>GET /php/api.php?action=finances</span>
                        <span class="text-emerald-400">200 OK</span>
                    </div>
                </div>
            </div>
        </section>
    </main>
</body>
</html>

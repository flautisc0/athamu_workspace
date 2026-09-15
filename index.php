<?php
/**
 * F.A.S.E & ATHA Producciones — Plataforma de Gestión Escénica
 * Entrada Principal Web HTML / PHP
 * 
 * Integra motor PHP 8 con base de datos SQLite (/tmp/atha_crm.db)
 * y Cloud SQL, sirviendo la interfaz completa F.A.S.E en Modo Día.
 */

declare(strict_types=1);

// 1. Conexión a Base de Datos
$dbFile = '/tmp/atha_crm.db';
$pdo = null;
$dbStatus = 'offline';
$dbStats = [
    'obras' => 0,
    'leads' => 0,
    'venues' => 0,
    'team' => 0,
    'events' => 0,
    'inventory' => 0,
    'finances' => 0
];

try {
    if (!file_exists($dbFile) || filesize($dbFile) < 100) {
        // Inicializar esquema si no existe
        if (file_exists(__DIR__ . '/seed-sqlite.php')) {
            require_once __DIR__ . '/seed-sqlite.php';
        }
    }

    if (file_exists($dbFile)) {
        $pdo = new PDO("sqlite:{$dbFile}");
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $dbStatus = 'online';

        $dbStats['obras'] = (int)$pdo->query("SELECT COUNT(*) FROM projects")->fetchColumn();
        $dbStats['leads'] = (int)$pdo->query("SELECT COUNT(*) FROM leads")->fetchColumn();
        $dbStats['venues'] = (int)$pdo->query("SELECT COUNT(*) FROM venues")->fetchColumn();
        $dbStats['team'] = (int)$pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();
        $dbStats['events'] = (int)$pdo->query("SELECT COUNT(*) FROM events")->fetchColumn();
        $dbStats['inventory'] = (int)$pdo->query("SELECT COUNT(*) FROM inventory_items")->fetchColumn();
        $dbStats['finances'] = (int)$pdo->query("SELECT COUNT(*) FROM finance_records")->fetchColumn();
    }
} catch (Throwable $e) {
    $dbError = $e->getMessage();
}

// 2. Si se solicita vista PHP directa (por ejemplo ?view=admin)
$view = $_GET['view'] ?? null;
if ($view === 'admin' && file_exists(__DIR__ . '/admin-ui.php')) {
    require __DIR__ . '/admin-ui.php';
    exit;
}
if ($view === 'api' && file_exists(__DIR__ . '/admin-api.php')) {
    require __DIR__ . '/admin-api.php';
    exit;
}

// 3. Obtener assets construidos de Vite
$distHtml = __DIR__ . '/dist/index.html';
$jsAssets = [];
$cssAssets = [];

if (file_exists($distHtml)) {
    $htmlContent = file_get_contents($distHtml);
    // Extraer JS y CSS de dist
    preg_match_all('/<script\s+[^>]*src="([^"]+)"[^>]*><\/script>/i', $htmlContent, $jsMatches);
    preg_match_all('/<link\s+[^>]*href="([^"]+)"[^>]*rel="stylesheet"[^>]*>/i', $htmlContent, $cssMatches);
    
    $jsAssets = $jsMatches[1] ?? [];
    $cssAssets = $cssMatches[1] ?? [];
}

// 4. Preparar payload de datos PHP iniciales para hidratación
$phpInitialPayload = [
    'server' => [
        'php_version' => PHP_VERSION,
        'os' => PHP_OS,
        'db_engine' => 'SQLite 3 (PDO)',
        'db_file' => $dbFile,
        'status' => $dbStatus,
    ],
    'stats' => $dbStats,
    'endpoints' => [
        'admin_ui' => '/admin-ui.php',
        'admin_api' => '/admin-api.php',
        'api_gateway' => '/api.php',
        'php_portal' => '/php/index.php',
        'php_obras' => '/php/obras.php',
        'php_crm' => '/php/crm.php',
    ]
];
$jsonPayload = json_encode($phpInitialPayload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
?>
<!doctype html>
<html lang="es" class="light" data-theme="dia">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>F.A.S.E - Plataforma de Gestión Escénica | PHP & HTML</title>
    <meta name="description" content="Plataforma integral de gestión escénica y producción F.A.S.E servida con PHP y HTML: catálogo de obras, CRM de salas, planner de giras, I+D y administración SQL." />
    <meta property="og:title" content="F.A.S.E - Plataforma de Gestión Escénica | PHP & HTML" />
    <meta property="og:description" content="Plataforma integral de gestión escénica y producción F.A.S.E servida con PHP y HTML." />
    <link rel="icon" type="image/svg+xml" href="/assets/fase/fase-simbolo.svg" />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&family=Syne:wght@600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
    
    <!-- Inyección de Estado Inicial PHP -->
    <script>
      window.__PHP_INITIAL_DATA__ = <?= $jsonPayload ?>;
      console.info('🐘 F.A.S.E iniciado con PHP <?= PHP_VERSION ?> | BD SQLite: <?= $dbStatus ?>');
    </script>

    <?php foreach ($cssAssets as $css): ?>
      <link rel="stylesheet" crossorigin href="<?= htmlspecialchars($css) ?>">
    <?php endforeach; ?>
  </head>
  <body class="bg-[#FAF7F5] text-stone-800 antialiased selection:bg-[#E05A47]/20 selection:text-[#E05A47]">
    <div id="root">
      <!-- Fallback accesible durante carga -->
      <noscript>
        <div style="padding: 2rem; font-family: sans-serif; max-width: 800px; margin: 0 auto; color: #1c1917;">
          <h1 style="color: #E05A47;">F.A.S.E — Plataforma de Gestión Escénica</h1>
          <p>Servidor PHP activo en versión <?= PHP_VERSION ?>. Para la experiencia completa interactiva, active JavaScript.</p>
          <ul>
            <li><a href="/admin-ui.php">Panel de Administración SQL & PHP</a></li>
            <li><a href="/admin-api.php?a=meta/tables">API de Metadatos de Tablas</a></li>
            <li><a href="/php/obras.php">Catálogo de Obras PHP</a></li>
            <li><a href="/php/crm.php">CRM de Leads PHP</a></li>
          </ul>
        </div>
      </noscript>
    </div>

    <?php if (!empty($jsAssets)): ?>
      <?php foreach ($jsAssets as $js): ?>
        <script type="module" crossorigin src="<?= htmlspecialchars($js) ?>"></script>
      <?php endforeach; ?>
    <?php else: ?>
      <!-- En modo desarrollo Vite -->
      <script type="module" src="/src/main.tsx"></script>
    <?php endif; ?>
  </body>
</html>

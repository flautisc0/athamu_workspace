<?php
/**
 * ATHA CRM PHP Admin — Frontend HTML
 * Panel de administración visual de la estructura SQL.
 * Navega tablas, visualiza rows, edita y accede al schema-map.
 */
?>
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ATHA CRM — Admin SQL</title>
  <style>
    :root {
      --green: #10b981;
      --blue: #3b82f6;
      --dark: #0f172a;
      --card: #1e293b;
      --border: #33415b;
      --text: #e2e8f0;
      --muted: #94a3b8;
    }
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Segoe UI',sans-serif; background:var(--dark); color:var(--text); min-height:100vh; }
    header { background:#0b1220; padding:12px 24px; display:flex; align-items:center; gap:12px; }
    header h1 { font-size:18px; font-weight:600; }
    header .logo { width:28px; height:28px; background:var(--green); border-radius:6px; }
    .container { display:flex; max-width:1400px; margin:0 auto; padding:20px; gap:20px; }
    .sidebar { flex:0 0 260px; background:var(--card); border-radius:10px; padding:16px; height:max-content; }
    .sidebar h3 { font-size:13px; color:var(--muted); text-transform:uppercase; letter-spacing:1px; margin-bottom:12px; }
    .sidebar ul { list-style:none; }
    .sidebar li { margin-bottom:4px; }
    .sidebar a { color:var(--text); text-decoration:none; padding:8px 12px; border-radius:6px; display:block; transition:background .2s; cursor:pointer; }
    .sidebar a:hover { background:#33415b; }
    .sidebar a.active { background:var(--green); color:#0f172a; font-weight:600; }
    .main { flex:1; }
    .toolbar { display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; }
    .toolbar h2 { font-size:20px; }
    .toolbar .actions { display:flex; gap:8px; }
    .btn { background:var(--green); color:#0f172a; border:none; padding:8px 16px; border-radius:6px; font-weight:600; cursor:pointer; }
    .btn.secondary { background:var(--blue); color:#fff; }
    .btn.sm { padding:6px 12px; font-size:13px; }
    table { width:100%; border-collapse:collapse; background:var(--card); border-radius:8px; overflow:hidden; }
    th, td { padding:10px 12px; text-align:left; border-bottom:1px solid var(--border); font-size:14px; }
    th { background:#0f172a; color:var(--text); }
    tr:hover { background:#283548; }
    .badge { display:inline-block; padding:2px 8px; border-radius:12px; font-size:11px; font-weight:600; }
    .badge-open { background:#1e3a8a; color:#93c5fd; }
    .badge-closed { background:#450a0a; color:#fca5a5; }
    .schema-map { background:var(--card); border-radius:10px; padding:16px; margin-top:16px; }
    .schema-map h3 { margin-bottom:12px; font-size:16px; }
    .module-card { border:1px solid var(--border); border-radius:8px; padding:12px; margin-bottom:10px; }
    .module-card h4 { font-size:14px; margin-bottom:4px; color:var(--blue); }
    .module-card p { font-size:12px; color:var(--muted); margin-bottom:6px; }
    .module-tables { display:flex; flex-wrap:wrap; gap:4px; }
    .mod-table-tag { background:#33415b; color:#cbd5e1; padding:2px 8px; border-radius:4px; font-size:11px; }
    .hidden { display:none; }
    .error-msg { color:#fca5a5; font-size:13px; margin-top:8px; }
  </style>
</head>
<body>
  <header>
    <div class="logo"></div>
    <h1>ATHA CRM — Admin SQL</h1>
  </header>
  <div class="container">
    <div class="sidebar" id="sidebar">
      <h3>Módulos del Ecosistema</h3>
      <ul>
        <li><a href="#" class="mod-link active" data-target="crm-atha">CRM-atha</a></li>
        <li><a href="#" class="mod-link" data-target="fase-user-panel">Fase User Panel</a></li>
        <li><a href="#" class="mod-link" data-target="ATHA-Planner">ATHA Planner</a></li>
        <li><a href="#" class="mod-link" data-target="ticketerapp">Ticketerapp</a></li>
        <li><a href="#" class="mod-link" data-target="buscador-de-fondos">Buscador de Fondos</a></li>
        <hr style="border-color:var(--border);margin:12px 0">
        <h3 style="margin-top:12px">Tablas SQL</h3>
        <ul id="table-list">
          <li><span>Cargando...</span></li>
        </ul>
      </ul>
    </div>
    <div class="main">
      <div class="toolbar">
        <h2 id="current-table">Schema Map</h2>
        <div class="actions">
          <button class="btn secondary sm" onclick="loadSchemaMap()">Schema Map</button>
        </div>
      </div>
      <div id="content-area">
        <!-- Schema map o tabla data -->
      </div>
    </div>
  </div>

  <script>
    const apiBase = '/api.php';
    function api(path) { return `${apiBase}?a=${path}`; }

    // Cargar lista de tablas
    async function loadTables() {
      try {
        const res = await fetch(api('meta/tables'));
        const data = await res.json();
        const list = document.getElementById('table-list');
        list.innerHTML = '';
        data.tables.forEach(t => {
          const li = document.createElement('li');
          li.innerHTML = `<a href="#" class="table-link" data-table="${t.name}">${t.name}</a>`;
          list.appendChild(li);
        });
      } catch(e) {
        document.getElementById('table-list').innerHTML = '<li><span class="error-msg">Error cargando tablas</span></li>';
      }
      attachTableListeners();
    }

    function attachTableListeners() {
      document.querySelectorAll('.table-link').forEach(link => {
        link.addEventListener('click', e => {
          e.preventDefault();
          loadTable(link.dataset.table);
        });
      });
      document.querySelectorAll('.mod-link').forEach(link => {
        link.addEventListener('click', e => {
          e.preventDefault();
          document.querySelectorAll('.mod-link').forEach(l => l.classList.remove('active'));
          link.classList.add('active');
          loadModule(link.dataset.target);
        });
      });
    }

    async function loadTable(table) {
      document.getElementById('current-table').textContent = `Tabla: ${table}`;
      const area = document.getElementById('content-area');
      area.innerHTML = '<p style="color:var(--muted)">Cargando...</p>';
      try {
        const res = await fetch(api('data/' + table + '?limit=50'));
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          const cols = Object.keys(data.items[0]);
          let html = '<table><thead><tr>';
          cols.forEach(c => html += `<th>${c}</th>`);
          html += '</tr></thead><tbody>';
          data.items.forEach(row => {
            html += '<tr>';
            cols.forEach(c => {
              html += `<td>${row[c] !== null && row[c] !== undefined ? row[c] : '<span style="color:var(--muted)">null</span>'}</td>`;
            });
            html += '</tr>';
          });
          html += '</tbody></table>';
          area.innerHTML = html;
        } else {
          area.innerHTML = '<p style="color:var(--muted)">No hay registros.</p>';
        }
      } catch(e) {
        area.innerHTML = '<p class="error-msg">Error: ' + e + '</p>';
      }
    }

    async function loadSchemaMap() {
      document.getElementById('current-table').textContent = 'Schema Map — Ecosistema CRM';
      const area = document.getElementById('content-area');
      area.innerHTML = '<p style="color:var(--muted)">Cargando mapa...</p>';
      try {
        const res = await fetch(api('schema-map'));
        const data = await res.json();
        let html = '<div class="schema-map">';
        Object.entries(data.modules).forEach(([key, mod]) => {
          html += `<div class="module-card">
            <h4>${mod.modulo}</h4>
            <p>${mod.description}</p>
            <div class="module-tables">`;
          mod.tables.forEach(t => {
            html += `<span class="mod-table-tag">${t}</span>`;
          });
          html += `</div>
            <p style="font-size:12px;color:var(--green);margin-top:4px">→ ${mod.conexion}</p>
          </div>`;
        });
        html += '</div>';
        area.innerHTML = html;
      } catch(e) {
        area.innerHTML = '<p class="error-msg">Error cargando schema map</p>';
      }
    }

    // Init
    loadTables();
    loadSchemaMap();

    // Module links
    document.getElementById('sidebar').addEventListener('click', e => {
      if (e.target.classList.contains('mod-link')) {
        e.preventDefault();
        document.querySelectorAll('.mod-link').forEach(l => l.classList.remove('active'));
        e.target.classList.add('active');
        loadModule(e.target.dataset.target);
      }
    });

    async function loadModule(mod) {
      const area = document.getElementById('content-area');
      area.innerHTML = '<p style="color:var(--muted)">Cargando módulo ' + mod + '...</p>';
      // Simple highlight: mostrar tablas del módulo en el schema map con resaltado
      try {
        const res = await fetch(api('schema-map'));
        const data = await res.json();
        const modData = data.modules[mod];
        if (!modData) { area.innerHTML = '<p class="error-msg">Módulo no encontrado</p>'; return; }
        let html = `<div class="schema-map">
          <div class="module-card">
            <h4>${modData.modulo}</h4>
            <p>${modData.description}</p>
            <div class="module-tables">`;
        modData.tables.forEach(t => {
          html += `<span class="mod-table-tag">${t}</span>`;
        });
        html += `</div>
            <p style="font-size:12px;color:var(--green);margin-top:4px">→ ${modData.conexion}</p>
          </div></div>`;
        area.innerHTML = html;
      } catch(e) { area.innerHTML = '<p class="error-msg">Error</p>'; }
    }
  </script>
</body>
</html>

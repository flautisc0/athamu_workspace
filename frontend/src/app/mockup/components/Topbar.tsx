"use client";

interface TopbarProps {
  onMenuClick: () => void;
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 30,
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "14px 18px",
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <button
        onClick={onMenuClick}
        aria-label="Abrir menú"
        style={{
          background: "transparent",
          border: "none",
          color: "var(--text)",
          fontSize: "22px",
          cursor: "pointer",
          lineHeight: 1,
          padding: "2px 4px",
          borderRadius: "8px",
          flexShrink: 0,
        }}
      >
        ☰
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: "15px",
            fontWeight: 800,
            color: "var(--gold)",
            letterSpacing: "2px",
          }}
        >
          ATHA Producciones
        </div>
        <div style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 600 }}>
          Plataforma Artística
        </div>
      </div>

      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <button
          aria-label="Notificaciones"
          style={{
            background: "var(--gold-dim)",
            border: "1px solid var(--gold-border)",
            color: "var(--gold)",
            borderRadius: "10px",
            width: "34px",
            height: "34px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            fontSize: "16px",
          }}
        >
          🔔
        </button>
        <button
          aria-label="Más opciones"
          style={{
            background: "transparent",
            border: "1px solid var(--border)",
            color: "var(--muted)",
            borderRadius: "10px",
            width: "34px",
            height: "34px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            fontSize: "18px",
            fontWeight: 800,
          }}
        >
          ⋯
        </button>
      </div>
    </header>
  );
}

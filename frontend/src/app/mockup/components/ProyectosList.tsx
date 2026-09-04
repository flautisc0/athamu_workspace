"use client";

import Image from "next/image";
import { proyectos, type Project } from "../data";

interface ProyectosListProps {
  onSelect: (p: Project) => void;
}

const estadoColor: Record<string, string> = {
  "En circulación": "var(--green)",
  "En curso": "var(--green)",
  "Itinerante": "#5bc8e8",
  "Programación continua": "#5bc8e8",
  "Convocatoria abierta": "var(--gold)",
  "Temporada cerrada": "var(--muted)",
  "Entregado": "var(--muted)",
};

export default function ProyectosList({ onSelect }: ProyectosListProps) {
  return (
    <section id="proyectos" style={{ padding: "0 18px 32px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "12px",
        }}
      >
        <h3
          style={{
            fontSize: "12px",
            fontWeight: 800,
            color: "var(--gold)",
            letterSpacing: "1px",
            textTransform: "uppercase",
          }}
        >
          Catálogo Completo
        </h3>
        <span
          style={{
            background: "var(--gold-dim)",
            border: "1px solid var(--gold-border)",
            color: "var(--gold)",
            borderRadius: "999px",
            padding: "2px 8px",
            fontSize: "11px",
            fontWeight: 800,
          }}
        >
          {proyectos.length}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {proyectos.map((p: Project) => (
          <button
            key={p.id}
            onClick={() => onSelect(p)}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "16px",
              overflow: "hidden",
              cursor: "pointer",
              textAlign: "left",
              display: "flex",
              gap: 0,
              transition: "border-color 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor =
                "var(--gold-border)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
            }}
          >
            {/* Thumbnail */}
            <div
              style={{
                position: "relative",
                width: "90px",
                flexShrink: 0,
                overflow: "hidden",
              }}
            >
              <Image
                src={p.imagen}
                alt={p.titulo}
                fill
                style={{ objectFit: "cover" }}
                sizes="90px"
              />
            </div>

            {/* Content */}
            <div style={{ padding: "12px 14px", flex: 1, minWidth: 0 }}>
              {p.destacado && (
                <div
                  style={{
                    fontSize: "9px",
                    fontWeight: 800,
                    color: "var(--gold)",
                    letterSpacing: "1px",
                    textTransform: "uppercase",
                    marginBottom: "4px",
                  }}
                >
                  ★ Destacado
                </div>
              )}
              <div
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "var(--text)",
                  marginBottom: "4px",
                  lineHeight: 1.3,
                  overflow: "hidden",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                }}
              >
                {p.titulo}
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--muted)",
                  marginBottom: "6px",
                }}
              >
                {p.categoria} · {p.ano}
              </div>
              <span
                style={{
                  display: "inline-block",
                  fontSize: "10px",
                  fontWeight: 700,
                  color: estadoColor[p.estado] ?? "var(--muted)",
                  background: "transparent",
                  border: `1px solid ${estadoColor[p.estado] ?? "var(--border)"}`,
                  borderRadius: "999px",
                  padding: "2px 7px",
                }}
              >
                {p.estado}
              </span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

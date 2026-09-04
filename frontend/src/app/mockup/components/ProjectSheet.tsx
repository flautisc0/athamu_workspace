"use client";

import Image from "next/image";
import type { Project } from "../data";

interface ProjectSheetProps {
  project: Project | null;
  onClose: () => void;
}

const estadoBadge: Record<string, { bg: string; color: string }> = {
  "En circulación": { bg: "var(--green-dim)", color: "var(--green)" },
  "En curso": { bg: "var(--green-dim)", color: "var(--green)" },
  "Itinerante": { bg: "rgba(91,200,232,0.12)", color: "#5bc8e8" },
  "Programación continua": { bg: "rgba(91,200,232,0.12)", color: "#5bc8e8" },
  "Convocatoria abierta": { bg: "var(--gold-dim)", color: "var(--gold)" },
  "Temporada cerrada": {
    bg: "rgba(152,152,166,0.12)",
    color: "var(--muted)",
  },
  "Entregado": { bg: "rgba(152,152,166,0.12)", color: "var(--muted)" },
};

export default function ProjectSheet({ project, onClose }: ProjectSheetProps) {
  const open = project !== null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 60,
          background: "rgba(0,0,0,0.75)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.3s ease",
        }}
      />

      {/* Sheet */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 70,
          background: "var(--surface)",
          borderRadius: "24px 24px 0 0",
          borderTop: "1px solid var(--border)",
          maxHeight: "88vh",
          overflowY: "auto",
          transform: open ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.35s cubic-bezier(0.32,0.72,0,1)",
        }}
      >
        {project && (
          <>
            {/* Pull handle */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                paddingTop: "12px",
                paddingBottom: "4px",
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "4px",
                  borderRadius: "2px",
                  background: "var(--border)",
                }}
              />
            </div>

            {/* Hero image */}
            <div style={{ position: "relative", height: "200px" }}>
              <Image
                src={project.imagen}
                alt={project.titulo}
                fill
                style={{ objectFit: "cover" }}
                sizes="100vw"
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(to top, var(--surface) 0%, transparent 60%)",
                }}
              />
              <button
                onClick={onClose}
                style={{
                  position: "absolute",
                  top: "12px",
                  right: "12px",
                  background: "rgba(14,14,18,0.75)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                  borderRadius: "999px",
                  width: "32px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  fontSize: "16px",
                  backdropFilter: "blur(4px)",
                }}
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: "4px 20px 32px" }}>
              {/* Category + estado */}
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  alignItems: "center",
                  marginBottom: "10px",
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "var(--muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  {project.categoria} · {project.ano}
                </span>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    color: estadoBadge[project.estado]?.color ?? "var(--muted)",
                    background:
                      estadoBadge[project.estado]?.bg ??
                      "rgba(152,152,166,0.12)",
                    border: `1px solid ${
                      estadoBadge[project.estado]?.color ?? "var(--border)"
                    }`,
                    borderRadius: "999px",
                    padding: "2px 8px",
                  }}
                >
                  {project.estado}
                </span>
              </div>

              {/* Title */}
              <h2
                style={{
                  fontSize: "20px",
                  fontWeight: 800,
                  color: "var(--text)",
                  lineHeight: 1.3,
                  marginBottom: "12px",
                }}
              >
                {project.titulo}
              </h2>

              {/* Description */}
              <p
                style={{
                  fontSize: "14px",
                  color: "var(--muted)",
                  lineHeight: 1.65,
                  marginBottom: "20px",
                }}
              >
                {project.descripcion}
              </p>

              {/* Ficha técnica */}
              <div
                style={{
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  borderRadius: "14px",
                  padding: "14px 16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <div
                  style={{
                    fontSize: "10px",
                    fontWeight: 800,
                    color: "var(--gold)",
                    letterSpacing: "1px",
                    textTransform: "uppercase",
                    marginBottom: "4px",
                  }}
                >
                  Ficha técnica
                </div>
                {[
                  { label: "Compañía", value: project.compania },
                  { label: "Dirección", value: project.direccion },
                  { label: "Producción", value: project.produccion },
                  { label: "Elenco", value: project.elenco },
                  {
                    label: "Formato",
                    value: `${project.formato} · ${project.disciplina}`,
                  },
                  {
                    label: "Duración",
                    value: project.duracion !== "—" ? project.duracion : "—",
                  },
                  { label: "Público", value: project.publico },
                ].map((row) => (
                  <div key={row.label} style={{ display: "flex", gap: "10px" }}>
                    <span
                      style={{
                        fontSize: "12px",
                        color: "var(--muted)",
                        fontWeight: 600,
                        width: "80px",
                        flexShrink: 0,
                      }}
                    >
                      {row.label}
                    </span>
                    <span
                      style={{
                        fontSize: "12px",
                        color: "var(--text)",
                        flex: 1,
                      }}
                    >
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

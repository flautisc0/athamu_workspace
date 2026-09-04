"use client";

import { useState } from "react";
import Image from "next/image";
import { socios, type Socio } from "../data";

export default function SociosGrid() {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <section id="socios" style={{ padding: "0 18px 24px" }}>
      <h3
        style={{
          fontSize: "12px",
          fontWeight: 800,
          color: "var(--gold)",
          letterSpacing: "1px",
          textTransform: "uppercase",
          marginBottom: "12px",
        }}
      >
        Socios del Equipo
      </h3>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "10px",
        }}
      >
        {socios.map((socio: Socio) => (
          <button
            key={socio.id}
            onClick={() => setExpanded(expanded === socio.id ? null : socio.id)}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "16px",
              overflow: "hidden",
              cursor: "pointer",
              textAlign: "left",
              transition: "border-color 0.15s",
              borderColor:
                expanded === socio.id ? "var(--gold)" : "var(--border)",
            }}
          >
            <div style={{ position: "relative", height: "110px" }}>
              <Image
                src={socio.imagen}
                alt={socio.nombre}
                fill
                style={{ objectFit: "cover" }}
                sizes="(max-width: 768px) 50vw, 25vw"
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(to top, rgba(14,14,18,0.85) 0%, transparent 60%)",
                }}
              />
            </div>
            <div style={{ padding: "10px 12px 12px" }}>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "var(--text)",
                  marginBottom: "2px",
                }}
              >
                {socio.nombre}
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--gold)",
                  fontWeight: 700,
                  marginBottom: expanded === socio.id ? "8px" : 0,
                }}
              >
                {socio.rol}
              </div>
              {expanded === socio.id && (
                <div
                  style={{
                    fontSize: "12px",
                    color: "var(--muted)",
                    lineHeight: 1.5,
                  }}
                >
                  {socio.bio}
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

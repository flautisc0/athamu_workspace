import { stats } from "../data";

export default function DashboardStats() {
  return (
    <section id="dashboard" style={{ padding: "0 18px 24px" }}>
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
        Dashboard
      </h3>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "8px",
        }}
      >
        {stats.map((stat) => (
          <div
            key={stat.label}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "16px",
              padding: "14px 12px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: "26px",
                fontWeight: 900,
                color: "var(--gold)",
                lineHeight: 1,
                marginBottom: "4px",
              }}
            >
              {stat.value}
            </div>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "var(--text)",
                marginBottom: "2px",
              }}
            >
              {stat.label}
            </div>
            <div style={{ fontSize: "10px", color: "var(--muted)" }}>
              {stat.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Activity bar */}
      <div
        style={{
          marginTop: "10px",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          padding: "14px 16px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "10px",
          }}
        >
          <span
            style={{ fontSize: "12px", fontWeight: 700, color: "var(--text)" }}
          >
            Actividad 2024
          </span>
          <span style={{ fontSize: "11px", color: "var(--green)", fontWeight: 700 }}>
            ↑ 34%
          </span>
        </div>
        <div style={{ display: "flex", gap: "4px", alignItems: "flex-end", height: "36px" }}>
          {[30, 50, 40, 70, 55, 80, 65, 90, 75, 85, 60, 95].map((h, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: `${h}%`,
                borderRadius: "3px 3px 0 0",
                background:
                  i === 11
                    ? "var(--gold)"
                    : "rgba(212,168,67,0.25)",
              }}
            />
          ))}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "4px",
          }}
        >
          {["E", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"].map(
            (m) => (
              <span
                key={m}
                style={{
                  flex: 1,
                  textAlign: "center",
                  fontSize: "9px",
                  color: "var(--muted)",
                }}
              >
                {m}
              </span>
            )
          )}
        </div>
      </div>
    </section>
  );
}

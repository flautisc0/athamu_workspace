export default function ProfileCard() {
  return (
    <section id="perfil" style={{ padding: "0 18px 24px" }}>
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "20px",
          overflow: "hidden",
        }}
      >
        {/* Banner */}
        <div
          style={{
            height: "90px",
            background:
              "linear-gradient(135deg, rgba(212,168,67,0.25) 0%, rgba(212,168,67,0.05) 100%)",
            borderBottom: "1px solid var(--gold-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "36px",
            letterSpacing: "6px",
            fontWeight: 900,
            color: "var(--gold)",
          }}
        >
          ATHA
        </div>

        <div style={{ padding: "16px 18px 20px" }}>
          <div style={{ marginBottom: "12px" }}>
            <h2
              style={{
                fontSize: "17px",
                fontWeight: 800,
                color: "var(--text)",
                marginBottom: "4px",
              }}
            >
              ATHA Producciones
            </h2>
            <p style={{ fontSize: "12px", color: "var(--gold)", fontWeight: 700 }}>
              Productora Teatral Independiente · Santiago, Chile
            </p>
          </div>

          <p
            style={{
              fontSize: "13px",
              color: "var(--muted)",
              lineHeight: 1.6,
              marginBottom: "16px",
            }}
          >
            Productora independiente especializada en teatro contemporáneo, danza y
            artes escénicas. Trabajamos con compañías nacionales e internacionales
            para crear experiencias artísticas que interpelan la realidad chilena.
          </p>

          {/* Tags */}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {["Teatro", "Danza", "Gestión Cultural", "Formación", "Festival"].map(
              (tag) => (
                <span
                  key={tag}
                  style={{
                    padding: "3px 10px",
                    borderRadius: "999px",
                    background: "var(--gold-dim)",
                    border: "1px solid var(--gold-border)",
                    color: "var(--gold)",
                    fontSize: "11px",
                    fontWeight: 700,
                  }}
                >
                  {tag}
                </span>
              )
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Red de seguridad de la app: si algo falla al renderizar, en vez de quedar la
 * pantalla en blanco (lo que pasaba al entrar desde el navegador de Telegram)
 * se muestra un mensaje claro con opciones para recuperarse.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error('[ATHA] Error de interfaz:', error, info);
  }

  handleReload = () => {
    this.setState({ error: null });
    window.location.reload();
  };

  handleCleanSession = () => {
    try {
      localStorage.removeItem('user_session');
      localStorage.removeItem('fase_current_user');
      Object.keys(localStorage)
        .filter((k) => k.startsWith('atha_'))
        .forEach((k) => localStorage.removeItem(k));
    } catch {}
    window.location.href = window.location.origin + '/';
  };

  render() {
    if (!this.state.error) return this.props.children;

    const msg = String(this.state.error?.message || this.state.error || '');

    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#180F0E',
          color: '#F5E9E6',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
        }}
      >
        <div
          style={{
            maxWidth: 520,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: 20,
            padding: '28px 26px',
          }}
        >
          <p style={{ margin: 0, fontSize: 12, letterSpacing: 1, color: 'var(--accent-terracota)', fontWeight: 700 }}>
            ATHA · CRM
          </p>
          <h1 style={{ margin: '10px 0 6px', fontSize: 22 }}>Algo se cortó al cargar la app</h1>
          <p style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            No es un problema de tus datos: la sesión quedó guardada. Probá recargar; si sigue
            igual, limpiá la sesión local y volvé a entrar.
          </p>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={this.handleReload}
              style={{
                padding: '10px 18px', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: 'var(--accent-terracota)', color: '#fff', fontWeight: 600, fontSize: 13,
              }}
            >
              Recargar
            </button>
            <button
              onClick={this.handleCleanSession}
              style={{
                padding: '10px 18px', borderRadius: 12, cursor: 'pointer',
                background: 'transparent', color: '#F5E9E6',
                border: '1px solid var(--border-color)', fontWeight: 600, fontSize: 13,
              }}
            >
              Limpiar sesión y volver
            </button>
          </div>

          {msg && (
            <details style={{ marginTop: 18 }}>
              <summary style={{ cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)' }}>
                Detalle técnico
              </summary>
              <pre
                style={{
                  marginTop: 8, fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap',
                  background: '#120B0A', padding: 10, borderRadius: 10, maxHeight: 180, overflow: 'auto',
                }}
              >
                {msg}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;

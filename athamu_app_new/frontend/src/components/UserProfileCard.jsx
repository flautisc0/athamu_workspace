/**
 * Componente de Perfil de Usuario para CRM.
 * Muestra la informacion del usuario autenticado (nombre, email, avatar, rol).
 * Consume los datos desde localStorage (user_session), con fallback a cookies.
 */
import React, { useState, useEffect } from 'react';

export interface UserProfileCardProps {
  userId?: string;
  displayName?: string;
  email?: string;
  avatarUrl?: string;
  role?: string;
  roleTitle?: string;
}

const UserProfileCard: React.FC<UserProfileCardProps> = ({
  userId,
  displayName,
  email,
  avatarUrl,
  role,
  roleTitle,
}) => {
  const [userName, setUserName] = useState(displayName || 'Usuario');
  const [userEmail, setUserEmail] = useState(email || '');
  const [userAvatar, setUserAvatar] = useState(avatarUrl || '');
  const [userRole, setUserRole] = useState(roleTitle || role || 'Usuario');
  const [imgError, setImgError] = useState(false);

  const primaryColor = '#1e3d30'; // Verde azulado oscuro de F.A.S.E
  const accentColor = '#d4af37';   // Dorado ATHA

  useEffect(() => {
    try {
      const sessionStr = localStorage.getItem('user_session');
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        setUserName(session.display_name || userName);
        setUserEmail(session.email || userEmail);
        setAvatar(session.avatar_url || session.picture || userAvatar || '');
        setUserRole(session.role_title || session.role || userRole);
        setImgError(false);
      }
    } catch (e) {
      console.warn && console.warn('Error reading user_session:', e);
    }

    // Fallback cookie si localStorage no tiene datos
    if (!userName || !userAvatar) {
      const cookies = document.cookie.split(';');
      const nameMatch = cookies.find((c) => c.trim().startsWith('atha_name='));
      const picMatch = cookies.find((c) => c.trim().startsWith('atha_picture='));

      if (!userName && nameMatch) {
        const decoded = decodeURIComponent(nameMatch.split('=')[1]);
        if (decoded) setUserName(decoded);
      }
      if (!userAvatar && picMatch) {
        const decoded = decodeURIComponent(picMatch.split('=')[1]);
        if (decoded) {
          setUserAvatar(decoded);
          setImgError(false);
        }
      }
    }
  }, []);

  const handleImageError = () => {
    if (!imgError) {
      setImgError(true);
      // Generar avatar genertico con iniciales del nombre
      const initials = userName
        ? userName
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)
        : 'U';
      const svg = `data:image/svg+xml;base64,${btoa(
        `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><rect width="80" height="80" rx="40" fill="${encodeURIComponent(primaryColor)}"/><text x="40" y="52" font-family="Arial, sans-serif" font-size="32" fill="white" text-anchor="middle">${initials}</text></svg>`
      )}`;
      setUserAvatar(svg);
    }
  };

  const displayRole = (role: string) => {
    const roles: Record<string, string> = {
      admin: 'Administrador',
      socio: 'Socio',
      artista: 'Artista',
      usuario: 'Usuario',
    };
    return roles[role?.toLowerCase()] || role || 'Usuario';
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: '12px',
        border: `1px solid ${primaryColor}33`,
        maxWidth: '320px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Avatar circular */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        {userAvatar && !imgError ? (
          <img
            src={userAvatar}
            alt={userName}
            onError={handleImageError}
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: `2px solid ${accentColor}`,
            }}
          />
        ) : (
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: primaryColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 600,
              fontSize: '20px',
            }}
          >
            {userName
              ?.split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2) || 'U'}
          </div>
        )}
      </div>

      {/* Información del usuario */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontSize: '15px',
            fontWeight: 600,
            color: '#f3f4f6',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          title={userName}
        >
          {userName}
        </p>
        {userEmail && (
          <p
            style={{
              margin: '2px 0',
              fontSize: '12px',
              color: '#9ca3af',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={userEmail}
          >
            {userEmail}
          </p>
        )}
        <span
          style={{
            display: 'inline-block',
            marginTop: '2px',
            padding: '2px 8px',
            fontSize: '11px',
            fontWeight: 500,
            color: accentColor,
            backgroundColor: `${primaryColor}22`,
            borderRadius: '999px',
            whiteSpace: 'nowrap',
          }}
        >
          {displayRole(userRole)}
        </span>
      </div>
    </div>
  );
};

export default UserProfileCard;

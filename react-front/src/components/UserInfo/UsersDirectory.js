import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../utility/backSource';
import { useAuthContext } from '../../AuthContext';
import PageHeader from '../All/PageHeader';
import VinylSpinner from '../All/VinylSpinner';

const UsersDirectory = () => {
  const { getData } = useApi();
  const { isAuthenticated, authState } = useAuthContext();
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [brokenAvatars, setBrokenAvatars] = useState({});

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getData('/api/users');
      setUsers(Array.isArray(response) ? response : []);
    } catch (err) {
      console.error('[UsersDirectory] Failed to load users', err);
      setError('Unable to load users right now.');
    } finally {
      setLoading(false);
    }
  }, [getData]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const sorted = [...users].sort((a, b) =>
      (a.username || '').localeCompare(b.username || '')
    );
    if (!term) return sorted;
    return sorted.filter((user) => {
      const u = user.username?.toLowerCase() || '';
      const e = user.email?.toLowerCase() || '';
      return u.includes(term) || e.includes(term);
    });
  }, [users, searchTerm]);

  const renderAvatar = (user) => {
    const avatarKey = user.user_id || user.username || 'unknown';
    const shouldShowFallback = !user.user_image || brokenAvatars[avatarKey];

    return (
      <div className="users-directory__avatar-wrapper">
        {!shouldShowFallback ? (
          <img
            src={user.user_image}
            alt={user.username}
            className="users-directory__avatar"
            onError={() =>
              setBrokenAvatars((prev) => ({ ...prev, [avatarKey]: true }))
            }
          />
        ) : (
          <div className="users-directory__avatar users-directory__avatar--fallback">
            {user.username?.charAt(0)?.toUpperCase() || '?'}
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="page users-directory">
      <PageHeader
        eyebrow="Community"
        title="Dashboard"
        subtitle="Browse collectors and jump into public profiles. Sign in for personalized recommendations and Discogs sync."
        actions={
          !isAuthenticated ? (
            <button type="button" className="btn btn--primary" onClick={() => navigate('/login')}>
              Sign in
            </button>
          ) : (
            <button type="button" className="btn btn--ghost" onClick={() => navigate(`/profile/${authState.username}`)}>
              My profile
            </button>
          )
        }
      />

      <div className="page-toolbar">
        <div className="page-toolbar__search">
          <input
            type="search"
            className="form-control"
            placeholder="Search by username or email"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <span className="eyebrow">{filteredUsers.length} members</span>
      </div>

      {error && (
        <div className="grail-alert grail-alert--warning mb-4 d-flex justify-content-between align-items-center">
          <span>{error}</span>
          <button type="button" className="btn btn--ghost btn-sm" onClick={loadUsers}>
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="page-empty">
          <VinylSpinner label="Loading community…" />
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="page-empty">
          <p className="page-empty__title">No users found</p>
          <p>Try a different search term.</p>
          <button type="button" className="btn btn--ghost mt-3" onClick={() => setSearchTerm('')}>
            Clear search
          </button>
        </div>
      ) : (
        <div className="page-grid">
          {filteredUsers.map((user, index) => (
            <article key={user.user_id || user.username || `user-${index}`} className="users-directory__card">
              <div className="text-center">{renderAvatar(user)}</div>
              <h3 className="users-directory__name">{user.username}</h3>
              <p className="users-directory__email">{user.email}</p>
              <button
                type="button"
                className="btn btn--ghost"
                style={{ width: '100%' }}
                onClick={() => navigate(`/profile/${user.username}`)}
              >
                View profile
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default UsersDirectory;

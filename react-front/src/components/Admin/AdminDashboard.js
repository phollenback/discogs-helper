import React, { useState, useEffect, useRef } from 'react';
import { useAuthContext } from '../../AuthContext';
import { useApi } from '../../utility/backSource';
import '../../styles/theme.css';

// Action Dropdown Component
const ActionDropdown = ({ user, currentUser, onEdit, onDelete }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const canDelete = user.username !== currentUser;

    return (
        <div style={{ position: 'relative' }} ref={dropdownRef}>
            <button
                className="grail-btn grail-btn--ghost grail-btn--sm"
                onClick={() => setIsOpen(!isOpen)}
                style={{ width: '100%', justifyContent: 'center' }}
                title="Actions"
            >
                <i className="fas fa-ellipsis-v"></i>
            </button>
            {isOpen && (
                <div style={{
                    position: 'absolute',
                    right: 0,
                    top: '100%',
                    marginTop: '0.25rem',
                    background: 'var(--grail-surface)',
                    border: '1px solid var(--grail-glass-border)',
                    borderRadius: 'var(--grail-radius-md)',
                    boxShadow: 'var(--grail-shadow)',
                    zIndex: 1000,
                    minWidth: '160px',
                    overflow: 'hidden'
                }}>
                    <button
                        className="grail-btn grail-btn--ghost grail-btn--sm"
                        onClick={() => {
                            setIsOpen(false);
                            onEdit();
                        }}
                        style={{
                            width: '100%',
                            borderRadius: 0,
                            justifyContent: 'flex-start',
                            padding: '0.65rem 1rem',
                            background: 'transparent',
                            color: 'var(--grail-text)',
                            borderBottom: '1px solid var(--grail-glass-border)'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                            e.currentTarget.style.color = 'var(--grail-accent)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'var(--grail-text)';
                        }}
                    >
                        <i className="fas fa-edit" style={{ marginRight: '0.5rem', width: '16px' }}></i>
                        Edit
                    </button>
                    <button
                        className="grail-btn grail-btn--ghost grail-btn--sm"
                        onClick={() => {
                            setIsOpen(false);
                            if (canDelete) {
                                onDelete();
                            }
                        }}
                        disabled={!canDelete}
                        style={{
                            width: '100%',
                            borderRadius: 0,
                            justifyContent: 'flex-start',
                            padding: '0.65rem 1rem',
                            background: 'transparent',
                                    color: canDelete ? 'var(--grail-text)' : 'var(--grail-muted)',
                            cursor: canDelete ? 'pointer' : 'not-allowed',
                            opacity: canDelete ? 1 : 0.5
                        }}
                        onMouseEnter={(e) => {
                            if (canDelete) {
                                e.currentTarget.style.background = 'rgba(255, 107, 107, 0.15)';
                                e.currentTarget.style.color = 'var(--grail-danger)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = canDelete ? 'var(--grail-text)' : 'var(--grail-muted)';
                        }}
                        title={canDelete ? 'Delete user' : 'Cannot delete yourself'}
                    >
                        <i className="fas fa-trash" style={{ marginRight: '0.5rem', width: '16px' }}></i>
                        Delete
                    </button>
                </div>
            )}
        </div>
    );
};

const AdminDashboard = () => {
  console.log('[AdminDashboard] Component rendering - VERSION WITH THEME STYLING');
  const { authState } = useAuthContext();
  console.log('[AdminDashboard] Auth state:', { isAdmin: authState.isAdmin, username: authState.username });
  const { getData, updateData, deleteData } = useApi();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ email: '', newPassword: '', discogsToken: '' });
  const [message, setMessage] = useState(null);
  const [showTokens, setShowTokens] = useState({});

  useEffect(() => {
    console.log('[AdminDashboard] useEffect triggered, isAdmin:', authState.isAdmin);
    if (authState.isAdmin === true || authState.isAdmin === 1) {
      console.log('[AdminDashboard] Admin access confirmed, loading users...');
      loadUsers();
    } else {
      console.log('[AdminDashboard] Access denied - not admin');
      setError('Access denied: Admin privileges required');
      setLoading(false);
    }
  }, [authState.isAdmin]);

  const loadUsers = async () => {
    console.log('[AdminDashboard] loadUsers called');
    try {
      setLoading(true);
      setError(null);
      console.log('[AdminDashboard] Fetching users from API...');
      const response = await getData('/api/admin/users');
      console.log('[AdminDashboard] Users response received:', { 
        userCount: response.users?.length || 0, 
        hasUsers: !!response.users 
      });
      setUsers(response.users || []);
      console.log('[AdminDashboard] Users state updated, count:', response.users?.length || 0);
    } catch (err) {
      console.error('[AdminDashboard] Error loading users:', err);
      setError('Failed to load users');
    } finally {
      setLoading(false);
      console.log('[AdminDashboard] Loading complete');
    }
  };

  const handleEditClick = (user) => {
    setEditingUser(user);
    setEditForm({ 
      email: user.email, 
      newPassword: '', 
      discogsToken: user.discogs_token || '' 
    });
    setMessage(null);
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setEditForm({ email: '', newPassword: '', discogsToken: '' });
    setMessage(null);
  };

  const handleSaveEdit = async () => {
    try {
      setMessage(null);
      
      if (!editForm.email && !editForm.newPassword && !editForm.discogsToken) {
        setMessage({ type: 'error', text: 'Please provide at least email, password, or Discogs token' });
        return;
      }

      if (editForm.newPassword && editForm.newPassword.length < 8) {
        setMessage({ type: 'error', text: 'Password must be at least 8 characters' });
        return;
      }

      await updateData(`/api/admin/users/${editingUser.username}`, editForm);
      setMessage({ type: 'success', text: 'User updated successfully' });
      handleCancelEdit();
      loadUsers();
    } catch (err) {
      console.error('[AdminDashboard] Error updating user:', err);
      setMessage({ type: 'error', text: 'Failed to update user' });
    }
  };

  const handleDeleteClick = async (username) => {
    if (!window.confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteData(`/api/admin/users/${username}`);
      setMessage({ type: 'success', text: 'User deleted successfully' });
      loadUsers();
    } catch (err) {
      console.error('[AdminDashboard] Error deleting user:', err);
      setMessage({ type: 'error', text: 'Failed to delete user' });
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const maskToken = (token) => {
    if (!token) return 'Not set';
    if (token.length <= 8) return '•'.repeat(token.length);
    return token.substring(0, 4) + '•'.repeat(token.length - 8) + token.substring(token.length - 4);
  };

  const toggleTokenVisibility = (userId) => {
    setShowTokens(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  console.log('[AdminDashboard] Render check - isAdmin:', authState.isAdmin, 'loading:', loading, 'users count:', users.length);

  if (authState.isAdmin !== true && authState.isAdmin !== 1) {
    console.log('[AdminDashboard] Rendering access denied message');
    return (
      <div style={{ padding: 'var(--grail-spacing-lg)', maxWidth: 'var(--grail-content-max-width)', margin: '0 auto' }}>
        <div className="grail-alert grail-alert--danger">
          <i className="fas fa-exclamation-triangle" style={{ marginRight: '0.5rem' }}></i>
          Access denied: Admin privileges required
        </div>
      </div>
    );
  }

  console.log('[AdminDashboard] Rendering main dashboard with theme styling');
  console.log('[AdminDashboard] Current state - loading:', loading, 'error:', error, 'users:', users.length, 'editingUser:', editingUser?.username);
  return (
    <div style={{ minHeight: '100vh', padding: 'var(--grail-spacing-lg)' }}>
      <div style={{ maxWidth: 'var(--grail-content-max-width)', margin: '0 auto' }}>
      {console.log('[AdminDashboard] Using THEME styling - grail-card, grail-table, grail-btn classes')}
        {/* Header */}
        <div className="grail-card" style={{ marginBottom: 'var(--grail-spacing-lg)' }}>
          <div className="grail-card-body">
            <h1 className="grail-section-title">
              <i className="fas fa-user-shield" style={{ marginRight: '0.75rem' }}></i>
              Admin Dashboard
            </h1>
            <p className="grail-section-subtitle" style={{ marginTop: '0.5rem', marginBottom: 0 }}>
              Welcome, {authState.username}
            </p>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`grail-alert grail-alert--${message.type === 'success' ? 'success' : 'danger'}`} style={{ marginBottom: 'var(--grail-spacing-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{message.text}</span>
              <button 
                type="button" 
                className="grail-btn grail-btn--ghost grail-btn--sm"
                onClick={() => setMessage(null)}
                style={{ padding: '0.25rem 0.5rem' }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          </div>
        )}

        {/* User Management */}
        {console.log('[AdminDashboard] Rendering User Management card with grail-card class')}
        <div className="grail-card">
          <div className="grail-card-header">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <h3 className="grail-section-title" style={{ marginBottom: 0 }}>
                <i className="fas fa-users" style={{ marginRight: '0.5rem' }}></i>
                User Management
              </h3>
              <button 
                onClick={loadUsers} 
                className="grail-btn grail-btn--primary grail-btn--sm" 
                disabled={loading}
              >
                <i className="fas fa-sync-alt" style={{ marginRight: '0.5rem' }}></i>
                Refresh
              </button>
            </div>
          </div>
          <div className="grail-card-body">
                {loading ? (
                  <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                    <div className="spinner-border" role="status" style={{ 
                      color: 'var(--grail-primary)',
                      width: '2rem',
                      height: '2rem',
                      border: '0.25em solid currentColor',
                      borderRightColor: 'transparent',
                      borderRadius: '50%',
                      display: 'inline-block',
                      animation: 'spinner-border 0.75s linear infinite'
                    }}>
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="grail-section-subtitle" style={{ marginTop: 'var(--grail-spacing-md)' }}>
                      Loading users...
                    </p>
                  </div>
                ) : error ? (
                  <div className="grail-alert grail-alert--danger" style={{ marginTop: 0, marginBottom: 0 }}>
                    <i className="fas fa-exclamation-triangle" style={{ marginRight: '0.5rem' }}></i>
                    {error}
                  </div>
                ) : users.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                    <p className="grail-section-subtitle">No users found</p>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    {console.log('[AdminDashboard] Rendering users table with grail-table class, user count:', users.length)}
                    <table className="grail-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Username</th>
                          <th>Email</th>
                          <th>Discogs Connection</th>
                          <th>Admin</th>
                          <th>Created</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((user) => (
                          <tr key={user.user_id}>
                            <td>{user.user_id}</td>
                            <td>
                              <strong>{user.username}</strong>
                              {user.username === authState.username && (
                                <span style={{ 
                                  marginLeft: '0.5rem',
                                  padding: '0.25rem 0.5rem',
                                  background: 'var(--grail-primary)',
                                  color: 'var(--grail-surface)',
                                  borderRadius: 'var(--grail-radius-md)',
                                  fontSize: '0.75rem',
                                  fontWeight: '500'
                                }}>
                                  You
                                </span>
                              )}
                            </td>
                            <td>{user.email}</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {user.discogs_connected ? (
                                  <span style={{
                                    padding: '0.25rem 0.5rem',
                                    background: 'rgba(40, 167, 69, 0.2)',
                                    color: '#28a745',
                                    borderRadius: 'var(--grail-radius-md)',
                                    fontSize: '0.75rem',
                                    fontWeight: '500',
                                    border: '1px solid rgba(40, 167, 69, 0.3)'
                                  }}>
                                    <i className="fas fa-check-circle" style={{ marginRight: '0.25rem' }}></i>Connected
                                  </span>
                                ) : (
                                  <span style={{
                                    padding: '0.25rem 0.5rem',
                                    background: 'rgba(108, 117, 125, 0.2)',
                                    color: '#6c757d',
                                    borderRadius: 'var(--grail-radius-md)',
                                    fontSize: '0.75rem',
                                    fontWeight: '500',
                                    border: '1px solid rgba(108, 117, 125, 0.3)'
                                  }}>
                                    <i className="fas fa-times-circle" style={{ marginRight: '0.25rem' }}></i>Not Connected
                                  </span>
                                )}
                                {user.discogs_token && (
                                  <button
                                    className="grail-btn grail-btn--ghost grail-btn--sm"
                                    onClick={() => toggleTokenVisibility(user.user_id)}
                                    title={showTokens[user.user_id] ? 'Hide token' : 'Show token'}
                                    style={{ padding: '0.25rem 0.5rem' }}
                                  >
                                    <i className={`fas ${showTokens[user.user_id] ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                  </button>
                                )}
                              </div>
                              {showTokens[user.user_id] && user.discogs_token && (
                                <div style={{ marginTop: '0.5rem' }}>
                                  <small style={{ 
                                    color: 'var(--grail-muted)', 
                                    fontFamily: 'monospace',
                                    fontSize: '0.75rem'
                                  }}>
                                    Token: {user.discogs_token.substring(0, 20)}...
                                  </small>
                                </div>
                              )}
                            </td>
                            <td>
                              {user.is_admin ? (
                                <span style={{
                                  padding: '0.25rem 0.5rem',
                                  background: 'rgba(255, 193, 7, 0.2)',
                                  color: '#ffc107',
                                  borderRadius: 'var(--grail-radius-md)',
                                  fontSize: '0.75rem',
                                  fontWeight: '500',
                                  border: '1px solid rgba(255, 193, 7, 0.3)'
                                }}>
                                  <i className="fas fa-shield-alt" style={{ marginRight: '0.25rem' }}></i>Admin
                                </span>
                              ) : (
                                <span style={{
                                  padding: '0.25rem 0.5rem',
                                  background: 'rgba(108, 117, 125, 0.2)',
                                  color: '#6c757d',
                                  borderRadius: 'var(--grail-radius-md)',
                                  fontSize: '0.75rem',
                                  fontWeight: '500',
                                  border: '1px solid rgba(108, 117, 125, 0.3)'
                                }}>
                                  User
                                </span>
                              )}
                            </td>
                            <td>{formatDate(user.created_at)}</td>
                            <td>
                              {console.log('[AdminDashboard] Rendering ActionDropdown for user:', user.username)}
                              <ActionDropdown 
                                user={user}
                                currentUser={authState.username}
                                onEdit={() => handleEditClick(user)}
                                onDelete={() => handleDeleteClick(user.username)}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
          </div>
        </div>

        {/* Edit Modal */}
        {editingUser && (
          <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 9999 }} onClick={(e) => { if (e.target === e.currentTarget) handleCancelEdit(); }}>
            <div className="modal-dialog">
              <div className="grail-card" style={{ margin: 0 }}>
                <div className="grail-card-header" style={{ borderBottom: '1px solid var(--grail-glass-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h5 className="grail-section-title" style={{ marginBottom: 0 }}>
                      <i className="fas fa-user-edit" style={{ marginRight: '0.5rem' }}></i>
                      Edit User: {editingUser.username}
                    </h5>
                    <button 
                      type="button" 
                      className="grail-btn grail-btn--ghost grail-btn--sm"
                      onClick={handleCancelEdit}
                      style={{ padding: '0.25rem 0.5rem' }}
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                </div>
                <div className="grail-card-body">
                  <div style={{ marginBottom: 'var(--grail-spacing-md)' }}>
                    <label htmlFor="editEmail" className="grail-section-subtitle" style={{ display: 'block', marginBottom: '0.5rem' }}>
                      Email
                    </label>
                    <input
                      type="email"
                      id="editEmail"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      style={{
                        width: '100%',
                        background: 'var(--grail-surface-alt)',
                        border: '1px solid var(--grail-glass-border)',
                        color: 'var(--grail-text)',
                        borderRadius: 'var(--grail-radius-md)',
                        padding: '0.5rem 1rem',
                        fontSize: '1rem'
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: 'var(--grail-spacing-md)' }}>
                    <label htmlFor="editPassword" className="grail-section-subtitle" style={{ display: 'block', marginBottom: '0.5rem' }}>
                      New Password
                    </label>
                    <input
                      type="password"
                      id="editPassword"
                      value={editForm.newPassword}
                      onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })}
                      placeholder="Leave blank to keep current password"
                      style={{
                        width: '100%',
                        background: 'var(--grail-surface-alt)',
                        border: '1px solid var(--grail-glass-border)',
                        color: 'var(--grail-text)',
                        borderRadius: 'var(--grail-radius-md)',
                        padding: '0.5rem 1rem',
                        fontSize: '1rem'
                      }}
                    />
                    <small style={{ color: 'var(--grail-muted)', marginTop: '0.25rem', display: 'block' }}>
                      Minimum 8 characters required
                    </small>
                  </div>
                  <div style={{ marginBottom: 'var(--grail-spacing-md)' }}>
                    <label htmlFor="editDiscogsToken" className="grail-section-subtitle" style={{ display: 'block', marginBottom: '0.5rem' }}>
                      <i className="fas fa-compact-disc" style={{ marginRight: '0.5rem' }}></i>
                      Discogs Token
                    </label>
                    <input
                      type="text"
                      id="editDiscogsToken"
                      value={editForm.discogsToken}
                      onChange={(e) => setEditForm({ ...editForm, discogsToken: e.target.value })}
                      placeholder="Enter Discogs API token"
                      style={{
                        width: '100%',
                        background: 'var(--grail-surface-alt)',
                        border: '1px solid var(--grail-glass-border)',
                        color: 'var(--grail-text)',
                        borderRadius: 'var(--grail-radius-md)',
                        padding: '0.5rem 1rem',
                        fontSize: '1rem',
                        fontFamily: 'monospace'
                      }}
                    />
                    <small style={{ color: 'var(--grail-muted)', marginTop: '0.25rem', display: 'block' }}>
                      Required for accessing user's Discogs collection and wantlist. 
                      Get token from <a href="https://www.discogs.com/settings/developers" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--grail-primary)' }}>Discogs Developer Settings</a>
                    </small>
                  </div>
                </div>
                <div className="grail-card-footer" style={{ borderTop: '1px solid var(--grail-glass-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <button 
                      type="button" 
                      className="grail-btn grail-btn--ghost"
                      onClick={handleCancelEdit}
                    >
                      Cancel
                    </button>
                    <button 
                      type="button" 
                      className="grail-btn grail-btn--primary"
                      onClick={handleSaveEdit}
                    >
                      <i className="fas fa-save" style={{ marginRight: '0.5rem' }}></i>
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;


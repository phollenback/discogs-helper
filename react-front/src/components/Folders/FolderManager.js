import React, { useState, useEffect } from 'react';
import { useAuthContext } from '../../AuthContext';
import '../../styles/theme.css';

const FolderManager = ({ username, onFolderChange }) => {
    const { authState } = useAuthContext();
    const [folders, setFolders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingFolder, setEditingFolder] = useState(null);
    const [newFolderName, setNewFolderName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedFolder, setSelectedFolder] = useState(null);
    const [folderItems, setFolderItems] = useState([]);
    const [loadingItems, setLoadingItems] = useState(false);
    const [collectionValue, setCollectionValue] = useState(null);
    const [showValueModal, setShowValueModal] = useState(false);

    const isOwnProfile = authState.username === username;

    useEffect(() => {
        loadFolders();
    }, [username]);

    // Handle Escape key to close folder items modal
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && selectedFolder) {
                setSelectedFolder(null);
                setFolderItems([]);
            }
        };
        
        if (selectedFolder) {
            document.addEventListener('keydown', handleEscape);
            // Prevent body scroll when modal is open
            document.body.style.overflow = 'hidden';
        }
        
        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [selectedFolder]);

    const loadFolders = async () => {
        try {
            setLoading(true);
            setError(null);
            
            // Call backend endpoint which will use user's OAuth token if connected
            const apiUrl = process.env.REACT_APP_API_URL || '';
            const token = localStorage.getItem('token');
            const response = await fetch(`${apiUrl}/api/users/${username}/folders`, {
                headers: {
                    'Authorization': token ? `Bearer ${token}` : '',
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to load folders: ${response.statusText}`);
            }
            
            const data = await response.json();
            setFolders(data.folders || []);
        } catch (err) {
            console.error('Error loading folders:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) {
            setError('Folder name is required');
            return;
        }

        try {
            setIsSubmitting(true);
            setError(null);
            
            // Call backend endpoint which will use user's OAuth token if connected
            const apiUrl = process.env.REACT_APP_API_URL || '';
            const token = localStorage.getItem('token');
            const response = await fetch(`${apiUrl}/api/users/${username}/folders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify({ 
                    name: newFolderName.trim()
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Failed to create folder: ${response.statusText}`);
            }
            
            setNewFolderName('');
            setShowCreateModal(false);
            await loadFolders();
            
            if (onFolderChange) {
                onFolderChange();
            }
        } catch (err) {
            console.error('Error creating folder:', err);
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateFolder = async (folderId, newName) => {
        if (!newName.trim()) {
            setError('Folder name is required');
            return;
        }

        try {
            setIsSubmitting(true);
            setError(null);
            
            const apiUrl = process.env.REACT_APP_API_URL || '';
            const response = await fetch(`${apiUrl}/api/users/${username}/folders/${folderId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ name: newName.trim() })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update folder');
            }
            
            setEditingFolder(null);
            await loadFolders();
            
            if (onFolderChange) {
                onFolderChange();
            }
        } catch (err) {
            console.error('Error updating folder:', err);
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteFolder = async (folderId, folderName) => {
        if (!window.confirm(`Are you sure you want to delete the folder "${folderName}"? This action cannot be undone.`)) {
            return;
        }

        try {
            setIsSubmitting(true);
            setError(null);
            
            const apiUrl = process.env.REACT_APP_API_URL || '';
            const response = await fetch(`${apiUrl}/api/users/${username}/folders/${folderId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to delete folder');
            }
            
            await loadFolders();
            
            if (onFolderChange) {
                onFolderChange();
            }
        } catch (err) {
            console.error('Error deleting folder:', err);
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const startEditFolder = (folder) => {
        setEditingFolder(folder);
        setNewFolderName(folder.name);
    };

    const loadFolderItems = async (folderId) => {
        try {
            setLoadingItems(true);
            setError(null);
            
            // Call backend endpoint which will use user's OAuth token if connected
            const apiUrl = process.env.REACT_APP_API_URL || '';
            const token = localStorage.getItem('token');
            const response = await fetch(`${apiUrl}/api/users/${username}/folders/${folderId}/releases`, {
                headers: {
                    'Authorization': token ? `Bearer ${token}` : '',
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to load folder items: ${response.statusText}`);
            }
            
            const data = await response.json();
            setFolderItems(data.releases || []);
        } catch (err) {
            console.error('Error loading folder items:', err);
            setError(err.message);
        } finally {
            setLoadingItems(false);
        }
    };

    const loadCollectionValue = async () => {
        if (!isOwnProfile) return;
        
        try {
            setError(null);
            
            // Call backend endpoint which will use user's OAuth token if connected
            const apiUrl = process.env.REACT_APP_API_URL || '';
            const token = localStorage.getItem('token');
            const response = await fetch(`${apiUrl}/api/users/${username}/collection/value`, {
                headers: {
                    'Authorization': token ? `Bearer ${token}` : '',
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(errorData.message || `Failed to load collection value: ${response.statusText}`);
            }
            
            const data = await response.json();
            setCollectionValue(data);
            setShowValueModal(true);
        } catch (err) {
            console.error('Error loading collection value:', err);
            setError(err.message);
        }
    };

    const handleFolderClick = (folder) => {
        setSelectedFolder(folder);
        loadFolderItems(folder.id);
    };

    const closeFolderModal = () => {
        setSelectedFolder(null);
        setFolderItems([]);
    };

    const cancelEdit = () => {
        setEditingFolder(null);
        setNewFolderName('');
    };

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: 'var(--grail-spacing-lg) 0' }}>
                <div className="spinner-border" role="status" style={{ color: 'var(--grail-primary)' }}>
                    <span className="visually-hidden">Loading folders...</span>
                </div>
                <p className="grail-section-subtitle" style={{ marginTop: 'var(--grail-spacing-md)' }}>
                    Loading folders...
                </p>
            </div>
        );
    }

    return (
        <div className="folder-manager">
            {/* Header */}
            <div className="grail-card" style={{ marginBottom: 'var(--grail-spacing-lg)' }}>
                <div className="grail-card-header">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                        <h3 className="grail-section-title" style={{ marginBottom: 0 }}>
                            <i className="fas fa-folder" style={{ marginRight: '0.5rem' }}></i>
                            Collection Folders
                        </h3>
                        {isOwnProfile && (
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <button 
                                    className="grail-btn grail-btn--primary grail-btn--sm"
                                    onClick={loadCollectionValue}
                                    disabled={isSubmitting}
                                >
                                    <i className="fas fa-dollar-sign" style={{ marginRight: '0.5rem' }}></i>
                                    Collection Value
                                </button>
                                <button 
                                    className="grail-btn grail-btn--accent grail-btn--sm"
                                    onClick={() => setShowCreateModal(true)}
                                    disabled={isSubmitting}
                                >
                                    <i className="fas fa-plus" style={{ marginRight: '0.5rem' }}></i>
                                    New Folder
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="grail-alert grail-alert--danger" style={{ marginBottom: 'var(--grail-spacing-md)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{error}</span>
                        <button 
                            type="button" 
                            className="grail-btn grail-btn--ghost grail-btn--sm"
                            onClick={() => setError(null)}
                            style={{ padding: '0.25rem 0.5rem' }}
                        >
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            )}

            {/* Folders List */}
            {folders.length === 0 ? (
                <div className="grail-card" style={{ textAlign: 'center', padding: 'var(--grail-spacing-xl) 0' }}>
                    <div className="grail-card-body">
                        <i className="fas fa-folder-open" style={{ fontSize: '3rem', color: 'var(--grail-muted)', marginBottom: 'var(--grail-spacing-md)' }}></i>
                        <p className="grail-section-subtitle">No folders found</p>
                        {isOwnProfile && (
                            <button 
                                className="grail-btn grail-btn--primary"
                                onClick={() => setShowCreateModal(true)}
                                style={{ marginTop: 'var(--grail-spacing-md)' }}
                            >
                                Create your first folder
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--grail-spacing-md)' }}>
                    {folders.map((folder) => (
                        <div key={folder.id} className="grail-card">
                            <div className="grail-card-body">
                                    {editingFolder && editingFolder.id === folder.id ? (
                                        /* Edit Mode */
                                        <div>
                                            <input
                                                type="text"
                                                value={newFolderName}
                                                onChange={(e) => setNewFolderName(e.target.value)}
                                                placeholder="Folder name"
                                                disabled={isSubmitting}
                                                style={{
                                                    width: '100%',
                                                    marginBottom: 'var(--grail-spacing-sm)',
                                                    background: 'var(--grail-surface-alt)',
                                                    border: '1px solid var(--grail-glass-border)',
                                                    color: 'var(--grail-text)',
                                                    borderRadius: 'var(--grail-radius-md)',
                                                    padding: '0.5rem 1rem',
                                                    fontSize: '1rem'
                                                }}
                                            />
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button
                                                    className="grail-btn grail-btn--primary grail-btn--sm"
                                                    onClick={() => handleUpdateFolder(folder.id, newFolderName)}
                                                    disabled={isSubmitting}
                                                    style={{ flex: 1 }}
                                                >
                                                    <i className="fas fa-check" style={{ marginRight: '0.5rem' }}></i>
                                                    Save
                                                </button>
                                                <button
                                                    className="grail-btn grail-btn--ghost grail-btn--sm"
                                                    onClick={cancelEdit}
                                                    disabled={isSubmitting}
                                                    style={{ flex: 1 }}
                                                >
                                                    <i className="fas fa-times" style={{ marginRight: '0.5rem' }}></i>
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        /* View Mode */
                                        <div>
                                            <div 
                                                style={{ 
                                                    cursor: 'pointer',
                                                    marginBottom: 'var(--grail-spacing-md)',
                                                    padding: 'var(--grail-spacing-sm)',
                                                    borderRadius: 'var(--grail-radius-md)',
                                                    transition: 'background 0.2s'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                onClick={() => handleFolderClick(folder)}
                                            >
                                                <h6 className="grail-section-title" style={{ marginBottom: '0.5rem' }}>
                                                    <i className="fas fa-folder" style={{ marginRight: '0.5rem', color: 'var(--grail-primary)' }}></i>
                                                    {folder.name}
                                                </h6>
                                                <p className="grail-section-subtitle" style={{ marginBottom: 0, fontSize: '0.875rem' }}>
                                                    <i className="fas fa-compact-disc" style={{ marginRight: '0.5rem' }}></i>
                                                    {folder.count || 0} items
                                                </p>
                                            </div>
                                            {isOwnProfile && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                    <button
                                                        className="grail-btn grail-btn--ghost grail-btn--sm"
                                                        onClick={() => handleFolderClick(folder)}
                                                        style={{ width: '100%', justifyContent: 'center' }}
                                                    >
                                                        <i className="fas fa-eye" style={{ marginRight: '0.5rem' }}></i>
                                                        View Items
                                                    </button>
                                                    {folder.id !== 0 && folder.id !== 1 && ( // Don't allow editing/deleting default folders
                                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                            <button
                                                                className="grail-btn grail-btn--accent grail-btn--sm"
                                                                onClick={() => startEditFolder(folder)}
                                                                disabled={isSubmitting}
                                                                style={{ flex: 1 }}
                                                            >
                                                                <i className="fas fa-edit" style={{ marginRight: '0.5rem' }}></i>
                                                                Edit
                                                            </button>
                                                            <button
                                                                className="grail-btn grail-btn--danger grail-btn--sm"
                                                                onClick={() => handleDeleteFolder(folder.id, folder.name)}
                                                                disabled={isSubmitting}
                                                                style={{ flex: 1 }}
                                                            >
                                                                <i className="fas fa-trash" style={{ marginRight: '0.5rem' }}></i>
                                                                Delete
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Folder Modal */}
            {showCreateModal && (
                <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 9999 }}>
                    <div className="modal-dialog">
                        <div className="grail-card" style={{ margin: 0 }}>
                            <div className="grail-card-header" style={{ borderBottom: '1px solid var(--grail-glass-border)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h5 className="grail-section-title" style={{ marginBottom: 0 }}>
                                        <i className="fas fa-folder-plus" style={{ marginRight: '0.5rem' }}></i>
                                        Create New Folder
                                    </h5>
                                    <button 
                                        type="button" 
                                        className="grail-btn grail-btn--ghost grail-btn--sm"
                                        onClick={() => setShowCreateModal(false)}
                                        disabled={isSubmitting}
                                        style={{ padding: '0.25rem 0.5rem' }}
                                    >
                                        <i className="fas fa-times"></i>
                                    </button>
                                </div>
                            </div>
                            <div className="grail-card-body">
                                <div style={{ marginBottom: 'var(--grail-spacing-md)' }}>
                                    <label htmlFor="folderName" className="grail-section-subtitle" style={{ display: 'block', marginBottom: '0.5rem' }}>
                                        Folder Name
                                    </label>
                                    <input
                                        type="text"
                                        id="folderName"
                                        value={newFolderName}
                                        onChange={(e) => setNewFolderName(e.target.value)}
                                        placeholder="Enter folder name"
                                        disabled={isSubmitting}
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                                handleCreateFolder();
                                            }
                                        }}
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
                            </div>
                            <div className="grail-card-footer" style={{ borderTop: '1px solid var(--grail-glass-border)' }}>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                    <button 
                                        type="button" 
                                        className="grail-btn grail-btn--ghost" 
                                        onClick={() => setShowCreateModal(false)}
                                        disabled={isSubmitting}
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="button" 
                                        className="grail-btn grail-btn--primary"
                                        onClick={handleCreateFolder}
                                        disabled={isSubmitting || !newFolderName.trim()}
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm" style={{ marginRight: '0.5rem' }} role="status"></span>
                                                Creating...
                                            </>
                                        ) : (
                                            <>
                                                <i className="fas fa-plus" style={{ marginRight: '0.5rem' }}></i>
                                                Create Folder
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Folder Items Modal */}
            {selectedFolder && (
                <div 
                    className="modal show d-block" 
                    tabIndex="-1" 
                    style={{ backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 9999 }}
                    onClick={closeFolderModal}
                >
                    <div 
                        className="modal-dialog modal-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="grail-card" style={{ margin: 0, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                            <div className="grail-card-header" style={{ borderBottom: '1px solid var(--grail-glass-border)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h5 className="grail-section-title" style={{ marginBottom: 0 }}>
                                        <i className="fas fa-folder" style={{ marginRight: '0.5rem' }}></i>
                                        {selectedFolder.name} - Items ({folderItems.length})
                                    </h5>
                                    <button 
                                        type="button" 
                                        className="grail-btn grail-btn--ghost grail-btn--sm"
                                        onClick={closeFolderModal}
                                        style={{ padding: '0.25rem 0.5rem' }}
                                        aria-label="Close modal"
                                    >
                                        <i className="fas fa-times"></i>
                                    </button>
                                </div>
                            </div>
                            <div className="grail-card-body" style={{ overflowY: 'auto', flex: 1 }}>
                                {loadingItems ? (
                                    <div style={{ textAlign: 'center', padding: 'var(--grail-spacing-xl) 0' }}>
                                        <div className="spinner-border" role="status" style={{ color: 'var(--grail-primary)' }}>
                                            <span className="visually-hidden">Loading items...</span>
                                        </div>
                                        <p className="grail-section-subtitle" style={{ marginTop: 'var(--grail-spacing-md)' }}>
                                            Loading items...
                                        </p>
                                    </div>
                                ) : folderItems.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: 'var(--grail-spacing-xl) 0' }}>
                                        <i className="fas fa-compact-disc" style={{ fontSize: '3rem', color: 'var(--grail-muted)', marginBottom: 'var(--grail-spacing-md)' }}></i>
                                        <p className="grail-section-subtitle">No items in this folder</p>
                                    </div>
                                ) : (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--grail-spacing-md)' }}>
                                        {folderItems.map((item, index) => (
                                            <div key={index} className="grail-card grail-card--compact">
                                                <div className="grail-card-body">
                                                    <div style={{ display: 'flex', gap: 'var(--grail-spacing-md)' }}>
                                                        {item.basic_information?.thumb && (
                                                            <img 
                                                                src={item.basic_information.thumb} 
                                                                alt={item.basic_information.title}
                                                                style={{ 
                                                                    width: '60px', 
                                                                    height: '60px', 
                                                                    objectFit: 'cover',
                                                                    borderRadius: 'var(--grail-radius-md)',
                                                                    flexShrink: 0
                                                                }}
                                                            />
                                                        )}
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <h6 className="grail-section-title" style={{ fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                                                                {item.basic_information?.title || 'Unknown Title'}
                                                            </h6>
                                                            <p className="grail-section-subtitle" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                                                                {item.basic_information?.artists?.[0]?.name || 'Unknown Artist'}
                                                            </p>
                                                            <p className="grail-section-subtitle" style={{ fontSize: '0.75rem', marginBottom: 0 }}>
                                                                {item.basic_information?.year || 'Unknown Year'} • 
                                                                {item.basic_information?.formats?.[0]?.name || 'Unknown Format'}
                                                            </p>
                                                            {item.rating && (
                                                                <div style={{ marginTop: '0.5rem' }}>
                                                                    <small style={{ color: 'var(--grail-highlight)' }}>
                                                                        {'★'.repeat(item.rating)}{'☆'.repeat(5-item.rating)}
                                                                    </small>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="grail-card-footer" style={{ borderTop: '1px solid var(--grail-glass-border)', padding: 'var(--grail-spacing-md)' }}>
                                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    <button 
                                        type="button" 
                                        className="grail-btn grail-btn--primary"
                                        onClick={closeFolderModal}
                                    >
                                        <i className="fas fa-times" style={{ marginRight: '0.5rem' }}></i>
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Collection Value Modal */}
            {showValueModal && collectionValue && (
                <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 9999 }}>
                    <div className="modal-dialog">
                        <div className="grail-card" style={{ margin: 0 }}>
                            <div className="grail-card-header" style={{ borderBottom: '1px solid var(--grail-glass-border)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h5 className="grail-section-title" style={{ marginBottom: 0 }}>
                                        <i className="fas fa-dollar-sign" style={{ marginRight: '0.5rem' }}></i>
                                        Collection Value
                                    </h5>
                                    <button 
                                        type="button" 
                                        className="grail-btn grail-btn--ghost grail-btn--sm"
                                        onClick={() => {
                                            setShowValueModal(false);
                                            setCollectionValue(null);
                                        }}
                                        style={{ padding: '0.25rem 0.5rem' }}
                                    >
                                        <i className="fas fa-times"></i>
                                    </button>
                                </div>
                            </div>
                            <div className="grail-card-body">
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--grail-spacing-md)', marginBottom: 'var(--grail-spacing-md)' }}>
                                    <div className="grail-card grail-card--compact" style={{ background: 'rgba(68, 210, 150, 0.15)', borderColor: 'rgba(68, 210, 150, 0.3)' }}>
                                        <div className="grail-card-body" style={{ textAlign: 'center' }}>
                                            <h6 className="grail-section-subtitle" style={{ marginBottom: '0.5rem' }}>Minimum</h6>
                                            <h4 style={{ color: 'var(--grail-success)', margin: 0 }}>
                                                ${(Number(collectionValue.minimum) || 0).toFixed(2)}
                                            </h4>
                                        </div>
                                    </div>
                                    <div className="grail-card grail-card--compact" style={{ background: 'rgba(217, 119, 6, 0.15)', borderColor: 'rgba(217, 119, 6, 0.3)' }}>
                                        <div className="grail-card-body" style={{ textAlign: 'center' }}>
                                            <h6 className="grail-section-subtitle" style={{ marginBottom: '0.5rem' }}>Median</h6>
                                            <h4 style={{ color: 'var(--grail-primary)', margin: 0 }}>
                                                ${(Number(collectionValue.median) || 0).toFixed(2)}
                                            </h4>
                                        </div>
                                    </div>
                                    <div className="grail-card grail-card--compact" style={{ background: 'rgba(255, 209, 102, 0.15)', borderColor: 'rgba(255, 209, 102, 0.3)' }}>
                                        <div className="grail-card-body" style={{ textAlign: 'center' }}>
                                            <h6 className="grail-section-subtitle" style={{ marginBottom: '0.5rem' }}>Maximum</h6>
                                            <h4 style={{ color: 'var(--grail-highlight)', margin: 0 }}>
                                                ${(Number(collectionValue.maximum) || 0).toFixed(2)}
                                            </h4>
                                        </div>
                                    </div>
                                </div>
                                <p style={{ textAlign: 'center', color: 'var(--grail-muted)', fontSize: '0.875rem', margin: 0 }}>
                                    Values are estimates based on Discogs marketplace data
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FolderManager;

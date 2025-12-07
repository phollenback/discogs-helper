import React, { useState, useEffect } from 'react';
import { useAuthContext } from '../../AuthContext';
import { useApi } from '../../utility/backSource'; 

const CollectionForm = (props) => {
    const { postData: postToBackend, getData } = useApi(); 
    const { authState } = useAuthContext();
    const [collectionData, setCollectionData] = useState({
        notes: '',
        rating: 0,
        price_threshold: 0,
    });
    const [oauthStatus, setOauthStatus] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [validationErrors, setValidationErrors] = useState({});

    // Check OAuth status on mount
    useEffect(() => {
        const checkOAuthStatus = async () => {
            if (!authState.userId) {
                setOauthStatus({ connected: false });
                return;
            }
            try {
                const status = await getData(`/api/users/${authState.userId}/discogs/oauth/status`);
                setOauthStatus(status);
            } catch (err) {
                console.error('[CollectionForm] Error checking OAuth status:', err);
                setOauthStatus({ connected: false, error: 'Failed to check Discogs connection' });
            }
        };
        checkOAuthStatus();
    }, [authState.userId, getData]);

    // Validate form inputs before submission
    const validateInputs = () => {
        const errors = {};
        
        // Validate rating (0-5, 0 means no rating)
        const rating = Number(collectionData.rating);
        if (isNaN(rating) || rating < 0 || rating > 5) {
            errors.rating = 'Rating must be between 0 and 5';
        }
        
        // Validate price threshold (must be non-negative)
        const priceThreshold = Number(collectionData.price_threshold);
        if (isNaN(priceThreshold) || priceThreshold < 0) {
            errors.price_threshold = 'Price threshold must be a non-negative number';
        }
        
        // Validate discogs ID
        const discogsId = Number(props.id);
        if (!discogsId || isNaN(discogsId) || discogsId <= 0) {
            errors.discogsId = 'Invalid release ID';
        }
        
        // Validate required record data
        if (!props.record || !props.record.title) {
            errors.record = 'Release information is missing';
        }
        
        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // Add item to collection - backend handles OAuth sync if connected
    const addToCollection = async () => {
        console.log("[CollectionForm][addToCollection] Starting collection add process");
        
        // Clear previous errors
        setError(null);
        setValidationErrors({});
        
        // Validate inputs before sending to backend
        if (!validateInputs()) {
            setError('Please fix the validation errors before submitting');
            return;
        }

        setIsLoading(true);
        
        try {
            // Prepare record data
            const recordData = {
                discogsId: Number(props.id),
                title: props.record.title || '',
                artist: props.record.artist || '',
                releaseYear: props.record.releaseYear ? props.record.releaseYear.toString() : '0',
                genre: props.record.genre || '',
                styles: props.record.styles || '',
                thumbUrl: props.record.thumb || props.record.thumbUrl || '',
                coverImageUrl: props.record.cover_image || props.record.coverImageUrl || ''
            };
            
            // Prepare user record data
            const userRecordData = {
                userId: authState.userId,
                discogsId: Number(props.id),
                rating: Number(collectionData.rating),
                notes: collectionData.notes || '',
                price_threshold: Number(collectionData.price_threshold),
                wishlist: 0,
                // Include record data for backend processing
                title: recordData.title,
                artist: recordData.artist,
                releaseYear: recordData.releaseYear,
                genre: recordData.genre,
                styles: recordData.styles,
                thumbUrl: recordData.thumbUrl,
                coverImageUrl: recordData.coverImageUrl
            };
            
            console.log('[CollectionForm][addToCollection] Sending to backend:', userRecordData);
            
            // Backend will handle:
            // 1. Check OAuth status
            // 2. If OAuth connected, sync with Discogs API first
            // 3. Then create/update MySQL records
            const response = await postToBackend(`/api/users/${authState.userId}/collection`, userRecordData);
            
            console.log('[CollectionForm][addToCollection] Successfully added to collection:', response);
            
            // Show success message based on OAuth status
            if (oauthStatus?.connected) {
                alert('Collection item added successfully and synced with Discogs!');
            } else {
                alert('Collection item added successfully to local database. Connect your Discogs account to sync with Discogs.');
            }
            
            // Reset form
            setCollectionData({
                notes: '',
                rating: 0,
                price_threshold: 0,
            });
            
        } catch (err) {
            console.error('[CollectionForm][addToCollection] Error:', err);
            
            // Parse error message from backend
            let errorMessage = 'Failed to add item to collection';
            if (err.response?.data?.message) {
                errorMessage = err.response.data.message;
            } else if (err.message) {
                errorMessage = err.message;
            }
            
            // Handle specific error cases
            if (err.response?.status === 401 || err.response?.status === 403) {
                errorMessage = 'Authentication failed. Please reconnect your Discogs account.';
            } else if (err.response?.status === 429) {
                errorMessage = 'Discogs API rate limit exceeded. Please try again in a moment.';
            } else if (err.response?.status === 404) {
                errorMessage = 'Release not found. Please verify the release ID.';
            } else if (err.response?.status === 500) {
                errorMessage = 'Server error. Please try again later.';
            }
            
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    // Handle button click
    const handleCollectionClick = async () => {
        if (!authState.username) {
            alert("Please sign in to use this feature.");
            return;
        }
        
        if (!authState.userId) {
            alert("User ID is missing. Please sign in again.");
            return;
        }
        
        await addToCollection();
    };

    // Handle form changes for collection data
    const handleCollectionChange = (e) => {
        const { name, value } = e.target;
        setCollectionData((prevState) => ({
            ...prevState,
            [name]: value,
        }));
        // Clear validation error for this field when user starts typing
        if (validationErrors[name]) {
            setValidationErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    return (
        <div className='col-6'>
            {/* OAuth Status Indicator */}
            {oauthStatus && (
                <div className={`alert ${oauthStatus.connected ? 'alert-success' : 'alert-info'} mb-3`} role="alert">
                    <strong>Discogs Status:</strong> {oauthStatus.connected 
                        ? `Connected${oauthStatus.discogsUsername ? ` (${oauthStatus.discogsUsername})` : ''}` 
                        : 'Not Connected - Item will be saved locally only'}
                </div>
            )}
            
            {/* Error Display */}
            {error && (
                <div className="alert alert-danger mb-3" role="alert">
                    <strong>Error:</strong> {error}
                </div>
            )}
            
            {/* Validation Errors */}
            {Object.keys(validationErrors).length > 0 && (
                <div className="alert alert-warning mb-3" role="alert">
                    <strong>Validation Errors:</strong>
                    <ul className="mb-0 mt-2">
                        {Object.entries(validationErrors).map(([field, message]) => (
                            <li key={field}>{message}</li>
                        ))}
                    </ul>
                </div>
            )}
            
            <button 
                onClick={handleCollectionClick} 
                className='btn btn-success w-100'
                disabled={isLoading || !authState.userId}
            >
                {isLoading ? 'Adding...' : 'Add To Collection'}
            </button>
            
            <form>
                <div className="mt-3">
                    <label>Notes:</label>
                    <textarea
                        name="notes"
                        value={collectionData.notes}
                        onChange={handleCollectionChange}
                        className={`form-control ${validationErrors.notes ? 'is-invalid' : ''}`}
                        placeholder="Optional notes about this release"
                        maxLength={1000}
                    />
                    {validationErrors.notes && (
                        <div className="invalid-feedback">{validationErrors.notes}</div>
                    )}
                </div>
                <div className="mt-3">
                    <label>Rating (0-5):</label>
                    <input
                        type="number"
                        name="rating"
                        min="0"
                        max="5"
                        value={collectionData.rating}
                        onChange={handleCollectionChange}
                        className={`form-control ${validationErrors.rating ? 'is-invalid' : ''}`}
                        placeholder="0 = no rating"
                    />
                    {validationErrors.rating && (
                        <div className="invalid-feedback">{validationErrors.rating}</div>
                    )}
                    <small className="form-text text-muted">0 = no rating, 1-5 = star rating</small>
                </div>
                <div className="mt-3">
                    <label>Price Threshold ($):</label>
                    <input
                        type="number"
                        name="price_threshold"
                        min="0"
                        step="0.01"
                        value={collectionData.price_threshold}
                        onChange={handleCollectionChange}
                        className={`form-control ${validationErrors.price_threshold ? 'is-invalid' : ''}`}
                        placeholder="0.00"
                    />
                    {validationErrors.price_threshold && (
                        <div className="invalid-feedback">{validationErrors.price_threshold}</div>
                    )}
                    <small className="form-text text-muted">Maximum price you'd pay for this release</small>
                </div>
            </form>
        </div>
    );
};

export default CollectionForm;

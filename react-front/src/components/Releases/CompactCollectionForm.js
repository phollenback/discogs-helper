import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthContext } from '../../AuthContext';
import { useApi } from '../../utility/backSource'; 

const CompactCollectionForm = (props) => {
    const { postData: postToBackend, putData: putToBackend } = useApi(); 
    const { authState } = useAuthContext();
    const [formData, setFormData] = useState({
        notes: '',
        rating: 0,
        price_threshold: 0,
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Add item to the Discogs collection via OAuth proxy
    const addToDiscogsCollection = async () => {
        console.log("[CompactCollectionForm][addToDiscogsCollection]");
        try {
            const endpoint = `/api/users/${authState.userId}/discogs/proxy/collection/folders/1/releases/${props.id}`;
            const data = {
                notes: formData.notes,
                rating: formData.rating,
            };
            const response = await postToBackend(endpoint, data);
            console.log('Discogs collection response:', response);
            return true;
        } catch (error) {
            console.error("Error adding to Discogs collection:", error);
            return true; // Continue with backend operations
        }
    };

    // Add item to the Discogs wantlist via OAuth proxy
    const addToDiscogsWantlist = async () => {
        console.log("[CompactCollectionForm][addToDiscogsWantlist]");
        try {
            const endpoint = `/api/users/${authState.userId}/discogs/proxy/wants/${props.id}`;
            const data = {
                notes: formData.notes,
                rating: formData.rating,
            };
            const response = await putToBackend(endpoint, data);
            console.log('Discogs wantlist response:', response);
            return true;
        } catch (error) {
            console.error("Error adding to Discogs wantlist:", error);
            return true; // Continue with backend operations
        }
    };

    const addToBackend = async (isWantlist = false) => {
        console.log("[CompactCollectionForm][addToBackend]", { isWantlist });

        try {
            // First, create the record in the records table
            const recordData = {
                discogsId: Number(props.id),
                title: props.record.title || '',
                artist: props.record.artist || '',
                releaseYear: props.record.releaseYear ? props.record.releaseYear.toString() : '0',
                genre: props.record.genre || '',
                styles: props.record.styles || '',
                thumbUrl: props.record.thumbUrl || '',
                coverImageUrl: props.record.coverImageUrl || ''
            };
            
            console.log('Record data:', recordData);
            const recordResponse = await postToBackend(`/api/records`, recordData); 
            console.log('Record Response:', recordResponse);

            // Then create the user record
            const userRecordData = {
                userId: authState.userId,
                discogsId: Number(props.id),
                rating: Number(formData.rating),
                notes: formData.notes,
                price_threshold: Number(formData.price_threshold),
                wishlist: isWantlist ? 1 : 0,
            };
            console.log('User record data:', userRecordData);

            const userRecordResponse = await postToBackend(`/api/users/${authState.userId}/collection`, userRecordData);
            console.log('User record Response:', userRecordResponse);
            return true;
        } catch (error) {
            console.error('Error during backend request:', error);
            return false;
        }
    };

    // Handle button click to add item to collection
    const handleCollectionClick = async () => {
        if (!authState.username) {
            alert("Please sign in to use this feature.");
            return;
        }

        setIsSubmitting(true);
        try {
            const discogsResponse = await addToDiscogsCollection();
            const backResponse = await addToBackend(false);

            if (backResponse && discogsResponse) {
                alert("✅ Added to your collection successfully!");
            } else if (backResponse) {
                alert("✅ Added to your collection! (Discogs sync may have failed)");
            } else {
                alert("❌ Failed to add to collection. Please try again.");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle button click to add item to wantlist
    const handleWantlistClick = async () => {
        if (!authState.username) {
            alert("Please sign in to use this feature.");
            return;
        }

        setIsSubmitting(true);
        try {
            const discogsResponse = await addToDiscogsWantlist();
            const backResponse = await addToBackend(true);

            if (backResponse && discogsResponse) {
                alert("✅ Added to your wantlist successfully!");
            } else if (backResponse) {
                alert("✅ Added to your wantlist! (Discogs sync may have failed)");
            } else {
                alert("❌ Failed to add to wantlist. Please try again.");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle form changes
    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData((prevState) => ({
            ...prevState,
            [name]: value,
        }));
    };

    // Render star rating input
    const renderStarRating = () => {
        return (
            <div className="d-flex align-items-center">
                <label className="me-2 mb-0">Rating:</label>
                <div className="d-flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            type="button"
                            className={`btn btn-sm me-1 ${formData.rating >= star ? 'btn-warning' : 'btn-outline-warning'}`}
                            onClick={() => setFormData(prev => ({ ...prev, rating: star }))}
                            style={{ fontSize: '0.8em' }}
                        >
                            ⭐
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="card mt-3">
            <div className="card-header">
                <h6 className="mb-0">
                    <i className="fas fa-plus-circle me-2"></i>
                    Add to Your Lists
                </h6>
            </div>
            <div className="card-body p-3">
                {/* Quick Action Buttons */}
                <div className="d-flex gap-2 mb-3">
                    <button 
                        onClick={handleCollectionClick} 
                        className="btn btn-success flex-fill"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                Adding...
                            </>
                        ) : (
                            <>
                                <i className="fas fa-music me-2"></i>
                                Add to Collection
                            </>
                        )}
                    </button>
                    <button 
                        onClick={handleWantlistClick} 
                        className="btn btn-primary flex-fill"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                Adding...
                            </>
                        ) : (
                            <>
                                <i className="fas fa-heart me-2"></i>
                                Add to Wantlist
                            </>
                        )}
                    </button>
                </div>

                {/* Price Check Button */}
                <div className="d-flex gap-2 mb-3">
                    <Link 
                        to={`/price-suggestion/${props.id}`}
                        className="btn btn-warning flex-fill"
                    >
                        <i className="fas fa-dollar-sign me-2"></i>
                        Check Market Prices
                    </Link>
                </div>

                {/* Quick Rating */}
                <div className="mb-3">
                    {renderStarRating()}
                </div>

                {/* Advanced Options Toggle */}
                <div className="text-center mb-2">
                    <button 
                        type="button"
                        className="btn btn-link btn-sm p-0"
                        onClick={() => setShowAdvanced(!showAdvanced)}
                    >
                        {showAdvanced ? (
                            <>
                                <i className="fas fa-chevron-up me-1"></i>
                                Hide Advanced Options
                            </>
                        ) : (
                            <>
                                <i className="fas fa-chevron-down me-1"></i>
                                Show Advanced Options
                            </>
                        )}
                    </button>
                </div>

                {/* Advanced Options */}
                {showAdvanced && (
                    <div className="border-top pt-3">
                        <div className="row g-2">
                            <div className="col-md-6">
                                <label className="form-label small">Notes</label>
                                <textarea
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleFormChange}
                                    className="form-control form-control-sm"
                                    rows="2"
                                    placeholder="Add your notes..."
                                />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label small">Price Threshold ($)</label>
                                <input
                                    type="number"
                                    name="price_threshold"
                                    value={formData.price_threshold}
                                    onChange={handleFormChange}
                                    className="form-control form-control-sm"
                                    placeholder="0.00"
                                    step="0.01"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CompactCollectionForm;




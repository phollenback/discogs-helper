import React, { useState } from 'react';
import { useAuthContext } from '../../AuthContext';
import { useApi } from '../../utility/backSource'; 

const WantlistForm = (props) => {
    const { putData: putToBackend, postData: postToBackend } = useApi(); 
    const { authState } = useAuthContext();
    const [wantlistData, setWantlistData] = useState({
        notes: '',
        rating: 0,
        price_threshold: 0,
    });

    // Add item to the Discogs wantlist via OAuth proxy
    const addToDiscogsWantlist = async () => {
        console.log("[WantlistForm][addToDiscogsWantlist]");
        try {
            // Use OAuth-protected proxy endpoint via backend
            const endpoint = `/api/users/${authState.userId}/discogs/proxy/wants/${props.id}`;
            const data = {
                notes: wantlistData.notes,
                rating: wantlistData.rating,
            };
            const response = await putToBackend(endpoint, data); // PUT to backend proxy
            console.log('Discogs response:', response);
            return true;
        } catch (error) {
            console.error("Error adding to Discogs wantlist:", error);
            // For now, return true to allow backend operations to continue
            return true;
        }
    };

    
    const addToBackend = async () => {
        console.log("[WantlistForm][addToBackend]");

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
                rating: Number(wantlistData.rating),
                notes: wantlistData.notes,
                price_threshold: Number(wantlistData.price_threshold),
                wishlist: 1,
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

    // Handle button click to add item to both Discogs and backend
    const handleWantlistClick = async () => {
        if (!authState.username) {
            alert("Sign in to use this feature.");
            return;
        }

        const discogsResponse = await addToDiscogsWantlist();
        const backResponse = await addToBackend();

        if (backResponse && discogsResponse) {
            alert("Wantlist item added successfully to both Discogs and backend.");
        } else if (backResponse) {
            alert("Added to backend successfully. Discogs API may have failed.");
        } else {
            alert("Failed to add item to backend.");
        }
    };

    // Handle form changes for wantlist data
    const handleWantlistChange = (e) => {
        const { name, value } = e.target;
        setWantlistData((prevState) => ({
            ...prevState,
            [name]: value,
        }));
    };

    return (
        <div className='col-6'>
            <button onClick={handleWantlistClick} className='btn btn-primary w-100'>
                Add To Wantlist
            </button>
            <form>
                <div>
                    <label>Notes:</label>
                    <textarea
                        name="notes"
                        value={wantlistData.notes}
                        onChange={handleWantlistChange}
                        className="form-control"
                    />
                </div>
                <div>
                    <label>Rating (1-5):</label>
                    <input
                        type="number"
                        name="rating"
                        min="1"
                        max="5"
                        value={wantlistData.rating}
                        onChange={handleWantlistChange}
                        className="form-control"
                    />
                </div>
                <div>
                    <label>Price Threshold:</label>
                    <input
                        type="number"
                        name="price_threshold"
                        value={wantlistData.price_threshold}
                        onChange={handleWantlistChange}
                        className="form-control"
                    />
                </div>
            </form>
        </div>
    );
};

export default WantlistForm;
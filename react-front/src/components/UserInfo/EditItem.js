import React, {useState} from 'react'
import { useParams, useNavigate } from 'react-router-dom';
import {useAuthContext } from '../../AuthContext';
import { useApi } from '../../utility/backSource'

const EditItem = () => {
    const { updateData } = useApi();
    const { authState } = useAuthContext();
    const { discogsId } = useParams();
    const navigate = useNavigate();
    const [values, setValues] = useState({
        notes: '',
        rating: 0,
        price_threshold: 0,
    })

    const handleRecordChange = (e) => {
        const { name, value } = e.target;
        setValues((prevState) => ({
            ...prevState,
            [name]: value,
        }));
    };

    const handleConfirmClick = async (e) => {
        e.preventDefault();
        
        const response = await updateData(`/api/users/${authState.userId}/collection/${discogsId}`, values);
        
        console.log(response);

        alert('Album edited successfully!')

        navigate('/wantlist');
    };
  return (
    <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
    <div className="container">
        <div className="row justify-content-center">
            <div className="col-md-8">
                <h3 className="text-center mb-4">Editing Record: {discogsId}</h3>
                <form>
                        <div>
                            <label>Notes:</label>
                            <textarea
                                name="notes"
                                value={values.notes}
                                onChange={handleRecordChange}
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
                                value={values.rating}
                                onChange={handleRecordChange}
                                className="form-control"
                            />
                        </div>
                        <div>
                            <label>Price Threshold:</label>
                            <input
                                type="number"
                                name="price_threshold"
                                value={values.price}
                                onChange={handleRecordChange}
                                className="form-control"
                            />
                        </div>
                        <button onClick={handleConfirmClick} className='btn btn-primary w-100'>
                            Confirm
                        </button>
                    </form>
            </div>
        </div>
    </div>
</div>
  )
}

export default EditItem

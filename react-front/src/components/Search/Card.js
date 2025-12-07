import React, { useState } from 'react';
import {useNavigate} from 'react-router-dom';

const Card = (props) => {
    const [adding, setAdding] = useState(false);
    const navigate = useNavigate();
    const handleCardClick = () => {
        navigate(`/release/${props.id}`)
    }
    const handleAddClick = async (e) => {
        e.stopPropagation();
        setAdding(true);
        await props.onAddToWantlist({
            id: props.id,
            title: props.albumTitle,
            thumb: props.thumb,
            year: props.year,
            genre: props.genre,
            style: props.style
        });
        setAdding(false);
    }
  return (
    <div className="card w-100 m-1"> 
        <button type='button' onClick={handleCardClick}>
            <div className='row'>
                <div className='col'>
                   <img src={props.thumb} alt='heyoooo' className='img-thumbnail rounded d-block'></img>
                </div>
                <div className='col'>
                    <b>{props.albumTitle}</b>
                </div>
            </div>
        </button>
        <button className='btn btn-primary m-2' onClick={handleAddClick} disabled={adding}>
            {adding ? 'Adding...' : 'Add to Wantlist'}
        </button>
    </div>
  )
}

export default Card;

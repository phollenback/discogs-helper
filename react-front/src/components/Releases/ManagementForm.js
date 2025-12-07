import React from 'react';
import WantlistForm from './WantlistForm';
import CollectionForm from './CollectionForm';


const ManagementForm = ({ id, record}) => {

  return (
    <>
        <WantlistForm id={id} record={record} />   
        <CollectionForm id={id} record={record} />
    </>
  )
}

export default ManagementForm

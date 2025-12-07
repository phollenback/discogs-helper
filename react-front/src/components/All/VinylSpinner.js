import React from 'react';

const VinylSpinner = ({ size = 72, label = 'Loading...' }) => {
  const style = {
    '--spinner-size': `${size}px`,
  };

  return (
    <div className="vinyl-spinner" role="status" aria-live="polite">
      <div className="vinyl-spinner__disc" style={style} />
      {label && <span className="vinyl-spinner__text">{label}</span>}
    </div>
  );
};

export default VinylSpinner;


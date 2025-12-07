import React from 'react';

const Footer = () => {
  return (
    <footer className="grail-footer mt-auto">
      <div className="footer-inner">
        <p className="mb-2">
          <i className="fas fa-wave-square me-2 text-warning"></i>
          Grailtopia · Grailmetrics
            </p>
        <p className="mb-0 small">
          © {new Date().getFullYear()} <strong>Digital Rev</strong>. All grooves reserved.
            </p>
      </div>
    </footer>
  );
};

export default Footer;


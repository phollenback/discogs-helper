import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuthContext } from '../../AuthContext';

const Navbar = () => {
  const { authState, isAuthenticated, logout } = useAuthContext();
  const [isOpen, setIsOpen] = useState(false);

  const toggleNavbar = () => {
    setIsOpen((previous) => !previous);
  };

  const closeNavbar = () => {
    setIsOpen(false);
  };
  const navLinkClass = ({ isActive }) =>
    `nav-link ${isActive ? 'active' : ''}`;

  const brandDestination = isAuthenticated ? '/home' : '/';

  const closeAndNavigate = (action) => {
    closeNavbar();
    if (typeof action === 'function') {
      action();
    }
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark grail-navbar">
      <div className="container-fluid px-lg-4">
        <Link to={brandDestination} className="navbar-brand" onClick={closeNavbar}>
          <span className="d-flex align-items-center gap-2">
            <span className="d-inline-flex align-items-center justify-content-center rounded-circle bg-white bg-opacity-10 p-2">
              <i className="fas fa-record-vinyl"></i>
            </span>
            <span>
              Grailtopia
              <span className="ms-2" style={{ 
                fontSize: '0.65rem', 
                fontWeight: 400, 
                opacity: 0.7,
                textTransform: 'none',
                letterSpacing: '0.02em'
              }}>
                by Digital Rev
              </span>
            </span>
          </span>
        </Link>
        <button
          className="navbar-toggler"
          type="button"
          onClick={toggleNavbar}
          aria-controls="navbarNav"
          aria-expanded={isOpen}
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className={`collapse navbar-collapse justify-content-end ${isOpen ? 'show' : ''}`} id="navbarNav">
          <ul className="navbar-nav align-items-lg-center gap-lg-2 me-lg-3">
            <li className="nav-item">
              <NavLink to="/search" className={navLinkClass} onClick={closeNavbar}>
                <i className="fas fa-search me-2"></i>
                Search
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/collection" className={navLinkClass} onClick={closeNavbar}>
                <i className="fas fa-compact-disc me-2"></i>
                Collection
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/wantlist" className={navLinkClass} onClick={closeNavbar}>
                <i className="fas fa-heart me-2"></i>
                Wantlist
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/meter" className={navLinkClass} onClick={closeNavbar}>
                <i className="fas fa-tachometer-alt me-2"></i>
                Meter
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/profile" className={navLinkClass} onClick={closeNavbar}>
                <i className="fas fa-user-circle me-2"></i>
                Profile
              </NavLink>
            </li>
            {(authState.isAdmin === true || authState.isAdmin === 1) && (
              <li className="nav-item">
                <NavLink to="/admin" className={navLinkClass} onClick={closeNavbar}>
                  <i className="fas fa-user-shield me-2"></i>
                  Admin
                </NavLink>
              </li>
            )}
          </ul>
          <div className="d-flex align-items-center gap-2 flex-column flex-lg-row">
            {isAuthenticated && (
              <span className="text-light text-opacity-75 small d-lg-inline d-none">
                Hi, {authState.username}
              </span>
            )}
            {!isAuthenticated ? (
              <Link
                to="/login"
                className="btn btn-outline-light btn-sm px-4"
                onClick={closeNavbar}
              >
                Login
              </Link>
            ) : (
              <button
                className="btn btn-warning btn-sm px-4"
                onClick={() => closeAndNavigate(logout)}
              >
                Logout
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

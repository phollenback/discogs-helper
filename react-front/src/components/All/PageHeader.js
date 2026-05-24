import React from 'react';

/**
 * Consistent page header for shell content areas.
 */
export default function PageHeader({ eyebrow, title, subtitle, actions, children }) {
  return (
    <header className="page-header">
      <div className="page-header__main">
        {eyebrow && <p className="page-header__eyebrow">{eyebrow}</p>}
        {title && <h1 className="page-header__title">{title}</h1>}
        {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
      {children}
    </header>
  );
}

import React from 'react';

type HeaderProps = {
  status?: string;
  loading?: boolean;
  onOpenDemo?: () => void;
};

export const Header: React.FC<HeaderProps> = ({ status, loading, onOpenDemo }) => {
  const hasResult = !!status;
  return (
    <header className="header">
      <div className="header-inner">
        {/* Logo + Brand */}
        <div className="header-brand">
          <img src="/qorvex-logo-reverse.png" alt="QORVEX official logo" className="header-logo" />
        </div>

        {/* Status bar */}
        <div className="header-meta">
          <span className="header-live">●</span>
          <span className="header-platform">QUANTUM SECURITY PLATFORM</span>
          <span className="header-sep">/</span>
          <span className="header-protocol">BB84 PROTOCOL SIMULATION</span>
          {hasResult && (
            <>
              <span className="header-sep">/</span>
              <span className={`header-status-tag ${status === 'PASS' ? 'pass' : status === 'ABORT' ? 'abort' : ''}`}>
                {loading ? 'COMPUTING...' : status}
              </span>
            </>
          )}
          <span className="header-version">V 2.0</span>
        </div>

        {/* Action button */}
        {onOpenDemo && (
          <button className="header-demo-btn" onClick={onOpenDemo}>
            ⚡ HACKATHON DEMO
          </button>
        )}
      </div>
    </header>
  );
};

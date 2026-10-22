import React from 'react';

export type TabKey = 
  | 'overview' 
  | 'lab' 
  | 'attack' 
  | 'analytics' 
  | 'batch' 
  | 'payment' 
  | 'postprocess' 
  | 'history';

type NavbarProps = {
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
};

const tabs: { key: TabKey; label: string; badge?: string }[] = [
  { key: 'overview', label: '01 / OVERVIEW' },
  { key: 'lab', label: '02 / BB84 LAB', badge: 'STEP VISUALIZER' },
  { key: 'attack', label: '03 / ATTACK CONTROL', badge: 'LIVE' },
  { key: 'analytics', label: '04 / QBER ANALYTICS' },
  { key: 'batch', label: '05 / MULTI-RUN BATCH' },
  { key: 'payment', label: '06 / FINTECH GATEWAY' },
  { key: 'postprocess', label: '07 / POST-PROCESSING' },
  { key: 'history', label: '08 / AUDIT REPORTS' }
];

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onSelectTab }) => {
  return (
    <nav className="tab-bar-container" aria-label="Main Navigation">
      <div className="tab-bar">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              className={`tab-btn ${isActive ? 'active' : ''}`}
              onClick={() => onSelectTab(tab.key)}
              role="tab"
              aria-selected={isActive}
            >
              <span>{tab.label}</span>
              {tab.badge && <span className="tab-pill">{tab.badge}</span>}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

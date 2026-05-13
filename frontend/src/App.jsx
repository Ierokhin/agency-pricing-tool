import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import Proposals from './pages/Proposals.jsx';
import ProposalEditor from './pages/ProposalEditor.jsx';
import ProposalView from './pages/ProposalView.jsx';
import Services from './pages/Services.jsx';
import Settings from './pages/Settings.jsx';

const IconDoc = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
);
const IconGrid = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
  </svg>
);
const IconBox = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/>
    <line x1="10" y1="12" x2="14" y2="12"/>
  </svg>
);
const IconSettings = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);
const IconHome = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <aside className="sidebar">
          <div className="sidebar-logo">
            <img src="/logo-white.png" alt="Brandon Archibald" />
          </div>
          <nav className="sidebar-nav">
            <div className="sidebar-section">
              <div className="sidebar-section-label">Main</div>
              <NavLink to="/" end className={({isActive}) => 'nav-item' + (isActive ? ' active' : '')}>
                <IconHome /> Dashboard
              </NavLink>
              <NavLink to="/proposals" className={({isActive}) => 'nav-item' + (isActive ? ' active' : '')}>
                <IconDoc /> Proposals
              </NavLink>
            </div>
            <div className="sidebar-section">
              <div className="sidebar-section-label">Catalog</div>
              <NavLink to="/services" className={({isActive}) => 'nav-item' + (isActive ? ' active' : '')}>
                <IconBox /> Services
              </NavLink>
            </div>
            <div className="sidebar-section">
              <div className="sidebar-section-label">Settings</div>
              <NavLink to="/settings" className={({isActive}) => 'nav-item' + (isActive ? ' active' : '')}>
                <IconSettings /> Settings
              </NavLink>
            </div>
          </nav>
          <div className="sidebar-footer">
            Brandon Archibald<br />Pricing Tool v1.0
          </div>
        </aside>

        <main className="main-area">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/proposals" element={<Proposals />} />
            <Route path="/proposals/new" element={<ProposalEditor />} />
            <Route path="/proposals/:id/edit" element={<ProposalEditor />} />
            <Route path="/proposals/:id" element={<ProposalView />} />
            <Route path="/services" element={<Services />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

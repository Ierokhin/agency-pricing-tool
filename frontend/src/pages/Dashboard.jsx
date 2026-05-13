import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, formatCurrency } from '../api.js';

export default function Dashboard() {
  const [proposals, setProposals] = useState([]);
  const [services, setServices] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([api.getProposals(), api.getServices(), api.getRoles()])
      .then(([p, s, r]) => { setProposals(p); setServices(s); setRoles(r); })
      .finally(() => setLoading(false));
  }, []);

  const recentProposals = [...proposals]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  const statusColors = {
    draft: 'badge-gray', sent: 'badge-blue', won: 'badge-green', lost: 'badge-red'
  };

  if (loading) return (
    <div className="page-content" style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%'}}>
      <div style={{color:'var(--gray-400)',fontFamily:'var(--font-display)',fontSize:18}}>Loading...</div>
    </div>
  );

  return (
    <div className="page-content">
      <div style={{marginBottom:32}}>
        <h1 style={{fontFamily:'var(--font-display)',fontSize:32,fontWeight:800,color:'var(--black)',lineHeight:1.1}}>
          Good day 👋
        </h1>
        <p style={{color:'var(--gray-400)',marginTop:6,fontSize:14}}>
          Brandon Archibald Pricing Tool
        </p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Proposals</div>
          <div className="stat-value">{proposals.length}</div>
          <div className="stat-sub">{proposals.filter(p=>p.status==='draft').length} drafts</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Won</div>
          <div className="stat-value" style={{color:'#166534'}}>{proposals.filter(p=>p.status==='won').length}</div>
          <div className="stat-sub">proposals accepted</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Services in catalog</div>
          <div className="stat-value">{services.length}</div>
          <div className="stat-sub">{roles.length} roles defined</div>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:20}}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">Recent Proposals</span>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/proposals/new')}>
              + New KP
            </button>
          </div>
          {recentProposals.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📄</div>
              <div className="empty-state-text">No proposals yet</div>
              <button className="btn btn-primary" onClick={() => navigate('/proposals/new')}>
                Create First Proposal
              </button>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Client</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentProposals.map(p => (
                  <tr key={p.id} style={{cursor:'pointer'}} onClick={() => navigate(`/proposals/${p.id}`)}>
                    <td style={{fontWeight:500,color:'var(--black)'}}>{p.name}</td>
                    <td>{p.clientName}</td>
                    <td><span className={`badge ${statusColors[p.status] || 'badge-gray'}`}>{p.status}</span></td>
                    <td className="text-muted text-sm">{new Date(p.createdAt).toLocaleDateString('en-GB')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <div className="card">
            <div className="card-header"><span className="card-title">Quick Actions</span></div>
            <div className="card-body" style={{display:'flex',flexDirection:'column',gap:8}}>
              <button className="btn btn-primary" onClick={() => navigate('/proposals/new')} style={{justifyContent:'center'}}>
                + New Proposal
              </button>
              <button className="btn btn-secondary" onClick={() => navigate('/services')} style={{justifyContent:'center'}}>
                Manage Services
              </button>
              <button className="btn btn-secondary" onClick={() => navigate('/settings')} style={{justifyContent:'center'}}>
                Settings & Roles
              </button>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><span className="card-title">Catalog</span></div>
            <div className="card-body">
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                <span style={{fontSize:13,color:'var(--gray-500)'}}>Services</span>
                <span style={{fontFamily:'var(--font-display)',fontWeight:700}}>{services.length}</span>
              </div>
              <div style={{display:'flex',justifyContent:'space-between'}}>
                <span style={{fontSize:13,color:'var(--gray-500)'}}>Roles</span>
                <span style={{fontFamily:'var(--font-display)',fontWeight:700}}>{roles.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

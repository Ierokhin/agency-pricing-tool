import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, formatCurrency } from '../api.js';

const STATUS_COLORS = { draft:'badge-gray', sent:'badge-blue', won:'badge-green', lost:'badge-red' };
const STATUS_OPTIONS = ['draft','sent','won','lost'];

export default function Proposals() {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = () => api.getProposals().then(setProposals).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete "${name}"?`)) return;
    await api.deleteProposal(id);
    setProposals(p => p.filter(x => x.id !== id));
  };

  const handleDuplicate = async (id) => {
    const copy = await api.duplicateProposal(id);
    navigate(`/proposals/${copy.id}/edit`);
  };

  const sorted = [...proposals].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Proposals</h1>
          <p className="page-subtitle">{proposals.length} total</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/proposals/new')}>
          + New Proposal
        </button>
      </div>

      <div className="card">
        {loading ? (
          <div className="empty-state"><div className="empty-state-text">Loading...</div></div>
        ) : sorted.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-text">No proposals yet. Create your first one!</div>
            <button className="btn btn-primary" onClick={() => navigate('/proposals/new')}>Create Proposal</button>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name / Client</th>
                <th>Services</th>
                <th>Currency</th>
                <th>Status</th>
                <th>Date</th>
                <th style={{width:120}}></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(p => (
                <tr key={p.id}>
                  <td>
                    <div style={{fontWeight:500,color:'var(--black)',cursor:'pointer'}} onClick={() => navigate(`/proposals/${p.id}`)}>
                      {p.name}
                    </div>
                    {p.clientName && <div className="text-muted text-sm">{p.clientName}</div>}
                  </td>
                  <td className="text-muted">{(p.services||[]).length} services</td>
                  <td><span className="pill">{p.currency}</span></td>
                  <td><span className={`badge ${STATUS_COLORS[p.status]||'badge-gray'}`}>{p.status}</span></td>
                  <td className="text-muted text-sm">{new Date(p.createdAt).toLocaleDateString('en-GB')}</td>
                  <td>
                    <div className="td-actions">
                      <button className="btn btn-ghost btn-sm btn-icon" title="View" onClick={() => navigate(`/proposals/${p.id}`)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      </button>
                      <button className="btn btn-ghost btn-sm btn-icon" title="Edit" onClick={() => navigate(`/proposals/${p.id}/edit`)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button className="btn btn-ghost btn-sm btn-icon" title="Duplicate" onClick={() => handleDuplicate(p.id)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                      </button>
                      <button className="btn btn-ghost btn-sm btn-icon" title="Download PDF"
                        onClick={() => window.open(api.getPdfUrl(p.id), '_blank')}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      </button>
                      <button className="btn btn-ghost btn-sm btn-icon" title="Delete" onClick={() => handleDelete(p.id, p.name)}
                        style={{color:'#DC2626'}}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

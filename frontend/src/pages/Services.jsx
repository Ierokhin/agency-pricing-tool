import { useState, useEffect } from 'react';
import { api, calcServiceCost, calcClientPrice, formatCurrency } from '../api.js';

function ServiceModal({ service, groups, roles, onSave, onClose }) {
  const isEdit = !!service?.id;
  const [form, setForm] = useState({
    internalName: service?.internalName || '',
    publicName: service?.publicName || '',
    groupId: service?.groupId || (groups[0]?.id || ''),
    margin: service?.margin ?? 60,
    description: service?.description || '',
    duration: service?.duration || '',
    notes: service?.notes || '',
    contractors: service?.contractors?.map(c => ({...c})) || []
  });
  const [saving, setSaving] = useState(false);

  const addContractor = () => {
    setForm(f => ({
      ...f,
      contractors: [...f.contractors, {
        roleId: roles[0]?.id || null,
        paymentType: 'hourly',
        hours: 0,
        fixedAmount: 0
      }]
    }));
  };

  const updateContractor = (idx, field, value) => {
    setForm(f => ({
      ...f,
      contractors: f.contractors.map((c, i) => i === idx ? { ...c, [field]: value } : c)
    }));
  };

  const removeContractor = (idx) => {
    setForm(f => ({ ...f, contractors: f.contractors.filter((_, i) => i !== idx) }));
  };

  const contractorCost = form.contractors.reduce((sum, c) => {
    if (c.paymentType === 'fixed') return sum + (parseFloat(c.fixedAmount) || 0);
    const role = roles.find(r => r.id === parseInt(c.roleId));
    return sum + (parseFloat(c.hours) || 0) * (role?.hourlyRate || 0);
  }, 0);

  const clientPrice = contractorCost / (1 - Math.min(parseFloat(form.margin)||0, 99.9) / 100);

  const handleSave = async () => {
    if (!form.internalName) return alert('Internal name is required');
    if (!form.groupId) return alert('Please select a group');
    setSaving(true);
    try {
      const payload = {
        ...form,
        groupId: parseInt(form.groupId),
        contractors: form.contractors.map(c => ({
          ...c,
          roleId: c.roleId ? parseInt(c.roleId) : null,
          hours: parseFloat(c.hours) || 0,
          fixedAmount: parseFloat(c.fixedAmount) || 0
        }))
      };
      const result = isEdit
        ? await api.updateService(service.id, payload)
        : await api.createService(payload);
      onSave(result);
    } catch (e) {
      alert('Error: ' + e.message);
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-xl" style={{maxHeight:'90vh'}}>
        <div className="modal-header">
          <span className="modal-title">{isEdit ? 'Edit Service' : 'New Service'}</span>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
            {/* Left column */}
            <div>
              <div className="section-heading" style={{marginBottom:14}}>Service Info</div>
              <div className="form-group">
                <label>Internal Name (working) *</label>
                <input value={form.internalName} onChange={e => setForm(f=>({...f,internalName:e.target.value}))}
                  placeholder="e.g. Logo Basic Package" />
                <div style={{fontSize:11,color:'var(--gray-400)',marginTop:3}}>Used internally only</div>
              </div>
              <div className="form-group">
                <label>Public Name (in KP)</label>
                <input value={form.publicName} onChange={e => setForm(f=>({...f,publicName:e.target.value}))}
                  placeholder="e.g. Logo" />
                <div style={{fontSize:11,color:'var(--gray-400)',marginTop:3}}>Shown to client. If empty, uses internal name.</div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Service Group *</label>
                  <select value={form.groupId} onChange={e => setForm(f=>({...f,groupId:e.target.value}))}>
                    {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Margin (%)</label>
                  <input type="number" min="0" max="99" value={form.margin}
                    onChange={e => setForm(f=>({...f,margin:parseFloat(e.target.value)||0}))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Duration</label>
                  <input value={form.duration} onChange={e => setForm(f=>({...f,duration:e.target.value}))}
                    placeholder="e.g. ~2 weeks" />
                </div>
              </div>
              <div className="form-group">
                <label>Description / Deliverables</label>
                <textarea value={form.description} rows={3}
                  onChange={e => setForm(f=>({...f,description:e.target.value}))}
                  placeholder="List what's included..." />
              </div>
              <div className="form-group">
                <label>Notes (shown on KP page)</label>
                <input value={form.notes} onChange={e => setForm(f=>({...f,notes:e.target.value}))}
                  placeholder="e.g. Additional font costs billed separately" />
              </div>

              {/* Price preview */}
              <div style={{background:'var(--black)',borderRadius:'var(--radius)',padding:'12px 16px',marginTop:8}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                  <span style={{fontSize:12,color:'rgba(255,255,255,0.5)'}}>Contractor cost</span>
                  <span style={{fontFamily:'var(--font-display)',fontWeight:700,color:'white',fontSize:13}}>
                    €{Math.round(contractorCost).toLocaleString()}
                  </span>
                </div>
                <div style={{display:'flex',justifyContent:'space-between'}}>
                  <span style={{fontSize:12,color:'rgba(255,255,255,0.5)'}}>Client price ({form.margin}% margin)</span>
                  <span style={{fontFamily:'var(--font-display)',fontWeight:700,color:'white',fontSize:16}}>
                    €{Math.round(clientPrice).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Right column - contractors */}
            <div>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
                <div className="section-heading">Contractor Costs</div>
                <button className="btn btn-secondary btn-sm" onClick={addContractor}>+ Add Row</button>
              </div>

              {form.contractors.length === 0 && (
                <div style={{color:'var(--gray-400)',fontSize:13,textAlign:'center',padding:'20px 0',border:'1.5px dashed var(--gray-200)',borderRadius:'var(--radius)'}}>
                  No contractors added yet
                  <br /><button className="btn btn-ghost btn-sm" style={{marginTop:8}} onClick={addContractor}>Add first row</button>
                </div>
              )}

              {form.contractors.map((c, idx) => {
                const role = roles.find(r => r.id === parseInt(c.roleId));
                const rate = role?.hourlyRate || 0;
                const cost = c.paymentType === 'fixed' ? parseFloat(c.fixedAmount)||0 : (parseFloat(c.hours)||0) * rate;
                return (
                  <div key={idx} style={{background:'var(--gray-50)',borderRadius:'var(--radius)',padding:'10px 12px',marginBottom:8,border:'1px solid var(--gray-100)'}}>
                    <div style={{display:'flex',gap:8,marginBottom:8,alignItems:'flex-end'}}>
                      {/* Role */}
                      <div style={{flex:1}}>
                        <label style={{marginBottom:3}}>Role</label>
                        <select value={c.roleId||''} onChange={e => updateContractor(idx,'roleId',e.target.value)}>
                          <option value="">Custom role</option>
                          {roles.map(r => (
                            <option key={r.id} value={r.id}>{r.name} (€{r.hourlyRate}/h)</option>
                          ))}
                        </select>
                      </div>
                      {/* Type */}
                      <div style={{width:110}}>
                        <label style={{marginBottom:3}}>Type</label>
                        <select value={c.paymentType} onChange={e => updateContractor(idx,'paymentType',e.target.value)}>
                          <option value="hourly">Hourly</option>
                          <option value="fixed">Fixed</option>
                        </select>
                      </div>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => removeContractor(idx)}
                        style={{color:'#DC2626',marginBottom:1}}>✕</button>
                    </div>
                    <div style={{display:'flex',gap:8,alignItems:'flex-end'}}>
                      {c.paymentType === 'hourly' ? (
                        <>
                          <div style={{flex:1}}>
                            <label style={{marginBottom:3}}>Hours</label>
                            <input type="number" step="0.1" min="0" value={c.hours}
                              onChange={e => updateContractor(idx,'hours',e.target.value)} />
                          </div>
                          <div style={{flex:1}}>
                            <label style={{marginBottom:3}}>Rate (€/h)</label>
                            <input type="number" step="0.01" value={role?.hourlyRate||0} readOnly
                              style={{background:'var(--gray-100)',color:'var(--gray-500)'}} />
                          </div>
                        </>
                      ) : (
                        <div style={{flex:1}}>
                          <label style={{marginBottom:3}}>Fixed Amount (€)</label>
                          <input type="number" step="1" min="0" value={c.fixedAmount}
                            onChange={e => updateContractor(idx,'fixedAmount',e.target.value)} />
                        </div>
                      )}
                      <div style={{textAlign:'right',paddingBottom:2}}>
                        <div style={{fontSize:10,color:'var(--gray-400)'}}>Cost</div>
                        <div style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:14}}>
                          €{Math.round(cost).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Service'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Services() {
  const [services, setServices] = useState([]);
  const [groups, setGroups] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'new' | service object

  const load = () => Promise.all([api.getServices(), api.getServiceGroups(), api.getRoles()])
    .then(([s, g, r]) => { setServices(s); setGroups(g.sort((a,b)=>a.sortOrder-b.sortOrder)); setRoles(r); })
    .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const handleSave = (result) => {
    setServices(prev => {
      const idx = prev.findIndex(s => s.id === result.id);
      return idx >= 0 ? prev.map(s => s.id === result.id ? result : s) : [...prev, result];
    });
    setModal(null);
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete service "${name}"?`)) return;
    await api.deleteService(id);
    setServices(s => s.filter(x => x.id !== id));
  };

  // Group services
  const servicesByGroup = {};
  groups.forEach(g => {
    const gs = services.filter(s => s.groupId === g.id);
    if (gs.length) servicesByGroup[g.id] = gs;
  });

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Services</h1>
          <p className="page-subtitle">{services.length} services in catalog</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('new')}>+ Add Service</button>
      </div>

      {loading ? (
        <div className="empty-state"><span style={{color:'var(--gray-400)'}}>Loading...</span></div>
      ) : services.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📦</div>
          <div className="empty-state-text">No services yet. Add your first service.</div>
          <button className="btn btn-primary" onClick={() => setModal('new')}>Add Service</button>
        </div>
      ) : (
        groups.filter(g => servicesByGroup[g.id]).map(g => (
          <div key={g.id} className="card" style={{marginBottom:20}}>
            <div className="card-header">
              <span className="card-title">{g.name}</span>
              <span className="badge badge-gray">{servicesByGroup[g.id].length} services</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Public Name</th>
                  <th>Internal Name</th>
                  <th>Margin</th>
                  <th>Cost</th>
                  <th>Client Price</th>
                  <th>Duration</th>
                  <th>Contractors</th>
                  <th style={{width:80}}></th>
                </tr>
              </thead>
              <tbody>
                {servicesByGroup[g.id].map(svc => {
                  const cost = calcServiceCost(svc, roles);
                  const price = calcClientPrice(cost, svc.margin);
                  return (
                    <tr key={svc.id}>
                      <td style={{fontWeight:500,color:'var(--black)'}}>{svc.publicName || svc.internalName}</td>
                      <td className="text-muted text-sm">{svc.internalName}</td>
                      <td><span className="badge badge-gray">{svc.margin}%</span></td>
                      <td className="text-mono" style={{fontSize:13}}>€{Math.round(cost).toLocaleString()}</td>
                      <td style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:14}}>
                        €{Math.round(price).toLocaleString()}
                      </td>
                      <td className="text-muted text-sm">{svc.duration||'—'}</td>
                      <td className="text-muted text-sm">{(svc.contractors||[]).length} roles</td>
                      <td>
                        <div className="td-actions">
                          <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setModal(svc)} title="Edit">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          <button className="btn btn-ghost btn-sm btn-icon" onClick={() => handleDelete(svc.id, svc.internalName)} style={{color:'#DC2626'}} title="Delete">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))
      )}

      {modal && (
        <ServiceModal
          service={modal === 'new' ? null : modal}
          groups={groups}
          roles={roles}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

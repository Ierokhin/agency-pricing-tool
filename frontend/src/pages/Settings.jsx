import { useState, useEffect } from 'react';
import { api } from '../api.js';

function InlineEdit({ value, onSave, type = 'text', placeholder = '' }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  const submit = () => { if (val !== value) onSave(val); setEditing(false); };
  if (!editing) return (
    <span style={{cursor:'pointer',borderBottom:'1px dashed var(--gray-300)'}} onClick={() => { setVal(value); setEditing(true); }}>
      {value || <span style={{color:'var(--gray-400)'}}>{placeholder}</span>}
    </span>
  );
  return (
    <input autoFocus type={type} value={val} onChange={e=>setVal(e.target.value)}
      onBlur={submit} onKeyDown={e=>{if(e.key==='Enter')submit();if(e.key==='Escape'){setVal(value);setEditing(false);}}}
      style={{width:Math.max(80,String(val).length*8+24)+'px',padding:'2px 6px',fontSize:'inherit'}} />
  );
}

function Section({ title, children }) {
  return (
    <div className="card" style={{marginBottom:24}}>
      <div className="card-header"><span className="card-title">{title}</span></div>
      {children}
    </div>
  );
}

export default function Settings() {
  const [roles, setRoles] = useState([]);
  const [groups, setGroups] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [indexPct, setIndexPct] = useState('');
  const [indexMsg, setIndexMsg] = useState('');

  const [newRole, setNewRole] = useState({ name:'', hourlyRate:'' });
  const [newGroup, setNewGroup] = useState({ name:'', duration:'' });
  const [newPM, setNewPM] = useState({ name:'', commission:'' });

  const load = () => Promise.all([api.getRoles(), api.getServiceGroups(), api.getPaymentMethods()])
    .then(([r, g, p]) => { setRoles(r); setGroups(g.sort((a,b)=>a.sortOrder-b.sortOrder)); setPaymentMethods(p); })
    .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  // Roles
  const addRole = async () => {
    if (!newRole.name || !newRole.hourlyRate) return;
    const r = await api.createRole({ name: newRole.name, hourlyRate: parseFloat(newRole.hourlyRate) });
    setRoles(prev => [...prev, r]);
    setNewRole({ name:'', hourlyRate:'' });
  };
  const updateRole = async (id, field, value) => {
    const role = roles.find(r => r.id === id);
    const updated = { ...role, [field]: field === 'hourlyRate' ? parseFloat(value) : value };
    const result = await api.updateRole(id, updated);
    setRoles(prev => prev.map(r => r.id === id ? result : r));
  };
  const deleteRole = async (id) => {
    if (!confirm('Delete this role?')) return;
    await api.deleteRole(id);
    setRoles(r => r.filter(x => x.id !== id));
  };

  // Groups
  const addGroup = async () => {
    if (!newGroup.name) return;
    const g = await api.createServiceGroup({ name: newGroup.name, sortOrder: groups.length, duration: newGroup.duration });
    setGroups(prev => [...prev, g]);
    setNewGroup({ name:'', duration:'' });
  };
  const updateGroup = async (id, field, value) => {
    const g = groups.find(x => x.id === id);
    const result = await api.updateServiceGroup(id, { ...g, [field]: value });
    setGroups(prev => prev.map(x => x.id === id ? result : x));
  };
  const deleteGroup = async (id) => {
    if (!confirm('Delete this group?')) return;
    await api.deleteServiceGroup(id);
    setGroups(g => g.filter(x => x.id !== id));
  };

  // Payment methods
  const addPM = async () => {
    if (!newPM.name) return;
    const pm = await api.createPaymentMethod({ name: newPM.name, commission: parseFloat(newPM.commission)||0 });
    setPaymentMethods(prev => [...prev, pm]);
    setNewPM({ name:'', commission:'' });
  };
  const updatePM = async (id, field, value) => {
    const pm = paymentMethods.find(p => p.id === id);
    const updated = { ...pm, [field]: field === 'commission' ? parseFloat(value) : value };
    const result = await api.updatePaymentMethod(id, updated);
    setPaymentMethods(prev => prev.map(p => p.id === id ? result : p));
  };
  const deletePM = async (id) => {
    if (!confirm('Delete this payment method?')) return;
    await api.deletePaymentMethod(id);
    setPaymentMethods(p => p.filter(x => x.id !== id));
  };

  // Indexation
  const applyIndexation = async () => {
    if (!indexPct || isNaN(indexPct)) return;
    if (!confirm(`Apply ${indexPct}% indexation to ALL hourly rates and fixed amounts? This cannot be undone.`)) return;
    await api.applyIndexation(indexPct);
    setIndexMsg(`✓ Applied ${indexPct}% indexation successfully`);
    setIndexPct('');
    load();
    setTimeout(() => setIndexMsg(''), 4000);
  };

  if (loading) return <div className="page-content"><div className="empty-state">Loading...</div></div>;

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Roles, service groups, payment methods</p>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24}}>
        <div>
          {/* Roles */}
          <Section title="Roles & Hourly Rates">
            <table>
              <thead>
                <tr>
                  <th>Role Name</th>
                  <th>Rate (€/h)</th>
                  <th style={{width:40}}></th>
                </tr>
              </thead>
              <tbody>
                {roles.map(r => (
                  <tr key={r.id}>
                    <td>
                      <InlineEdit value={r.name} onSave={v => updateRole(r.id, 'name', v)} placeholder="Role name" />
                    </td>
                    <td>
                      <div style={{display:'flex',alignItems:'center',gap:4}}>
                        €<InlineEdit type="number" value={String(r.hourlyRate)} onSave={v => updateRole(r.id, 'hourlyRate', v)} />
                        /h
                      </div>
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => deleteRole(r.id)} style={{color:'#DC2626'}}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{padding:'12px 16px',borderTop:'1px solid var(--gray-100)',display:'flex',gap:8}}>
              <input value={newRole.name} onChange={e=>setNewRole(f=>({...f,name:e.target.value}))}
                placeholder="Role name" style={{flex:2}} onKeyDown={e=>e.key==='Enter'&&addRole()} />
              <input type="number" value={newRole.hourlyRate} onChange={e=>setNewRole(f=>({...f,hourlyRate:e.target.value}))}
                placeholder="€/h" style={{width:80}} onKeyDown={e=>e.key==='Enter'&&addRole()} />
              <button className="btn btn-primary btn-sm" onClick={addRole}>Add</button>
            </div>
          </Section>

          {/* Indexation */}
          <Section title="Bulk Rate Indexation">
            <div className="card-body">
              <p style={{fontSize:13,color:'var(--gray-500)',marginBottom:12,lineHeight:1.5}}>
                Apply a percentage increase to all hourly rates and fixed amounts across all services.
                <strong style={{color:'var(--gray-700)'}}> This action overwrites existing values.</strong>
              </p>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <input type="number" value={indexPct} onChange={e=>setIndexPct(e.target.value)}
                  placeholder="e.g. 10" style={{width:100}} />
                <span style={{color:'var(--gray-500)'}}>%</span>
                <button className="btn btn-secondary" onClick={applyIndexation}>Apply Indexation</button>
              </div>
              {indexMsg && (
                <div style={{marginTop:10,padding:'8px 12px',background:'#DCFCE7',color:'#166534',borderRadius:'var(--radius)',fontSize:13}}>
                  {indexMsg}
                </div>
              )}
            </div>
          </Section>
        </div>

        <div>
          {/* Service groups */}
          <Section title="Service Groups">
            <table>
              <thead>
                <tr>
                  <th>Group Name</th>
                  <th>Duration</th>
                  <th>Order</th>
                  <th style={{width:40}}></th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g, idx) => (
                  <tr key={g.id}>
                    <td>
                      <InlineEdit value={g.name} onSave={v => updateGroup(g.id, 'name', v)} placeholder="Group name" />
                    </td>
                    <td>
                      <InlineEdit value={g.duration || ''} onSave={v => updateGroup(g.id, 'duration', v)} placeholder="e.g. ~2 weeks" />
                    </td>
                    <td className="text-muted text-sm">{idx + 1}</td>
                    <td>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => deleteGroup(g.id)} style={{color:'#DC2626'}}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{padding:'12px 16px',borderTop:'1px solid var(--gray-100)',display:'flex',gap:8}}>
              <input value={newGroup.name} onChange={e=>setNewGroup(f=>({...f,name:e.target.value}))}
                placeholder="Group name" style={{flex:2}} onKeyDown={e=>e.key==='Enter'&&addGroup()} />
              <input value={newGroup.duration} onChange={e=>setNewGroup(f=>({...f,duration:e.target.value}))}
                placeholder="Duration" style={{flex:1}} onKeyDown={e=>e.key==='Enter'&&addGroup()} />
              <button className="btn btn-primary btn-sm" onClick={addGroup}>Add</button>
            </div>
          </Section>

          {/* Payment methods */}
          <Section title="Payment Methods">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Commission</th>
                  <th style={{width:40}}></th>
                </tr>
              </thead>
              <tbody>
                {paymentMethods.map(pm => (
                  <tr key={pm.id}>
                    <td>
                      <InlineEdit value={pm.name} onSave={v => updatePM(pm.id, 'name', v)} placeholder="Method name" />
                    </td>
                    <td>
                      <div style={{display:'flex',alignItems:'center',gap:4}}>
                        <InlineEdit type="number" value={String(pm.commission)} onSave={v => updatePM(pm.id, 'commission', v)} />%
                      </div>
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => deletePM(pm.id)} style={{color:'#DC2626'}}>✕</button>
                    </td>
                  </tr>
                ))}
                {paymentMethods.length === 0 && (
                  <tr><td colSpan="3" style={{color:'var(--gray-400)',fontStyle:'italic',textAlign:'center'}}>No payment methods</td></tr>
                )}
              </tbody>
            </table>
            <div style={{padding:'12px 16px',borderTop:'1px solid var(--gray-100)',display:'flex',gap:8}}>
              <input value={newPM.name} onChange={e=>setNewPM(f=>({...f,name:e.target.value}))}
                placeholder="Method name" style={{flex:2}} onKeyDown={e=>e.key==='Enter'&&addPM()} />
              <input type="number" value={newPM.commission} onChange={e=>setNewPM(f=>({...f,commission:e.target.value}))}
                placeholder="%" style={{width:70}} onKeyDown={e=>e.key==='Enter'&&addPM()} />
              <button className="btn btn-primary btn-sm" onClick={addPM}>Add</button>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, formatCurrency, calcServiceCost, calcClientPrice, roundUp100, calcServiceFinalPrice } from '../api.js';

export default function ProposalEditor() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [services, setServices] = useState([]);
  const [groups, setGroups] = useState([]);
  const [roles, setRoles] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [expandedGroups, setExpandedGroups] = useState({});

  const [form, setForm] = useState({
    name: '',
    clientName: '',
    serviceIds: [],
    paymentMethodId: '',
    currency: 'EUR',
    partnerDiscountEnabled: false,
    partnerDiscount: 20,
    finalDiscount: 0,
    exchangeRate: 1,
    status: 'draft'
  });

  useEffect(() => {
    const loads = [api.getServices(), api.getServiceGroups(), api.getRoles(), api.getPaymentMethods()];
    if (isEdit) loads.push(api.getProposal(id));
    Promise.all(loads).then(([svcs, grps, rls, pms, proposal]) => {
      setServices(svcs);
      const sorted = grps.sort((a,b) => a.sortOrder - b.sortOrder);
      setGroups(sorted);
      setRoles(rls);
      setPaymentMethods(pms);
      // Expand all groups by default
      const exp = {};
      sorted.forEach(g => { exp[g.id] = true; });
      setExpandedGroups(exp);
      if (proposal) {
        setForm({
          name: proposal.name || '',
          clientName: proposal.clientName || '',
          serviceIds: (proposal.services || []).map(ps => ps.serviceId),
          paymentMethodId: proposal.paymentMethodId || '',
          currency: proposal.currency || 'EUR',
          partnerDiscountEnabled: proposal.partnerDiscountEnabled || false,
          partnerDiscount: proposal.partnerDiscount ?? 20,
          finalDiscount: proposal.finalDiscount || 0,
          exchangeRate: proposal.exchangeRate || 1,
          status: proposal.status || 'draft'
        });
      }
    }).finally(() => setLoading(false));
  }, [id]);

  const fetchRate = async () => {
    try {
      const { rate } = await api.getExchangeRate();
      setForm(f => ({ ...f, exchangeRate: rate }));
    } catch {}
  };

  const toggleService = (sid) => {
    setForm(f => ({
      ...f,
      serviceIds: f.serviceIds.includes(sid)
        ? f.serviceIds.filter(x => x !== sid)
        : [...f.serviceIds, sid]
    }));
  };

  const toggleGroup = (gid) => {
    setExpandedGroups(prev => ({ ...prev, [gid]: !prev[gid] }));
  };

  const handleSubmit = async () => {
    if (!form.name) return alert('Please enter a proposal name');
    if (!form.serviceIds.length) return alert('Please select at least one service');
    setSaving(true);
    try {
      const payload = { ...form, serviceIds: form.serviceIds };
      const result = isEdit
        ? await api.updateProposal(parseInt(id), payload)
        : await api.createProposal(payload);
      navigate(`/proposals/${result.id}`);
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  // Pricing options for calcServiceFinalPrice
  const pm = paymentMethods.find(p => p.id === parseInt(form.paymentMethodId));
  const pricingOpts = {
    partnerEnabled: form.partnerDiscountEnabled,
    partnerDiscount: form.partnerDiscount,
    paymentCommission: pm?.commission || 0,
    exchangeRate: form.currency === 'USD' ? (form.exchangeRate || 1) : 1
  };
  const sym = form.currency === 'USD' ? '$' : '€';

  // Live price preview - grouped by block
  const selectedServices = services.filter(s => form.serviceIds.includes(s.id));
  const groupedBlocks = {};
  selectedServices.forEach(s => {
    const gid = s.groupId;
    if (!groupedBlocks[gid]) groupedBlocks[gid] = { groupId: gid, services: [], total: 0 };
    const finalPrice = calcServiceFinalPrice(s, roles, pricingOpts);
    groupedBlocks[gid].services.push({ s, finalPrice });
    groupedBlocks[gid].total += finalPrice;
  });
  const blocks = Object.values(groupedBlocks);
  let subtotal = blocks.reduce((sum, b) => sum + b.total, 0);
  let finalTotal = subtotal * (1 - (form.finalDiscount || 0) / 100);

  // Services grouped for selection
  const servicesByGroup = {};
  groups.forEach(g => {
    const gs = services.filter(s => s.groupId === g.id);
    if (gs.length) servicesByGroup[g.id] = gs;
  });

  if (loading) return <div className="page-content" style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%'}}><span style={{color:'var(--gray-400)'}}>Loading...</span></div>;

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">{isEdit ? 'Edit Proposal' : 'New Proposal'}</h1>
          <p className="page-subtitle">Fill in the details and select services</p>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button className="btn btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving...' : (isEdit ? 'Save Changes' : 'Create Proposal')}
          </button>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 340px',gap:24,alignItems:'start'}}>
        {/* Left column */}
        <div style={{display:'flex',flexDirection:'column',gap:20}}>

          {/* Basic info */}
          <div className="card">
            <div className="card-header"><span className="card-title">Project Info</span></div>
            <div className="card-body">
              <div className="form-row">
                <div className="form-group" style={{marginBottom:0}}>
                  <label>Proposal Name *</label>
                  <input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. No Limit Branding" />
                </div>
                <div className="form-group" style={{marginBottom:0}}>
                  <label>Client Name</label>
                  <input value={form.clientName} onChange={e => setForm(f=>({...f,clientName:e.target.value}))} placeholder="e.g. No Limit" />
                </div>
              </div>
            </div>
          </div>

          {/* Services - collapsible groups */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Select Services</span>
              <span className="badge badge-gray">{form.serviceIds.length} selected</span>
            </div>
            <div className="card-body" style={{paddingTop:8}}>
              {groups.filter(g => servicesByGroup[g.id]).map(g => {
                const isExpanded = expandedGroups[g.id];
                const groupServices = servicesByGroup[g.id];
                const selectedInGroup = groupServices.filter(s => form.serviceIds.includes(s.id)).length;
                return (
                  <div key={g.id} style={{marginBottom:4}}>
                    {/* Group header - clickable to expand/collapse */}
                    <div
                      onClick={() => toggleGroup(g.id)}
                      style={{
                        display:'flex',alignItems:'center',justifyContent:'space-between',
                        padding:'10px 12px',cursor:'pointer',borderRadius:'var(--radius)',
                        background:'var(--gray-100)',marginBottom:isExpanded?4:0,
                        transition:'background .15s'
                      }}
                    >
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <span style={{fontSize:12,color:'var(--gray-400)',transform:isExpanded?'rotate(90deg)':'rotate(0)',transition:'transform .15s'}}>▶</span>
                        <span style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:13,color:'var(--black)',textTransform:'uppercase',letterSpacing:'.04em'}}>
                          {g.name}
                        </span>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        {selectedInGroup > 0 && (
                          <span className="badge badge-black">{selectedInGroup} / {groupServices.length}</span>
                        )}
                        <span className="badge badge-gray">{groupServices.length}</span>
                      </div>
                    </div>

                    {/* Services list - collapsible */}
                    {isExpanded && (
                      <div style={{paddingLeft:4,paddingBottom:8}}>
                        {groupServices.map(svc => {
                          const isSelected = form.serviceIds.includes(svc.id);
                          const cost = calcServiceCost(svc, roles);
                          const finalPrice = calcServiceFinalPrice(svc, roles, pricingOpts);
                          return (
                            <div key={svc.id}
                              onClick={() => toggleService(svc.id)}
                              style={{
                                display:'flex',alignItems:'center',gap:12,padding:'10px 12px',
                                borderRadius:'var(--radius)',cursor:'pointer',marginBottom:3,
                                border: `1.5px solid ${isSelected ? 'var(--black)' : 'var(--gray-200)'}`,
                                background: isSelected ? 'var(--black)' : 'var(--white)',
                                transition:'all .15s'
                              }}>
                              <div style={{width:16,height:16,borderRadius:3,border:`2px solid ${isSelected?'white':'var(--gray-300)'}`,background:isSelected?'white':'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                                {isSelected && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                              </div>
                              <div style={{flex:1}}>
                                <div style={{fontWeight:500,fontSize:13,color:isSelected?'white':'var(--black)'}}>
                                  {svc.publicName || svc.internalName}
                                </div>
                                {svc.internalName !== svc.publicName && (
                                  <div style={{fontSize:11,color:isSelected?'rgba(255,255,255,0.5)':'var(--gray-400)'}}>
                                    {svc.internalName}
                                  </div>
                                )}
                              </div>
                              <div style={{textAlign:'right'}}>
                                <div style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:13,color:isSelected?'white':'var(--black)'}}>
                                  {sym}{finalPrice.toLocaleString()}
                                </div>
                                <div style={{fontSize:11,color:isSelected?'rgba(255,255,255,0.5)':'var(--gray-400)'}}>
                                  cost: {sym}{Math.round(cost * (form.currency === 'USD' ? (form.exchangeRate||1) : 1)).toLocaleString()}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
              {groups.length === 0 && (
                <div className="empty-state" style={{padding:'20px 0'}}>
                  <div className="empty-state-text">No services in catalog yet.</div>
                  <button className="btn btn-secondary btn-sm" onClick={() => navigate('/services')}>Add Services</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column - pricing options + preview */}
        <div style={{display:'flex',flexDirection:'column',gap:16,position:'sticky',top:0}}>

          {/* Pricing options */}
          <div className="card">
            <div className="card-header"><span className="card-title">Pricing Options</span></div>
            <div className="card-body" style={{display:'flex',flexDirection:'column',gap:14}}>

              <div className="form-group" style={{marginBottom:0}}>
                <label>Currency</label>
                <div style={{display:'flex',gap:8}}>
                  {['EUR','USD'].map(c => (
                    <button key={c} className={`btn ${form.currency===c?'btn-primary':'btn-secondary'}`}
                      style={{flex:1,justifyContent:'center'}}
                      onClick={() => { setForm(f=>({...f,currency:c})); if(c==='USD') fetchRate(); }}>
                      {c}
                    </button>
                  ))}
                </div>
                {form.currency === 'USD' && (
                  <div style={{marginTop:6,display:'flex',gap:6,alignItems:'center'}}>
                    <input type="number" step="0.001" value={form.exchangeRate}
                      onChange={e => setForm(f=>({...f,exchangeRate:parseFloat(e.target.value)||1}))}
                      style={{width:'100%'}} placeholder="1.12" />
                    <button className="btn btn-ghost btn-sm" onClick={fetchRate} title="Fetch current rate">↻</button>
                  </div>
                )}
              </div>

              <div className="form-group" style={{marginBottom:0}}>
                <label>Payment Method</label>
                <select value={form.paymentMethodId} onChange={e => setForm(f=>({...f,paymentMethodId:e.target.value}))}>
                  <option value="">No payment method</option>
                  {paymentMethods.map(pm => (
                    <option key={pm.id} value={pm.id}>{pm.name} (+{pm.commission}%)</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{marginBottom:8,display:'block'}}>Partner Price</label>
                <div className="inline-toggle" style={{marginBottom:form.partnerDiscountEnabled?8:0}}>
                  <label className="toggle">
                    <input type="checkbox" checked={form.partnerDiscountEnabled}
                      onChange={e => setForm(f=>({...f,partnerDiscountEnabled:e.target.checked}))} />
                    <div className="toggle-track"></div>
                    <div className="toggle-thumb"></div>
                  </label>
                  <span>{form.partnerDiscountEnabled ? 'Enabled' : 'Disabled'}</span>
                </div>
                {form.partnerDiscountEnabled && (
                  <div style={{display:'flex',alignItems:'center',gap:6}}>
                    <input type="number" min="0" max="100" value={form.partnerDiscount}
                      onChange={e => setForm(f=>({...f,partnerDiscount:parseFloat(e.target.value)||0}))}
                      style={{width:'100%'}} />
                    <span style={{flexShrink:0,color:'var(--gray-500)'}}>%</span>
                  </div>
                )}
              </div>

              <div className="form-group" style={{marginBottom:0}}>
                <label>Final Discount (%)</label>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <input type="number" min="0" max="100" value={form.finalDiscount}
                    onChange={e => setForm(f=>({...f,finalDiscount:parseFloat(e.target.value)||0}))}
                    placeholder="0" />
                  <span style={{flexShrink:0,color:'var(--gray-500)'}}>%</span>
                </div>
              </div>

              <div className="form-group" style={{marginBottom:0}}>
                <label>Status</label>
                <select value={form.status} onChange={e => setForm(f=>({...f,status:e.target.value}))}>
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="won">Won</option>
                  <option value="lost">Lost</option>
                </select>
              </div>
            </div>
          </div>

          {/* Live pricing preview */}
          <div className="card">
            <div className="card-header"><span className="card-title">Price Preview</span></div>
            <div className="card-body" style={{paddingTop:12}}>
              {blocks.length === 0 ? (
                <div style={{color:'var(--gray-400)',fontSize:13,textAlign:'center',padding:'16px 0'}}>
                  Select services to see pricing
                </div>
              ) : (
                <>
                  {blocks.map(b => {
                    const g = groups.find(g => g.id === b.groupId);
                    return (
                      <div key={b.groupId} className="pricing-block">
                        <span className="pricing-block-name">{g?.name || 'Block'}</span>
                        <span className="pricing-block-amount">
                          {sym}{b.total.toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                  <div style={{marginTop:8}}>
                    {form.finalDiscount > 0 ? (
                      <>
                        <div style={{display:'flex',justifyContent:'space-between',padding:'8px 0',color:'var(--gray-400)'}}>
                          <span>Subtotal</span>
                          <span className="strikethrough">{sym}{subtotal.toLocaleString()}</span>
                        </div>
                        <div className="pricing-total">
                          <span className="pricing-total-label">TOTAL (−{form.finalDiscount}%)</span>
                          <span className="pricing-total-amount">{sym}{Math.round(finalTotal).toLocaleString()}</span>
                        </div>
                      </>
                    ) : (
                      <div className="pricing-total">
                        <span className="pricing-total-label">TOTAL</span>
                        <span className="pricing-total-amount">{sym}{subtotal.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                  {pm && pm.commission > 0 && (
                    <div style={{fontSize:11,color:'var(--gray-400)',marginTop:6}}>
                      * {pm.name} commission (+{pm.commission}%) included per service
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

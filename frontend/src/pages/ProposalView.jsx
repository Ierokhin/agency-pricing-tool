import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, formatCurrency, calcServiceCost, calcClientPrice, roundUp100 } from '../api.js';

const STATUS_COLORS = { draft:'badge-gray', sent:'badge-blue', won:'badge-green', lost:'badge-red' };

export default function ProposalView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [proposal, setProposal] = useState(null);
  const [pricing, setPricing] = useState(null);
  const [services, setServices] = useState([]);
  const [groups, setGroups] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getProposal(parseInt(id)),
      api.getProposalPricing(parseInt(id)),
      api.getServices(),
      api.getServiceGroups(),
      api.getRoles()
    ]).then(([p, pr, svcs, grps, rls]) => {
      setProposal(p);
      setPricing(pr);
      setServices(svcs);
      setGroups(grps.sort((a,b) => a.sortOrder - b.sortOrder));
      setRoles(rls);
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="page-content" style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%'}}><span style={{color:'var(--gray-400)'}}>Loading...</span></div>;
  if (!proposal) return <div className="page-content"><div className="empty-state">Proposal not found</div></div>;

  const sym = proposal.currency === 'USD' ? '$' : '€';
  const rate = proposal.currency === 'USD' ? (proposal.exchangeRate || 1) : 1;

  // Build blocks view
  const selectedServiceIds = (proposal.services || []).map(ps => ps.serviceId);
  const selectedServices = services.filter(s => selectedServiceIds.includes(s.id));

  const groupedBlocks = {};
  selectedServices.forEach(svc => {
    const gid = svc.groupId;
    if (!groupedBlocks[gid]) groupedBlocks[gid] = { groupId: gid, services: [] };
    const contractorCost = calcServiceCost(svc, roles);
    let clientPrice = calcClientPrice(contractorCost, svc.margin);
    if (proposal.partnerDiscountEnabled) clientPrice *= (1 - (proposal.partnerDiscount / 100));
    groupedBlocks[gid].services.push({ svc, contractorCost, clientPrice });
  });
  const blocks = groups.filter(g => groupedBlocks[g.id]).map(g => {
    const block = groupedBlocks[g.id];
    const rawTotal = block.services.reduce((s, x) => s + x.clientPrice, 0);
    const blockTotal = roundUp100(rawTotal);
    return { group: g, services: block.services, rawTotal, blockTotal };
  });

  const subtotal = blocks.reduce((s, b) => s + b.blockTotal, 0);
  const pm = proposal.paymentMethod;
  const afterCommission = subtotal * (1 + (pm?.commission || 0) / 100);
  const finalTotal = afterCommission * (1 - (proposal.finalDiscount || 0) / 100);
  const totalContractorCost = selectedServices.reduce((s, svc) => s + calcServiceCost(svc, roles), 0);
  const margin = finalTotal > 0 ? ((finalTotal - totalContractorCost * rate) / finalTotal * 100) : 0;

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header" style={{alignItems:'flex-start'}}>
        <div>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
            <h1 className="page-title">{proposal.name}</h1>
            <span className={`badge ${STATUS_COLORS[proposal.status]||'badge-gray'}`}>{proposal.status}</span>
          </div>
          {proposal.clientName && <p className="page-subtitle">Client: {proposal.clientName}</p>}
          <p className="page-subtitle">{new Date(proposal.createdAt).toLocaleDateString('en-GB', {day:'numeric',month:'long',year:'numeric'})}</p>
        </div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <button className="btn btn-secondary" onClick={() => navigate(`/proposals/${id}/edit`)}>
            Edit
          </button>
          <button className="btn btn-secondary" onClick={async () => {
            const copy = await api.duplicateProposal(parseInt(id));
            navigate(`/proposals/${copy.id}/edit`);
          }}>
            Duplicate
          </button>
          <button className="btn btn-primary" onClick={() => window.open(api.getPdfUrl(parseInt(id)), '_blank')}>
            ↓ Download PDF
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="stats-grid" style={{marginBottom:24}}>
        <div className="stat-card">
          <div className="stat-label">Total (Client)</div>
          <div className="stat-value">{sym}{Math.round(finalTotal * rate).toLocaleString()}</div>
          <div className="stat-sub">{proposal.currency}{proposal.finalDiscount > 0 ? ` · ${proposal.finalDiscount}% discount` : ''}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Contractor Cost</div>
          <div className="stat-value" style={{fontSize:22}}>{sym}{Math.round(totalContractorCost * rate).toLocaleString()}</div>
          <div className="stat-sub">all services combined</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Agency Margin</div>
          <div className="stat-value" style={{color: margin > 40 ? '#166534' : margin > 20 ? '#92400E' : '#991B1B'}}>
            {Math.round(margin)}%
          </div>
          <div className="stat-sub">{sym}{Math.round((finalTotal * rate - totalContractorCost * rate)).toLocaleString()} profit</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Services</div>
          <div className="stat-value">{selectedServices.length}</div>
          <div className="stat-sub">across {blocks.length} block{blocks.length !== 1 ? 's' : ''}</div>
        </div>
      </div>

      {/* Blocks */}
      {blocks.map(block => (
        <div key={block.group.id} className="card" style={{marginBottom:20}}>
          <div className="card-header" style={{background:'var(--black)'}}>
            <span style={{fontFamily:'var(--font-display)',fontWeight:700,color:'var(--white)',fontSize:14}}>
              {block.group.name}
            </span>
            <span style={{fontFamily:'var(--font-display)',fontWeight:700,color:'var(--white)',fontSize:18}}>
              {sym}{Math.round(block.blockTotal * rate).toLocaleString()}
            </span>
          </div>
          <div>
            {block.services.map(({ svc, contractorCost, clientPrice }) => (
              <div key={svc.id} style={{borderBottom:'1px solid var(--gray-100)'}}>
                {/* Service header */}
                <div style={{padding:'14px 20px',display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:16}}>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600,fontSize:14,color:'var(--black)',marginBottom:2}}>
                      {svc.publicName || svc.internalName}
                    </div>
                    {svc.publicName !== svc.internalName && (
                      <div style={{fontSize:12,color:'var(--gray-400)'}}>({svc.internalName})</div>
                    )}
                    {svc.duration && (
                      <div style={{fontSize:12,color:'var(--gray-400)',marginTop:2}}>⏱ {svc.duration}</div>
                    )}
                    {svc.description && (
                      <div style={{fontSize:12,color:'var(--gray-500)',marginTop:4,lineHeight:1.5}}>
                        {svc.description}
                      </div>
                    )}
                  </div>
                  <div style={{textAlign:'right',flexShrink:0}}>
                    <div style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:18,color:'var(--black)'}}>
                      {sym}{Math.round(clientPrice * rate).toLocaleString()}
                    </div>
                    <div style={{fontSize:11,color:'var(--gray-400)'}}>margin {svc.margin}%</div>
                  </div>
                </div>

                {/* Contractor breakdown */}
                {svc.contractors && svc.contractors.length > 0 && (
                  <div style={{background:'var(--gray-50)',padding:'10px 20px 12px'}}>
                    <div style={{fontSize:10,fontWeight:700,letterSpacing:'.08em',textTransform:'uppercase',color:'var(--gray-400)',marginBottom:8}}>
                      Contractor Costs
                    </div>
                    <table style={{width:'100%'}}>
                      <thead>
                        <tr>
                          <th style={{background:'transparent',color:'var(--gray-400)',fontSize:10,fontWeight:600,padding:'4px 0',letterSpacing:'.06em'}}>Role</th>
                          <th style={{background:'transparent',color:'var(--gray-400)',fontSize:10,fontWeight:600,padding:'4px 0',textAlign:'center'}}>Type</th>
                          <th style={{background:'transparent',color:'var(--gray-400)',fontSize:10,fontWeight:600,padding:'4px 0',textAlign:'center'}}>Hours</th>
                          <th style={{background:'transparent',color:'var(--gray-400)',fontSize:10,fontWeight:600,padding:'4px 0',textAlign:'center'}}>Rate</th>
                          <th style={{background:'transparent',color:'var(--gray-400)',fontSize:10,fontWeight:600,padding:'4px 0',textAlign:'right'}}>Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {svc.contractors.map((c, ci) => {
                          const role = roles.find(r => r.id === c.roleId);
                          const rate2 = role ? role.hourlyRate : 0;
                          const cost = c.paymentType === 'fixed' ? c.fixedAmount : c.hours * rate2;
                          return (
                            <tr key={ci}>
                              <td style={{padding:'4px 0',fontSize:12,borderBottom:'none',color:'var(--gray-700)'}}>
                                {role ? role.name : c.roleName || '—'}
                              </td>
                              <td style={{padding:'4px 0',fontSize:11,borderBottom:'none',textAlign:'center'}}>
                                <span className={`badge ${c.paymentType==='fixed'?'badge-blue':'badge-gray'}`} style={{fontSize:9}}>
                                  {c.paymentType}
                                </span>
                              </td>
                              <td style={{padding:'4px 0',fontSize:12,borderBottom:'none',textAlign:'center',color:'var(--gray-500)'}}>
                                {c.paymentType === 'hourly' ? c.hours + 'h' : '—'}
                              </td>
                              <td style={{padding:'4px 0',fontSize:12,borderBottom:'none',textAlign:'center',color:'var(--gray-500)'}}>
                                {c.paymentType === 'hourly' ? `€${rate2}/h` : '—'}
                              </td>
                              <td style={{padding:'4px 0',fontFamily:'var(--font-display)',fontWeight:700,fontSize:13,borderBottom:'none',textAlign:'right',color:'var(--gray-700)'}}>
                                €{Math.round(cost).toLocaleString()}
                              </td>
                            </tr>
                          );
                        })}
                        <tr>
                          <td colSpan="4" style={{padding:'6px 0 2px',fontSize:11,borderTop:'1px solid var(--gray-200)',borderBottom:'none',color:'var(--gray-400)'}}>
                            Contractor subtotal
                          </td>
                          <td style={{padding:'6px 0 2px',fontFamily:'var(--font-display)',fontWeight:700,fontSize:13,borderTop:'1px solid var(--gray-200)',borderBottom:'none',textAlign:'right'}}>
                            €{Math.round(contractorCost).toLocaleString()}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Summary */}
      <div className="card">
        <div className="card-header"><span className="card-title">Summary</span></div>
        <div className="card-body">
          {blocks.map(b => (
            <div key={b.group.id} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid var(--gray-100)'}}>
              <span style={{fontSize:13}}>{b.group.name}</span>
              <span style={{fontFamily:'var(--font-display)',fontWeight:700}}>{sym}{Math.round(b.blockTotal*rate).toLocaleString()}</span>
            </div>
          ))}
          {pm && pm.commission > 0 && (
            <div style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid var(--gray-100)',color:'var(--gray-500)',fontSize:13}}>
              <span>{pm.name} commission (+{pm.commission}%)</span>
              <span>{sym}{Math.round((afterCommission - subtotal)*rate).toLocaleString()}</span>
            </div>
          )}
          {proposal.finalDiscount > 0 && (
            <div style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid var(--gray-100)'}}>
              <span style={{fontSize:13}}>Before discount</span>
              <span className="strikethrough" style={{fontFamily:'var(--font-display)',fontWeight:700}}>{sym}{Math.round(afterCommission*rate).toLocaleString()}</span>
            </div>
          )}
          <div style={{display:'flex',justifyContent:'space-between',padding:'14px 0 0',marginTop:4}}>
            <span style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:16}}>TOTAL</span>
            <span style={{fontFamily:'var(--font-display)',fontWeight:800,fontSize:24,color:'var(--black)'}}>
              {sym}{Math.round(finalTotal*rate).toLocaleString()}
            </span>
          </div>
          {proposal.partnerDiscountEnabled && (
            <div style={{fontSize:11,color:'var(--gray-400)',marginTop:4}}>* Partner price applied (−{proposal.partnerDiscount}%)</div>
          )}
        </div>
      </div>
    </div>
  );
}

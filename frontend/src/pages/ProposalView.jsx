import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, formatCurrency, calcServiceCost, calcClientPrice, roundUp100, calcServiceFinalPrice } from '../api.js';

const STATUS_COLORS = { draft:'badge-gray', sent:'badge-blue', won:'badge-green', lost:'badge-red' };

export default function ProposalView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [proposal, setProposal] = useState(null);
  const [services, setServices] = useState([]);
  const [groups, setGroups] = useState([]);
  const [roles, setRoles] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getProposal(parseInt(id)),
      api.getServices(),
      api.getServiceGroups(),
      api.getRoles(),
      api.getPaymentMethods()
    ]).then(([p, svcs, grps, rls, pms]) => {
      setProposal(p);
      setServices(svcs);
      setGroups(grps.sort((a,b) => a.sortOrder - b.sortOrder));
      setRoles(rls);
      setPaymentMethods(pms);
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="page-content" style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%'}}><span style={{color:'var(--gray-400)'}}>Loading...</span></div>;
  if (!proposal) return <div className="page-content"><div className="empty-state">Proposal not found</div></div>;

  const sym = proposal.currency === 'USD' ? '$' : '€';
  const pm = proposal.paymentMethod;
  const pricingOpts = {
    partnerEnabled: proposal.partnerDiscountEnabled,
    partnerDiscount: proposal.partnerDiscount,
    paymentCommission: pm?.commission || 0,
    exchangeRate: proposal.currency === 'USD' ? (proposal.exchangeRate || 1) : 1
  };

  // Build blocks
  const selectedServiceIds = (proposal.services || []).map(ps => ps.serviceId);
  const selectedServices = services.filter(s => selectedServiceIds.includes(s.id));

  const groupedBlocks = {};
  selectedServices.forEach(svc => {
    const gid = svc.groupId;
    if (!groupedBlocks[gid]) groupedBlocks[gid] = { groupId: gid, services: [] };
    const contractorCost = calcServiceCost(svc, roles);
    const finalPrice = calcServiceFinalPrice(svc, roles, pricingOpts);
    groupedBlocks[gid].services.push({ svc, contractorCost, finalPrice });
  });

  const blocks = groups.filter(g => groupedBlocks[g.id]).map(g => {
    const block = groupedBlocks[g.id];
    const blockTotal = block.services.reduce((s, x) => s + x.finalPrice, 0);
    return { group: g, services: block.services, blockTotal };
  });

  const subtotal = blocks.reduce((s, b) => s + b.blockTotal, 0);
  const finalTotal = subtotal * (1 - (proposal.finalDiscount || 0) / 100);
  const rateMultiplier = proposal.currency === 'USD' ? (proposal.exchangeRate || 1) : 1;
  const totalContractorCost = selectedServices.reduce((s, svc) => s + calcServiceCost(svc, roles) * rateMultiplier, 0);
  const margin = finalTotal > 0 ? ((finalTotal - totalContractorCost) / finalTotal * 100) : 0;

  // Aggregate contractors by role within a block
  function aggregateContractors(blockServices) {
    const roleMap = {};
    blockServices.forEach(({ svc }) => {
      (svc.contractors || []).forEach(c => {
        const role = roles.find(r => r.id === c.roleId);
        const key = c.roleId || c.roleName || 'unknown';
        if (!roleMap[key]) {
          roleMap[key] = {
            roleId: c.roleId,
            roleName: role ? role.name : (c.roleName || '—'),
            hourlyRate: role ? role.hourlyRate : 0,
            totalHours: 0,
            totalFixed: 0,
            totalCost: 0,
            hasHourly: false,
            hasFixed: false
          };
        }
        if (c.paymentType === 'hourly') {
          const rate = role ? role.hourlyRate : 0;
          roleMap[key].totalHours += parseFloat(c.hours) || 0;
          roleMap[key].totalCost += (parseFloat(c.hours) || 0) * rate;
          roleMap[key].hasHourly = true;
        } else {
          roleMap[key].totalFixed += parseFloat(c.fixedAmount) || 0;
          roleMap[key].totalCost += parseFloat(c.fixedAmount) || 0;
          roleMap[key].hasFixed = true;
        }
      });
    });
    return Object.values(roleMap);
  }

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
          <button className="btn btn-secondary" onClick={() => navigate(`/proposals/${id}/edit`)}>Edit</button>
          <button className="btn btn-secondary" onClick={async () => {
            const copy = await api.duplicateProposal(parseInt(id));
            navigate(`/proposals/${copy.id}/edit`);
          }}>Duplicate</button>
          <button className="btn btn-primary" onClick={() => window.open(api.getPdfUrl(parseInt(id)), '_blank')}>
            ↓ Download PDF
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="stats-grid" style={{marginBottom:24}}>
        <div className="stat-card">
          <div className="stat-label">Total (Client)</div>
          <div className="stat-value">{sym}{Math.round(finalTotal).toLocaleString()}</div>
          <div className="stat-sub">{proposal.currency}{proposal.finalDiscount > 0 ? ` · ${proposal.finalDiscount}% discount` : ''}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Contractor Cost</div>
          <div className="stat-value" style={{fontSize:22}}>{sym}{Math.round(totalContractorCost).toLocaleString()}</div>
          <div className="stat-sub">all services combined</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Agency Margin</div>
          <div className="stat-value" style={{color: margin > 40 ? '#166534' : margin > 20 ? '#92400E' : '#991B1B'}}>
            {Math.round(margin)}%
          </div>
          <div className="stat-sub">{sym}{Math.round(finalTotal - totalContractorCost).toLocaleString()} profit</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Services</div>
          <div className="stat-value">{selectedServices.length}</div>
          <div className="stat-sub">across {blocks.length} block{blocks.length !== 1 ? 's' : ''}</div>
        </div>
      </div>

      {/* Blocks */}
      {blocks.map(block => {
        const aggregatedRoles = aggregateContractors(block.services);
        const blockContractorCost = aggregatedRoles.reduce((s, r) => s + r.totalCost, 0);

        return (
          <div key={block.group.id} className="card" style={{marginBottom:20}}>
            <div className="card-header" style={{background:'var(--black)'}}>
              <div>
                <span style={{fontFamily:'var(--font-display)',fontWeight:700,color:'var(--white)',fontSize:14}}>
                  {block.group.name}
                </span>
                {block.group.duration && (
                  <span style={{color:'rgba(255,255,255,0.5)',fontSize:12,marginLeft:12}}>⏱ {block.group.duration}</span>
                )}
              </div>
              <span style={{fontFamily:'var(--font-display)',fontWeight:700,color:'var(--white)',fontSize:18}}>
                {sym}{block.blockTotal.toLocaleString()}
              </span>
            </div>

            {/* Services list */}
            <div>
              {block.services.map(({ svc, contractorCost, finalPrice }) => (
                <div key={svc.id} style={{padding:'12px 20px',borderBottom:'1px solid var(--gray-100)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <div>
                    <div style={{fontWeight:500,fontSize:13,color:'var(--black)'}}>
                      {svc.publicName || svc.internalName}
                    </div>
                    {svc.description && (
                      <div style={{fontSize:12,color:'var(--gray-500)',marginTop:2,maxWidth:400}}>{svc.description}</div>
                    )}
                  </div>
                  <div style={{textAlign:'right',flexShrink:0}}>
                    <div style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:16,color:'var(--black)'}}>
                      {sym}{finalPrice.toLocaleString()}
                    </div>
                    <div style={{fontSize:11,color:'var(--gray-400)'}}>margin {svc.margin}%</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Aggregated contractor costs per block */}
            {aggregatedRoles.length > 0 && (
              <div style={{background:'var(--gray-50)',padding:'12px 20px 14px'}}>
                <div style={{fontSize:10,fontWeight:700,letterSpacing:'.08em',textTransform:'uppercase',color:'var(--gray-400)',marginBottom:8}}>
                  Contractor Costs — {block.group.name}
                </div>
                <table style={{width:'100%'}}>
                  <thead>
                    <tr>
                      <th style={{background:'transparent',color:'var(--gray-400)',fontSize:10,fontWeight:600,padding:'4px 0'}}>Role</th>
                      <th style={{background:'transparent',color:'var(--gray-400)',fontSize:10,fontWeight:600,padding:'4px 0',textAlign:'center'}}>Hours</th>
                      <th style={{background:'transparent',color:'var(--gray-400)',fontSize:10,fontWeight:600,padding:'4px 0',textAlign:'center'}}>Rate</th>
                      <th style={{background:'transparent',color:'var(--gray-400)',fontSize:10,fontWeight:600,padding:'4px 0',textAlign:'right'}}>Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aggregatedRoles.map((r, i) => (
                      <tr key={i}>
                        <td style={{padding:'4px 0',fontSize:12,borderBottom:'none',color:'var(--gray-700)'}}>
                          {r.roleName}
                        </td>
                        <td style={{padding:'4px 0',fontSize:12,borderBottom:'none',textAlign:'center',color:'var(--gray-500)'}}>
                          {r.hasHourly ? r.totalHours.toFixed(1) + 'h' : '—'}
                        </td>
                        <td style={{padding:'4px 0',fontSize:12,borderBottom:'none',textAlign:'center',color:'var(--gray-500)'}}>
                          {r.hasHourly ? `€${r.hourlyRate}/h` : (r.hasFixed ? 'fixed' : '—')}
                        </td>
                        <td style={{padding:'4px 0',fontFamily:'var(--font-display)',fontWeight:700,fontSize:13,borderBottom:'none',textAlign:'right',color:'var(--gray-700)'}}>
                          €{Math.round(r.totalCost).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td colSpan="3" style={{padding:'6px 0 2px',fontSize:11,borderTop:'1px solid var(--gray-200)',borderBottom:'none',color:'var(--gray-400)'}}>
                        Block contractor total
                      </td>
                      <td style={{padding:'6px 0 2px',fontFamily:'var(--font-display)',fontWeight:700,fontSize:14,borderTop:'1px solid var(--gray-200)',borderBottom:'none',textAlign:'right'}}>
                        €{Math.round(blockContractorCost).toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}

      {/* Summary */}
      <div className="card">
        <div className="card-header"><span className="card-title">Summary</span></div>
        <div className="card-body">
          {blocks.map(b => (
            <div key={b.group.id} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid var(--gray-100)'}}>
              <span style={{fontSize:13}}>{b.group.name}</span>
              <span style={{fontFamily:'var(--font-display)',fontWeight:700}}>{sym}{b.blockTotal.toLocaleString()}</span>
            </div>
          ))}
          {proposal.finalDiscount > 0 && (
            <div style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid var(--gray-100)'}}>
              <span style={{fontSize:13}}>Before discount</span>
              <span className="strikethrough" style={{fontFamily:'var(--font-display)',fontWeight:700}}>{sym}{subtotal.toLocaleString()}</span>
            </div>
          )}
          <div style={{display:'flex',justifyContent:'space-between',padding:'14px 0 0',marginTop:4}}>
            <span style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:16}}>TOTAL</span>
            <span style={{fontFamily:'var(--font-display)',fontWeight:800,fontSize:24,color:'var(--black)'}}>
              {sym}{Math.round(finalTotal).toLocaleString()}
            </span>
          </div>
          {proposal.partnerDiscountEnabled && (
            <div style={{fontSize:11,color:'var(--gray-400)',marginTop:4}}>* Partner price applied (−{proposal.partnerDiscount}%)</div>
          )}
          {pm && pm.commission > 0 && (
            <div style={{fontSize:11,color:'var(--gray-400)',marginTop:2}}>* {pm.name} commission (+{pm.commission}%) included per service</div>
          )}
        </div>
      </div>
    </div>
  );
}

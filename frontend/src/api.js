const BASE = '/api';

async function req(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const r = await fetch(BASE + path, opts);
  if (!r.ok) {
    const err = await r.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || 'Request failed');
  }
  return r.json();
}

export const api = {
  // Roles
  getRoles: () => req('GET', '/roles'),
  createRole: (data) => req('POST', '/roles', data),
  updateRole: (id, data) => req('PUT', `/roles/${id}`, data),
  deleteRole: (id) => req('DELETE', `/roles/${id}`),

  // Service Groups
  getServiceGroups: () => req('GET', '/service-groups'),
  createServiceGroup: (data) => req('POST', '/service-groups', data),
  updateServiceGroup: (id, data) => req('PUT', `/service-groups/${id}`, data),
  deleteServiceGroup: (id) => req('DELETE', `/service-groups/${id}`),

  // Payment Methods
  getPaymentMethods: () => req('GET', '/payment-methods'),
  createPaymentMethod: (data) => req('POST', '/payment-methods', data),
  updatePaymentMethod: (id, data) => req('PUT', `/payment-methods/${id}`, data),
  deletePaymentMethod: (id) => req('DELETE', `/payment-methods/${id}`),

  // Services
  getServices: () => req('GET', '/services'),
  getService: (id) => req('GET', `/services/${id}`),
  createService: (data) => req('POST', '/services', data),
  updateService: (id, data) => req('PUT', `/services/${id}`, data),
  deleteService: (id) => req('DELETE', `/services/${id}`),

  // Proposals
  getProposals: () => req('GET', '/proposals'),
  getProposal: (id) => req('GET', `/proposals/${id}`),
  createProposal: (data) => req('POST', '/proposals', data),
  updateProposal: (id, data) => req('PUT', `/proposals/${id}`, data),
  deleteProposal: (id) => req('DELETE', `/proposals/${id}`),
  duplicateProposal: (id) => req('POST', `/proposals/${id}/duplicate`),
  getProposalPricing: (id) => req('GET', `/proposals/${id}/pricing`),

  // Indexation
  applyIndexation: (percent) => req('POST', '/indexation', { percent }),

  // Exchange rate
  getExchangeRate: () => req('GET', '/exchange-rate'),

  // PDF (returns URL, open in new tab)
  getPdfUrl: (id) => `/api/proposals/${id}/pdf`,
};

export function formatCurrency(amount, currency = 'EUR') {
  const sym = currency === 'USD' ? '$' : '€';
  return `${sym}${Math.round(amount || 0).toLocaleString('en-US')}`;
}

export function calcServiceCost(service, roles) {
  if (!service?.contractors?.length) return 0;
  return service.contractors.reduce((sum, c) => {
    if (c.paymentType === 'fixed') return sum + (parseFloat(c.fixedAmount) || 0);
    const role = roles.find(r => r.id === c.roleId);
    const rate = role ? role.hourlyRate : 0;
    return sum + (parseFloat(c.hours) || 0) * rate;
  }, 0);
}

export function calcClientPrice(cost, margin) {
  const m = (parseFloat(margin) || 0) / 100;
  if (m >= 1) return cost * 10;
  return cost / (1 - m);
}

export function roundUp100(v) {
  return Math.ceil(v / 100) * 100;
}

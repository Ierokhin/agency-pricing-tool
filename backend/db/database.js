const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || __dirname;
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
const DB_FILE = path.join(DATA_DIR, 'data.json');

const defaultData = {
  roles: [],
  serviceGroups: [],
  services: [],
  serviceContractors: [],
  paymentMethods: [],
  proposals: [],
  proposalServices: [],
  _counters: { roles: 0, serviceGroups: 0, services: 0, serviceContractors: 0, paymentMethods: 0, proposals: 0, proposalServices: 0 }
};

function loadDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2));
    return JSON.parse(JSON.stringify(defaultData));
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function saveDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function nextId(data, table) {
  data._counters[table] = (data._counters[table] || 0) + 1;
  return data._counters[table];
}

const db = {
  // ROLES
  getRoles() { return loadDB().roles; },
  createRole(name, hourlyRate) {
    const data = loadDB();
    const role = { id: nextId(data, 'roles'), name, hourlyRate: parseFloat(hourlyRate), createdAt: new Date().toISOString() };
    data.roles.push(role);
    saveDB(data);
    return role;
  },
  updateRole(id, name, hourlyRate) {
    const data = loadDB();
    const idx = data.roles.findIndex(r => r.id === id);
    if (idx === -1) return null;
    data.roles[idx] = { ...data.roles[idx], name, hourlyRate: parseFloat(hourlyRate) };
    saveDB(data);
    return data.roles[idx];
  },
  deleteRole(id) {
    const data = loadDB();
    data.roles = data.roles.filter(r => r.id !== id);
    saveDB(data);
  },

  // SERVICE GROUPS (with duration)
  getServiceGroups() { return loadDB().serviceGroups; },
  createServiceGroup(name, sortOrder, duration) {
    const data = loadDB();
    const group = { id: nextId(data, 'serviceGroups'), name, sortOrder: sortOrder || 0, duration: duration || '' };
    data.serviceGroups.push(group);
    saveDB(data);
    return group;
  },
  updateServiceGroup(id, fields) {
    const data = loadDB();
    const idx = data.serviceGroups.findIndex(g => g.id === id);
    if (idx === -1) return null;
    data.serviceGroups[idx] = { ...data.serviceGroups[idx], ...fields };
    saveDB(data);
    return data.serviceGroups[idx];
  },
  deleteServiceGroup(id) {
    const data = loadDB();
    data.serviceGroups = data.serviceGroups.filter(g => g.id !== id);
    saveDB(data);
  },

  // PAYMENT METHODS
  getPaymentMethods() { return loadDB().paymentMethods; },
  createPaymentMethod(name, commission) {
    const data = loadDB();
    const pm = { id: nextId(data, 'paymentMethods'), name, commission: parseFloat(commission) || 0 };
    data.paymentMethods.push(pm);
    saveDB(data);
    return pm;
  },
  updatePaymentMethod(id, name, commission) {
    const data = loadDB();
    const idx = data.paymentMethods.findIndex(p => p.id === id);
    if (idx === -1) return null;
    data.paymentMethods[idx] = { ...data.paymentMethods[idx], name, commission: parseFloat(commission) || 0 };
    saveDB(data);
    return data.paymentMethods[idx];
  },
  deletePaymentMethod(id) {
    const data = loadDB();
    data.paymentMethods = data.paymentMethods.filter(p => p.id !== id);
    saveDB(data);
  },

  // SERVICES
  getServices() {
    const data = loadDB();
    return data.services.map(s => ({ ...s, contractors: data.serviceContractors.filter(c => c.serviceId === s.id) }));
  },
  getService(id) {
    const data = loadDB();
    const s = data.services.find(s => s.id === id);
    if (!s) return null;
    return { ...s, contractors: data.serviceContractors.filter(c => c.serviceId === s.id) };
  },
  createService(payload) {
    const data = loadDB();
    const { internalName, publicName, groupId, margin, description, duration, notes, contractors } = payload;
    const service = {
      id: nextId(data, 'services'), internalName, publicName,
      groupId: parseInt(groupId), margin: parseFloat(margin) || 0,
      description: description || '', duration: duration || '', notes: notes || '',
      createdAt: new Date().toISOString()
    };
    data.services.push(service);
    if (contractors && contractors.length) {
      contractors.forEach(c => {
        data.serviceContractors.push({
          id: nextId(data, 'serviceContractors'), serviceId: service.id,
          roleId: c.roleId ? parseInt(c.roleId) : null, roleName: c.roleName || '',
          paymentType: c.paymentType || 'hourly', hours: parseFloat(c.hours) || 0,
          fixedAmount: parseFloat(c.fixedAmount) || 0
        });
      });
    }
    saveDB(data);
    return { ...service, contractors: data.serviceContractors.filter(c => c.serviceId === service.id) };
  },
  updateService(id, payload) {
    const data = loadDB();
    const idx = data.services.findIndex(s => s.id === id);
    if (idx === -1) return null;
    const { internalName, publicName, groupId, margin, description, duration, notes, contractors } = payload;
    data.services[idx] = {
      ...data.services[idx], internalName, publicName,
      groupId: parseInt(groupId), margin: parseFloat(margin) || 0,
      description: description || '', duration: duration || '', notes: notes || ''
    };
    data.serviceContractors = data.serviceContractors.filter(c => c.serviceId !== id);
    if (contractors && contractors.length) {
      contractors.forEach(c => {
        data.serviceContractors.push({
          id: nextId(data, 'serviceContractors'), serviceId: id,
          roleId: c.roleId ? parseInt(c.roleId) : null, roleName: c.roleName || '',
          paymentType: c.paymentType || 'hourly', hours: parseFloat(c.hours) || 0,
          fixedAmount: parseFloat(c.fixedAmount) || 0
        });
      });
    }
    saveDB(data);
    return { ...data.services[idx], contractors: data.serviceContractors.filter(c => c.serviceId === id) };
  },
  deleteService(id) {
    const data = loadDB();
    data.services = data.services.filter(s => s.id !== id);
    data.serviceContractors = data.serviceContractors.filter(c => c.serviceId !== id);
    saveDB(data);
  },

  // PROPOSALS
  getProposals() {
    const data = loadDB();
    return data.proposals.map(p => ({ ...p, services: data.proposalServices.filter(ps => ps.proposalId === p.id) }));
  },
  getProposal(id) {
    const data = loadDB();
    const p = data.proposals.find(p => p.id === id);
    if (!p) return null;
    const services = data.proposalServices.filter(ps => ps.proposalId === id);
    const roles = data.roles;
    const enrichedServices = services.map(ps => {
      const service = data.services.find(s => s.id === ps.serviceId);
      const contractors = data.serviceContractors.filter(c => c.serviceId === ps.serviceId).map(c => {
        const role = c.roleId ? roles.find(r => r.id === c.roleId) : null;
        const hourlyRate = role ? role.hourlyRate : 0;
        const cost = c.paymentType === 'hourly' ? c.hours * hourlyRate : c.fixedAmount;
        return { ...c, roleName: role ? role.name : c.roleName, hourlyRate, cost };
      });
      return { ...ps, service, contractors };
    });
    const paymentMethod = p.paymentMethodId ? data.paymentMethods.find(pm => pm.id === p.paymentMethodId) : null;
    return { ...p, services: enrichedServices, paymentMethod };
  },
  createProposal(payload) {
    const data = loadDB();
    const { name, clientName, serviceIds, paymentMethodId, currency, partnerDiscount, partnerDiscountEnabled, finalDiscount, exchangeRate, status } = payload;
    const proposal = {
      id: nextId(data, 'proposals'), name: name || clientName || 'New Proposal',
      clientName: clientName || '', paymentMethodId: paymentMethodId ? parseInt(paymentMethodId) : null,
      currency: currency || 'EUR', partnerDiscount: parseFloat(partnerDiscount) || 20,
      partnerDiscountEnabled: !!partnerDiscountEnabled, finalDiscount: parseFloat(finalDiscount) || 0,
      exchangeRate: parseFloat(exchangeRate) || 1, status: status || 'draft',
      createdAt: new Date().toISOString()
    };
    data.proposals.push(proposal);
    if (serviceIds && serviceIds.length) {
      serviceIds.forEach(sid => {
        data.proposalServices.push({ id: nextId(data, 'proposalServices'), proposalId: proposal.id, serviceId: parseInt(sid) });
      });
    }
    saveDB(data);
    return this.getProposal(proposal.id);
  },
  updateProposal(id, payload) {
    const data = loadDB();
    const idx = data.proposals.findIndex(p => p.id === id);
    if (idx === -1) return null;
    const { name, clientName, serviceIds, paymentMethodId, currency, partnerDiscount, partnerDiscountEnabled, finalDiscount, exchangeRate, status } = payload;
    data.proposals[idx] = {
      ...data.proposals[idx], name: name || clientName || data.proposals[idx].name,
      clientName: clientName || '', paymentMethodId: paymentMethodId ? parseInt(paymentMethodId) : null,
      currency: currency || 'EUR', partnerDiscount: parseFloat(partnerDiscount) || 20,
      partnerDiscountEnabled: !!partnerDiscountEnabled, finalDiscount: parseFloat(finalDiscount) || 0,
      exchangeRate: parseFloat(exchangeRate) || 1, status: status || data.proposals[idx].status
    };
    data.proposalServices = data.proposalServices.filter(ps => ps.proposalId !== id);
    if (serviceIds && serviceIds.length) {
      serviceIds.forEach(sid => {
        data.proposalServices.push({ id: nextId(data, 'proposalServices'), proposalId: id, serviceId: parseInt(sid) });
      });
    }
    saveDB(data);
    return this.getProposal(id);
  },
  deleteProposal(id) {
    const data = loadDB();
    data.proposals = data.proposals.filter(p => p.id !== id);
    data.proposalServices = data.proposalServices.filter(ps => ps.proposalId !== id);
    saveDB(data);
  },
  duplicateProposal(id) {
    const data = loadDB();
    const original = data.proposals.find(p => p.id === id);
    if (!original) return null;
    const originalServices = data.proposalServices.filter(ps => ps.proposalId === id);
    const newProposal = { ...original, id: nextId(data, 'proposals'), name: original.name + ' (copy)', status: 'draft', createdAt: new Date().toISOString() };
    data.proposals.push(newProposal);
    originalServices.forEach(ps => {
      data.proposalServices.push({ id: nextId(data, 'proposalServices'), proposalId: newProposal.id, serviceId: ps.serviceId });
    });
    saveDB(data);
    return this.getProposal(newProposal.id);
  },

  // INDEXATION
  applyIndexation(percent) {
    const data = loadDB();
    const multiplier = 1 + (parseFloat(percent) / 100);
    data.roles = data.roles.map(r => ({ ...r, hourlyRate: Math.round(r.hourlyRate * multiplier * 100) / 100 }));
    data.serviceContractors = data.serviceContractors.map(c => ({
      ...c, fixedAmount: c.paymentType === 'fixed' ? Math.round(c.fixedAmount * multiplier * 100) / 100 : c.fixedAmount
    }));
    saveDB(data);
    return { success: true, multiplier };
  }
};

module.exports = db;

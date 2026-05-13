// Calculate service contractor cost
function calcContractorCost(contractor, role) {
  if (contractor.paymentType === 'hourly') {
    const rate = role ? role.hourlyRate : 0;
    return contractor.hours * rate;
  }
  return contractor.fixedAmount;
}

// Calculate total contractor cost for a service
function calcServiceContractorTotal(service, roles) {
  if (!service.contractors) return 0;
  return service.contractors.reduce((sum, c) => {
    const role = roles.find(r => r.id === c.roleId);
    return sum + calcContractorCost(c, role);
  }, 0);
}

// Calculate client price from contractor cost + margin
// Formula: price = cost / (1 - margin%)
function calcClientPrice(contractorCost, marginPercent) {
  const margin = marginPercent / 100;
  if (margin >= 1) return contractorCost * 10; // safety
  return contractorCost / (1 - margin);
}

// Apply partner discount
function applyPartnerDiscount(price, discountPercent) {
  return price * (1 - discountPercent / 100);
}

// Round up to nearest 100
function roundUpTo100(value) {
  return Math.ceil(value / 100) * 100;
}

// Calculate full proposal pricing
function calcProposal(proposal, services, roles, paymentMethod) {
  if (!proposal || !services) return null;

  const groups = {};

  for (const ps of proposal.services || []) {
    const service = services.find(s => s.id === ps.serviceId);
    if (!service) continue;

    const contractorCost = calcServiceContractorTotal(service, roles);
    let clientPrice = calcClientPrice(contractorCost, service.margin);

    if (proposal.partnerDiscountEnabled) {
      clientPrice = applyPartnerDiscount(clientPrice, proposal.partnerDiscount);
    }

    const groupId = service.groupId;
    if (!groups[groupId]) {
      groups[groupId] = { groupId, services: [], rawTotal: 0 };
    }
    groups[groupId].services.push({
      service,
      contractorCost,
      clientPrice
    });
    groups[groupId].rawTotal += clientPrice;
  }

  // Round each block up to 100
  let subtotal = 0;
  const blocks = Object.values(groups).map(g => {
    const blockTotal = roundUpTo100(g.rawTotal);
    subtotal += blockTotal;
    return { ...g, blockTotal };
  });

  // Add payment commission
  let total = subtotal;
  if (paymentMethod && paymentMethod.commission) {
    total = subtotal * (1 + paymentMethod.commission / 100);
  }

  // Apply final discount
  let finalTotal = total;
  let discountAmount = 0;
  if (proposal.finalDiscount && proposal.finalDiscount > 0) {
    discountAmount = total * (proposal.finalDiscount / 100);
    finalTotal = total - discountAmount;
  }

  // Currency conversion
  const rate = proposal.exchangeRate || 1;
  const currency = proposal.currency || 'EUR';

  return {
    blocks,
    subtotal,
    total,
    finalTotal,
    discountAmount,
    currency,
    rate,
    // Convert to selected currency
    subtotalConverted: subtotal * rate,
    totalConverted: total * rate,
    finalTotalConverted: finalTotal * rate
  };
}

module.exports = { calcProposal, calcServiceContractorTotal, calcClientPrice, roundUpTo100, calcContractorCost };

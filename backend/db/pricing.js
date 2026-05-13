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
function calcClientPrice(contractorCost, marginPercent) {
  const margin = marginPercent / 100;
  if (margin >= 1) return contractorCost * 10;
  return contractorCost / (1 - margin);
}

// Round up to nearest 100
function roundUpTo100(value) {
  return Math.ceil(value / 100) * 100;
}

// NEW LOGIC: partner discount + commission applied per service, then rounded per service
function calcProposal(proposal, services, roles, paymentMethod) {
  if (!proposal || !services) return null;

  const groups = {};

  for (const ps of proposal.services || []) {
    const service = services.find(s => s.id === ps.serviceId);
    if (!service) continue;

    const contractorCost = calcServiceContractorTotal(service, roles);
    let clientPrice = calcClientPrice(contractorCost, service.margin);

    if (proposal.partnerDiscountEnabled) {
      clientPrice = clientPrice * (1 - proposal.partnerDiscount / 100);
    }

    if (paymentMethod && paymentMethod.commission) {
      clientPrice = clientPrice * (1 + paymentMethod.commission / 100);
    }

    // Apply exchange rate before rounding (for USD)
    const rate = proposal.exchangeRate || 1;
    const convertedPrice = clientPrice * rate;

    // Round each service up to 100
    const roundedPrice = roundUpTo100(convertedPrice);

    const groupId = service.groupId;
    if (!groups[groupId]) {
      groups[groupId] = { groupId, services: [], blockTotal: 0 };
    }
    groups[groupId].services.push({
      service,
      contractorCost,
      clientPriceRaw: convertedPrice,
      clientPrice: roundedPrice
    });
    groups[groupId].blockTotal += roundedPrice;
  }

  const blocks = Object.values(groups);
  let subtotal = blocks.reduce((sum, b) => sum + b.blockTotal, 0);

  let total = subtotal;
  let finalTotal = total;
  let discountAmount = 0;
  if (proposal.finalDiscount && proposal.finalDiscount > 0) {
    discountAmount = total * (proposal.finalDiscount / 100);
    finalTotal = total - discountAmount;
  }

  const currency = proposal.currency || 'EUR';

  return {
    blocks,
    subtotal,
    total,
    finalTotal,
    discountAmount,
    currency,
    // Already converted, no need for separate converted fields
    subtotalConverted: subtotal,
    totalConverted: total,
    finalTotalConverted: finalTotal
  };
}

module.exports = { calcProposal, calcServiceContractorTotal, calcClientPrice, roundUpTo100, calcContractorCost };

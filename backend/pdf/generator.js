const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const LOGO_PATH = path.join(__dirname, '..', 'pdf', 'logo_white_b64.txt');
const LOGO_BLACK_PATH = path.join(__dirname, '..', '..', 'frontend', 'public', 'logo-black.png');

// Colors
const BLACK = '#000000';
const WHITE = '#FFFFFF';
const GRAY_LIGHT = '#F5F5F5';
const GRAY_MED = '#888888';
const GRAY_DARK = '#333333';

function formatCurrency(amount, currency) {
  const sym = currency === 'USD' ? '$' : '€';
  return `${sym}${Math.round(amount).toLocaleString('en-EU')}`;
}

function formatCurrencyFull(amount, currency) {
  const sym = currency === 'USD' ? '$' : '€';
  return `${sym}${Math.round(amount).toLocaleString('en-EU')}`;
}

function generateProposalPDF(proposal, pricing, serviceGroups, res) {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 0,
    info: {
      Title: `Commercial Proposal - ${proposal.clientName || proposal.name}`,
      Author: 'Brandon Archibald'
    }
  });

  if (res) {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="KP_${(proposal.clientName || proposal.name).replace(/\s+/g, '_')}.pdf"`);
    doc.pipe(res);
  }

  const W = 595.28; // A4 width
  const H = 841.89; // A4 height
  const MARGIN = 48;
  const CONTENT_W = W - MARGIN * 2;

  // ─── SLIDE 1: COVER ────────────────────────────────────────────────────────
  // Black background
  doc.rect(0, 0, W, H).fill(BLACK);

  // Logo (white PNG) top left
  try {
    const logoWhitePath = path.join(__dirname, '..', '..', 'frontend', 'public', 'logo-white.png');
    if (fs.existsSync(logoWhitePath)) {
      doc.image(logoWhitePath, MARGIN, 32, { height: 28 });
    }
  } catch (e) {}

  // Copyright top right
  doc.fillColor(WHITE).font('Helvetica').fontSize(9)
    .text('© 2026 Brandon Archibald. All rights reserved.', 0, 44, { align: 'right', width: W - MARGIN });

  // "Commercial Proposal" large heading
  doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(48)
    .text('Commercial\nProposal', MARGIN, H * 0.45, { lineGap: 4 });

  // Services list below
  let y = H * 0.45 + 130;
  const serviceNames = [];
  if (pricing && pricing.blocks) {
    for (const block of pricing.blocks) {
      const g = serviceGroups.find(g => g.id === block.groupId);
      if (g) serviceNames.push(g.name);
    }
  }

  doc.font('Helvetica').fontSize(22).fillColor(WHITE);
  serviceNames.forEach(n => {
    doc.text(n, MARGIN, y, { lineGap: 6 });
    y += 32;
  });

  // Client name bottom left
  if (proposal.clientName) {
    doc.font('Helvetica-Bold').fontSize(14).fillColor(WHITE)
      .text(proposal.clientName, MARGIN, H - 80);
  }

  // ─── SLIDES PER BLOCK ──────────────────────────────────────────────────────
  if (pricing && pricing.blocks) {
    pricing.blocks.forEach((block, blockIdx) => {
      const group = serviceGroups.find(g => g.id === block.groupId);
      if (!block.services || !block.services.length) return;

      doc.addPage({ size: 'A4', margin: 0 });
      doc.rect(0, 0, W, H).fill(WHITE);

      // Header bar
      doc.rect(0, 0, W, 56).fill(BLACK);

      // Logo top left in header
      try {
        const logoWhitePath = path.join(__dirname, '..', '..', 'frontend', 'public', 'logo-white.png');
        if (fs.existsSync(logoWhitePath)) {
          doc.image(logoWhitePath, MARGIN, 14, { height: 22 });
        }
      } catch(e) {}

      // Copyright in header
      doc.fillColor(WHITE).font('Helvetica').fontSize(8)
        .text('© 2026 Brandon Archibald. All rights reserved.', 0, 22, { align: 'right', width: W - MARGIN });

      // Block title left
      doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(13)
        .text(`Block 0${blockIdx + 1}:`, MARGIN, 72);
      doc.font('Helvetica-Bold').fontSize(20)
        .text(group ? group.name : 'Services', MARGIN, 89);

      // Table header
      const tableY = 128;
      const colTask = MARGIN;
      const colDesc = MARGIN + 130;
      const colCost = W - MARGIN - 160;
      const colDur = W - MARGIN - 60;
      const colW = {
        task: 128,
        desc: colCost - colDesc - 12,
        cost: 100,
        dur: 60
      };

      // Table header row
      doc.rect(colTask, tableY, W - MARGIN * 2, 28).fill(BLACK);
      doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(9.5);
      doc.text('Task', colTask + 10, tableY + 9, { width: colW.task });
      doc.text('Description', colDesc, tableY + 9, { width: colW.desc });
      doc.text('Cost, EUR', colCost, tableY + 9, { width: colW.cost });
      doc.text('Duration', colDur, tableY + 9, { width: colW.dur });

      let rowY = tableY + 28;
      let isFirstRow = true;

      for (const svc of block.services) {
        const service = svc.service;
        const desc = service.description || service.publicName;
        const clientPrice = svc.clientPrice;

        // Estimate row height based on description length
        const descLines = Math.max(1, Math.ceil(desc.length / 55));
        const rowH = Math.max(48, descLines * 14 + 24);

        // Alternating row bg
        if (!isFirstRow) {
          doc.rect(colTask, rowY, W - MARGIN * 2, rowH).fill(GRAY_LIGHT);
        }
        isFirstRow = false;

        // Task name (left column, bold)
        doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(10)
          .text(service.publicName || service.internalName, colTask + 10, rowY + 12, {
            width: colW.task - 10,
            lineGap: 2
          });

        // Description
        doc.font('Helvetica').fontSize(9.5).fillColor(GRAY_DARK)
          .text(desc, colDesc, rowY + 12, { width: colW.desc, lineGap: 2 });

        // Cost
        doc.font('Helvetica-Bold').fontSize(12).fillColor(BLACK)
          .text(formatCurrency(clientPrice, proposal.currency), colCost, rowY + 12, { width: colW.cost });

        // Duration
        if (service.duration) {
          doc.font('Helvetica-Bold').fontSize(10).fillColor(BLACK)
            .text(service.duration, colDur, rowY + 12, { width: colW.dur });
        }

        rowY += rowH;

        // Draw row border
        doc.moveTo(colTask, rowY).lineTo(W - MARGIN, rowY).strokeColor('#DDDDDD').lineWidth(0.5).stroke();
      }

      // Block total row
      rowY += 12;
      doc.rect(colCost - 20, rowY, colW.cost + colW.dur + 30, 36).fill(BLACK);
      doc.font('Helvetica-Bold').fontSize(14).fillColor(WHITE)
        .text('TOTAL: ' + formatCurrency(block.blockTotal, proposal.currency), colCost - 16, rowY + 10, { width: colW.cost + colW.dur + 22, align: 'center' });

      // Notes if any
      if (block.services.some(s => s.service && s.service.notes)) {
        const notesY = rowY + 52;
        doc.font('Helvetica').fontSize(8.5).fillColor(GRAY_MED);
        block.services.forEach(s => {
          if (s.service && s.service.notes) {
            doc.text('* ' + s.service.notes, MARGIN, notesY, { width: CONTENT_W });
          }
        });
      }

      // Page label bottom right
      doc.font('Helvetica').fontSize(8).fillColor(GRAY_MED)
        .text(`Commercial Proposal.      Page _ 0${blockIdx + 1}`, 0, H - 40, { align: 'right', width: W - MARGIN });
    });
  }

  // ─── SUMMARY SLIDE (if multiple blocks) ────────────────────────────────────
  if (pricing && pricing.blocks && pricing.blocks.length > 1) {
    doc.addPage({ size: 'A4', margin: 0 });
    doc.rect(0, 0, W, H).fill(WHITE);

    // Header
    doc.rect(0, 0, W, 56).fill(BLACK);
    try {
      const logoWhitePath = path.join(__dirname, '..', '..', 'frontend', 'public', 'logo-white.png');
      if (fs.existsSync(logoWhitePath)) {
        doc.image(logoWhitePath, MARGIN, 14, { height: 22 });
      }
    } catch(e) {}
    doc.fillColor(WHITE).font('Helvetica').fontSize(8)
      .text('© 2026 Brandon Archibald. All rights reserved.', 0, 22, { align: 'right', width: W - MARGIN });

    doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(24)
      .text('Full Scope', MARGIN, 80);

    // Recommendation box
    const recText = 'We want to launch several processes in parallel to accelerate the overall timeline and avoid sequential delays.';
    doc.font('Helvetica').fontSize(10).fillColor(GRAY_DARK)
      .text(recText, W * 0.55, 80, { width: W * 0.35, lineGap: 3 });

    // Summary table
    const tY = 160;
    doc.rect(MARGIN, tY, CONTENT_W, 28).fill(BLACK);
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(WHITE);
    doc.text('Tasks', MARGIN + 10, tY + 9, { width: 280 });
    doc.text('Cost, EUR', W - MARGIN - 120, tY + 9, { width: 100 });
    doc.text('Duration', W - MARGIN - 60, tY + 9, { width: 60 });

    let sumY = tY + 28;
    pricing.blocks.forEach((block, i) => {
      const group = serviceGroups.find(g => g.id === block.groupId);
      if (i % 2 === 1) doc.rect(MARGIN, sumY, CONTENT_W, 32).fill(GRAY_LIGHT);
      doc.font('Helvetica-Bold').fontSize(11).fillColor(BLACK)
        .text(group ? group.name : 'Services', MARGIN + 10, sumY + 9, { width: 280 });
      doc.font('Helvetica-Bold').fontSize(13).fillColor(BLACK)
        .text(formatCurrency(block.blockTotal, proposal.currency), W - MARGIN - 120, sumY + 7, { width: 100 });
      sumY += 32;
    });

    // Divider
    sumY += 8;
    doc.moveTo(MARGIN, sumY).lineTo(W - MARGIN, sumY).strokeColor(BLACK).lineWidth(1).stroke();
    sumY += 12;

    // Total
    const originalTotal = pricing.totalConverted;
    const finalTotal = pricing.finalTotalConverted;
    const hasDiscount = proposal.finalDiscount > 0;

    if (hasDiscount) {
      // Strikethrough original price
      doc.font('Helvetica').fontSize(16).fillColor(GRAY_MED)
        .text('TOTAL: ' + formatCurrency(originalTotal, proposal.currency), MARGIN + 10, sumY);
      const txtW = 160;
      const txtX = MARGIN + 10 + 62;
      doc.moveTo(txtX, sumY + 9).lineTo(txtX + txtW, sumY + 9).strokeColor(GRAY_MED).lineWidth(1).stroke();
      sumY += 26;
      doc.font('Helvetica-Bold').fontSize(22).fillColor(BLACK)
        .text('TOTAL: ' + formatCurrency(finalTotal, proposal.currency), MARGIN + 10, sumY);
      doc.font('Helvetica').fontSize(10).fillColor(GRAY_MED)
        .text(`(${proposal.finalDiscount}% discount applied)`, MARGIN + 10, sumY + 28);
    } else {
      doc.font('Helvetica-Bold').fontSize(22).fillColor(BLACK)
        .text('TOTAL: ' + formatCurrency(finalTotal, proposal.currency), MARGIN + 10, sumY);
    }
  }

  // ─── CLOSING SLIDE ──────────────────────────────────────────────────────────
  doc.addPage({ size: 'A4', margin: 0 });
  doc.rect(0, 0, W, H).fill(BLACK);

  doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(52)
    .text('Ready to start', MARGIN, H * 0.6, { lineGap: 8 });
  doc.font('Helvetica-BoldOblique').fontSize(52).fillColor(WHITE)
    .text('→ working?', MARGIN, H * 0.6 + 68);

  doc.end();
  return doc;
}

module.exports = { generateProposalPDF };

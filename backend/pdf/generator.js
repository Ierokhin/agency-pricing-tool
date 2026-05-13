const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const BLACK = '#000000';
const WHITE = '#FFFFFF';
const GRAY_LIGHT = '#F5F5F5';
const GRAY_MED = '#888888';
const GRAY_DARK = '#333333';

function fmtCur(amount, currency) {
  const sym = currency === 'USD' ? '$' : '€';
  return `${sym}${Math.round(amount).toLocaleString('en-US')}`;
}

function generateProposalPDF(proposal, pricing, serviceGroups, res) {
  // A4 Landscape
  const W = 841.89;
  const H = 595.28;
  const MARGIN = 48;
  const CONTENT_W = W - MARGIN * 2;

  const doc = new PDFDocument({
    size: [W, H],
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

  const currency = pricing?.currency || proposal.currency || 'EUR';

  // Helper: draw logo
  const drawLogo = (x, y, height) => {
    try {
      const logoPath = path.join(__dirname, '..', '..', 'frontend', 'public', 'logo-white.png');
      if (fs.existsSync(logoPath)) doc.image(logoPath, x, y, { height });
    } catch (e) {}
  };

  // Helper: draw header bar
  const drawHeader = () => {
    doc.rect(0, 0, W, 56).fill(BLACK);
    drawLogo(MARGIN, 14, 22);
    doc.fillColor(WHITE).font('Helvetica').fontSize(8)
      .text('© 2026 Brandon Archibald. All rights reserved.', 0, 22, { align: 'right', width: W - MARGIN });
  };

  // ─── COVER ──────────────────────────────────────────────────────────────────
  doc.rect(0, 0, W, H).fill(BLACK);

  // Top bar with logo
  doc.rect(MARGIN - 8, 24, W - (MARGIN - 8) * 2, 36)
    .lineWidth(1).strokeColor('rgba(255,255,255,0.15)').fillColor(WHITE).roundedRect(MARGIN - 8, 24, W - (MARGIN - 8) * 2, 36, 18).fill(WHITE);
  try {
    const logoBlack = path.join(__dirname, '..', '..', 'frontend', 'public', 'logo-black.png');
    if (fs.existsSync(logoBlack)) doc.image(logoBlack, MARGIN + 4, 30, { height: 18 });
  } catch(e) {}
  doc.fillColor(GRAY_DARK).font('Helvetica').fontSize(8)
    .text('© 2026 Brandon Archibald. All rights reserved.', 0, 38, { align: 'right', width: W - MARGIN - 8 });

  // "Commercial Proposal"
  doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(42)
    .text('Commercial\nProposal', MARGIN, H * 0.38, { lineGap: 2 });

  // Block names
  let coverY = H * 0.38 + 110;
  const blockNames = [];
  if (pricing && pricing.blocks) {
    pricing.blocks.forEach(b => {
      const g = serviceGroups.find(g => g.id === b.groupId);
      if (g) blockNames.push(g.name);
    });
  }
  doc.font('Helvetica').fontSize(20).fillColor(WHITE);
  blockNames.forEach(n => {
    doc.text(n, MARGIN, coverY);
    coverY += 28;
  });

  // Client name
  if (proposal.clientName) {
    doc.font('Helvetica-Bold').fontSize(13).fillColor(WHITE)
      .text(proposal.clientName, MARGIN, H - 60);
  }

  // ─── BLOCK SLIDES ──────────────────────────────────────────────────────────
  if (pricing && pricing.blocks) {
    pricing.blocks.forEach((block, blockIdx) => {
      const group = serviceGroups.find(g => g.id === block.groupId);
      if (!block.services || !block.services.length) return;

      doc.addPage({ size: [W, H], margin: 0 });
      doc.rect(0, 0, W, H).fill(WHITE);
      drawHeader();

      // Block label
      doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(12)
        .text(`Block 0${blockIdx + 1}:`, MARGIN, 72);
      doc.font('Helvetica-Bold').fontSize(18)
        .text(group ? group.name : 'Services', MARGIN, 88);

      // Table
      const tableY = 120;
      const colTask = MARGIN;
      const colDesc = MARGIN + 160;
      const colCost = W - MARGIN - 200;
      const colDur = W - MARGIN - 80;

      // Header row
      doc.rect(colTask, tableY, CONTENT_W, 26).fill(BLACK);
      doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(9);
      doc.text('Task', colTask + 10, tableY + 8);
      doc.text('Description', colDesc, tableY + 8);
      doc.text(`Cost, ${currency === 'USD' ? 'USD' : 'EUR'}`, colCost, tableY + 8);
      doc.text('Duration', colDur, tableY + 8);

      let rowY = tableY + 26;

      block.services.forEach((svc, svcIdx) => {
        const service = svc.service;
        const desc = service.description || '';
        const descLines = Math.max(1, Math.ceil(desc.length / 65));
        const rowH = Math.max(36, descLines * 13 + 18);

        if (svcIdx % 2 === 1) {
          doc.rect(colTask, rowY, CONTENT_W, rowH).fill(GRAY_LIGHT);
        }

        doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(10)
          .text(service.publicName || service.internalName, colTask + 10, rowY + 10, { width: 140 });

        doc.font('Helvetica').fontSize(9).fillColor(GRAY_DARK)
          .text(desc, colDesc, rowY + 10, { width: colCost - colDesc - 16, lineGap: 2 });

        doc.font('Helvetica-Bold').fontSize(12).fillColor(BLACK)
          .text(fmtCur(svc.clientPrice, currency), colCost, rowY + 10, { width: 100 });

        rowY += rowH;
        doc.moveTo(colTask, rowY).lineTo(W - MARGIN, rowY).strokeColor('#DDD').lineWidth(0.5).stroke();
      });

      // Block total + duration
      rowY += 10;
      doc.rect(colCost - 20, rowY, CONTENT_W - (colCost - 20 - MARGIN), 32).fill(BLACK);
      doc.font('Helvetica-Bold').fontSize(13).fillColor(WHITE)
        .text(fmtCur(block.blockTotal, currency), colCost - 16, rowY + 8, { width: 100 });

      // Group duration (one per block)
      const groupDuration = group?.duration || '';
      if (groupDuration) {
        doc.font('Helvetica-Bold').fontSize(11).fillColor(WHITE)
          .text(groupDuration, colDur, rowY + 9, { width: 100 });
      }

      // Notes
      const notesArr = block.services.filter(s => s.service?.notes).map(s => s.service.notes);
      if (notesArr.length > 0) {
        let noteY = rowY + 44;
        doc.font('Helvetica').fontSize(8).fillColor(GRAY_MED);
        notesArr.forEach(n => {
          doc.text('* ' + n, MARGIN, noteY, { width: CONTENT_W });
          noteY += 14;
        });
      }

      // Page number
      doc.font('Helvetica').fontSize(8).fillColor(GRAY_MED)
        .text(`Commercial Proposal. Brandon Archibald      Page _ 0${blockIdx + 1}`, 0, H - 36, { align: 'right', width: W - MARGIN });
    });
  }

  // ─── SUMMARY (if 2+ blocks) ───────────────────────────────────────────────
  if (pricing && pricing.blocks && pricing.blocks.length > 1) {
    doc.addPage({ size: [W, H], margin: 0 });
    doc.rect(0, 0, W, H).fill(WHITE);
    drawHeader();

    doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(22)
      .text('Full Scope', MARGIN, 78);

    // Summary table
    const tY = 130;
    doc.rect(MARGIN, tY, CONTENT_W, 26).fill(BLACK);
    doc.font('Helvetica-Bold').fontSize(9).fillColor(WHITE);
    doc.text('Tasks', MARGIN + 10, tY + 8);
    doc.text(`Cost, ${currency === 'USD' ? 'USD' : 'EUR'}`, W - MARGIN - 200, tY + 8);
    doc.text('Duration', W - MARGIN - 80, tY + 8);

    let sumY = tY + 26;
    pricing.blocks.forEach((block, i) => {
      const group = serviceGroups.find(g => g.id === block.groupId);
      if (i % 2 === 1) doc.rect(MARGIN, sumY, CONTENT_W, 30).fill(GRAY_LIGHT);
      doc.font('Helvetica-Bold').fontSize(11).fillColor(BLACK)
        .text(group ? group.name : 'Services', MARGIN + 10, sumY + 8);
      doc.font('Helvetica-Bold').fontSize(12).fillColor(BLACK)
        .text(fmtCur(block.blockTotal, currency), W - MARGIN - 200, sumY + 7);
      if (group?.duration) {
        doc.font('Helvetica').fontSize(10).fillColor(GRAY_DARK)
          .text(group.duration, W - MARGIN - 80, sumY + 9);
      }
      sumY += 30;
    });

    sumY += 10;
    doc.moveTo(MARGIN, sumY).lineTo(W - MARGIN, sumY).strokeColor(BLACK).lineWidth(1).stroke();
    sumY += 14;

    const hasDiscount = proposal.finalDiscount > 0;
    const totalVal = pricing.totalConverted;
    const finalVal = pricing.finalTotalConverted;

    if (hasDiscount) {
      doc.font('Helvetica').fontSize(15).fillColor(GRAY_MED)
        .text('TOTAL: ' + fmtCur(totalVal, currency), MARGIN + 10, sumY);
      const strikeX = MARGIN + 10 + 70;
      doc.moveTo(strikeX, sumY + 8).lineTo(strikeX + 120, sumY + 8).strokeColor(GRAY_MED).lineWidth(1).stroke();
      sumY += 24;
      doc.font('Helvetica-Bold').fontSize(20).fillColor(BLACK)
        .text('TOTAL: ' + fmtCur(finalVal, currency), MARGIN + 10, sumY);
      doc.font('Helvetica').fontSize(10).fillColor(GRAY_MED)
        .text(`(${proposal.finalDiscount}% discount applied)`, MARGIN + 10, sumY + 26);
    } else {
      doc.font('Helvetica-Bold').fontSize(20).fillColor(BLACK)
        .text('TOTAL: ' + fmtCur(finalVal, currency), MARGIN + 10, sumY);
    }

    // Page number
    doc.font('Helvetica').fontSize(8).fillColor(GRAY_MED)
      .text(`Commercial Proposal. Brandon Archibald      Page _ 0${pricing.blocks.length + 1}`, 0, H - 36, { align: 'right', width: W - MARGIN });
  }

  // ─── CLOSING ───────────────────────────────────────────────────────────────
  doc.addPage({ size: [W, H], margin: 0 });
  doc.rect(0, 0, W, H).fill(BLACK);

  drawLogo(W - MARGIN - 40, 32, 28);

  doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(44)
    .text('Ready to start', MARGIN, H * 0.55);
  doc.font('Helvetica-BoldOblique').fontSize(44).fillColor(WHITE)
    .text('→ working?', MARGIN, H * 0.55 + 56);

  doc.end();
  return doc;
}

module.exports = { generateProposalPDF };

import PDFDocument from 'pdfkit';
import { CustomerProposalDTO } from '@/app/proposals/[token]/actions';
import { Locale, DEFAULT_LOCALE, isValidLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/getDictionary';

/**
 * Generates an official, vector-quality commercial proposal PDF buffer.
 * Renders 100% deterministically on a single professional A4 sheet.
 */
export async function generateProposalPdf(
  proposal: CustomerProposalDTO,
  overrideLocale?: string | null
): Promise<Buffer> {
  const targetLocale: Locale =
    overrideLocale && isValidLocale(overrideLocale)
      ? overrideLocale
      : proposal.proposalLocale && isValidLocale(proposal.proposalLocale)
      ? (proposal.proposalLocale as Locale)
      : DEFAULT_LOCALE;

  const dict = getDictionary(targetLocale);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 40,
      info: {
        Title: `${dict.common.brandName} ${dict.proposal.title} ${proposal.leadCode} Rev ${proposal.revision}`,
        Author: `${dict.common.brandName} Wholesale Packaging B.V.`,
        Subject: `${dict.proposal.title} for ${proposal.companyName}`,
      },
    });

    const buffers: Buffer[] = [];
    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', (err) => reject(err));

    const navy = '#041632';
    const darkGray = '#44474d';
    const lightGray = '#75777e';
    const bgLight = '#f8f9ff';

    // 1. Watermark for DRAFT quotes (drawn in background without disturbing doc.y cursor)
    if (proposal.status === 'DRAFT') {
      doc.save();
      doc.rotate(-35, { origin: [297, 420] });
      doc.fontSize(40).fillColor('#c5c6ce').opacity(0.25);
      doc.text(`${dict.proposal.statusDraft.toUpperCase()} — NOT FOR COMMERCIAL USE`, 30, 410, {
        align: 'center',
        width: 535,
      });
      doc.restore();
    }

    // 2. Status Banner (if special status)
    let startY = 40;
    if (proposal.status === 'SUPERSEDED') {
      doc.rect(40, 40, 515, 22).fill('#fef3c7');
      doc.fillColor('#92400e').fontSize(8.5).font('Helvetica-Bold').text(
        'SUPERSEDED PROPOSAL — This quotation has been replaced by a newer revision.',
        50,
        46
      );
      startY = 68;
    } else if (proposal.status === 'ACCEPTED') {
      doc.rect(40, 40, 515, 22).fill('#d1fae5');
      const acceptedDate = proposal.acceptedAt
        ? new Date(proposal.acceptedAt).toLocaleDateString('en-GB')
        : '';
      doc.fillColor('#065f46').fontSize(8.5).font('Helvetica-Bold').text(
        `${dict.proposal.statusAccepted.toUpperCase()} ${acceptedDate ? `— ${acceptedDate}` : ''}`,
        50,
        46
      );
      startY = 68;
    } else if (proposal.status === 'REJECTED') {
      doc.rect(40, 40, 515, 22).fill('#fee2e2');
      doc.fillColor('#991b1b').fontSize(8.5).font('Helvetica-Bold').text(
        `${dict.proposal.statusRejected.toUpperCase()}`,
        50,
        46
      );
      startY = 68;
    } else if (proposal.isExpired) {
      doc.rect(40, 40, 515, 22).fill('#f3f4f6');
      doc.fillColor('#374151').fontSize(8.5).font('Helvetica-Bold').text(
        `${dict.proposal.statusExpired.toUpperCase()} — Validity period has concluded.`,
        50,
        46
      );
      startY = 68;
    }

    // 3. Corporate Header
    doc.rect(40, startY, 515, 58).fill(navy);
    doc.fillColor('#e3c290').fontSize(8).font('Helvetica-Bold').text('PAN-EUROPEAN WHOLESALE LOGISTICS', 55, startY + 12);
    doc.fillColor('#ffffff').fontSize(16).font('Helvetica-Bold').text(`${dict.common.brandName} ${dict.proposal.title}`, 55, startY + 24);

    doc.fillColor('#ffffff').fontSize(11).font('Helvetica-Bold').text(proposal.leadCode, 420, startY + 13, { align: 'right', width: 120 });
    doc.fillColor('#8393b5').fontSize(9).font('Helvetica').text(`Revision ${proposal.revision}`, 420, startY + 28, { align: 'right', width: 120 });
    if (proposal.expiresAt && proposal.status === 'SENT') {
      doc.fillColor('#e3c290').fontSize(7.5).font('Helvetica').text(`${dict.proposal.validUntil}: ${new Date(proposal.expiresAt).toLocaleDateString('en-GB')}`, 380, startY + 42, { align: 'right', width: 160 });
    }

    // 4. Customer Block
    const custY = startY + 66;
    doc.rect(40, custY, 515, 46).fill(bgLight).stroke('#e2e4ef');
    doc.fillColor(lightGray).fontSize(7.5).font('Helvetica').text('PROPOSAL PREPARED FOR:', 55, custY + 8);
    doc.fillColor(navy).fontSize(11).font('Helvetica-Bold').text(proposal.companyName, 55, custY + 18);
    doc.fillColor(darkGray).fontSize(8.5).font('Helvetica').text(`Attn: ${proposal.contactName} • Delivery Hub: ${proposal.deliveryCity}, ${proposal.deliveryCountryCode}`, 55, custY + 31);

    // 5. Commercial Pricing Schedule Highlight
    const priceY = custY + 54;
    doc.rect(40, priceY, 515, 52).fill(navy);

    doc.fillColor('#8393b5').fontSize(7.5).font('Helvetica').text(dict.proposal.unitPrice.toUpperCase(), 55, priceY + 9);
    doc.fillColor('#ffdeac').fontSize(15).font('Helvetica-Bold').text(`€${Number(proposal.unitPriceEur).toFixed(4)} / pc`, 55, priceY + 22);

    doc.fillColor('#8393b5').fontSize(7.5).font('Helvetica').text(dict.proposal.quantity.toUpperCase(), 230, priceY + 9);
    doc.fillColor('#ffffff').fontSize(14).font('Helvetica-Bold').text(`${proposal.orderQuantity.toLocaleString()} pcs`, 230, priceY + 22);

    doc.fillColor('#8393b5').fontSize(7.5).font('Helvetica').text(dict.proposal.totalAmount.toUpperCase(), 390, priceY + 9);
    doc.fillColor('#4ade80').fontSize(15).font('Helvetica-Bold').text(
      `€${Number(proposal.totalEur).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      390,
      priceY + 22
    );

    const renderSpecRow = (label: string, value: string, yPos: number) => {
      doc.fillColor(lightGray).fontSize(8).font('Helvetica').text(label, 55, yPos);
      doc.fillColor(navy).fontSize(8).font('Helvetica-Bold').text(value, 200, yPos);
    };

    // 6. Product Specifications Section
    const specTitleY = priceY + 62;
    doc.fillColor(navy).fontSize(10).font('Helvetica-Bold').text(`1. ${dict.proposal.specsTitle}`, 40, specTitleY);

    const specStartY = specTitleY + 14;
    doc.rect(40, specStartY, 515, 76).fill(bgLight).stroke('#e2e4ef');

    let specY = specStartY + 7;
    renderSpecRow('Packaging SKU / Description:', proposal.boxSpec, specY);
    specY += 13;

    if (proposal.dimensionsMm) {
      renderSpecRow(
        'Exact Outer Dimensions:',
        `${proposal.dimensionsMm.length} × ${proposal.dimensionsMm.width} × ${proposal.dimensionsMm.height} mm`,
        specY
      );
      specY += 13;
    }

    renderSpecRow(
      'Paperboard & Print Quality:',
      `${proposal.material} Board • ${proposal.print === 'PRINTED' ? 'Custom Printed' : 'Plain Non-Printed'}`,
      specY
    );
    specY += 13;

    if (proposal.customFlute) {
      renderSpecRow('Corrugated Flute Profile:', proposal.customFlute, specY);
      specY += 13;
    }

    renderSpecRow('Annualized Volume Target:', `${proposal.monthlyVolume.toLocaleString()} pcs/mo`, specY);

    // 7. Logistics & Commercial Terms Section
    const logTitleY = specStartY + 86;
    doc.fillColor(navy).fontSize(10).font('Helvetica-Bold').text('2. Logistics & Commercial Terms', 40, logTitleY);

    const logStartY = logTitleY + 14;
    doc.rect(40, logStartY, 515, 76).fill(bgLight).stroke('#e2e4ef');

    let logY = logStartY + 7;
    renderSpecRow('Destination Logistics Hub:', `${proposal.deliveryCity}, ${proposal.deliveryCountryCode}`, logY);
    logY += 13;
    renderSpecRow('Delivery Frequency:', proposal.deliveryFrequency, logY);
    logY += 13;
    renderSpecRow('Dock Access Requirement:', proposal.hasLoadingDock ? 'Semi-Trailer Accessible' : 'Tail-Lift Vehicle Required', logY);
    logY += 13;
    renderSpecRow(`${dict.proposal.sla}:`, proposal.dispatchSla, logY);
    logY += 13;
    renderSpecRow(`${dict.proposal.paymentTerms}:`, proposal.paymentTerms, logY);

    // 8. Specification Notes (if present)
    let notesEndY = logStartY + 86;
    if (proposal.specsNotes || proposal.commercialNotes) {
      const notesTitleY = logStartY + 86;
      doc.fillColor(navy).fontSize(10).font('Helvetica-Bold').text('3. Production & Commercial Notes', 40, notesTitleY);

      const notesStartY = notesTitleY + 14;
      const combinedNotes = [proposal.specsNotes, proposal.commercialNotes].filter(Boolean).join('\n');
      doc.rect(40, notesStartY, 515, 42).fill('#eff4ff').stroke('#c5c6ce');
      doc.fillColor(darkGray).fontSize(8).font('Helvetica').text(combinedNotes, 55, notesStartY + 8, {
        width: 485,
        lineGap: 2,
      });

      notesEndY = notesStartY + 50;
    }

    // 9. Footer & Authorization Block (pinned at bottom of single A4 page)
    doc.rect(40, 745, 515, 50).fill('#ffffff').stroke('#e2e4ef');
    doc.fillColor(lightGray).fontSize(7).font('Helvetica').text(
      `${dict.common.brandName} Wholesale Packaging B.V. • Central Dispatch Hub Rotterdam, Netherlands\n${dict.legal.termsNotice}`,
      55,
      755,
      { align: 'center', width: 485 }
    );

    doc.end();
  });
}

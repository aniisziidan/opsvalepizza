import PDFDocument from 'pdfkit';
import { CustomerProposalDTO } from '@/app/proposals/[token]/actions';
import { Locale, DEFAULT_LOCALE, isValidLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/getDictionary';

/**
 * Generates an official, vector-quality commercial proposal PDF buffer.
 * Renders 100% deterministically from the immutable proposal snapshot with locked locale.
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

    // 1. Watermark for DRAFT quotes
    if (proposal.status === 'DRAFT') {
      doc.save();
      doc.rotate(-35, { origin: [300, 400] });
      doc.fontSize(42).fillColor('#e5e7eb').opacity(0.4);
      doc.text(`${dict.proposal.statusDraft.toUpperCase()} — NOT FOR COMMERCIAL USE`, 50, 400, {
        align: 'center',
      });
      doc.restore();
    }

    // 2. Status Banner
    if (proposal.status === 'SUPERSEDED') {
      doc.rect(40, 40, 515, 24).fill('#fef3c7');
      doc.fillColor('#92400e').fontSize(9).text(
        'SUPERSEDED PROPOSAL — This quotation has been replaced by a newer revision.',
        50,
        47
      );
      doc.moveDown(1.5);
    } else if (proposal.status === 'ACCEPTED') {
      doc.rect(40, 40, 515, 24).fill('#d1fae5');
      const acceptedDate = proposal.acceptedAt
        ? new Date(proposal.acceptedAt).toLocaleDateString('en-GB')
        : '';
      doc.fillColor('#065f46').fontSize(9).text(
        `${dict.proposal.statusAccepted.toUpperCase()} ${acceptedDate ? `— ${acceptedDate}` : ''}`,
        50,
        47
      );
      doc.moveDown(1.5);
    } else if (proposal.status === 'REJECTED') {
      doc.rect(40, 40, 515, 24).fill('#fee2e2');
      doc.fillColor('#991b1b').fontSize(9).text(
        `${dict.proposal.statusRejected.toUpperCase()}`,
        50,
        47
      );
      doc.moveDown(1.5);
    } else if (proposal.isExpired) {
      doc.rect(40, 40, 515, 24).fill('#f3f4f6');
      doc.fillColor('#374151').fontSize(9).text(
        `${dict.proposal.statusExpired.toUpperCase()} — Validity period has concluded.`,
        50,
        47
      );
      doc.moveDown(1.5);
    }

    const startY = doc.y > 50 ? doc.y : 45;

    // 3. Corporate Header
    doc.rect(40, startY, 515, 60).fill(navy);
    doc.fillColor('#e3c290').fontSize(8).text('PAN-EUROPEAN WHOLESALE LOGISTICS', 55, startY + 12);
    doc.fillColor('#ffffff').fontSize(17).font('Helvetica-Bold').text(`${dict.common.brandName} ${dict.proposal.title}`, 55, startY + 24);

    doc.fillColor('#ffffff').fontSize(11).font('Helvetica-Bold').text(proposal.leadCode, 420, startY + 14, { align: 'right' });
    doc.fillColor('#8393b5').fontSize(9).font('Helvetica').text(`Revision ${proposal.revision}`, 420, startY + 30, { align: 'right' });
    if (proposal.expiresAt && proposal.status === 'SENT') {
      doc.fillColor('#e3c290').fontSize(8).text(`${dict.proposal.validUntil}: ${new Date(proposal.expiresAt).toLocaleDateString('en-GB')}`, 420, startY + 44, { align: 'right' });
    }

    doc.y = startY + 75;

    // 4. Customer Block
    doc.rect(40, doc.y, 515, 50).fill(bgLight).stroke('#e2e4ef');
    const custY = doc.y + 10;
    doc.fillColor(lightGray).fontSize(8).font('Helvetica').text('PROPOSAL PREPARED FOR:', 55, custY);
    doc.fillColor(navy).fontSize(12).font('Helvetica-Bold').text(proposal.companyName, 55, custY + 12);
    doc.fillColor(darkGray).fontSize(9).font('Helvetica').text(`Attn: ${proposal.contactName} • Delivery Hub: ${proposal.deliveryCity}, ${proposal.deliveryCountryCode}`, 55, custY + 28);

    doc.y = custY + 50;

    // 5. Commercial Pricing Schedule Highlight
    doc.rect(40, doc.y, 515, 55).fill(navy);
    const priceY = doc.y + 10;

    doc.fillColor('#8393b5').fontSize(8).font('Helvetica').text(dict.proposal.unitPrice.toUpperCase(), 55, priceY);
    doc.fillColor('#ffdeac').fontSize(16).font('Helvetica-Bold').text(`€${Number(proposal.unitPriceEur).toFixed(4)} / pc`, 55, priceY + 14);

    doc.fillColor('#8393b5').fontSize(8).font('Helvetica').text(dict.proposal.quantity.toUpperCase(), 230, priceY);
    doc.fillColor('#ffffff').fontSize(14).font('Helvetica-Bold').text(`${proposal.orderQuantity.toLocaleString()} pcs`, 230, priceY + 14);

    doc.fillColor('#8393b5').fontSize(8).font('Helvetica').text(dict.proposal.totalAmount.toUpperCase(), 400, priceY);
    doc.fillColor('#4ade80').fontSize(15).font('Helvetica-Bold').text(
      `€${Number(proposal.totalEur).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      400,
      priceY + 14
    );

    doc.y = priceY + 55;

    // 6. Product Specifications Section
    doc.fillColor(navy).fontSize(11).font('Helvetica-Bold').text(`1. ${dict.proposal.specsTitle}`, 40, doc.y);
    doc.moveDown(0.4);

    const specStartY = doc.y;
    doc.rect(40, specStartY, 515, 80).fill(bgLight).stroke('#e2e4ef');

    const renderSpecRow = (label: string, value: string, yPos: number) => {
      doc.fillColor(lightGray).fontSize(8).font('Helvetica').text(label, 55, yPos);
      doc.fillColor(navy).fontSize(8).font('Helvetica-Bold').text(value, 200, yPos);
    };

    let specY = specStartY + 8;
    renderSpecRow('Packaging SKU / Description:', proposal.boxSpec, specY);
    specY += 14;

    if (proposal.dimensionsMm) {
      renderSpecRow(
        'Exact Outer Dimensions:',
        `${proposal.dimensionsMm.length} × ${proposal.dimensionsMm.width} × ${proposal.dimensionsMm.height} mm`,
        specY
      );
      specY += 14;
    }

    renderSpecRow(
      'Paperboard & Print Quality:',
      `${proposal.material} Board • ${proposal.print === 'PRINTED' ? 'Custom Printed' : 'Plain Non-Printed'}`,
      specY
    );
    specY += 14;

    if (proposal.customFlute) {
      renderSpecRow('Corrugated Flute Profile:', proposal.customFlute, specY);
      specY += 14;
    }

    renderSpecRow('Annualized Volume Target:', `${proposal.monthlyVolume.toLocaleString()} pcs/mo`, specY);

    doc.y = specStartY + 90;

    // 7. Logistics & Commercial Terms Section
    doc.fillColor(navy).fontSize(11).font('Helvetica-Bold').text('2. Logistics & Commercial Terms', 40, doc.y);
    doc.moveDown(0.4);

    const logStartY = doc.y;
    doc.rect(40, logStartY, 515, 70).fill(bgLight).stroke('#e2e4ef');

    let logY = logStartY + 8;
    renderSpecRow('Destination Logistics Hub:', `${proposal.deliveryCity}, ${proposal.deliveryCountryCode}`, logY);
    logY += 14;
    renderSpecRow('Delivery Frequency:', proposal.deliveryFrequency, logY);
    logY += 14;
    renderSpecRow('Dock Access Requirement:', proposal.hasLoadingDock ? 'Semi-Trailer Accessible' : 'Tail-Lift Vehicle Required', logY);
    logY += 14;
    renderSpecRow(`${dict.proposal.sla}:`, proposal.dispatchSla, logY);
    logY += 14;
    renderSpecRow(`${dict.proposal.paymentTerms}:`, proposal.paymentTerms, logY);

    doc.y = logStartY + 80;

    // 8. Specification Notes
    if (proposal.specsNotes || proposal.commercialNotes) {
      doc.fillColor(navy).fontSize(11).font('Helvetica-Bold').text('3. Production & Commercial Notes', 40, doc.y);
      doc.moveDown(0.4);

      const notesStartY = doc.y;
      const combinedNotes = [proposal.specsNotes, proposal.commercialNotes].filter(Boolean).join('\n');
      doc.rect(40, notesStartY, 515, 45).fill('#eff4ff').stroke('#c5c6ce');
      doc.fillColor(darkGray).fontSize(8).font('Helvetica').text(combinedNotes, 55, notesStartY + 8, {
        width: 485,
        lineGap: 2,
      });

      doc.y = notesStartY + 55;
    }

    // 9. Footer & Authorization Block
    doc.rect(40, 740, 515, 55).fill('#ffffff').stroke('#e2e4ef');
    doc.fillColor(lightGray).fontSize(7).font('Helvetica').text(
      `${dict.common.brandName} Wholesale Packaging B.V. • Central Dispatch Hub Rotterdam, Netherlands\n${dict.legal.termsNotice}`,
      55,
      750,
      { align: 'center', width: 485 }
    );

    doc.end();
  });
}

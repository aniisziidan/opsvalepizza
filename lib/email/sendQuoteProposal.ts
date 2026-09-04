export interface QuoteProposalEmailInput {
  leadCode: string;
  revision: number;
  companyName: string;
  contactName: string;
  contactEmail: string;
  boxSpec: string;
  qty: number;
  unitPriceEur: string;
  totalEur: string;
  expiresAt: string;
  proposalUrl: string;
  specsNotes?: string | null;
}

import { escapeHtml } from './escapeHtml';

export function buildQuoteProposalEmail(data: QuoteProposalEmailInput): {
  subject: string;
  text: string;
  html: string;
} {
  const subject = `[OpsVale Commercial Proposal] ${data.leadCode} (Rev ${data.revision}) — ${data.companyName}`;

  // Escape values that originate from (or derive from) customer-supplied input
  // before interpolating them into the HTML body.
  const safe = {
    leadCode: escapeHtml(data.leadCode),
    companyName: escapeHtml(data.companyName),
    contactName: escapeHtml(data.contactName),
    boxSpec: escapeHtml(data.boxSpec),
    specsNotes: escapeHtml(data.specsNotes),
    proposalUrl: escapeHtml(data.proposalUrl),
  };

  const text = `
Dear ${data.contactName},

Thank you for your inquiry with OpsVale European Wholesale Packaging.

We are pleased to present our official commercial proposal (Rev ${data.revision}) for ${data.companyName}:

--------------------------------------------------
Lead Reference:     ${data.leadCode} (Revision ${data.revision})
Packaging SKU:      ${data.boxSpec}
Order Quantity:     ${data.qty.toLocaleString()} boxes
Unit Wholesale:     €${Number(data.unitPriceEur).toFixed(4)} / box
Total Net Value:    €${Number(data.totalEur).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
Valid Until:        ${new Date(data.expiresAt).toLocaleDateString('en-GB')}
--------------------------------------------------
${data.specsNotes ? `Specification Notes:\n${data.specsNotes}\n--------------------------------------------------\n` : ''}

You can inspect the full specification sheet, review delivery terms, and accept or request modifications directly on your secure commercial portal:
${data.proposalUrl}

If you have any questions or require custom pallet staging, our European logistics team is at your service.

Best regards,
OpsVale Procurement & Distribution
Rotterdam Hub • Central Europe
https://opsvale.com
`.trim();

  const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; color: #0b1c30; line-height: 1.6;">
  <div style="background-color: #041632; color: #ffffff; padding: 24px; border-radius: 8px 8px 0 0; text-align: left;">
    <span style="font-family: monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #e3c290; display: block; margin-bottom: 4px;">
      European Commercial Proposal
    </span>
    <h2 style="margin: 0; font-size: 22px; font-weight: bold;">OpsVale Packaging Proposal</h2>
    <p style="margin: 6px 0 0 0; font-family: monospace; font-size: 13px; color: #8393b5;">
      Reference: <strong style="color: #ffffff;">${safe.leadCode}</strong> • Revision ${data.revision}
    </p>
  </div>

  <div style="background-color: #ffffff; padding: 28px; border: 1px solid #c5c6ce; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="margin-top: 0; font-size: 15px;">
      Dear <strong>${safe.contactName}</strong>,
    </p>
    <p style="font-size: 14px; color: #44474d;">
      We have finalized the factory-direct pricing for <strong>${safe.companyName}</strong> based on your requested specifications.
    </p>

    <div style="background-color: #f8f9ff; border: 1px solid #c5c6ce; border-radius: 8px; padding: 18px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <tr style="border-bottom: 1px solid #e2e4ef;">
          <td style="padding: 8px 0; color: #75777e;">Packaging SKU:</td>
          <td style="padding: 8px 0; font-weight: bold; color: #041632; text-align: right;">${safe.boxSpec}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e4ef;">
          <td style="padding: 8px 0; color: #75777e;">Order Batch Volume:</td>
          <td style="padding: 8px 0; font-weight: bold; color: #041632; text-align: right;">${data.qty.toLocaleString()} boxes</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e4ef;">
          <td style="padding: 8px 0; color: #75777e;">Unit Wholesale Price:</td>
          <td style="padding: 8px 0; font-weight: bold; color: #e77114; font-size: 15px; text-align: right;">
            €${Number(data.unitPriceEur).toFixed(4)} <span style="font-size: 11px; font-weight: normal; color: #75777e;">/ pc</span>
          </td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e4ef;">
          <td style="padding: 8px 0; color: #75777e;">Total Order Value:</td>
          <td style="padding: 8px 0; font-weight: bold; color: #041632; font-size: 16px; text-align: right;">
            €${Number(data.totalEur).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #75777e;">Proposal Expiry:</td>
          <td style="padding: 8px 0; font-family: monospace; font-size: 12px; color: #041632; text-align: right;">
            ${new Date(data.expiresAt).toLocaleDateString('en-GB')}
          </td>
        </tr>
      </table>
    </div>

    ${
      data.specsNotes
        ? `<div style="background-color: #eff4ff; border-left: 4px solid #041632; padding: 12px 16px; border-radius: 4px; margin-bottom: 24px; font-size: 13px; color: #041632;">
            <strong>Specification Notes:</strong> ${safe.specsNotes}
          </div>`
        : ''
    }

    <div style="text-align: center; margin: 30px 0 20px 0;">
      <a href="${safe.proposalUrl}" style="background-color: #e77114; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block; letter-spacing: 0.5px; box-shadow: 0 4px 6px -1px rgba(231, 113, 20, 0.2);">
        Review &amp; Accept Proposal &rarr;
      </a>
    </div>

    <p style="font-size: 11px; color: #75777e; text-align: center; margin-top: 16px;">
      Direct Portal Link: <br />
      <a href="${safe.proposalUrl}" style="color: #e77114; word-break: break-all;">${safe.proposalUrl}</a>
    </p>

    <hr style="border: none; border-top: 1px solid #e2e4ef; margin: 24px 0;" />

    <p style="font-size: 11px; color: #8393b5; margin-bottom: 0;">
      OpsVale European Distribution B.V. • Central Dispatch Hub • Rotterdam, Netherlands<br />
      This communication contains confidential commercial terms intended solely for ${safe.companyName}.
    </p>
  </div>
</div>
`.trim();

  return { subject, text, html };
}

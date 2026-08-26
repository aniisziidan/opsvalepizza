import { emailSender } from './transporter';

export interface NewQuoteNotificationInput {
  leadCode: string;
  companyName: string;
  contactName: string;
  workEmail: string;
  phoneNumber: string;
  branches: string;
  boxSpec: string;
  monthlyVolume: number;
  deliveryCity: string;
  deliveryCountry: string;
  hasFiles: boolean;
  notes?: string;
}

export async function notifyNewQuote(data: NewQuoteNotificationInput): Promise<void> {
  const recipient = process.env.ADMIN_NOTIFY_EMAIL || 'admin@opsvale.com';
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const adminLeadUrl = `${appUrl}/admin/leads`;

  const subject = `[OpsVale Quote Alert] ${data.leadCode} — ${data.companyName}`;

  const textContent = `
New Wholesale Quote Request Received!

Lead Reference: ${data.leadCode}
Company: ${data.companyName} (${data.branches} branches)
Contact: ${data.contactName}
Email: ${data.workEmail}
Phone: ${data.phoneNumber}

Packaging Specs: ${data.boxSpec}
Monthly Volume: ${data.monthlyVolume.toLocaleString()} units
Destination: ${data.deliveryCity}, ${data.deliveryCountry}
Attached Files: ${data.hasFiles ? 'Yes' : 'No'}

Customer Notes:
${data.notes || 'None provided'}

View this lead in the Admin CRM:
${adminLeadUrl}
`.trim();

  const htmlContent = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #0b1c30; line-height: 1.5;">
  <div style="background-color: #041632; color: #ffffff; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h2 style="margin: 0; font-size: 22px;">New Quote Request Transmitted</h2>
    <p style="margin: 5px 0 0 0; font-family: monospace; font-size: 16px; color: #e77114;">${data.leadCode}</p>
  </div>
  <div style="background-color: #ffffff; padding: 24px; border: 1px solid #c5c6ce; border-top: none; border-radius: 0 0 8px 8px;">
    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
      <tr style="border-bottom: 1px solid #eff4ff;">
        <td style="padding: 8px 0; font-weight: bold; color: #44474d;">Company:</td>
        <td style="padding: 8px 0; font-weight: bold; color: #041632;">${data.companyName} (${data.branches} branches)</td>
      </tr>
      <tr style="border-bottom: 1px solid #eff4ff;">
        <td style="padding: 8px 0; font-weight: bold; color: #44474d;">Contact:</td>
        <td style="padding: 8px 0;">${data.contactName} (${data.workEmail}, ${data.phoneNumber})</td>
      </tr>
      <tr style="border-bottom: 1px solid #eff4ff;">
        <td style="padding: 8px 0; font-weight: bold; color: #44474d;">Packaging:</td>
        <td style="padding: 8px 0; font-family: monospace;">${data.boxSpec}</td>
      </tr>
      <tr style="border-bottom: 1px solid #eff4ff;">
        <td style="padding: 8px 0; font-weight: bold; color: #44474d;">Monthly Volume:</td>
        <td style="padding: 8px 0; font-weight: bold;">${data.monthlyVolume.toLocaleString()} boxes/month</td>
      </tr>
      <tr style="border-bottom: 1px solid #eff4ff;">
        <td style="padding: 8px 0; font-weight: bold; color: #44474d;">Delivery Hub:</td>
        <td style="padding: 8px 0;">${data.deliveryCity}, ${data.deliveryCountry}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: bold; color: #44474d;">Artwork Attached:</td>
        <td style="padding: 8px 0;">${data.hasFiles ? 'Yes' : 'No'}</td>
      </tr>
    </table>
    
    ${
      data.notes
        ? `<div style="margin-top: 16px; background-color: #f8f9ff; padding: 12px; border-radius: 6px; border-left: 4px solid #e77114;">
            <p style="margin: 0; font-size: 13px; color: #44474d; font-weight: bold;">Customer Notes:</p>
            <p style="margin: 4px 0 0 0; font-size: 13px;">${data.notes}</p>
          </div>`
        : ''
    }

    <div style="margin-top: 24px; text-align: center;">
      <a href="${adminLeadUrl}" style="background-color: #e77114; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block;">
        Open Lead in OpsVale Admin
      </a>
    </div>
  </div>
</div>
`.trim();

  await emailSender.sendMail({
    from: `"OpsVale Logistics" <${process.env.SMTP_USER || 'no-reply@opsvale.com'}>`,
    to: recipient,
    subject,
    text: textContent,
    html: htmlContent,
  });
}

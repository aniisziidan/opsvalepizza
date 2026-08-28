import nodemailer from 'nodemailer';

export interface EmailMessage {
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface EmailSender {
  sendMail(msg: EmailMessage): Promise<{ messageId?: string; sent: boolean }>;
}

export const DEFAULT_FROM_EMAIL =
  process.env.EMAIL_FROM || '"OpsVale Customer Service" <customerservice@opsvale.com>';

class ConsoleEmailSender implements EmailSender {
  async sendMail(msg: EmailMessage): Promise<{ messageId: string; sent: boolean }> {
    console.log('\n--- [EMAIL NOTIFICATION (DEV NO-OP)] ---');
    console.log(`To: ${msg.to}`);
    console.log(`From: ${msg.from}`);
    console.log(`Subject: ${msg.subject}`);
    console.log('--- Body ---');
    console.log(msg.text);
    console.log('----------------------------------------\n');
    return { messageId: `dev-${Date.now()}`, sent: true };
  }
}

class ResendApiSender implements EmailSender {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async sendMail(msg: EmailMessage): Promise<{ messageId?: string; sent: boolean }> {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: msg.from,
        to: msg.to,
        subject: msg.subject,
        text: msg.text,
        html: msg.html || undefined,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(`Resend API error (${res.status}): ${JSON.stringify(errorData)}`);
    }

    const data = (await res.json()) as { id: string };
    return { messageId: data.id, sent: true };
  }
}

class SMTPEmailSender implements EmailSender {
  private transporter: nodemailer.Transporter;

  constructor() {
    const host = process.env.SMTP_HOST!;
    const port = parseInt(process.env.SMTP_PORT || '465', 10);
    const secure = process.env.SMTP_SECURE !== 'false';
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
    });
  }

  async sendMail(msg: EmailMessage): Promise<{ messageId?: string; sent: boolean }> {
    const info = await this.transporter.sendMail({
      from: msg.from,
      to: msg.to,
      subject: msg.subject,
      text: msg.text,
      html: msg.html,
    });
    return { messageId: info.messageId, sent: true };
  }
}

export function getEmailSender(): EmailSender {
  const resendApiKey =
    process.env.RESEND_API_KEY ||
    (process.env.SMTP_PASS?.startsWith('re_') ? process.env.SMTP_PASS : null);

  if (resendApiKey && resendApiKey.trim().length > 0) {
    return new ResendApiSender(resendApiKey.trim());
  }

  if (process.env.SMTP_HOST && process.env.SMTP_HOST.trim().length > 0) {
    return new SMTPEmailSender();
  }

  return new ConsoleEmailSender();
}

export const emailSender: EmailSender = getEmailSender();

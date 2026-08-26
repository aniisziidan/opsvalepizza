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
  if (process.env.SMTP_HOST && process.env.SMTP_HOST.trim().length > 0) {
    return new SMTPEmailSender();
  }
  return new ConsoleEmailSender();
}

export const emailSender: EmailSender = getEmailSender();

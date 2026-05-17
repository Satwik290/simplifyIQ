import * as nodemailer from 'nodemailer';
import sgMail from '@sendgrid/mail';
import { logger } from '../utils/logger';

export class EmailService {
  private useSendGrid = false;
  private smtpTransporter: nodemailer.Transporter | null = null;
  private fromEmail = 'noreply@simplif-iq.com';
  private fromName = 'SimplifIQ Audits';

  constructor() {
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@simplif-iq.com';
    this.fromName = process.env.EMAIL_FROM_NAME || 'SimplifIQ Audits';

    const provider = (process.env.EMAIL_PROVIDER || 'nodemailer').toLowerCase();
    
    if (provider === 'sendgrid') {
      const apiKey = process.env.SENDGRID_API_KEY;
      if (apiKey) {
        sgMail.setApiKey(apiKey);
        this.useSendGrid = true;
        logger.info('SendGrid Email Provider initialized.');
      } else {
        logger.warn('SendGrid provider selected but SENDGRID_API_KEY is missing. Falling back to SMTP...');
        this.initializeSMTP();
      }
    } else {
      this.initializeSMTP();
    }
  }

  private initializeSMTP(): void {
    const host = process.env.SMTP_HOST || 'smtp.mailtrap.io';
    const port = parseInt(process.env.SMTP_PORT || '2525', 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!user || !pass) {
      logger.warn('SMTP credentials missing in .env. Email delivery may fail or run in dry-run mode.', {
        host,
        port
      });
    }

    this.smtpTransporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // True for port 465, false for other ports
      auth: user && pass ? { user, pass } : undefined
    });

    this.useSendGrid = false;
    logger.info('SMTP Nodemailer Email Provider initialized successfully.', { host, port });
  }

  /**
   * Sends the compiled PDF report directly to the prospect's inbox
   */
  async sendReportEmail(
    toEmail: string,
    contactName: string,
    companyName: string,
    pdfBuffer: Buffer
  ): Promise<string> {
    logger.info(`Drafting follow-up B2B email to ${toEmail} for ${companyName}...`);
    
    const subject = `Your Personalized B2B Growth Audit - ${companyName}`;
    const filename = `${companyName.replace(/[^a-z0-9]/gi, '_')}_Growth_Audit_Report.pdf`;

    // Premium designed HTML template matching our Trust Blue & Growth Green system colors
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            color: #1F2937;
            background-color: #F9FAFB;
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background-color: #FFFFFF;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            border: 1px solid #E5E7EB;
          }
          .header {
            background-color: #1E3A8A; /* Trust Blue */
            padding: 40px 30px;
            text-align: center;
          }
          .header h1 {
            color: #FFFFFF;
            font-size: 24px;
            margin: 0;
            font-weight: 800;
            letter-spacing: -0.025em;
          }
          .header p {
            color: #F59E0B; /* Accent Gold */
            font-size: 13px;
            margin: 8px 0 0 0;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          .body {
            padding: 40px 30px;
            line-height: 1.6;
          }
          .body h2 {
            color: #1E3A8A;
            font-size: 18px;
            margin-top: 0;
            margin-bottom: 16px;
            font-weight: 700;
          }
          .body p {
            font-size: 15px;
            margin-top: 0;
            margin-bottom: 20px;
            color: #4B5563;
          }
          .highlight-box {
            background-color: #F3F4F6;
            border-left: 4px solid #10B981; /* Growth Green */
            padding: 20px;
            margin-bottom: 24px;
            border-radius: 0 4px 4px 0;
          }
          .highlight-box h3 {
            margin: 0 0 8px 0;
            color: #1F2937;
            font-size: 14px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.025em;
          }
          .highlight-box ul {
            margin: 0;
            padding-left: 20px;
            color: #4B5563;
            font-size: 14px;
          }
          .highlight-box li {
            margin-bottom: 6px;
          }
          .highlight-box li:last-child {
            margin-bottom: 0;
          }
          .btn-container {
            text-align: center;
            margin: 32px 0 10px 0;
          }
          .btn {
            background-color: #10B981; /* Growth Green */
            color: #FFFFFF !important;
            text-decoration: none;
            padding: 12px 28px;
            border-radius: 6px;
            font-weight: 700;
            font-size: 15px;
            display: inline-block;
            box-shadow: 0 2px 4px 0 rgba(16, 185, 129, 0.2);
            transition: background-color 0.2s ease;
          }
          .footer {
            background-color: #F9FAFB;
            padding: 24px 30px;
            text-align: center;
            border-top: 1px solid #E5E7EB;
            color: #9CA3AF;
            font-size: 12px;
          }
          .footer a {
            color: #1E3A8A;
            text-decoration: none;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>SimplifIQ</h1>
            <p>B2B Growth Automation & Research</p>
          </div>
          <div class="body">
            <h2>Hi ${contactName},</h2>
            <p>
              Thank you for submitting your lead details. Our digital analysis and research engines have completed an automated audit of your organization's website presence for <strong>${companyName}</strong>.
            </p>
            <p>
              We have attached a highly comprehensive, personalized PDF report outlining our findings directly to this email.
            </p>
            
            <div class="highlight-box">
              <h3>What's Inside Your Growth Playbook:</h3>
              <ul>
                <li><strong>Value Proposition Audit:</strong> Aligning page layout scripts with key search intents.</li>
                <li><strong>B2B SWOT Quadrants:</strong> Identifying weaknesses and external threats in the digital field.</li>
                <li><strong>Modern Industry Trends:</strong> Assessing tech alignment scores in real-time.</li>
                <li><strong>Tailored Recommendations:</strong> High-priority adjustments for Web UX, systems integration, and marketing channels.</li>
              </ul>
            </div>
            
            <p>
              Please open the attached PDF (<strong>${filename}</strong>) to view your personalized recommendations. We hope these insights help accelerate your digital strategy!
            </p>
            
            <p style="margin-bottom: 0;">
              Best regards,<br>
              <strong>The SimplifIQ Strategy Team</strong>
            </p>
          </div>
          <div class="footer">
            &copy; 2026 SimplifIQ Lead Automation System. All rights reserved.<br>
            Delivering data-driven insights. Need support? Reply directly to this email.
          </div>
        </div>
      </body>
      </html>
    `;

    // 1. Send via SendGrid Driver
    if (this.useSendGrid) {
      try {
        const msg = {
          to: toEmail,
          from: {
            email: this.fromEmail,
            name: this.fromName
          },
          subject,
          html: htmlContent,
          attachments: [
            {
              content: pdfBuffer.toString('base64'),
              filename,
              type: 'application/pdf',
              disposition: 'attachment'
            }
          ]
        };
        
        logger.info('Broadcasting email via SendGrid API...');
        await sgMail.send(msg);
        logger.info(`SendGrid email successfully delivered to ${toEmail}`);
        return 'SendGrid';
      } catch (error) {
        logger.error('SendGrid dispatch failed, attempting local SMTP fallback...', error);
        // If SendGrid fails, try standard SMTP if initialized
        if (this.smtpTransporter) {
          return await this.sendViaSMTP(toEmail, subject, htmlContent, pdfBuffer, filename);
        }
        throw error;
      }
    } 
    
    // 2. Send via SMTP Nodemailer Driver
    if (this.smtpTransporter) {
      return await this.sendViaSMTP(toEmail, subject, htmlContent, pdfBuffer, filename);
    }

    logger.warn('No active email driver available. Simulating success (Dry Run)...');
    return 'DryRun (No credentials)';
  }

  private async sendViaSMTP(
    toEmail: string,
    subject: string,
    htmlContent: string,
    pdfBuffer: Buffer,
    filename: string
  ): Promise<string> {
    if (!this.smtpTransporter) {
      throw new Error('SMTP transporter is uninitialized');
    }

    const mailOptions = {
      from: `"${this.fromName}" <${this.fromEmail}>`,
      to: toEmail,
      subject,
      html: htmlContent,
      attachments: [
        {
          filename,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    };

    logger.info('Broadcasting email via local SMTP transporter...');
    const info = await this.smtpTransporter.sendMail(mailOptions);
    logger.info(`SMTP email successfully delivered to ${toEmail}. MessageID: ${info.messageId}`);
    return 'SMTP';
  }
}

import { google } from 'googleapis';
import { Readable } from 'stream';
import { Lead } from './leadService';
import { logger } from '../utils/logger';

export class GoogleService {
  private authClient: any = null;
  private sheetsId: string | null = null;
  private driveFolderId: string | null = null;

  constructor() {
    this.sheetsId = process.env.GOOGLE_SHEETS_ID || null;
    this.driveFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID || null;

    const credentialsJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (credentialsJson) {
      try {
        let creds;
        // Handle either stringified JSON or double-escaped Docker-style strings
        if (credentialsJson.trim().startsWith('{')) {
          creds = JSON.parse(credentialsJson);
        } else {
          // If it's encoded or wrapped, unwrap it
          creds = JSON.parse(Buffer.from(credentialsJson, 'base64').toString('utf-8'));
        }

        // Initialize JWT Auth client for Google Service Account
        this.authClient = new google.auth.JWT({
          email: creds.client_email,
          key: creds.private_key,
          scopes: [
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/drive'
          ]
        });
        logger.info('Google Service Account authentication initialized successfully.');
      } catch (error) {
        logger.warn('Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON. Google services will be in dry-run mode.', error);
      }
    } else {
      logger.info('GOOGLE_SERVICE_ACCOUNT_JSON is not defined. Google Sheets/Drive tracking will be bypassed.');
    }
  }

  /**
   * Helper to verify if Google API client is ready
   */
  private isReady(): boolean {
    return this.authClient !== null;
  }

  /**
   * Logs lead details to Google Sheets in real-time
   */
  async logLeadToSheets(lead: Lead): Promise<void> {
    if (!this.isReady() || !this.sheetsId) {
      logger.info('[Dry Run] Bypassing Google Sheets logging. Add service account credentials to enable.');
      return;
    }

    try {
      const sheets = google.sheets({ version: 'v4', auth: this.authClient });
      
      const values = [
        [
          lead.id,
          lead.companyName,
          lead.website,
          lead.industry,
          lead.contactName,
          lead.email,
          lead.status,
          lead.createdAt,
          new Date().toISOString()
        ]
      ];

      logger.info(`Appending lead row to Google Sheet (ID: ${this.sheetsId})...`);
      
      await sheets.spreadsheets.values.append({
        spreadsheetId: this.sheetsId,
        range: 'Sheet1!A:I',
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values
        }
      });

      logger.info('Successfully logged lead data to Google Sheet row.');
    } catch (error) {
      logger.error('Google Sheets logging transaction failed', error);
      // Suppress error so core form intake is unaffected
    }
  }

  /**
   * Archives compiled PDF to Google Drive folder and returns the file ID
   */
  async uploadPDFToDrive(filename: string, pdfBuffer: Buffer): Promise<string | null> {
    if (!this.isReady()) {
      logger.info('[Dry Run] Bypassing Google Drive archive. Add service account credentials to enable.');
      return null;
    }

    try {
      const drive = google.drive({ version: 'v3', auth: this.authClient });
      
      // Convert buffer to readable stream for drive uploads
      const bufferStream = new Readable();
      bufferStream.push(pdfBuffer);
      bufferStream.push(null);

      const fileMetadata = {
        name: filename,
        mimeType: 'application/pdf',
        parents: this.driveFolderId ? [this.driveFolderId] : undefined
      };

      const media = {
        mimeType: 'application/pdf',
        body: bufferStream
      };

      logger.info(`Uploading PDF report to Google Drive...`);
      
      const file = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, webViewLink'
      });

      const fileId = file.data.id || null;
      logger.info(`Successfully uploaded PDF to Google Drive. FileID: ${fileId}`);
      
      return fileId;
    } catch (error) {
      logger.error('Google Drive archival upload failed', error);
      // Return null so the main thread completes smoothly
      return null;
    }
  }
}

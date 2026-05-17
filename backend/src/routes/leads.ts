import { Router, Request, Response } from 'express';
import { leadIntakeSchema } from '../utils/validation';
import { LeadService } from '../services/leadService';
import { EnrichmentService } from '../services/enrichmentService';
import { GeminiService } from '../services/geminiService';
import { ReportService } from '../services/reportService';
import { EmailService } from '../services/emailService';
import { GoogleService } from '../services/googleService';
import { logger } from '../utils/logger';

const router = Router();

// Initialize all required pipeline services
const leadService = new LeadService();
const enrichmentService = new EnrichmentService();
const geminiService = new GeminiService();
const reportService = new ReportService();
const emailService = new EmailService();
const googleService = new GoogleService();

/**
 * GET /api/leads - Admin route to list all submitted leads
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const leads = await leadService.listLeads();
    return res.status(200).json({ success: true, count: leads.length, leads });
  } catch (error) {
    logger.error('Failed to retrieve leads list', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/leads/:id - Polling endpoint to check live lead report generation status
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const lead = await leadService.getLead(id);
    
    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }
    
    return res.status(200).json({ success: true, lead });
  } catch (error) {
    logger.error(`Error fetching lead with ID: ${req.params.id}`, error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * POST /api/leads - Form intake endpoint
 * Validates, saves as pending, returns immediately, then runs enrichment/audit in the background
 */
router.post('/', async (req: Request, res: Response) => {
  logger.info('Lead submission API trigger received', { body: req.body });

  // 1. Zod Validation
  const validationResult = leadIntakeSchema.safeParse(req.body);
  if (!validationResult.success) {
    const errors = validationResult.error.flatten().fieldErrors;
    logger.warn('Form validation failed on lead intake API', { errors });
    return res.status(400).json({
      success: false,
      error: 'Form validation failed',
      details: errors
    });
  }

  const leadInput = validationResult.data;

  try {
    // 2. Create Lead Record with 'pending' status
    const initialLead = await leadService.saveLead(leadInput);

    // 3. Return response with leadId immediately (Under 200ms latency)
    res.status(202).json({
      success: true,
      leadId: initialLead.id,
      message: 'Lead received. Research and report generation started in the background.',
      timestamp: initialLead.createdAt
    });

    // 4. Asynchronous Background Core Loop Execution
    // Wrapped in an IIFE to run non-blockingly
    (async () => {
      const leadId = initialLead.id;
      logger.info(`[Background Engine] Launching audit pipeline for Lead: ${leadId}`);

      try {
        // Step 4.1: Update state to 'enriching' & Scrape homepage
        logger.info(`[Background Engine] [${leadId}] Step 1: Web scraping starting...`);
        let currentLead = await leadService.updateLead(leadId, { status: 'enriching' });
        
        const enrichedData = await enrichmentService.enrichCompanyData(currentLead.website, currentLead.domain);
        
        // Save scraped values into database so report compiler can read it
        currentLead = await leadService.updateLead(leadId, { enrichedData: enrichedData as unknown as Record<string, unknown> });

        // Step 4.2: Update state to 'generating' & Call Gemini + PDFKit
        logger.info(`[Background Engine] [${leadId}] Step 2: AI consulting synthesis starting...`);
        currentLead = await leadService.updateLead(leadId, { status: 'generating' });
        
        const reportData = await geminiService.generateAuditReport(
          currentLead.companyName,
          currentLead.industry,
          enrichedData
        );
        
        // Render PDF audit report using PDFKit in-memory buffer stream
        const pdfBuffer = await reportService.generateReport(currentLead, reportData);

        // Optional Step 4.3: Upload PDF to Google Drive Archive (P1 Bonus)
        const filename = `${currentLead.companyName.replace(/[^a-z0-9]/gi, '_')}_Growth_Audit.pdf`;
        await googleService.uploadPDFToDrive(filename, pdfBuffer);

        // Save generated report details to database
        currentLead = await leadService.updateLead(leadId, {
          reportData: reportData as unknown as Record<string, unknown>,
          pdfFilename: filename
        });

        // Step 4.4: Deliver HTML email with PDF attachment (P0 MVP Core)
        logger.info(`[Background Engine] [${leadId}] Step 3: Broadcasting email...`);
        const emailDriver = await emailService.sendReportEmail(
          currentLead.email,
          currentLead.contactName,
          currentLead.companyName,
          pdfBuffer
        );

        // Optional Step 4.5: Log finalized lead details to Google Sheets (P1 Bonus)
        await googleService.logLeadToSheets({
          ...currentLead,
          status: 'sent' // Append as successfully sent
        });

        // Step 4.6: Update state to 'sent' (Completed!)
        await leadService.updateLead(leadId, { status: 'sent' });
        logger.info(`[Background Engine] [${leadId}] Pipeline completed successfully. Email Driver: ${emailDriver}`);

      } catch (pipelineError) {
        logger.error(`[Background Engine] [${leadId}] Core pipeline failed during execution`, pipelineError);
        
        // Update database with failed flag and error log
        const errorMsg = pipelineError instanceof Error ? pipelineError.message : String(pipelineError);
        await leadService.updateLead(leadId, {
          status: 'failed',
          errorMessage: errorMsg
        });
      }
    })();

    return;
  } catch (error) {
    logger.error('Failed to initiate lead database insertion', error);
    return res.status(500).json({ success: false, error: 'Database transaction failed' });
  }
});

export default router;

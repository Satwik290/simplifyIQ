import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { Lead } from '../services/leadService';
import { EnrichmentService } from '../services/enrichmentService';
import { GeminiService } from '../services/geminiService';
import { ReportService } from '../services/reportService';
import { leadIntakeSchema } from '../utils/validation';
import { logger } from '../utils/logger';

// Load environment variables locally
dotenv.config();

async function runPipelineVerification() {
  logger.info('=======================================================');
  logger.info(' SimplifIQ Pipeline End-to-End Local CLI Verification ');
  logger.info('=======================================================');

  // Verify Gemini Key
  if (!process.env.GEMINI_API_KEY) {
    logger.warn('GEMINI_API_KEY is not defined in .env. Running in Offline Mock Intelligence mode.');
  }

  // 1. Instantiation
  const enrichmentService = new EnrichmentService();
  const geminiService = new GeminiService();
  const reportService = new ReportService();

  // Mock Lead submission details
  const parsedLead = leadIntakeSchema.parse({
    companyName: 'techcorp av systems',
    website: 'https://github.com',
    industry: 'audio visual field installations',
    contactName: 'johnathan doe',
    email: 'john@techcorp.com',
  });

  const mockLead: Lead = {
    id: 'verify-uuid-' + Math.random().toString(36).substring(2, 7),
    companyName: parsedLead.companyName,
    website: parsedLead.website, 
    domain: 'github.com',
    industry: parsedLead.industry,
    contactName: parsedLead.contactName,
    email: parsedLead.email,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  try {
    // 2. Scraping Phase
    logger.info(`Phase 1: Running Scraper on: ${mockLead.website}...`);
    const enrichedData = await enrichmentService.enrichCompanyData(mockLead.website, mockLead.domain);
    logger.info('Scraper extraction complete.', {
      scrapingStatus: enrichedData.scrapingStatus,
      title: enrichedData.title,
      techCount: enrichedData.technologyHints.length,
      emailsFound: enrichedData.contactInfo.emails.length
    });

    // Append enriched data to lead mock
    mockLead.enrichedData = enrichedData as unknown as Record<string, unknown>;

    // 3. Gemini Advisory Synthesis
    logger.info('Phase 2: Querying Gemini 1.5 Flash B2B Synthesis...');
    const reportData = await geminiService.generateAuditReport(
      mockLead.companyName,
      mockLead.industry,
      enrichedData
    );
    logger.info('Gemini AI synthesis complete. Executive summary value prop preview:');
    console.log(`> "${reportData.executiveSummary.valueProposition.substring(0, 120)}..."`);
    console.log(`> Speculated Scale: ${reportData.companyProfile.speculatedScale}`);
    console.log(`> Speculated Digital Grade: ${reportData.companyProfile.digitalCompetence}`);

    // 4. PDF Compilation Phase
    logger.info('Phase 3: Launching PDFKit Renderer...');
    const pdfBuffer = await reportService.generateReport(mockLead, reportData);
    
    // Save PDF output physically to the backend root directory for verification inspection
    const testPdfPath = path.join(__dirname, '../../test_growth_audit.pdf');
    fs.writeFileSync(testPdfPath, pdfBuffer);
    
    logger.info('=======================================================');
    logger.info(' VERIFICATION COMPLETE! ');
    logger.info(` Generated PDF Location: ${testPdfPath}`);
    logger.info(` PDF File Size: ${pdfBuffer.length} bytes`);
    logger.info('=======================================================');
    logger.info('Double-click and open the generated PDF to inspect visual aesthetics, font colors, cover design, SWOT grids, and card badges!');

  } catch (error) {
    logger.error('Pipeline E2E CLI verification failed with critical exception', error);
    process.exit(1);
  }
}

// Execute script
runPipelineVerification();

import PDFDocument from 'pdfkit';
import { Lead } from './leadService';
import { AuditReportData } from './geminiService';
import { logger } from '../utils/logger';

export class ReportService {
  /**
   * Generates a beautifully formatted PDF report in memory and returns a binary Buffer
   */
  async generateReport(lead: Lead, reportData: AuditReportData): Promise<Buffer> {
    logger.info(`Compiling PDF Audit Report for lead ID: ${lead.id}...`);

    return new Promise((resolve, reject) => {
      try {
        const chunks: Buffer[] = [];
        // Standard A4 dimensions: 595.28 x 841.89 points
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 50, bottom: 20, left: 50, right: 50 },
          bufferPages: true // Enable buffering to dynamically calculate page numbers later if needed
        });

        // Collect generated PDF chunks in memory
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => {
          logger.info(`PDFKit rendering complete. Buffer size: ${Buffer.concat(chunks).length} bytes`);
          resolve(Buffer.concat(chunks));
        });
        doc.on('error', (err) => {
          logger.error('PDFKit rendering failed', err);
          reject(err);
        });

        // Define Brand Color Palette (Hex codes)
        const colors = {
          primaryBlue: '#1E3A8A',   // Trust Blue
          growthGreen: '#10B981',   // Growth Green
          accentGold: '#F59E0B',    // Opportunity Gold
          darkGray: '#1F2937',      // Primary Text
          lightGray: '#4B5563',     // Secondary Text
          bgLight: '#F3F4F6',       // Background card color
          white: '#FFFFFF',
          borderGray: '#E5E7EB'
        };

        // ==========================================
        // PAGE 1: COVER PAGE
        // ==========================================
        logger.info('Rendering PDF Page 1: Cover Page...');
        // Full page Trust Blue background
        doc.rect(0, 0, 595.28, 841.89).fill(colors.primaryBlue);

        // Thin Gold Accent Border
        doc.rect(25, 25, 545.28, 791.89).lineWidth(1.5).stroke(colors.accentGold);

        // Gold decorative bar
        doc.rect(50, 160, 80, 8).fill(colors.accentGold);

        // Main Title
        doc.fillColor(colors.white)
           .font('Helvetica-Bold')
           .fontSize(30)
           .text('DIGITAL AUDIT &', 50, 190, { lineGap: 6 });
        
        doc.text('GROWTH RECOMMENDATIONS', 50, 230);

        // Industry Subtitle tag
        doc.fillColor(colors.accentGold)
           .font('Helvetica-Bold')
           .fontSize(14)
           .text(`PREPARED FOR THE B2B ${lead.industry.toUpperCase()} SECTOR`, 50, 275);

        // Secondary Text
        doc.fillColor(colors.white)
           .font('Helvetica')
           .fontSize(12)
           .text('A comprehensive research-backed analysis of digital performance, marketing frameworks, and integration opportunities.', 50, 310, { width: 480, lineGap: 4 });

        // Prepared For Metadata Card at Bottom
        doc.rect(50, 560, 495.28, 180).fill('#111827'); // Very dark gray box
        doc.rect(50, 560, 495.28, 180).lineWidth(1).stroke(colors.primaryBlue);

        // Write Card Contents
        const labelCol = 70;
        const valCol = 180;
        let cardY = 585;

        doc.fillColor(colors.accentGold).font('Helvetica-Bold').fontSize(11).text('CLIENT PROFILE:', labelCol, cardY);
        doc.fillColor(colors.white).font('Helvetica-Bold').fontSize(12).text(lead.companyName.toUpperCase(), valCol, cardY);
        
        cardY += 25;
        doc.fillColor(colors.white).font('Helvetica').fontSize(10).text('Website Domain:', labelCol, cardY);
        doc.fillColor(colors.white).font('Helvetica-Bold').fontSize(10).text(lead.website, valCol, cardY);

        cardY += 20;
        doc.fillColor(colors.white).font('Helvetica').fontSize(10).text('Primary Contact:', labelCol, cardY);
        doc.fillColor(colors.white).font('Helvetica-Bold').fontSize(10).text(lead.contactName, valCol, cardY);

        cardY += 20;
        doc.fillColor(colors.white).font('Helvetica').fontSize(10).text('Delivery Email:', labelCol, cardY);
        doc.fillColor(colors.white).font('Helvetica-Bold').fontSize(10).text(lead.email, valCol, cardY);

        cardY += 20;
        doc.fillColor(colors.white).font('Helvetica').fontSize(10).text('Audit Date:', labelCol, cardY);
        doc.fillColor(colors.white).font('Helvetica').fontSize(10).text(new Date(lead.createdAt).toLocaleDateString('en-US', {
          year: 'numeric', month: 'long', day: 'numeric'
        }), valCol, cardY);

        cardY += 20;
        doc.fillColor(colors.white).font('Helvetica').fontSize(10).text('Report Identifier:', labelCol, cardY);
        doc.fillColor(colors.accentGold).font('Helvetica').fontSize(9).text(`SIMPLIFIQ-${lead.id.substring(0, 8).toUpperCase()}`, valCol, cardY);


        // ==========================================
        // HELPER: PAGE HEADERS & FOOTERS FOR PAGES 2+
        // ==========================================
        const applyHeaderAndFooter = (pageTitle: string, pageNum: number) => {
          // Header
          doc.fillColor(colors.lightGray).font('Helvetica-Bold').fontSize(8).text('SIMPLIFIQ AUDIT SYSTEM', 50, 40);
          doc.fillColor(colors.lightGray).font('Helvetica').fontSize(8).text(`|   ${pageTitle.toUpperCase()}`, 175, 40);
          
          doc.fillColor(colors.primaryBlue).font('Helvetica-Bold').fontSize(8).text(lead.companyName.toUpperCase(), 450, 40, { align: 'right', width: 95 });
          
          // Header Line
          doc.moveTo(50, 52).lineTo(545, 52).lineWidth(0.5).stroke(colors.borderGray);

          // Footer Line
          doc.moveTo(50, 795).lineTo(545, 795).lineWidth(0.5).stroke(colors.borderGray);

          // Footer
          doc.fillColor(colors.lightGray).font('Helvetica').fontSize(7.5).text('CONFIDENTIAL - FOR INTERNAL USE ONLY', 50, 805);
          doc.text(`Page ${pageNum} of 4`, 450, 805, { align: 'right', width: 95 });
        };


        // ==========================================
        // PAGE 2: EXECUTIVE SUMMARY & COMPANY PROFILE
        // ==========================================
        logger.info('Rendering PDF Page 2: Summary...');
        doc.addPage({ size: 'A4', margins: { top: 50, bottom: 20, left: 50, right: 50 } });
        applyHeaderAndFooter('1. Executive Summary', 2);

        // Section Title
        doc.fillColor(colors.primaryBlue).font('Helvetica-Bold').fontSize(18).text('1. EXECUTIVE SUMMARY', 50, 75);
        doc.rect(50, 96, 60, 3).fill(colors.primaryBlue);

        // Value Proposition Section
        doc.fillColor(colors.darkGray).font('Helvetica-Bold').fontSize(11).text('CORE VALUE PROPOSITION', 50, 115);
        
        // Background card for Value Prop
        doc.roundedRect(50, 130, 495, 75, 5).fill(colors.bgLight);
        doc.fillColor(colors.darkGray)
           .font('Helvetica-Oblique')
           .fontSize(10)
           .text(reportData.executiveSummary.valueProposition, 65, 142, { width: 465, lineGap: 3 });

        // Market Opportunity Section
        doc.fillColor(colors.darkGray).font('Helvetica-Bold').fontSize(11).text('DIGITAL MARKET OPPORTUNITY', 50, 220);
        doc.roundedRect(50, 235, 495, 65, 5).fill(colors.bgLight);
        doc.fillColor(colors.darkGray)
           .font('Helvetica')
           .fontSize(10)
           .text(reportData.executiveSummary.marketOpportunity, 65, 247, { width: 465, lineGap: 3 });

        // Technical Metadata Details Grid
        doc.fillColor(colors.darkGray).font('Helvetica-Bold').fontSize(11).text('DIGITAL PROFILE METRICS', 50, 315);
        
        let gridY = 330;
        const colWidth = 237;

        // Card 1: Brand Competence
        doc.roundedRect(50, gridY, colWidth, 75, 4).fill(colors.bgLight);
        doc.fillColor(colors.lightGray).font('Helvetica-Bold').fontSize(8).text('ESTIMATED COMPETENCE', 65, gridY + 12);
        doc.fillColor(colors.primaryBlue).font('Helvetica-Bold').fontSize(16).text(`${reportData.companyProfile.digitalCompetence} Cap`, 65, gridY + 26);
        doc.fillColor(colors.darkGray).font('Helvetica').fontSize(8.5).text(`Based on ${lead.domain}'s scripts.`, 65, gridY + 47);

        // Card 2: Scale Speculation
        doc.roundedRect(307, gridY, colWidth, 75, 4).fill(colors.bgLight);
        doc.fillColor(colors.lightGray).font('Helvetica-Bold').fontSize(8).text('ESTIMATED SCALE', 322, gridY + 12);
        doc.fillColor(colors.primaryBlue).font('Helvetica-Bold').fontSize(14).text(reportData.companyProfile.speculatedScale, 322, gridY + 27);
        doc.fillColor(colors.darkGray).font('Helvetica').fontSize(8.5).text(`Sector: ${lead.industry}`, 322, gridY + 47);

        // Web Scraping Audit Findings
        doc.fillColor(colors.darkGray).font('Helvetica-Bold').fontSize(11).text('LIVE HOMEPAGE AUDIT SUMMARY', 50, 425);
        
        let auditY = 440;
        doc.rect(50, auditY, 495, 120).lineWidth(1).stroke(colors.borderGray);
        
        // Audit details table lines
        doc.moveTo(50, auditY + 30).lineTo(545, auditY + 30).stroke(colors.borderGray);
        doc.moveTo(50, auditY + 60).lineTo(545, auditY + 60).stroke(colors.borderGray);
        doc.moveTo(50, auditY + 90).lineTo(545, auditY + 90).stroke(colors.borderGray);
        doc.moveTo(180, auditY).lineTo(180, auditY + 120).stroke(colors.borderGray);

        // Table Data
        doc.fillColor(colors.lightGray).font('Helvetica-Bold').fontSize(9).text('Audited Component', 60, auditY + 10);
        doc.fillColor(colors.lightGray).font('Helvetica-Bold').fontSize(9).text('Homepage Scraped Data / Findings', 195, auditY + 10);

        doc.fillColor(colors.darkGray).font('Helvetica-Bold').fontSize(9).text('SEO Page Title', 60, auditY + 40);
        doc.font('Helvetica').fontSize(8.5).text(lead.enrichedData?.title ? (lead.enrichedData.title as string) : 'Not Scrapeable / Blocked', 195, auditY + 41, { width: 335, height: 24, ellipsis: true });

        doc.font('Helvetica-Bold').text('Meta Description', 60, auditY + 70);
        doc.font('Helvetica').fontSize(8.5).text(lead.enrichedData?.metaDescription ? (lead.enrichedData.metaDescription as string) : 'No metadata tag configured on website index page.', 195, auditY + 71, { width: 335, height: 24, ellipsis: true });

        doc.font('Helvetica-Bold').text('Web Stack Details', 60, auditY + 100);
        const techStr = (lead.enrichedData?.technologyHints as string[])?.join(', ') || 'Modern tracking capabilities can be enhanced by introducing baseline event metrics.';
        doc.font('Helvetica').fontSize(8.5).text(techStr, 195, auditY + 101, { width: 335, height: 24, ellipsis: true });

        // Positioning Advice
        doc.fillColor(colors.darkGray).font('Helvetica-Bold').fontSize(11).text('MARKET POSITIONING ADVICE', 50, 580);
        doc.font('Helvetica').fontSize(10).fillColor(colors.darkGray)
           .text(reportData.executiveSummary.positioningStatement, 50, 595, { width: 495, lineGap: 3 });


        // ==========================================
        // PAGE 3: SWOT ANALYSIS & MARKET TRENDS
        // ==========================================
        logger.info('Rendering PDF Page 3: SWOT...');
        doc.addPage({ size: 'A4', margins: { top: 50, bottom: 20, left: 50, right: 50 } });
        applyHeaderAndFooter('2. SWOT & Trends', 3);

        // Section Title
        doc.fillColor(colors.primaryBlue).font('Helvetica-Bold').fontSize(18).text('2. SWOT & DIGITAL ALIGNMENT', 50, 75);
        doc.rect(50, 96, 60, 3).fill(colors.primaryBlue);

        // SWOT Quad Layout (2x2 Grid)
        let swotY = 115;
        const quadW = 240;
        const quadH = 135;
        const gap = 15;

        // Quadrant 1: STRENGTHS (Top Left)
        doc.roundedRect(50, swotY, quadW, quadH, 4).fill(colors.bgLight);
        doc.roundedRect(50, swotY, quadW, 25, 4).fill(colors.primaryBlue);
        doc.fillColor(colors.white).font('Helvetica-Bold').fontSize(9.5).text('S   STRENGTHS (INTERNAL)', 65, swotY + 8);
        doc.fillColor(colors.darkGray).font('Helvetica').fontSize(8.5);
        reportData.swotAnalysis.strengths.slice(0, 3).forEach((item, index) => {
          doc.text(`•  ${item}`, 62, swotY + 38 + (index * 30), { width: 215, lineGap: 2 });
        });

        // Quadrant 2: WEAKNESSES (Top Right)
        doc.roundedRect(305, swotY, quadW, quadH, 4).fill(colors.bgLight);
        doc.roundedRect(305, swotY, quadW, 25, 4).fill(colors.accentGold);
        doc.fillColor(colors.white).font('Helvetica-Bold').fontSize(9.5).text('W   WEAKNESSES (INTERNAL)', 320, swotY + 8);
        doc.fillColor(colors.darkGray).font('Helvetica').fontSize(8.5);
        reportData.swotAnalysis.weaknesses.slice(0, 3).forEach((item, index) => {
          doc.text(`•  ${item}`, 317, swotY + 38 + (index * 30), { width: 215, lineGap: 2 });
        });

        swotY += quadH + gap;

        // Quadrant 3: OPPORTUNITIES (Bottom Left)
        doc.roundedRect(50, swotY, quadW, quadH, 4).fill(colors.bgLight);
        doc.roundedRect(50, swotY, quadW, 25, 4).fill(colors.growthGreen);
        doc.fillColor(colors.white).font('Helvetica-Bold').fontSize(9.5).text('O   OPPORTUNITIES (EXTERNAL)', 65, swotY + 8);
        doc.fillColor(colors.darkGray).font('Helvetica').fontSize(8.5);
        reportData.swotAnalysis.opportunities.slice(0, 3).forEach((item, index) => {
          doc.text(`•  ${item}`, 62, swotY + 38 + (index * 30), { width: 215, lineGap: 2 });
        });

        // Quadrant 4: THREATS (Bottom Right)
        doc.roundedRect(305, swotY, quadW, quadH, 4).fill(colors.bgLight);
        doc.roundedRect(305, swotY, quadW, 25, 4).fill('#6B7280'); // Slate Gray
        doc.fillColor(colors.white).font('Helvetica-Bold').fontSize(9.5).text('T   THREATS (EXTERNAL)', 320, swotY + 8);
        doc.fillColor(colors.darkGray).font('Helvetica').fontSize(8.5);
        reportData.swotAnalysis.threats.slice(0, 3).forEach((item, index) => {
          doc.text(`•  ${item}`, 317, swotY + 38 + (index * 30), { width: 215, lineGap: 2 });
        });


        // Industry Trends Section
        let trendsY = swotY + quadH + 25;
        doc.fillColor(colors.darkGray).font('Helvetica-Bold').fontSize(11).text(`KEY MODERN B2B ${lead.industry.toUpperCase()} TRENDS`, 50, trendsY);
        
        // Alignment Score Card
        let cardX = 50;
        let trendsCardY = trendsY + 15;
        doc.roundedRect(cardX, trendsCardY, 495, 140, 5).fill(colors.bgLight);

        // Circular Alignment Score Draw
        doc.circle(110, trendsCardY + 70, 45).lineWidth(6).stroke(colors.borderGray);
        doc.circle(110, trendsCardY + 70, 45).lineWidth(6).stroke(colors.primaryBlue);
        doc.fillColor(colors.primaryBlue).font('Helvetica-Bold').fontSize(22).text(`${reportData.industryTrends.alignmentScore}%`, 85, trendsCardY + 62, { align: 'center', width: 50 });
        doc.fillColor(colors.lightGray).font('Helvetica-Bold').fontSize(7.5).text('ALIGNMENT', 80, trendsCardY + 85, { align: 'center', width: 60 });

        // List key trends
        let textY = cardY + 15;
        const bulletX = 180;
        const trendList = [reportData.industryTrends.trend1, reportData.industryTrends.trend2, reportData.industryTrends.trend3];
        
        trendList.forEach((trend) => {
          doc.fillColor(colors.primaryBlue).font('Helvetica-Bold').fontSize(9.5).text(trend.name.toUpperCase(), bulletX, textY);
          doc.fillColor(colors.darkGray).font('Helvetica').fontSize(8.5).text(trend.description, bulletX, textY + 13, { width: 345, lineGap: 1.5 });
          textY += 38;
        });


        // ==========================================
        // PAGE 4: RECOMMENDATIONS & ROADMAP
        // ==========================================
        logger.info('Rendering PDF Page 4: Action Plan...');
        doc.addPage({ size: 'A4', margins: { top: 50, bottom: 20, left: 50, right: 50 } });
        applyHeaderAndFooter('3. Action Recommendations', 4);

        // Section Title
        doc.fillColor(colors.primaryBlue).font('Helvetica-Bold').fontSize(18).text('3. ACTIONABLE ROADMAP', 50, 75);
        doc.rect(50, 96, 60, 3).fill(colors.primaryBlue);

        // Loop and render 3 detailed recommendation cards
        let recY = 110;
        const recList = reportData.recommendations.slice(0, 3);
        
        recList.forEach((rec, index) => {
          doc.roundedRect(50, recY, 495, 85, 4).fill(colors.bgLight);
          doc.roundedRect(50, recY, 495, 85, 4).lineWidth(0.5).stroke(colors.borderGray);
          
          // Left-side colored bar indicating item number
          let accentColor = colors.primaryBlue;
          if (rec.impact === 'High') {
            accentColor = colors.growthGreen;
          } else if (rec.impact === 'Medium') {
            accentColor = colors.accentGold;
          }
          doc.rect(50, recY, 5, 85).fill(accentColor);

          // Card contents
          doc.fillColor(accentColor).font('Helvetica-Bold').fontSize(8).text(rec.category.toUpperCase(), 70, recY + 12);
          
          // Impact Badge
          const badgeLabel = `${rec.impact.toUpperCase()} IMPACT`;
          const badgeW = doc.widthOfString(badgeLabel) + 12;
          doc.roundedRect(545 - badgeW, recY + 10, badgeW, 14, 2).fill(accentColor);
          doc.fillColor(colors.white).font('Helvetica-Bold').fontSize(7).text(badgeLabel, 545 - badgeW + 6, recY + 14);

          // Title & explanation
          doc.fillColor(colors.darkGray).font('Helvetica-Bold').fontSize(11).text(`${index + 1}. ${rec.title}`, 70, recY + 26);
          doc.fillColor(colors.lightGray).font('Helvetica').fontSize(9.5).text(rec.description, 70, recY + 43, { width: 455, lineGap: 2 });

          recY += 105;
        });

        // CTA Consulting closing box
        doc.rect(50, 430, 495, 125).fill(colors.primaryBlue);
        doc.rect(50, 430, 495, 125).lineWidth(1).stroke(colors.accentGold);

        doc.fillColor(colors.accentGold).font('Helvetica-Bold').fontSize(13).text('NEXT STEPS: LAUNCH YOUR AUTOMATION PLAYBOOK', 70, 450);
        doc.fillColor(colors.white).font('Helvetica').fontSize(9.5).text(
          `This performance report highlights immediate low-hanging growth drivers discovered for ${lead.companyName}. By implementing the structured recommendations outlined above, B2B ${lead.industry} operators regularly unlock 2.5x higher capture rates and double sales qualified leads.`, 
          70, 472, { width: 455, lineGap: 3.5 }
        );

        // Branding Sign-off at bottom
        let signY = 645;
        doc.moveTo(150, signY).lineTo(445, signY).lineWidth(0.5).stroke(colors.borderGray);
        
        doc.fillColor(colors.primaryBlue).font('Helvetica-Bold').fontSize(15).text('SimplifIQ', 50, signY + 20, { align: 'center', width: 495 });
        doc.fillColor(colors.lightGray).font('Helvetica').fontSize(9.5).text('B2B Growth Engineering & Lead Automation Solutions', 50, signY + 38, { align: 'center', width: 495 });

        // Terminate Document Stream
        doc.end();

      } catch (err) {
        logger.error('Error compiled PDF report', err);
        reject(err);
      }
    });
  }
}

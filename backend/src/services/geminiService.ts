import { GoogleGenerativeAI } from '@google/generative-ai';
import { EnrichedCompanyData } from './enrichmentService';
import { logger } from '../utils/logger';

export interface AuditReportData {
  executiveSummary: {
    valueProposition: string;
    marketOpportunity: string;
    positioningStatement: string;
  };
  companyProfile: {
    businessModel: string;
    speculatedScale: string;
    digitalCompetence: string;
  };
  swotAnalysis: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  industryTrends: {
    alignmentScore: number;
    trend1: { name: string; description: string };
    trend2: { name: string; description: string };
    trend3: { name: string; description: string };
  };
  recommendations: Array<{
    category: 'Website & UX' | 'Growth & Marketing' | 'Systems & Integration';
    title: string;
    description: string;
    impact: 'High' | 'Medium' | 'Low';
  }>;
}

export class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
      logger.info('Gemini API initialized successfully.');
    } else {
      logger.warn('GEMINI_API_KEY is not defined. The system will fall back to local rule-based intelligence.');
    }
  }

  /**
   * Main service call to compile company synthesis
   */
  async generateAuditReport(
    companyName: string,
    industry: string,
    scrapedData: EnrichedCompanyData
  ): Promise<AuditReportData> {
    logger.info(`Generating AI report for ${companyName} (${industry})...`);
    
    // Construct standard fallbacks based on company input
    const fallbacks = this.generateFallbackReport(companyName, industry, scrapedData);

    if (!this.genAI) {
      logger.info('Running offline fallback report engine (no API key)...');
      return fallbacks;
    }

    try {
      const model = this.genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: {
          responseMimeType: 'application/json'
        }
      });

      const prompt = `
        You are a Senior B2B growth and digital transformation consultant. Your client is "${companyName}", operating in the "${industry}" industry.
        Their website domain metadata shows:
        - Title Tag: "${scrapedData.title}"
        - Meta Description: "${scrapedData.metaDescription}"
        - Extracted Core Headings: H1s: ${JSON.stringify(scrapedData.headings.h1s)}, H2s: ${JSON.stringify(scrapedData.headings.h2s)}
        - Detected Web Technologies: ${JSON.stringify(scrapedData.technologyHints)}
        - Website Scraping Status: "${scrapedData.scrapingStatus}"
        
        CRITICAL CLASSIFICATION STEP: First, analyze the website data above and determine their specific business vertical (e.g., "Audio-Visual Integration", "Healthcare SaaS", "Local Plumbing", "Corporate Finance").
        DO NOT use generic SaaS advice if they are a local service, physical installer, or hardware integrator. Tailor all strategies specifically to their actual classified vertical and domain data.
        
        CRITICAL ROADMAP STEP: Generate 3 actionable recommendations based ONLY on their specific vertical. Avoid circular logic: DO NOT recommend they build automated lead-capture tools or digital audits (since they are currently using one). Instead, recommend highly specific strategies for their actual business model (e.g., physical venue booking workflows for AV integrators, or local case study integrations for physical services).
        
        Provide your output in a strict, valid JSON format matching this structure EXACTLY:
        {
          "executiveSummary": {
            "valueProposition": "Write a 3-sentence professional summary identifying their primary value proposition based on their website tags or specific industry. Be encouraging.",
            "marketOpportunity": "Identify the primary growth market opportunity for scaling in their specific sector.",
            "positioningStatement": "Write a professional positioning statement for their sales pitches."
          },
          "companyProfile": {
            "businessModel": "State their exact classified vertical (e.g., 'AV Field Support', 'B2B SaaS', 'Financial Consulting', etc.)",
            "speculatedScale": "Provide a guess based on domain sophistication: 'Early-stage Startup', 'Growth-stage SME', or 'Established Enterprise'",
            "digitalCompetence": "Provide a grade: 'High', 'Medium', or 'Low' based on their tech hints: ${JSON.stringify(scrapedData.technologyHints)}"
          },
          "swotAnalysis": {
            "strengths": ["List 3 specific strengths based on their domain presence and industry"],
            "weaknesses": ["List 3 real-world growth weaknesses (e.g. missing analytics, poor SEO descriptions, lack of visible conversion CTA)"],
            "opportunities": ["List 3 specific market opportunities tailored strictly to their classified vertical"],
            "threats": ["List 3 potential digital or competitor threats in their specific field"]
          },
          "industryTrends": {
            "alignmentScore": 1-100 score on how well their current web presence aligns with modern digital trends,
            "trend1": { "name": "Modern Industry Trend 1", "description": "Explain in 2 sentences" },
            "trend2": { "name": "Modern Industry Trend 2", "description": "Explain in 2 sentences" },
            "trend3": { "name": "Modern Industry Trend 3", "description": "Explain in 2 sentences" }
          },
          "recommendations": [
            {
              "category": "Website & UX",
              "title": "Clear Actionable UX Title",
              "description": "2 sentences outlining a UX improvement specifically curated for their domain and why it converts.",
              "impact": "High"
            },
            {
              "category": "Growth & Marketing",
              "title": "Clear Growth Title",
              "description": "2 sentences outlining growth opportunities (e.g., specialized content or localized SEO) for their vertical.",
              "impact": "High"
            },
            {
              "category": "Systems & Integration",
              "title": "Systems Title",
              "description": "2 sentences advising on relevant operational integrations (avoiding circular lead-gen audits) for their specific vertical.",
              "impact": "Medium"
            }
          ]
        }
      `;

      logger.info('Calling Gemini 1.5 Flash via SDK...');
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });

      let responseText = result.response.text();
      if (!responseText) {
        throw new Error('Gemini API returned an empty text response');
      }

      // Aggressively strip markdown JSON formatting if Gemini hallucinates wrappers
      responseText = responseText.trim();
      if (responseText.startsWith('```json')) {
        responseText = responseText.replace(/^```json/, '');
      } else if (responseText.startsWith('```')) {
        responseText = responseText.replace(/^```/, '');
      }
      if (responseText.endsWith('```')) {
        responseText = responseText.replace(/```$/, '');
      }

      // Parse JSON from Gemini response
      const report = JSON.parse(responseText.trim()) as AuditReportData;
      
      // Post-process to ensure typescript compliance
      if (
        report.executiveSummary &&
        report.swotAnalysis &&
        report.recommendations &&
        report.recommendations.length > 0
      ) {
        logger.info('Successfully parsed Gemini JSON report output');
        return report;
      }

      throw new Error('JSON output missing key B2B report sections');

    } catch (error) {
      logger.error('Gemini synthesis failed, falling back to local B2B intelligence engine', error);
      return fallbacks;
    }
  }

  /**
   * High-fidelity offline consulting fallback engine
   * Generates realistic, tailored audits based on company inputs & scrapings
   */
  private generateFallbackReport(
    companyName: string,
    industry: string,
    scrapedData: EnrichedCompanyData
  ): AuditReportData {
    const defaultTitle = scrapedData.title || `${companyName} | Premium Business Solutions`;
    const defaultDesc = scrapedData.metaDescription || `Accelerating business growth and delivering specialized services in the ${industry} sector.`;
    
    // Speculate technical competence
    const techCount = scrapedData.technologyHints.length;
    const digitalCompetence = techCount >= 4 ? 'High' : techCount >= 2 ? 'Medium' : 'Low';
    
    // Choose dynamic insights based on selected industry
    let valueProp = `Based on our structural review of ${companyName}, they are positioning themselves as a focused provider of solutions in the ${industry} domain. By analyzing key content hooks, their messaging highlights digital capability, reliability, and client success.`;
    let opportunities: string[] = [];
    let weaknesses: string[] = [];
    let strengths: string[] = [];
    let threats: string[] = [];
    let trends = {
      trend1: { name: 'AI-Powered Operations', description: 'Integrating automated analysis tools and AI agents to speed up delivery, cut costs, and optimize customer workflows.' },
      trend2: { name: 'Omnichannel B2B Acquisition', description: 'Building diverse pipeline channels spanning content SEO, email automation, and hyper-targeted LinkedIn campaigns.' },
      trend3: { name: 'Real-Time Insights & Dashboards', description: 'Empowering B2B clients with interactive dashboards to monitor their active integrations and performance indexes.' }
    };
    
    // Tailor SWOT by Industry
    if (industry.toLowerCase().includes('saas') || industry.toLowerCase().includes('tech')) {
      strengths = [
        'Dedicated technical foundations and structure',
        `High digital brand flexibility on the ${scrapedData.technologyHints.join(', ') || 'web'}`,
        'Clear product-led modular focus'
      ];
      weaknesses = [
        'High competitive noise in primary SaaS acquisition routes',
        scrapedData.title.length < 10 ? 'Unoptimized SEO Title tags for search visibility' : 'Underutilized high-intent demo booking CTAs',
        'Potential friction in user onboarding workflows'
      ];
      opportunities = [
        'Implement hyper-focused outbound cold-email automation pipelines',
        'Incorporate embedded self-serve setup assistants to shorten time-to-value',
        'Roll out interactive utility pricing models to attract smaller tiers'
      ];
      threats = [
        'Rapid copycat releases eroding core feature-set value props',
        'Rising ad spend inflation across search engines',
        'SaaS budget consolidation inside enterprise companies'
      ];
    } else if (industry.toLowerCase().includes('finance') || industry.toLowerCase().includes('consulting')) {
      strengths = [
        'Client-first relationship-driven focus',
        'Experienced principal partner framework',
        'High compliance standards'
      ];
      weaknesses = [
        'Low organic discovery via Google search SEO indexation',
        'Manual PDF report delivery and onboarding delays',
        'Lack of dynamic interactive calculators on target pages'
      ];
      opportunities = [
        'Deploy automated lead research reports (like SimplifIQ) to wow prospects',
        'Establish thought-leadership articles addressing industry pain points',
        'Host hyper-focused B2B educational webinars'
      ];
      threats = [
        'Disruption from self-serve digital fintech platforms',
        'Shifting regulatory frameworks and compliance costs',
        'Talent retention constraints in mid-tier corporate structures'
      ];
    } else {
      // General B2B fallback
      strengths = [
        `Strong local presence in the ${industry} market space`,
        'Client-centric service delivery standard',
        'Adaptive and agile management structure'
      ];
      weaknesses = [
        'Highly manual outbound sales cycles',
        'Limited automated nurturing campaigns',
        'Basic search engine optimization (SEO) descriptions'
      ];
      opportunities = [
        'Leverage automated data scraping to enrich lead lists before outreach',
        'Optimize high-converting case study pages on the main domain',
        'Build integration hooks with partner ecosystems'
      ];
      threats = [
        'Aggressive expansion from venture-backed competitors',
        'Disruptive direct-to-consumer digital channels',
        'Increasing acquisition cost indexes'
      ];
    }

    return {
      executiveSummary: {
        valueProposition: valueProp,
        marketOpportunity: `Capturing digital market share in the ${industry} space by optimizing modern automated sales systems and delivering high-value B2B insights to qualified prospects.`,
        positioningStatement: `We empower B2B clients by combining standard industry practices with cutting-edge digital delivery.`
      },
      companyProfile: {
        businessModel: industry.toLowerCase().includes('saas') ? 'B2B SaaS' : 'B2B Services',
        speculatedScale: techCount >= 3 ? 'Growth-stage SME' : 'Early-stage Startup',
        digitalCompetence
      },
      swotAnalysis: {
        strengths,
        weaknesses,
        opportunities,
        threats
      },
      industryTrends: {
        alignmentScore: techCount >= 3 ? 82 : 55,
        trend1: trends.trend1,
        trend2: trends.trend2,
        trend3: trends.trend3
      },
      recommendations: [
        {
          category: 'Website & UX',
          title: 'Optimize Homepage Title & Meta Descriptions',
          description: `Current metadata: Title: "${defaultTitle.substring(0, 40)}...", Description: "${defaultDesc.substring(0, 40)}...". Optimize for search intent to double organic click rates.`,
          impact: 'High'
        },
        {
          category: 'Growth & Marketing',
          title: 'Implement AI-Driven Inbound Audits',
          description: 'Offer real-time consulting audit generators directly on the website to capture B2B email addresses with an 8x higher conversion rate than traditional contact forms.',
          impact: 'High'
        },
        {
          category: 'Systems & Integration',
          title: 'Integrate CRM and Lead Workflows',
          description: 'Establish automated sync connections between web forms, Google Sheets logging, and email triggers to respond to incoming interest in under 3 minutes.',
          impact: 'Medium'
        }
      ]
    };
  }
}

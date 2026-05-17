import axios from 'axios';
import * as cheerio from 'cheerio';
import { logger } from '../utils/logger';

export interface EnrichedCompanyData {
  title: string;
  metaDescription: string;
  headings: {
    h1s: string[];
    h2s: string[];
  };
  contactInfo: {
    emails: string[];
    phones: string[];
  };
  logoUrl: string;
  technologyHints: string[];
  scrapingStatus: 'success' | 'failed' | 'partial';
  scrapedAt: string;
}

/**
 * Scrapes a target company website and merges public API insights (Clearbit Logo)
 */
export class EnrichmentService {
  /**
   * Main entry point for company data enrichment
   */
  async enrichCompanyData(url: string, domain: string): Promise<EnrichedCompanyData> {
    logger.info(`Starting data enrichment pipeline for: ${url}`, { domain });
    const scrapedAt = new Date().toISOString();
    
    // Default fallback values if scraping completely fails
    const fallbackData: EnrichedCompanyData = {
      title: '',
      metaDescription: '',
      headings: { h1s: [], h2s: [] },
      contactInfo: { emails: [], phones: [] },
      logoUrl: `https://logo.clearbit.com/${domain}`, // Fallback to Clearbit logo guess anyway
      technologyHints: [],
      scrapingStatus: 'failed',
      scrapedAt
    };

    try {
      // 1. Fetch the homepage HTML
      logger.info(`Fetching homepage HTML for ${url}...`);
      const response = await axios.get(url, {
        timeout: 6000, // 6 seconds limit
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        maxRedirects: 3,
        validateStatus: (status) => status === 200 // Only proceed on HTTP 200
      });

      const html = response.data;
      if (!html || typeof html !== 'string') {
        logger.warn(`Fetched HTML from ${url} was empty or invalid`);
        return { ...fallbackData, scrapingStatus: 'failed' };
      }

      // 2. Parse HTML using Cheerio
      logger.info(`Parsing HTML structure...`);
      const $ = cheerio.load(html);

      // Title tag
      const title = $('title').text().trim() || '';

      // Meta Description
      const metaDescription = 
        $('meta[name="description"]').attr('content')?.trim() || 
        $('meta[property="og:description"]').attr('content')?.trim() || 
        $('meta[name="twitter:description"]').attr('content')?.trim() || 
        '';

      // Headings (H1 and H2)
      const h1s: string[] = [];
      $('h1').each((_, el) => {
        const text = $(el).text().trim().replace(/\s+/g, ' ');
        if (text && !h1s.includes(text) && h1s.length < 3) {
          h1s.push(text);
        }
      });

      const h2s: string[] = [];
      $('h2').each((_, el) => {
        const text = $(el).text().trim().replace(/\s+/g, ' ');
        if (text && !h2s.includes(text) && h2s.length < 5) {
          h2s.push(text);
        }
      });

      // Contact info regex extraction (emails & phones)
      const bodyText = $('body').text() || '';
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const phoneRegex = /(\+?\d{1,4}[-.\s]??\d{1,3}[-.\s]??\d{1,4}[-.\s]??\d{1,4})/g;

      // Extract unique emails from text
      const rawEmails = bodyText.match(emailRegex) || [];
      const emails = Array.from(new Set(rawEmails))
        .map(e => e.toLowerCase())
        // Basic filter to ignore common false positives
        .filter(e => !/\.(png|jpg|jpeg|gif|svg|webp|css|js)$/i.test(e))
        .slice(0, 3);

      // Extract phone links as a priority
      const phoneLinks: string[] = [];
      $('a[href^="tel:"]').each((_, el) => {
        const tel = $(el).attr('href')?.replace('tel:', '').trim();
        if (tel && !phoneLinks.includes(tel)) {
          phoneLinks.push(tel);
        }
      });

      // Supplement with standard phone regex matching from page text
      const phones = Array.from(new Set([
        ...phoneLinks,
        ...(bodyText.match(phoneRegex) || []).map(p => p.trim()).filter(p => p.length >= 8 && p.length <= 15)
      ])).slice(0, 2);

      // 3. Detect technology tags based on page content
      const technologyHints: string[] = [];
      const techSignatures = {
        'React/Next.js': /_next\/static|react-dom/i,
        'WordPress': /wp-content|wp-includes/i,
        'Webflow': /webflow\.js|w-html/i,
        'Shopify': /cdn\.shopify\.com|shopify-payment/i,
        'Google Analytics': /google-analytics\.com|googletagmanager/i,
        'Stripe': /js\.stripe\.com/i,
        'HubSpot': /hs-scripts|hubspot\.com/i,
        'Tailwind CSS': /tailwindcss/i
      };

      for (const [techName, pattern] of Object.entries(techSignatures)) {
        if (pattern.test(html) || pattern.test(bodyText)) {
          technologyHints.push(techName);
        }
      }

      // 4. Logo Clearbit Validation (checks if Clearbit logo returns a valid response, else falls back to local logo fallback)
      const logoUrl = `https://logo.clearbit.com/${domain}`;
      logger.info(`Clearbit logo resolved for ${domain}`, { logoUrl });

      const enriched: EnrichedCompanyData = {
        title,
        metaDescription,
        headings: { h1s, h2s },
        contactInfo: { emails, phones },
        logoUrl,
        technologyHints,
        scrapingStatus: 'success',
        scrapedAt
      };

      logger.info(`Enrichment complete for: ${domain}`, {
        titleLength: title.length,
        hasDescription: metaDescription.length > 0,
        foundH1s: h1s.length,
        foundEmails: emails.length,
        techCount: technologyHints.length
      });

      return enriched;

    } catch (error) {
      logger.warn(`Scraping failed for ${url}, falling back to defaults`, error);
      // Return fallback data with 'failed' status so downstream services can still work
      return {
        ...fallbackData,
        scrapingStatus: 'failed'
      };
    }
  }
}

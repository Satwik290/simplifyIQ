import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as lockfile from 'proper-lockfile';
import { LeadInput, extractDomain } from '../utils/validation';
import { logger } from '../utils/logger';

export interface Lead {
  id: string;
  companyName: string;
  website: string;
  domain: string;
  industry: string;
  contactName: string;
  email: string;
  status: 'pending' | 'enriching' | 'generating' | 'sent' | 'failed';
  createdAt: string;
  updatedAt: string;
  pdfFilename?: string;
  errorMessage?: string;
  enrichedData?: Record<string, unknown>;
  reportData?: Record<string, unknown>;
}

const DATA_DIR = path.join(__dirname, '../../data');
const LEADS_FILE = path.join(DATA_DIR, 'leads.json');

function ensureDatabase(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    logger.info('Created local database directory', { path: DATA_DIR });
  }
  
  if (!fs.existsSync(LEADS_FILE)) {
    fs.writeFileSync(LEADS_FILE, JSON.stringify([], null, 2), 'utf-8');
    logger.info('Initialized local database JSON file', { path: LEADS_FILE });
  }
}

export class LeadService {
  private lockTimeout = 10000; // 10 second lock timeout

  constructor() {
    ensureDatabase();
  }

  /**
   * Acquires a file lock and executes callback atomically
   */
  private async withLock<T>(callback: () => Promise<T>): Promise<T> {
    let release: (() => Promise<void>) | null = null;
    try {
      release = await lockfile.lock(LEADS_FILE, {
        realpath: false,
        stale: this.lockTimeout,
        onCompromised: (err) => {
          logger.error('Lock compromise detected', err);
          throw err;
        }
      });
      return await callback();
    } finally {
      if (release) {
        try {
          await release();
        } catch (err) {
          logger.warn('Failed to release lock', err);
        }
      }
    }
  }

  /**
   * Reads all leads from the JSON database with lock
   */
  async listLeads(): Promise<Lead[]> {
    return this.withLock(async () => {
      try {
        ensureDatabase();
        const content = fs.readFileSync(LEADS_FILE, 'utf-8');
        const leads = JSON.parse(content) as Lead[];
        return leads.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      } catch (error) {
        logger.error('Failed to read leads database', error);
        return [];
      }
    });
  }

  /**
   * Retrieves a single lead by ID
   */
  async getLead(id: string): Promise<Lead | null> {
    return this.withLock(async () => {
      try {
        ensureDatabase();
        const content = fs.readFileSync(LEADS_FILE, 'utf-8');
        const leads = JSON.parse(content) as Lead[];
        const lead = leads.find((l) => l.id === id);
        return lead || null;
      } catch (error) {
        logger.error(`Failed to find lead with ID: ${id}`, error);
        return null;
      }
    });
  }

  /**
   * Creates a new lead in the database with "pending" status
   */
  async saveLead(input: LeadInput): Promise<Lead> {
    return this.withLock(async () => {
      try {
        ensureDatabase();
        
        const domain = extractDomain(input.website);
        const newLead: Lead = {
          id: crypto.randomUUID ? crypto.randomUUID() : 
              `lead_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          companyName: input.companyName,
          website: input.website,
          domain,
          industry: input.industry,
          contactName: input.contactName,
          email: input.email,
          status: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const content = fs.readFileSync(LEADS_FILE, 'utf-8');
        const leads = JSON.parse(content) as Lead[];
        leads.push(newLead);
        
        fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2), 'utf-8');
        logger.info('Lead successfully saved to database', { 
          leadId: newLead.id, 
          company: newLead.companyName 
        });
        
        return newLead;
      } catch (error) {
        logger.error('Failed to save lead to database', error);
        throw new Error('Database transaction failure');
      }
    });
  }

  /**
   * Transactionally updates an existing lead's properties
   */
  async updateLead(id: string, updates: Partial<Omit<Lead, 'id' | 'createdAt'>>): Promise<Lead> {
    return this.withLock(async () => {
      try {
        ensureDatabase();
        
        const content = fs.readFileSync(LEADS_FILE, 'utf-8');
        const leads = JSON.parse(content) as Lead[];
        const index = leads.findIndex((l) => l.id === id);
        
        if (index === -1) {
          throw new Error(`Lead with ID ${id} not found`);
        }

        const existingLead = leads[index];
        const updatedLead: Lead = {
          ...existingLead,
          ...updates,
          updatedAt: new Date().toISOString()
        };

        leads[index] = updatedLead;
        fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2), 'utf-8');
        
        logger.info('Lead status updated in database', { 
          leadId: id, 
          status: updatedLead.status,
          error: updatedLead.errorMessage ? true : false 
        });

        return updatedLead;
      } catch (error) {
        logger.error(`Failed to update lead with ID: ${id}`, error);
        throw error;
      }
    });
  }
}

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
  enrichedData?: Record<string, any>;
  reportData?: Record<string, any>;
}

export interface LeadFormInput {
  companyName: string;
  website: string;
  industry: string;
  contactName: string;
  email: string;
}

export interface LeadApiResponse {
  success: boolean;
  lead?: Lead;
  error?: string;
  details?: Record<string, string[]>;
}

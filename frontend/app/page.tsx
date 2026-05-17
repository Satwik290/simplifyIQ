'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Building2, Globe, Compass, User, Mail, 
  ArrowRight, RotateCcw, CheckCircle2, AlertTriangle, 
  Loader2, Check, FileText, Send, Cpu, Database
} from 'lucide-react';
import { Lead } from '../lib/types';

// Zod validation matching the backend strictly
const leadFormSchema = z.object({
  companyName: z.string().trim().min(1, 'Company name is required').max(100),
  website: z.string().trim().min(1, 'Company website is required').refine((val) => {
    // Basic domain validation
    const trimmed = val.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
    return trimmed.length > 3 && trimmed.includes('.');
  }, { message: 'Enter a valid website (e.g. company.com)' }),
  industry: z.string().min(1, 'Please select an industry'),
  contactName: z.string().trim().min(1, 'Your name is required').max(100),
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address')
});

type FormValues = z.infer<typeof leadFormSchema>;

export default function LeadAuditPage() {
  const [uiState, setUiState] = useState<'idle' | 'polling' | 'success' | 'error'>('idle');
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null);
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  
  // Keep track of the polling interval
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize React Hook Form
  const {
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      companyName: '',
      website: '',
      industry: '',
      contactName: '',
      email: ''
    }
  });

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // Cleanup polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  /**
   * Submits the lead intake form to the backend
   */
  const onSubmit = async (data: FormValues) => {
    setApiError(null);
    try {
      const response = await fetch(`${apiUrl}/api/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const resJson = await response.json();

      if (!response.ok) {
        throw new Error(resJson.error || 'Failed to submit form details.');
      }

      setActiveLeadId(resJson.leadId);
      setUiState('polling');
      
      // Start polling the backend for live status updates
      startPolling(resJson.leadId);

    } catch (err: any) {
      setApiError(err.message || 'Server connection timed out.');
      setUiState('error');
    }
  };

  /**
   * Sets up a interval that polls the lead status endpoint
   */
  const startPolling = (leadId: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(async () => {
      try {
        const response = await fetch(`${apiUrl}/api/leads/${leadId}`);
        const resJson = await response.json();

        if (!response.ok || !resJson.success) {
          throw new Error(resJson.error || 'Polling transaction failed.');
        }

        const lead: Lead = resJson.lead;
        setActiveLead(lead);

        if (lead.status === 'sent') {
          // Success! Stop polling and trigger success screen
          if (pollingRef.current) clearInterval(pollingRef.current);
          setUiState('success');
        } else if (lead.status === 'failed') {
          // Error in background execution! Stop polling and show error
          if (pollingRef.current) clearInterval(pollingRef.current);
          setApiError(lead.errorMessage || 'Enrichment pipeline exception occurred.');
          setUiState('error');
        }

      } catch (err: any) {
        console.warn('Polling error captured', err);
        // Suppress and continue polling on minor network hiccups
      }
    }, 2500); // Poll every 2.5 seconds
  };

  /**
   * Rescues form inputs and returns to idle form view
   */
  const handleTryAgain = () => {
    setUiState('idle');
  };

  /**
   * Completely resets the form to enter a new lead
   */
  const handleReset = () => {
    reset({
      companyName: '',
      website: '',
      industry: '',
      contactName: '',
      email: ''
    });
    setActiveLead(null);
    setActiveLeadId(null);
    setUiState('idle');
  };

  // Helper values for determining active stepper state
  const leadStatus = activeLead?.status || 'pending';

  return (
    <div className="w-full max-w-xl mx-auto px-4">
      {/* Dynamic Screen rendering */}
      {uiState === 'idle' && (
        <div className="bg-brand-darkCard/50 border border-gray-800 rounded-2xl p-8 backdrop-blur-md shadow-2xl transition-all duration-300">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-extrabold tracking-tight text-white mb-2">
              Free Personalized B2B Audit
            </h2>
            <p className="text-sm text-gray-400">
              Provide company details, and our automated pipeline will compile a professional growth playbook PDF directly to your email in <span className="text-brand-green font-semibold">&lt;3 minutes</span>.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Company Name */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                Company Name *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                  <Building2 size={16} />
                </span>
                <input
                  type="text"
                  placeholder="e.g. TechCorp Inc"
                  className={`w-full bg-brand-darkInput border ${errors.companyName ? 'border-red-500' : 'border-gray-800'} rounded-lg py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-blueLight focus:ring-1 focus:ring-brand-blueLight/30 transition-all`}
                  {...register('companyName')}
                />
              </div>
              {errors.companyName && (
                <span className="block text-xs text-red-400 mt-1 font-semibold">{errors.companyName.message}</span>
              )}
            </div>

            {/* Company Website */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                Company Website *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                  <Globe size={16} />
                </span>
                <input
                  type="text"
                  placeholder="e.g. techcorp.com"
                  className={`w-full bg-brand-darkInput border ${errors.website ? 'border-red-500' : 'border-gray-800'} rounded-lg py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-blueLight focus:ring-1 focus:ring-brand-blueLight/30 transition-all`}
                  {...register('website')}
                />
              </div>
              {errors.website && (
                <span className="block text-xs text-red-400 mt-1 font-semibold">{errors.website.message}</span>
              )}
            </div>

            {/* Industry Selection */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                Industry Sector *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 pointer-events-none">
                  <Compass size={16} />
                </span>
                <select
                  className={`w-full bg-brand-darkInput border ${errors.industry ? 'border-red-500' : 'border-gray-800'} rounded-lg py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-brand-blueLight focus:ring-1 focus:ring-brand-blueLight/30 transition-all appearance-none cursor-pointer`}
                  {...register('industry')}
                >
                  <option value="">Select Industry...</option>
                  <option value="SaaS & Software">B2B SaaS & Software</option>
                  <option value="Finance & Fintech">B2B Finance & Fintech</option>
                  <option value="Consulting & Agency">B2B Consulting & Services</option>
                  <option value="Healthcare & Tech">Healthcare & Biotech</option>
                  <option value="E-commerce & Retail">E-commerce & Logistics</option>
                  <option value="Real Estate">Real Estate & Construction</option>
                  <option value="Education Tech">Education & EdTech</option>
                  <option value="Other Industry">Other Industry / Enterprise</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500">
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                  </svg>
                </div>
              </div>
              {errors.industry && (
                <span className="block text-xs text-red-400 mt-1 font-semibold">{errors.industry.message}</span>
              )}
            </div>

            {/* Contact Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Contact Name */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Your Name *
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                    <User size={16} />
                  </span>
                  <input
                    type="text"
                    placeholder="John Doe"
                    className={`w-full bg-brand-darkInput border ${errors.contactName ? 'border-red-500' : 'border-gray-800'} rounded-lg py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-blueLight focus:ring-1 focus:ring-brand-blueLight/30 transition-all`}
                    {...register('contactName')}
                  />
                </div>
                {errors.contactName && (
                  <span className="block text-xs text-red-400 mt-1 font-semibold">{errors.contactName.message}</span>
                )}
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Your Email *
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                    <Mail size={16} />
                  </span>
                  <input
                    type="text"
                    placeholder="john@example.com"
                    className={`w-full bg-brand-darkInput border ${errors.email ? 'border-red-500' : 'border-gray-800'} rounded-lg py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-blueLight focus:ring-1 focus:ring-brand-blueLight/30 transition-all`}
                    {...register('email')}
                  />
                </div>
                {errors.email && (
                  <span className="block text-xs text-red-400 mt-1 font-semibold">{errors.email.message}</span>
                )}
              </div>
            </div>

            {/* CTA Action Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-grow bg-brand-blue hover:bg-brand-blueLight text-white rounded-lg py-3 px-4 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-brand-blue/30 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Generate My Report
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
              
              <button
                type="button"
                onClick={handleReset}
                className="bg-brand-darkInput hover:bg-gray-800 text-gray-300 border border-gray-800 rounded-lg py-3 px-4 font-semibold text-sm flex items-center justify-center gap-2 transition-all"
              >
                <RotateCcw size={16} />
                Clear
              </button>
            </div>
          </form>
        </div>
      )}

      {/* STEPPER POLLING LOADER SCREEN */}
      {uiState === 'polling' && (
        <div className="bg-brand-darkCard/50 border border-gray-800 rounded-2xl p-8 backdrop-blur-md shadow-2xl transition-all duration-300">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-extrabold tracking-tight text-white mb-2">
              Compiling Your Playbook
            </h2>
            <p className="text-sm text-gray-400">
              Analyses are queued and running asynchronously. Estimated completion is <span className="text-brand-green font-semibold">1-2 minutes</span>. Do not close this page.
            </p>
          </div>

          {/* Vertical Stepper Pipeline */}
          <div className="space-y-6">
            {/* Step 1: Web Scraper */}
            <div className="flex items-start gap-4">
              <div className="flex flex-col items-center">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  leadStatus === 'pending' || leadStatus === 'enriching'
                    ? 'bg-brand-blue text-white ring-4 ring-brand-blue/20 animate-pulse-slow'
                    : 'bg-brand-green text-white'
                }`}>
                  {leadStatus === 'pending' || leadStatus === 'enriching' ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Check size={14} />
                  )}
                </div>
                <div className="w-0.5 h-10 bg-gray-800 mt-2"></div>
              </div>
              <div className="pt-0.5">
                <h4 className="text-sm font-bold text-white">Step 1: Website Scraping Audit</h4>
                <p className="text-xs text-gray-400 mt-0.5">
                  {leadStatus === 'pending' && 'Waiting to initiate Cheerio browser scraper...'}
                  {leadStatus === 'enriching' && `Parsing ${getValues('website')} titles, headers, and contact endpoints...`}
                  {['generating', 'sent', 'failed'].includes(leadStatus) && 'Homepage successfully parsed! Domain insights captured.'}
                </p>
              </div>
            </div>

            {/* Step 2: Gemini Synthesis */}
            <div className="flex items-start gap-4">
              <div className="flex flex-col items-center">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  ['pending', 'enriching'].includes(leadStatus)
                    ? 'bg-gray-800 text-gray-500'
                    : leadStatus === 'generating' && !activeLead?.pdfFilename
                      ? 'bg-brand-blue text-white ring-4 ring-brand-blue/20 animate-pulse-slow'
                      : 'bg-brand-green text-white'
                }`}>
                  {['pending', 'enriching'].includes(leadStatus) ? (
                    <Cpu size={14} />
                  ) : leadStatus === 'generating' && !activeLead?.pdfFilename ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Check size={14} />
                  )}
                </div>
                <div className="w-0.5 h-10 bg-gray-800 mt-2"></div>
              </div>
              <div className="pt-0.5">
                <h4 className="text-sm font-bold text-white">Step 2: AI SWOT & Strategy Synthesis</h4>
                <p className="text-xs text-gray-400 mt-0.5">
                  {['pending', 'enriching'].includes(leadStatus) && 'Pending previous scraping completions...'}
                  {leadStatus === 'generating' && !activeLead?.pdfFilename && 'Querying Gemini 1.5 Flash B2B growth and digital advisory modeling...'}
                  {['sent', 'failed'].includes(leadStatus) || (leadStatus === 'generating' && activeLead?.pdfFilename) ? 'Consulting audit and SWOT JSON structured successfully.' : ''}
                </p>
              </div>
            </div>

            {/* Step 3: PDF Generation */}
            <div className="flex items-start gap-4">
              <div className="flex flex-col items-center">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  ['pending', 'enriching'].includes(leadStatus)
                    ? 'bg-gray-800 text-gray-500'
                    : leadStatus === 'generating' && activeLead?.pdfFilename
                      ? 'bg-brand-blue text-white ring-4 ring-brand-blue/20 animate-pulse-slow'
                      : leadStatus === 'sent'
                        ? 'bg-brand-green text-white'
                        : 'bg-gray-800 text-gray-500'
                }`}>
                  {['pending', 'enriching'].includes(leadStatus) ? (
                    <FileText size={14} />
                  ) : leadStatus === 'generating' && activeLead?.pdfFilename ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : leadStatus === 'sent' ? (
                    <Check size={14} />
                  ) : (
                    <FileText size={14} />
                  )}
                </div>
                <div className="w-0.5 h-10 bg-gray-800 mt-2"></div>
              </div>
              <div className="pt-0.5">
                <h4 className="text-sm font-bold text-white">Step 3: Document Compilation</h4>
                <p className="text-xs text-gray-400 mt-0.5">
                  {['pending', 'enriching'].includes(leadStatus) && 'Awaiting strategic SWOT synthesis...'}
                  {leadStatus === 'generating' && !activeLead?.pdfFilename && 'Synthesizing report layouts...'}
                  {leadStatus === 'generating' && activeLead?.pdfFilename && 'Drafting PDFKit custom covers, graphs, tables, and page badges...'}
                  {leadStatus === 'sent' && '4-page professional consulting PDF generated in-memory.'}
                </p>
              </div>
            </div>

            {/* Step 4: Email Dispatch */}
            <div className="flex items-start gap-4">
              <div className="flex flex-col items-center">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  leadStatus === 'sent'
                    ? 'bg-brand-green text-white'
                    : 'bg-gray-800 text-gray-500'
                }`}>
                  {leadStatus === 'sent' ? (
                    <Check size={14} />
                  ) : (
                    <Send size={14} />
                  )}
                </div>
              </div>
              <div className="pt-0.5">
                <h4 className="text-sm font-bold text-white">Step 4: SMTP Inbox Broadcast</h4>
                <p className="text-xs text-gray-400 mt-0.5">
                  {leadStatus !== 'sent' && 'Awaiting finalized PDF compilation...'}
                  {leadStatus === 'sent' && `Success! Audit report sent to ${getValues('email')}.`}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS SCREEN */}
      {uiState === 'success' && (
        <div className="bg-brand-darkCard/50 border border-gray-800 rounded-2xl p-8 backdrop-blur-md shadow-2xl text-center transition-all duration-300">
          <div className="flex justify-center mb-6">
            <div className="h-16 w-16 bg-brand-green/20 border-2 border-brand-green rounded-full flex items-center justify-center text-brand-green">
              <CheckCircle2 size={32} />
            </div>
          </div>

          <h2 className="text-2xl font-extrabold tracking-tight text-white mb-2">
            Audit Generated Successfully!
          </h2>
          
          <p className="text-sm text-gray-400 mb-6">
            We have emailed your personalized B2B growth playbook to:<br />
            <strong className="text-white text-base">{getValues('email')}</strong>
          </p>

          {/* Audit Metrics block */}
          <div className="bg-brand-darkInput border border-gray-800 rounded-xl p-4 text-left space-y-3 mb-8">
            <h4 className="text-xs font-bold text-brand-gold uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Database size={12} />
              Lead & Scraping Diagnostics
            </h4>
            
            <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-xs">
              <div>
                <span className="text-gray-500 block">Identifier:</span>
                <span className="text-gray-300 font-bold uppercase">{`SIMPLIFIQ-${activeLeadId?.substring(0, 8)}`}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Root Domain:</span>
                <span className="text-gray-300 font-bold">{activeLead?.domain}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Scraper Status:</span>
                <span className="text-gray-300 font-bold flex items-center gap-1">
                  <span className={`h-1.5 w-1.5 rounded-full ${
                    activeLead?.enrichedData?.scrapingStatus === 'success' ? 'bg-brand-green' : 'bg-brand-gold'
                  }`}></span>
                  {activeLead?.enrichedData?.scrapingStatus === 'success' ? 'Complete (200 OK)' : 'Partial / Fallback'}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block">Compiled PDF:</span>
                <span className="text-gray-300 font-bold flex items-center gap-1">
                  <FileText size={10} className="text-brand-green" />
                  Attached (4 Pages)
                </span>
              </div>
            </div>

            {/* Display Tech Stack Tags */}
            {activeLead?.enrichedData?.technologyHints && activeLead.enrichedData.technologyHints.length > 0 && (
              <div className="pt-2 border-t border-gray-800/80">
                <span className="text-gray-500 block text-xs mb-1.5">Detected Web Technology Stack:</span>
                <div className="flex flex-wrap gap-1.5">
                  {(activeLead.enrichedData.technologyHints as string[]).map((tech, i) => (
                    <span key={i} className="text-[10px] bg-brand-blue/30 text-blue-400 border border-brand-blue/40 px-2 py-0.5 rounded-full font-bold">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action button */}
          <button
            onClick={handleReset}
            className="w-full bg-brand-green hover:bg-emerald-500 text-white rounded-lg py-3 px-4 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-brand-green/30 active:scale-[0.98] transition-all"
          >
            <RotateCcw size={16} />
            Audit Another Company
          </button>
        </div>
      )}

      {/* ERROR NOTICE SCREEN */}
      {uiState === 'error' && (
        <div className="bg-brand-darkCard/50 border border-gray-800 rounded-2xl p-8 backdrop-blur-md shadow-2xl text-center transition-all duration-300">
          <div className="flex justify-center mb-6">
            <div className="h-16 w-16 bg-red-500/20 border-2 border-red-500 rounded-full flex items-center justify-center text-red-500">
              <AlertTriangle size={32} />
            </div>
          </div>

          <h2 className="text-2xl font-extrabold tracking-tight text-white mb-2">
            Audit Compilation Failed
          </h2>
          
          <p className="text-sm text-gray-400 mb-6">
            We encountered an exception while analyzing your lead information or communicating with target domains.
          </p>

          {/* Details */}
          <div className="bg-red-950/20 border border-red-900/50 rounded-xl p-4 text-left mb-8">
            <span className="text-xs font-bold text-red-400 uppercase tracking-wider block mb-1">
              Error Details:
            </span>
            <p className="text-xs text-red-300 font-mono leading-relaxed whitespace-pre-wrap">
              {apiError || 'An unknown network error occurred.'}
            </p>
          </div>

          {/* Restore and Try Again */}
          <button
            onClick={handleTryAgain}
            className="w-full bg-brand-blue hover:bg-brand-blueLight text-white rounded-lg py-3 px-4 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-brand-blue/30 active:scale-[0.98] transition-all"
          >
            <RotateCcw size={16} />
            Restore Form & Retry
          </button>
        </div>
      )}
    </div>
  );
}

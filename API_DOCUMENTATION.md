# SimplifIQ API Documentation

**Version:** 1.0.0  
**Last Updated:** May 17, 2026  
**Base URL:** `http://localhost:3001` (local) | `https://api.simplif-iq.com` (production)

---

## Table of Contents

1. [Authentication](#authentication)
2. [Rate Limiting](#rate-limiting)
3. [Error Handling](#error-handling)
4. [Endpoints](#endpoints)
5. [Request/Response Examples](#requestresponse-examples)
6. [Data Models](#data-models)
7. [Lead Status Lifecycle](#lead-status-lifecycle)
8. [Webhook Events](#webhook-events-future)

---

## Authentication

Currently, the SimplifIQ API does **not require API keys**. All endpoints are publicly accessible.

**⚠️ Production Deployment:** When deploying to production, consider adding:
- API key authentication
- CORS restrictions to specific domains
- HTTPS/TLS encryption

---

## Rate Limiting

The API enforces rate limits to prevent abuse:

| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /api/leads` | 10 requests | 15 minutes per IP |
| `GET /api/leads/:id` | 100 requests | 1 minute per IP |
| All other endpoints | 100 requests | 1 minute per IP |

**Response Headers:**
```
RateLimit-Limit: 10
RateLimit-Remaining: 9
RateLimit-Reset: 1726425600
```

When rate limit exceeded:
```json
{
  "error": "Too many requests. Please try again later.",
  "retryAfter": 900
}
```

---

## Error Handling

All errors follow a consistent JSON format:

### 4xx Client Errors

```json
{
  "success": false,
  "error": "Form validation failed",
  "details": {
    "email": ["Invalid email address format"],
    "website": ["Invalid company website URL"]
  }
}
```

### 5xx Server Errors

```json
{
  "success": false,
  "error": "Internal server error occurred",
  "message": "Database connection timeout"
}
```

### Error Status Codes

| Code | Meaning | Cause |
|------|---------|-------|
| 400 | Bad Request | Validation failed, malformed JSON |
| 404 | Not Found | Lead ID doesn't exist |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side exception |
| 503 | Service Unavailable | Gemini API or email service down |

---

## Endpoints

### 1. Health Check

**GET** `/`

Verify that the SimplifIQ API is online and responsive.

#### Request
```bash
curl -X GET http://localhost:3001/
```

#### Response (200 OK)
```json
{
  "status": "online",
  "service": "SimplifIQ Lead Automation Backend API",
  "timestamp": "2026-05-17T14:30:45.123Z"
}
```

#### Use Cases
- Docker health checks
- Load balancer probes
- Monitoring systems

---

### 2. Submit Lead Form (Async)

**POST** `/api/leads`

Submit a new lead and receive a unique `leadId` for polling status. The audit pipeline runs asynchronously in the background.

#### Request

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "companyName": "TechCorp Innovation Labs",
  "website": "techcorp.com",
  "industry": "SaaS & Software",
  "contactName": "John Smith",
  "email": "john.smith@techcorp.com"
}
```

**Field Validation:**

| Field | Type | Validation | Example |
|-------|------|-----------|---------|
| `companyName` | string | 1-100 chars, required | "TechCorp Inc" |
| `website` | string | Valid URL, required | "techcorp.com" |
| `industry` | string | Non-empty, required | "SaaS & Software" |
| `contactName` | string | 1-100 chars, required | "John Smith" |
| `email` | string | Valid email, required | "john@example.com" |

**URL Normalization:**
- Input: `example.com` → Normalized: `https://example.com`
- Input: `https://www.example.com` → Normalized: `https://example.com` (www stripped)

#### Response (202 Accepted)
```json
{
  "success": true,
  "leadId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Lead received. Research and report generation started in the background.",
  "timestamp": "2026-05-17T14:30:45.123Z"
}
```

#### Response (400 Bad Request)
```json
{
  "success": false,
  "error": "Form validation failed",
  "details": {
    "companyName": ["Company name cannot be empty"],
    "email": ["Invalid email address format"]
  }
}
```

#### Key Characteristics
- **Returns immediately** (< 200ms latency)
- **Asynchronous processing** - audit runs in background
- **No blocking** - client receives leadId for polling
- **Rate Limited** - 10 submissions per 15 minutes per IP

---

### 3. Get Lead Status

**GET** `/api/leads/:id`

Poll the current status and details of a lead. Use this to track the audit pipeline progress.

#### Request

**Parameters:**
```
id (path): UUID of the lead to fetch
```

**Example:**
```bash
curl -X GET http://localhost:3001/api/leads/550e8400-e29b-41d4-a716-446655440000
```

#### Response (200 OK) - Pending
```json
{
  "success": true,
  "lead": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "companyName": "TechCorp Inc",
    "website": "https://techcorp.com",
    "domain": "techcorp.com",
    "industry": "SaaS & Software",
    "contactName": "John Smith",
    "email": "john.smith@techcorp.com",
    "status": "pending",
    "createdAt": "2026-05-17T14:30:45.123Z",
    "updatedAt": "2026-05-17T14:30:45.123Z"
  }
}
```

#### Response (200 OK) - Enriching
```json
{
  "success": true,
  "lead": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "companyName": "TechCorp Inc",
    "website": "https://techcorp.com",
    "domain": "techcorp.com",
    "industry": "SaaS & Software",
    "contactName": "John Smith",
    "email": "john.smith@techcorp.com",
    "status": "enriching",
    "createdAt": "2026-05-17T14:30:45.123Z",
    "updatedAt": "2026-05-17T14:30:50.456Z",
    "enrichedData": {
      "title": "TechCorp - Enterprise SaaS Solutions",
      "metaDescription": "Leading B2B SaaS platform for data analytics",
      "headings": {
        "h1s": ["Automated Analytics for Enterprise"],
        "h2s": ["Why TechCorp", "Trusted by 500+ Companies"]
      },
      "contactInfo": {
        "emails": ["contact@techcorp.com", "support@techcorp.com"],
        "phones": ["+1-555-123-4567"]
      },
      "technologyHints": ["React/Next.js", "Google Analytics", "Stripe"],
      "scrapingStatus": "success",
      "scrapedAt": "2026-05-17T14:30:49.123Z"
    }
  }
}
```

#### Response (200 OK) - Generating
```json
{
  "success": true,
  "lead": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "companyName": "TechCorp Inc",
    "website": "https://techcorp.com",
    "domain": "techcorp.com",
    "industry": "SaaS & Software",
    "contactName": "John Smith",
    "email": "john.smith@techcorp.com",
    "status": "generating",
    "createdAt": "2026-05-17T14:30:45.123Z",
    "updatedAt": "2026-05-17T14:31:05.789Z",
    "enrichedData": { /* ... */ },
    "reportData": {
      "executiveSummary": {
        "valueProposition": "TechCorp positions itself as an enterprise-grade data analytics platform...",
        "marketOpportunity": "Significant opportunity to expand into mid-market SME segment...",
        "positioningStatement": "TechCorp is an AI-native analytics platform for Fortune 500 data teams..."
      },
      "companyProfile": {
        "businessModel": "B2B SaaS",
        "speculatedScale": "Growth-stage SME",
        "digitalCompetence": "High"
      },
      "swotAnalysis": {
        "strengths": ["Strong technical brand", "Modern tech stack", "Clear product focus"],
        "weaknesses": ["High competitive noise", "Limited demo booking CTAs"],
        "opportunities": ["Implement cold-email automation", "Deploy interactive pricing"],
        "threats": ["Rising ad spend inflation", "Rapid copycat competition"]
      },
      "industryTrends": {
        "alignmentScore": 82,
        "trend1": { "name": "AI-Powered Operations", "description": "..." },
        "trend2": { "name": "Omnichannel Acquisition", "description": "..." },
        "trend3": { "name": "Real-Time Dashboards", "description": "..." }
      },
      "recommendations": [
        {
          "category": "Website & UX",
          "title": "Optimize Homepage Title & Meta Descriptions",
          "description": "Current metadata needs SEO optimization to double organic click rates...",
          "impact": "High"
        }
      ]
    },
    "pdfFilename": "TechCorp_Inc_Growth_Audit.pdf"
  }
}
```

#### Response (200 OK) - Sent (Success)
```json
{
  "success": true,
  "lead": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "companyName": "TechCorp Inc",
    "website": "https://techcorp.com",
    "domain": "techcorp.com",
    "industry": "SaaS & Software",
    "contactName": "John Smith",
    "email": "john.smith@techcorp.com",
    "status": "sent",
    "createdAt": "2026-05-17T14:30:45.123Z",
    "updatedAt": "2026-05-17T14:32:15.123Z",
    "enrichedData": { /* ... */ },
    "reportData": { /* ... */ },
    "pdfFilename": "TechCorp_Inc_Growth_Audit.pdf"
  }
}
```

#### Response (200 OK) - Failed
```json
{
  "success": true,
  "lead": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "companyName": "TechCorp Inc",
    "website": "https://techcorp.com",
    "domain": "techcorp.com",
    "industry": "SaaS & Software",
    "contactName": "John Smith",
    "email": "john.smith@techcorp.com",
    "status": "failed",
    "createdAt": "2026-05-17T14:30:45.123Z",
    "updatedAt": "2026-05-17T14:31:55.123Z",
    "errorMessage": "Gemini API timeout after 30 seconds. Please try again later."
  }
}
```

#### Response (404 Not Found)
```json
{
  "success": false,
  "error": "Lead not found"
}
```

#### Polling Strategy
```javascript
// Poll every 2.5 seconds
const pollInterval = setInterval(async () => {
  const response = await fetch(`/api/leads/${leadId}`);
  const { lead } = await response.json();
  
  if (lead.status === 'sent') {
    clearInterval(pollInterval);
    console.log('✅ Audit complete! PDF sent to', lead.email);
  } else if (lead.status === 'failed') {
    clearInterval(pollInterval);
    console.error('❌ Pipeline failed:', lead.errorMessage);
  } else {
    console.log('⏳ Status:', lead.status);
  }
}, 2500);
```

---

### 4. List All Leads

**GET** `/api/leads`

Retrieve all submitted leads. Useful for admin dashboards and lead management systems.

#### Request
```bash
curl -X GET http://localhost:3001/api/leads
```

#### Response (200 OK)
```json
{
  "success": true,
  "count": 3,
  "leads": [
    {
      "id": "lead-003",
      "companyName": "DataFlow Systems",
      "website": "https://dataflow.io",
      "domain": "dataflow.io",
      "industry": "Data Engineering",
      "contactName": "Emma Wilson",
      "email": "emma@dataflow.io",
      "status": "sent",
      "createdAt": "2026-05-17T14:45:00.000Z",
      "updatedAt": "2026-05-17T14:47:30.000Z"
    },
    {
      "id": "lead-002",
      "companyName": "FinanceHub",
      "website": "https://financehub.com",
      "domain": "financehub.com",
      "industry": "Finance & Fintech",
      "contactName": "Michael Chen",
      "email": "michael@financehub.com",
      "status": "sent",
      "createdAt": "2026-05-17T14:30:00.000Z",
      "updatedAt": "2026-05-17T14:32:15.000Z"
    },
    {
      "id": "lead-001",
      "companyName": "TechCorp Inc",
      "website": "https://techcorp.com",
      "domain": "techcorp.com",
      "industry": "SaaS & Software",
      "contactName": "John Smith",
      "email": "john@techcorp.com",
      "status": "pending",
      "createdAt": "2026-05-17T14:00:00.000Z",
      "updatedAt": "2026-05-17T14:00:00.000Z"
    }
  ]
}
```

#### Notes
- **Sorted by creation date** (newest first)
- **No pagination** (suitable for < 10,000 leads)
- **For large deployments**, implement pagination:
  ```bash
  GET /api/leads?page=1&limit=50
  ```

---

## Request/Response Examples

### Example 1: Complete Workflow

#### Step 1: Submit Lead
```bash
curl -X POST http://localhost:3001/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "CloudNine Labs",
    "website": "cloudnine.io",
    "industry": "SaaS & Software",
    "contactName": "Alice Johnson",
    "email": "alice@cloudnine.io"
  }'
```

**Response:**
```json
{
  "success": true,
  "leadId": "abc-123-def-456",
  "message": "Lead received. Research and report generation started in the background.",
  "timestamp": "2026-05-17T14:30:45.123Z"
}
```

#### Step 2: Poll Status (Multiple Calls)

**Call 1 (at 2 seconds):**
```bash
curl -X GET http://localhost:3001/api/leads/abc-123-def-456
```

**Response (Status: enriching):**
```json
{
  "success": true,
  "lead": {
    "id": "abc-123-def-456",
    "companyName": "CloudNine Labs",
    "status": "enriching",
    "...": "..."
  }
}
```

**Call 2 (at 8 seconds):**
```bash
curl -X GET http://localhost:3001/api/leads/abc-123-def-456
```

**Response (Status: generating):**
```json
{
  "success": true,
  "lead": {
    "id": "abc-123-def-456",
    "companyName": "CloudNine Labs",
    "status": "generating",
    "pdfFilename": "CloudNine_Labs_Growth_Audit.pdf",
    "...": "..."
  }
}
```

**Call 3 (at 30 seconds):**
```bash
curl -X GET http://localhost:3001/api/leads/abc-123-def-456
```

**Response (Status: sent - SUCCESS):**
```json
{
  "success": true,
  "lead": {
    "id": "abc-123-def-456",
    "companyName": "CloudNine Labs",
    "status": "sent",
    "email": "alice@cloudnine.io",
    "pdfFilename": "CloudNine_Labs_Growth_Audit.pdf",
    "...": "..."
  }
}
```

---

## Data Models

### Lead Object

```typescript
interface Lead {
  id: string;                              // UUID v4
  companyName: string;                     // 1-100 chars
  website: string;                         // Full URL with protocol
  domain: string;                          // Root domain only
  industry: string;                        // User-selected category
  contactName: string;                     // Full name, title-cased
  email: string;                           // Valid email format
  status: 'pending' | 'enriching' | 'generating' | 'sent' | 'failed';
  createdAt: ISO8601;                      // UTC timestamp
  updatedAt: ISO8601;                      // UTC timestamp
  pdfFilename?: string;                    // Only if generated
  errorMessage?: string;                   // Only if failed
  enrichedData?: EnrichedCompanyData;      // After enriching stage
  reportData?: AuditReportData;            // After generating stage
}
```

### EnrichedCompanyData

```typescript
interface EnrichedCompanyData {
  title: string;                           // Page <title> tag
  metaDescription: string;                 // Meta description
  headings: {
    h1s: string[];                         // Up to 3 H1 tags
    h2s: string[];                         // Up to 5 H2 tags
  };
  contactInfo: {
    emails: string[];                      // Extracted emails
    phones: string[];                      // Extracted phone numbers
  };
  logoUrl: string;                         // Clearbit logo URL
  technologyHints: string[];               // Detected tech stack
  scrapingStatus: 'success' | 'failed' | 'partial';
  scrapedAt: ISO8601;
}
```

### AuditReportData

```typescript
interface AuditReportData {
  executiveSummary: {
    valueProposition: string;              // 3-sentence value prop
    marketOpportunity: string;             // Market opportunity
    positioningStatement: string;          // Sales positioning
  };
  companyProfile: {
    businessModel: string;                 // SaaS, Services, etc.
    speculatedScale: string;               // Startup / SME / Enterprise
    digitalCompetence: string;             // High / Medium / Low
  };
  swotAnalysis: {
    strengths: string[];                   // 3 items
    weaknesses: string[];                  // 3 items
    opportunities: string[];               // 3 items
    threats: string[];                     // 3 items
  };
  industryTrends: {
    alignmentScore: number;                // 1-100
    trend1: { name: string; description: string };
    trend2: { name: string; description: string };
    trend3: { name: string; description: string };
  };
  recommendations: Array<{
    category: 'Website & UX' | 'Growth & Marketing' | 'Systems & Integration';
    title: string;
    description: string;
    impact: 'High' | 'Medium' | 'Low';
  }>;                                      // 3 recommendations
}
```

---

## Lead Status Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                    Lead Submission (POST)                   │
│               Returns immediately with leadId               │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   PENDING   │ ◄─── Initial state
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────────┐
                    │  ENRICHING (1)  │ ◄─── Scraping website
                    │  (10-15 sec)    │
                    └──────┬──────────┘
                           │
                           ▼
                    ┌─────────────────┐
                    │ GENERATING (2)  │ ◄─── Gemini synthesis + PDF
                    │  (15-25 sec)    │
                    └──────┬──────────┘
                           │
                  ┌────────┴────────┐
                  │                 │
                  ▼                 ▼
            ┌─────────┐        ┌─────────┐
            │  SENT   │        │ FAILED  │
            │(Success)│        │(Error)  │
            └─────────┘        └─────────┘
```

### Status Descriptions

| Status | Description | Duration | What Happens |
|--------|-------------|----------|--------------|
| `pending` | Waiting to start | 0 sec | Lead saved, awaiting processing |
| `enriching` | Web scraping in progress | 10-15 sec | Cheerio parser extracts data |
| `generating` | AI synthesis & PDF generation | 15-25 sec | Gemini generates audit, PDFKit renders |
| `sent` | ✅ Complete | - | Email delivered to prospect |
| `failed` | ❌ Error occurred | - | Check `errorMessage` field |

---

## Webhook Events (Future)

*Currently not implemented. Planned for v2.0*

When implemented, the API will support webhooks for these events:

```
POST https://your-webhook.url/simplif-iq

Event: lead.created
Event: lead.enrichment_complete
Event: lead.pdf_generated
Event: lead.email_sent
Event: lead.failed
```

---

## Rate Limiting Details

### Per-IP Buckets

Each unique IP address gets its own rate limit bucket:

```
IPv4: 192.168.1.100
  ├─ POST /api/leads: 10/15min window
  ├─ GET /api/leads/:id: 100/1min window
  └─ GET /api/leads: 100/1min window

IPv4: 203.0.113.50
  ├─ POST /api/leads: 10/15min window (independent)
  └─ ...
```

### X-Forwarded-For Header

If behind a proxy, the API uses `X-Forwarded-For` header to identify real IP:

```
X-Forwarded-For: 192.168.1.100, 10.0.0.1

Real IP: 192.168.1.100 (leftmost)
```

---

## Common Issues & Solutions

### Issue: Lead stuck in "enriching" state
**Solution:** Website may be blocking scrapers. Check:
- Robots.txt allows scraping
- No WAF/bot protection
- Server responds with HTTP 200

### Issue: "Gemini API timeout"
**Solution:** API call exceeded 30 seconds. Check:
- Gemini API quota not exhausted
- Network connectivity
- Retry after 60 seconds

### Issue: Email not delivered
**Solution:** Check:
- SMTP credentials in `.env`
- Email address valid
- Check spam folder
- Email service (Mailtrap/SendGrid) quota

---

## Support

For API issues, check the backend logs:

```bash
# Local development
npm run dev    # Prints logs to console

# Docker
docker logs simplif-iq-backend

# Production
tail -f /var/log/simplif-iq/api.log
```

---

**Last Updated:** May 17, 2026  
**API Version:** 1.0.0  
**Status:** Production Ready

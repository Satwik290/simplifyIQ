# SimplifIQ Lead Automation System

SimplifIQ is a production-grade, highly responsive B2B Lead Intake, Data Enrichment, AI Synthesis, and follow-up email broadcast monorepo built **completely free of cost**. It leverages the high-speed **Google Gemini 1.5 Flash API** to write research-backed digital growth audits, compiles them programmatically into beautiful multi-page PDFs, and delivers them directly to qualified prospects' inboxes, with live logs sent to Google Sheets and archives saved to Google Drive.

---

## 🚀 Key Features

*   **Lead Validation Engine (P0):** Parses prospect forms using strict validation schemas. Sanitizes website protocols (e.g. `google.com` ➔ `https://google.com`) and extracts root domains for scrapers and brand services.
*   **Asynchronous Data Enrichment (P0):** Scrapes the homepage of target websites using Axios and Cheerio to retrieve page titles, meta descriptions, headings (`<h1>`/`<h2>`), tech stack indicators, and contacts.
*   **Gemini AI Consulting Synthesis (P0):** Utilizes the free tier of the **Gemini 1.5 Flash API** in native JSON mode to generate executive value propositions, a 4-quadrant SWOT analysis, modern B2B industry trend alignment scores, and growth recommendations.
*   **In-Memory PDF Generation (P0):** Leverages **PDFKit** to render multi-page documents (covers, cards, badges, and grids) entirely in memory—eliminating resource-heavy, timeout-prone Puppeteer headless browser overhead.
*   **SMTP Nodemailer Delivery (P0):** Broadcaster service supporting both **Nodemailer SMTP** (Gmail, outlook, Mailtrap) and **SendGrid** to deliver HTML-designed emails with PDF attachments.
*   **Zero-Timeout Stepper UI (P0):** Submissions return unique lead IDs in `<200ms`, launching background workers. The Next.js client displays an interactive progressive polling stepper that checks the status in real-time, completely bypassing serverless timeouts.
*   **Google Sheets Tracker (P1 Bonus):** Appends leads, timestamps, and delivery indicators in real-time to a shared spreadsheet.
*   **Google Drive PDF Archive (P1 Bonus):** Uploads copies of compiled PDFs to a centralized Google Cloud storage directory.

---

## 📂 Project Structure

```
simplifyIQ/
├── docker-compose.yml           # Multi-container orchestrator
├── README.md                    # Documentation
│
├── backend/                     # Node.js + Express + TypeScript API
│   ├── src/
│   │   ├── routes/leads.ts      # HTTP endpoints & background orchestrator
│   │   ├── services/            # Scraping, Gemini, PDF, SMTP, Google services
│   │   ├── utils/               # Logger & Zod validator
│   │   └── server.ts            # Server entry point
│   ├── data/                    # JSON database directory (leads.json)
│   ├── Dockerfile               # High-performance two-stage build file
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example             # Template for API credentials
│
└── frontend/                    # Next.js App Router + TypeScript + Tailwind
    ├── app/
    │   ├── globals.css          # Tailwind CSS styles & mesh background
    │   ├── layout.tsx           # Glassmorphic header & brand footer
    │   └── page.tsx             # Interactive form, stepper, success, & error views
    ├── lib/types.ts             # Shared interfaces
    ├── Dockerfile               # High-performance two-stage build file
    ├── package.json
    ├── postcss.config.js
    └── tailwind.config.js       # Design tokens & hex brand colors
```

---

## 🛠️ Installation & Setup

### 1. Prerequisites
Ensure you have the following installed on your machine:
*   [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Recommended for zero-configuration launching)
*   [Node.js](https://nodejs.org/) v18+ & npm (Optional, if running locally outside containers)

### 2. Configure Environment Variables
Copy `/backend/.env.example` into a new file `/backend/.env`:
```bash
cp backend/.env.example backend/.env
```

Open `/backend/.env` and configure your credentials:
1.  **GEMINI_API_KEY:** Get a free Google AI Studio API Key from [https://aistudio.google.com/](https://aistudio.google.com/).
2.  **EMAIL_PROVIDER:** Set to `nodemailer` to use SMTP (e.g. Mailtrap or Gmail).
3.  **SMTP Configuration:** If using `nodemailer`, supply your host user and password. For local testing, we recommend creating a free account on [Mailtrap.io](https://mailtrap.io).
4.  **Google Integrations (Optional):** If using Sheets logging and Drive archiving, create a GCP Service Account, enable Sheets/Drive APIs, download the JSON key file, compress it into an inline string in `GOOGLE_SERVICE_ACCOUNT_JSON`, and provide `GOOGLE_SHEETS_ID` and `GOOGLE_DRIVE_FOLDER_ID`. *If omitted, these steps degrade gracefully, writing warnings in console logs while letting the core pipeline complete successfully!*

---

## 🐳 Running with Docker (Recommended)

To build and launch the entire SimplifIQ Lead Automation monorepo (Next.js client on port 3000, Express backend on port 3001), run a single command in the project root:

```bash
docker compose up --build
```

That's it! Docker Compose will automatically:
1.  Compile TypeScript backend code in a builder and mount the persistent `./backend/data` volume.
2.  Compile the Next.js frontend code.
3.  Boot the services together under a shared network.
4.  Launch the Web UI on [http://localhost:3000](http://localhost:3000).

---

## 💻 Running Locally (Development Mode)

If you wish to run the applications locally on your host OS during development:

### 1. Launch the Backend API
```bash
cd backend
npm install
npm run dev
```
The Express server will start listening at [http://localhost:3001](http://localhost:3001).

### 2. Launch the Next.js Client
```bash
cd frontend
npm install
npm run dev
```
The Next.js client will start listening at [http://localhost:3000](http://localhost:3000).

---

## 🧪 Testing the AI Pipeline (CLI Verification Tool)

We have built a dedicated integration verification script to test your scraper, Gemini API connections, and PDFKit rendering engine from the CLI without having to boot the web interface.

From inside the `/backend` directory, run:
```bash
npm run verify-pipeline
```

This script will:
1.  Scrape public tags from `https://github.com`.
2.  Query Gemini 1.5 Flash using your `.env` key to generate SWOT and B2B reports.
3.  Programmatically write a beautifully designed A4 PDF file directly to the backend root directory named **`test_growth_audit.pdf`**.
4.  Open `test_growth_audit.pdf` to visually inspect cover pages, SWOT grids, HSL card badges, and alignments!

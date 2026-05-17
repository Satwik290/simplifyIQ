import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SimplifIQ - Personalized Growth Audit Engine',
  description: 'Submit your company details and receive an automated, AI-powered consulting audit PDF directly in your email in under 3 minutes.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex flex-col min-h-screen bg-brand-darkBg text-gray-100 antialiased mesh-gradient">
        {/* Navigation Header */}
        <header className="sticky top-0 z-50 border-b border-gray-800 bg-brand-darkBg/80 backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-blue-500 via-brand-green to-brand-gold bg-clip-text text-transparent">
                SimplifIQ
              </span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-green opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-green"></span>
              </span>
            </div>
            
            <nav className="flex items-center gap-4 text-sm text-gray-400 font-semibold">
              <a href="#" className="hover:text-white transition-colors">Audit Engine</a>
              <span className="text-gray-700">|</span>
              <span className="text-xs bg-brand-blue/30 text-blue-400 border border-brand-blue/50 px-2 py-0.5 rounded-full">
                Gemini-Powered
              </span>
            </nav>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-grow flex items-center justify-center py-10">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-gray-800 bg-brand-darkBg py-6 text-center text-xs text-gray-500">
          <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <p>&copy; 2026 SimplifIQ Lead Automation System. Built with Google Gemini 1.5 Flash.</p>
            <div className="flex gap-4 text-gray-400 font-medium">
              <a href="#" className="hover:text-white transition-colors">API Status</a>
              <span>&bull;</span>
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}

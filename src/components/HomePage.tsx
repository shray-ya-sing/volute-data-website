import { Button } from "./ui/button"
import { Play } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-black flex flex-col">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 flex-grow flex flex-col justify-center py-16">
        {/* Hero Section */}
        <div className="text-center w-full">
          {/* Main Headline - Using inline styles to override global constraints */}
          <div className="mb-8">
            <h1 
              className="text-gray-900 tracking-tight"
              style={{ 
                fontSize: 'clamp(3rem, 8vw, 5rem)', 
                fontWeight: '300',
                lineHeight: '1.1',
                marginBottom: '2rem'
              }}
            >
              Volute is the financial data
              <br />
              <span style={{ fontWeight: '500' }}>aggregation agent</span>
              <br />
              for analysts.
            </h1>
          </div>

                {/* Description */}
          <div className="mx-auto mb-8" style={{ maxWidth: '56rem' }}>
            <p 
              className="text-gray-600 mb-6"
              style={{ 
                fontSize: '1.5rem',
                fontWeight: '300',
                lineHeight: '1.6'
              }}
            >
              Volute delivers clean, thoughtfully aggregated data in a simple and delightful user experience.
            </p>
            
            <p 
              className="text-gray-500 mb-8"
              style={{ 
                fontSize: '1.25rem',
                lineHeight: '1.6'
              }}
            >
              Differentiated from other data providers by thoughtful, human validated accuracy and thoroughness.
            </p>
            
            <div style={{ paddingTop: '1rem' }}>
              <a 
                href="mailto:sshreya1000@gmail.com" 
                className="inline-flex items-center text-black transition-all duration-200"
                style={{
                  fontSize: '1.125rem',
                  fontWeight: '500',
                  borderBottom: '2px solid black',
                  paddingBottom: '0.25rem',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderBottomColor = '#6b7280';
                  e.currentTarget.style.color = '#6b7280';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderBottomColor = 'black';
                  e.currentTarget.style.color = 'black';
                }}
              >
                Contact for early access
                <svg className="w-4 h-4" style={{ marginLeft: '0.5rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
            </div>
          </div>

          {/* Demo Video */}
          <div className="relative mx-auto" style={{ maxWidth: '80rem', marginTop: '4rem' }}>
            {/* Demo Badge */}
            <div className="flex justify-center mb-4">
              <span 
                className="inline-flex items-center text-gray-500 bg-gray-50 border border-gray-200"
                style={{
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  padding: '0.5rem 1rem',
                  borderRadius: '2rem',
                  letterSpacing: '0.025em'
                }}
              >
                Demo Video
              </span>
            </div>
            
            <div className="relative">
              {/* Video container */}
              <div 
                className="relative bg-black overflow-hidden shadow-2xl border border-gray-100"
                style={{ 
                  aspectRatio: '16/9',
                  borderRadius: '0.75rem'
                }}
              >
                <video 
                  className="w-full h-full object-cover"
                  src="https://pfrilrbw7rdy0sj5.public.blob.vercel-storage.com/demo.mp4" 
                  autoPlay 
                  loop 
                  muted 
                  playsInline
                >
                  Your browser does not support the video tag.
                </video>
                
                {/* Subtle overlay */}
                <div 
                  className="absolute inset-0 pointer-events-none"
                  style={{ backgroundColor: 'rgba(0,0,0,0.05)' }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </main>

            {/* Footer */}
      <footer
        className="bg-black border-t border-gray-800 text-white"
        style={{ minHeight: '50vh' }} // ensure footer takes up 50% of viewport
      >
        <div
          className="max-w-7xl mx-auto px-6"
          style={{ paddingTop: '6rem', paddingBottom: '6rem' }} // extra blank space
        >
          <div className="flex flex-col items-center justify-between gap-8">            
            {/* Links */}
            <div className="flex gap-8 text-gray-300" style={{ gap: '3rem' }}> {/* increased gap between links */}
              <a 
                href="#"
                className="transition-colors duration-200"
                style={{ fontSize: '0.875rem', color: '#d1d5db', padding: '0 1rem' }} // added horizontal padding
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#d1d5db';
                }}
              >
                Contact
              </a>
              <a 
                href="#"
                className="transition-colors duration-200"
                style={{ fontSize: '0.875rem', color: '#d1d5db', padding: '0 1rem' }} // added horizontal padding
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#d1d5db';
                }}
              >
                Privacy Policy
              </a>
              <a 
                href="#"
                className="transition-colors duration-200"
                style={{ fontSize: '0.875rem', color: '#d1d5db', padding: '0 1rem' }} // added horizontal padding
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#d1d5db';
                }}
              >
                Terms of Service
              </a>
            </div>
            
            {/* Copyright */}
            <div className="border-t border-gray-800 w-full text-center" style={{ paddingTop: '2rem' }}>
              <p 
                className="text-gray-400"
                style={{ fontSize: '0.875rem' }}
              >
                &copy; 2025 Volute. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
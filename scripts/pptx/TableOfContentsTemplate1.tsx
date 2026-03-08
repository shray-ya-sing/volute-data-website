export function TableOfContentsTemplate1() {
  return (
    <div className="w-full min-h-screen bg-white p-16">
      {/* Header with Logo */}
      <div className="flex items-start gap-12 mb-16">
        {/* Goldman Sachs Logo Box */}
        <div 
          className="border-4 border-gray-800 p-4 flex items-center justify-center flex-shrink-0"
          style={{ width: '120px', height: '120px' }}
          data-pptx-type="shape"
          data-pptx-id="gs-logo"
        >
          <div className="text-center text-sm font-bold text-gray-800">
            <div>Goldman</div>
            <div>Sachs</div>
          </div>
        </div>

        {/* Title Section */}
        <div className="flex-1">
          <div className="border-t-8 border-black mb-4" data-pptx-type="shape" data-pptx-id="top-line"></div>
          <h1 
            className="text-5xl font-bold text-[#003366] mb-4"
            data-pptx-type="text"
            data-pptx-id="title"
          >
            Table of Contents
          </h1>
          <div className="border-t-8 border-black" data-pptx-type="shape" data-pptx-id="bottom-line"></div>
        </div>
      </div>

      {/* Main Content List */}
      <div className="ml-36 space-y-6 mb-24" data-pptx-type="text" data-pptx-id="contents-list">
        <div className="flex gap-8 items-baseline">
          <span className="font-bold text-2xl">I.</span>
          <span className="text-2xl font-bold">Executive Summary</span>
        </div>
        
        <div className="flex gap-8 items-baseline">
          <span className="font-bold text-2xl">II.</span>
          <span className="text-2xl font-bold">The Backdrop</span>
        </div>
        
        <div className="flex gap-8 items-baseline">
          <span className="font-bold text-2xl">III.</span>
          <span className="text-2xl font-bold">Status Quo</span>
        </div>
        
        <div className="flex gap-8 items-baseline">
          <span className="font-bold text-2xl">IV.</span>
          <span className="text-2xl font-bold">Partner with Financial Sponsor</span>
        </div>
        
        <div className="flex gap-8 items-baseline">
          <span className="font-bold text-2xl">V.</span>
          <span className="text-2xl font-bold">Sale to a Strategic Buyer</span>
        </div>
        
        <div className="flex gap-8 items-baseline">
          <span className="font-bold text-2xl">VI.</span>
          <span className="text-2xl font-bold">Partnerships and Acquisitions</span>
        </div>

        <div className="flex gap-4 items-baseline mt-8">
          <span className="text-2xl font-bold">Appendix A:</span>
          <span className="text-2xl font-bold">Valuation Backup</span>
        </div>

        <div className="flex gap-4 items-baseline">
          <span className="text-2xl font-bold">Appendix B:</span>
          <span className="text-2xl font-bold">Other Materials</span>
        </div>
      </div>

      {/* Disclaimer Section */}
      <div className="ml-36 mt-24">
        <div className="border-t-2 border-black pt-6">
          <p 
            className="text-xs italic text-gray-700 leading-relaxed max-w-4xl"
            data-pptx-type="text"
            data-pptx-id="disclaimer"
          >
            Goldman Sachs does not provide accounting, tax, or legal advice. Notwithstanding anything in this 
            document to the contrary, and except as required to enable compliance with applicable securities law, 
            you (and each of your employees, representatives, and other agents) may disclose to any and all persons 
            the US federal income and state tax treatment and tax structure of the transaction and all materials of any 
            kind (including tax opinions and other tax analyses) that are provided to you relating to such tax treatment 
            and tax structure, without Goldman Sachs imposing any limitation of any kind.
          </p>
        </div>
        <div className="border-t-2 border-black mt-6"></div>
      </div>
    </div>
  );
}

export function TableOfContentsTemplate2() {
  return (
    <div className="w-full min-h-screen bg-white p-16">
      {/* Title with underline */}
      <div className="mb-12">
        <h1 
          className="text-4xl font-bold text-[#003366] pb-2 border-b-4 border-[#003366]"
          data-pptx-type="text"
          data-pptx-id="title"
        >
          Table of Contents
        </h1>
      </div>

      {/* Section Header */}
      <div className="flex justify-end mb-8">
        <span 
          className="text-lg text-gray-700"
          data-pptx-type="text"
          data-pptx-id="section-header"
        >
          Section
        </span>
      </div>

      {/* Main Content List */}
      <div className="space-y-8 mb-16" data-pptx-type="text" data-pptx-id="contents-list">
        <div className="flex justify-between items-baseline py-3 border-b border-gray-200">
          <span className="text-xl">Executive Summary</span>
          <span className="text-xl">I</span>
        </div>
        
        <div className="flex justify-between items-baseline py-3 border-b border-gray-200">
          <span className="text-xl">Soda Ash Market Background</span>
          <span className="text-xl">II</span>
        </div>
        
        <div className="flex justify-between items-baseline py-3 border-b border-gray-200">
          <span className="text-xl">SIRE Situation Analysis</span>
          <span className="text-xl">III</span>
        </div>
        
        <div className="flex justify-between items-baseline py-3 border-b border-gray-200">
          <span className="text-xl">Preliminary Valuation of SIRE Common Units</span>
          <span className="text-xl">IV</span>
        </div>

        {/* Sub-items */}
        <div className="ml-12 space-y-6">
          <div className="flex gap-4 items-baseline">
            <span className="text-lg">A.</span>
            <span className="text-lg">Preliminary Valuation Detail – SIRE Financial Projections</span>
          </div>
          
          <div className="flex gap-4 items-baseline">
            <span className="text-lg">B.</span>
            <span className="text-lg">Financial Projections and Preliminary Valuation Detail – Sensitivity Case</span>
          </div>
        </div>

        {/* Appendix Section */}
        <div className="mt-12 pt-8">
          <div className="text-xl font-bold mb-6">Appendix</div>
          
          <div className="ml-12 space-y-6">
            <div className="text-lg">Weighted Average Cost of Capital Analysis</div>
            <div className="text-lg">Additional Materials</div>
          </div>
        </div>
      </div>

      {/* Footer with Logos */}
      <div className="absolute bottom-16 left-16 right-16 flex justify-between items-center border-t-2 border-gray-800 pt-6">
        <div 
          className="border-2 border-gray-400 p-3 w-32 h-16 flex items-center justify-center"
          data-pptx-type="shape"
          data-pptx-id="evercore-logo"
        >
          <span className="text-xs font-bold text-gray-600">EVERCORE</span>
        </div>
        
        <div 
          className="border-2 border-gray-400 p-3 w-32 h-16 flex items-center justify-center"
          data-pptx-type="shape"
          data-pptx-id="sisecam-logo"
        >
          <span className="text-xs font-bold text-gray-600">ŞİŞECAM</span>
        </div>
      </div>
    </div>
  );
}

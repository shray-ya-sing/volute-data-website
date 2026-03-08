export function TableOfContentsTemplate3() {
  return (
    <div className="w-full min-h-screen bg-white p-16 relative">
      {/* Title */}
      <div className="mb-16">
        <h1 
          className="text-5xl font-normal text-gray-900"
          data-pptx-type="text"
          data-pptx-id="title"
        >
          Table of contents
        </h1>
      </div>

      {/* Main Content List */}
      <div className="space-y-12 mb-24" data-pptx-type="text" data-pptx-id="contents-list">
        {/* Section 1 */}
        <div className="flex items-center gap-6">
          <div className="bg-teal-700 text-white w-14 h-14 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-bold">1</span>
          </div>
          <span className="text-3xl">Sumo Offer Terms</span>
        </div>

        {/* Section 2 */}
        <div className="flex items-center gap-6">
          <div className="bg-teal-700 text-white w-14 h-14 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-bold">2</span>
          </div>
          <span className="text-3xl">Bravo Financials</span>
        </div>

        {/* Section 3 */}
        <div className="flex items-center gap-6">
          <div className="bg-teal-700 text-white w-14 h-14 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-bold">3</span>
          </div>
          <span className="text-3xl">Valuation Analysis</span>
        </div>

        {/* Appendix Section */}
        <div className="mt-24 pt-8">
          <div className="text-3xl">Appendix</div>
        </div>
      </div>

      {/* Footer with Page Number */}
      <div className="absolute bottom-16 left-16 right-16 border-t border-gray-300 pt-6">
        <div className="flex justify-end">
          <span 
            className="text-xl text-gray-700"
            data-pptx-type="text"
            data-pptx-id="page-number"
          >
            1
          </span>
        </div>
      </div>
    </div>
  );
}

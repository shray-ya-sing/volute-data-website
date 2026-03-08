export function TitleSlideTemplate2() {
  return (
    <div className="w-full min-h-screen bg-white p-12 flex flex-col">
      {/* Top Banner and Header */}
      <div className="mb-8">
        {/* Confidential Banner */}
        <div className="flex justify-center mb-6">
          <div 
            className="border-4 border-red-700 px-8 py-2"
            data-pptx-type="shape"
            data-pptx-id="confidential-banner"
          >
            <p className="text-red-700 font-bold text-sm tracking-wide">
              STRICTLY CONFIDENTIAL, PRELIMINARY DRAFT AND SUBJECT TO CHANGE
            </p>
          </div>
        </div>

        {/* Logo and Division Header */}
        <div className="flex justify-between items-start mb-8">
          {/* Goldman Sachs Logo Box */}
          <div 
            className="bg-blue-700 text-white p-6 flex items-center justify-center"
            style={{ width: '100px', height: '100px' }}
            data-pptx-type="shape"
            data-pptx-id="gs-logo"
          >
            <div className="text-center text-xs font-bold">
              <div>Goldman</div>
              <div>Sachs</div>
            </div>
          </div>

          {/* Investment Banking Division */}
          <div 
            className="text-right text-gray-600"
            data-pptx-type="text"
            data-pptx-id="division"
          >
            <p className="text-sm tracking-wide">INVESTMENT BANKING</p>
            <p className="text-sm tracking-wide">DIVISION</p>
          </div>
        </div>

        {/* Top Separator Line */}
        <div className="border-t border-gray-400" data-pptx-type="shape" data-pptx-id="top-line"></div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col justify-start pt-12">
        <h1 
          className="text-6xl font-light text-gray-900 mb-12"
          data-pptx-type="text"
          data-pptx-id="project-name"
        >
          Project Raven
        </h1>

        <h2 
          className="text-5xl font-light text-blue-400 mb-16"
          data-pptx-type="text"
          data-pptx-id="subtitle"
        >
          Discussion Materials
        </h2>

        <div className="space-y-2">
          <p 
            className="text-xl font-bold text-gray-900"
            data-pptx-type="text"
            data-pptx-id="company-name"
          >
            Goldman Sachs & Co. LLC
          </p>
          <p 
            className="text-xl text-gray-900"
            data-pptx-type="text"
            data-pptx-id="date"
          >
            August 13, 2019
          </p>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="mt-auto">
        {/* Bottom Separator Line */}
        <div className="border-t border-gray-400 mb-4" data-pptx-type="shape" data-pptx-id="bottom-line"></div>

        {/* Disclaimer */}
        <div 
          className="text-[9px] text-gray-600 leading-relaxed"
          data-pptx-type="text"
          data-pptx-id="disclaimer"
        >
          <p>
            Goldman Sachs does not provide accounting, tax, or legal advice. Notwithstanding anything in this document to the contrary, and except as required to enable
            compliance with applicable securities law, you (and each of your employees, representatives, and other agents) may disclose to any and all persons the US federal
            income and state tax treatment and tax structure of the transaction and all materials of any kind (including tax opinions and other tax analyses) that are provided to
            you relating to such tax treatment and tax structure, without Goldman Sachs imposing any limitation of any kind.
          </p>
        </div>
      </div>
    </div>
  );
}

export function TitleSlideTemplate1() {
  return (
    <div className="w-full min-h-screen bg-white flex flex-col justify-between p-16">
      {/* Top Confidential Notice */}
      <div className="text-center mb-12">
        <p 
          className="text-sm tracking-wider text-gray-800"
          data-pptx-type="text"
          data-pptx-id="confidential-notice"
        >
          - CONFIDENTIAL -
        </p>
      </div>

      {/* Centerview Partners Logo - Top Right */}
      <div className="absolute top-16 right-16">
        <div 
          className="text-right"
          data-pptx-type="text"
          data-pptx-id="logo"
        >
          <h2 className="text-2xl tracking-wide text-gray-800">
            CENTER<span className="border-l-2 border-gray-800 ml-1 pl-1">VIEW</span> PARTNERS
          </h2>
        </div>
      </div>

      {/* Main Content - Centered */}
      <div className="flex-1 flex flex-col items-center justify-center text-center max-w-4xl mx-auto">
        <h1 
          className="text-5xl font-light text-gray-900 mb-12"
          data-pptx-type="text"
          data-pptx-id="project-name"
        >
          Project Canine
        </h1>

        <div className="space-y-3">
          <p 
            className="text-2xl text-gray-800"
            data-pptx-type="text"
            data-pptx-id="subtitle-1"
          >
            Confidential Discussion Materials for the
          </p>
          <p 
            className="text-2xl text-gray-800"
            data-pptx-type="text"
            data-pptx-id="subtitle-2"
          >
            Special Committee of the Board of Directors of Collie
          </p>
          <p 
            className="text-xl text-gray-700 mt-8"
            data-pptx-type="text"
            data-pptx-id="date"
          >
            June 20, 2013
          </p>
        </div>
      </div>

      {/* Bottom Spacer */}
      <div className="h-16"></div>
    </div>
  );
}

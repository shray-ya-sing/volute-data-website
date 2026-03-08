export function TitleSlideTemplate3() {
  return (
    <div className="w-full min-h-screen bg-white p-16 flex flex-col">
      {/* Top Right Confidential Notice */}
      <div className="flex justify-end mb-16">
        <p 
          className="text-red-700 font-bold text-sm tracking-wider"
          data-pptx-type="text"
          data-pptx-id="confidential-notice"
        >
          STRICTLY CONFIDENTIAL
        </p>
      </div>

      {/* Oracle Logo and Content Section */}
      <div className="flex-1 flex flex-col justify-center">
        {/* Oracle Logo Box */}
        <div className="mb-12">
          <div 
            className="bg-red-600 text-white p-8 inline-flex items-center justify-center"
            style={{ width: '180px', height: '180px' }}
            data-pptx-type="shape"
            data-pptx-id="oracle-logo"
          >
            <span className="text-3xl font-light tracking-wider">ORACLE</span>
          </div>
        </div>

        {/* Horizontal Line with Moelis */}
        <div className="flex items-center mb-12" data-pptx-type="shape" data-pptx-id="divider-line">
          <div className="flex-1 border-t border-gray-400"></div>
          <div className="ml-8 text-gray-600 text-sm tracking-widest" data-pptx-type="text" data-pptx-id="moelis">
            MOELIS & COMPANY
          </div>
        </div>

        {/* Main Title */}
        <h1 
          className="text-3xl text-gray-700 mb-24 max-w-3xl"
          data-pptx-type="text"
          data-pptx-id="title"
        >
          Presentation to the Special Committee of the Board of Directors
        </h1>

        {/* Date */}
        <p 
          className="text-xl text-gray-600"
          data-pptx-type="text"
          data-pptx-id="date"
        >
          April 19, 2016
        </p>
      </div>
    </div>
  );
}

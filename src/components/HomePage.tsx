import { Button } from "./ui/button"
import { Play } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-black">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold tracking-tight">Volute</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center py-16 sm:py-24">
          <h2 className="text-4xl sm:text-6xl font-bold tracking-tight mb-6">
            The data provider for the AI stack.
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-16">
            Volute delivers clean, thoughtfully aggregated data for every layer of the AI ecosystem in a simple and delightful user experience. 
          </p>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-16">
            Differentiated from other data providers by thoughtful, human validated accuracy and thoroughness. 
          </p>
          


          {/* Demo Video Placeholder */}
          <div className="relative max-w-5xl mx-auto mb-12">
            <div className="aspect-video bg-black rounded-lg shadow-2xl flex items-center justify-center group cursor-pointer hover:shadow-3xl transition-shadow duration-300">
              <div className="text-center">
                <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center mb-4 mx-auto group-hover:bg-opacity-30 transition-all duration-300">
                  <Play className="w-8 h-8 text-white ml-1" />
                </div>
                <p className="text-white text-lg font-medium">Watch Demo</p>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <Button 
            size="lg" 
            className="bg-black text-white hover:bg-gray-800 px-8 py-3 text-lg font-medium rounded-lg transition-colors duration-200"
          >
            Request Early Access
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
            <div className="flex items-center">
              <span className="text-lg font-bold">Volute</span>
            </div>
            <div className="flex space-x-8 text-sm text-gray-600">
              <a href="#" className="hover:text-black transition-colors duration-200">
                Terms of Service
              </a>
              <a href="#" className="hover:text-black transition-colors duration-200">
                Privacy Policy
              </a>
              <a href="#" className="hover:text-black transition-colors duration-200">
                Contact
              </a>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-100 text-center text-sm text-gray-500">
            <p>&copy; 2025 Volute. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
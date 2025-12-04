import { Button } from "./ui/button"
import { Play } from "lucide-react"

export default function HomePage() {
  return (
    <div className="h-screen bg-white text-black flex flex-col">


      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex-grow flex flex-col justify-center">
        {/* Hero Section */}
        <div className="text-center w-full">
          <h2 className="text-6xl sm:text-7xl font-bold tracking-tight mb-6">
            Volute is the financial data aggregation agent.
          </h2>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
                      Volute delivers clean, thoughtfully aggregated data in a simple and delightful user experience. 
                    </p>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
                      Differentiated from other data providers by thoughtful, human validated accuracy and thoroughness. 
                    </p>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
                      <a href="mailto:sshreya1000@gmail.com" className="text-blue-600 underline hover:no-underline">Contact for early access</a>
                    </p>
                    {/* Demo Video */}
                    <div className="relative max-w-5xl mx-auto mt-12 mb-12">
            <div className="aspect-video bg-black rounded-lg shadow-2xl overflow-hidden">
              <video 
                className="w-full h-full"
                src="https://pfrilrbw7rdy0sj5.public.blob.vercel-storage.com/demo.mp4" 
                autoPlay 
                loop 
                muted 
                playsInline
              >
                Your browser does not support the video tag.
              </video>
            </div>
          </div>


          </div>
        </main>
    </div>
  )
}
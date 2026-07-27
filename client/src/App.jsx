import { useEffect } from 'react'
import { Code2 } from 'lucide-react'

function App() {
  useEffect(() => {
    console.log('UpDown by ADC Developers - Client Ready')
    
    // Test backend connection
    fetch('http://localhost:5000/')
      .then(res => res.json())
      .then(data => console.log('Backend:', data))
      .catch(err => console.warn('Backend not connected:', err))
  }, [])

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-adc-dark text-white py-6 px-6 shadow-lg">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Code2 className="w-10 h-10 text-adc-indigo" />
            <div>
              <h1 className="text-3xl font-bold">UpDown</h1>
              <p className="text-sm text-adc-muted">by ADC Developers</p>
            </div>
          </div>
          <div className="text-sm">
            <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
            Backend: Connected
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="container mx-auto mt-8 px-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">🚀 Development Environment Ready!</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-adc-dark/5 rounded-lg">
              <span className="font-medium text-gray-700">Frontend</span>
              <a 
                href="http://localhost:5173" 
                target="_blank"
                className="px-4 py-2 bg-adc-indigo text-white rounded hover:bg-adc-indigo/90 transition"
              >
                http://localhost:5173
              </a>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-adc-dark/5 rounded-lg">
              <span className="font-medium text-gray-700">Backend API</span>
              <a 
                href="http://localhost:5000" 
                target="_blank"
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
              >
                http://localhost:5000
              </a>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-adc-dark/5 rounded-lg">
              <span className="font-medium text-gray-700">GitHub</span>
              <a 
                href="https://github.com/adc-developers-team/UpDown" 
                target="_blank"
                className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-800 transition"
              >
                View Repo
              </a>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-gray-600 text-sm">
              <strong>Next Step:</strong> Build Auth UI + Socket.io Real-time chat
            </p>
          </div>
        </div>
        
        {/* Tech Stack Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-adc-indigo font-bold text-xl">React</div>
            <div className="text-xs text-gray-500">v18.2.0</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-green-600 font-bold text-xl">Node.js</div>
            <div className="text-xs text-gray-500">Express + Socket.io</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-blue-500 font-bold text-xl">MongoDB</div>
            <div className="text-xs text-gray-500">Atlas Free</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-teal-500 font-bold text-xl">Tailwind</div>
            <div className="text-xs text-gray-500">CSS Framework</div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App

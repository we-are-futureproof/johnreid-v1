import './index.css'
import MapComponent from './components/Map'

function App() {
  // We'll use loading state in the future when we implement data loading indicators
  // const [isLoading, setIsLoading] = useState(false)
  const isLoading = false

  return (
    <div className="app-container h-screen w-screen flex flex-col">
      <header className="bg-indigo-700 text-white p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">UMC Property Analysis Map</h1>
          <div className="flex space-x-4">
            <a 
              href="#about" 
              className="hover:text-indigo-200 transition-colors"
            >
              About
            </a>
            <a 
              href="#help" 
              className="hover:text-indigo-200 transition-colors"
            >
              Help
            </a>
          </div>
        </div>
      </header>

      <main className="flex-grow relative">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 z-50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-700 mx-auto mb-4"></div>
              <p className="text-indigo-700">Loading map data...</p>
            </div>
          </div>
        ) : null}
        
        <MapComponent />
      </main>

      <footer className="bg-gray-100 p-4 border-t border-gray-200">
        <div className="container mx-auto text-center text-gray-600 text-sm">
          <p>© {new Date().getFullYear()} UMC Property Analysis Map. All rights reserved.</p>
          <p className="mt-1">Data sources: HUD, United Methodist Church</p>
        </div>
      </footer>
    </div>
  )
}

export default App

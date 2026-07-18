import { useState } from 'react'
import './App.css'

function App() {
  const [file, setFile] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleFileChange = (e) => {
    setFile(e.target.files[0])
    setResult(null)
    setError(null)
  }

  const handleUpload = async () => {
    if (!file) {
      setError('Please choose a file first.')
      return
    }

    setLoading(true)
    setError(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('http://127.0.0.1:8000/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const data = await response.json()
      setResult(data)
    } catch (err) {
      setError('Something went wrong. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-container">
      <h1>🛡️ SOCMate AI</h1>
      <p className="subtitle">Upload a security log file to get started</p>

      <div className="upload-box">
        <input type="file" onChange={handleFileChange} />
        <button onClick={handleUpload} disabled={loading}>
          {loading ? 'Uploading...' : 'Upload & Analyze'}
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {result && (
        <div className="result-box">
          <h3>Result</h3>
          <p><strong>Filename:</strong> {result.filename}</p>
          <p><strong>Size:</strong> {result.size} bytes</p>
          <p><strong>Preview:</strong></p>
          <pre>{result.preview}</pre>
        </div>
      )}
    </div>
  )
}

export default App
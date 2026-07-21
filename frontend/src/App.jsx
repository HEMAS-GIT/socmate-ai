import { useState, useEffect } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import './App.css'

const API_BASE = 'https://socmate-ai-backend.onrender.com'

const SEVERITY_COLORS = {
  Low: '#86efac',
  Medium: '#fcd34d',
  High: '#fdba74',
  Critical: '#fca5a5',
  Unknown: '#cbd5e1',
}

function App() {
  const [activeTab, setActiveTab] = useState('landing')
  const [files, setFiles] = useState([])
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [history, setHistory] = useState([])

  const [selectedIncident, setSelectedIncident] = useState(null)
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [backendOnline, setBackendOnline] = useState(true)

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_BASE}/history`)
      const data = await res.json()
      setHistory(data.history)
      setBackendOnline(true)
    } catch (err) {
      setBackendOnline(false)
    }
  }

  useEffect(() => {
    fetchHistory()
    const interval = setInterval(fetchHistory, 8000)
    return () => clearInterval(interval)
  }, [])

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files))
    setResults([])
    setError(null)
  }

  const handleUpload = async () => {
    if (files.length === 0) {
      setError('Please choose at least one file.')
      return
    }

    setLoading(true)
    setError(null)

    const formData = new FormData()
    files.forEach((f) => formData.append('files', f))

    try {
      const response = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) throw new Error('Upload failed')

      const data = await response.json()
      setResults(data.results)
      fetchHistory()
    } catch (err) {
      setError('Something went wrong. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  const openCopilot = (incident) => {
    setSelectedIncident(incident)
    setChatMessages([
      { role: 'assistant', text: `I'm ready to discuss this ${incident.analysis.severity.toLowerCase()} severity incident: "${incident.analysis.summary}" Ask me anything about it.` }
    ])
    setActiveTab('copilot')
  }

  const sendChatMessage = async () => {
    if (!chatInput.trim() || !selectedIncident) return

    const question = chatInput.trim()
    setChatMessages((prev) => [...prev, { role: 'user', text: question }])
    setChatInput('')
    setChatLoading(true)

    try {
      const res = await fetch(`${API_BASE}/chat/${selectedIncident.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      })
      const data = await res.json()
      setChatMessages((prev) => [...prev, { role: 'assistant', text: data.answer }])
    } catch (err) {
      setChatMessages((prev) => [...prev, { role: 'assistant', text: 'Something went wrong reaching the AI.' }])
    } finally {
      setChatLoading(false)
    }
  }

  const severityToNumber = { Low: 1, Medium: 2, High: 3, Critical: 4, Unknown: 0 }

  const attackTimelineData = [...history]
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    .map((h, index) => ({
      name: `#${index + 1}`,
      time: new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      severity: severityToNumber[h.analysis.severity] ?? 0,
      filename: h.filename,
    }))

  const severityCounts = ['Low', 'Medium', 'High', 'Critical', 'Unknown'].map((sev) => ({
    name: sev,
    value: history.filter((h) => h.analysis.severity === sev).length,
  })).filter((s) => s.value > 0)

  const highCriticalCount = history.filter(
    h => h.analysis.severity === 'Critical' || h.analysis.severity === 'High'
  ).length

  const NAV_ITEMS = [
    { id: 'landing', label: 'Home', icon: '🏠' },
    { id: 'upload', label: 'Log Analysis', icon: '📤' },
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'copilot', label: 'AI Copilot', icon: '🤖' },
  ]

  if (activeTab === 'landing') {
    return (
      <div className="landing">
        <div className="landing-hero">
          <div className="landing-text">
            <div className="landing-badge">🛡️ AI-Powered Security Assistant</div>
            <h1>
              SOCMate AI<br />
              <span className="highlight">AI-Powered</span><br />
              Security<br />
              Operations
            </h1>
            <p className="landing-subtitle">
              Upload security logs and get instant AI-powered threat analysis,
              severity classification, and an interactive copilot to help you respond faster.
            </p>
            <button className="landing-cta" onClick={() => setActiveTab("dashboard")}>
              Launch Dashboard →
            </button>
          </div>

          <div className="orbit-container">
            <div className="orbit-ring orbit-ring-1"></div>
            <div className="orbit-ring orbit-ring-2"></div>
            <div className="orbit-ring orbit-ring-3"></div>
            <div className="orbit-core">🛡️</div>
            <div className="orbit-node node-1">🧠 AI Engine</div>
            <div className="orbit-node node-2">📊 Live Analysis</div>
            <div className="orbit-node node-3">🔒 Threat Detection</div>
          </div>
        </div>

        <div className="landing-features">
          <div
  className="landing-feature-card"
  onClick={() => setActiveTab("upload")}
  style={{ cursor: "pointer" }}
>
            <div className="feature-icon">📤</div>
            <h3>Log Analysis</h3>
            <p>Upload one or more security logs and get AI-generated severity ratings and summaries in seconds.</p>
          </div>
          <div
  className="landing-feature-card"
  onClick={() => setActiveTab("dashboard")}
  style={{ cursor: "pointer" }}
>
            <div className="feature-icon">📊</div>
            <h3>Live Dashboard</h3>
            <p>See a real-time breakdown of every incident you've analyzed, with charts and a timeline.</p>
          </div>
          <div
  className="landing-feature-card"
  onClick={() => setActiveTab("copilot")}
  style={{ cursor: "pointer" }}
>
            <div className="feature-icon">🤖</div>
            <h3>AI Copilot</h3>
            <p>Ask follow-up questions about any incident and get context-aware answers from Gemini.</p>
          </div>
        </div>

        <p className="landing-footer">Built with FastAPI, React, and Google Gemini</p>
      </div>
    )
  }

  return (
    <div className="layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo-icon">🛡️</div>
          <div>
            <div className="logo-title">SOCMate AI</div>
            <div className="logo-subtitle">Security Assistant</div>
          </div>
        </div>

        <div className={`status-pill ${backendOnline ? 'online' : 'offline'}`}>
          <span className="status-dot"></span>
          {backendOnline ? 'Backend Online' : 'Backend Offline'}
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={activeTab === item.id ? 'active' : ''}
              onClick={() => setActiveTab(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          Built with FastAPI + Gemini + React
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content">
        <header className="topbar">
          <h2>
            {activeTab === 'upload' && 'Log Upload & AI Analysis'}
            {activeTab === 'dashboard' && 'Security Dashboard'}
            {activeTab === 'copilot' && 'AI Security Copilot'}
          </h2>
          <div className="topbar-stat">
            {history.length} logs analyzed
          </div>
        </header>

        {activeTab === 'upload' && (
          <>
            <div className="upload-box">
              <input type="file" multiple onChange={handleFileChange} />
              <button onClick={handleUpload} disabled={loading}>
                {loading ? 'Analyzing...' : 'Upload & Analyze'}
              </button>
            </div>

            {error && <p className="error">{error}</p>}

            {results.map((result) => (
              <div className="result-box" key={result.id}>
                <h3>{result.filename}</h3>
                <div className={`severity-badge severity-${result.analysis.severity.toLowerCase()}`}>
                  {result.analysis.severity} Severity
                </div>
                <p><strong>Summary:</strong> {result.analysis.summary}</p>
                <p><strong>Recommended Action:</strong> {result.analysis.recommended_action}</p>
                <button className="copilot-btn" onClick={() => openCopilot(result)}>💬 Ask Copilot about this</button>
              </div>
            ))}

            {results.length === 0 && !error && (
              <p className="empty-msg">Upload a log file to see AI-powered analysis here.</p>
            )}
          </>
        )}

        {activeTab === 'dashboard' && (
          <div className="dashboard">
            <div className="stat-row">
              <div className="stat-card">
                <span className="stat-number">{history.length}</span>
                <span className="stat-label">Total Logs Analyzed</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">{highCriticalCount}</span>
                <span className="stat-label">High / Critical Incidents</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">{history.length - highCriticalCount}</span>
                <span className="stat-label">Low / Medium Incidents</span>
              </div>
            </div>

            {attackTimelineData.length > 1 && (
              <div className="chart-box">
                <h3>Attack Timeline</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={attackTimelineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2d3548" />
                    <XAxis dataKey="time" stroke="#64748b" fontSize={12} />
                    <YAxis
                      stroke="#64748b"
                      fontSize={12}
                      ticks={[0, 1, 2, 3, 4]}
                      tickFormatter={(val) => ['Unknown', 'Low', 'Medium', 'High', 'Critical'][val]}
                    />
                    <Tooltip
                      formatter={(value, name, props) => [props.payload.filename, 'File']}
                      labelFormatter={(label) => `Time: ${label}`}
                    />
                    <Line type="monotone" dataKey="severity" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {severityCounts.length > 0 ? (
              <div className="chart-box">
                <h3>Severity Breakdown</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={severityCounts} dataKey="value" nameKey="name" outerRadius={90} label>
                      {severityCounts.map((entry, index) => (
                        <Cell key={index} fill={SEVERITY_COLORS[entry.name]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="empty-msg">No data yet — upload a log to see your dashboard.</p>
            )}

            {history.length > 0 && (
              <>
                <h3>Recent Activity</h3>
                <div className="timeline">
                  {[...history].reverse().slice(0, 10).map((h) => (
                    <div className="timeline-item" key={h.id}>
                      <div className={`severity-dot severity-${h.analysis.severity.toLowerCase()}`}></div>
                      <div>
                        <p className="timeline-title">{h.filename} — <span className={`severity-text severity-text-${h.analysis.severity.toLowerCase()}`}>{h.analysis.severity}</span></p>
                        <p className="timeline-summary">{h.analysis.summary}</p>
                        <button className="copilot-btn small" onClick={() => openCopilot(h)}>💬 Ask Copilot</button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'copilot' && (
          <div className="copilot-box">
            {!selectedIncident ? (
              <p className="empty-msg">Select "Ask Copilot" on an incident from Upload or Dashboard to start a conversation.</p>
            ) : (
              <>
                <p className="copilot-context">Discussing: <strong>{selectedIncident.filename}</strong></p>
                <div className="chat-window">
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`chat-bubble ${msg.role}`}>{msg.text}</div>
                  ))}
                  {chatLoading && <div className="chat-bubble assistant">Thinking...</div>}
                </div>
                <div className="chat-input-row">
                  <input
                    type="text"
                    value={chatInput}
                    placeholder="Ask a question about this incident..."
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                  />
                  <button onClick={sendChatMessage} disabled={chatLoading}>Send</button>
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

export default App
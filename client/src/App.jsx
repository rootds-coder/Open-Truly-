import { useState, useEffect, useRef, useCallback } from 'react'
import { io } from 'socket.io-client'
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import './App.css'

function App() {
  // ── Authentication States ──────────────────────────────────
  const [authenticated, setAuthenticated] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [config, setConfig] = useState({ hasApiKey: false, hasChats: false, hasClosestPerson: false })

  // ── UI Control States ──────────────────────────────────────
  const [showApiKeyForm, setShowApiKeyForm] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [contactSearch, setContactSearch] = useState('')
  const [uploadStatus, setUploadStatus] = useState({ text: '', type: '' })
  const [uploading, setUploading] = useState(false)

  // ── Live Baileys Socket / DB States ────────────────────────
  const [qrUrl, setQrUrl] = useState(null)
  const [ready, setReady] = useState(false)
  const [messages, setMessages] = useState([])
  const [contacts, setContacts] = useState([])
  const [chats, setChats] = useState([])
  const [sysLogs, setSysLogs] = useState([])
  const [donAwayMode, setDonAwayMode] = useState(false)
  const [selectedJid, setSelectedJid] = useState(null)

  // ── Admin Analytics States ──────────────────────────────────
  const [analytics, setAnalytics] = useState({ messagesToday: 0, apiCallsToday: 0, totalContacts: 0, totalUsers: 0, users: [] })

  const socketRef = useRef(null)

  // ── Auth checks ────────────────────────────────────────────
  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/status')
      const data = await res.json()
      setAuthenticated(data.authenticated || false)
      setCheckingAuth(false)
      if (data.authenticated) {
        checkConfig()
      }
    } catch {
      setAuthenticated(false)
      setCheckingAuth(false)
    }
  }, [])

  // Check system configuration status
  const checkConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/config', { credentials: 'include' })
      if (res.status === 401) {
        setAuthenticated(false)
        return
      }
      const data = await res.json()
      setConfig({ 
        hasApiKey: !!data.hasApiKey, 
        hasChats: !!data.hasChats, 
        hasClosestPerson: !!data.hasClosestPerson 
      })
      
      // Auto-toggle key form if missing
      setShowApiKeyForm(!data.hasApiKey)

      // Fetch Don Away status
      fetch('/api/don-away', { credentials: 'include' })
        .then(r => r.json())
        .then(d => setDonAwayMode(!!d.enabled))
        .catch(() => {})
    } catch {
      setShowApiKeyForm(true)
      setConfig({ hasApiKey: false, hasChats: false, hasClosestPerson: false })
    }
  }, [])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  // ── Database Data Loaders ─────────────────────────────────
  const loadChats = useCallback(async () => {
    try {
      const res = await fetch('/api/chats', { credentials: 'include' })
      if (res.status === 401) {
        setAuthenticated(false)
        return
      }
      const data = await res.json()
      setChats(data.files || [])
    } catch {
      setChats([])
    }
  }, [])

  const loadContacts = useCallback(async () => {
    try {
      const res = await fetch('/api/contacts', { credentials: 'include' })
      if (res.status === 401) {
        setAuthenticated(false)
        return
      }
      const data = await res.json()
      setContacts(Array.isArray(data) ? data : [])
    } catch {
      setContacts([])
    }
  }, [])

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/analytics', { credentials: 'include' })
      const data = await res.json()
      if (res.ok && data.ok) {
        setAnalytics(data)
      }
    } catch {
      console.error('Analytics fetch error')
    }
  }, [])

  useEffect(() => {
    if (authenticated) {
      loadChats()
      loadContacts()
      fetchAnalytics()
    }
  }, [authenticated, loadChats, loadContacts, fetchAnalytics])

  // ── Socket.io Listeners ───────────────────────────────────
  useEffect(() => {
    const socket = io()
    socketRef.current = socket

    socket.on('qr', (data) => {
      setReady(false)
      setQrUrl(data?.dataUrl || null)
    })

    socket.on('ready', () => {
      setQrUrl(null)
      setReady(true)
    })

    socket.on('message', (msg) => {
      setMessages(prev => [msg, ...prev].slice(0, 100))
      loadContacts()
    })

    socket.on('donAwayStatus', ({ enabled }) => {
      setDonAwayMode(!!enabled)
    })

    socket.on('syslog', (item) => {
      setSysLogs(prev => [item, ...prev].slice(0, 150))
    })

    return () => socket.disconnect()
  }, [loadContacts])

  // ── Actions Handlers ───────────────────────────────────────
  const toggleDonAway = async () => {
    const next = !donAwayMode
    setDonAwayMode(next)
    try {
      await fetch('/api/don-away', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: next }),
        credentials: 'include'
      })
    } catch {
      setDonAwayMode(!next)
    }
  }

  const saveApiKey = async () => {
    const key = apiKeyInput.trim()
    if (!key) return
    try {
      const res = await fetch('/api/set-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key }),
        credentials: 'include'
      })
      if (res.status === 401) {
        setAuthenticated(false)
        return
      }
      const data = await res.json()
      if (data.ok) {
        setApiKeyInput('')
        setShowApiKeyForm(false)
        checkConfig()
      } else {
        alert(data.error || 'Failed to save key')
      }
    } catch {
      alert('Failed to save key')
    }
  }

  const clearApiKey = async () => {
    try {
      const res = await fetch('/api/clear-key', { method: 'POST', credentials: 'include' })
      if (res.status === 401) {
        setAuthenticated(false)
        return
      }
      setShowApiKeyForm(true)
      checkConfig()
    } catch {
      alert('Failed to clear key')
    }
  }

  const updateContactMode = async (jid, mode) => {
    try {
      const res = await fetch('/api/contacts/mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jid, mode }),
        credentials: 'include'
      })
      if (res.status === 401) {
        setAuthenticated(false)
        return
      }
      const data = await res.json()
      if (data.ok) {
        loadContacts()
      } else {
        alert(data.error || 'Failed to update mode')
      }
    } catch {
      alert('Failed to update mode')
    }
  }

  const deleteContact = async (jid, e) => {
    e.stopPropagation()
    if (!confirm('Delete this contact and their history from MongoDB?')) return
    try {
      const res = await fetch(`/api/contacts/${encodeURIComponent(jid)}`, { 
        method: 'DELETE', 
        credentials: 'include' 
      })
      if (res.ok) {
        setContacts(prev => prev.filter(c => c.jid !== jid))
      }
    } catch {
      console.error('Delete contact failed')
    }
  }

  const deleteAllContacts = async () => {
    if (!confirm('⚠️ Are you sure you want to DELETE ALL contacts and their chat history from MongoDB? This cannot be undone!')) return;
    try {
      const res = await fetch('/api/contacts', { method: 'DELETE', credentials: 'include' });
      if (res.ok) {
        setContacts([]);
        setMessages([]);
        setSelectedJid(null);
        fetchAnalytics();
        alert('All contacts and chat logs have been purged.');
      } else {
        alert('Failed to delete all contacts.');
      }
    } catch {
      alert('Failed to delete all contacts.');
    }
  };

  const clearAllHistory = async () => {
    if (!confirm('⚠️ Are you sure you want to CLEAR ALL message logs from MongoDB?')) return;
    try {
      const res = await fetch('/api/history', { method: 'DELETE', credentials: 'include' });
      if (res.ok) {
        setMessages([]);
        alert('Message history cleared.');
      } else {
        alert('Failed to clear message history.');
      }
    } catch {
      alert('Failed to clear message history.');
    }
  };

  const deleteChat = async (filename, e) => {
    e.stopPropagation()
    if (!confirm(`Delete trained reference context file "${filename}"?`)) return
    try {
      const res = await fetch(`/api/chats/${encodeURIComponent(filename)}`, { 
        method: 'DELETE', 
        credentials: 'include' 
      })
      if (res.ok) {
        setChats(prev => prev.filter(c => c.filename !== filename))
      }
    } catch {
      console.error('Delete chat failed')
    }
  }

  const handleUploadChat = async (e) => {
    e.preventDefault()
    const form = e.target
    const fileInput = form.querySelector('input[type="file"]')
    const asClosest = form.querySelector('input[name="asClosest"]')?.checked ?? false
    if (!fileInput?.files?.[0]) {
      setUploadStatus({ text: 'Choose a .txt chat export file first.', type: 'error' })
      return
    }
    
    const fd = new FormData()
    fd.append('chat', fileInput.files[0])
    fd.append('asClosest', asClosest ? 'true' : 'false')
    
    setUploading(true)
    setUploadStatus({ text: 'Uploading reference context…', type: '' })
    
    try {
      const res = await fetch('/api/upload-chat', { 
        method: 'POST', 
        body: fd, 
        credentials: 'include' 
      })
      if (res.status === 401) {
        setAuthenticated(false)
        return
      }
      const data = await res.json()
      if (data.ok) {
        setUploadStatus({ text: data.message || 'Reference file uploaded and trained.', type: 'success' })
        form.reset()
        loadChats()
        checkConfig()
      } else {
        setUploadStatus({ text: data.error || 'Upload failed.', type: 'error' })
      }
    } catch {
      setUploadStatus({ text: 'Upload failed.', type: 'error' })
    }
    setUploading(false)
  }

  // Loading indicator overlay
  if (checkingAuth) {
    return (
      <div className="tc-loading">
        <div className="tc-spinner" />
        <span>Authenticating workspace session...</span>
      </div>
    )
  }

  return authenticated ? (
    <Dashboard 
      setAuthenticated={setAuthenticated}
      ready={ready}
      qrUrl={qrUrl}
      contacts={contacts}
      contactSearch={contactSearch}
      setContactSearch={setContactSearch}
      chats={chats}
      loadChats={loadChats}
      uploading={uploading}
      uploadStatus={uploadStatus}
      handleUploadChat={handleUploadChat}
      deleteChat={deleteChat}
      messages={messages}
      sysLogs={sysLogs}
      setSysLogs={setSysLogs}
      analytics={analytics}
      fetchAnalytics={fetchAnalytics}
      donAwayMode={donAwayMode}
      toggleDonAway={toggleDonAway}
      config={config}
      checkConfig={checkConfig}
      showApiKeyForm={showApiKeyForm}
      setShowApiKeyForm={setShowApiKeyForm}
      apiKeyInput={apiKeyInput}
      setApiKeyInput={setApiKeyInput}
      saveApiKey={saveApiKey}
      clearApiKey={clearApiKey}
      deleteContact={deleteContact}
      deleteAllContacts={deleteAllContacts}
      clearAllHistory={clearAllHistory}
      updateContactMode={updateContactMode}
      selectedJid={selectedJid}
      setSelectedJid={setSelectedJid}
    />
  ) : (
    <Landing 
      authenticated={authenticated} 
      setAuthenticated={setAuthenticated} 
    />
  )
}

export default App
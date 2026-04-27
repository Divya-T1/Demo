import { useState, useRef } from 'react'

const API = 'http://localhost:8000'

type Tab = 'upload' | 'chat' | 'sandbox'
type Message = { role: 'user' | 'assistant'; text: string }
type SandboxResult = { score: number; feedback: string; improved: string }

export default function App() {
  const [tab, setTab] = useState<Tab>('upload')
  const [docs, setDocs] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [chatLoading, setChatLoading] = useState(false)
  const [sandboxResult, setSandboxResult] = useState<SandboxResult | null>(null)
  const [sandboxLoading, setSandboxLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function upload(file: File) {
    setUploading(true)
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await fetch(`${API}/upload`, { method: 'POST', body: form })
      const data = await res.json()
      setDocs(prev => [...prev.filter(d => d !== data.name), data.name])
    } finally {
      setUploading(false)
    }
  }

  async function chat(question: string) {
    const history = messages.map(m => ({ role: m.role, content: m.text }))
    setMessages(prev => [...prev, { role: 'user', text: question }])
    setChatLoading(true)
    try {
      const res = await fetch(`${API}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, history }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', text: data.answer }])
    } finally {
      setChatLoading(false)
    }
  }

  async function runSandbox(question: string) {
    setSandboxLoading(true)
    try {
      const res = await fetch(`${API}/sandbox`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      })
      setSandboxResult(await res.json())
    } finally {
      setSandboxLoading(false)
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'upload', label: '📄 Upload' },
    { id: 'chat', label: '💬 Chat' },
    { id: 'sandbox', label: '🧪 Sandbox' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 shadow-sm">
        <h1 className="text-xl font-bold text-indigo-600">AI Learning Assistant</h1>
        <p className="text-sm text-gray-400">PDF Research Assistant & Prompt Sandbox</p>
      </header>

      <main className="max-w-3xl mx-auto p-6">
        <div className="flex gap-2 mb-6 border-b pb-4">
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === id
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'upload' && (
          <div className="space-y-4">
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault()
                const f = e.dataTransfer.files[0]
                if (f?.type === 'application/pdf') upload(f)
              }}
              className="border-2 border-dashed border-gray-300 rounded-xl p-16 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-all"
            >
              <input
                ref={fileRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) upload(f) }}
              />
              <p className="text-4xl mb-3">📄</p>
              <p className="text-gray-500 font-medium">
                {uploading ? 'Processing...' : 'Drop a PDF here or click to upload'}
              </p>
            </div>

            {docs.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600">Uploaded documents</p>
                {docs.map(name => (
                  <div key={name} className="flex items-center gap-2 bg-white border rounded-lg px-4 py-3 text-sm">
                    <span className="text-green-500">✓</span>
                    <span className="text-gray-700">{name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'chat' && (
          <ChatSection messages={messages} loading={chatLoading} onSend={chat} />
        )}

        {tab === 'sandbox' && (
          <SandboxSection result={sandboxResult} loading={sandboxLoading} onSubmit={runSandbox} />
        )}
      </main>
    </div>
  )
}

function ChatSection({
  messages,
  loading,
  onSend,
}: {
  messages: Message[]
  loading: boolean
  onSend: (q: string) => void
}) {
  const [input, setInput] = useState('')

  function send() {
    const q = input.trim()
    if (!q) return
    setInput('')
    onSend(q)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="min-h-72 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-gray-400 pt-16 text-sm">
            Upload a document first, then ask questions about it
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-sm'
                  : 'bg-white border text-gray-800 rounded-bl-sm'
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border px-4 py-2 rounded-2xl rounded-bl-sm text-sm text-gray-400">
              Thinking...
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Ask about your documents..."
          className="flex-1 border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
        <button
          onClick={send}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          Send
        </button>
      </div>
    </div>
  )
}

function SandboxSection({
  result,
  loading,
  onSubmit,
}: {
  result: SandboxResult | null
  loading: boolean
  onSubmit: (q: string) => void
}) {
  const [input, setInput] = useState('')

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Test your prompts and get scored on clarity, specificity, and relevance.
      </p>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && input.trim() && onSubmit(input.trim())}
          placeholder="Enter a question to score..."
          className="flex-1 border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
        <button
          onClick={() => input.trim() && onSubmit(input.trim())}
          disabled={loading}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Scoring...' : 'Score'}
        </button>
      </div>

      {result && (
        <div className="bg-white border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-4">
            <span className="text-4xl font-bold text-indigo-600">
              {result.score}
              <span className="text-xl text-gray-400">/10</span>
            </span>
            <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
              <div
                className="bg-indigo-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${result.score * 10}%` }}
              />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Feedback</p>
            <p className="text-sm text-gray-700">{result.feedback}</p>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Try this instead</p>
            <p className="text-sm text-indigo-700 bg-indigo-50 rounded-lg px-3 py-2 italic">
              {result.improved}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

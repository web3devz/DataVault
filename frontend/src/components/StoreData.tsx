import { useState, useRef } from 'react'
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit'
import { Transaction } from '@mysten/sui/transactions'
import { PACKAGE_ID, txUrl } from '../config/network'

const enc = (s: string) => Array.from(new TextEncoder().encode(s))
const OPENAI_KEY = import.meta.env.VITE_OPENAI_KEY as string

interface Props { onSuccess?: () => void }

async function sha256(input: string | ArrayBuffer): Promise<string> {
  const data = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

interface AIClassification {
  label: string
  sensitivity: 'Public' | 'Internal' | 'Confidential' | 'Restricted'
  description: string
  tags: string[]
}

type InputMode = 'text' | 'file'

export default function StoreData({ onSuccess }: Props) {
  const account = useCurrentAccount()
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction()
  const fileRef = useRef<HTMLInputElement>(null)

  const [mode, setMode] = useState<InputMode>('text')
  const [label, setLabel] = useState('')
  const [textInput, setTextInput] = useState('')
  const [fileName, setFileName] = useState('')
  const [hash, setHash] = useState('')
  const [encRef, setEncRef] = useState('')
  const [hashing, setHashing] = useState(false)
  const [txDigest, setTxDigest] = useState('')
  const [error, setError] = useState('')

  // AI classification
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState<AIClassification | null>(null)

  const handleTextChange = async (val: string) => {
    setTextInput(val)
    setAiResult(null)
    if (!val.trim()) { setHash(''); return }
    setHashing(true)
    setHash(await sha256(val))
    setHashing(false)
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setAiResult(null)
    if (!label) setLabel(file.name)
    setHashing(true)
    const buf = await file.arrayBuffer()
    setHash(await sha256(buf))
    setHashing(false)
  }

  const classifyWithAI = async () => {
    const content = mode === 'text' ? textInput : `File: ${fileName}`
    if (!content.trim()) return
    setAiLoading(true)
    try {
      const preview = content.slice(0, 500)
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_KEY}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{
            role: 'user',
            content: `Classify this data for a privacy vault. Analyze the content and respond ONLY with valid JSON:
Content preview: "${preview}"
${mode === 'file' ? `Filename: ${fileName}` : ''}

{
  "label": "<short descriptive name for this data, max 5 words>",
  "sensitivity": "<one of: Public, Internal, Confidential, Restricted>",
  "description": "<1 sentence explaining what this data is and why it should be protected>",
  "tags": ["<tag1>", "<tag2>", "<tag3>"]
}`
          }],
          temperature: 0.3,
          max_tokens: 200,
        }),
      })
      const d = await res.json()
      const raw = d.choices?.[0]?.message?.content?.trim() ?? ''
      const parsed: AIClassification = JSON.parse(raw.replace(/```json|```/g, '').trim())
      setAiResult(parsed)
      if (!label) setLabel(parsed.label)
    } catch { /* silent */ }
    finally { setAiLoading(false) }
  }

  const sensitivityColor = (s: string) => {
    if (s === 'Restricted') return '#f87171'
    if (s === 'Confidential') return '#fb923c'
    if (s === 'Internal') return '#facc15'
    return '#4ade80'
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!account || !label || !hash) return
    setError(''); setTxDigest('')
    const tx = new Transaction()
    tx.moveCall({
      target: `${PACKAGE_ID}::vault::store`,
      arguments: [
        tx.pure.vector('u8', enc(label)),
        tx.pure.vector('u8', enc(hash)),
        tx.pure.vector('u8', enc(encRef)),
      ],
    })
    signAndExecute({ transaction: tx }, {
      onSuccess: (r) => {
        setTxDigest(r.digest)
        setLabel(''); setTextInput(''); setFileName(''); setHash(''); setEncRef(''); setAiResult(null)
        onSuccess?.()
      },
      onError: (e) => setError(e.message),
    })
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2>Store Data Reference</h2>
        <p className="card-desc">Anchor a cryptographic proof on-chain. Your actual data never leaves your device.</p>
      </div>

      <div className="mode-tabs">
        <button type="button" className={mode === 'text' ? 'active' : ''} onClick={() => { setMode('text'); setHash(''); setFileName(''); setAiResult(null) }}>
          ✏️ Type / Paste
        </button>
        <button type="button" className={mode === 'file' ? 'active' : ''} onClick={() => { setMode('file'); setHash(''); setTextInput(''); setAiResult(null) }}>
          📁 Upload File
        </button>
      </div>

      <form onSubmit={submit} className="form" style={{ marginTop: '1.25rem' }}>
        {mode === 'text' ? (
          <label>
            Your Data
            <textarea value={textInput} onChange={e => handleTextChange(e.target.value)}
              placeholder="Type or paste any text, JSON, document content..." rows={4} />
          </label>
        ) : (
          <div className="file-drop-zone" onClick={() => fileRef.current?.click()}>
            <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={handleFile} />
            {fileName ? (
              <div className="file-selected"><span className="file-icon">📄</span><span>{fileName}</span></div>
            ) : (
              <>
                <div style={{ fontSize: '2.5rem', marginBottom: '.5rem' }}>📁</div>
                <div style={{ fontWeight: 600, marginBottom: '.25rem' }}>Click to select a file</div>
                <div style={{ fontSize: '.85rem', color: 'var(--muted)' }}>Hash computed locally — file never uploaded</div>
              </>
            )}
          </div>
        )}

        {/* AI Classify button */}
        {(textInput.trim() || fileName) && (
          <button type="button" className="btn-ai-classify" onClick={classifyWithAI} disabled={aiLoading}>
            {aiLoading ? '⟳ Classifying...' : '🤖 AI Classify & Suggest Label'}
          </button>
        )}

        {/* AI Result */}
        {aiResult && (
          <div className="ai-classify-result">
            <div className="ai-classify-header">
              <span className="ai-classify-badge">🤖 AI Classification</span>
              <span className="sensitivity-badge" style={{ background: `${sensitivityColor(aiResult.sensitivity)}20`, color: sensitivityColor(aiResult.sensitivity), border: `1px solid ${sensitivityColor(aiResult.sensitivity)}40` }}>
                {aiResult.sensitivity}
              </span>
            </div>
            <p className="ai-classify-desc">{aiResult.description}</p>
            <div className="ai-classify-tags">
              {aiResult.tags.map(t => <span key={t} className="ai-tag">{t}</span>)}
            </div>
            <button type="button" className="btn-use-label" onClick={() => setLabel(aiResult.label)}>
              Use suggested label: "{aiResult.label}"
            </button>
          </div>
        )}

        <label>
          Label *
          <input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Medical Records 2025" required />
        </label>

        {/* Hash display */}
        <label>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>SHA-256 Fingerprint</span>
            {hashing && <span style={{ fontSize: '.72rem', color: 'var(--accent)' }}>⟳ computing...</span>}
            {hash && !hashing && <span style={{ fontSize: '.72rem', color: 'var(--success)' }}>✅ ready to store</span>}
          </div>
          <div className="hash-display">
            {hash || <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>Auto-generated from your data above</span>}
          </div>
        </label>

        <label>
          Storage Reference <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span>
          <input value={encRef} onChange={e => setEncRef(e.target.value)} placeholder="ipfs://... or encrypted storage URL" />
        </label>

        {error && <p className="error">⚠ {error}</p>}
        <button type="submit" className="btn-primary" disabled={isPending || !hash || !label}>
          {isPending ? 'Storing...' : '🔐 Store Proof On-Chain'}
        </button>
      </form>

      {txDigest && (
        <div className="tx-success">
          <span>✅ Proof stored on-chain</span>
          <a href={txUrl(txDigest)} target="_blank" rel="noreferrer">View tx ↗</a>
        </div>
      )}
    </div>
  )
}

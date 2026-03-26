import { useState, useRef } from 'react'
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit'
import { Transaction } from '@mysten/sui/transactions'
import { PACKAGE_ID, txUrl } from '../config/network'

const enc = (s: string) => Array.from(new TextEncoder().encode(s))

interface Props { onSuccess?: () => void }

async function sha256(input: string | ArrayBuffer): Promise<string> {
  const data = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
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

  const handleTextChange = async (val: string) => {
    setTextInput(val)
    if (!val.trim()) { setHash(''); return }
    setHashing(true)
    setHash(await sha256(val))
    setHashing(false)
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    if (!label) setLabel(file.name)
    setHashing(true)
    const buf = await file.arrayBuffer()
    setHash(await sha256(buf))
    setHashing(false)
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
        setLabel(''); setTextInput(''); setFileName(''); setHash(''); setEncRef('')
        onSuccess?.()
      },
      onError: (e) => setError(e.message),
    })
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2>Store Data Reference</h2>
        <p className="card-desc">Anchor proof of your data on-chain. Your actual data never leaves your device.</p>
      </div>

      {/* Mode switcher */}
      <div className="mode-tabs">
        <button type="button" className={mode === 'text' ? 'active' : ''} onClick={() => { setMode('text'); setHash(''); setFileName('') }}>
          ✏️ Type / Paste
        </button>
        <button type="button" className={mode === 'file' ? 'active' : ''} onClick={() => { setMode('file'); setHash(''); setTextInput('') }}>
          📁 Upload File
        </button>
      </div>

      <form onSubmit={submit} className="form" style={{ marginTop: '1.25rem' }}>
        <label>
          Label *
          <input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Passport Scan, Contract v2, Medical Report" required />
        </label>

        {mode === 'text' ? (
          <label>
            Your Data
            <textarea
              value={textInput}
              onChange={e => handleTextChange(e.target.value)}
              placeholder="Type or paste any text, JSON, document content... it will be hashed automatically."
              rows={4}
            />
          </label>
        ) : (
          <div className="file-drop-zone" onClick={() => fileRef.current?.click()}>
            <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={handleFile} />
            {fileName ? (
              <div className="file-selected">
                <span className="file-icon">📄</span>
                <span>{fileName}</span>
              </div>
            ) : (
              <>
                <div style={{ fontSize: '2.5rem', marginBottom: '.5rem' }}>📁</div>
                <div style={{ fontWeight: 600, marginBottom: '.25rem' }}>Click to select a file</div>
                <div style={{ fontSize: '.85rem', color: 'var(--muted)' }}>Any file type — hash is computed locally</div>
              </>
            )}
          </div>
        )}

        {/* Hash display — auto-populated, read-only */}
        <label>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>SHA-256 Fingerprint</span>
            {hashing && <span style={{ fontSize: '.72rem', color: 'var(--accent)' }}>⟳ computing...</span>}
            {hash && !hashing && <span style={{ fontSize: '.72rem', color: 'var(--success)' }}>✅ ready</span>}
          </div>
          <div className="hash-display">
            {hash || <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>Will appear automatically after you enter data above</span>}
          </div>
        </label>

        <label>
          Storage Reference <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span>
          <input value={encRef} onChange={e => setEncRef(e.target.value)} placeholder="e.g. ipfs://Qm... or https://drive.google.com/..." />
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

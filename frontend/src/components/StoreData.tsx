import { useState } from 'react'
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit'
import { Transaction } from '@mysten/sui/transactions'
import { PACKAGE_ID, txUrl } from '../config/network'

const enc = (s: string) => Array.from(new TextEncoder().encode(s))

interface Props { onSuccess?: () => void }

async function hashText(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export default function StoreData({ onSuccess }: Props) {
  const account = useCurrentAccount()
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction()
  const [label, setLabel] = useState('')
  const [dataHash, setDataHash] = useState('')
  const [rawData, setRawData] = useState('')
  const [encRef, setEncRef] = useState('')
  const [txDigest, setTxDigest] = useState('')
  const [error, setError] = useState('')
  const [hashing, setHashing] = useState(false)

  const autoHash = async () => {
    if (!rawData.trim()) return
    setHashing(true)
    const h = await hashText(rawData)
    setDataHash(h)
    setHashing(false)
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!account || !label || !dataHash) return
    setError(''); setTxDigest('')
    const tx = new Transaction()
    tx.moveCall({
      target: `${PACKAGE_ID}::vault::store`,
      arguments: [
        tx.pure.vector('u8', enc(label)),
        tx.pure.vector('u8', enc(dataHash)),
        tx.pure.vector('u8', enc(encRef)),
      ],
    })
    signAndExecute({ transaction: tx }, {
      onSuccess: (r) => { setTxDigest(r.digest); setLabel(''); setDataHash(''); setRawData(''); setEncRef(''); onSuccess?.() },
      onError: (e) => setError(e.message),
    })
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2>Store Data Reference</h2>
        <p className="card-desc">Anchor a cryptographic proof of your data on-chain. The actual data stays private.</p>
      </div>
      <form onSubmit={submit} className="form">
        <label>
          Label *
          <input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Medical Records 2025" required />
        </label>
        <label>
          Raw Data (optional — auto-hash)
          <div style={{ position: 'relative' }}>
            <textarea value={rawData} onChange={e => setRawData(e.target.value)} placeholder="Paste your data here to auto-generate SHA-256 hash..." rows={3} style={{ width: '100%', paddingRight: '6rem' }} />
            <button type="button" className="btn-hash" onClick={autoHash} disabled={hashing || !rawData.trim()} style={{ position: 'absolute', right: '.5rem', top: '.5rem', transform: 'none' }}>
              {hashing ? '...' : '# Hash'}
            </button>
          </div>
        </label>
        <label>
          SHA-256 Hash *
          <input value={dataHash} onChange={e => setDataHash(e.target.value)} placeholder="sha256 hash of your data" required style={{ fontFamily: "'SF Mono','Fira Code',monospace", fontSize: '.82rem' }} />
        </label>
        <label>
          Encrypted Reference (optional)
          <input value={encRef} onChange={e => setEncRef(e.target.value)} placeholder="e.g. ipfs://... or encrypted storage URL" />
        </label>
        {error && <p className="error">⚠ {error}</p>}
        <button type="submit" className="btn-primary" disabled={isPending}>
          {isPending ? 'Storing...' : '🔐 Store on Chain'}
        </button>
      </form>
      {txDigest && (
        <div className="tx-success">
          <span>✅ Data reference stored</span>
          <a href={txUrl(txDigest)} target="_blank" rel="noreferrer">View tx ↗</a>
        </div>
      )}
    </div>
  )
}

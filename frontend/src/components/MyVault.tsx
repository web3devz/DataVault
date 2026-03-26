import { useState, useRef } from 'react'
import { useCurrentAccount, useSuiClientQuery, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit'
import { Transaction } from '@mysten/sui/transactions'
import { PACKAGE_ID, txUrl } from '../config/network'

interface VaultFields { label: string; data_hash: string; encrypted_ref: string; created_epoch: string; owner: string }

async function sha256(input: string | ArrayBuffer): Promise<string> {
  const data = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

type ObjResponse = { data?: { objectId?: string; content?: unknown } | null }

function VaultCard({ obj, onDelete, deletingId }: {
  obj: ObjResponse
  onDelete: (id: string) => void
  deletingId: string
}) {
  const content = obj.data?.content as { dataType: string; fields: unknown } | undefined
  if (content?.dataType !== 'moveObject') return null
  const f = content.fields as VaultFields
  const objId = obj.data?.objectId ?? ''

  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [verifyMode, setVerifyMode] = useState(false)
  const [verifyText, setVerifyText] = useState('')
  const [verifyFile, setVerifyFile] = useState('')
  const [verifyResult, setVerifyResult] = useState<'match' | 'mismatch' | null>(null)
  const [verifying, setVerifying] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const copyHash = () => { navigator.clipboard.writeText(f.data_hash); setCopied(true); setTimeout(() => setCopied(false), 2000) }

  // Share: generate a verification URL with hash + label embedded
  const shareProof = () => {
    const params = new URLSearchParams({ hash: f.data_hash, label: f.label, owner: f.owner })
    const url = `${window.location.origin}${window.location.pathname}?verify=${encodeURIComponent(params.toString())}`
    navigator.clipboard.writeText(url)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 3000)
  }

  const verifyInput = async (text: string) => {
    if (!text.trim()) { setVerifyResult(null); return }
    setVerifying(true)
    const h = await sha256(text)
    setVerifyResult(h === f.data_hash ? 'match' : 'mismatch')
    setVerifying(false)
  }

  const verifyFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setVerifyFile(file.name)
    setVerifying(true)
    const h = await sha256(await file.arrayBuffer())
    setVerifyResult(h === f.data_hash ? 'match' : 'mismatch')
    setVerifying(false)
  }

  return (
    <div className="vault-card-full">
      <div className="vault-card-header" onClick={() => setExpanded(!expanded)}>
        <div className="vault-card-title">
          <span className="vault-lock-icon">🔒</span>
          <span className="vault-label-text">{f.label}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
          <span className="vault-epoch-badge">Epoch {f.created_epoch}</span>
          <span className="vault-chevron">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div className="vault-card-body">
          {/* Hash */}
          <div className="vault-detail-section">
            <div className="vault-detail-label">SHA-256 Fingerprint</div>
            <div className="vault-hash-row">
              <div className="vault-hash-full">{f.data_hash}</div>
              <button className="btn-copy" onClick={copyHash} title="Copy hash">{copied ? '✅' : '📋'}</button>
            </div>
          </div>

          {/* Storage ref */}
          {f.encrypted_ref && (
            <div className="vault-detail-section">
              <div className="vault-detail-label">Storage Reference</div>
              <div className="vault-ref-value">
                {f.encrypted_ref.startsWith('http') || f.encrypted_ref.startsWith('ipfs')
                  ? <a href={f.encrypted_ref} target="_blank" rel="noreferrer">{f.encrypted_ref}</a>
                  : f.encrypted_ref}
              </div>
            </div>
          )}

          {/* Owner */}
          <div className="vault-detail-section">
            <div className="vault-detail-label">Owner</div>
            <div className="vault-mono">{f.owner.slice(0, 10)}...{f.owner.slice(-8)}</div>
          </div>

          {/* Action buttons */}
          <div className="vault-action-row">
            <button className="btn-share" onClick={shareProof}>
              {linkCopied ? '✅ Link Copied!' : '🔗 Share Proof Link'}
            </button>
            <button className="btn-verify-toggle" onClick={() => { setVerifyMode(!verifyMode); setVerifyResult(null); setVerifyText(''); setVerifyFile('') }}>
              {verifyMode ? '✕ Close' : '🔍 Verify Data'}
            </button>
            <button className="btn-danger" onClick={() => onDelete(objId)} disabled={deletingId === objId}>
              {deletingId === objId ? 'Deleting...' : '🗑'}
            </button>
          </div>

          {/* Share hint */}
          {linkCopied && (
            <div className="share-hint">
              📋 Verification link copied — anyone with this link can verify data authenticity without seeing the original content.
            </div>
          )}

          {/* Verify panel */}
          {verifyMode && (
            <div className="verify-panel">
              <p className="verify-hint">Paste the original data or upload the file to verify it matches this on-chain proof.</p>
              <textarea value={verifyText} onChange={e => { setVerifyText(e.target.value); verifyInput(e.target.value) }}
                placeholder="Paste original text here..." rows={3} className="verify-textarea" />
              <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', marginTop: '.5rem' }}>
                <span style={{ fontSize: '.82rem', color: 'var(--muted)' }}>or</span>
                <button type="button" className="btn-upload-verify" onClick={() => fileRef.current?.click()}>
                  📁 {verifyFile || 'Upload File'}
                </button>
                <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={verifyFileInput} />
              </div>
              {verifying && <div className="verify-status checking">⟳ Computing hash...</div>}
              {!verifying && verifyResult === 'match' && <div className="verify-status match">✅ Authentic — hash matches the on-chain proof</div>}
              {!verifying && verifyResult === 'mismatch' && <div className="verify-status mismatch">❌ Mismatch — data has been modified or is different</div>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Public verifier — looks up proofs by wallet address
function PublicVerifier() {
  const client = useSuiClient()
  const [addr, setAddr] = useState('')
  const [proofs, setProofs] = useState<VaultFields[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const lookup = async () => {
    if (!addr.trim()) return
    setLoading(true); setError(''); setProofs([])
    try {
      const res = await client.getOwnedObjects({
        owner: addr.trim(),
        filter: { StructType: `${PACKAGE_ID}::vault::VaultEntry` },
        options: { showContent: true },
      })
      const items = res.data.map(obj => {
        const c = obj.data?.content as { dataType: string; fields: unknown } | undefined
        if (c?.dataType !== 'moveObject') return null
        return c.fields as VaultFields
      }).filter(Boolean) as VaultFields[]
      setProofs(items)
      if (items.length === 0) setError('No vault entries found for this address.')
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Lookup failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2>Verify by Address</h2>
        <p className="card-desc">Look up any wallet's public data proofs and verify authenticity.</p>
      </div>
      <div className="search-row">
        <input value={addr} onChange={e => setAddr(e.target.value)} placeholder="0x wallet address" onKeyDown={e => e.key === 'Enter' && lookup()} />
        <button className="btn-primary" onClick={lookup} disabled={loading}>{loading ? 'Looking up...' : 'Look Up'}</button>
      </div>
      {error && <p className="error" style={{ marginTop: '.75rem' }}>⚠ {error}</p>}
      {proofs.length > 0 && (
        <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
          {proofs.map((p, i) => (
            <div key={i} className="public-proof-card">
              <div className="public-proof-label">🔒 {p.label}</div>
              <div className="vault-hash-full" style={{ marginTop: '.5rem' }}>{p.data_hash}</div>
              {p.encrypted_ref && <div style={{ fontSize: '.78rem', color: 'var(--muted)', marginTop: '.4rem' }}>📎 {p.encrypted_ref}</div>}
              <div style={{ fontSize: '.72rem', color: 'var(--muted)', marginTop: '.4rem' }}>Epoch {p.created_epoch}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function MyVault() {
  const account = useCurrentAccount()
  const { mutate: signAndExecute } = useSignAndExecuteTransaction()
  const [deletingId, setDeletingId] = useState('')
  const [txDigest, setTxDigest] = useState('')
  const [activeSection, setActiveSection] = useState<'mine' | 'verify'>('mine')

  const { data, isPending, error, refetch } = useSuiClientQuery('getOwnedObjects', {
    owner: account?.address ?? '',
    filter: { StructType: `${PACKAGE_ID}::vault::VaultEntry` },
    options: { showContent: true },
  })

  const deleteEntry = (objId: string) => {
    setDeletingId(objId)
    const tx = new Transaction()
    tx.moveCall({ target: `${PACKAGE_ID}::vault::delete_entry`, arguments: [tx.object(objId)] })
    signAndExecute({ transaction: tx }, {
      onSuccess: (r) => { setTxDigest(r.digest); refetch(); setDeletingId('') },
      onError: () => setDeletingId(''),
    })
  }

  const entries = data?.data ?? []

  return (
    <div>
      {/* Section toggle */}
      <div className="mode-tabs" style={{ marginBottom: '1.5rem' }}>
        <button type="button" className={activeSection === 'mine' ? 'active' : ''} onClick={() => setActiveSection('mine')}>
          🔐 My Vault {entries.length > 0 && `(${entries.length})`}
        </button>
        <button type="button" className={activeSection === 'verify' ? 'active' : ''} onClick={() => setActiveSection('verify')}>
          🔍 Verify by Address
        </button>
      </div>

      {activeSection === 'mine' && (
        <>
          {isPending && <div className="status-box">Loading your vault...</div>}
          {error && <div className="status-box">Error: {error.message}</div>}
          {txDigest && (
            <div className="tx-success" style={{ marginBottom: '1rem' }}>
              <span>✅ Entry deleted</span>
              <a href={txUrl(txDigest)} target="_blank" rel="noreferrer">View tx ↗</a>
            </div>
          )}
          {!isPending && entries.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">🔐</div>
              <h3>Vault is empty</h3>
              <p>Store your first data reference to get started.</p>
            </div>
          )}
          {!isPending && entries.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
              {entries.map((obj) => (
                <VaultCard key={obj.data?.objectId} obj={obj as ObjResponse} onDelete={deleteEntry} deletingId={deletingId} />
              ))}
            </div>
          )}
        </>
      )}

      {activeSection === 'verify' && <PublicVerifier />}
    </div>
  )
}

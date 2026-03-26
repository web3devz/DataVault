import { useState } from 'react'
import { useCurrentAccount, useSuiClientQuery, useSignAndExecuteTransaction } from '@mysten/dapp-kit'
import { Transaction } from '@mysten/sui/transactions'
import { PACKAGE_ID, txUrl } from '../config/network'

interface VaultFields { label: string; data_hash: string; encrypted_ref: string; created_epoch: string; owner: string }

export default function MyVault() {
  const account = useCurrentAccount()
  const { mutate: signAndExecute } = useSignAndExecuteTransaction()
  const [deletingId, setDeletingId] = useState('')
  const [txDigest, setTxDigest] = useState('')
  const [copied, setCopied] = useState('')

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
      onSuccess: (r) => { setTxDigest(r.digest); refetch() },
      onError: () => setDeletingId(''),
    })
  }

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash)
    setCopied(hash)
    setTimeout(() => setCopied(''), 2000)
  }

  if (isPending) return <div className="status-box">Loading your vault...</div>
  if (error) return <div className="status-box">Error: {error.message}</div>

  const entries = data?.data ?? []

  if (entries.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🔐</div>
        <h3>Vault is empty</h3>
        <p>Store your first data reference to get started.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h2>My Vault</h2>
          <p className="card-desc">{entries.length} data reference{entries.length !== 1 ? 's' : ''} stored on-chain</p>
        </div>
      </div>
      {txDigest && (
        <div className="tx-success" style={{ marginBottom: '1rem' }}>
          <span>✅ Entry deleted</span>
          <a href={txUrl(txDigest)} target="_blank" rel="noreferrer">View tx ↗</a>
        </div>
      )}
      <div className="vault-grid">
        {entries.map((obj) => {
          const content = obj.data?.content
          if (content?.dataType !== 'moveObject') return null
          const f = content.fields as unknown as VaultFields
          const objId = obj.data?.objectId ?? ''
          return (
            <div key={objId} className="vault-card">
              <div className="vault-label">🔒 {f.label}</div>
              <div className="vault-hash" onClick={() => copyHash(f.data_hash)} style={{ cursor: 'pointer' }} title="Click to copy">
                {copied === f.data_hash ? '✅ Copied!' : f.data_hash.slice(0, 32) + '...'}
              </div>
              {f.encrypted_ref && (
                <div style={{ fontSize: '.78rem', color: 'var(--muted)', marginBottom: '.75rem', wordBreak: 'break-all' }}>
                  📎 {f.encrypted_ref.slice(0, 40)}{f.encrypted_ref.length > 40 ? '...' : ''}
                </div>
              )}
              <div className="vault-meta">
                <span>Epoch {f.created_epoch}</span>
                <button className="btn-danger" onClick={() => deleteEntry(objId)} disabled={deletingId === objId}>
                  {deletingId === objId ? 'Deleting...' : '🗑 Delete'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

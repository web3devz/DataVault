import { useState } from 'react'
import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit'
import MyVault from './components/MyVault'
import StoreData from './components/StoreData'
import './App.css'

type Tab = 'vault' | 'store'

export default function App() {
  const account = useCurrentAccount()
  const [tab, setTab] = useState<Tab>('vault')

  return (
    <div className="app">
      <header className="header">
        <div className="header-brand">
          <span className="logo">🔐</span>
          <div>
            <div className="brand-name">DataVault</div>
            <div className="brand-sub">Decentralized Data Ownership</div>
          </div>
        </div>
        <ConnectButton />
      </header>

      {!account ? (
        <>
          <section className="hero">
            <div className="hero-badge">Privacy First</div>
            <h1>Own Your Data,<br />On-Chain</h1>
            <p className="hero-sub">
              Store cryptographic proofs of your data on-chain. Prove ownership
              without revealing contents. Your data, your control — forever.
            </p>
            <div className="hero-features">
              <div className="feature"><span>🔒</span><span>Private</span></div>
              <div className="feature"><span>✅</span><span>Verifiable</span></div>
              <div className="feature"><span>🌐</span><span>Immutable</span></div>
              <div className="feature"><span>🛡️</span><span>Sovereign</span></div>
            </div>
          </section>

          <div className="stats-bar">
            <div className="stat-item"><div className="stat-value">0</div><div className="stat-label">Data Exposed</div></div>
            <div className="stat-item"><div className="stat-value">100%</div><div className="stat-label">Ownership</div></div>
            <div className="stat-item"><div className="stat-value">∞</div><div className="stat-label">Entries</div></div>
            <div className="stat-item"><div className="stat-value">&lt;1s</div><div className="stat-label">Finality</div></div>
          </div>

          <section className="how-section">
            <div className="section-title">How DataVault Works</div>
            <p className="section-sub">Three steps to sovereign data ownership</p>
            <div className="steps-grid">
              <div className="step-card">
                <div className="step-num">01</div>
                <div className="step-icon">🔑</div>
                <h3>Hash Your Data</h3>
                <p>Generate a cryptographic hash of your file or data. The actual content stays off-chain and private.</p>
              </div>
              <div className="step-card">
                <div className="step-num">02</div>
                <div className="step-icon">⛓️</div>
                <h3>Anchor On-Chain</h3>
                <p>Store the hash and an optional encrypted reference on OneChain as an immutable proof of ownership.</p>
              </div>
              <div className="step-card">
                <div className="step-num">03</div>
                <div className="step-icon">✅</div>
                <h3>Prove Ownership</h3>
                <p>Anyone can verify your data ownership by comparing hashes — without ever seeing the data itself.</p>
              </div>
            </div>
          </section>
        </>
      ) : (
        <div className="dashboard">
          <div className="dashboard-inner">
            <nav className="tabs">
              {(['vault', 'store'] as Tab[]).map((t) => (
                <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
                  {t === 'vault' && '🔐 My Vault'}
                  {t === 'store' && '➕ Store Data'}
                </button>
              ))}
            </nav>
            <main>
              {tab === 'vault' && <MyVault />}
              {tab === 'store' && <StoreData onSuccess={() => setTab('vault')} />}
            </main>
          </div>
        </div>
      )}

      <footer className="footer">
        <span>DataVault · OneChain Testnet</span>
        <a href="https://onescan.cc/testnet" target="_blank" rel="noreferrer">Explorer ↗</a>
      </footer>
    </div>
  )
}

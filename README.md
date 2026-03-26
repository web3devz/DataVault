# DataVault 🔐

**Decentralized Data Ownership & Privacy Layer on OneChain**

DataVault enables users to securely prove ownership of their data without ever exposing the actual content. By storing cryptographic proofs on-chain and keeping raw data private, it delivers a powerful privacy-first infrastructure for the decentralized web.

## 🌐 Overview

In today’s digital world, data ownership is often compromised by centralized platforms. DataVault solves this by giving users full control over their data using blockchain technology.

Instead of uploading sensitive files to centralized servers, DataVault allows users to generate cryptographic proofs (SHA-256 hashes) directly in the browser and store them on-chain. This ensures:

* **Privacy** → your actual data never leaves your device
* **Ownership** → immutable proof stored on blockchain
* **Verification** → anyone can verify authenticity without accessing the data

## ✨ Key Features

* **On-Chain Proof Storage**
  Securely store SHA-256 hashes of files or data on OneChain.

* **Client-Side Hashing**
  Data is hashed locally in the browser before any interaction with the blockchain, ensuring zero data exposure.

* **Privacy-First Architecture**
  Only cryptographic proofs are stored on-chain — raw data remains completely private.

* **Optional Decentralized Storage**
  Integrate with IPFS or similar systems to store encrypted file references.

* **Ownership Control**
  Users can manage and delete entries they own.

* **Trustless Verification**
  Anyone can verify data authenticity by comparing hashes, without seeing the original content.

## ⚙️ How It Works

1. User selects or inputs data in the frontend
2. Data is hashed locally using SHA-256 (in-browser)
3. The generated hash is sent to the smart contract
4. The hash is stored immutably on OneChain
5. (Optional) Encrypted data is uploaded to IPFS or other storage
6. Later, users can verify ownership by matching hashes

## 📦 Deployed Contract

* **Package ID:**
  [`0x44ee8f5787aff3c7cd1f794eb31c4aedc291bf1d831183bb3eadd8742e656b2a`](https://onescan.cc/testnet/packageDetail?packageId=0x44ee8f5787aff3c7cd1f794eb31c4aedc291bf1d831183bb3eadd8742e656b2a)

* **Network:** OneChain Testnet

## 🛠 Tech Stack

**Smart Contract**

* Move (OneChain)

**Frontend**

* React
* TypeScript
* Vite
* @mysten/dapp-kit

**Storage (Optional)**

* IPFS / Decentralized storage solutions

## 🔍 Use Cases

* **Proof of Ownership**
  Prove you created or owned a file at a specific time

* **Document Verification**
  Validate certificates, contracts, or legal documents

* **Intellectual Property Protection**
  Secure proof for creative work (designs, code, research)

* **Data Integrity Checks**
  Ensure data has not been altered over time

## 🚀 Why DataVault Stands Out

* **Privacy by Design** — No raw data is ever exposed
* **Fully Decentralized** — No reliance on centralized storage
* **Lightweight & Efficient** — Only hashes stored on-chain
* **User-Controlled Data** — True ownership with deletion capability
* **Hackathon-Ready Innovation** — Practical, scalable Web3 use case

## 🔮 Future Improvements

* Multi-file batch uploads
* Advanced encryption integrations
* Cross-chain proof verification
* Timestamping with richer metadata
* UI/UX enhancements for non-technical users

## 📄 License

This project is licensed under the MIT License.

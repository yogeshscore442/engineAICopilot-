# 🛡️ QUANT: Post-Quantum Cryptography (PQC) Secure Communication Platform

<div align="center">

![Python](https://img.shields.io/badge/Python-3.10%20%7C%203.11%20%7C%203.12%20%7C%203.13-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-3.0%2B-000000?style=for-the-badge&logo=flask&logoColor=white)
![NIST PQC](https://img.shields.io/badge/NIST%20PQC-FIPS%20203%20%2F%20204%20%2F%20205-00C853?style=for-the-badge)
![liboqs](https://img.shields.io/badge/liboqs-Bundled%20C%20Binaries%20(x64)-00E5FF?style=for-the-badge)
![Security](https://img.shields.io/badge/Security-Quantum--Proof%20End--to--End-FF3D00?style=for-the-badge)

<p align="center">
  <b>A real-world, future-proof communication system designed to protect chats, emails, and files against both classical hackers and future Quantum Supercomputers.</b>
</p>

[Quick Story](#-1-minute-story-what-is-this-project-and-why-do-we-need-it) • [Classical vs Quantum](#-the-problem-why-today's-encryption-will-fail) • [How It Works](#-how-the-encryption-works-step-by-step) • [Why It Cannot Be Hacked](#-why-hackers-cannot-break-this-system) • [How to Run It](#-how-to-run-this-project-in-1-minute)

</div>

---

## 📖 1-Minute Story: What is This Project and Why Do We Need It?

Imagine you send a private message like *"My Secret Password"* to your friend. 

* **Today (Normal Internet):** Websites use **RSA or ECC encryption** (like locking your message inside a metal padlock). Normal computers today cannot pick that lock.
* **The Looming Danger (Quantum Computers):** Scientists are building **Quantum Computers**. Using a math formula called **Shor's Algorithm**, a Quantum Computer can snap that metal padlock open in just **a few seconds**!
* **The "Harvest Now, Decrypt Later" Threat:** Hackers and spy agencies are already **recording and storing your encrypted internet traffic today**. They can't read it now, but once they get a Quantum Computer in a few years, they will unlock and read all your saved private messages!

> 💡 **What this project does:**  
> **QUANT** replaces the old, breakable padlocks with **brand-new Post-Quantum Mathematical Locks (NIST Standards)**. Even the most powerful Quantum Computer in the world cannot break these locks!

---

## ⚔️ The Problem: Why Today's Encryption Will Fail

| Encryption Type | 🔴 Today's Standard (RSA / ECC) | 🟢 Our System: Post-Quantum (QUANT) |
| :--- | :--- | :--- |
| **How It Locks Data** | Simple prime numbers & math curves | **768-Dimensional Lattice Math (LWE)** *(A multi-dimensional maze with intentional random noise)* |
| **Can Quantum PCs Break It?** | ❌ **YES!** (Easily cracked by Shor's Algorithm) | ✅ **NO!** (Mathematically impossible for quantum PCs) |
| **Protected Against Future Theft?** | ❌ **NO** (Hackers can decrypt it in the future) | ✅ **YES** (Safe forever — even 50 years from now) |
| **Official Government Standard** | Becoming Obsolete by 2030 | **Official NIST Standards (FIPS 203, 204, 205)** |
| **Security Layer** | Single classic lock | **Hybrid Dual-Lock (X25519 + ML-KEM-768)** |

---

## 🧮 What Quantum Algorithms Are We Using?

We don't use fake simulations; our project runs **100% genuine Post-Quantum Algorithms** via the official **Open Quantum Safe (`liboqs`)** C-engine:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   QUANT ENCRYPTION SUITE                               │
├───────────────────────────────┬───────────────────────────────┬────────────────────────┤
│ 1. Key Exchange (Lock Maker)  │ 2. Digital Signature (Seal)   │ 3. Data Protection     │
├───────────────────────────────┼───────────────────────────────┼────────────────────────┤
│ • ML-KEM-768 (Kyber)          │ • ML-DSA-65 (Dilithium)       │ • AES-256-GCM          │
│   Creates the shared secret   │   Proves sender identity;     │   Encrypts message     │
│   between 2 users safely      │   prevents fake impersonation │   with 16-byte Auth Tag│
│ • Hybrid (X25519 + ML-KEM)    │ • SLH-DSA (SPHINCS+)          │ • ChaCha20-Poly1305    │
│   Double-layer protection     │   Stateless hash backup       │ • HKDF-SHA-384         │
└───────────────────────────────┴───────────────────────────────┴────────────────────────┘
```

---

## 🔄 How the Encryption Works: Step-by-Step

Here is the exact journey of a message sent from **Alice** to **Bob**:

```
[ Alice: "Hello Bob" ]
        │
        ▼ 1. HANDSHAKE (Creating the Secret Key)
  Alice & Bob exchange public keys using ML-KEM-768 + X25519.
  Both compute the EXACT SAME 256-bit Secret Key without sending the key over the internet!
        │
        ▼ 2. ENCRYPTION (Locking the Message)
  The message is encrypted using AES-256-GCM.
  Result: A scrambled ciphertext + a unique 16-byte Authentication Tag.
        │
        ▼ 3. QUANTUM SIGNATURE (Sealing the Package)
  Alice stamps the encrypted package with her ML-DSA-65 Private Key.
  This is Alice's unforgeable digital signature.
        │
        ▼ 4. NETWORK TRANSMISSION (Through the Internet / Server)
  The packet travels across the network.
  If a Hacker intercepts it, all they see is random garbage: [ "7xK9...a8f", Tag: "...", Sig: "..." ]
        │
        ▼ 5. VERIFICATION & DECRYPTION (Bob reads the message)
  1. Bob checks Alice's Quantum Signature ──► ✅ Confirmed: It is really from Alice!
  2. Bob checks the 16-byte Auth Tag ───────► ✅ Confirmed: Nobody changed any data!
  3. Bob decrypts with the Secret Key ─────► 💬 "Hello Bob"
```

---

## 🛡️ Why Hackers CANNOT Break This System

```
                      ┌─────────────────────────────────────────┐
                      │          🚨 HACKER ATTACK TESTS         │
                      └────────────────────┬────────────────────┘
                                           │
         ┌─────────────────────────────────┼─────────────────────────────────┐
         ▼                                 ▼                                 ▼
┌──────────────────┐             ┌──────────────────┐              ┌──────────────────┐
│ 1. Quantum PC    │             │ 2. Data Tamper   │              │ 3. Replay Attack │
│    Brute Force   │             │    Bit-Flip      │              │    Old Message   │
├──────────────────┤             ├──────────────────┤              ├──────────────────┤
│ ❌ BLOCKED!      │             │ ❌ BLOCKED!      │              │ ❌ BLOCKED!      │
│ Lattice math     │             │ AES-GCM Tag      │              │ Monotonic        │
│ requires 2^190   │             │ mismatch throws  │              │ Sequence check   │
│ quantum steps    │             │ instant Alert    │              │ rejects packet   │
└──────────────────┘             └──────────────────┘              └──────────────────┘
```

### 1. Quantum Computers Cannot Solve Lattice Math
Traditional RSA is based on factoring large numbers (which Quantum computers do easily). Our project uses **Lattice-Based Math (Module Learning with Errors)**. It is like finding a specific point in an invisible 768-dimensional grid filled with random mathematical fog — even a Quantum Computer would take billions of years to guess it.

### 2. Zero-Tolerance for Tampering (AEAD Auth Tag)
If a hacker intercepts the packet and changes even **one single letter or digit**, the 16-byte Authentication Tag will fail, and Bob's computer will **instantly drop the message and trigger a Tamper Alert**.

### 3. Replay Protection (Sequence Numbers)
If a hacker records a valid message like *"Send $100"* and tries to send it again later, the system detects that **Sequence Number #1 was already used** and blocks the duplicate immediately.

### 4. Man-in-the-Middle (MITM) Immunity
Every message has a Quantum Signature (**ML-DSA-65**). A hacker cannot pose as your friend because they don't have your friend's private key to sign the message.

### 5. Perfect Forward Secrecy (PFS)
A new secret key is created for every single chat session. Even if someone steals a device 5 years from now, **they still cannot decrypt past conversations**.

---

## 🚀 Key Features in This Platform

* 💬 **Real-Time Quantum Chat:** Live end-to-end encrypted messaging with online/offline user status.
* 📬 **Quantum Encrypted Email:** Asymmetric quantum-encrypted email with secure attachments.
* 📁 **Secure File Vault:** Client-side file encryption with SHA3-384 integrity checks.
* 🔬 **Live Cyber Attack Simulator:** Test live Payload Tampering, Replay Attacks, and MITM attacks on screen to see how the system blocks them in real-time.
* 📊 **Live Performance Benchmarks:** Real microsecond speed tests for KeyGen, Encrypt, Decrypt, and Sign across Classical vs Quantum algorithms.

---

## 💻 How to Run This Project in 1 Minute

### 📋 What you need:
* Windows 10/11 (or Linux/macOS)
* **Python** (version 3.10 to 3.13) installed with **"Add Python to PATH"** checked.

---

### ⚡ Step 1: Download the Project
```bash
git clone https://github.com/mxcro-exe/quant.git
cd quant
```
*(Or click the green **Code ➔ Download ZIP** button and extract it).*

### ⚡ Step 2: Install Requirements (1-Click)
Double-click:
```
INSTALL_DEPENDENCIES.bat
```
*(This automatically checks Python and installs all required libraries).*

### ⚡ Step 3: Start the Server (1-Click)
Double-click:
```
START_SERVER.bat
```
Now open your browser and go to:
👉 **`http://localhost:5000`**

---

### 📱 Connect from your Mobile Phone / Other Laptop
When you start the server, it shows your local Wi-Fi IP address:
```
[+] Local Access:  http://localhost:5000
[+] LAN/Wi-Fi IP:  http://192.168.1.15:5000 (Connect Phones & Other Laptops)
```
Open that IP address in your mobile browser to chat between two different devices securely!

---

## 🧪 Testing the Security Attacks Yourself

1. Open 2 browser windows (one as **Alice**, one as **Bob**).
2. Start a chat and click **Execute Handshake** to establish a quantum-safe channel.
3. **Test Tamper Defense:** Check the **"Simulate Payload Tampering"** box and click Send ➔ The system catches the flipped bits and shows an **Authentication Alert**!
4. **Test Replay Defense:** Check the **"Simulate Replay Attack"** box and click Send ➔ The system detects the duplicate sequence number and **drops the packet**!

---

## 📜 Standards & Compliance

This project strictly adheres to the official standards published by the **National Institute of Standards and Technology (NIST)**:
* **FIPS 203:** ML-KEM (Module-Lattice Key Encapsulation)
* **FIPS 204:** ML-DSA (Module-Lattice Digital Signatures)
* **FIPS 205:** SLH-DSA (Stateless Hash-Based Signatures)
* **RFC 5869:** HKDF Key Derivation Standard

---

<div align="center">
  <b>Built for Next-Generation Cybersecurity & Quantum-Resistant Defense.</b>
</div>#   y o g a y s h h h  
 #   q u a n t  
 
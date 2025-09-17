// src/App.jsx
import React, { useMemo, useState } from "react";
import * as bip39 from "bip39";
import { HDKey } from "micro-ed25519-hdkey";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { Keypair } from "@solana/web3.js";

function deriveSolanaKeypairFromSeed(seedHex, index) {
  const path = `m/44'/501'/${index}'/0'`; // Solana BIP44
  const child = HDKey.fromMasterSeed(seedHex).derive(path); // ed25519 HD
  if (!child.privateKey) throw new Error("No child private key");
  const kp = nacl.sign.keyPair.fromSeed(new Uint8Array(child.privateKey));
  const solKp = Keypair.fromSecretKey(new Uint8Array(kp.secretKey));
  return {
    path,
    publicKey: solKp.publicKey.toBase58(),
    secretKeyBase58: bs58.encode(solKp.secretKey),
  };
}

export default function App() {
  const [mnemonic, setMnemonic] = useState(bip39.generateMnemonic(128)); // 12 words
  const [wallets, setWallets] = useState([]);
  const [nextIndex, setNextIndex] = useState(0);

  const seedHex = useMemo(() => {
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    return Buffer.from(seed).toString("hex");
  }, [mnemonic]);

  function addWallet() {
    const w = deriveSolanaKeypairFromSeed(seedHex, nextIndex);
    setWallets((cur) => [...cur, { ...w, index: nextIndex, revealed: false }]);
    setNextIndex((i) => i + 1);
  }

  function clearWallets() {
    setWallets([]);
    setNextIndex(0);
  }

  function regenMnemonic(bits = 128) {
    setMnemonic(bip39.generateMnemonic(bits));
    setWallets([]);
    setNextIndex(0);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0b0c10", color: "#eee", fontFamily: "Inter, system-ui, sans-serif" }}>
      <main style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>
        <header style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: "#222", display: "grid", placeItems: "center" }}>⌂</div>
          <h2 style={{ margin: 0 }}>Kosh v1.3 (HD)</h2>
        </header>

        <section style={{ background: "#14161a", borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <h3 style={{ marginTop: 0 }}>Your Secret Phrase</h3>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", background: "#0f1115", padding: 12, borderRadius: 8 }}>
            {mnemonic.split(" ").map((w, i) => (
              <span key={i} style={{ background: "#1b1f26", padding: "6px 10px", borderRadius: 6, fontSize: 14 }}>{w}</span>
            ))}
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
            <button onClick={() => navigator.clipboard.writeText(mnemonic)} style={btn}>Copy</button>
            <button onClick={() => regenMnemonic(128)} style={btn}>New 12-word</button>
            <button onClick={() => regenMnemonic(256)} style={btn}>New 24-word</button>
          </div>
          <p style={{ color: "#aaa", marginTop: 8 }}>
            Never share this phrase; anyone with it can control all derived accounts. Store offline. [web:5]
          </p>
        </section>

        <section style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <h2 style={{ margin: 0 }}>Solana Wallet</h2>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={addWallet} style={btn}>Add Wallet</button>
            <button onClick={clearWallets} style={{ ...btn, background: "#7a1f1f" }}>Clear Wallets</button>
          </div>
        </section>

        <section style={{ display: "grid", gap: 16 }}>
          {wallets.map((w) => (
            <div key={w.index} style={{ background: "#14161a", borderRadius: 12, padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h3 style={{ margin: 0 }}>Wallet {w.index + 1}</h3>
                <button
                  onClick={() =>
                    setWallets((cur) =>
                      cur.map((x) => (x.index === w.index ? { ...x, revealed: !x.revealed } : x))
                    )
                  }
                  style={btn}
                >
                  {w.revealed ? "Hide" : "Reveal"}
                </button>
              </div>

              <div style={{ marginTop: 12, background: "#0f1115", borderRadius: 8, padding: 12 }}>
                <label style={label}>Public Key</label>
                <div style={mono}>{w.publicKey}</div>
                <div style={{ marginTop: 8 }}>
                  <button onClick={() => navigator.clipboard.writeText(w.publicKey)} style={btnSmall}>Copy</button>
                </div>
              </div>

              <div style={{ marginTop: 12, background: "#0f1115", borderRadius: 8, padding: 12 }}>
                <label style={label}>Private Key (Base58)</label>
                <div style={mono}>
                  {w.revealed ? w.secretKeyBase58 : "•••••••••••••••••••••••••••••••••••••••••"}
                </div>
                <div style={{ marginTop: 8 }}>
                  <button
                    onClick={() => w.revealed && navigator.clipboard.writeText(w.secretKeyBase58)}
                    style={btnSmall}
                    disabled={!w.revealed}
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div style={{ marginTop: 8, color: "#999", fontSize: 13 }}>
                Path: {w.path} (BIP44 Solana) [web:14]
              </div>
            </div>
          ))}
          {wallets.length === 0 && (
            <div style={{ color: "#9aa0a6" }}>
              Click Add Wallet to derive m/44'/501'/{nextIndex}'/0' from the current secret phrase. [web:3][web:14]
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

const btn = {
  background: "#1f6feb",
  color: "white",
  border: "none",
  padding: "8px 12px",
  borderRadius: 8,
  cursor: "pointer",
};

const btnSmall = { ...btn, padding: "6px 10px", fontSize: 13 };

const label = { color: "#9aa0a6", fontSize: 12, display: "block", marginBottom: 6 };

const mono = {
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  wordBreak: "break-all",
  color: "#e6edf3",
};

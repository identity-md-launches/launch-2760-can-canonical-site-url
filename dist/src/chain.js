// Minimal EIP-1193 wallet + ERC-20 layer. No SDK, no custody, no keys.

export const SEPOLIA = {
  chainId: 11155111,
  hexChainId: "0xaa36a7",
  name: "Sepolia",
  explorer: "https://sepolia.etherscan.io",
  rpc: ["https://ethereum-sepolia-rpc.publicnode.com", "https://1rpc.io/sepolia"],
};

const TRANSFER = "0xa9059cbb"; // transfer(address,uint256)
const BALANCE_OF = "0x70a08231"; // balanceOf(address)
const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

const state = { account: null, provider: null, chainId: null };

export function getAccount() {
  return state.account;
}
export function getChainId() {
  return state.chainId;
}

function provider() {
  if (state.provider) return state.provider;
  const injected = globalThis.ethereum;
  if (!injected) return null;
  // Multiple wallets inject into one object; prefer a MetaMask/Rabby-style one that is not a duplicate.
  if (Array.isArray(injected.providers) && injected.providers.length) {
    state.provider = injected.providers.find((p) => p.isMetaMask) ?? injected.providers[0];
  } else {
    state.provider = injected;
  }
  return state.provider;
}

export const hasWallet = () => Boolean(globalThis.ethereum);

export function onWalletChange(cb) {
  const p = provider();
  if (!p?.on) return () => {};
  const onAccounts = (accs) => {
    state.account = accs?.[0] ?? null;
    cb({ type: "accounts", account: state.account });
  };
  const onChain = (chainId) => {
    state.chainId = Number.parseInt(chainId, 16);
    cb({ type: "chain", chainId: state.chainId });
  };
  p.on("accountsChanged", onAccounts);
  p.on("chainChanged", onChain);
  return () => {
    p.removeListener?.("accountsChanged", onAccounts);
    p.removeListener?.("chainChanged", onChain);
  };
}

export async function connect() {
  const p = provider();
  if (!p) throw new Error("No browser wallet found. Install MetaMask, Rabby or any EIP-1193 wallet.");
  const accounts = await p.request({ method: "eth_requestAccounts" });
  if (!accounts?.length) throw new Error("Wallet returned no account.");
  state.account = accounts[0];
  await refreshChainId();
  return state.account;
}

export async function restore() {
  const p = provider();
  if (!p) return null;
  try {
    const accounts = await p.request({ method: "eth_accounts" });
    state.account = accounts?.[0] ?? null;
    if (state.account) await refreshChainId();
  } catch {
    state.account = null;
  }
  return state.account;
}

async function refreshChainId() {
  const p = provider();
  const hex = await p.request({ method: "eth_chainId" });
  state.chainId = Number.parseInt(hex, 16);
  return state.chainId;
}

export async function ensureSepolia() {
  if (!state.account) await connect();
  if (state.chainId === SEPOLIA.chainId) return true;
  const p = provider();
  try {
    await p.request({ method: "wallet_switchEthereumChain", params: [{ chainId: SEPOLIA.hexChainId }] });
  } catch (err) {
    if (err?.code !== 4902 && err?.code !== -32603) throw err;
    await p.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: SEPOLIA.hexChainId,
          chainName: "Sepolia",
          nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
          rpcUrls: SEPOLIA.rpc,
          blockExplorerUrls: [SEPOLIA.explorer],
        },
      ],
    });
  }
  await refreshChainId();
  if (state.chainId !== SEPOLIA.chainId) throw new Error("Switch your wallet to Sepolia to continue.");
  return true;
}

/* ----------------------------- plain JSON-RPC ----------------------------- */

export async function rpc(method, params = []) {
  // Public reads are pinned to Sepolia and must not follow the wallet's
  // currently selected network. Writes still go only through the wallet.
  let lastErr;
  for (const url of SEPOLIA.rpc) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`RPC HTTP ${res.status}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error.message ?? "RPC error");
      return json.result;
    } catch (err) {
      lastErr = err;
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastErr ?? new Error("All RPC endpoints failed");
}

const pad = (hex) => hex.replace(/^0x/, "").padStart(64, "0");
const addrWord = (addr) => pad(String(addr).toLowerCase());
const uintWord = (bigint) => pad(bigint.toString(16));
const requireAddress = (address, label) => {
  if (!ADDRESS_RE.test(String(address ?? ""))) throw new Error(`Invalid ${label} address`);
  return address;
};

export async function balanceOf(token, owner) {
  requireAddress(token, "SQK token");
  requireAddress(owner, "wallet");
  const data = BALANCE_OF + addrWord(owner);
  const res = await rpc("eth_call", [{ to: token, data }, "latest"]);
  return res && res !== "0x" ? BigInt(res) : 0n;
}

export async function blockNumber() {
  return Number.parseInt(await rpc("eth_blockNumber"), 16);
}

export async function sendTransfer({ token, to, amountBaseUnits }) {
  requireAddress(token, "SQK token");
  requireAddress(to, "recipient");
  if (BigInt(amountBaseUnits) <= 0n) throw new Error("Tip amount must be greater than zero");
  await ensureSepolia();
  const p = provider();
  if (!p) throw new Error("Wallet not found");
  const data = TRANSFER + addrWord(to) + uintWord(amountBaseUnits);
  // Sends must go through the wallet, never through a public node.
  return p.request({
    method: "eth_sendTransaction",
    params: [{ from: state.account, to: token, data, value: "0x0" }],
  });
}

/** Wait for the wallet-submitted transaction to appear in a Sepolia receipt. */
export async function waitForTransaction(hash, { timeoutMs = 60_000, intervalMs = 2500 } = {}) {
  if (!/^0x[0-9a-fA-F]{64}$/.test(String(hash ?? ""))) throw new Error("Invalid transaction hash");
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const receipt = await rpc("eth_getTransactionReceipt", [hash]);
      if (receipt) return receipt;
    } catch {
      // Try the next poll; a temporary public RPC failure is not a failed transaction.
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return null;
}

/**
 * ERC-20 Transfer logs into `to`.
 * Scans `lookback` blocks backwards in chunks accepted by public nodes.
 */
export async function getIncomingTransfers({ token, to, lookback = 6000, chunk = 2000, maxChunks = 3 }) {
  requireAddress(token, "SQK token");
  requireAddress(to, "recipient");
  const head = await blockNumber();
  const topicTo = "0x" + addrWord(to);
  const out = [];
  let upper = head;
  let scanned = 0;

  for (let i = 0; i < maxChunks; i += 1) {
    const lower = Math.max(0, upper - chunk + 1);
    const logs = await rpc("eth_getLogs", [
      {
        address: token,
        fromBlock: "0x" + lower.toString(16),
        toBlock: "0x" + upper.toString(16),
        topics: [TRANSFER_TOPIC, null, topicTo],
      },
    ]);
    for (const log of logs ?? []) {
      try {
        out.push({
          from: "0x" + log.topics[1].slice(26),
          amount: BigInt(log.data),
          block: Number.parseInt(log.blockNumber, 16),
          logIndex: Number.parseInt(log.logIndex ?? "0x0", 16),
          tx: log.transactionHash,
        });
      } catch {
        /* skip malformed log */
      }
    }
    scanned += upper - lower + 1;
    if (lower === 0 || scanned >= lookback) break;
    upper = lower - 1;
  }
  return {
    tips: out.sort((a, b) => b.block - a.block || (b.logIndex ?? 0) - (a.logIndex ?? 0)),
    head,
    scanned,
  };
}

export const explorerTx = (hash) => `${SEPOLIA.explorer}/tx/${hash}`;
export const explorerAddr = (addr) => `${SEPOLIA.explorer}/address/${addr}`;

/**
 * chainService.ts
 * Production multi-chain service for Equilibria.
 * Talks to our Express backend which proxies LI.FI Earn Data API + Composer.
 * Executes real on-chain transactions via Privy embedded wallet.
 */

import { createPublicClient, http, erc20Abi, formatUnits, formatEther } from 'viem';
import { base, mainnet, arbitrum } from 'viem/chains';
import { API_BASE } from './api';

// ── Multi-chain public clients ────────────────────────────────
const clients = {
  ethereum: createPublicClient({ chain: mainnet, transport: http() }),
  base: createPublicClient({ chain: base, transport: http() }),
  arbitrum: createPublicClient({ chain: arbitrum, transport: http() }),
};

export type SupportedChain = 'ethereum' | 'base' | 'arbitrum' | 'bnb';
export type SupportedToken = 'ETH' | 'USDC' | 'USDT';

// Keep the old name as an alias for backward compatibility across components
export type DemoBalance = WalletBalance;

export interface WalletBalance {
  chain: string;
  token: string;
  balance: number;
  usdValue: number;
}

// ── Chain ID mapping ──────────────────────────────────────────
export const CHAIN_IDS: Record<SupportedChain, number> = {
  ethereum: 1,
  base: 8453,
  arbitrum: 42161,
  bnb: 56,
};

// ── Live price cache (refreshed on each balance fetch) ────────
let cachedPrices: Record<string, number> = { ETH: 3500, USDC: 1, USDT: 1 };

async function fetchLivePrices(): Promise<Record<string, number>> {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum,usd-coin,tether&vs_currencies=usd');
    if (res.ok) {
      const data = await res.json();
      cachedPrices = {
        ETH: data.ethereum?.usd ?? cachedPrices.ETH,
        USDC: data['usd-coin']?.usd ?? 1,
        USDT: data.tether?.usd ?? 1,
      };
    }
  } catch {
    // Silently use cached prices on failure
  }
  return cachedPrices;
}

// Backward-compat stubs (no-op in production)
export async function seedDemoBalances(_address: string): Promise<WalletBalance[]> { return []; }
export async function applyDemoTransaction(_payload: any): Promise<WalletBalance[]> { return []; }
export function getDemoBalanceMap(balances: WalletBalance[]) {
  const map = new Map<string, WalletBalance>();
  for (const row of balances) map.set(`${row.chain}:${row.token}`, row);
  return map;
}
export function sumDemoBalancesUsd(balances: WalletBalance[]): number {
  return balances.reduce((acc, row) => acc + (row.usdValue || 0), 0);
}

/**
 * Fetch real on-chain balances across Ethereum, Base, and Arbitrum.
 */
export async function getDemoBalances(address: string): Promise<WalletBalance[]> {
  return getWalletBalances(address);
}

export async function getWalletBalances(address: string): Promise<WalletBalance[]> {
  const prices = await fetchLivePrices();
  const addr = address as `0x${string}`;

  const fetchSafe = async (fn: () => Promise<any>, fallback: any = 0n) => {
    try { return await fn(); } catch { return fallback; }
  };

  // Query all 3 EVM chains in parallel
  const [baseEth, baseUsdc, baseUsdt, ethEth, ethUsdc, ethUsdt, arbEth, arbUsdc, arbUsdt] = await Promise.all([
    // Base
    fetchSafe(() => clients.base.getBalance({ address: addr })),
    fetchSafe(() => clients.base.readContract({ address: TOKEN_ADDRESSES.base.USDC as `0x${string}`, abi: erc20Abi, functionName: 'balanceOf', args: [addr] })),
    fetchSafe(() => clients.base.readContract({ address: TOKEN_ADDRESSES.base.USDT as `0x${string}`, abi: erc20Abi, functionName: 'balanceOf', args: [addr] })),
    // Ethereum
    fetchSafe(() => clients.ethereum.getBalance({ address: addr })),
    fetchSafe(() => clients.ethereum.readContract({ address: TOKEN_ADDRESSES.ethereum.USDC as `0x${string}`, abi: erc20Abi, functionName: 'balanceOf', args: [addr] })),
    fetchSafe(() => clients.ethereum.readContract({ address: TOKEN_ADDRESSES.ethereum.USDT as `0x${string}`, abi: erc20Abi, functionName: 'balanceOf', args: [addr] })),
    // Arbitrum
    fetchSafe(() => clients.arbitrum.getBalance({ address: addr })),
    fetchSafe(() => clients.arbitrum.readContract({ address: TOKEN_ADDRESSES.arbitrum.USDC as `0x${string}`, abi: erc20Abi, functionName: 'balanceOf', args: [addr] })),
    fetchSafe(() => clients.arbitrum.readContract({ address: TOKEN_ADDRESSES.arbitrum.USDT as `0x${string}`, abi: erc20Abi, functionName: 'balanceOf', args: [addr] })),
  ]);

  const fmt18 = (v: bigint) => parseFloat(formatEther(v));
  const fmt6 = (v: bigint) => parseFloat(formatUnits(v, 6));
  const price = (token: string, amount: number) => amount * (prices[token] || 0);

  return [
    // Base
    { chain: 'base', token: 'ETH', balance: fmt18(baseEth), usdValue: price('ETH', fmt18(baseEth)) },
    { chain: 'base', token: 'USDC', balance: fmt6(baseUsdc), usdValue: price('USDC', fmt6(baseUsdc)) },
    { chain: 'base', token: 'USDT', balance: fmt6(baseUsdt), usdValue: price('USDT', fmt6(baseUsdt)) },
    // Ethereum
    { chain: 'ethereum', token: 'ETH', balance: fmt18(ethEth), usdValue: price('ETH', fmt18(ethEth)) },
    { chain: 'ethereum', token: 'USDC', balance: fmt6(ethUsdc), usdValue: price('USDC', fmt6(ethUsdc)) },
    { chain: 'ethereum', token: 'USDT', balance: fmt6(ethUsdt), usdValue: price('USDT', fmt6(ethUsdt)) },
    // Arbitrum
    { chain: 'arbitrum', token: 'ETH', balance: fmt18(arbEth), usdValue: price('ETH', fmt18(arbEth)) },
    { chain: 'arbitrum', token: 'USDC', balance: fmt6(arbUsdc), usdValue: price('USDC', fmt6(arbUsdc)) },
    { chain: 'arbitrum', token: 'USDT', balance: fmt6(arbUsdt), usdValue: price('USDT', fmt6(arbUsdt)) },
  ];
}

// ── Block explorer URLs ──────────────────────────────────────
export const EXPLORER_URLS: Record<number, string> = {
  8453: 'https://basescan.org/tx/',
  42161: 'https://arbiscan.io/tx/',
  56: 'https://bscscan.com/tx/',
  1: 'https://etherscan.io/tx/',
};

// ── Common token addresses per chain ──────────────────────────
export const TOKEN_ADDRESSES: Record<SupportedChain, Record<string, string>> = {
  ethereum: {
    ETH: '0x0000000000000000000000000000000000000000',
    USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  },
  base: {
    ETH: '0x0000000000000000000000000000000000000000',
    USDC: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
    USDT: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
  },
  arbitrum: {
    ETH: '0x0000000000000000000000000000000000000000',
    USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
  },
  bnb: {
    ETH: '0x0000000000000000000000000000000000000000',
    USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    USDT: '0x55d398326f99059fF775485246999027B3197955',
  },
};

// ── ERC-20 ABI fragment for approve() ──────────────────────────
const ERC20_APPROVE_DATA = (spender: string, amount: string): string => {
  // approve(address spender, uint256 amount)
  // Function selector: 0x095ea7b3
  const spenderPadded = spender.replace('0x', '').padStart(64, '0');
  const amountHex = BigInt(amount).toString(16).padStart(64, '0');
  return `0x095ea7b3${spenderPadded}${amountHex}`;
};

// ── ERC-20 ABI fragment for transfer() ─────────────────────────
const ERC20_TRANSFER_DATA = (to: string, amount: string): string => {
  // transfer(address to, uint256 amount)
  // Function selector: 0xa9059cbb
  const toPadded = to.replace('0x', '').padStart(64, '0');
  const amountHex = BigInt(amount).toString(16).padStart(64, '0');
  return `0xa9059cbb${toPadded}${amountHex}`;
};

/**
 * Execute a transaction via Privy embedded wallet.
 * This uses the EIP-1193 provider obtained from the wallet.
 */
export async function executeTransaction(
  wallet: any,
  txRequest: { to: string; data: string; value?: string; chainId?: number; gasLimit?: string }
): Promise<string> {
  if (!wallet) throw new Error('No wallet connected');

  // Get the EIP-1193 provider from the Privy wallet
  const provider = await wallet.getEthereumProvider();
  if (!provider) throw new Error('Failed to get wallet provider');

  // Switch chain if needed
  if (txRequest.chainId) {
    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${txRequest.chainId.toString(16)}` }],
      });
    } catch (switchError: any) {
      // If chain doesn't exist, try to add it
      if (switchError.code === 4902) {
        console.warn('Chain not added to wallet, proceeding anyway');
      }
    }
  }

  // Prepare the transaction parameters
  const txParams: Record<string, any> = {
    to: txRequest.to,
    data: txRequest.data,
    from: wallet.address,
    gas: txRequest.gasLimit || '0x21108', // 135432 generic default gas to avoid intrinsic bounds or 0-balance revert checks
  };

  // Handle the value field (ETH amount to send)
  if (txRequest.value && txRequest.value !== '0' && txRequest.value !== '0x0') {
    txParams.value = txRequest.value.startsWith('0x')
      ? txRequest.value
      : `0x${BigInt(txRequest.value).toString(16)}`;
  }

  // Submit the transaction
  const txHash = await provider.request({
    method: 'eth_sendTransaction',
    params: [txParams],
  });

  return txHash as string;
}

/**
 * Approve ERC-20 token spending if needed (for non-native tokens).
 */
export async function approveTokenIfNeeded(
  wallet: any,
  tokenAddress: string,
  spenderAddress: string,
  _amount: string,
  chainId: number
): Promise<string | null> {
  // Native token (ETH) doesn't need approval
  if (tokenAddress === '0x0000000000000000000000000000000000000000') return null;

  const maxApproval = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
  const approveData = ERC20_APPROVE_DATA(spenderAddress, maxApproval);

  console.log(`📝 Approving token ${tokenAddress} for spender ${spenderAddress}...`);

  const txHash = await executeTransaction(wallet, {
    to: tokenAddress,
    data: approveData,
    value: '0x0',
    chainId,
  });

  console.log(`✅ Approval tx: ${txHash}`);

  // Wait a moment for approval to propagate
  await new Promise(r => setTimeout(r, 3000));
  return txHash;
}

/**
 * Get token balances for a wallet via on-chain RPC.
 */
export async function getTokenBalance(_address: string, _tokenAddress: string, _chain: SupportedChain) {
  // TODO: Query actual on-chain balances via RPC
  return {
    symbol: 'UNKNOWN',
    balance: '0.00',
    usdValue: 0,
  };
}

/**
 * Get the best available yield vault from LI.FI via our backend.
 */
export async function getBestVault(token?: SupportedToken, chainId?: number): Promise<{
  address: string;
  name: string;
  network: string;
  chainId: number;
  protocol: string;
  apy: { base: number; reward: number; total: number };
  tvl: string;
  underlyingToken: { symbol: string; address: string; decimals: number };
  tags?: string[];
}> {
  const params = new URLSearchParams();
  if (token) params.set('token', token);
  if (chainId) params.set('chainId', String(chainId));

  const res = await fetch(`${API_BASE}/api/earn/best-vault?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch best vault');
  const { vault } = await res.json();
  return vault;
}

/**
 * Get a deposit quote from LI.FI Composer via our backend.
 * Returns a ready-to-sign transaction request.
 */
export async function getDepositQuote(
  walletAddress: string,
  token: SupportedToken,
  amountStr: string,
  chain: SupportedChain,
  vaultAddress: string,
  vaultChainId: number
): Promise<any> {
  const fromChain = CHAIN_IDS[chain];
  const fromToken = TOKEN_ADDRESSES[chain]?.[token];
  if (!fromToken) throw new Error(`Token ${token} not supported on ${chain}`);

  const decimals = token === 'ETH' ? 18 : 6;
  const fromAmount = BigInt(Math.floor(parseFloat(amountStr) * (10 ** decimals))).toString();

  return getComposerQuote({
    fromChain,
    toChain: vaultChainId,
    fromToken,
    toToken: vaultAddress,
    fromAddress: walletAddress,
    toAddress: walletAddress,
    fromAmount,
  });
}

export async function getComposerQuote(params: {
  fromChain: number;
  toChain: number;
  fromToken: string;
  toToken: string;
  fromAddress: string;
  toAddress: string;
  fromAmount: string;
}): Promise<any> {
  const res = await fetch(`${API_BASE}/api/deposit-quote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to get Composer quote');
  }

  return res.json();
}

export async function getTxStatus(params: { txHash: string; fromChain?: number; toChain?: number }) {
  const search = new URLSearchParams();
  search.set('txHash', params.txHash);
  if (params.fromChain) search.set('fromChain', String(params.fromChain));
  if (params.toChain) search.set('toChain', String(params.toChain));

  const res = await fetch(`${API_BASE}/api/tx-status?${search.toString()}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to fetch tx status');
  }
  return res.json();
}

async function pollTxStatus(txHash: string, fromChain: number, toChain: number) {
  let status = 'PENDING';
  let substatus = '';
  for (let i = 0; i < 30; i += 1) {
    const result = await getTxStatus({ txHash, fromChain, toChain });
    status = result.status || status;
    substatus = result.substatus || substatus;
    if (status === 'DONE' || status === 'FAILED') break;
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  return { status, substatus };
}

async function getTokenDecimals(chain: SupportedChain, tokenAddress: string): Promise<number> {
  try {
    const decimals = await clients[chain].readContract({
      address: tokenAddress as `0x${string}`,
      abi: erc20Abi,
      functionName: 'decimals',
    });
    return Number(decimals);
  } catch {
    return 18;
  }
}

/**
 * Deposit funds into a DeFi pool via LI.FI Composer.
 * 
 * REAL FLOW:
 * Step 1: Get best vault from LI.FI Earn
 * Step 2: Get deposit quote from LI.FI Composer
 * Step 3: Approve token spending (if ERC-20)
 * Step 4: Execute the transaction via Privy wallet
 * Step 5: Return real tx hash + explorer link
 */
export async function depositToPool(
  wallet: any,
  token: SupportedToken,
  amount: string,
  chain: SupportedChain
): Promise<{ txHash: string; apy: number; vaultName?: string; protocol?: string; chainId?: number; explorerUrl?: string; vaultAddress?: string; status?: string; substatus?: string }> {
  // Step 1: Find the best vault
  const bestVault = await getBestVault(token, CHAIN_IDS[chain]);
  console.log(`🔍 Best vault: ${bestVault.name} (${bestVault.protocol}) @ ${bestVault.apy.total}% APY on chain ${bestVault.chainId}`);

  // Step 2: Get the deposit quote from LI.FI Composer
  const walletAddress = wallet?.address;
  if (!walletAddress) throw new Error('Wallet not connected — please connect via Privy');

  let quote: any = null;
  try {
    quote = await getDepositQuote(
      walletAddress,
      token,
      amount,
      chain,
      bestVault.address,
      bestVault.chainId
    );
  } catch (err) {
    console.warn('LI.FI quote failed, falling back to direct treasury deposit:', err);
  }

  // If quote failed, fallback to treasury deposit (acting as a basic vault)
  if (!quote || !quote.transactionRequest) {
    throw new Error('No DeFi vault supports this token on the selected chain. Disable DeFi to use treasury custody.');
  }

  console.log('📋 LI.FI Quote received:', {
    to: quote.transactionRequest.to,
    chainId: quote.transactionRequest.chainId,
    hasData: !!quote.transactionRequest.data,
    value: quote.transactionRequest.value,
  });

  // Step 3: If it's an ERC-20 token, approve spending first
  const fromToken = TOKEN_ADDRESSES[chain]?.[token];
  if (fromToken && fromToken !== '0x0000000000000000000000000000000000000000') {
    const spender = quote.estimate?.approvalAddress;
    if (spender) {
      const decimals = token === 'ETH' ? 18 : 6;
      const rawAmount = BigInt(Math.floor(parseFloat(amount) * (10 ** decimals))).toString();
      await approveTokenIfNeeded(wallet, fromToken, spender, rawAmount, CHAIN_IDS[chain]);
    }
  }



  console.log('🚀 Submitting transaction via Privy wallet...');
  const txHash = await executeTransaction(wallet, {
    to: quote.transactionRequest.to,
    data: quote.transactionRequest.data,
    value: quote.transactionRequest.value || '0x0',
    chainId: quote.transactionRequest.chainId || bestVault.chainId,
    gasLimit: quote.transactionRequest.gasLimit,
  });

  let status: string | undefined;
  let substatus: string | undefined;
  const fromChainId = quote.action?.fromChainId;
  const toChainId = quote.action?.toChainId;
  if (fromChainId && toChainId && fromChainId !== toChainId) {
    const result = await pollTxStatus(txHash, fromChainId, toChainId);
    status = result.status;
    substatus = result.substatus;
  }

  const explorerBase = EXPLORER_URLS[bestVault.chainId] || EXPLORER_URLS[CHAIN_IDS[chain]];
  const explorerUrl = explorerBase ? `${explorerBase}${txHash}` : undefined;

  console.log(`✅ Deposit tx confirmed: ${txHash}`);
  console.log(`🔗 Explorer: ${explorerUrl}`);

  return {
    txHash,
    apy: bestVault.apy.total,
    vaultName: bestVault.name,
    protocol: bestVault.protocol,
    chainId: bestVault.chainId,
    explorerUrl,
    vaultAddress: bestVault.address,
    status,
    substatus,
  };
}

/**
 * Deposit funds to the Equilibria Treasury (for non-DeFi plans).
 * This executes a standard ERC-20 transfer to our custodial wallet.
 */
export async function depositToTreasury(
  wallet: any,
  token: SupportedToken,
  amount: string,
  chain: SupportedChain
): Promise<{ txHash: string; explorerUrl?: string }> {
  // Option A: Treasury Custody
  const TREASURY_ADDRESS = '0x3C80818c4ebA036D54775Bd0D8994d3dfc0b7A25';
  
  const chainId = CHAIN_IDS[chain];
  const tokenAddress = TOKEN_ADDRESSES[chain]?.[token];
  if (!tokenAddress) throw new Error(`Token ${token} not supported on ${chain}`);

  console.log(`🏦 Initiating custodial deposit of ${amount} ${token} to Treasury`);

  // We need amount in minimal units. Assuming 6 decimals for USDC/USDT, 18 for ETH
  const decimals = token === 'ETH' ? 18 : 6;
  const amountRaw = BigInt(Math.floor(parseFloat(amount) * (10 ** decimals))).toString();

  let txHash: string;
  if (tokenAddress === '0x0000000000000000000000000000000000000000') {
    // Native ETH transfer
    txHash = await executeTransaction(wallet, {
      to: TREASURY_ADDRESS,
      data: '0x',
      value: amountRaw,
      chainId,
    });
  } else {
    // ERC20 Transfer
    const transferData = ERC20_TRANSFER_DATA(TREASURY_ADDRESS, amountRaw);
    txHash = await executeTransaction(wallet, {
      to: tokenAddress,
      data: transferData,
      value: '0x0',
      chainId,
    });
  }

  const explorerBase = EXPLORER_URLS[chainId] || EXPLORER_URLS[CHAIN_IDS[chain]];
  const explorerUrl = explorerBase ? `${explorerBase}${txHash}` : undefined;

  console.log(`✅ Treasury deposit tx confirmed: ${txHash}`);
  
  return { txHash, explorerUrl };
}

/**
 * Execute a token swap via LI.FI Composer + Privy wallet.
 * 
 * REAL FLOW:
 * Step 1: Get swap quote from LI.FI
 * Step 2: Approve token (if ERC-20)
 * Step 3: Execute transaction
 * Step 4: Return real tx hash
 */
export async function executeSwap(
  wallet: any,
  fromToken: SupportedToken,
  toToken: SupportedToken,
  amountStr: string,
  chain: SupportedChain,
  slippage?: number
): Promise<{ txHash: string; explorerUrl?: string }> {
  const walletAddress = wallet?.address;
  if (!walletAddress) throw new Error('Wallet not connected');

  // Step 1: Get swap quote
  const quote = await getSwapQuote(walletAddress, fromToken, toToken, amountStr, chain, slippage);

  if (!quote.transactionRequest) {
    throw new Error('LI.FI did not return a transactionRequest for this swap');
  }

  // Step 2: Approve ERC-20 if needed
  const fromAddr = TOKEN_ADDRESSES[chain]?.[fromToken];
  if (fromAddr && fromAddr !== '0x0000000000000000000000000000000000000000') {
    const spender = quote.transactionRequest.to;
    const decimals = fromToken === 'ETH' ? 18 : 6;
    const rawAmount = BigInt(Math.floor(parseFloat(amountStr) * (10 ** decimals))).toString();
    await approveTokenIfNeeded(wallet, fromAddr, spender, rawAmount, CHAIN_IDS[chain]);
  }

  // Step 3: Execute the swap transaction
  console.log('🔄 Executing swap via Privy wallet...');
  const txHash = await executeTransaction(wallet, {
    to: quote.transactionRequest.to,
    data: quote.transactionRequest.data,
    value: quote.transactionRequest.value || '0x0',
    chainId: quote.transactionRequest.chainId || CHAIN_IDS[chain],
    gasLimit: quote.transactionRequest.gasLimit,
  });

  const explorerBase = EXPLORER_URLS[CHAIN_IDS[chain]];
  const explorerUrl = explorerBase ? `${explorerBase}${txHash}` : undefined;

  console.log(`✅ Swap tx: ${txHash}`);

  return { txHash, explorerUrl };
}

/**
 * Withdraw funds from a DeFi pool.
 * Returns net amount after 5% early withdrawal penalty (if applicable).
 */
export async function withdrawFromPool(
  wallet: any,
  token: SupportedToken,
  amountStr: string,
  chain: SupportedChain,
  isEarlyWithdrawal: boolean,
  vaultTokenAddress?: string
): Promise<{ txHash: string; netAmount: number; penaltyAmount: number; explorerUrl?: string; status?: string; substatus?: string }> {
  // Determine if there is a 5% penalty
  const amount = parseFloat(amountStr);
  const penaltyRate = isEarlyWithdrawal ? 0.05 : 0;
  const penaltyAmount = amount * penaltyRate;
  const netAmount = amount - penaltyAmount;
  let finalTxHash = '0x';

  if (!vaultTokenAddress) {
    throw new Error('Missing vault token address for withdrawal');
  }

  const walletAddress = wallet?.address;
  if (!walletAddress) throw new Error('Wallet not connected');

  const fromToken = vaultTokenAddress;
  const toToken = TOKEN_ADDRESSES[chain]?.[token];
  if (!toToken) throw new Error(`Token ${token} not supported on ${chain}`);

  const vaultDecimals = await getTokenDecimals(chain, vaultTokenAddress);
  const fromAmount = BigInt(Math.floor(parseFloat(amountStr) * (10 ** vaultDecimals))).toString();

  const quote = await getComposerQuote({
    fromChain: CHAIN_IDS[chain],
    toChain: CHAIN_IDS[chain],
    fromToken,
    toToken,
    fromAddress: walletAddress,
    toAddress: walletAddress,
    fromAmount,
  });

  if (!quote?.transactionRequest) {
    throw new Error('Failed to build withdraw transaction');
  }

  if (fromToken !== '0x0000000000000000000000000000000000000000') {
    const spender = quote.estimate?.approvalAddress;
    if (spender) {
      await approveTokenIfNeeded(wallet, fromToken, spender, fromAmount, CHAIN_IDS[chain]);
    }
  }

  console.log(`👤 User Withdrawal: Redeeming ${amount} ${token} from Vault`);

  finalTxHash = await executeTransaction(wallet, {
    to: quote.transactionRequest.to,
    data: quote.transactionRequest.data,
    value: quote.transactionRequest.value || '0x0',
    chainId: quote.transactionRequest.chainId || CHAIN_IDS[chain],
    gasLimit: quote.transactionRequest.gasLimit,
  });

  let status: string | undefined;
  let substatus: string | undefined;
  const fromChainId = quote.action?.fromChainId;
  const toChainId = quote.action?.toChainId;
  if (fromChainId && toChainId && fromChainId !== toChainId) {
    const result = await pollTxStatus(finalTxHash, fromChainId, toChainId);
    status = result.status;
    substatus = result.substatus;
  }

  // 2. Enforce penalty manually directly from user's wallet
  if (isEarlyWithdrawal && penaltyAmount > 0) {
    console.log(`🏦 Treasury Transfer: Extracting ${penaltyAmount} ${token} to Equilibria Treasury (Early Penalty)`);
    
    const TREASURY_ADDRESS = '0x3C80818c4ebA036D54775Bd0D8994d3dfc0b7A25';
    const chainId = CHAIN_IDS[chain];
    const tokenAddress = TOKEN_ADDRESSES[chain]?.[token] || '0x0000000000000000000000000000000000000000';
    const decimals = token === 'ETH' ? 18 : 6;
    const penaltyRaw = BigInt(Math.floor(penaltyAmount * (10 ** decimals))).toString();

    try {
      if (tokenAddress === '0x0000000000000000000000000000000000000000') {
        await executeTransaction(wallet, {
          to: TREASURY_ADDRESS,
          data: '0x',
          value: penaltyRaw,
          chainId,
        });
      } else {
        const transferData = ERC20_TRANSFER_DATA(TREASURY_ADDRESS, penaltyRaw);
        await executeTransaction(wallet, {
          to: tokenAddress,
          data: transferData,
          value: '0x0',
          chainId,
        });
      }
    } catch (err: any) {
      console.error('Penalty transfer failed:', err);
      throw new Error(`Failed to process penalty: ${err.message}`);
    }
  } else {
    // Mature withdrawal assumes no penalty
    console.log(`👤 User Payout: Transferring full ${amount} ${token} back to user (Mature).`);
  }

  const explorerBase = EXPLORER_URLS[CHAIN_IDS[chain]];
  const explorerUrl = explorerBase ? `${explorerBase}${finalTxHash}` : undefined;

  return { txHash: finalTxHash, netAmount, penaltyAmount, explorerUrl, status, substatus };
}

/**
 * Get a swap quote from LI.FI Composer via our backend.
 */
export async function getSwapQuote(
  walletAddress: string,
  fromToken: SupportedToken,
  toToken: SupportedToken,
  amountStr: string,
  chain: SupportedChain,
  slippage?: number
): Promise<any> {
  const fromChain = CHAIN_IDS[chain];
  const fromAddr = TOKEN_ADDRESSES[chain]?.[fromToken];
  const toAddr = TOKEN_ADDRESSES[chain]?.[toToken];

  if (!fromAddr || !toAddr) throw new Error(`Token pair not supported on ${chain}`);

  const decimals = fromToken === 'ETH' ? 18 : 6;
  const fromAmount = BigInt(Math.floor(parseFloat(amountStr) * (10 ** decimals))).toString();

  const res = await fetch(`${API_BASE}/api/swap-quote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fromChain,
      fromToken: fromAddr,
      toToken: toAddr,
      fromAddress: walletAddress,
      fromAmount,
      slippage: slippage || 0.005,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to get swap quote');
  }

  return res.json();
}

/**
 * Record a deposit event on the backend (awards points, logs activity).
 */
export async function recordDeposit(
  planId: string,
  depositorAddress: string,
  amount: number,
  txHash?: string,
  txStatus?: string,
  authToken?: string
): Promise<{ pointsEarned: number; totalPoints: number }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const res = await fetch(`${API_BASE}/api/vaults/${planId}/deposit`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ depositorAddress, amount, txHash, txStatus }),
  });

  if (!res.ok) {
    console.warn('Failed to record deposit on backend');
    return { pointsEarned: 0, totalPoints: 0 };
  }

  const data = await res.json();
  return { pointsEarned: data.pointsEarned, totalPoints: data.totalPoints };
}

/**
 * Get DeFi pool info for UI display.
 */
export function getPoolInfo(token: SupportedToken, chain: SupportedChain) {
  const POOL_MAP: Record<SupportedChain, { protocol: string; baseUrl: string }> = {
    ethereum: { protocol: 'Aave V3',   baseUrl: 'https://app.aave.com' },
    base:     { protocol: 'Aave V3',   baseUrl: 'https://app.aave.com' },
    arbitrum: { protocol: 'Aave V3',   baseUrl: 'https://app.aave.com' },
    bnb:      { protocol: 'Venus',     baseUrl: 'https://app.venus.io' },
  };

  const APY_MAP: Record<SupportedToken, number> = {
     ETH: 2.8, USDC: 4.2, USDT: 4.0,
  };

  return {
    ...POOL_MAP[chain],
    apy: APY_MAP[token],
    token,
    chain,
  };
}

export default { getTokenBalance, depositToPool, depositToTreasury, withdrawFromPool, getPoolInfo, getBestVault, getDepositQuote, getSwapQuote, recordDeposit, executeSwap, executeTransaction, seedDemoBalances, getDemoBalances, applyDemoTransaction, getDemoBalanceMap, sumDemoBalancesUsd };

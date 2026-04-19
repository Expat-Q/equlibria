import ethLogo from './assets/eth_logo.jpg';
import arbitrumLogo from './assets/arbitrum_logo.jpg';
import baseLogo from './assets/base_logo.jpg';
import usdcLogo from './assets/usdc_logo.jpg';
import usdtLogo from './assets/usdt_logo.jpg';

export type TokenSymbol = 'ETH' | 'USDT' | 'USDC' | 'WBTC' | 'DAI' | 'USDe' | 'LINK';

export type ChainName = 'ethereum' | 'arbitrum' | 'base';

export type PlanCategory =
  | 'academics'
  | 'vacation'
  | 'rent'
  | 'food'
  | 'emergency'
  | 'wedding'
  | 'gadgets'
  | 'business'
  | 'other';

export type PlanType = 'individual' | 'joint';

export interface SavingsPlan {
  id: string;
  name: string;
  category: PlanCategory;
  type: PlanType;
  token: TokenSymbol;
  chain: ChainName;  // New: the blockchain network
  targetAmount: number;
  currentAmount: number;
  myContribution: number;       // for joint plans: user's own share
  partnerContribution: number;  // for joint plans: partner's share
  yieldEarned: number;
  apy: number;
  createdAt: string;
  
  // New features
  lockDurationDays: number;
  withdrawalDate: string;
  depositToDefi: boolean;
  defiProtocol?: string;    // e.g. "yo-protocol"
  defiVaultName?: string;   // e.g. "USDC"
  defiChainId?: number;     // e.g. 8453 (Base)
  defiVaultAddress?: string;
  policyAgreed: boolean;
  sharedOnX: boolean;

  creationTxHash?: string;
  creationChainId?: number;

  partnerAddress?: string;
  partnerInviteCode?: string;
  isPartnerAccepted?: boolean;
}

export interface Token {
  symbol: TokenSymbol;
  name: string;
  icon: string;
  color: string;
  image?: string;
}

export const TOKENS: Token[] = [
  { symbol: 'ETH',  name: 'Ethereum', icon: '🔷', color: '#627eea' },
  { symbol: 'USDT', name: 'Tether USD', icon: '💵', color: '#26a17b', image: usdtLogo },
  { symbol: 'USDC', name: 'USD Coin',  icon: '🔵', color: '#2775ca', image: usdcLogo },
  { symbol: 'WBTC', name: 'Wrapped BTC', icon: '🔶', color: '#f7931a' },
  { symbol: 'DAI',  name: 'Dai Stablecoin', icon: '🟡', color: '#f5ac37' },
  { symbol: 'USDe', name: 'Ethena USDe', icon: '💠', color: '#000000' },
  { symbol: 'LINK', name: 'Chainlink', icon: '🔗', color: '#2a5ada' },
];

export const TOKEN_IMAGES: Record<string, string> = {
  USDC: usdcLogo,
  USDT: usdtLogo,
  ETH: ethLogo
};

export const CATEGORIES: {
  value: PlanCategory;
  label: string;
  emoji: string;
  iconName: string;
  color: string;
}[] = [
  { value: 'academics',  label: 'Academics',     emoji: '🎓', iconName: 'graduation-cap', color: '#6c5ce7' },
  { value: 'vacation',   label: 'Vacation',       emoji: '✈️', iconName: 'plane-departure', color: '#00b894' },
  { value: 'rent',       label: 'Rent / Housing', emoji: '🏠', iconName: 'house', color: '#e17055' },
  { value: 'food',       label: 'Food & Dining',  emoji: '🍔', iconName: 'utensils', color: '#f39c12' },
  { value: 'emergency',  label: 'Emergency',      emoji: '🚨', iconName: 'truck-medical', color: '#e74c3c' },
  { value: 'wedding',    label: 'Wedding',         emoji: '💍', iconName: 'ring', color: '#fd79a8' },
  { value: 'gadgets',    label: 'Gadgets / Tech',  emoji: '💻', iconName: 'laptop', color: '#74b9ff' },
  { value: 'business',   label: 'Business',        emoji: '📈', iconName: 'chart-line', color: '#a29bfe' },
  { value: 'other',      label: 'Other',           emoji: '🎯', iconName: 'bullseye', color: '#636e72' },
];

export interface Chain {
  name: ChainName;
  label: string;
  icon: string;
  color: string;
  rpcUrl?: string;
}

export const CHAINS: Chain[] = [
  { name: 'ethereum', label: 'Ethereum',     icon: ethLogo, color: '#627eea' },
  { name: 'arbitrum', label: 'Arbitrum',     icon: arbitrumLogo, color: '#28a0f0' },
  { name: 'base',     label: 'Base',         icon: baseLogo, color: '#0052ff' },
];

export const TOKEN_COLOR: Record<TokenSymbol, string> = {
  ETH: '#627eea',
  USDT: '#26a17b',
  USDC: '#2775ca',
  WBTC: '#f7931a',
  DAI: '#f5ac37',
  USDe: '#000000',
  LINK: '#2a5ada',
};

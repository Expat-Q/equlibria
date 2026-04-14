# Equilibria Vault: Shared Life, Private Wealth

## The Core Idea
When couples or roommates manage joint finances, traditional fintech forces a binary choice: either everything is shared (joint bank accounts where all transactions are visible) or nothing is shared (splitting requests constantly).

Equilibria Vault solves this real-world social dynamic with a hybrid approach: transparent shared goals plus private individual control in the same dashboard.

We are no longer using Starknet. The app runs on EVM chains and uses LI.FI Earn + LI.FI Composer for vault discovery and transaction routing.

## How it Works (User Journey)

1. Invisible onboarding (Privy)
   - Users log in with social accounts or passkeys. No seed phrases required.
2. The Household Vault (Transparent and Yield-Bearing)
   - Shared goals like Rent Pool or Vacation Fund live in a joint vault.
   - Vault selection is powered by LI.FI Earn, and deposits are executed through LI.FI Composer.
3. The Private Wallet (Personal Control)
   - Users can hold and move funds independently.
   - The app keeps private funds separate from shared vault activity.

## Technical Architecture

- Frontend: React (Vite) SPA with vanilla CSS.
- Backend: Express + MongoDB for persistence (vaults, activity, withdrawals).
- Auth and wallets: Privy embedded wallet.
- Yield and routing:
  - LI.FI Earn API for vault discovery and APY data.
  - LI.FI Composer for quotes, approvals, and cross-chain deposits.
  - LI.FI status endpoint for transaction tracking.

## Why this Stands Out

1. Real consumer finance problem: shared goals with personal autonomy.
2. Production-ready DeFi routing: best-vault selection and one-click deposits.
3. Multi-chain by default: Ethereum, Base, and Arbitrum supported.

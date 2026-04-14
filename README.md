# Equilibria Vault : Shared Life, Private Wealth

## 🎯 The Core Idea
When couples or roommates manage joint finances, traditional fintech forces a binary choice: either **everything is shared** (joint bank accounts where all transactions are visible) or **nothing is shared** (splitting Venmo requests constantly). 

**Equilibria Vault** is a Starknet mini-app designed to solve this real-world social dynamic. It introduces the concept of a "Hybrid Account" built entirely on Starknet using the flexible primitives provided by the **StarkZap SDK**.

Users can seamlessly track transparent, shared household goals (like a Vacation Fund or Rent Pool) while maintaining completely shielded, private individual wallets within the exact same dashboard.

## 🛠️ How it Works (The User Journey)

1. **Invisible Onboarding (Cartridge/Privy)**
   - New users do not need to understand "wallets" or "seed phrases". They log into the app smoothly using their social accounts or passkeys via `@cartridge/controller`.
2. **The "Household Vault" (Transparent & Yield-Bearing)**
   - Once authorized, the user sees a joint household balance. 
   - This balance represents funds explicitly allocated toward shared goals. 
   - Using **StarkZap's Lending integrations (Vesu)**, idle shared capital doesn't just sit there—it's automatically supplied to yield-bearing protocols to generate passive income for the household.
3. **The "Private Wallet" (Confidential & Shielded)** 
   - On the same dashboard sits the Private Wallet.
   - Any funds held here are obfuscated from the UI. More importantly, when a user extracts or sends from this wallet, the transaction utilizes **StarkZap's integration with Tongo Cash**.
   - Zero-Knowledge proofs shield the transaction history and amounts, meaning your partner or roommate cannot see how you are spending your personal allowance.

## 🧱 Technical Architecture

The application is built as a highly-performant React (Vite) Single Page Application (SPA), utilizing standard **Vanilla CSS** to deliver a sleek, glassmorphism aesthetic that feels like a premium Web2 Fintech product.

Under the hood, it abstracts complex DeFi operations using the **StarkZap SDK**:

- **Authentication:** `sdk.onboard({ strategy: OnboardStrategy.Cartridge })` allows for seamless session token generation without breaking the UX.
- **Yield Abstraction:** Uses `getPresets(wallet.getChainId()).STRK` and StarkZap's `.lend` API to deposit shared capital directly into Vesu lending contracts with a single click.
- **Privacy Abstraction:** Implements the `@fatsolutions/tongo-sdk` module layered over Starknet to orchestrate confidential transfers.
- **Gasless Transactions:** Executed via Paymaster sponsorships enabled by AVNU/Cartridge networks, removing friction for non-crypto natives.

## 🏆 Why this Wins Bounties

Hackathons and bounties often receive dozens of generic DEX aggregators or simple payment apps. Equilibria Vault stands out because:

1. **It solves a non-degen problem:** It targets everyday consumer finance logic (relationships, households, shared expenses).
2. **It extensively exploits the StarkZap surface area:** It doesn't just use StarkZap for login. It uses login, lending, and confidential transfers—proving out the entire SDK's value proposition.
3. **It demonstrates the power of ZK-Rollups perfectly:** True privacy in consumer apps is impossible on standard EVM chains without massive friction. By combining Account Abstraction (Cartridge) with ZK-Privacy (Tongo Cash), it creates a product that is uniquely capable on Starknet.

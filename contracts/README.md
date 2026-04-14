# Equilibria Smart Contracts

On-chain vault contracts for household savings with 2/2 multisig for joint plans.

## Contracts

### JointVault.sol
- 2/2 multisig vault for household goals
- Both partners must approve withdrawals
- Partner acceptance mechanism
- Contribution tracking
- Features:
  - Deposit (after both accept)
  - Request withdrawal
  - Approve/reject withdrawal
  - Auto-execute when both approved

### IndividualVault.sol
- Single-owner personal savings vault
- Owner-only control
- Time lock with early withdrawal penalty (2%)
- Feature: Switch between IDLE and YIELD modes
- Ownership transfer capability

### VaultFactory.sol
- Factory for creating vault clones
- Maintains user -> vault registry
- Supports both vault types
- Efficient deployment via proxy pattern

### BaseVault.sol
- Abstract base contract
- Shared functionality (deposit, withdrawal, balance tracking)
- Mode switching (IDLE <-> YIELD)
- Reentrancy protection
- SafeERC20 for token transfers

## Architecture

```
VaultFactory
├── JointVault (clone)
│   ├── 2/2 Multisig Logic
│   ├── Partner Management
│   └── Withdrawal Requests
└── IndividualVault (clone)
    ├── Owner Control
    ├── Time Locks
    └── Penalty Logic
```

## Setup

### Install Dependencies
```bash
cd contracts
forge install
```

### Compile
```bash
forge build
```

### Test
```bash
forge test
```

### Deploy to Sepolia (EVM testnet)
```bash
PRIVATE_KEY=your_key forge script script/Deploy.s.sol --rpc-url sepolia --broadcast
```

## Integration with Backend

### User Creates Joint Plan
1. Frontend calls `POST /api/vaults` (off-chain)
2. Backend stores vault metadata in MongoDB
3. Frontend calls `VaultFactory.createJointVault()` (on-chain)
4. Backend listens for event and updates vault with contract address

### User Deposits
1. User approves token on contract
2. Frontend calls `JointVault.deposit(amount)`
3. Backend polls for event and updates balance
4. Backend logs activity event

### User Requests Withdrawal
1. Frontend calls `JointVault.requestWithdrawal(amount)`
2. Event emitted with requestId
3. Backend polls and creates withdrawal entry
4. Frontend shows approval UI for partner

### Partner Approves
1. Frontend calls `JointVault.approveWithdrawal(requestId)`
2. If both approved → contract auto-executes transfer
3. Backend listens for executed event
4. Backend updates vault balance and activity feed

## Smart Contract Functions

### JointVault

```solidity
// Create vault via VaultFactory
createJointVault(
  token, name, targetAmount, partner1, partner2, initialMode
) -> vaultAddress

// Partner joins
vault.acceptPartnership()

// Deposit funds (after both accepted)
vault.deposit(amount)

// Request withdrawal
vault.requestWithdrawal(amount) -> requestId

// Approve withdrawal
vault.approveWithdrawal(requestId)

// Reject withdrawal
vault.rejectWithdrawal(requestId)

// Get request status
vault.getWithdrawalRequest(requestId)
```

### IndividualVault

```solidity
// Create vault via VaultFactory
createIndividualVault(
  token, name, targetAmount, owner, initialMode, withdrawableAfter
) -> vaultAddress

// Deposit
vault.deposit(amount)

// Withdraw (with or without penalty)
vault.withdraw(amount)

// Switch mode (IDLE <-> YIELD)
vault.setMode(newMode)

// Transfer ownership
vault.transferOwnership(newOwner)

// Check penalty status
vault.isWithdrawableWithoutPenalty() -> bool
```

## Token Requirements

Vaults accept any ERC20 token:
- USDC (recommended)
- USDT
- DAI
- STRK (for Starknet compatibility)
- Any custom token

## Next Steps

### Phase 3.3: Yield Integration
- Deploy YieldAdapter for Aave/Compound
- Auto-invest in YIELD mode
- Recover yield on withdrawal

### Phase 3.4: Testing
- Create test suite with Foundry
- Test 2/2 approval flow
- Test edge cases (reverts, reentrancy, etc.)

### Phase 3.5: Frontend Integration
- Connect vaults to frontend
- Display on-chain balance vs off-chain tracking
- Sync contract events with backend

## Safety

- ✅ ReentrancyGuard on all state-changing functions
- ✅ SafeERC20 for token transfers
- ✅ Input validation on all public functions
- ✅ Clear access control patterns
- ✅ Event logging for auditing

(To-do: Formal audit before mainnet deployment)

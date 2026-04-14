// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IYieldAdapter
 * @dev Interface for lending protocol adapters (Aave, Compound, Venus, etc.)
 */
interface IYieldAdapter {
    /// @dev Deposit tokens to yield protocol
    function deposit(address token, uint256 amount) external;

    /// @dev Withdraw tokens from yield protocol
    function withdraw(address token, uint256 amount) external;

    /// @dev Get current balance of tokens in protocol
    function balanceOf(address token) external view returns (uint256);

    /// @dev Get current interest rate / APY
    function getAPY(address token) external view returns (uint256);
}

/**
 * @title IVault
 * @dev Base interface for all vaults
 */
interface IVault {
    enum VaultMode { IDLE, YIELD }

    /// @dev Deposit funds to vault
    function deposit(uint256 amount) external;

    /// @dev Withdraw funds from vault (may require approvals)
    function withdraw(uint256 amount) external;

    /// @dev Get total balance in vault
    function getBalance() external view returns (uint256);

    /// @dev Get user's contribution
    function getUserContribution(address user) external view returns (uint256);

    /// @dev Get current mode (idle or yield)
    function getMode() external view returns (VaultMode);
}

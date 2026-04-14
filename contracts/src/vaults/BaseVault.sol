// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IVault.sol";

/**
 * @title BaseVault
 * @dev Abstract base contract for all vault types
 */
abstract contract BaseVault is IVault, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public token;
    VaultMode public mode;
    
    string public vaultName;
    uint256 public targetAmount;
    uint256 public createdAt;
    
    // Contribution tracking
    mapping(address => uint256) public contributions;
    uint256 public totalBalance;

    // Events
    event Deposit(address indexed user, uint256 amount, uint256 newBalance);
    event Withdrawal(address indexed user, uint256 amount, uint256 newBalance);
    event ModeChanged(VaultMode newMode);

    constructor(
        address _token,
        string memory _name,
        uint256 _targetAmount,
        VaultMode _initialMode
    ) {
        require(_token != address(0), "Invalid token");
        token = IERC20(_token);
        vaultName = _name;
        targetAmount = _targetAmount;
        mode = _initialMode;
        createdAt = block.timestamp;
    }

    /**
     * @dev Deposit funds to vault
     * @param amount Amount to deposit
     */
    function deposit(uint256 amount) public virtual nonReentrant {
        require(amount > 0, "Amount must be > 0");
        
        // Transfer tokens from user to vault
        token.safeTransferFrom(msg.sender, address(this), amount);
        
        // Update tracking
        contributions[msg.sender] += amount;
        totalBalance += amount;
        
        emit Deposit(msg.sender, amount, totalBalance);
    }

    /**
     * @dev Withdraw funds from vault (implement in subclass)
     * @param amount Amount to withdraw
     */
    function withdraw(uint256 amount) public virtual nonReentrant {
        require(amount > 0, "Amount must be > 0");
        require(contributions[msg.sender] >= amount, "Insufficient contribution");
        
        // Update tracking
        contributions[msg.sender] -= amount;
        totalBalance -= amount;
        
        // Transfer tokens back to user
        token.safeTransfer(msg.sender, amount);
        
        emit Withdrawal(msg.sender, amount, totalBalance);
    }

    /**
     * @dev Get total balance in vault
     * @return Current balance of token in vault
     */
    function getBalance() public view returns (uint256) {
        return totalBalance;
    }

    /**
     * @dev Get user's contribution
     * @param user Address of user
     * @return User's contribution amount
     */
    function getUserContribution(address user) public view returns (uint256) {
        return contributions[user];
    }

    /**
     * @dev Get current mode
     * @return Current vault mode (IDLE or YIELD)
     */
    function getMode() public view returns (VaultMode) {
        return mode;
    }

    /**
     * @dev Switch vault mode
     * @param newMode New mode (IDLE or YIELD)
     */
    function setMode(VaultMode newMode) public virtual {
        require(newMode != mode, "Already in that mode");
        mode = newMode;
        emit ModeChanged(newMode);
    }
}

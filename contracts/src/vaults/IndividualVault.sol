// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./BaseVault.sol";

/**
 * @title IndividualVault
 * @dev Simple single-owner vault for personal savings
 * Owner has full control: deposit, withdraw, change mode
 */
contract IndividualVault is BaseVault {
    address public owner;
    uint256 public withdrawableAfter; // Time lock for early withdrawal penalty

    event OwnershipTransferred(address indexed newOwner);
    event WithdrawalPenalty(address indexed user, uint256 penaltyAmount);

    constructor(
        address _token,
        string memory _name,
        uint256 _targetAmount,
        address _owner,
        VaultMode _initialMode,
        uint256 _withdrawableAfter
    ) BaseVault(_token, _name, _targetAmount, _initialMode) {
        require(_owner != address(0), "Invalid owner");
        owner = _owner;
        withdrawableAfter = _withdrawableAfter;
    }

    /**
     * @dev Ensure caller is owner
     */
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    /**
     * @dev Override deposit to require owner
     * @param amount Amount to deposit
     */
    function deposit(uint256 amount) public override onlyOwner nonReentrant {
        super.deposit(amount);
    }

    /**
     * @dev Override withdraw to allow owner to withdraw
     * Apply early withdrawal penalty if before target date
     * @param amount Amount to withdraw
     */
    function withdraw(uint256 amount) public override onlyOwner nonReentrant {
        require(amount > 0, "Amount must be > 0");
        require(contributions[owner] >= amount, "Insufficient balance");

        uint256 penaltyAmount = 0;

        // Apply 2% penalty if withdrawn before target date
        if (block.timestamp < withdrawableAfter) {
            penaltyAmount = (amount * 2) / 100; // 2% penalty
            require(totalBalance >= amount, "Insufficient vault balance");
        }

        // Update balances
        contributions[owner] -= amount;
        totalBalance -= amount;

        // Transfer to owner (minus penalty)
        uint256 transferAmount = amount - penaltyAmount;
        token.safeTransfer(owner, transferAmount);

        if (penaltyAmount > 0) {
            emit WithdrawalPenalty(owner, penaltyAmount);
            // Penalty stays in vault or sent to treasury
        }

        emit Withdrawal(owner, transferAmount, totalBalance);
    }

    /**
     * @dev Override setMode to require owner
     * @param newMode New mode (IDLE or YIELD)
     */
    function setMode(VaultMode newMode) public override onlyOwner {
        super.setMode(newMode);
    }

    /**
     * @dev Transfer vault ownership
     * @param newOwner Address of new owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid new owner");
        owner = newOwner;
        emit OwnershipTransferred(newOwner);
    }

    /**
     * @dev Check if withdrawal time lock is satisfied
     * @return true if can withdraw without penalty
     */
    function isWithdrawableWithoutPenalty() external view returns (bool) {
        return block.timestamp >= withdrawableAfter;
    }
}

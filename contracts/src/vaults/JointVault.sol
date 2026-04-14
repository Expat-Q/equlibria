// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./BaseVault.sol";

/**
 * @title JointVault
 * @dev 2/2 multisig vault for joint household savings
 * Both partners must approve withdrawals and critical actions
 */
contract JointVault is BaseVault {
    using SafeERC20 for IERC20;

    address public partner1;
    address public partner2;
    
    bool public partner1Accepted;
    bool public partner2Accepted;

    // Withdrawal request tracking
    struct WithdrawalRequest {
        uint256 id;
        address requester;
        uint256 amount;
        bool partner1Approved;
        bool partner2Approved;
        bool executed;
        uint256 createdAt;
    }

    mapping(uint256 => WithdrawalRequest) public withdrawalRequests;
    uint256 public withdrawalRequestCount;

    // Events
    event PartnerAccepted(address indexed partner);
    event WithdrawalRequested(uint256 indexed requestId, address indexed requester, uint256 amount);
    event WithdrawalApproved(uint256 indexed requestId, address indexed approver);
    event WithdrawalRejected(uint256 indexed requestId, address indexed rejector);
    event WithdrawalExecuted(uint256 indexed requestId, address indexed recipient, uint256 amount);

    constructor(
        address _token,
        string memory _name,
        uint256 _targetAmount,
        address _partner1,
        address _partner2,
        VaultMode _initialMode
    ) BaseVault(_token, _name, _targetAmount, _initialMode) {
        require(_partner1 != address(0) && _partner2 != address(0), "Invalid partners");
        require(_partner1 != _partner2, "Partners must be different");
        
        partner1 = _partner1;
        partner2 = _partner2;
        partner1Accepted = false;
        partner2Accepted = false;
    }

    /**
     * @dev Partner accepts the vault invitation
     */
    function acceptPartnership() external {
        require(msg.sender == partner1 || msg.sender == partner2, "Not a partner");
        
        if (msg.sender == partner1) {
            partner1Accepted = true;
        } else {
            partner2Accepted = true;
        }
        
        emit PartnerAccepted(msg.sender);
    }

    /**
     * @dev Check if both partners have accepted
     * @return true if both have accepted
     */
    function isFullyAccepted() public view returns (bool) {
        return partner1Accepted && partner2Accepted;
    }

    /**
     * @dev Request a withdrawal (only for accepted partnerships)
     * @param amount Amount to withdraw
     **/
    function requestWithdrawal(uint256 amount) external returns (uint256) {
        require(isFullyAccepted(), "Partnership not fully accepted");
        require(msg.sender == partner1 || msg.sender == partner2, "Not a partner");
        require(amount > 0, "Amount must be > 0");
        require(contributions[msg.sender] >= amount, "Insufficient contribution");

        uint256 requestId = withdrawalRequestCount++;
        WithdrawalRequest storage req = withdrawalRequests[requestId];
        
        req.id = requestId;
        req.requester = msg.sender;
        req.amount = amount;
        req.createdAt = block.timestamp;

        emit WithdrawalRequested(requestId, msg.sender, amount);
        return requestId;
    }

    /**
     * @dev Approve a withdrawal request
     * @param requestId ID of withdrawal request
     */
    function approveWithdrawal(uint256 requestId) external {
        require(msg.sender == partner1 || msg.sender == partner2, "Not a partner");
        
        WithdrawalRequest storage req = withdrawalRequests[requestId];
        require(!req.executed, "Already executed");
        require(req.amount > 0, "Invalid request");

        if (msg.sender == partner1) {
            req.partner1Approved = true;
        } else {
            req.partner2Approved = true;
        }

        emit WithdrawalApproved(requestId, msg.sender);

        // Auto-execute if both approved
        if (req.partner1Approved && req.partner2Approved) {
            _executeWithdrawal(requestId);
        }
    }

    /**
     * @dev Reject a withdrawal request
     * @param requestId ID of withdrawal request
     */
    function rejectWithdrawal(uint256 requestId) external {
        require(msg.sender == partner1 || msg.sender == partner2, "Not a partner");
        
        WithdrawalRequest storage req = withdrawalRequests[requestId];
        require(!req.executed, "Already executed");

        req.executed = true; // Mark as processed
        emit WithdrawalRejected(requestId, msg.sender);
    }

    /**
     * @dev Internal function to execute withdrawal after both approvals
     * @param requestId ID of withdrawal request
     */
    function _executeWithdrawal(uint256 requestId) internal {
        WithdrawalRequest storage req = withdrawalRequests[requestId];
        require(req.partner1Approved && req.partner2Approved, "Not approved by both");
        require(!req.executed, "Already executed");

        req.executed = true;

        // Update balances
        contributions[req.requester] -= req.amount;
        totalBalance -= req.amount;

        // Transfer tokens
        token.safeTransfer(req.requester, req.amount);

        emit WithdrawalExecuted(requestId, req.requester, req.amount);
    }

    /**
     * @dev Get withdrawal request details
     * @param requestId ID of withdrawal request
     * @return The withdrawal request struct
     */
    function getWithdrawalRequest(uint256 requestId) 
        external 
        view 
        returns (WithdrawalRequest memory) 
    {
        return withdrawalRequests[requestId];
    }

    /**
     * @dev Override deposit to require partnership acceptance
     * @param amount Amount to deposit
     */
    function deposit(uint256 amount) public override nonReentrant {
        require(isFullyAccepted(), "Partnership not fully accepted");
        super.deposit(amount);
    }

    /**
     * @dev Override withdraw to prevent direct withdrawals (use requestWithdrawal instead)
     */
    function withdraw(uint256 amount) public override pure {
        amount; // Prevent unused variable warning
        revert("Use requestWithdrawal instead");
    }
}

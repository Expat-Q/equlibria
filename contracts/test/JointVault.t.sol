// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../src/VaultFactory.sol";
import "../src/vaults/JointVault.sol";

/**
 * @title MockToken
 * @dev Mock ERC20 for testing
 */
contract MockToken is ERC20 {
    constructor() ERC20("Mock USDC", "mUSDC") {
        _mint(msg.sender, 10000e18);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/**
 * @title JointVaultTest
 * @dev Tests for 2/2 multisig joint vault
 */
contract JointVaultTest is Test {
    VaultFactory factory;
    MockToken token;

    address partner1 = address(0x1);
    address partner2 = address(0x2);
    address attacker = address(0x3);

    function setUp() public {
        // Deploy token
        token = new MockToken();

        // Deploy implementations
        JointVault jointImpl = new JointVault(
            address(0),
            "",
            0,
            address(0),
            address(0),
            IVault.VaultMode.IDLE
        );

        IndividualVault individualImpl = new IndividualVault(
            address(0),
            "",
            0,
            address(0),
            IVault.VaultMode.IDLE,
            0
        );

        // Deploy factory
        factory = new VaultFactory(address(jointImpl), address(individualImpl));

        // Mint tokens to partners
        token.mint(partner1, 1000e18);
        token.mint(partner2, 1000e18);
    }

    function test_CreateJointVault() public {
        address vault = factory.createJointVault(
            address(token),
            "Vacation Fund",
            5000e18,
            partner1,
            partner2,
            IVault.VaultMode.IDLE
        );

        assertTrue(factory.isVault(vault), "Vault not registered");
        assert(vault != address(0));
    }

    function test_JointVault_2of2_Approval_Flow() public {
        // Create vault
        address vaultAddr = factory.createJointVault(
            address(token),
            "Vacation Fund",
            5000e18,
            partner1,
            partner2,
            IVault.VaultMode.IDLE
        );

        JointVault vault = JointVault(vaultAddr);

        // Partner 1 and 2 must accept first
        vm.prank(partner1);
        vault.acceptPartnership();

        vm.prank(partner2);
        vault.acceptPartnership();

        assertTrue(vault.isFullyAccepted(), "Partnership should be fully accepted");

        // Partner 1 deposits
        vm.prank(partner1);
        token.approve(vaultAddr, 100e18);
        vault.deposit(100e18);

        assertEq(vault.getBalance(), 100e18, "Vault balance should be 100");
        assertEq(
            vault.getUserContribution(partner1),
            100e18,
            "Partner1 contribution should be 100"
        );

        // Partner 1 requests withdrawal
        vm.prank(partner1);
        uint256 requestId = vault.requestWithdrawal(50e18);

        JointVault.WithdrawalRequest memory req = vault.getWithdrawalRequest(
            requestId
        );
        assertEq(req.amount, 50e18, "Request amount should be 50");
        assertFalse(req.partner1Approved, "Partner 1 should not be auto-approved");
        assertFalse(req.partner2Approved, "Partner 2 should not be approved");

        // Partner 2 approves (first approval)
        vm.prank(partner2);
        vault.approveWithdrawal(requestId);

        req = vault.getWithdrawalRequest(requestId);
        assertTrue(req.partner2Approved, "Partner 2 should be approved");
        assertFalse(req.executed, "Should not execute with only one approval");

        // Partner 1 approves (second approval - should auto-execute)
        vm.prank(partner1);
        vault.approveWithdrawal(requestId);

        req = vault.getWithdrawalRequest(requestId);
        assertTrue(req.executed, "Should be executed with both approvals");
        assertEq(vault.getBalance(), 50e18, "Vault balance should now be 50");
    }

    function test_JointVault_Rejection_Flow() public {
        address vaultAddr = factory.createJointVault(
            address(token),
            "Rent Fund",
            3000e18,
            partner1,
            partner2,
            IVault.VaultMode.IDLE
        );

        JointVault vault = JointVault(vaultAddr);

        // Accept partnership
        vm.prank(partner1);
        vault.acceptPartnership();
        vm.prank(partner2);
        vault.acceptPartnership();

        // Deposit
        vm.prank(partner1);
        token.approve(vaultAddr, 200e18);
        vault.deposit(200e18);

        // Request withdrawal
        vm.prank(partner1);
        uint256 requestId = vault.requestWithdrawal(100e18);

        // Partner 2 rejects
        vm.prank(partner2);
        vault.rejectWithdrawal(requestId);

        JointVault.WithdrawalRequest memory req = vault.getWithdrawalRequest(
            requestId
        );
        assertTrue(req.executed, "Request marked as processed");
        assertEq(vault.getBalance(), 200e18, "Vault balance unchanged after rejection");
    }

    function test_JointVault_Unauthorized_Deposit() public {
        address vaultAddr = factory.createJointVault(
            address(token),
            "Vacation Fund",
            5000e18,
            partner1,
            partner2,
            IVault.VaultMode.IDLE
        );

        JointVault vault = JointVault(vaultAddr);

        // Attacker tries to deposit (should fail - not accepted)
        vm.prank(attacker);
        token.approve(vaultAddr, 100e18);

        vm.prank(attacker);
        vm.expectRevert("Partnership not fully accepted");
        vault.deposit(100e18);

        // Even if accepted, non-partner can't deposit (only accepted deposits work)
        vm.prank(partner1);
        vault.acceptPartnership();
        vm.prank(partner2);
        vault.acceptPartnership();

        // Attacker still can't deposit (address not in vault)
        vm.prank(attacker);
        token.approve(vaultAddr, 100e18);
        vm.prank(attacker);
        vm.expectRevert();
        vault.deposit(100e18);
    }

    function test_JointVault_Direct_Withdraw_Reverts() public {
        address vaultAddr = factory.createJointVault(
            address(token),
            "Vacation Fund",
            5000e18,
            partner1,
            partner2,
            IVault.VaultMode.IDLE
        );

        JointVault vault = JointVault(vaultAddr);

        vm.prank(partner1);
        vault.acceptPartnership();
        vm.prank(partner2);
        vault.acceptPartnership();

        // Deposit
        vm.prank(partner1);
        token.approve(vaultAddr, 100e18);
        vault.deposit(100e18);

        // Try to call withdraw directly (should revert)
        vm.prank(partner1);
        vm.expectRevert("Use requestWithdrawal instead");
        vault.withdraw(50e18);
    }

    function test_Cannot_Exceed_Contribution() public {
        address vaultAddr = factory.createJointVault(
            address(token),
            "Fund",
            1000e18,
            partner1,
            partner2,
            IVault.VaultMode.IDLE
        );

        JointVault vault = JointVault(vaultAddr);

        vm.prank(partner1);
        vault.acceptPartnership();
        vm.prank(partner2);
        vault.acceptPartnership();

        // Partner 1 deposits 50
        vm.prank(partner1);
        token.approve(vaultAddr, 50e18);
        vault.deposit(50e18);

        // Try to request withdrawal of more than contribution
        vm.prank(partner1);
        vm.expectRevert("Insufficient contribution");
        vault.requestWithdrawal(100e18);
    }
}

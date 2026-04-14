// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "./JointVault.sol";
import "./IndividualVault.sol";

/**
 * @title VaultFactory
 * @dev Factory for creating and tracking vaults
 * Maintains registry of all vaults for easy discovery
 */
contract VaultFactory {
    using Clones for address;

    // Implementation addresses
    address public jointVaultImplementation;
    address public individualVaultImplementation;

    // Vault registry
    address[] public allVaults;
    mapping(address => address[]) public userVaults; // User -> list of vaults
    mapping(address => bool) public isVault; // Quick lookup

    // Events
    event JointVaultCreated(
        address indexed vaultAddress,
        address indexed partner1,
        address indexed partner2,
        address token,
        string name
    );

    event IndividualVaultCreated(
        address indexed vaultAddress,
        address indexed owner,
        address token,
        string name
    );

    constructor(
        address _jointVaultImpl,
        address _individualVaultImpl
    ) {
        jointVaultImplementation = _jointVaultImpl;
        individualVaultImplementation = _individualVaultImpl;
    }

    /**
     * @dev Create a new joint vault
     * @param token Address of ERC20 token
     * @param name Vault name
     * @param targetAmount Target savings amount
     * @param partner1 First partner address
     * @param partner2 Second partner address
     * @param initialMode IDLE or YIELD mode
     * @return vault Address of created vault
     */
    function createJointVault(
        address token,
        string memory name,
        uint256 targetAmount,
        address partner1,
        address partner2,
        IVault.VaultMode initialMode
    ) external returns (address vault) {
        require(token != address(0), "Invalid token");
        require(partner1 != address(0) && partner2 != address(0), "Invalid partners");
        require(partner1 != partner2, "Partners must be different");

        // Deploy vault via clone
        vault = jointVaultImplementation.clone();

        // Initialize vault
        JointVault(vault).constructor(
            token,
            name,
            targetAmount,
            partner1,
            partner2,
            initialMode
        );

        // Register vault
        _registerVault(vault, partner1, partner2);

        emit JointVaultCreated(vault, partner1, partner2, token, name);
        return vault;
    }

    /**
     * @dev Create a new individual vault
     * @param token Address of ERC20 token
     * @param name Vault name
     * @param targetAmount Target savings amount
     * @param owner Owner address
     * @param initialMode IDLE or YIELD mode
     * @param withdrawableAfter Timestamp after which can withdraw without penalty
     * @return vault Address of created vault
     */
    function createIndividualVault(
        address token,
        string memory name,
        uint256 targetAmount,
        address owner,
        IVault.VaultMode initialMode,
        uint256 withdrawableAfter
    ) external returns (address vault) {
        require(token != address(0), "Invalid token");
        require(owner != address(0), "Invalid owner");

        // Deploy vault via clone
        vault = individualVaultImplementation.clone();

        // Initialize vault
        IndividualVault(vault).constructor(
            token,
            name,
            targetAmount,
            owner,
            initialMode,
            withdrawableAfter
        );

        // Register vault
        _registerVault(vault, owner, address(0));

        emit IndividualVaultCreated(vault, owner, token, name);
        return vault;
    }

    /**
     * @dev Internal function to register vault
     * @param vault Vault address
     * @param user1 First user
     * @param user2 Second user (optional)
     */
    function _registerVault(address vault, address user1, address user2) internal {
        allVaults.push(vault);
        isVault[vault] = true;

        userVaults[user1].push(vault);
        if (user2 != address(0)) {
            userVaults[user2].push(vault);
        }
    }

    /**
     * @dev Get vaults for a user
     * @param user User address
     * @return Array of vault addresses
     */
    function getUserVaults(address user) external view returns (address[] memory) {
        return userVaults[user];
    }

    /**
     * @dev Get total vault count
     * @return Number of vaults created
     */
    function getVaultCount() external view returns (uint256) {
        return allVaults.length;
    }

    /**
     * @dev Get all vaults
     * @return Array of all vault addresses
     */
    function getAllVaults() external view returns (address[] memory) {
        return allVaults;
    }
}

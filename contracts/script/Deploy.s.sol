// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/VaultFactory.sol";
import "../src/vaults/JointVault.sol";
import "../src/vaults/IndividualVault.sol";

/**
 * @title Deploy
 * @dev Script to deploy contract implementations and factory
 * Usage: forge script script/Deploy.s.sol --rpc-url <network> --broadcast
 */
contract Deploy is Script {
    function run() external {
        vm.startBroadcast();

        // Deploy implementations
        JointVault jointImpl = new JointVault(
            address(0), // token (dummy)
            "", // name
            0, // targetAmount
            address(0), // partner1
            address(0), // partner2
            IVault.VaultMode.IDLE
        );

        IndividualVault individualImpl = new IndividualVault(
            address(0), // token
            "", // name
            0, // targetAmount
            address(0), // owner
            IVault.VaultMode.IDLE,
            0 // withdrawableAfter
        );

        // Deploy factory
        VaultFactory factory = new VaultFactory(
            address(jointImpl),
            address(individualImpl)
        );

        vm.stopBroadcast();

        // Log addresses
        console.log("JointVault implementation:", address(jointImpl));
        console.log("IndividualVault implementation:", address(individualImpl));
        console.log("VaultFactory:", address(factory));
    }
}

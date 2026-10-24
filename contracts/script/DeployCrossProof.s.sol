// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {SourceBridge} from "../src/SourceBridge.sol";
import {DevHeaderOracle} from "../src/verifiers/DevHeaderOracle.sol";
import {ReceiptVerifier} from "../src/verifiers/ReceiptVerifier.sol";
import {DestinationVerifier} from "../src/DestinationVerifier.sol";
import {CrossProofReceiver} from "../src/receivers/CrossProofReceiver.sol";

contract DeployCrossProof is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envOr(
            "DEPLOYER_PRIVATE_KEY",
            uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80)
        );

        address deployer = vm.addr(deployerPrivateKey);
        console.log("Deployer:", deployer);
        console.log("Current chain ID:", block.chainid);

        vm.startBroadcast(deployerPrivateKey);

        // If on source chain (31337)
        if (block.chainid == 31337) {
            SourceBridge bridge = new SourceBridge();
            console.log("SourceBridge deployed at:", address(bridge));
        }
        // If on destination chain (31338) or all-in-one local test
        else {
            DevHeaderOracle oracle = new DevHeaderOracle(deployer);
            ReceiptVerifier receiptVer = new ReceiptVerifier();
            DestinationVerifier destVer = new DestinationVerifier(
                address(oracle),
                address(receiptVer)
            );
            CrossProofReceiver receiver = new CrossProofReceiver(address(destVer));

            console.log("DevHeaderOracle deployed at:", address(oracle));
            console.log("ReceiptVerifier deployed at:", address(receiptVer));
            console.log("DestinationVerifier deployed at:", address(destVer));
            console.log("CrossProofReceiver deployed at:", address(receiver));
        }

        vm.stopBroadcast();
    }
}

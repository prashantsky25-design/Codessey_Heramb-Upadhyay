// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IHeaderVerifier} from "../interfaces/IHeaderVerifier.sol";

/**
 * @title DevHeaderOracle
 * @notice Development-mode header oracle for local demonstration (MODE A).
 * @dev TRUST ASSUMPTION NOTICE:
 * This verifier relies on an authorized relayer to post authenticated source-chain block headers
 * and receiptsRoots. It is NOT trustless and must be replaced by LightClientHeaderVerifier (MODE B)
 * for production cross-chain consensus verification.
 */
contract DevHeaderOracle is IHeaderVerifier {
    struct HeaderRecord {
        bytes32 blockHash;
        bytes32 receiptsRoot;
        uint256 committedAt;
        address relayer;
    }

    address public owner;
    mapping(address => bool) public authorizedRelayers;
    // sourceChainId => blockNumber => HeaderRecord
    mapping(uint256 => mapping(uint256 => HeaderRecord)) public committedHeaders;

    event HeaderCommitted(
        uint256 indexed sourceChainId,
        uint256 indexed blockNumber,
        bytes32 indexed blockHash,
        bytes32 receiptsRoot,
        address relayer
    );
    event RelayerUpdated(address indexed relayer, bool authorized);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    error Unauthorized();
    error ZeroAddress();
    error HeaderNotFound(uint256 chainId, uint256 blockNumber);
    error BlockHashMismatch(bytes32 expected, bytes32 actual);
    error ReceiptsRootMismatch(bytes32 expected, bytes32 actual);

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier onlyRelayer() {
        if (!authorizedRelayers[msg.sender] && msg.sender != owner) revert Unauthorized();
        _;
    }

    constructor(address initialRelayer) {
        owner = msg.sender;
        if (initialRelayer != address(0)) {
            authorizedRelayers[initialRelayer] = true;
            emit RelayerUpdated(initialRelayer, true);
        }
    }

    function setRelayer(address relayer, bool authorized) external onlyOwner {
        if (relayer == address(0)) revert ZeroAddress();
        authorizedRelayers[relayer] = authorized;
        emit RelayerUpdated(relayer, authorized);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    /**
     * @notice Commits a source-chain block header and its receiptsRoot
     */
    function commitSourceHeader(
        uint256 sourceChainId,
        uint256 blockNumber,
        bytes32 blockHash,
        bytes32 receiptsRoot
    ) external onlyRelayer {
        committedHeaders[sourceChainId][blockNumber] = HeaderRecord({
            blockHash: blockHash,
            receiptsRoot: receiptsRoot,
            committedAt: block.timestamp,
            relayer: msg.sender
        });

        emit HeaderCommitted(sourceChainId, blockNumber, blockHash, receiptsRoot, msg.sender);
    }

    /**
     * @notice Verifies if the source header matches committed records
     */
    function verifySourceHeader(
        uint256 sourceChainId,
        uint256 blockNumber,
        bytes32 blockHash,
        bytes32 receiptsRoot,
        bytes calldata /* headerProof */
    ) external view override returns (bool) {
        HeaderRecord memory rec = committedHeaders[sourceChainId][blockNumber];
        if (rec.committedAt == 0) {
            revert HeaderNotFound(sourceChainId, blockNumber);
        }
        if (rec.blockHash != blockHash) {
            revert BlockHashMismatch(rec.blockHash, blockHash);
        }
        if (rec.receiptsRoot != receiptsRoot) {
            revert ReceiptsRootMismatch(rec.receiptsRoot, receiptsRoot);
        }
        return true;
    }

    function getTrustModel() external pure override returns (string memory) {
        return "MODE_A_DEV_HEADER_ORACLE: Relies on authorized relayer header publication";
    }
}

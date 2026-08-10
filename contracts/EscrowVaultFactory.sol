// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {EscrowVault, VaultInit} from "./EscrowVault.sol";

/// @notice Permissionless factory with no ability to administer a deployed vault.
contract EscrowVaultFactory {
    bytes32 private constant APPROVAL_TYPEHASH = keccak256("ContractAcceptance(bytes32 contractHash)");
    bytes32 private constant DOMAIN_TYPEHASH = keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
    bytes32 private constant NAME_HASH = keccak256("PactFlow");
    bytes32 private constant VERSION_HASH = keccak256("1");

    mapping(bytes32 => address) public vaultForContract;

    event VaultCreated(bytes32 indexed contractHash, address indexed vault, address indexed creator);

    function contractHash(VaultInit calldata init) public pure returns (bytes32) {
        return keccak256(abi.encode(
            address(init.token), init.buyer, init.seller, init.resolver, init.feeRecipient, init.feeBps,
            init.versionHash, init.acceptanceDeadline, init.fundingDeadline, keccak256(abi.encode(init.amounts)),
            keccak256(abi.encode(init.deadlines)), keccak256(abi.encode(init.reviewWindows))
        ));
    }

    function approvalDigest(bytes32 hash) public view returns (bytes32) {
        bytes32 domain = keccak256(abi.encode(DOMAIN_TYPEHASH, NAME_HASH, VERSION_HASH, block.chainid, address(this)));
        return keccak256(abi.encodePacked("\x19\x01", domain, keccak256(abi.encode(APPROVAL_TYPEHASH, hash))));
    }

    function createVault(
        VaultInit calldata init,
        bytes calldata buyerSignature,
        bytes calldata sellerSignature
    ) external returns (EscrowVault vault) {
        require(init.versionHash != bytes32(0), "version hash required");
        require(block.timestamp <= init.acceptanceDeadline, "acceptance expired");
        bytes32 hash = contractHash(init);
        require(vaultForContract[hash] == address(0), "vault already exists");
        bytes32 digest = approvalDigest(hash);
        require(_recover(digest, buyerSignature) == init.buyer && _recover(digest, sellerSignature) == init.seller, "invalid approval");
        require(msg.sender == init.buyer || msg.sender == init.seller, "signed participant only");

        vault = new EscrowVault(init);
        vaultForContract[hash] = address(vault);
        emit VaultCreated(hash, address(vault), msg.sender);
    }

    function _recover(bytes32 digest, bytes calldata signature) private pure returns (address) {
        if (signature.length != 65) return address(0);
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 32))
            v := byte(0, calldataload(add(signature.offset, 64)))
        }
        if (v < 27) v += 27;
        if (v != 27 && v != 28 || uint256(s) > 0x7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0) return address(0);
        return ecrecover(digest, v, r, s);
    }
}

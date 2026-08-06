// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transfer(address to, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

struct VaultInit {
    IERC20 token;
    address buyer;
    address seller;
    address resolver;
    address feeRecipient;
    uint16 feeBps;
    bytes32 versionHash;
    uint64 fundingDeadline;
    uint256[] amounts;
    uint64[] deadlines;
    uint32[] reviewWindows;
}

/// @notice An unfunded, non-administered vault bound to one approved agreement version.
contract EscrowVault {
    enum AgreementState { Unfunded }
    struct Milestone {
        uint256 amount;
        uint64 deliveryDeadline;
        uint32 reviewSeconds;
    }

    IERC20 public immutable token;
    address public immutable buyer;
    address public immutable seller;
    address public immutable resolver;
    address public immutable feeRecipient;
    uint16 public immutable feeBps;
    bytes32 public immutable agreementVersionHash;
    uint64 public immutable fundingDeadline;
    uint256 public immutable allocationTotal;
    AgreementState public constant agreementState = AgreementState.Unfunded;
    Milestone[] private milestones;

    constructor(VaultInit memory init) {
        require(address(init.token) != address(0) && init.buyer != address(0) && init.seller != address(0) && init.resolver != address(0), "zero role");
        require(init.versionHash != bytes32(0), "version hash required");
        require(init.buyer != init.seller && init.buyer != init.resolver && init.seller != init.resolver, "roles differ");
        require(init.amounts.length >= 2 && init.amounts.length <= 3 && init.amounts.length == init.deadlines.length && init.amounts.length == init.reviewWindows.length, "invalid milestones");
        require(init.feeBps <= 10_000 && (init.feeBps == 0 || init.feeRecipient != address(0)), "invalid fee");

        token = init.token;
        buyer = init.buyer;
        seller = init.seller;
        resolver = init.resolver;
        feeRecipient = init.feeRecipient;
        feeBps = init.feeBps;
        agreementVersionHash = init.versionHash;
        fundingDeadline = init.fundingDeadline;

        uint256 total;
        uint64 previousDeadline;
        for (uint256 i; i < init.amounts.length; i++) {
            require(init.amounts[i] > 0 && init.deadlines[i] > previousDeadline && init.reviewWindows[i] >= 1 days && init.reviewWindows[i] <= 7 days, "invalid rule");
            milestones.push(Milestone(init.amounts[i], init.deadlines[i], init.reviewWindows[i]));
            total += init.amounts[i];
            previousDeadline = init.deadlines[i];
        }
        allocationTotal = total;
    }

    function milestoneCount() external view returns (uint256) {
        return milestones.length;
    }

    function milestone(uint256 index) external view returns (Milestone memory) {
        return milestones[index];
    }
}

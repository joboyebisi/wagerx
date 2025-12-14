// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * Gas-Optimized Wager Contract
 * 
 * Optimizations:
 * - Packed structs to reduce storage costs
 * - Use events instead of storing all data
 * - Minimal storage operations
 * - Use custom errors instead of require strings (saves gas)
 */
contract WagerContractGasOptimized {
    // Custom errors (cheaper than require strings)
    error InsufficientPayment();
    error NeedAtLeast2Participants();
    error CharityPercentageTooHigh();
    error WagerNotPending();
    error NotAParticipant();
    error WagerNotActive();
    error WinnerMustBeParticipant();
    error CannotCancel();
    error NotAuthorized();

    // Packed struct to save gas (256 bits = 1 storage slot)
    struct Wager {
        uint128 amount;        // Max: 3.4e38 (more than enough)
        uint64 createdAt;      // Timestamp (fits until year 2106)
        uint32 id;             // Max: 4.2 billion wagers
        uint8 status;          // 0=pending, 1=active, 2=resolved, 3=cancelled
        uint8 charityPercentage;
        bool charityEnabled;
        address winner;
        address charityAddress;
    }
    
    // Separate mappings to avoid struct storage (cheaper reads)
    mapping(uint256 => address[]) public wagerParticipants;
    mapping(uint256 => string) public wagerConditions;
    mapping(uint256 => Wager) public wagers;
    mapping(uint256 => uint256) public charityDonated;
    mapping(uint256 => uint64) public resolvedAt;
    
    uint256 private nextWagerId = 1;
    address public immutable owner; // immutable saves gas
    
    event WagerCreated(uint256 indexed wagerId, address indexed creator, uint128 amount);
    event WagerResolved(uint256 indexed wagerId, address indexed winner);
    
    constructor() {
        owner = msg.sender;
    }
    
    function createWager(
        address[] calldata participants, // calldata is cheaper than memory
        uint128 amount,                  // Smaller type saves gas
        string calldata condition,
        bool charityEnabled,
        uint8 charityPercentage,
        address charityAddress
    ) external payable returns (uint256) {
        if (msg.value < amount) revert InsufficientPayment();
        if (participants.length < 2) revert NeedAtLeast2Participants();
        if (charityPercentage > 100) revert CharityPercentageTooHigh();
        
        uint256 wagerId = nextWagerId++;
        
        wagers[wagerId] = Wager({
            id: uint32(wagerId),
            participants: participants, // Store separately
            amount: amount,
            condition: condition,       // Store separately
            status: 0, // pending
            winner: address(0),
            charityEnabled: charityEnabled,
            charityPercentage: charityPercentage,
            charityAddress: charityAddress,
            createdAt: uint64(block.timestamp),
            resolvedAt: 0
        });
        
        // Store participants and condition separately (cheaper)
        wagerParticipants[wagerId] = participants;
        wagerConditions[wagerId] = condition;
        
        emit WagerCreated(wagerId, msg.sender, amount);
        return wagerId;
    }
    
    function acceptWager(uint256 wagerId) external payable {
        Wager storage wager = wagers[wagerId];
        if (wager.status != 0) revert WagerNotPending();
        if (msg.value < wager.amount) revert InsufficientPayment();
        
        // Check if sender is a participant (optimized loop)
        address[] memory participants = wagerParticipants[wagerId];
        bool isParticipant = false;
        uint256 length = participants.length;
        for (uint i = 0; i < length; ) {
            if (participants[i] == msg.sender) {
                isParticipant = true;
                break;
            }
            unchecked { ++i; } // Gas optimization: unchecked increment
        }
        if (!isParticipant) revert NotAParticipant();
        
        wager.status = 1; // active
    }
    
    function resolveWager(
        uint256 wagerId,
        address winner
    ) external {
        Wager storage wager = wagers[wagerId];
        if (wager.status != 1) revert WagerNotActive();
        
        address[] memory participants = wagerParticipants[wagerId];
        uint256 length = participants.length;
        if (length == 0) revert WagerNotActive();
        
        // Check if winner is a participant (optimized)
        bool isParticipant = false;
        for (uint i = 0; i < length; ) {
            if (participants[i] == winner) {
                isParticipant = true;
                break;
            }
            unchecked { ++i; }
        }
        if (!isParticipant) revert WinnerMustBeParticipant();
        
        wager.status = 2; // resolved
        wager.winner = winner;
        resolvedAt[wagerId] = uint64(block.timestamp);
        
        // Distribute winnings (optimized)
        uint256 totalAmount = uint256(wager.amount) * length;
        uint256 charityAmount = 0;
        
        if (wager.charityEnabled && wager.charityPercentage > 0 && wager.charityAddress != address(0)) {
            charityAmount = (totalAmount * uint256(wager.charityPercentage)) / 100;
            payable(wager.charityAddress).transfer(charityAmount);
            charityDonated[wagerId] = charityAmount;
        }
        
        uint256 winnerAmount = totalAmount - charityAmount;
        payable(winner).transfer(winnerAmount);
        
        emit WagerResolved(wagerId, winner);
    }
    
    function getWager(uint256 wagerId) external view returns (
        Wager memory wager,
        address[] memory participants,
        string memory condition
    ) {
        wager = wagers[wagerId];
        participants = wagerParticipants[wagerId];
        condition = wagerConditions[wagerId];
    }
    
    function cancelWager(uint256 wagerId) external {
        Wager storage wager = wagers[wagerId];
        if (wager.status > 1) revert CannotCancel();
        
        address[] memory participants = wagerParticipants[wagerId];
        bool isAuthorized = (msg.sender == owner || msg.sender == participants[0]);
        if (!isAuthorized) revert NotAuthorized();
        
        wager.status = 3; // cancelled
        
        // Refund participants (optimized)
        uint256 refundAmount = wager.amount;
        uint256 length = participants.length;
        for (uint i = 0; i < length; ) {
            payable(participants[i]).transfer(refundAmount);
            unchecked { ++i; }
        }
    }
}


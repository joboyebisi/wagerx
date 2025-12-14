// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract WagerContract {
    struct Wager {
        uint256 id;
        address[] participants;
        uint256 amount;
        string condition;
        uint8 status; // 0=pending, 1=active, 2=resolved, 3=cancelled
        address winner;
        bool charityEnabled;
        uint8 charityPercentage;
        address charityAddress;
        uint256 charityDonated;
        uint256 createdAt;
        uint256 resolvedAt;
    }
    
    mapping(uint256 => Wager) public wagers;
    uint256 private nextWagerId = 1;
    address public owner;
    
    event WagerCreated(uint256 indexed wagerId, address indexed creator, uint256 amount);
    event WagerResolved(uint256 indexed wagerId, address indexed winner);
    
    constructor() {
        owner = msg.sender;
    }
    
    function createWager(
        address[] memory participants,
        uint256 amount,
        string memory condition,
        bool charityEnabled,
        uint8 charityPercentage,
        address charityAddress
    ) external payable returns (uint256) {
        require(msg.value >= amount, "Insufficient payment");
        require(participants.length >= 2, "Need at least 2 participants");
        require(charityPercentage <= 100, "Charity percentage too high");
        
        uint256 wagerId = nextWagerId++;
        wagers[wagerId] = Wager({
            id: wagerId,
            participants: participants,
            amount: amount,
            condition: condition,
            status: 0, // pending
            winner: address(0),
            charityEnabled: charityEnabled,
            charityPercentage: charityPercentage,
            charityAddress: charityAddress,
            charityDonated: 0,
            createdAt: block.timestamp,
            resolvedAt: 0
        });
        
        emit WagerCreated(wagerId, msg.sender, amount);
        return wagerId;
    }
    
    function acceptWager(uint256 wagerId) external payable {
        Wager storage wager = wagers[wagerId];
        require(wager.status == 0, "Wager not pending");
        require(msg.value >= wager.amount, "Insufficient payment");
        
        // Check if sender is a participant
        bool isParticipant = false;
        for (uint i = 0; i < wager.participants.length; i++) {
            if (wager.participants[i] == msg.sender) {
                isParticipant = true;
                break;
            }
        }
        require(isParticipant, "Not a participant");
        
        wager.status = 1; // active
    }
    
    function resolveWager(
        uint256 wagerId,
        address winner,
        string memory evidence
    ) external {
        Wager storage wager = wagers[wagerId];
        require(wager.status == 1, "Wager not active");
        require(wager.participants.length > 0, "Invalid wager");
        
        // Check if winner is a participant
        bool isParticipant = false;
        for (uint i = 0; i < wager.participants.length; i++) {
            if (wager.participants[i] == winner) {
                isParticipant = true;
                break;
            }
        }
        require(isParticipant, "Winner must be a participant");
        
        wager.status = 2; // resolved
        wager.winner = winner;
        wager.resolvedAt = block.timestamp;
        
        // Distribute winnings
        uint256 totalAmount = wager.amount * wager.participants.length;
        uint256 charityAmount = 0;
        
        if (wager.charityEnabled && wager.charityPercentage > 0 && wager.charityAddress != address(0)) {
            charityAmount = (totalAmount * wager.charityPercentage) / 100;
            payable(wager.charityAddress).transfer(charityAmount);
            wager.charityDonated = charityAmount;
        }
        
        uint256 winnerAmount = totalAmount - charityAmount;
        payable(winner).transfer(winnerAmount);
        
        emit WagerResolved(wagerId, winner);
    }
    
    function getWager(uint256 wagerId) external view returns (Wager memory) {
        return wagers[wagerId];
    }
    
    function cancelWager(uint256 wagerId) external {
        Wager storage wager = wagers[wagerId];
        require(wager.status == 0 || wager.status == 1, "Cannot cancel");
        require(msg.sender == owner || msg.sender == wager.participants[0], "Not authorized");
        
        wager.status = 3; // cancelled
        
        // Refund participants
        for (uint i = 0; i < wager.participants.length; i++) {
            payable(wager.participants[i]).transfer(wager.amount);
        }
    }
}


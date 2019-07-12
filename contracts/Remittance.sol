pragma solidity 0.5.5;

import "./Taxed.sol";

contract Remittance is Taxed {
    uint256 private maxDeadline;

    struct Deposit {
        uint256 fund;
        address depositor;
        uint deadline;
    }

    mapping (bytes32 => Deposit) public deposits;
    mapping (bytes32 => bool) public usedPuzzles;

    event LogDepositCreated(address indexed depositor, bytes32 puzzle, uint256 fund, uint256 tax, uint256 deadline);
    event LogDepositWithdrawn(address indexed withdrawer, bytes32 puzzle, uint256 fund);
    event LogDepositRefunded(address indexed depositor, bytes32 puzzle, uint256 fund);

    constructor(uint256 _maxDeadline, uint256 _tax) Taxed(_tax) public {
        maxDeadline = _maxDeadline;
    }

    // External calls to pure and view functions not logged to blockchain, which means that beneficiary won't be able to hunt down the secret in the phase of creation
    function generatePuzzle(bytes32 secret, address beneficiary) public view returns(bytes32) {
        require(beneficiary != address(0), "Beneficary address cannot be empty!");

        return keccak256(abi.encodePacked(secret, beneficiary, address(this)));
    }

    function createDeposit(bytes32 puzzle, uint256 deadline) public payable whenNotPaused returns(bool) {
        uint256 fund = msg.value.sub(getTax());
        require(fund > 0, "Funds to deposit should be more than tax!");
        require(!usedPuzzles[puzzle], "Puzzle already used!");
        require(deadline <= maxDeadline, "Deadline is too much long in the future!");

        deadline = block.timestamp.add(deadline);
        deposits[puzzle] = Deposit({
            fund: fund,
            depositor: msg.sender,
            deadline: deadline
        });
        usedPuzzles[puzzle] = true;
        payTax();

        emit LogDepositCreated(msg.sender, puzzle, fund, getTax(), deadline);

        return true;
    }

    // Beneficiary can claim deposit through this function
    function withdraw(bytes32 secret) external whenNotPaused returns(bool) {
        bytes32 puzzle = generatePuzzle(secret, msg.sender);
        uint256 fund = deposits[puzzle].fund;
        require(fund > 0, "No funds for generated puzzle!");

        delete deposits[puzzle].fund;

        emit LogDepositWithdrawn(msg.sender, puzzle, fund);
        msg.sender.transfer(fund);

        return true;
    }

    // Depositor can claim his funds after deadline
    function refund(bytes32 puzzle) external whenNotPaused returns(bool) {
        uint256 fund = deposits[puzzle].fund;
        require(fund > 0, "No funds for generated puzzle!");
        require(deposits[puzzle].depositor == msg.sender, "Only depositor can get refunded!");
        require(deposits[puzzle].deadline < block.timestamp, "Depositor can get the refund only after deadline!");

        delete deposits[puzzle];

        emit LogDepositRefunded(msg.sender, puzzle, fund);
        msg.sender.transfer(fund);

        return true;
    }
}
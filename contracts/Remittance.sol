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

    event LogDepositCreated(address indexed depositor, bytes32 puzzle, uint256 fund, uint256 tax, uint256 deadline);
    event LogDepositWithdrawn(address indexed withdrawer, bytes32 puzzle, uint256 fund);
    event LogDepositRefunded(address indexed depositor, bytes32 puzzle, uint256 fund);

    constructor(uint256 _maxDeadline, uint256 _tax) Taxed(_tax) public {
        maxDeadline = _maxDeadline;
    }

    // External calls to pure and view functions not logged to blockchain, which means that beneficiary won't be able to hunt down the secret in the phase of creation
    function generatePuzzle(bytes32 secret, address beneficiary) public view returns(bytes32) {
        return _generatePuzzle(secret, beneficiary, msg.sender);
    }

    function _generatePuzzle(bytes32 secret, address beneficiary, address depositor) private pure returns(bytes32) {
        require(beneficiary != address(0), "Beneficary address cannot be empty!");

        return keccak256(abi.encodePacked(secret, beneficiary, depositor));
    }

    function createDeposit(bytes32 puzzle, uint256 deadline) public payable whenNotPaused returns(bool) {
        uint256 fund = msg.value.sub(tax);
        require(fund > 0, "Funds to deposit should be more than tax!");
        require(deposits[puzzle].fund == 0, "Puzzle already used!");
        require(deadline <= maxDeadline, "Deadline is too much long in the future!");

        deposits[puzzle] = Deposit({
            fund: fund,
            depositor: msg.sender,
            deadline: block.timestamp.add(deadline)
        });
        this.payTax.value(tax)();

        emit LogDepositCreated(msg.sender, puzzle, fund, tax, deposits[puzzle].deadline);

        return true;
    }

    // Beneficiary can claim deposit through this function
    function withdraw(bytes32 secret, address depositor) external whenNotPaused returns(bool) {
        bytes32 puzzle = _generatePuzzle(secret, msg.sender, depositor);
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
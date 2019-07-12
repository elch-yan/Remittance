pragma solidity 0.5.5;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./Stoppable.sol";

contract Taxed is Stoppable {
    using SafeMath for uint256;

    uint256 public tax;
    uint256 private reward;

    event LogTaxChanged(address indexed owner, uint256 oldtax, uint256 newtax);
    event LogTaxed(address indexed taxPayer, uint256 tax);
    event LogRewardClaimed(address indexed owner, uint256 reward);

    constructor(uint256 _tax) public {
        require(_tax >= 0, "Tax can not be negative!");
        tax = _tax;
    }

    function getReward() public view returns(uint256) {
        return reward;
    }

    function changeTax(uint256 newTax) public onlyOwner returns(bool) {
        require(newTax >= 0, "Tax can not be negative!");
        emit LogTaxChanged(msg.sender, tax, newTax);
        tax = newTax;

        return true;
    }

    function payTax() public payable whenNotPaused returns(bool) {
        require(msg.value == tax, "Value must be equal to tax!");
        emit LogTaxed(msg.sender, tax);
        reward = reward.add(tax);

        return true;
    }

    function claimReward() external whenNotPaused onlyOwner returns(bool) {
        require(reward > 0, "No reward to claim!");

        emit LogRewardClaimed(msg.sender, reward);
        msg.sender.transfer(reward);
        reward = 0;

        return true;
    }
}
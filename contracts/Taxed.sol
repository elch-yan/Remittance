pragma solidity 0.5.5;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./Stoppable.sol";

contract Taxed is Stoppable {
    using SafeMath for uint256;

    uint256 public tax;
    uint256 public reward;

    event LogTaxChanged(address indexed owner, uint256 oldtax, uint256 newtax);
    event LogTaxed(address indexed taxPayer, uint256 tax);
    event LogRewardClaimed(address indexed owner, uint256 reward);

    constructor(uint256 _tax) public {
        tax = _tax;
    }

    function changeTax(uint256 _tax) public onlyOwner returns(bool) {
        emit LogTaxChanged(msg.sender, tax, _tax);
        tax = _tax;

        return true;
    }

    function payTax() public whenNotPaused returns(bool) {
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
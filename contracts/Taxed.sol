pragma solidity 0.5.5;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./Stoppable.sol";

contract Taxed is Stoppable {
    using SafeMath for uint256;

    uint256 private tax;
    mapping (address => uint256) private ownerReward;

    event LogTaxChanged(address indexed owner, uint256 oldtax, uint256 newtax);
    event LogTaxed(address indexed taxPayer, uint256 tax);
    event LogRewardClaimed(address indexed owner, uint256 reward);

    constructor(uint256 _tax) public {
        tax = _tax;
    }

    function getTax() public view returns(uint256) {
        return tax;
    }

    function getReward(address _owner) public view returns(uint256) {
        return ownerReward[_owner];
    }

    function changeTax(uint256 newTax) public onlyOwner returns(bool) {
        emit LogTaxChanged(msg.sender, tax, newTax);
        tax = newTax;

        return true;
    }

    function payTax() internal whenNotPaused returns(bool) {
        emit LogTaxed(msg.sender, tax);

        address owner = getOwner();
        ownerReward[owner] = ownerReward[owner].add(tax);

        return true;
    }

    function claimReward() external whenNotPaused returns(bool) {
        uint256 reward = ownerReward[msg.sender];
        require(reward > 0, "No reward to claim!");

        delete ownerReward[msg.sender];

        emit LogRewardClaimed(msg.sender, reward);
        msg.sender.transfer(reward);

        return true;
    }
}
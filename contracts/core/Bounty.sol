// SPDX-License-Identifier: MIT
pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import "../util/Ownable.sol";
import "./interfaces/IIdeaTokenExchange.sol";
import "./interfaces/IIdeaToken.sol";
import "./interfaces/IIdeaTokenFactory.sol";
import "./interfaces/IInterestManager.sol";
import "../util/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

contract Bounty is Ownable {
    using SafeMath for uint256;

    uint _bountyExpiryPeriod;
    IIdeaTokenExchange _exchange; 

    function initialize(address owner,
                    IIdeaTokenExchange exchange,
                    uint bountyExpiryPeriod) external initializer {
        _bountyExpiryPeriod = bountyExpiryPeriod;
        _exchange = exchange;
        setOwnerInternal(owner); // Checks owner to be non-zero
    }

    // marketID -> erc20 -> amount
    mapping(uint => mapping(IERC20 => uint)) _bountyAmt;
    // marketID -> erc20 -> sender -> amount
    mapping(uint => mapping(IERC20 => mapping(address => uint))) _refundAmt;
    mapping(uint => uint) _bountyExpiry;
    mapping(uint => bool) _bountyDone;

    // claimant calls this to claim that they have done the action
    // subclass can override this for different action
    function claimActionDone(uint marketID) internal view {
        address platformOwner = _exchange._platformOwner[marketID];
        require(platformOwner != address(0), "action not done");
        require(_bountyExpiry[marketID] >= block.number, "this bounty is expired!");
        _bountyDone[marketID] = true;
    }

    function checkActionDone(uint marketID) internal view {
        return _bountyDone[marketID];
    }

    function makeBounty(uint marketID) external onlyOwner {
        require(_bountyExpiry[marketID] == 0, "bounty already exists for this market");

        _bountyExpiry[marketID] = _bountyExpiryPeriod.add(block.number);
    }

    function depositToken(uint marketID, IERC20 token, uint amount) external {
        require(_bountyExpiry[marketID] >= block.number, "this bounty is expired!");
        require(!checkActionDone(marketID), "bounty already redeemable");

        require(token.allowance(msg.sender, address(this)) >= amount, "insufficient funds");
        require(token.transferFrom(msg.sender, address(this), amount), "token transfer");

        _bountyAmt[marketID][token] = _bountyAmt[marketID][token].add(amount);
        _refundAmt[marketID][token][msg.sender] = _refundAmt[marketID][token][msg.sender].add(amount);
    }

    function redeemBounty(uint marketID, IERC20 token) external {
        require(_bountyExpiry[marketID] >= block.number, "this bounty is expired!");

        require(checkActionDone(marketID), "action not done");

        uint payoutAmt = _bountyAmt[marketID][token];
        _bountyAmt[marketID][token] = 0;
        require(token.transfer(address(this), platformOwner, payoutAmt), "token transfer");
    }

    function refundBounty(uint marketID, IERC20 token) external {
        require(_bountyExpiry[marketID] < block.number, "bounty not yet expired");
        require(!checkActionDone(marketID), "action already done");

        uint refund = _refundAmt[marketID][token][msg.sender];
        require(refund > 0, "no refund");
        _refundAmt[marketID][token][msg.sender] = 0;

        require(token.transfer(address(this), platformOwner, refund), "token transfer");
    }
}

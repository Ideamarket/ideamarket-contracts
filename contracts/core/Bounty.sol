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

    // marketID -> bountyID -> erc20 -> amount
    mapping(uint => mapping(uint => mapping(IERC20 => uint))) _bountyAmt;
    // marketID -> bountyID -> erc20 -> sender -> amount
    mapping(uint => mapping(uint => mapping(IERC20 => mapping(address => uint)))) _refundAmt;
    
    // marketID -> bountyID -> x
    mapping(uint => mapping(uint => uint)) _bountyExpiry;
    mapping(uint => mapping(uint => bool)) _bountyDone;

    // claimant calls this to claim that they have done the action
    // subclass can override this for different action
    function claimActionDone(uint marketID, uint bountyID) internal view {
        address platformOwner = _exchange._platformOwner[marketID];
        require(platformOwner != address(0), "action not done");
        require(_bountyExpiry[marketID][bountyID] >= block.number, "this bounty is expired!");
        _bountyDone[marketID][bountyID] = true;
    }

    function checkActionDone(uint marketID, uint bountyID) internal view {
        return _bountyDone[marketID][bountyID];
    }

    function makeBounty(uint marketID, uint bountyID) external onlyOwner {
        require(_bountyExpiry[marketID][bountyID] == 0, "bounty already exists for this market with this bounty id");

        _bountyExpiry[marketID][bountyID] = _bountyExpiryPeriod.add(block.number);
    }

    function depositToken(uint marketID, uint bountyID, IERC20 token, uint amount) external payable {
        require(_bountyExpiry[marketID][bountyID] >= block.number, "this bounty is expired!");
        require(!checkActionDone(marketID), "bounty already redeemable");

        // (eth sent) xor (token specified)
        require((msg.value != 0) ^ (address(token) != address(0)), "must either send eth or tokens but not both!");

        bool isEth = msg.value != 0;

        if (!isEth) {
            require(token.allowance(msg.sender, address(this)) >= amount, "insufficient funds");
            require(token.transferFrom(msg.sender, address(this), amount), "token transfer");
        }

        _bountyAmt[marketID][bountyID][token] = _bountyAmt[marketID][bountyID][token].add(amount);
        _refundAmt[marketID][bountyID][token][msg.sender] = _refundAmt[marketID][bountyID][token][msg.sender].add(amount);
    }

    function redeemBounty(uint marketID, uint bountyID, IERC20 token) external {
        require(_bountyExpiry[marketID][bountyID] >= block.number, "this bounty is expired!");

        require(checkActionDone(marketID), "action not done");

        uint payoutAmt = _bountyAmt[marketID][bountyID][token];
        _bountyAmt[marketID][bountyID][token] = 0;
        require(token.transfer(address(this), platformOwner, payoutAmt), "token transfer");
    }

    function refundBounty(uint marketID, uint bountyID, IERC20 token) external {
        require(_bountyExpiry[marketID][bountyID] < block.number, "bounty not yet expired");
        require(!checkActionDone(marketID), "action already done");

        uint refund = _refundAmt[marketID][bountyID][token][msg.sender];
        require(refund > 0, "no refund");
        _refundAmt[marketID][bountyID][token][msg.sender] = 0;

        if (address(token) != address(0)) {
            // refund erc20
            require(token.transfer(address(this), platformOwner, refund), "token transfer");
        } else {
            // refund eth
            msg.sender.transfer(refund);
        }
    }
}

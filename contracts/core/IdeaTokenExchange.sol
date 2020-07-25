// SPDX-License-Identifier: MIT
pragma solidity ^0.6.9;
pragma experimental ABIEncoderV2;

import "../util/Ownable.sol";
import "./IIdeaToken.sol";
import "./IIdeaTokenFactory.sol";
import "./IInterestManager.sol";
import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

contract IdeaTokenExchange is Initializable, Ownable {
    using SafeMath for uint256;

    uint public _tradingFee;
    address _tradingFeeRecipient;

    IIdeaTokenFactory _ideaTokenFactory;
    IInterestManager _interestManager;
    IERC20 _dai;

    event TokensBought(uint marketID, uint tokenID, uint amount, uint cost, address payer, address recipient);

    function initialize(address owner,
                        uint tradingFee,
                        address tradingFeeRecipient,
                        address ideaTokenFactory,
                        address interestManager,
                        address dai) external initializer {
        setOwnerInternal(owner);
        _tradingFee = tradingFee;
        _tradingFeeRecipient = tradingFeeRecipient;
        _ideaTokenFactory = IIdeaTokenFactory(ideaTokenFactory);
        _interestManager = IInterestManager(interestManager);
        _dai = IERC20(dai);
    }

    function buyTokensByAmount(uint marketID, uint tokenID, uint amount, uint maxCost, address recipient) external {
        IIdeaTokenFactory.MarketDetails memory marketInfo = _ideaTokenFactory.getMarketDetailsByID(marketID);
        require(marketInfo.exists, "buyTokensByAmount: market does not exist");
        IIdeaTokenFactory.TokenInfo memory tokenInfo = _ideaTokenFactory.getTokenInfo(marketID, tokenID);
        require(tokenInfo.exists, "buyTokensByAmount: token does not exist");

        uint rawCost = getRawCostForBuyingTokens(marketInfo.baseCost,
                                                 marketInfo.priceRise,
                                                 marketInfo.tokensPerInterval,
                                                 tokenInfo.ideaToken.totalSupply(),
                                                 amount);

        uint fee = getTradingFeeForBuyingTokens(rawCost);

        uint totalCost = rawCost.add(fee);

        require(totalCost <= maxCost, "buyTokensByAmount: cost exceeds maxCost");
        require(_dai.allowance(msg.sender, address(this)) >= totalCost, "buyTokensByAmount: not enough allowance");
        require(_dai.transferFrom(msg.sender, address(_interestManager), rawCost), "buyTokensByAmount: dai transfer failed");

        if(fee > 0) {
            require(_dai.transferFrom(msg.sender, _tradingFeeRecipient, fee), "buyTokensByAmount: fee transfer failed");
        }

        // TODO: Update tokens interest

        _interestManager.invest(rawCost);
        tokenInfo.ideaToken.mint(recipient, amount);

        emit TokensBought(marketID, tokenID, amount, totalCost, msg.sender, recipient);
    }

    function getCostForBuyingTokens(uint marketID, uint tokenID, uint amount) external view returns (uint) {
        IIdeaTokenFactory.MarketDetails memory marketInfo = _ideaTokenFactory.getMarketDetailsByID(marketID);
        require(marketInfo.exists, "buyTokensByAmount: market does not exist");
        IIdeaTokenFactory.TokenInfo memory tokenInfo = _ideaTokenFactory.getTokenInfo(marketID, tokenID);
        require(tokenInfo.exists, "buyTokensByAmount: token does not exist");

        uint rawCost = getRawCostForBuyingTokens(marketInfo.baseCost,
                                                 marketInfo.priceRise,
                                                 marketInfo.tokensPerInterval,
                                                 tokenInfo.ideaToken.totalSupply(),
                                                 amount);

        uint fee = getTradingFeeForBuyingTokens(rawCost);

        return rawCost.add(fee);
    }

    // TODO: DECIMALS AND UINT->INTS
    function getRawCostForBuyingTokens(uint b, uint r, uint t, uint supply, uint amount) internal pure returns (uint) {
        uint costForSupply = getCostFromZeroSupply(b, r, t, supply);
        uint costForSupplyAndAmount = getCostFromZeroSupply(b, r, t, supply.add(amount));

        uint rawCost = costForSupplyAndAmount.sub(costForSupply);
        return rawCost;
    }

    function getCostFromZeroSupply(uint b, uint r, uint t, uint amount) internal pure returns (uint) {
        uint n = amount.div(t);
        return getCostFromZeroSupply(b, r, t, n).add(amount.sub(n.mul(t)).mul(b.add(n.mul(r))));
    }

    function getTradingFeeForBuyingTokens(uint rawCost) internal view returns (uint) {
        uint fee = _tradingFee;

        if(fee == 0) {
            return 0;
        }

        return rawCost.div(fee);
    }

    // TODO: DECIMALS AND UINT->INTS
    function getCostForCompletedIntervals(uint b, uint r, uint t, uint n) internal pure returns (uint) {
        return n.mul(t).mul(b.sub(r)).add(r.mul(t).mul(n.mul(n.add(1)).div(2)));
    }
}
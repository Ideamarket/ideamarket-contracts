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

    uint constant TRADING_FEE_SCALE = 10000;

    uint public _tradingFee;
    address _tradingFeeRecipient;

    IIdeaTokenFactory _ideaTokenFactory;
    IInterestManager _interestManager;
    IERC20 _dai;

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
        transferAndMintTokens(tokenInfo.ideaToken, rawCost, fee, amount, recipient);
    }

    function buyTokensByPrice(uint marketID, uint tokenID, uint price, uint minTokens, address recipient) external {
        IIdeaTokenFactory.MarketDetails memory marketInfo = _ideaTokenFactory.getMarketDetailsByID(marketID);
        require(marketInfo.exists, "buyTokensByPrice: market does not exist");
        IIdeaTokenFactory.TokenInfo memory tokenInfo = _ideaTokenFactory.getTokenInfo(marketID, tokenID);
        require(tokenInfo.exists, "buyTokensByPrice: token does not exist");

        uint fee = getTradingFeeForBuyingTokens(price);
        uint priceWithoutFee = price.sub(fee);

        uint tokensBuyable = getRawTokensBuyableForPrice(marketInfo.baseCost,
                                                         marketInfo.priceRise,
                                                         marketInfo.tokensPerInterval,
                                                         tokenInfo.ideaToken.totalSupply(),
                                                         priceWithoutFee);

        require(tokensBuyable >= minTokens, "buyTokensByPrice: cannot buy enough tokens");
        transferAndMintTokens(tokenInfo.ideaToken, priceWithoutFee, fee, tokensBuyable, recipient);
    }

    function transferAndMintTokens(IIdeaToken token, uint transferAmount, uint feeAmount, uint mintAmount, address recipient) internal {
        require(_dai.allowance(msg.sender, address(this)) >= transferAmount, "transferAndMintTokens: not enough allowance");
        require(_dai.transferFrom(msg.sender, address(_interestManager), transferAmount), "transferAndMintTokens: dai transfer failed");

        if(feeAmount > 0) {
            require(_dai.transferFrom(msg.sender, _tradingFeeRecipient, feeAmount), "transferAndMintTokens: fee transfer failed");
        }

        // TODO: Update tokens interest

        _interestManager.invest(transferAmount);
        token.mint(recipient, mintAmount);
    }

    function getCostForBuyingTokens(uint marketID, uint tokenID, uint amount) external view returns (uint) {
        IIdeaTokenFactory.MarketDetails memory marketInfo = _ideaTokenFactory.getMarketDetailsByID(marketID);
        IIdeaTokenFactory.TokenInfo memory tokenInfo = _ideaTokenFactory.getTokenInfo(marketID, tokenID);

        uint rawCost = getRawCostForBuyingTokens(marketInfo.baseCost,
                                                 marketInfo.priceRise,
                                                 marketInfo.tokensPerInterval,
                                                 tokenInfo.ideaToken.totalSupply(),
                                                 amount);

        uint fee = getTradingFeeForBuyingTokens(rawCost);

        return rawCost.add(fee);
    }

    function getTokensBuyableForPrice(uint marketID, uint tokenID, uint price) external view returns (uint) {
        IIdeaTokenFactory.MarketDetails memory marketInfo = _ideaTokenFactory.getMarketDetailsByID(marketID);
        IIdeaTokenFactory.TokenInfo memory tokenInfo = _ideaTokenFactory.getTokenInfo(marketID, tokenID);

        uint fee = getTradingFeeForBuyingTokens(price);

        return getRawTokensBuyableForPrice(marketInfo.baseCost,
                                           marketInfo.priceRise,
                                           marketInfo.tokensPerInterval,
                                           tokenInfo.ideaToken.totalSupply(),
                                           price.sub(fee));
    }

    // TODO: DECIMALS AND UINT->INTS
    function getRawCostForBuyingTokens(uint b, uint r, uint t, uint supply, uint amount) internal pure returns (uint) {
        uint costForSupply = getCostFromZeroSupply(b, r, t, supply);
        uint costForSupplyAndAmount = getCostFromZeroSupply(b, r, t, supply.add(amount));

        uint rawCost = costForSupplyAndAmount.sub(costForSupply);
        return rawCost;
    }

    function getRawTokensBuyableForPrice(uint b, uint r, uint t, uint supply, uint price) internal pure returns (uint) {
        uint costForSupply = getCostFromZeroSupply(b, r, t, supply);
        uint tokensForSupplyAndPrice = getTokensBuyableFromZeroSupply(b, r, t, costForSupply.add(price));

        uint rawTokens = tokensForSupplyAndPrice.sub(supply);
        return rawTokens;
    }

    function getCostFromZeroSupply(uint b, uint r, uint t, uint amount) internal pure returns (uint) {
        uint n = amount.div(t);
        return getCostForCompletedIntervals(b, r, t, n).add(amount.sub(n.mul(t)).mul(b.add(n.mul(r))));
    }

    function getTokensBuyableFromZeroSupply(uint b, uint r, uint t, uint price) internal pure returns (uint) {

        uint n;

        uint underRoot;
        // To avoid stack too deep
        {
        uint fb2t = uint(4).mul(b).mul(b).mul(t);
        uint fbrt = uint(4).mul(b).mul(r).mul(t);
        uint r2t = r.mul(r).mul(t);
        uint erx = uint(8).mul(r).mul(price);
        underRoot = t.mul(fb2t.sub(fbrt).add(r2t).add(erx));
        }

        uint tbt = uint(2).mul(b).mul(t);
        uint rt = r.mul(t);
        n = sqrt(underRoot).sub(tbt).add(rt).div(uint(2).mul(rt));

        return n.mul(t).add(price.sub(getCostForCompletedIntervals(b, r, t, n)).div(b.add(n.mul(r))));
    }

    function getTradingFeeForBuyingTokens(uint rawCost) internal view returns (uint) {
        uint fee = _tradingFee;

        if(fee == 0) {
            return 0;
        }

        return rawCost.mul(fee).div(TRADING_FEE_SCALE);
    }

    // TODO: DECIMALS AND UINT->INTS
    function getCostForCompletedIntervals(uint b, uint r, uint t, uint n) internal pure returns (uint) {
        return n.mul(t).mul(b.sub(r)).add(r.mul(t).mul(n.mul(n.add(1)).div(2)));
    }

    // Babylonian method
    function sqrt(uint x) internal pure returns (uint y) {
        uint z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }
}
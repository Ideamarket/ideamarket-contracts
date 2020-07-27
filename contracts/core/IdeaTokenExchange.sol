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

/**
 * @title IdeaTokenExchange
 * @author Alexander Schlindwein
 *
 * @dev Exchanges Dai <-> IdeaTokens using a bonding curve. Sits behind a proxy
 */
contract IdeaTokenExchange is Initializable, Ownable {
    using SafeMath for uint256;

    struct TokenExchangeInfo {
        uint lastInterest;
        uint interestShares;
        uint generatedInterest;
    }

    mapping(IIdeaToken => TokenExchangeInfo) _tokensExchangeInfo;

    address _tradingFeeRecipient;

    IIdeaTokenFactory _ideaTokenFactory;
    IInterestManager _interestManager;
    IERC20 _dai;

    /**
     * @dev Initializes the contract
     *
     * @param owner The owner of the contract
     * @param tradingFeeRecipient The address of the recipient of the trading fee
     * @param ideaTokenFactory The address of the IdeaTokenFactory
     * @param interestManager The address of the InterestManager
     * @param dai The address of Dai
     */
    function initialize(address owner,
                        address tradingFeeRecipient,
                        address ideaTokenFactory,
                        address interestManager,
                        address dai) external initializer {
        setOwnerInternal(owner);
        _tradingFeeRecipient = tradingFeeRecipient;
        _ideaTokenFactory = IIdeaTokenFactory(ideaTokenFactory);
        _interestManager = IInterestManager(interestManager);
        _dai = IERC20(dai);
    }

    /**
     * @dev Burns IdeaTokens in exchange for Dai
     *
     * @param marketID The ID of the market
     * @param tokenID The ID of the IdeaToken to sell
     * @param amount The amount of IdeaTokens to sell
     * @param minPrice The minimum allowed price in Dai for selling `amount` IdeaTokens
     * @param recipient The recipient of the redeemed Dai
     */
    function sellTokens(uint marketID, uint tokenID, uint amount, uint minPrice, address recipient) external {
        IIdeaTokenFactory.MarketDetails memory marketDetails = _ideaTokenFactory.getMarketDetailsByID(marketID);
        require(marketDetails.exists, "buyTokensByAmount: market does not exist");
        IIdeaTokenFactory.TokenInfo memory tokenInfo = _ideaTokenFactory.getTokenInfo(marketID, tokenID);
        require(tokenInfo.exists, "buyTokensByAmount: token does not exist");

        uint rawPrice = getRawPriceForSellingTokens(marketDetails.baseCost,
                                                    marketDetails.priceRise,
                                                    marketDetails.tokensPerInterval,
                                                    tokenInfo.ideaToken.totalSupply(),
                                                    amount);

        uint permafundAmount = rawPrice.mul(marketDetails.permafundRate).div(marketDetails.permafundRateScale);
        uint fee = rawPrice.sub(permafundAmount).mul(marketDetails.tradingFeeRate).div(marketDetails.tradingFeeRateScale);
        uint finalPrice = rawPrice.sub(permafundAmount).sub(fee);

        require(finalPrice >= minPrice, "sellTokens: price subceeds min price");

        IIdeaToken ideaToken = tokenInfo.ideaToken;
        require(ideaToken.balanceOf(msg.sender) >= amount, "sellTokens: not enough tokens");

        ideaToken.burn(msg.sender, amount);
        _interestManager.redeem(address(this), finalPrice.add(fee));

        require(_dai.transfer(recipient, finalPrice), "sellTokens: dai transfer failed");
        if(fee > 0) {
            require(_dai.transfer(_tradingFeeRecipient, fee), "sellTokens: dai fee transfer failed");
        }

        // TODO: Update tokens interest
    }

    /**
     * @dev Returns the price for selling IdeaTokens
     *
     * @param marketID The ID of the market
     * @param tokenID The ID of the IdeaToken to sell
     * @param amount The amount of IdeaTokens to sell
     *
     * @return The price in Dai for selling `amount` IdeaTokens
     */
    function getPriceForSellingTokens(uint marketID, uint tokenID, uint amount) external view returns (uint) {
        IIdeaTokenFactory.MarketDetails memory marketDetails = _ideaTokenFactory.getMarketDetailsByID(marketID);
        IIdeaTokenFactory.TokenInfo memory tokenInfo = _ideaTokenFactory.getTokenInfo(marketID, tokenID);

        uint rawPrice = getRawPriceForSellingTokens(marketDetails.baseCost,
                                                    marketDetails.priceRise,
                                                    marketDetails.tokensPerInterval,
                                                    tokenInfo.ideaToken.totalSupply(),
                                                    amount);

        uint permafundAmount = rawPrice.mul(marketDetails.permafundRate).div(marketDetails.permafundRateScale);
        uint fee = rawPrice.sub(permafundAmount).mul(marketDetails.tradingFeeRate).div(marketDetails.tradingFeeRateScale);

        return rawPrice.sub(permafundAmount).sub(fee);
    }

    /**
     * @dev Returns the price for selling IdeaTokens without any fees or permafund rates applied
     *
     * @param b The baseCost of the token
     * @param r The priceRise of the token
     * @param t The amount of tokens per interval
     * @param supply The current total supply of the token
     * @param amount The amount of IdeaTokens to sell
     *
     * @return Returns the price for selling `amount` IdeaTokens without any fees or permafund rates applied
     */
    function getRawPriceForSellingTokens(uint b, uint r, uint t, uint supply, uint amount) internal pure returns (uint) {
        uint costForSupply = getCostFromZeroSupply(b, r, t, supply);
        uint costForSupplyMinusAmount = getCostFromZeroSupply(b, r, t, supply.sub(amount));

        uint rawCost = costForSupply.sub(costForSupplyMinusAmount);
        return rawCost;
    }

    /**
     * @dev Mints IdeaTokens in exchange for Dai
     *
     * @param marketID The ID of the market
     * @param tokenID The ID of the IdeaToken to buy
     * @param amount The amount of IdeaTokens to buy
     * @param maxCost The maximum allowed cost in Dai to buy `amount` IdeaTokens
     * @param recipient The recipient of the bought IdeaTokens
     */
    function buyTokens(uint marketID, uint tokenID, uint amount, uint maxCost, address recipient) external {
        IIdeaTokenFactory.MarketDetails memory marketDetails = _ideaTokenFactory.getMarketDetailsByID(marketID);
        require(marketDetails.exists, "buyTokensByAmount: market does not exist");
        IIdeaTokenFactory.TokenInfo memory tokenInfo = _ideaTokenFactory.getTokenInfo(marketID, tokenID);
        require(tokenInfo.exists, "buyTokensByAmount: token does not exist");

        uint rawCost = getRawCostForBuyingTokens(marketDetails.baseCost,
                                                 marketDetails.priceRise,
                                                 marketDetails.tokensPerInterval,
                                                 tokenInfo.ideaToken.totalSupply(),
                                                 amount);

        uint fee = rawCost.mul(marketDetails.tradingFeeRate).div(marketDetails.tradingFeeRateScale);
        uint finalCost = rawCost.add(fee);

        require(finalCost <= maxCost, "buyTokensByAmount: cost exceeds maxCost");
        require(_dai.allowance(msg.sender, address(this)) >= finalCost, "transferAndMintTokens: not enough allowance");
        require(_dai.transferFrom(msg.sender, address(_interestManager), rawCost), "transferAndMintTokens: dai transfer failed");

        if(fee > 0) {
            require(_dai.transferFrom(msg.sender, _tradingFeeRecipient, fee), "transferAndMintTokens: fee transfer failed");
        }

        // TODO: Update tokens interest

        _interestManager.invest(rawCost);
        tokenInfo.ideaToken.mint(recipient, amount);
    }

    /**
     * @dev Returns the cost for buying IdeaTokens
     *
     * @param marketID The ID of the market
     * @param tokenID The ID of the IdeaToken to buy
     * @param amount The amount of IdeaTokens to buy
     *
     * @return The cost in Dai for buying `amount` IdeaTokens
     */
    function getCostForBuyingTokens(uint marketID, uint tokenID, uint amount) external view returns (uint) {
        IIdeaTokenFactory.MarketDetails memory marketDetails = _ideaTokenFactory.getMarketDetailsByID(marketID);
        IIdeaTokenFactory.TokenInfo memory tokenInfo = _ideaTokenFactory.getTokenInfo(marketID, tokenID);

        uint rawCost = getRawCostForBuyingTokens(marketDetails.baseCost,
                                                 marketDetails.priceRise,
                                                 marketDetails.tokensPerInterval,
                                                 tokenInfo.ideaToken.totalSupply(),
                                                 amount);

        uint fee = rawCost.mul(marketDetails.tradingFeeRate).div(marketDetails.tradingFeeRateScale);

        return rawCost.add(fee);
    }

    /**
     * @dev Returns the cost for buying IdeaTokens without any fees applied
     *
     * @param b The baseCost of the token
     * @param r The priceRise of the token
     * @param t The amount of tokens per interval
     * @param supply The current total supply of the token
     * @param amount The amount of IdeaTokens to buy
     *
     * @return The cost for buying `amount` IdeaTokens without any fees applied
     */
    function getRawCostForBuyingTokens(uint b, uint r, uint t, uint supply, uint amount) internal pure returns (uint) {
        uint costForSupply = getCostFromZeroSupply(b, r, t, supply);
        uint costForSupplyPlusAmount = getCostFromZeroSupply(b, r, t, supply.add(amount));

        uint rawCost = costForSupplyPlusAmount.sub(costForSupply);
        return rawCost;
    }

    /**
     * @dev Returns the cost for buying IdeaTokens without any fees applied from 0 supply
     *
     * @param b The baseCost of the token
     * @param r The priceRise of the token
     * @param t The amount of tokens per interval
     * @param amount The amount of IdeaTokens to buy
     *
     * @return The cost for buying `amount` IdeaTokens without any fees applied from 0 supply
     */
    function getCostFromZeroSupply(uint b, uint r, uint t, uint amount) internal pure returns (uint) {
        uint n = amount.div(t);
        return getCostForCompletedIntervals(b, r, t, n).add(amount.sub(n.mul(t)).mul(b.add(n.mul(r)))).div(10**18);
    }

    /**
     * @dev Returns the cost for completed intervals from 0 supply
     *
     * @param b The baseCost of the token
     * @param r The priceRise of the token
     * @param t The amount of tokens per interval
     * @param n The amount of completed intervals
     *
     * @return Returns the cost for `n` completed intervals from 0 supply
     */
    function getCostForCompletedIntervals(uint b, uint r, uint t, uint n) internal pure returns (uint) {
        return n.mul(t).mul(b.sub(r)).add(r.mul(t).mul(n.mul(n.add(1)).div(2)));
    }

    function updateTokenInterest(IIdeaToken token) public {
        TokenExchangeInfo storage exchangeInfo = _tokensExchangeInfo[token];

        _interestManager.accrueInterest();
        uint exchangeRate = _interestManager.getExchangeRate();

        uint newInterest = exchangeInfo.interestShares.mul(exchangeRate).sub(exchangeInfo.lastInterest);
        exchangeInfo.generatedInterest = exchangeInfo.generatedInterest.add(newInterest);
    }
}
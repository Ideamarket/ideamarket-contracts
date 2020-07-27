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

    uint constant TRADING_FEE_SCALE = 10000;

    uint public _tradingFee;
    address _tradingFeeRecipient;

    IIdeaTokenFactory _ideaTokenFactory;
    IInterestManager _interestManager;
    IERC20 _dai;

    /**
     * @dev Initializes the contract
     *
     * @param owner The owner of the contract
     * @param tradingFee The trading fee
     * @param tradingFeeRecipient The address of the recipient of the trading fee
     * @param ideaTokenFactory The address of the IdeaTokenFactory
     * @param interestManager The address of the InterestManager
     * @param dai The address of Dai
     */
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

    /**
     * @dev Mints IdeaTokens in exchange for Dai
     *
     * @param marketID The ID of the market
     * @param tokenID The ID of the IdeaToken to buy
     * @param amount The amount of IdeaTokens to buy
     * @param maxCost The maximum allowed cost in Dai to buy `amount` IdeaTokens
     * @param recipient The recipient of the bought IdeaTokens
     */
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

    /**
     * @dev Transfers Dai from the buyer to the InterestManager and mints IdeaTokens
     *
     * @param token The IdeaToken to mint
     * @param transferAmount The amount of Dai to transfer
     * @param feeAmount The trading fee amount to transfer to the trading fee recipient
     * @param mintAmount The amount of IdeaTokens to mint
     * @param recipient The recipient of the minted IdeaTokens
     */
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

    /**
     * @dev Returns the cost for buying IdeaTokens
     *
     * @param marketID The ID of the market
     * @param tokenID The ID of the IdeaToken to buy
     * @param amount The amount of IdeaTokens to buy
     *
     * @return The cost for buying `amount` IdeaTokens
     */
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
        uint costForSupplyAndAmount = getCostFromZeroSupply(b, r, t, supply.add(amount));

        uint rawCost = costForSupplyAndAmount.sub(costForSupply);
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
     * @dev Returns the trading fee for buying IdeaTokens
     *
     * @param rawCost The previously calculated cost without fees applied
     *
     * @return Returns the trading fee for buying `amount` IdeaTokens
     */
    function getTradingFeeForBuyingTokens(uint rawCost) internal view returns (uint) {
        uint fee = _tradingFee;

        if(fee == 0) {
            return 0;
        }

        return rawCost.mul(fee).div(TRADING_FEE_SCALE);
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

    /*

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

    function getRawTokensBuyableForPrice(uint b, uint r, uint t, uint supply, uint price) internal pure returns (uint) {
        uint costForSupply = getCostFromZeroSupply(b, r, t, supply);
        uint tokensForSupplyAndPrice = getTokensBuyableFromZeroSupply(b, r, t, costForSupply.add(price));

        uint rawTokens = tokensForSupplyAndPrice.sub(supply);
        return rawTokens;
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

    */
}
// SPDX-License-Identifier: MIT
pragma solidity ^0.6.9;
pragma experimental ABIEncoderV2;

import "../util/Ownable.sol";
import "./IIdeaTokenExchange.sol";
import "./IIdeaToken.sol";
import "./IIdeaTokenFactory.sol";
import "./IInterestManager.sol";
import "../util/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

/**
 * @title IdeaTokenExchange
 * @author Alexander Schlindwein
 *
 * Exchanges Dai <-> IdeaTokens using a bonding curve. Sits behind a proxy
 */
contract IdeaTokenExchange is IIdeaTokenExchange, Initializable, Ownable {
    using SafeMath for uint256;

    struct TokenExchangeInfo {
        uint daiInToken; // The amount of Dai collected by trading
        uint invested; // The amount of "investment tokens", e.g. cDai
    }

    uint constant private FEE_SCALE = 10000;

    address _authorizer;
    uint _tradingFeeInvested; // The amount of "investment tokens" for the collected trading fee, e.g. cDai
    address _tradingFeeRecipient;

    mapping(uint => uint) _platformFeeInvested;
    mapping(uint => address) _authorizedPlatformFeeWithdrawers;

    mapping(address => TokenExchangeInfo) _tokensExchangeInfo;
    mapping(address => address) _authorizedInterestWithdrawers;

    IIdeaTokenFactory _ideaTokenFactory;
    IInterestManager _interestManager;
    IERC20 _dai;

    event NewInterestWithdrawer(address ideaToken, address withdrawer);
    event NewPlatformFeeWithdrawer(uint marketID, address withdrawer);

    event InvestedState(uint marketID, address ideaToken, uint daiInToken, uint daiInvested, uint tradingFeeInvested, uint platformFeeInvested, uint volume);
    event DaiRedeemed(address ideaToken, uint investmentToken);
    event TradingFeeRedeemed();
    event PlatformFeeRedeemed(uint marketID);
    
    /**
     * Initializes the contract
     *
     * @param owner The owner of the contract
     * @param tradingFeeRecipient The address of the recipient of the trading fee
     * @param interestManager The address of the InterestManager
     * @param dai The address of Dai
     */
    function initialize(address owner,
                        address authorizer,
                        address tradingFeeRecipient,
                        address interestManager,
                        address dai) external initializer {
        setOwnerInternal(owner);
        _authorizer = authorizer;
        _tradingFeeRecipient = tradingFeeRecipient;
        _interestManager = IInterestManager(interestManager);
        _dai = IERC20(dai);
    }

    /**
     * Burns IdeaTokens in exchange for Dai
     *
     * @param ideaToken The IdeaToken to sell
     * @param amount The amount of IdeaTokens to sell
     * @param minPrice The minimum allowed price in Dai for selling `amount` IdeaTokens
     * @param recipient The recipient of the redeemed Dai
     */
    function sellTokens(address ideaToken, uint amount, uint minPrice, address recipient) external override {

        uint marketID;
        {
        IIdeaTokenFactory.IDPair memory idPair = _ideaTokenFactory.getTokenIDPair(ideaToken);
        require(idPair.exists, "sellTokens: token does not exist");
        marketID = _ideaTokenFactory.getMarketDetailsByID(idPair.marketID).id;
        }

        (uint finalPrice, uint rawPrice, uint tradingFee, uint platformFee) = getPricesForSellingTokens(ideaToken, amount);

        require(finalPrice >= minPrice, "sellTokens: price subceeds min price");
        require(IIdeaToken(ideaToken).balanceOf(msg.sender) >= amount, "sellTokens: not enough tokens");
        
        IIdeaToken(ideaToken).burn(msg.sender, amount);

        _interestManager.accrueInterest();
        TokenExchangeInfo storage exchangeInfo = _tokensExchangeInfo[ideaToken];
        {
        uint finalRedeemed = _interestManager.redeem(address(this), finalPrice);
        uint tradingFeeRedeemed = _interestManager.underlyingToInvestmentToken(tradingFee);
        uint platformFeeRedeemed = _interestManager.underlyingToInvestmentToken(platformFee);

        exchangeInfo.invested = exchangeInfo.invested.sub(finalRedeemed.add(tradingFeeRedeemed).add(platformFeeRedeemed));
        _tradingFeeInvested = _tradingFeeInvested.add(tradingFeeRedeemed);
        _platformFeeInvested[marketID] = _platformFeeInvested[marketID].add(platformFeeRedeemed);
        exchangeInfo.daiInToken = exchangeInfo.daiInToken.sub(rawPrice);
        }

        emit InvestedState(marketID, ideaToken, exchangeInfo.daiInToken, exchangeInfo.invested, _tradingFeeInvested, _platformFeeInvested[marketID], rawPrice);
        _dai.transfer(recipient, finalPrice);
    }


    /**
     * Returns the price for selling IdeaTokens
     *
     * @param ideaToken The IdeaToken to sell
     * @param amount The amount of IdeaTokens to sell
     *
     * @return The price in Dai for selling `amount` IdeaTokens
     */
    function getPriceForSellingTokens(address ideaToken, uint amount) external view override returns (uint) {
        (uint finalCost, , , ) = getPricesForSellingTokens(ideaToken, amount);
        return finalCost;
    }

    /**
     * Calculates each price related to selling tokens
     *
     * @param ideaToken The IdeaToken to sell
     * @param amount The amount of IdeaTokens to sell
     *
     * @return Final cost, raw cost and trading fee
     */
    function getPricesForSellingTokens(address ideaToken, uint amount) internal view returns (uint, uint, uint, uint) {
        IIdeaTokenFactory.IDPair memory idPair = _ideaTokenFactory.getTokenIDPair(ideaToken);
        IIdeaTokenFactory.MarketDetails memory marketDetails = _ideaTokenFactory.getMarketDetailsByID(idPair.marketID);

        uint rawPrice = getRawPriceForSellingTokens(marketDetails.baseCost,
                                                    marketDetails.priceRise,
                                                    marketDetails.hatchTokens,
                                                    IERC20(ideaToken).totalSupply(),
                                                    amount);

        uint tradingFee = rawPrice.mul(marketDetails.tradingFeeRate).div(FEE_SCALE);
        uint platformFee = rawPrice.mul(marketDetails.platformFeeRate).div(FEE_SCALE);
        uint finalCost = rawPrice.sub(tradingFee).sub(platformFee);

        return (finalCost, rawPrice, tradingFee, platformFee);
    }

    /**
     * Returns the price for selling tokens without any fees applied
     *
     * @param baseCost The baseCost of the token
     * @param priceRise The priceRise of the token
     * @param hatchTokens The amount of hatch tokens
     * @param supply The current total supply of the token
     * @param amount The amount of IdeaTokens to sell
     *
     * @return The price selling `amount` IdeaTokens without any fees applied
     */
    function getRawPriceForSellingTokens(uint baseCost, uint priceRise, uint hatchTokens, uint supply, uint amount) internal pure returns (uint) {

        uint hatchPrice = 0;
        uint updatedAmount = amount;
        uint updatedSupply;

        if(supply.sub(amount) < hatchTokens) {

            if(supply <= hatchTokens) {
                return baseCost.mul(amount).div(10**18);
            }

            // No SafeMath required because supply - amount < hatchTokens
            uint tokensInHatch = hatchTokens - (supply - amount);
            hatchPrice = baseCost.mul(tokensInHatch).div(10**18);
            updatedAmount = amount.sub(tokensInHatch);
            // No SafeMath required because supply >= hatchTokens
            updatedSupply = supply - hatchTokens;
        } else {
            // No SafeMath required because supply >= hatchTokens
            updatedSupply = supply - hatchTokens;
        }

        uint priceAtSupply = baseCost.add(priceRise.mul(updatedSupply).div(10**18));
        uint priceAtSupplyMinusAmount = baseCost.add(priceRise.mul(updatedSupply.sub(updatedAmount)).div(10**18));
        uint average = priceAtSupply.add(priceAtSupplyMinusAmount).div(2);
    
        return hatchPrice.add(average.mul(updatedAmount).div(10**18));
    }

    /**
     * Mints IdeaTokens in exchange for Dai
     *
     * @param ideaToken The IdeaToken to buy
     * @param amount The amount of IdeaTokens to buy
     * @param fallbackAmount The fallback amount to buy in case the price changed
     * @param cost The maximum allowed cost in Dai
     * @param recipient The recipient of the bought IdeaTokens
     */
    function buyTokens(address ideaToken, uint amount, uint fallbackAmount, uint cost, address recipient) external override {
        uint marketID;
        {
        IIdeaTokenFactory.IDPair memory idPair = _ideaTokenFactory.getTokenIDPair(ideaToken);
        require(idPair.exists, "buyTokens: token does not exist");
        marketID = _ideaTokenFactory.getMarketDetailsByID(idPair.marketID).id;
        }

        uint actualAmount = amount;
        uint finalCost;
        uint rawCost;
        uint tradingFee;
        uint platformFee;
        (finalCost, rawCost, tradingFee, platformFee) = getCostsForBuyingTokens(ideaToken, actualAmount);

        if(finalCost > cost) {
            actualAmount = fallbackAmount;
            (finalCost, rawCost, tradingFee, platformFee) = getCostsForBuyingTokens(ideaToken, actualAmount);
    
            require(finalCost <= cost, "buyTokens: slippage too high");
        }

        
        require(_dai.allowance(msg.sender, address(this)) >= finalCost, "buyTokens: not enough allowance");
        require(_dai.transferFrom(msg.sender, address(_interestManager), finalCost), "buyTokens: dai transfer failed");
        
        _interestManager.accrueInterest();
        _interestManager.invest(finalCost);

        TokenExchangeInfo storage exchangeInfo = _tokensExchangeInfo[ideaToken];
        exchangeInfo.invested = exchangeInfo.invested.add(_interestManager.underlyingToInvestmentToken(rawCost));
        _tradingFeeInvested = _tradingFeeInvested.add(_interestManager.underlyingToInvestmentToken(tradingFee));
        _platformFeeInvested[marketID] = _platformFeeInvested[marketID].add(_interestManager.underlyingToInvestmentToken(platformFee));
        exchangeInfo.daiInToken = exchangeInfo.daiInToken.add(rawCost);
    
        emit InvestedState(marketID, ideaToken, exchangeInfo.daiInToken, exchangeInfo.invested, _tradingFeeInvested, _platformFeeInvested[marketID], finalCost);
        IIdeaToken(ideaToken).mint(recipient, actualAmount);
    }

    /**
     * Returns the cost for buying IdeaTokens
     *
     * @param ideaToken The IdeaToken to buy
     * @param amount The amount of IdeaTokens to buy
     *
     * @return The cost in Dai for buying `amount` IdeaTokens
     */
    function getCostForBuyingTokens(address ideaToken, uint amount) external view override returns (uint) {
        (uint finalCost, , , ) = getCostsForBuyingTokens(ideaToken, amount);
        return finalCost;
    }

    /**
     * Calculates each cost related to buying tokens
     *
     * @param ideaToken The IdeaToken to buy
     * @param amount The amount of IdeaTokens to buy
     *
     * @return Final cost, raw cost and trading fee
     */
    function getCostsForBuyingTokens(address ideaToken, uint amount) internal view returns (uint, uint, uint, uint) {
        IIdeaTokenFactory.IDPair memory idPair = _ideaTokenFactory.getTokenIDPair(ideaToken);
        IIdeaTokenFactory.MarketDetails memory marketDetails = _ideaTokenFactory.getMarketDetailsByID(idPair.marketID);

        uint rawCost = getRawCostForBuyingTokens(marketDetails.baseCost,
                                                 marketDetails.priceRise,
                                                 marketDetails.hatchTokens,
                                                 IERC20(ideaToken).totalSupply(),
                                                 amount);

        uint tradingFee = rawCost.mul(marketDetails.tradingFeeRate).div(FEE_SCALE);
        uint platformFee = rawCost.mul(marketDetails.platformFeeRate).div(FEE_SCALE);
        uint finalCost = rawCost.add(tradingFee).add(platformFee);

        return (finalCost, rawCost, tradingFee, platformFee);
    }

    /**
     * Returns the cost for buying tokens without any fees applied
     *
     * @param baseCost The baseCost of the token
     * @param priceRise The priceRise of the token
     * @param hatchTokens The amount of hatch tokens
     * @param supply The current total supply of the token
     * @param amount The amount of IdeaTokens to buy
     *
     * @return The cost buying `amount` IdeaTokens without any fees applied
     */
    function getRawCostForBuyingTokens(uint baseCost, uint priceRise, uint hatchTokens, uint supply, uint amount) internal pure returns (uint) {

        uint hatchCost = 0;
        uint updatedAmount = amount;
        uint updatedSupply;

        if(supply < hatchTokens) {
            // No SafeMath required because supply < hatchTokens
            uint remainingHatchTokens = hatchTokens - supply;

            if(amount <= remainingHatchTokens) {
                return baseCost.mul(amount).div(10**18);
            }

            hatchCost = baseCost.mul(remainingHatchTokens).div(10**18);
            updatedSupply = 0;
            // No SafeMath required because remainingHatchTokens < amount
            updatedAmount = amount - remainingHatchTokens;
        } else {
            // No SafeMath required because supply >= hatchTokens
            updatedSupply = supply - hatchTokens;
        }

        uint priceAtSupply = baseCost.add(priceRise.mul(updatedSupply).div(10**18));
        uint priceAtSupplyPlusAmount = baseCost.add(priceRise.mul(updatedSupply.add(updatedAmount)).div(10**18));
        uint average = priceAtSupply.add(priceAtSupplyPlusAmount).div(2);

        return hatchCost.add(average.mul(updatedAmount).div(10**18));
    }

    /**
     * Withdraws available interest for a publisher
     *
     * @param token The token from which the generated interest is to be withdrawn
     */
    function withdrawInterest(address token) external {
        require(_authorizedInterestWithdrawers[token] == msg.sender, "withdrawInterest: not authorized");
        _interestManager.accrueInterest();

        uint interestPayable = getInterestPayable(token);
        if(interestPayable == 0) {
            return;
        }

        TokenExchangeInfo storage exchangeInfo = _tokensExchangeInfo[token];
        exchangeInfo.invested = exchangeInfo.invested.sub(_interestManager.redeem(msg.sender, interestPayable));

        emit DaiRedeemed(token, exchangeInfo.invested);
    }

    /**
     * Returns the interest available to be paid out
     *
     * @param token The token from which the generated interest is to be withdrawn
     *
     * @return The interest available to be paid out
     */
    function getInterestPayable(address token) public view returns (uint) {
        TokenExchangeInfo storage exchangeInfo = _tokensExchangeInfo[token];
        return _interestManager.investmentTokenToUnderlying(exchangeInfo.invested).sub(exchangeInfo.daiInToken);
    }

    /**
     * Authorizes an address which is allowed to withdraw interest for a token
     *
     * @param token The token for which to authorize an address
     * @param withdrawer The address to be authorized
     */
    function authorizeInterestWithdrawer(address token, address withdrawer) external override {
        address current = _authorizedInterestWithdrawers[token];

        require((current == address(0) && (msg.sender == _owner || msg.sender == _authorizer)) ||
                (current != address(0) && (msg.sender == _owner || msg.sender == _authorizedInterestWithdrawers[token])),
                "authorizeInterestWithdrawer: not authorized");

        _authorizedInterestWithdrawers[token] = withdrawer;

        emit NewInterestWithdrawer(token, withdrawer);
    }

    /**
     * Withdraws available platform fee
     *
     * @param marketID The market from which the generated platform fee is to be withdrawn
     */
    function withdrawPlatformFee(uint marketID) external {
        require(_authorizedPlatformFeeWithdrawers[marketID] == msg.sender, "withdrawPlatformFee: not authorized");
        _interestManager.accrueInterest();

        uint platformFeePayable = getPlatformFeePayable(marketID);
        if(platformFeePayable == 0) {
            return;
        }

        _platformFeeInvested[marketID] = 0;
        _interestManager.redeem(msg.sender, platformFeePayable);

        emit PlatformFeeRedeemed(marketID);
    }

    /**
     * Returns the platform fee available to be paid out
     *
     * @param marketID The market from which the generated interest is to be withdrawn
     *
     * @return The platform fee available to be paid out
     */
    function getPlatformFeePayable(uint marketID) public view returns (uint) {
        return _interestManager.investmentTokenToUnderlying(_platformFeeInvested[marketID]);
    }

    /**
     * Authorizes an address which is allowed to withdraw platform fee for a market
     *
     * @param marketID The market for which to authorize an address
     * @param withdrawer The address to be authorized
     */
    function authorizePlatformFeeWithdrawer(uint marketID, address withdrawer) external override {
        address current = _authorizedPlatformFeeWithdrawers[marketID];

        require((current == address(0) && (msg.sender == _owner || msg.sender == _authorizer)) ||
                (current != address(0) && (msg.sender == _owner || msg.sender == _authorizedPlatformFeeWithdrawers[marketID])),
                "authorizePlatformFeeWithdrawer: not authorized");
        
        _authorizedPlatformFeeWithdrawers[marketID] = withdrawer;

        emit NewPlatformFeeWithdrawer(marketID, withdrawer);
    }

    /**
     * Withdraws available trading fee
     */
    function withdrawTradingFee() external {

        if(_tradingFeeInvested == 0) {
            return;
        }

        uint redeem = _tradingFeeInvested;
        _tradingFeeInvested = 0;
        _interestManager.redeemInvestmentToken(_tradingFeeRecipient, redeem);

        emit TradingFeeRedeemed();
    }

    /**
     * Returns the trading fee available to be paid out
     *
     * @return The trading fee available to be paid out
     */
    function getTradingFeePayable() public view returns (uint) {
        return _interestManager.investmentTokenToUnderlying(_tradingFeeInvested);
    }

    /**
     * Sets the authorizer address
     *
     * @param authorizer The new authorizer address
     */
    function setAuthorizer(address authorizer) external onlyOwner {
        _authorizer = authorizer;
    }

    /**
     * Sets the IdeaTokenFactory address. Only required once for deployment
     *
     * @param factory The address of the IdeaTokenFactory 
     */
    function setIdeaTokenFactoryAddress(address factory) external onlyOwner {
        require(address(_ideaTokenFactory) == address(0));
        _ideaTokenFactory = IIdeaTokenFactory(factory);
    }
}
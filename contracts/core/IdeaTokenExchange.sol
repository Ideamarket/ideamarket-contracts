// SPDX-License-Identifier: MIT
pragma solidity ^0.6.9;
pragma experimental ABIEncoderV2;

import "../util/Ownable.sol";
import "./interfaces/IIdeaTokenExchange.sol";
import "./interfaces/IIdeaToken.sol";
import "./interfaces/IIdeaTokenFactory.sol";
import "./interfaces/IInterestManager.sol";
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

    uint constant FEE_SCALE = 10000;

    address _authorizer;
    uint _tradingFeeInvested; // The amount of "investment tokens" for the collected trading fee, e.g. cDai
    address _tradingFeeRecipient;

    mapping(uint => uint) _platformFeeInvested;
    mapping(uint => address) _authorizedPlatformFeeWithdrawers;

    mapping(address => TokenExchangeInfo) _tokensExchangeInfo;
    mapping(address => address) _authorizedInterestWithdrawers;

    mapping(address => bool) _tokenFeeKillswitch;

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

        MarketDetails memory marketDetails = _ideaTokenFactory.getMarketDetailsByTokenAddress(ideaToken);
        require(marketDetails.exists, "sellTokens: token does not exist");

        CostAndPriceAmounts memory amounts = getPricesForSellingTokens(marketDetails, IERC20(ideaToken).totalSupply(), amount, _tokenFeeKillswitch[ideaToken]);

        require(amounts.total >= minPrice, "sellTokens: price subceeds min price");
        require(IIdeaToken(ideaToken).balanceOf(msg.sender) >= amount, "sellTokens: not enough tokens");
        
        IIdeaToken(ideaToken).burn(msg.sender, amount);

        _interestManager.accrueInterest();
        TokenExchangeInfo storage exchangeInfo = _tokensExchangeInfo[ideaToken];
        {
        uint totalRedeemed = _interestManager.redeem(address(this), amounts.total);
        uint tradingFeeRedeemed = _interestManager.underlyingToInvestmentToken(amounts.tradingFee);
        uint platformFeeRedeemed = _interestManager.underlyingToInvestmentToken(amounts.platformFee);

        exchangeInfo.invested = exchangeInfo.invested.sub(totalRedeemed.add(tradingFeeRedeemed).add(platformFeeRedeemed));
        _tradingFeeInvested = _tradingFeeInvested.add(tradingFeeRedeemed);
        _platformFeeInvested[marketDetails.id] = _platformFeeInvested[marketDetails.id].add(platformFeeRedeemed);
        exchangeInfo.daiInToken = exchangeInfo.daiInToken.sub(amounts.raw);
        }

        emit InvestedState(marketDetails.id, ideaToken, exchangeInfo.daiInToken, exchangeInfo.invested, _tradingFeeInvested, _platformFeeInvested[marketDetails.id], amounts.raw);
        _dai.transfer(recipient, amounts.total);
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
        MarketDetails memory marketDetails = _ideaTokenFactory.getMarketDetailsByTokenAddress(ideaToken);
        return getPricesForSellingTokens(marketDetails, IERC20(ideaToken).totalSupply(), amount, _tokenFeeKillswitch[ideaToken]).total;
    }

    /**
     * Calculates each price related to selling tokens
     *
     * @param marketDetails The market details
     * @param supply The existing supply of the IdeaToken
     * @param amount The amount of IdeaTokens to sell
     *
     * @return total cost, raw cost and trading fee
     */
    function getPricesForSellingTokens(MarketDetails memory marketDetails, uint supply, uint amount, bool feesDisabled) public pure override returns (CostAndPriceAmounts memory) {
        
        uint rawPrice = getRawPriceForSellingTokens(marketDetails.baseCost,
                                                    marketDetails.priceRise,
                                                    marketDetails.hatchTokens,
                                                    supply,
                                                    amount);

        

        uint tradingFee = 0;
        uint platformFee = 0;

        if(!feesDisabled) {
            tradingFee = rawPrice.mul(marketDetails.tradingFeeRate).div(FEE_SCALE);
            platformFee = rawPrice.mul(marketDetails.platformFeeRate).div(FEE_SCALE);
        }   
        
        uint totalPrice = rawPrice.sub(tradingFee).sub(platformFee);

        return CostAndPriceAmounts({
            total: totalPrice,
            raw: rawPrice,
            tradingFee: tradingFee,
            platformFee: platformFee
        });
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
        MarketDetails memory marketDetails = _ideaTokenFactory.getMarketDetailsByTokenAddress(ideaToken);
        require(marketDetails.exists, "buyTokens: token does not exist");
        uint marketID = marketDetails.id;

        uint supply = IERC20(ideaToken).totalSupply();
        bool feesDisabled = _tokenFeeKillswitch[ideaToken];
        uint actualAmount = amount;

        CostAndPriceAmounts memory amounts = getCostsForBuyingTokens(marketDetails, supply, actualAmount, feesDisabled);

        if(amounts.total > cost) {
            actualAmount = fallbackAmount;
            amounts = getCostsForBuyingTokens(marketDetails, supply, actualAmount, feesDisabled);
    
            require(amounts.total <= cost, "buyTokens: slippage too high");
        }

        
        require(_dai.allowance(msg.sender, address(this)) >= amounts.total, "buyTokens: not enough allowance");
        require(_dai.transferFrom(msg.sender, address(_interestManager), amounts.total), "buyTokens: dai transfer failed");
        
        _interestManager.accrueInterest();
        _interestManager.invest(amounts.total);

        TokenExchangeInfo storage exchangeInfo = _tokensExchangeInfo[ideaToken];
        exchangeInfo.invested = exchangeInfo.invested.add(_interestManager.underlyingToInvestmentToken(amounts.raw));
        _tradingFeeInvested = _tradingFeeInvested.add(_interestManager.underlyingToInvestmentToken(amounts.tradingFee));
        _platformFeeInvested[marketID] = _platformFeeInvested[marketID].add(_interestManager.underlyingToInvestmentToken(amounts.platformFee));
        exchangeInfo.daiInToken = exchangeInfo.daiInToken.add(amounts.raw);
    
        emit InvestedState(marketID, ideaToken, exchangeInfo.daiInToken, exchangeInfo.invested, _tradingFeeInvested, _platformFeeInvested[marketID], amounts.total);
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
        MarketDetails memory marketDetails = _ideaTokenFactory.getMarketDetailsByTokenAddress(ideaToken);

        return getCostsForBuyingTokens(marketDetails, IERC20(ideaToken).totalSupply(), amount, _tokenFeeKillswitch[ideaToken]).total;
    }

    /**
     * Calculates each cost related to buying tokens
     *
     * @param marketDetails The market details
     * @param supply The existing supply of the IdeaToken
     * @param amount The amount of IdeaTokens to buy
     *
     * @return total cost, raw cost, trading fee, platform fee
     */
    function getCostsForBuyingTokens(MarketDetails memory marketDetails, uint supply, uint amount, bool feesDisabled) public pure override returns (CostAndPriceAmounts memory) {
        uint rawCost = getRawCostForBuyingTokens(marketDetails.baseCost,
                                                 marketDetails.priceRise,
                                                 marketDetails.hatchTokens,
                                                 supply,
                                                 amount);

        uint tradingFee = 0;
        uint platformFee = 0;

        if(!feesDisabled) {
            tradingFee = rawCost.mul(marketDetails.tradingFeeRate).div(FEE_SCALE);
            platformFee = rawCost.mul(marketDetails.platformFeeRate).div(FEE_SCALE);
        }
        
        uint totalCost = rawCost.add(tradingFee).add(platformFee);

        return CostAndPriceAmounts({
            total: totalCost,
            raw: rawCost,
            tradingFee: tradingFee,
            platformFee: platformFee
        });
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
    function withdrawInterest(address token) external override {
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
    function withdrawTradingFee() external override {

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
    function getTradingFeePayable() public view override returns (uint) {
        return _interestManager.investmentTokenToUnderlying(_tradingFeeInvested);
    }

    /**
     * Sets the authorizer address
     *
     * @param authorizer The new authorizer address
     */
    function setAuthorizer(address authorizer) external override onlyOwner {
        _authorizer = authorizer;
    }

    /**
     * Returns whether or not fees are disabled for a specific IdeaToken
     *
     * @param ideaToken The IdeaToken
     *
     * @return Whether or not fees are disabled for a specific IdeaToken
     */
    function isTokenFeeDisabled(address ideaToken) external view override returns (bool) {
        return _tokenFeeKillswitch[ideaToken];
    }

    /**
     * Sets the fee killswitch for an IdeaToken
     *
     * @param ideaToken The IdeaToken
     * @param set Whether or not to enable the killswitch
     */
    function setTokenFeeKillswitch(address ideaToken, bool set) external override onlyOwner {
        _tokenFeeKillswitch[ideaToken] = set;
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
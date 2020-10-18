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
 * @dev Exchanges Dai <-> IdeaTokens using a bonding curve. Sits behind a proxy
 */
contract IdeaTokenExchange is IIdeaTokenExchange, Initializable, Ownable {
    using SafeMath for uint256;

    struct TokenExchangeInfo {
        uint daiInToken; // The amount of Dai collected by trading
        uint invested; // The amount of "investment tokens", e.g. cDai
    }

    uint constant private FEE_SCALE = 10000;

    uint _tradingFeeInvested; // The amount of "investment tokens" for the collected trading fee, e.g. cDai
    address _tradingFeeRecipient;

    mapping(uint => uint) _platformFeeInvested;
    mapping(uint => address) _authorizedPlatformFeeWithdrawers;

    mapping(address => TokenExchangeInfo) _tokensExchangeInfo;
    mapping(address => address) _authorizedInterestWithdrawers;

    IIdeaTokenFactory _ideaTokenFactory;
    IInterestManager _interestManager;
    IERC20 _dai;

    event TokensBought(address ideaToken, uint amount, uint rawCost, uint finalCost);
    event TokensSold(address ideaToken, uint amount, uint rawPrice, uint finalPrice);
    event NewInterestWithdrawer(address ideaToken, address withdrawer);
    event NewPlatformFeeWithdrawer(uint marketID, address withdrawer);

    /**
     * @dev Initializes the contract
     *
     * @param owner The owner of the contract
     * @param tradingFeeRecipient The address of the recipient of the trading fee
     * @param interestManager The address of the InterestManager
     * @param dai The address of Dai
     */
    function initialize(address owner,
                        address tradingFeeRecipient,
                        address interestManager,
                        address dai) external initializer {
        setOwnerInternal(owner);
        _tradingFeeRecipient = tradingFeeRecipient;
        _interestManager = IInterestManager(interestManager);
        _dai = IERC20(dai);
    }

    /**
     * @dev Burns IdeaTokens in exchange for Dai
     *
     * @param ideaToken The IdeaToken to sell
     * @param amount The amount of IdeaTokens to sell
     * @param minPrice The minimum allowed price in Dai for selling `amount` IdeaTokens
     * @param recipient The recipient of the redeemed Dai
     */
    function sellTokens(address ideaToken, uint amount, uint minPrice, address recipient) external override {
        IIdeaTokenFactory.IDPair memory idPair = _ideaTokenFactory.getTokenIDPair(ideaToken);
        require(idPair.exists, "sellTokens: token does not exist");
        IIdeaTokenFactory.MarketDetails memory marketDetails = _ideaTokenFactory.getMarketDetailsByID(idPair.marketID);

        (uint finalPrice, uint rawPrice, uint tradingFee, uint platformFee) = getPricesForSellingTokens(ideaToken, amount);

        require(finalPrice >= minPrice, "sellTokens: price subceeds min price");
        require(IIdeaToken(ideaToken).balanceOf(msg.sender) >= amount, "sellTokens: not enough tokens");
        
        IIdeaToken(ideaToken).burn(msg.sender, amount);

        _interestManager.accrueInterest();
        uint finalRedeemed = _interestManager.redeem(address(this), finalPrice);
        uint tradingFeeRedeemed = _interestManager.underlyingToInvestmentToken(tradingFee);
        uint platformFeeRedeemed = _interestManager.underlyingToInvestmentToken(platformFee);

        TokenExchangeInfo storage exchangeInfo = _tokensExchangeInfo[ideaToken];
        exchangeInfo.invested = exchangeInfo.invested.sub(finalRedeemed.add(tradingFeeRedeemed).add(platformFeeRedeemed));
        _tradingFeeInvested = _tradingFeeInvested.add(tradingFeeRedeemed);
        _platformFeeInvested[marketDetails.id] = _platformFeeInvested[marketDetails.id].add(platformFeeRedeemed);
        exchangeInfo.daiInToken = exchangeInfo.daiInToken.sub(rawPrice);
    
        emit TokensSold(ideaToken, amount, rawPrice, finalPrice);
        _dai.transfer(recipient, finalPrice);
    }

    /**
     * @dev Returns the price for selling IdeaTokens
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
     * @dev Calculates each price related to selling tokens
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
                                                    IERC20(ideaToken).totalSupply(),
                                                    amount);

        uint tradingFee = rawPrice.mul(marketDetails.tradingFeeRate).div(FEE_SCALE);
        uint platformFee = rawPrice.mul(marketDetails.platformFeeRate).div(FEE_SCALE);
        uint finalCost = rawPrice.sub(tradingFee).sub(platformFee);

        return (finalCost, rawPrice, tradingFee, platformFee);
    }

    /**
     * @dev Returns the price for selling tokens without any fees applied
     *
     * @param b The baseCost of the token
     * @param r The priceRise of the token
     * @param supply The current total supply of the token
     * @param amount The amount of IdeaTokens to sell
     *
     * @return The price selling `amount` IdeaTokens without any fees applied
     */
    function getRawPriceForSellingTokens(uint b, uint r, uint supply, uint amount) internal pure returns (uint) {
        uint priceAtSupply = b.add(r.mul(supply).div(10**18));
        uint priceAtSupplyMinusAmount = b.add(r.mul(supply.sub(amount)).div(10**18));
        uint average = priceAtSupply.add(priceAtSupplyMinusAmount).div(2);
    
        return average.mul(amount).div(10**18);
    }

    /**
     * @dev Mints IdeaTokens in exchange for Dai
     *
     * @param ideaToken The IdeaToken to buy
     * @param amount The amount of IdeaTokens to buy
     * @param fallbackAmount The fallback amount to buy in case the price changed
     * @param cost The maximum allowed cost in Dai
     * @param recipient The recipient of the bought IdeaTokens
     */
    function buyTokens(address ideaToken, uint amount, uint fallbackAmount, uint cost, address recipient) external override {
        IIdeaTokenFactory.IDPair memory idPair = _ideaTokenFactory.getTokenIDPair(ideaToken);
        require(idPair.exists, "buyTokens: token does not exist");
        IIdeaTokenFactory.MarketDetails memory marketDetails = _ideaTokenFactory.getMarketDetailsByID(idPair.marketID);

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
        _platformFeeInvested[marketDetails.id] = _platformFeeInvested[marketDetails.id].add(_interestManager.underlyingToInvestmentToken(platformFee));
        exchangeInfo.daiInToken = exchangeInfo.daiInToken.add(rawCost);
    
        emit TokensBought(ideaToken, actualAmount, rawCost, finalCost);
        IIdeaToken(ideaToken).mint(recipient, actualAmount);
    }

    /**
     * @dev Returns the cost for buying IdeaTokens
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
     * @dev Calculates each cost related to buying tokens
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
                                                 IERC20(ideaToken).totalSupply(),
                                                 amount);

        uint tradingFee = rawCost.mul(marketDetails.tradingFeeRate).div(FEE_SCALE);
        uint platformFee = rawCost.mul(marketDetails.platformFeeRate).div(FEE_SCALE);
        uint finalCost = rawCost.add(tradingFee).add(platformFee);

        return (finalCost, rawCost, tradingFee, platformFee);
    }

    /**
     * @dev Returns the cost for buying tokens without any fees applied
     *
     * @param b The baseCost of the token
     * @param r The priceRise of the token
     * @param supply The current total supply of the token
     * @param amount The amount of IdeaTokens to buy
     *
     * @return The cost buying `amount` IdeaTokens without any fees applied
     */
    function getRawCostForBuyingTokens(uint b, uint r, uint supply, uint amount) internal pure returns (uint) {
        uint priceAtSupply = b.add(r.mul(supply).div(10**18));
        uint priceAtSupplyPlusAmount = b.add(r.mul(supply.add(amount)).div(10**18));
        uint average = priceAtSupply.add(priceAtSupplyPlusAmount).div(2);

        return average.mul(amount).div(10**18);
    }

    /**
     * @dev Withdraws available interest for a publisher
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
    }

    /**
     * @dev Returns the interest available to be paid out
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
     * @dev Authorizes an address which is allowed to withdraw interest for a token
     *
     * @param token The token for which to authorize an address
     * @param withdrawer The address to be authorized
     */
    function authorizeInterestWithdrawer(address token, address withdrawer) external override {
        require(msg.sender == _owner || msg.sender == _authorizedInterestWithdrawers[token], "authorizeInterestWithdrawer: not authorized");
        _authorizedInterestWithdrawers[token] = withdrawer;

        emit NewInterestWithdrawer(token, withdrawer);
    }

    /**
     * @dev Withdraws available platform fee
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
    }

    /**
     * @dev Returns the platform fee available to be paid out
     *
     * @param marketID The market from which the generated interest is to be withdrawn
     *
     * @return The platform fee available to be paid out
     */
    function getPlatformFeePayable(uint marketID) public view returns (uint) {
        return _interestManager.investmentTokenToUnderlying(_platformFeeInvested[marketID]);
    }

    /**
     * @dev Authorizes an address which is allowed to withdraw platform fee for a market
     *
     * @param marketID The market for which to authorize an address
     * @param withdrawer The address to be authorized
     */
    function authorizePlatformFeeWithdrawer(uint marketID, address withdrawer) external override {
        require(msg.sender == _owner || msg.sender == _authorizedPlatformFeeWithdrawers[marketID], "authorizePlatformFeeWithdrawer: not authorized");
        _authorizedPlatformFeeWithdrawers[marketID] = withdrawer;

        emit NewPlatformFeeWithdrawer(marketID, withdrawer);
    }

    /**
     * @dev Withdraws available trading fee
     */
    function withdrawTradingFee() external {

        if(_tradingFeeInvested == 0) {
            return;
        }

        uint redeem = _tradingFeeInvested;
        _tradingFeeInvested = 0;
        _interestManager.redeemInvestmentToken(_tradingFeeRecipient, redeem);
    }

    /**
     * @dev Returns the trading fee available to be paid out
     *
     * @return The trading fee available to be paid out
     */
    function getTradingFeePayable() public view returns (uint) {
        return _interestManager.investmentTokenToUnderlying(_tradingFeeInvested);
    }

    /**
     * @dev Sets the IdeaTokenFactory address. Only required once for deployment
     *
     * @param factory The address of the IdeaTokenFactory 
     */
    function setIdeaTokenFactoryAddress(address factory) external onlyOwner {
        require(address(_ideaTokenFactory) == address(0));
        _ideaTokenFactory = IIdeaTokenFactory(factory);
    }
}
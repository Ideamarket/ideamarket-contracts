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

    event TokensBought(address ideaToken, uint amount, uint price, uint tradingFee, uint platformFee);
    event TokensSold(address ideaToken, uint amount, uint price, uint tradingFee, uint platformFee);
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
     * @param tokenAmount The amount of IdeaTokens to sell
     * @param minOutput The minimum output in Dai
     * @param recipient The recipient of the redeemed Dai
     */
    function sellTokens(address ideaToken, uint tokenAmount, uint minOutput, address recipient) external override {
        IIdeaTokenFactory.IDPair memory idPair = _ideaTokenFactory.getTokenIDPair(ideaToken);
        require(idPair.exists, "sellTokens: token does not exist");
        IIdeaTokenFactory.MarketDetails memory marketDetails = _ideaTokenFactory.getMarketDetailsByID(idPair.marketID);

        (uint output, uint tradingFee, uint platformFee) = getSellOutputAndFees(ideaToken, tokenAmount);

        require(output >= minOutput, "sellTokens: price subceeds min price");
        require(IIdeaToken(ideaToken).balanceOf(msg.sender) >= tokenAmount, "sellTokens: not enough tokens");
        
        IIdeaToken(ideaToken).burn(msg.sender, tokenAmount);

        // TODO: Make this more efficient
        uint finalRedeemed = _interestManager.redeem(address(this), output);
        uint tradingFeeRedeemed = _interestManager.redeem(address(_interestManager), tradingFee);
        _interestManager.invest(tradingFee);
        uint platformFeeRedeemed = _interestManager.redeem(address(_interestManager), platformFee);
        _interestManager.invest(platformFee);

        TokenExchangeInfo storage exchangeInfo = _tokensExchangeInfo[ideaToken];
        exchangeInfo.invested = exchangeInfo.invested.sub(finalRedeemed.add(tradingFeeRedeemed).add(platformFeeRedeemed));
        _tradingFeeInvested = _tradingFeeInvested.add(tradingFeeRedeemed);
        _platformFeeInvested[marketDetails.id] = _platformFeeInvested[marketDetails.id].add(platformFeeRedeemed);
        exchangeInfo.daiInToken = exchangeInfo.daiInToken.sub(output.add(tradingFee).add(platformFee));
    
        emit TokensSold(ideaToken, tokenAmount, output, tradingFee, platformFee);
        _dai.transfer(recipient, output);
    }

    /**
     * @dev Returns the amount of Dai receivable by selling a given amount of IdeaTokens
     *
     * @param ideaToken The IdeaToken to sell
     * @param tokenAmount The amount of IdeaTokens to sell
     *
     * @return The amount of Dai receivable by selling a given amount of IdeaTokens
     */
    function getSellOutput(address ideaToken, uint tokenAmount) external view override returns (uint) {
        (uint output, , ) = getSellOutputAndFees(ideaToken, tokenAmount);
        return output;
    }

    /**
     * @dev Calculates output and fees related to selling tokens
     *
     * @param ideaToken The IdeaToken to sell
     * @param tokenAmount The amount of IdeaTokens to sell
     *
     * @return Output, trading fee, platform fee
     */
    function getSellOutputAndFees(address ideaToken, uint tokenAmount) internal view returns (uint, uint, uint) {
        IIdeaTokenFactory.IDPair memory idPair = _ideaTokenFactory.getTokenIDPair(ideaToken);
        IIdeaTokenFactory.MarketDetails memory marketDetails = _ideaTokenFactory.getMarketDetailsByID(idPair.marketID);

        uint rawOutput = getRawSellOutput(marketDetails.basePrice,
                                          marketDetails.priceRise,
                                          tokenAmount);

        uint tradingFee = rawOutput.mul(marketDetails.tradingFeeRate).div(FEE_SCALE);
        uint platformFee = rawOutput.mul(marketDetails.platformFeeRate).div(FEE_SCALE);
        uint remaining = rawOutput.sub(tradingFee).sub(platformFee);
    
        return (remaining, tradingFee, platformFee);
    }

    /**
     * @dev Returns the amount of Dai receivable for selling a given amount of IdeaTokens without any fees applied
     *
     * @param basePrice The base price of the token
     * @param priceRise The price rise of the token
     * @param tokenAmount The amount IdeaTokens to sell
     *
     * @return The amount of Dai receivable for selling a given amount of IdeaTokens without any fees applied
     */
    function getRawSellOutput(uint basePrice, uint priceRise, uint tokenAmount) internal pure returns (uint) {
        return basePrice.add(priceRise.mul(tokenAmount).div(10**18));
    }

    /**
     * @dev Mints IdeaTokens in exchange for Dai
     *
     * @param ideaToken The IdeaToken to buy
     * @param daiAmount The amount of Dai to spend
     * @param minOutput The minimum output in IdeaTokens
     * @param recipient The recipient of the bought IdeaTokens
     */
    function buyTokens(address ideaToken, uint daiAmount, uint minOutput, address recipient) external override {
        IIdeaTokenFactory.IDPair memory idPair = _ideaTokenFactory.getTokenIDPair(ideaToken);
        require(idPair.exists, "buyTokens: token does not exist");
        IIdeaTokenFactory.MarketDetails memory marketDetails = _ideaTokenFactory.getMarketDetailsByID(idPair.marketID);

        (uint output, uint tradingFee, uint platformFee) = getBuyOutputAndFees(ideaToken, daiAmount);
        uint rawCost = daiAmount.sub(tradingFee).sub(platformFee);

        require(output >= minOutput, "buyTokens: slippage");
        require(_dai.allowance(msg.sender, address(this)) >= daiAmount, "buyTokens: not enough allowance");
        require(_dai.transferFrom(msg.sender, address(_interestManager), daiAmount), "buyTokens: dai transfer failed");
        
        // TODO: Can we do a single invest call? Worried about rounding errors when dividing
        TokenExchangeInfo storage exchangeInfo = _tokensExchangeInfo[ideaToken];
        exchangeInfo.invested = exchangeInfo.invested.add(_interestManager.invest(rawCost));
        _tradingFeeInvested = _tradingFeeInvested.add(_interestManager.invest(tradingFee));
        _platformFeeInvested[marketDetails.id] = _platformFeeInvested[marketDetails.id].add(_interestManager.invest(platformFee));
        exchangeInfo.daiInToken = exchangeInfo.daiInToken.add(rawCost);
    
        emit TokensBought(ideaToken, output, daiAmount, tradingFee, platformFee);
        IIdeaToken(ideaToken).mint(recipient, output);
    }

    /**
     * @dev Returns the amount of IdeaTokens purchasable for a given amount of Dai
     *
     * @param ideaToken The IdeaToken to buy
     * @param daiAmount The amount of Dai to spend
     *
     * @return The amount of IdeaTokens purchasable for a given amount of Dai
     */
    function getBuyOutput(address ideaToken, uint daiAmount) external view override returns (uint) {
        (uint output, , ) = getBuyOutputAndFees(ideaToken, daiAmount);
        return output;
    }

    /**
     * @dev Calculates output and fees related to buying tokens
     *
     * @param ideaToken The IdeaToken to buy
     * @param daiAmount The amount of Dai to spend
     *
     * @return Output, trading fee, platform fee
     */
    function getBuyOutputAndFees(address ideaToken, uint daiAmount) internal view returns (uint, uint, uint) {
        IIdeaTokenFactory.IDPair memory idPair = _ideaTokenFactory.getTokenIDPair(ideaToken);
        IIdeaTokenFactory.MarketDetails memory marketDetails = _ideaTokenFactory.getMarketDetailsByID(idPair.marketID);

        uint tradingFee = daiAmount.mul(marketDetails.tradingFeeRate).div(FEE_SCALE);
        uint platformFee = daiAmount.mul(marketDetails.platformFeeRate).div(FEE_SCALE);
        uint remaining = daiAmount.sub(tradingFee).sub(platformFee);

        uint output = getRawBuyOutput(marketDetails.basePrice,
                                      marketDetails.priceRise,
                                      remaining);

        return (output, tradingFee, platformFee);
    }

    /**
     * @dev Returns the amount of purchasable IdeaTokens for a given amount of Dai without any fees applied
     *
     * @param basePrice The base price of the token
     * @param priceRise The price rise of the token
     * @param daiAmount The amount of Dai to spend
     *
     * @return The amount of purchasable IdeaTokens for a given amount of Dai without any fees applied
     */
    function getRawBuyOutput(uint basePrice, uint priceRise, uint daiAmount) internal pure returns (uint) {
        return daiAmount.sub(basePrice).mul(10**18).div(priceRise);
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
        return exchangeInfo.invested.mul(_interestManager.getExchangeRate())
                                    .div(10**18)
                                    .sub(exchangeInfo.daiInToken);
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
        return _platformFeeInvested[marketID].mul(_interestManager.getExchangeRate()).div(10**18);
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
        return _tradingFeeInvested.mul(_interestManager.getExchangeRate()).div(10**18);
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
// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "./interfaces/IIdeaTokenExchangeStateTransferOVM.sol";
import "./interfaces/IInterestManagerStateTransferOVM.sol";
import "../core/IdeaTokenExchangeOVM.sol"; 

contract IdeaTokenExchangeStateTransferOVM is IdeaTokenExchangeOVM, IIdeaTokenExchangeStateTransferOVM {

    /*
        TODO: EVENTS
    */

    function setStaticVars(uint tradingFeeInvested) external override onlyBridge {
        _tradingFeeInvested = tradingFeeInvested;
        IInterestManagerStateTransferOVM(address(_interestManager)).addToTotalShares(tradingFeeInvested);
    }

    function setPlatformVars(uint marketID, uint dai, uint invested, uint platformFeeInvested) external override onlyBridge {
        ExchangeInfo storage exchangeInfo = _platformsExchangeInfo[marketID];
        exchangeInfo.dai = dai;
        exchangeInfo.invested = invested;

        _platformFeeInvested[marketID] = platformFeeInvested;

        IInterestManagerStateTransferOVM(address(_interestManager)).addToTotalShares(invested.add(platformFeeInvested));
    }

    function setTokenVarsAndMint(uint marketID, uint tokenID, uint supply, uint dai, uint invested) external override onlyBridge {
        TokenInfo memory tokenInfo = _ideaTokenFactory.getTokenInfo(marketID, tokenID);
        require(tokenInfo.exists, "not-exist");

        IIdeaToken ideaToken = tokenInfo.ideaToken;
        address ideaTokenAddress = address(ideaToken);

        _tokensExchangeInfo[ideaTokenAddress] = ExchangeInfo({
            dai: dai,
            invested: invested
        });

        IInterestManagerStateTransferOVM(address(_interestManager)).addToTotalShares(invested);
        ideaToken.mint(_bridge, supply);
    }

    // --- Disabled functions during state transfer ---
    function sellTokens(address ideaToken, uint amount, uint minPrice, address recipient) external override {
        ideaToken;
        amount;
        minPrice;
        recipient;

        revert("state-transfer");
    }

    function buyTokens(address ideaToken, uint amount, uint fallbackAmount, uint cost, address recipient) external override {
        ideaToken;
        amount;
        fallbackAmount;
        cost;
        recipient;

        revert("state-transfer");
    }

    function withdrawTokenInterest(address token) external override {
        token;

        revert("state-transfer");
    }

    function withdrawPlatformInterest(uint marketID) external override {
        marketID;

        revert("state-transfer");
    }

    function withdrawPlatformFee(uint marketID) external override {
        marketID;

        revert("state-transfer");
    }

    function withdrawTradingFee() external override {
        revert("state-transfer");
    }

    function setTokenOwner(address token, address owner) external override {
        token;
        owner;

        revert("state-transfer");
    }
}
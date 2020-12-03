// SPDX-License-Identifier: MIT
pragma solidity ^0.6.9;
pragma experimental ABIEncoderV2;

import "./IIdeaTokenFactory.sol";

/**
 * @title IIdeaTokenExchange
 * @author Alexander Schlindwein
 */

struct CostAndPriceAmounts {
    uint total;
    uint raw;
    uint tradingFee;
    uint platformFee;
}

interface IIdeaTokenExchange {
    function sellTokens(address ideaToken, uint amount, uint minPrice, address recipient) external;
    function getPriceForSellingTokens(address ideaToken, uint amount) external view returns (uint);
    function getPricesForSellingTokens(MarketDetails memory marketDetails, uint supply, uint amount, bool feesDisabled) external pure returns (CostAndPriceAmounts memory);
    function buyTokens(address ideaToken, uint amount, uint fallbackAmount, uint cost, address recipient) external;
    function getCostForBuyingTokens(address ideaToken, uint amount) external view returns (uint);
    function getCostsForBuyingTokens(MarketDetails memory marketDetails, uint supply, uint amount, bool feesDisabled) external pure returns (CostAndPriceAmounts memory);
    function authorizeInterestWithdrawer(address ideaToken, address withdrawer) external;
    function authorizePlatformFeeWithdrawer(uint marketID, address withdrawer) external;
    function withdrawTradingFee() external;
    function withdrawInterest(address token) external;
    function getTradingFeePayable() external view returns (uint);
    function setAuthorizer(address authorizer) external;
    function isTokenFeeDisabled(address ideaToken) external view returns (bool);
    function setTokenFeeKillswitch(address ideaToken, bool set) external;
}
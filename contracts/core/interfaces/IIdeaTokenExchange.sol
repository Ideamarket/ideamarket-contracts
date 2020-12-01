// SPDX-License-Identifier: MIT
pragma solidity ^0.6.9;
pragma experimental ABIEncoderV2;

import "./IIdeaTokenFactory.sol";

/**
 * @title IIdeaTokenExchange
 * @author Alexander Schlindwein
 */
interface IIdeaTokenExchange {
    function sellTokens(address ideaToken, uint amount, uint minPrice, address recipient) external;
    function getPriceForSellingTokens(address ideaToken, uint amount) external view returns (uint);
    function getPricesForSellingTokens(MarketDetails memory marketDetails, uint supply, uint amount) external pure returns (uint, uint, uint, uint);
    function buyTokens(address ideaToken, uint amount, uint fallbackAmount, uint cost, address recipient) external;
    function getCostForBuyingTokens(address ideaToken, uint amount) external view returns (uint);
    function getCostsForBuyingTokens(MarketDetails memory marketDetails, uint supply, uint amount) external pure returns (uint, uint, uint, uint);
    function authorizeInterestWithdrawer(address ideaToken, address withdrawer) external;
    function authorizePlatformFeeWithdrawer(uint marketID, address withdrawer) external;
}
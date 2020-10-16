// SPDX-License-Identifier: MIT
pragma solidity ^0.6.9;

/**
 * @title IIdeaTokenExchange
 * @author Alexander Schlindwein
 *
 * @dev Interface for IdeaTokenExchange
 */
interface IIdeaTokenExchange {
    function sellTokens(address ideaToken, uint amount, uint minPrice, address recipient) external;
    function getPriceForSellingTokens(address ideaToken, uint amount) external view returns (uint);
    function buyTokens(address ideaToken, uint amount, uint maxCost, address recipient) external;
    function getCostForBuyingTokens(address ideaToken, uint amount) external view returns (uint);
    function authorizeInterestWithdrawer(address ideaToken, address withdrawer) external;
    function authorizePlatformFeeWithdrawer(uint marketID, address withdrawer) external;
}
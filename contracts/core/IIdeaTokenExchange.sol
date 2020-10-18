// SPDX-License-Identifier: MIT
pragma solidity ^0.6.9;

/**
 * @title IIdeaTokenExchange
 * @author Alexander Schlindwein
 *
 * @dev Interface for IdeaTokenExchange
 */
interface IIdeaTokenExchange {
    function sellTokens(address ideaToken, uint tokenAmount, uint minOutput, address recipient) external;
    function getSellOutput(address ideaToken, uint tokenAmount) external view returns (uint);
    function buyTokens(address ideaToken, uint daiAmount, uint minOutput, address recipient) external;
    function getBuyOutput(address ideaToken, uint amount) external view returns (uint);
    function authorizeInterestWithdrawer(address ideaToken, address withdrawer) external;
    function authorizePlatformFeeWithdrawer(uint marketID, address withdrawer) external;
}
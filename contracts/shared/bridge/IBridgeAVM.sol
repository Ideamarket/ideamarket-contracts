// SPDX-License-Identifier: MIT
pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

/**
 * @title IBridgeAVM
 * @author Alexander Schlindwein
 */
interface IBridgeAVM {
    function initialize(address l1Exchange, address l2Exchange, address l2Factory) external;
    function receiveExchangeStaticVars(uint tradingFeeInvested) external;
    function receiveExchangePlatformVars(uint marketID, uint dai, uint invested, uint platformFeeInvested) external;
    function receiveExchangeTokenVars(uint marketID, uint[] calldata tokenIDs, string[] calldata names, uint[] calldata supplies, uint[] calldata dais, uint[] calldata investeds) external;
    function setTokenVars(uint marketID, uint[] calldata tokenID) external;
    function receiveIdeaTokenTransfer(uint marketID, uint tokenID, uint amount, address to) external;
}
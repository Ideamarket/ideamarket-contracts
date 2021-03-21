// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

/**
 * @title IBridgeOVM
 * @author Alexander Schlindwein
 */
interface IBridgeOVM {
    function initialize(address l1Exchange, address l2CrossDomainMessenger, address l2Exchange, address l2Factory) external;
    function receiveExchangeStaticVars(uint tradingFeeInvested) external;
    function receiveExchangePlatformVars(uint marketID, uint dai, uint invested, uint platformFeeInvested) external;
    function receiveExchangeTokenVars(uint marketID, uint[] calldata tokenIDs, string[] calldata names, uint[] calldata supplies, uint[] calldata dais, uint[] calldata investeds) external;
    function setTokenVars(uint marketID, uint[] calldata tokenID) external;
    function receiveIdeaTokenTransfer(uint marketID, uint tokenID, uint amount, address to) external;
}
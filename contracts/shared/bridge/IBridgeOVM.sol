// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

interface IBridgeOVM {
    function setL2Exchange(address l2Exchange) external;
    function setL2Factory(address l2Exchange) external;
    function receiveExchangeStaticVars(uint tradingFeeInvested) external;
    function receiveExchangePlatformVars(uint marketID, uint dai, uint invested, uint platformFeeInvested) external;
    function receiveExchangeTokenVars(uint marketID, uint[] calldata tokenIDs, string[] calldata names, uint[] calldata supplies, uint[] calldata dais, uint[] calldata investeds) external;
    function setTokenVars(uint marketID, uint tokenID) external;
}
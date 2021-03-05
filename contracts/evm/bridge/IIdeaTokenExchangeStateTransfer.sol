// SPDX-License-Identifier: MIT
// @unsupported: ovm
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

interface IIdeaTokenExchangeStateTransfer {
    function initializeStateTransfer(address transferManager, address l2Bridge, address crossDomainMessenger) external;
    function transferStaticVars() external;
    function transferPlatformVars(uint marketID) external;
    function transferTokenVars(uint marketID, uint[] calldata tokenIDs) external;
    function transferIdeaTokens(uint marketID, uint tokenID, address l2Recipient) external;
    function setTokenTransferEnabled() external;
}


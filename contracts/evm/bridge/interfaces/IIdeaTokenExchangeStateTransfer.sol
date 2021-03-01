// SPDX-License-Identifier: MIT
pragma solidity 0.6.9;

/**
 * @title IIdeaTokenExchangeStateTransfer
 * @author Alexander Schlindwein
 */
interface IIdeaTokenExchangeStateTransfer {
    function initializeStateTransfer(address transferManager, address l2InterestManager, address l1Inbox) external;
    function transferStaticVars(uint gasLimit, uint maxSubmissionCost, uint l2GasPriceBid) external payable returns (uint);
    function transferPlatformVars(uint marketID, uint gasLimit, uint maxSubmissionCost, uint l2GasPriceBid) external payable returns (uint);
    function transferTokenVars(uint marketID, uint[] calldata tokenIDs, uint gasLimit, uint maxSubmissionCost, uint l2GasPriceBid) external payable returns (uint);
    function transferIdeaTokens(uint marketID, uint tokenID, address l2Recipient, uint gasLimit, uint maxSubmissionCost, uint l2GasPriceBid) external payable returns (uint);
    function setTokenTransferEnabled() external;
}


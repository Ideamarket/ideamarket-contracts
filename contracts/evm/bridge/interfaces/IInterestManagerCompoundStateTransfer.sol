// SPDX-License-Identifier: MIT
pragma solidity 0.6.9;

/**
 * @title IInterestManagerCompoundStateTransfer
 * @author Alexander Schlindwein
 */
interface IInterestManagerCompoundStateTransfer {
    function initializeStateTransfer(address transferManager, address l2Bridge, address erc20Bridge) external;
    function executeStateTransfer(uint gasLimit, uint maxSubmissionCost, uint l2GasPriceBid) external payable returns (uint);
}


// SPDX-License-Identifier: MIT
// @unsupported: ovm
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

/**
 * @title IInterestManagerCompoundStateTransfer
 * @author Alexander Schlindwein
 */
interface IInterestManagerCompoundStateTransfer {
    function initializeStateTransfer(address transferManager, address l2Bridge, address crossDomainMessenger) external;
    function executeStateTransfer() external;
}


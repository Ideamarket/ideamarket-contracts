// SPDX-License-Identifier: MIT
pragma solidity 0.6.9;

/**
 * @title IInterestManagerStateTransferAVM
 * @author Alexander Schlindwein
 */
interface IInterestManagerStateTransferAVM {
    function initializeStateTransfer(address owner, address dai) external;
    function addToTotalShares(uint amount) external;
}
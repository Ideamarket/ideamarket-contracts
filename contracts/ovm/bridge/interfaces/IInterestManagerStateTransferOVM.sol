// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

interface IInterestManagerStateTransferOVM {
    function initializeStateTransfer(address owner, address dai) external;
    function addToTotalShares(uint amount) external;
}
// SPDX-License-Identifier: MIT
pragma solidity 0.6.9;

/**
 * @title IInterestManagerCompoundAVM
 * @author Alexander Schlindwein
 */
interface IInterestManagerCompoundAVM {
    function initializeCompound(address cDai, address comp, address compRecipient) external;
    function withdrawComp() external;
}
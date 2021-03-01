// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

/**
 * @title ICToken
 * @author Alexander Schlindwein
 *
 * @dev A simplified interface for Compound's Comptroller
 */
interface IComptroller {
    function claimComp(address holder) external;
}
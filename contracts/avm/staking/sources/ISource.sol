// SPDX-License-Identifier: MIT
pragma solidity 0.6.9;

/**
 * @title ISource
 * @author Alexander Schlindwein
 *
 * Interface for sources
 */
interface ISource {
    function pull() external;
}
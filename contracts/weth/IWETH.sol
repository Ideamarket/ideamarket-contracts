// SPDX-License-Identifier: MIT
pragma solidity ^0.6.9;

/**
 * @title IIdeaToken
 * @author Alexander Schlindwein
 *
 * @dev Simplified interface for WETH
 */
interface IWETH {
    function deposit() external payable;
    function withdraw(uint wad) external;
}
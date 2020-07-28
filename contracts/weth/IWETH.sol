// SPDX-License-Identifier: MIT
pragma solidity ^0.6.9;

interface IWETH {
    function deposit() external payable;
    function withdraw(uint wad) external;
}
// SPDX-License-Identifier: MIT
pragma solidity ^0.6.9;

interface IUniswapV2Router01 {
    function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts);
    function getAmountsIn(uint amountOut, address[] calldata path) external view returns (uint[] memory amounts);
}
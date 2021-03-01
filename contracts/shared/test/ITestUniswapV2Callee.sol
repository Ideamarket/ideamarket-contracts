// SPDX-License-Identifier: MIT
pragma solidity 0.6.9;

interface ITestUniswapV2Callee {
    function uniswapV2Call(address sender, uint amount0, uint amount1, bytes calldata data) external;
}

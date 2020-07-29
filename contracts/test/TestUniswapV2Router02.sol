// SPDX-License-Identifier: MIT
pragma solidity ^0.6.9;

import "./TestERC20.sol";
import "../uniswap/IUniswapV2Router02.sol";

/**
 * @title TestUniswapV2Router02
 * @author Alexander Schlindwein
 *
 * @dev UniswapV2Router02 for testing
 */
contract TestUniswapV2Router02 is IUniswapV2Router02 {

    uint _multiplier;
    uint constant MULTIPLIER_SCALE = 10000;

    /**
     * @dev For simplicity we use a fixed price for all conversions
     *
     * @param multiplier The multiplier by which to multiply the amounts to determine the price
     */
    constructor(uint multiplier) public {
        _multiplier = multiplier;
    }

    /**
     * @dev Calculates the output amount from a given input amount
     *
     * @param amountIn The input amount
     * @param path Ignored for testing
     *
     * @return The output amounts
     */
    function getAmountsOut(uint amountIn, address[] calldata path) external view override returns (uint[] memory) {
        path; // compiler warnings
        uint[] memory result = new uint[](1);
        result[0] = (amountIn * _multiplier) / MULTIPLIER_SCALE;
        return result;
    }

    /**
     * @dev Calculates the input amount from a given output amount
     *
     * @param amountOut The output amount
     * @param path Ignored for testing
     *
     * @return The input amounts
     */
    function getAmountsIn(uint amountOut, address[] calldata path) external view override returns (uint[] memory) {
        path; // compiler warnings
        uint[] memory result = new uint[](1);
        result[0] = (amountOut * MULTIPLIER_SCALE) / _multiplier;
        return result;
    }

    /**
     * @dev Swaps tokens for tokens
     *
     * @param amountIn The input amount
     * @param amountOutMin The min output amount
     * @param path The tokens to be swapped
     * @param to The recipient of the output
     * @param deadline The deadline for the swap
     */
    function swapExactTokensForTokensSupportingFeeOnTransferTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external override {

        // solium-disable-next-line
        require(now < deadline, "swap: deadline over");

        uint amountOut = (amountIn * _multiplier) / MULTIPLIER_SCALE;
        require(amountOut >= amountOutMin, "swap: output too low");

        TestERC20 inputToken = TestERC20(path[0]);
        TestERC20 outputToken = TestERC20(path[1]);

        require(inputToken.allowance(msg.sender, address(this)) >= amountIn, "swap: not enough allowance");
        require(inputToken.transferFrom(msg.sender, address(this), amountIn), "swap: token transfer in failed");

        outputToken.mint(to, amountOut);
    }

    /**
     * @dev Change the multiplier
     *
     * @param multiplier The new multiplier
     */
    function setMultiplier(uint multiplier) external {
        _multiplier = multiplier;
    }
}
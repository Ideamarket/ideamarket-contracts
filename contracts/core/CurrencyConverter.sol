// SPDX-License-Identifier: MIT
pragma solidity ^0.6.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../weth/IWETH.sol";
import "../uniswap/IUniswapV2Router02.sol";
import "./IIdeaTokenExchange.sol";

/**
 * @title CurrencyConverter
 * @author Alexander Schlindwein
 *
 * @dev Allows to use different currencies to buy/sell IdeaTokens by integrating UniswapV2
 */
contract CurrencyConverter {

    IIdeaTokenExchange _ideaTokenExchange;
    IERC20 public _dai;
    IUniswapV2Router02 public _uniswapV2Router02;
    IWETH public _weth;

    /**
     * @param ideaTokenExchange The address of the IdeaTokenExchange contract
     * @param dai The address of the Dai token
     * @param uniswapV2Router02 The address of the UniswapV2Router02 contract
     * @param weth The address of the WETH token
     */
    constructor(address ideaTokenExchange,
                address dai,
                address uniswapV2Router02,
                address weth) public {
        _ideaTokenExchange = IIdeaTokenExchange(ideaTokenExchange);
        _dai = IERC20(dai);
        _uniswapV2Router02 = IUniswapV2Router02(uniswapV2Router02);
        _weth = IWETH(weth);
    }

    /**
     * @dev Converts an input currency to Dai and buys IdeaTokens
     *
     * @param inputCurrency The address of the input currency. 0x0 means ETH
     * @param ideaToken The address of the IdeaToken to buy
     * @param inputAmount The amount of inputCurrency to spend
     * @param minOutput The minimum output in IdeaTokens
     * @param recipient The recipient of the IdeaTokens
     */
    function buyTokens(address inputCurrency,
                       address ideaToken,
                       uint inputAmount,
                       uint minOutput,
                       address recipient) external payable {
        require((msg.value == 0 && inputCurrency != address(0)) ||
                (msg.value != 0 && inputCurrency == address(0)), "buyTokens: input either eth or tokens");

        address[] memory path = new address[](2);
        if(inputCurrency == address(0)) {
            path[0] = address(_weth);
        } else {
            path[0] = inputCurrency;
        }
        path[1] = address(_dai);


        
        if(inputCurrency == address(0)) {
            _weth.deposit{value: inputAmount}();
            require(IERC20(address(_weth)).approve(address(_uniswapV2Router02), inputAmount), "buyTokens: failed to weth approve router");
        } else {
            IERC20 inputERC20 = IERC20(inputCurrency);
            require(inputERC20.allowance(msg.sender, address(this)) >= inputAmount, "buyTokens: not enough allowance");
            require(inputERC20.transferFrom(msg.sender, address(this), inputAmount), "buyTokens: erc20 transfer failed");
            require(inputERC20.approve(address(_uniswapV2Router02), inputAmount), "buyTokens: failed to erc20 approve router");
        }

        _uniswapV2Router02.swapExactTokensForTokensSupportingFeeOnTransferTokens(inputAmount,
                                                                                 1,
                                                                                 path,
                                                                                 address(this),
                                                                                 now + 1);

        uint daiBalance = _dai.balanceOf(address(this));
        require(_dai.approve(address(_ideaTokenExchange), daiBalance), "buyTokens: failed to approve exchange");

        _ideaTokenExchange.buyTokens(ideaToken, daiBalance, minOutput, recipient);
    }

    /**
     * @dev Sells IdeaTokens and converts the received Dai to a specified currency
     *
     * @param outputCurrency The address of the desired output currency
     * @param ideaToken The address of the IdeaToken to sell
     * @param tokenAmount The amount of IdeaTokens to sell
     * @param minOutput The minimum output in outputCurrency for the sell
     * @param recipient The recipient of the output currency
     */
    function sellTokens(address outputCurrency,
                        address ideaToken,
                        uint tokenAmount,
                        uint minOutput,
                        address recipient) external {

        address[] memory path = new address[](2);
        path[0] = address(_dai);
        if(outputCurrency == address(0)) {
            path[1] = address(_weth);
        } else {
            path[1] = outputCurrency;
        }

        require(IERC20(ideaToken).allowance(msg.sender, address(this)) >= tokenAmount, "sellTokens: not enough allowance");
        require(IERC20(ideaToken).transferFrom(msg.sender, address(this), tokenAmount), "sellTokens: idea token transfer failed");
        require(IERC20(ideaToken).approve(address(_ideaTokenExchange), tokenAmount), "sellTokens: failed to approve exchange");

        _ideaTokenExchange.sellTokens(ideaToken, tokenAmount, 1, address(this));

        uint daiBalance = _dai.balanceOf(address(this));
        require(_dai.approve(address(_uniswapV2Router02), daiBalance), "sellTokens: dai approve failed");

        if(outputCurrency == address(0)) {
            _uniswapV2Router02.swapExactTokensForTokensSupportingFeeOnTransferTokens(daiBalance,
                                                                                     minOutput,
                                                                                     path,
                                                                                     address(this),
                                                                                     now + 1);

            uint wethBalance = IERC20(address(_weth)).balanceOf(address(this)); 
            _weth.withdraw(wethBalance);
            msg.sender.transfer(wethBalance);
        } else {
            _uniswapV2Router02.swapExactTokensForTokensSupportingFeeOnTransferTokens(daiBalance,
                                                                                     minOutput,
                                                                                     path,
                                                                                     recipient,
                                                                                     now + 1);
        }
    }

    /**
     * @dev Fallback required for WETH withdraw. Fails if sender is not WETH contract
     */
    receive() external payable {
        require(msg.sender == address(_weth));
    } 
}
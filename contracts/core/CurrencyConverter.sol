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
     * @param amount The amount of IdeaTokens to buy
     * @param maxCost The maximum cost in inputCurrency for the purchase
     * @param recipient The recipient of the IdeaTokens
     */
    function buyTokens(address inputCurrency,
                       address ideaToken,
                       uint amount,
                       uint maxCost,
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

        uint cost = _ideaTokenExchange.getCostForBuyingTokens(ideaToken, amount);
        uint requiredInput = _uniswapV2Router02.getAmountsIn(cost, path)[0];

        require(requiredInput <= maxCost, "buyTokens: cost too high");
        
        if(inputCurrency == address(0)) {
            _weth.deposit{value: requiredInput}();
            require(IERC20(address(_weth)).approve(address(_uniswapV2Router02), requiredInput), "buyTokens: failed to weth approve router");
        } else {
            IERC20 inputERC20 = IERC20(inputCurrency);
            require(inputERC20.allowance(msg.sender, address(this)) >= requiredInput, "buyTokens: not enough allowance");
            require(inputERC20.transferFrom(msg.sender, address(this), requiredInput), "buyTokens: erc20 transfer failed");
            require(inputERC20.approve(address(_uniswapV2Router02), requiredInput), "buyTokens: failed to erc20 approve router");
        }

        _uniswapV2Router02.swapExactTokensForTokensSupportingFeeOnTransferTokens(requiredInput,
                                                                                 cost,
                                                                                 path,
                                                                                 address(this),
                                                                                 now + 1);

        require(_dai.approve(address(_ideaTokenExchange), cost), "buyTokens: failed to approve exchange");

        _ideaTokenExchange.buyTokens(ideaToken, amount, cost, recipient);

        if(inputCurrency == address(0)) {
            msg.sender.transfer(address(this).balance);
        }
    }

    /**
     * @dev Sells IdeaTokens and converts the received Dai to a specified currency
     *
     * @param outputCurrency The address of the desired output currency
     * @param ideaToken The address of the IdeaToken to sell
     * @param amount The amount of IdeaTokens to sell
     * @param minPrice The minimum price in outputCurrency for the sell
     * @param recipient The recipient of the output currency
     */
    function sellTokens(address outputCurrency,
                        address ideaToken,
                        uint amount,
                        uint minPrice,
                        address recipient) external {

        address[] memory path = new address[](2);
        path[0] = address(_dai);
        if(outputCurrency == address(0)) {
            path[1] = address(_weth);
        } else {
            path[1] = outputCurrency;
        }

        uint price = _ideaTokenExchange.getPriceForSellingTokens(ideaToken, amount);
        uint output = _uniswapV2Router02.getAmountsOut(price, path)[1];

        require(output >= minPrice, "sellTokens: price too low");

        require(IERC20(ideaToken).allowance(msg.sender, address(this)) >= amount, "sellTokens: not enough allowance");
        require(IERC20(ideaToken).transferFrom(msg.sender, address(this), amount), "sellTokens: idea token transfer failed");
        require(IERC20(ideaToken).approve(address(_ideaTokenExchange), amount), "sellTokens: failed to approve exchange");

        _ideaTokenExchange.sellTokens(ideaToken, amount, price, address(this));

        require(_dai.approve(address(_uniswapV2Router02), price), "sellTokens: dai approve failed");

        if(outputCurrency == address(0)) {
            _uniswapV2Router02.swapExactTokensForTokensSupportingFeeOnTransferTokens(price,
                                                                                     output,
                                                                                     path,
                                                                                     address(this),
                                                                                     now + 1);

            _weth.withdraw(output);
            msg.sender.transfer(output);
        } else {
            _uniswapV2Router02.swapExactTokensForTokensSupportingFeeOnTransferTokens(price,
                                                                                     output,
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
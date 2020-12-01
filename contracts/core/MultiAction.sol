// SPDX-License-Identifier: MIT
pragma solidity ^0.6.9;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../weth/IWETH.sol";
import "../uniswap/IUniswapV2Router02.sol";
import "./interfaces/IIdeaTokenExchange.sol";
import "./interfaces/IIdeaTokenFactory.sol";
import "./interfaces/IIdeaTokenVault.sol";

/**
 * @title MultiAction
 * @author Alexander Schlindwein
 *
 * Allows to bundle multiple actions into one tx
 */
contract MultiAction {

    IIdeaTokenExchange _ideaTokenExchange;
    IIdeaTokenFactory _ideaTokenFactory;
    IIdeaTokenVault _ideaTokenVault;
    IERC20 public _dai;
    IUniswapV2Router02 public _uniswapV2Router02;
    IWETH public _weth;

    /**
     * @param ideaTokenExchange The address of the IdeaTokenExchange contract
     * @param ideaTokenVault The address of the IdeaTokenVault contract
     * @param dai The address of the Dai token
     * @param uniswapV2Router02 The address of the UniswapV2Router02 contract
     * @param weth The address of the WETH token
     */
    constructor(address ideaTokenExchange,
                address ideaTokenFactory,
                address ideaTokenVault,
                address dai,
                address uniswapV2Router02,
                address weth) public {
        _ideaTokenExchange = IIdeaTokenExchange(ideaTokenExchange);
        _ideaTokenFactory = IIdeaTokenFactory(ideaTokenFactory);
        _ideaTokenVault = IIdeaTokenVault(ideaTokenVault);
        _dai = IERC20(dai);
        _uniswapV2Router02 = IUniswapV2Router02(uniswapV2Router02);
        _weth = IWETH(weth);
    }

    function convertAndBuy(address inputCurrency,
                           address ideaToken,
                           uint amount,
                           uint fallbackAmount,
                           uint cost,
                           address recipient,
                           bool lock) external payable {
        uint buyAmount = amount;
        uint buyCost = _ideaTokenExchange.getCostForBuyingTokens(ideaToken, amount);
        uint requiredInput = getInputForOutputInternal(inputCurrency, address(_dai), buyCost);

        if(requiredInput > cost) {
            buyCost = _ideaTokenExchange.getCostForBuyingTokens(ideaToken, fallbackAmount);
            requiredInput = getInputForOutputInternal(inputCurrency, address(_dai), buyCost);
            require(requiredInput <= cost, "convertAndBuy: slippage too high");
            buyAmount = fallbackAmount;
        }

        convertAndBuyInternal(inputCurrency, ideaToken, requiredInput, buyAmount, buyCost, recipient, lock);
    }

    function sellAndConvert(address outputCurrency,
                            address ideaToken,
                            uint amount,
                            uint minPrice,
                            address payable recipient) external {
        uint sellPrice = _ideaTokenExchange.getPriceForSellingTokens(ideaToken, amount);
        uint output = getOutputForInputInternal(address(_dai), outputCurrency, sellPrice);
        require(output >= minPrice, "sellAndConvert: slippage too high");

        pullERC20Internal(ideaToken, msg.sender, amount);
        _ideaTokenExchange.sellTokens(ideaToken, amount, sellPrice, address(this));

        convertInternal(address(_dai), outputCurrency, sellPrice, output);
        if(outputCurrency == address(0)) {
            recipient.transfer(output);
        } else {
            require(IERC20(outputCurrency).transfer(recipient, output), "sellAndConvert: transfer failed");
        }
    }

    function convertAddAndBuy(string calldata tokenName,
                              uint marketID,
                              address inputCurrency,
                              uint cost,
                              uint amount,
                              uint fallbackAmount,
                              address recipient,
                              bool lock) external {
        uint buyAmount = amount;
        uint buyCost = getBuyCostFromZeroSupplyInternal(marketID, buyAmount);
        uint requiredInput = getInputForOutputInternal(inputCurrency, address(_dai), buyCost);

        if(requiredInput > cost) {
            buyCost = getBuyCostFromZeroSupplyInternal(marketID, fallbackAmount);
            requiredInput = getInputForOutputInternal(inputCurrency, address(_dai), buyCost);
            require(requiredInput <= cost, "convertAddAndBuy: slippage too high");
            buyAmount = fallbackAmount;
        }

        address ideaToken = addTokenInternal(tokenName, marketID);
        convertAndBuyInternal(inputCurrency, ideaToken, requiredInput, buyAmount, buyCost, recipient, lock);
    }

    function addAndBuy(string calldata tokenName, uint marketID, uint amount, address recipient, bool lock) external {
        uint cost = getBuyCostFromZeroSupplyInternal(marketID, amount);
        pullERC20Internal(address(_dai), msg.sender, cost);

        address ideaToken = addTokenInternal(tokenName, marketID);
        
        if(lock) {
            buyAndLockInternal(ideaToken, amount, cost, recipient);
        } else {
            buyInternal(ideaToken, amount, cost, recipient);
        }
    }

    function buyAndLock(address ideaToken, uint amount, uint fallbackAmount, uint cost, address recipient) external {
        uint buyAmount = amount;
        uint buyCost = _ideaTokenExchange.getCostForBuyingTokens(ideaToken, amount);
        if(buyCost > cost) {
            buyCost = _ideaTokenExchange.getCostForBuyingTokens(ideaToken, fallbackAmount);
            require(buyCost <= cost, "buyAndLock: slippage too high");
            buyAmount = fallbackAmount;
        }

        pullERC20Internal(address(_dai), msg.sender, buyCost);
        buyAndLockInternal(ideaToken, buyAmount, buyCost, recipient);
    }

    function convertAndBuyInternal(address inputCurrency, address ideaToken, uint input, uint amount, uint cost, address recipient, bool lock) internal {
        if(inputCurrency != address(0)) {
            pullERC20Internal(inputCurrency, msg.sender, input);
        }

        convertInternal(inputCurrency, address(_dai), input, cost);

        if(lock) {
            buyAndLockInternal(ideaToken, amount, cost, recipient);
        } else {
            buyInternal(ideaToken, amount, cost, recipient);
        }

        // TODO: Add comment
        if(address(this).balance > 0) {
            msg.sender.transfer(address(this).balance);
        }
    }

    function buyAndLockInternal(address ideaToken, uint amount, uint cost, address recipient) internal {
        buyInternal(ideaToken, amount, cost, address(this));
        require(IERC20(ideaToken).approve(address(_ideaTokenVault), amount), "buyAndLockInternal: approve failed");
        _ideaTokenVault.lock(ideaToken, amount, recipient);
    }

    function buyInternal(address ideaToken, uint amount, uint cost, address recipient) internal {
        require(_dai.approve(address(_ideaTokenExchange), cost), "buyInternal: approve failed");
        _ideaTokenExchange.buyTokens(ideaToken, amount, amount, cost, recipient);
    }

    function addTokenInternal(string memory tokenName, uint marketID) internal returns (address) {
        _ideaTokenFactory.addToken(tokenName, marketID);
        return address(_ideaTokenFactory.getTokenInfo(marketID, _ideaTokenFactory.getTokenIDByName(tokenName, marketID) ).ideaToken);
    }

    function pullERC20Internal(address token, address from, uint amount) internal {
        require(IERC20(token).allowance(from, address(this)) >= amount, "pullERC20Internal: not enough allowance");
        require(IERC20(token).transferFrom(from, address(this), amount), "pullERC20Internal: transfer failed");
    }

    function getBuyCostFromZeroSupplyInternal(uint marketID, uint amount) internal view returns (uint) {
        MarketDetails memory marketDetails = _ideaTokenFactory.getMarketDetailsByID(marketID);
        require(marketDetails.exists, "invalid market");

        (uint cost, , , ) = _ideaTokenExchange.getCostsForBuyingTokens(marketDetails, 0, amount);
        return cost;
    }

    function getInputForOutputInternal(address inputCurrency, address outputCurrency, uint outputAmount) internal view returns (uint) {
        address[] memory path = getPathInternal(inputCurrency, outputCurrency);
        return _uniswapV2Router02.getAmountsIn(outputAmount, path)[0];
    }

    function getOutputForInputInternal(address inputCurrency, address outputCurrency, uint inputAmount) internal view returns (uint) {
        address[] memory path = getPathInternal(inputCurrency, outputCurrency);
        return _uniswapV2Router02.getAmountsOut(inputAmount, path)[1];
    }

    function getPathInternal(address inputCurrency, address outputCurrency) internal view returns (address[] memory) {
        address[] memory path = new address[](2);
        if(inputCurrency == address(0)) {
            path[0] = address(_weth);
        } else {
            path[0] = inputCurrency;
        }

        if(outputCurrency == address(0)) {
            path[1] = address(_weth);
        } else {
            path[1] = outputCurrency;
        }

        return path;
    }

    function convertInternal(address inputCurrency, address outputCurrency, uint inputAmount, uint outputAmount) internal {
        
        IERC20 inputERC20;
        address[] memory path = new address[](2);
        if(inputCurrency == address(0)) {
            path[0] = address(_weth);
            _weth.deposit{value: inputAmount}();
            inputERC20 = IERC20(address(_weth));
        } else {
            path[0] = inputCurrency;
            inputERC20 = IERC20(inputCurrency);
        }

        require(inputERC20.approve(address(_uniswapV2Router02), inputAmount), "convert: failed to erc20 approve router");

        if(outputCurrency == address(0)) {
            path[1] = address(_weth);
        } else {
            path[1] = outputCurrency;
        }

        _uniswapV2Router02.swapExactTokensForTokensSupportingFeeOnTransferTokens(inputAmount,
                                                                                 outputAmount,
                                                                                 path,
                                                                                 address(this),
                                                                                 now + 1);

        if(outputCurrency == address(0)) {
            _weth.withdraw(outputAmount);
        }
    }

    /**
     * Fallback required for WETH withdraw. Fails if sender is not WETH contract
     */
    receive() external payable {
        require(msg.sender == address(_weth));
    } 
}
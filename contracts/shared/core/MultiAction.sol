// SPDX-License-Identifier: MIT
pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import "../weth/IWETH.sol";
import "../uniswap/IUniswapV2Factory.sol";
import "../uniswap/IUniswapV2Router02.sol";
import "./interfaces/IIdeaTokenExchange.sol";
import "./interfaces/IIdeaTokenFactory.sol";
import "./interfaces/IIdeaTokenVault.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title MultiAction
 * @author Alexander Schlindwein
 *
 * Allows to bundle multiple actions into one tx
 */
contract MultiAction {

    // IdeaTokenExchange contract
    IIdeaTokenExchange _ideaTokenExchange;
    // IdeaTokenFactory contract
    IIdeaTokenFactory _ideaTokenFactory;
    // IdeaTokenVault contract
    IIdeaTokenVault _ideaTokenVault;
    // Dai contract
    IERC20 public _dai;
    // IUniswapV2Factory contract
    IUniswapV2Factory public _uniswapV2Factory;
    // IUniswapV2Router02 contract
    IUniswapV2Router02 public _uniswapV2Router02;
    // WETH contract
    IWETH public _weth;

    /**
     * @param ideaTokenExchange The address of the IdeaTokenExchange contract
     * @param ideaTokenFactory The address of the IdeaTokenFactory contract
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

        require(ideaTokenExchange != address(0) &&
                ideaTokenFactory != address(0) &&
                ideaTokenVault != address(0) &&
                dai != address(0) &&
                uniswapV2Router02 != address(0) &&
                weth != address(0),
                "invalid-params");

        _ideaTokenExchange = IIdeaTokenExchange(ideaTokenExchange);
        _ideaTokenFactory = IIdeaTokenFactory(ideaTokenFactory);
        _ideaTokenVault = IIdeaTokenVault(ideaTokenVault);
        _dai = IERC20(dai);
        _uniswapV2Router02 = IUniswapV2Router02(uniswapV2Router02);
        _uniswapV2Factory = IUniswapV2Factory(IUniswapV2Router02(uniswapV2Router02).factory());
        _weth = IWETH(weth);
    }

    /**
     * Converts inputCurrency to Dai on Uniswap and buys IdeaTokens
     *
     * @param inputCurrency The input currency
     * @param ideaToken The IdeaToken to buy
     * @param amount The amount of IdeaTokens to buy
     * @param fallbackAmount The amount of IdeaTokens to buy if the original amount cannot be bought
     * @param cost The maximum cost in input currency
     * @param lockDuration The duration in seconds to lock the tokens
     * @param recipient The recipient of the IdeaTokens
     */
    function convertAndBuy(address inputCurrency,
                           address ideaToken,
                           uint amount,
                           uint fallbackAmount,
                           uint cost,
                           uint lockDuration,
                           address recipient) external payable {

        IIdeaTokenExchange exchange = _ideaTokenExchange;

        uint buyAmount = amount;
        uint buyCost = exchange.getCostForBuyingTokens(ideaToken, amount);
        uint requiredInput = getInputForOutputInternal(inputCurrency, address(_dai), buyCost);

        if(requiredInput > cost) {
            buyCost = exchange.getCostForBuyingTokens(ideaToken, fallbackAmount);
            requiredInput = getInputForOutputInternal(inputCurrency, address(_dai), buyCost);
            require(requiredInput <= cost, "slippage");
            buyAmount = fallbackAmount;
        }

        convertAndBuyInternal(inputCurrency, ideaToken, requiredInput, buyAmount, buyCost, lockDuration, recipient);
    }

    /**
     * Sells IdeaTokens and converts Dai to outputCurrency
     *
     * @param outputCurrency The output currency
     * @param ideaToken The IdeaToken to sell
     * @param amount The amount of IdeaTokens to sell
     * @param minPrice The minimum price to receive for selling in outputCurrency
     * @param recipient The recipient of the funds
     */
    function sellAndConvert(address outputCurrency,
                            address ideaToken,
                            uint amount,
                            uint minPrice,
                            address payable recipient) external {
        
        IIdeaTokenExchange exchange = _ideaTokenExchange;
        IERC20 dai = _dai;

        uint sellPrice = exchange.getPriceForSellingTokens(ideaToken, amount);
        uint output = getOutputForInputInternal(address(dai), outputCurrency, sellPrice);
        require(output >= minPrice, "slippage");

        pullERC20Internal(ideaToken, msg.sender, amount);
        exchange.sellTokens(ideaToken, amount, sellPrice, address(this));

        convertInternal(address(dai), outputCurrency, sellPrice, output);
        if(outputCurrency == address(0)) {
            recipient.transfer(output);
        } else {
            require(IERC20(outputCurrency).transfer(recipient, output), "transfer");
        }
    }

    /**
     * Converts `inputCurrency` to Dai, adds a token and buys the added token
     * 
     * @param tokenName The name for the new IdeaToken
     * @param marketID The ID of the market where the new token will be added
     * @param inputCurrency The input currency to use for the purchase of the added token
     * @param amount The amount of IdeaTokens to buy
     * @param fallbackAmount The amount of IdeaTokens to buy if the original amount cannot be bought
     * @param cost The maximum cost in input currency
     * @param lockDuration The duration in seconds to lock the tokens
     * @param recipient The recipient of the IdeaTokens
     */
    function convertAddAndBuy(string calldata tokenName,
                              uint marketID,
                              address inputCurrency,
                              uint amount,
                              uint fallbackAmount,
                              uint cost,
                              uint lockDuration,
                              address recipient) external payable {

        IERC20 dai = _dai;

        uint buyAmount = amount;
        uint buyCost = getBuyCostFromZeroSupplyInternal(marketID, buyAmount);
        uint requiredInput = getInputForOutputInternal(inputCurrency, address(dai), buyCost);

        if(requiredInput > cost) {
            buyCost = getBuyCostFromZeroSupplyInternal(marketID, fallbackAmount);
            requiredInput = getInputForOutputInternal(inputCurrency, address(dai), buyCost);
            require(requiredInput <= cost, "slippage");
            buyAmount = fallbackAmount;
        }

        address ideaToken = addTokenInternal(tokenName, marketID);
        convertAndBuyInternal(inputCurrency, ideaToken, requiredInput, buyAmount, buyCost, lockDuration, recipient);
    }

    /**
     * Adds a token and buys it
     * 
     * @param tokenName The name for the new IdeaToken
     * @param marketID The ID of the market where the new token will be added
     * @param amount The amount of IdeaTokens to buy
     * @param lockDuration The duration in seconds to lock the tokens
     * @param recipient The recipient of the IdeaTokens
     */
    function addAndBuy(string calldata tokenName, uint marketID, uint amount, uint lockDuration, address recipient) external {
        uint cost = getBuyCostFromZeroSupplyInternal(marketID, amount);
        pullERC20Internal(address(_dai), msg.sender, cost);

        address ideaToken = addTokenInternal(tokenName, marketID);
        
        if(lockDuration > 0) {
            buyAndLockInternal(ideaToken, amount, cost, lockDuration, recipient);
        } else {
            buyInternal(ideaToken, amount, cost, recipient);
        }
    }

    /**
     * Buys a IdeaToken and locks it in the IdeaTokenVault
     *
     * @param ideaToken The IdeaToken to buy
     * @param amount The amount of IdeaTokens to buy
     * @param fallbackAmount The amount of IdeaTokens to buy if the original amount cannot be bought
     * @param cost The maximum cost in input currency
     * @param recipient The recipient of the IdeaTokens
     */
    function buyAndLock(address ideaToken, uint amount, uint fallbackAmount, uint cost, uint lockDuration, address recipient) external {

        IIdeaTokenExchange exchange = _ideaTokenExchange;

        uint buyAmount = amount;
        uint buyCost = exchange.getCostForBuyingTokens(ideaToken, amount);
        if(buyCost > cost) {
            buyCost = exchange.getCostForBuyingTokens(ideaToken, fallbackAmount);
            require(buyCost <= cost, "slippage");
            buyAmount = fallbackAmount;
        }

        pullERC20Internal(address(_dai), msg.sender, buyCost);
        buyAndLockInternal(ideaToken, buyAmount, buyCost, lockDuration, recipient);
    }

    /**
     * Converts `inputCurrency` to Dai on Uniswap and buys an IdeaToken, optionally locking it in the IdeaTokenVault
     *
     * @param inputCurrency The input currency to use
     * @param ideaToken The IdeaToken to buy
     * @param input The amount of `inputCurrency` to sell
     * @param amount The amount of IdeaTokens to buy
     * @param cost The cost in Dai for purchasing `amount` IdeaTokens
     * @param lockDuration The duration in seconds to lock the tokens
     * @param recipient The recipient of the IdeaTokens
     */
    function convertAndBuyInternal(address inputCurrency, address ideaToken, uint input, uint amount, uint cost, uint lockDuration, address recipient) internal {
        if(inputCurrency != address(0)) {
            pullERC20Internal(inputCurrency, msg.sender, input);
        }

        convertInternal(inputCurrency, address(_dai), input, cost);

        if(lockDuration > 0) {
            buyAndLockInternal(ideaToken, amount, cost, lockDuration, recipient);
        } else {
            buyInternal(ideaToken, amount, cost, recipient);
        }

        /*
            If the user has paid with ETH and we had to fallback there will be ETH left.
            Refund the remaining ETH to the user.
        */
        if(address(this).balance > 0) {
            msg.sender.transfer(address(this).balance);
        }
    }

    /**
     * Buys and locks an IdeaToken in the IdeaTokenVault
     *
     * @param ideaToken The IdeaToken to buy
     * @param amount The amount of IdeaTokens to buy
     * @param cost The cost in Dai for the purchase of `amount` IdeaTokens
     * @param recipient The recipient of the locked IdeaTokens
     */
    function buyAndLockInternal(address ideaToken, uint amount, uint cost, uint lockDuration, address recipient) internal {

        IIdeaTokenVault vault = _ideaTokenVault;
    
        buyInternal(ideaToken, amount, cost, address(this));
        require(IERC20(ideaToken).approve(address(vault), amount), "approve");
        vault.lock(ideaToken, amount, lockDuration, recipient);
    }

    /**
     * Buys an IdeaToken
     *
     * @param ideaToken The IdeaToken to buy
     * @param amount The amount of IdeaTokens to buy
     * @param cost The cost in Dai for the purchase of `amount` IdeaTokens
     * @param recipient The recipient of the bought IdeaTokens 
     */
    function buyInternal(address ideaToken, uint amount, uint cost, address recipient) internal {

        IIdeaTokenExchange exchange = _ideaTokenExchange;

        require(_dai.approve(address(exchange), cost), "approve");
        exchange.buyTokens(ideaToken, amount, amount, cost, recipient);
    }

    /**
     * Adds a new IdeaToken
     *
     * @param tokenName The name of the new token
     * @param marketID The ID of the market where the new token will be added
     *
     * @return The address of the new IdeaToken
     */
    function addTokenInternal(string memory tokenName, uint marketID) internal returns (address) {

        IIdeaTokenFactory factory = _ideaTokenFactory;

        factory.addToken(tokenName, marketID, msg.sender);
        return address(factory.getTokenInfo(marketID, factory.getTokenIDByName(tokenName, marketID) ).ideaToken);
    }

    /**
     * Transfers ERC20 from an address to this contract
     *
     * @param token The ERC20 token to transfer
     * @param from The address to transfer from
     * @param amount The amount of tokens to transfer
     */
    function pullERC20Internal(address token, address from, uint amount) internal {
        require(IERC20(token).allowance(from, address(this)) >= amount, "insufficient-allowance");
        require(IERC20(token).transferFrom(from, address(this), amount), "transfer");
    }

    /**
     * Returns the cost for buying IdeaTokens on a given market from zero supply
     *
     * @param marketID The ID of the market on which the IdeaToken is listed
     * @param amount The amount of IdeaTokens to buy
     *
     * @return The cost for buying IdeaTokens on a given market from zero supply
     */
    function getBuyCostFromZeroSupplyInternal(uint marketID, uint amount) internal view returns (uint) {
        MarketDetails memory marketDetails = _ideaTokenFactory.getMarketDetailsByID(marketID);
        require(marketDetails.exists, "invalid-market");

        return _ideaTokenExchange.getCostsForBuyingTokens(marketDetails, 0, amount, false).total;
    }

    /**
     * Returns the required input to get a given output from an Uniswap swap
     *
     * @param inputCurrency The input currency
     * @param outputCurrency The output currency
     * @param outputAmount The desired output amount 
     *
     * @return The required input to get a `outputAmount` from an Uniswap swap
     */
    function getInputForOutputInternal(address inputCurrency, address outputCurrency, uint outputAmount) internal view returns (uint) {
        address[] memory path = getPathInternal(inputCurrency, outputCurrency);
        return _uniswapV2Router02.getAmountsIn(outputAmount, path)[0];
    }

    /**
     * Returns the output for a given input for an Uniswap swap
     *
     * @param inputCurrency The input currency
     * @param outputCurrency The output currency
     * @param inputAmount The desired input amount 
     *
     * @return The output for `inputAmount` for an Uniswap swap
     */
    function getOutputForInputInternal(address inputCurrency, address outputCurrency, uint inputAmount) internal view returns (uint) {
        address[] memory path = getPathInternal(inputCurrency, outputCurrency);
        uint[] memory amountsOut = _uniswapV2Router02.getAmountsOut(inputAmount, path);
        return amountsOut[amountsOut.length - 1];
    }

    /**
     * Returns the Uniswap path from `inputCurrency` to `outputCurrency`
     *
     * @param inputCurrency The input currency
     * @param outputCurrency The output currency
     *
     * @return The Uniswap path from `inputCurrency` to `outputCurrency`
     */
    function getPathInternal(address inputCurrency, address outputCurrency) internal view returns (address[] memory) {

        address wethAddress = address(_weth);
        address updatedInputCurrency = inputCurrency == address(0) ? wethAddress : inputCurrency;
        address updatedOutputCurrency = outputCurrency == address(0) ? wethAddress : outputCurrency;

        IUniswapV2Factory uniswapFactory = _uniswapV2Factory;
        if(uniswapFactory.getPair(updatedInputCurrency, updatedOutputCurrency) != address(0)) {
            // Direct path exists
             address[] memory path = new address[](2);
             path[0] = updatedInputCurrency;
             path[1] = updatedOutputCurrency;
             return path;
        }

        // Direct path does not exist
        // Check for 3-hop path: input -> weth -> output

        require(uniswapFactory.getPair(updatedInputCurrency, wethAddress) != address(0) &&
                uniswapFactory.getPair(wethAddress, updatedOutputCurrency) != address(0),
                "no-path");


        // 3-hop path exists
        address[] memory path = new address[](3);
        path[0] = updatedInputCurrency;
        path[1] = wethAddress;
        path[2] = updatedOutputCurrency;

        return path;
    }

    /**
     * Converts from `inputCurrency` to `outputCurrency` using Uniswap
     *
     * @param inputCurrency The input currency
     * @param outputCurrency The output currency
     * @param inputAmount The input amount
     * @param outputAmount The output amount
     */
    function convertInternal(address inputCurrency, address outputCurrency, uint inputAmount, uint outputAmount) internal {
        
        IWETH weth = _weth;
        IUniswapV2Router02 router = _uniswapV2Router02;

        address[] memory path = getPathInternal(inputCurrency, outputCurrency);
    
        IERC20 inputERC20;
        if(inputCurrency == address(0)) {
            // If the input is ETH we convert to WETH
            weth.deposit{value: inputAmount}();
            inputERC20 = IERC20(address(weth));
        } else {
            inputERC20 = IERC20(inputCurrency);
        }

        require(inputERC20.approve(address(router), inputAmount), "router-approve");

        router.swapExactTokensForTokensSupportingFeeOnTransferTokens(inputAmount,
                                                                     outputAmount,
                                                                     path,
                                                                     address(this),
                                                                     now + 1);

        if(outputCurrency == address(0)) {
            // If the output is ETH we withdraw from WETH
            weth.withdraw(outputAmount);
        }
    }

    /**
     * Fallback required for WETH withdraw. Fails if sender is not WETH contract
     */
    receive() external payable {
        require(msg.sender == address(_weth));
    } 
}
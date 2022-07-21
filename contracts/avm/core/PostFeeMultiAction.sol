// SPDX-License-Identifier: MIT
pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import "../../shared/weth/IWETH.sol";
import "../../shared/uniswap/IUniswapV3Factory.sol";
import "../../shared/uniswap/IQuoter.sol";
import "../../shared/uniswap/ISwapRouter.sol";
import "../../shared/core/interfaces/IIdeaTokenExchange.sol";
import "../../shared/core/interfaces/IIdeaTokenFactory.sol";
import "../../shared/core/interfaces/IIdeaTokenVault.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title PostFeeMultiAction
 * @author Kelton Madden
 *
 * Allows to swap and buy imo for a fee before posting
 */
contract PostFeeMultiAction {

    // IdeaTokenExchange contract
    IIdeaTokenExchange _ideaTokenExchange;
    // IdeaTokenFactory contract
    IIdeaTokenFactory _ideaTokenFactory;
    // IdeaTokenVault contract
    IIdeaTokenVault _ideaTokenVault;
    // Dai contract
    IERC20 public _dai;
    // IUniswapV3Factory contract
    IUniswapV3Factory public _uniswapV3Factory;
    // IQuoter contract
    IQuoter public _uniswapV3Quoter;
    // ISwapRouter contract
    ISwapRouter public _uniswapV3SwapRouter;
    // WETH contract
    IWETH public _weth;
    // Uniswap V3 Low pool fee
    uint24 public constant LOW_POOL_FEE = 500;
    // Uniswap V3 Medium pool fee
    uint24 public constant MEDIUM_POOL_FEE = 3000;
    // Uniswap V3 High pool fee
    uint24 public constant HIGH_POOL_FEE = 10000;

    /**
     * @param ideaTokenExchange The address of the IdeaTokenExchange contract
     * @param ideaTokenFactory The address of the IdeaTokenFactory contract
     * @param ideaTokenVault The address of the IdeaTokenVault contract
     * @param dai The address of the Dai token
     * @param swapRouter The address of the SwapRouter contract
     * @param quoter The address of the Quoter contract
     * @param weth The address of the WETH token
     */
    constructor(address ideaTokenExchange,
                address ideaTokenFactory,
                address ideaTokenVault,
                address dai,
                address swapRouter,
                address quoter,
                address weth) public {

        require(ideaTokenExchange != address(0) &&
                ideaTokenFactory != address(0) &&
                ideaTokenVault != address(0) &&
                dai != address(0) &&
                swapRouter != address(0) &&
                quoter != address(0) &&
                weth != address(0),
                "invalid-params");

        _ideaTokenExchange = IIdeaTokenExchange(ideaTokenExchange);
        _ideaTokenFactory = IIdeaTokenFactory(ideaTokenFactory);
        _ideaTokenVault = IIdeaTokenVault(ideaTokenVault);
        _dai = IERC20(dai);
        _uniswapV3SwapRouter = ISwapRouter(swapRouter);
        _uniswapV3Factory = IUniswapV3Factory(ISwapRouter(swapRouter).factory());
        _uniswapV3Quoter = IQuoter(quoter);
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
    function getInputForOutputInternal(address inputCurrency, address outputCurrency, uint outputAmount) internal returns (uint) {
        (,, uint cheapestAmountIn) = getOutputPathInternal(inputCurrency, outputCurrency, outputAmount);
        return cheapestAmountIn;
    }

    /**
     * Returns the Uniswap path from `inputCurrency` to `outputCurrency`
     *
     * @param inputCurrency The input currency
     * @param outputCurrency The output currency
     * @param outputAmount The desired output amount
     *
     * @return The Uniswap path from `outputCurrency` to `inputCurrency`
     */
    function getOutputPathInternal(address inputCurrency, address outputCurrency, uint outputAmount) internal returns (address[] memory, uint24[] memory, uint) {
        inputCurrency = inputCurrency == address(0) ? address(_weth) : inputCurrency;
        outputCurrency = outputCurrency == address(0) ? address(_weth) : outputCurrency;

        address[] memory path = new address[](2);
        uint24[] memory fees = new uint24[](1);
        uint256 cheapestAmountIn;
        uint256 amountIn;

        if(_uniswapV3Factory.getPool(inputCurrency, outputCurrency, LOW_POOL_FEE) != address(0)) {
            path[0] = inputCurrency;
            path[1] = outputCurrency;
            fees[0] = LOW_POOL_FEE;

            try _uniswapV3Quoter.quoteExactOutputSingle(inputCurrency, outputCurrency, LOW_POOL_FEE, outputAmount, 0) returns (uint256 result) {
                cheapestAmountIn = result;
            } catch Error(string memory /*reason*/) { } catch (bytes memory /*lowLevelData*/) { }
        }
        if(_uniswapV3Factory.getPool(inputCurrency, outputCurrency, MEDIUM_POOL_FEE) != address(0)) {
            try _uniswapV3Quoter.quoteExactOutputSingle(inputCurrency, outputCurrency, MEDIUM_POOL_FEE, outputAmount, 0) returns (uint256 result) {
              amountIn = result;
            } catch Error(string memory /*reason*/) { } catch (bytes memory /*lowLevelData*/) { }
            
            if(cheapestAmountIn == 0 || amountIn < cheapestAmountIn) {
                cheapestAmountIn = amountIn;
                path[0] = inputCurrency;
                path[1] = outputCurrency;
                fees[0] = MEDIUM_POOL_FEE;
            }
        }
        if(_uniswapV3Factory.getPool(inputCurrency, outputCurrency, HIGH_POOL_FEE) != address(0)) {
            try _uniswapV3Quoter.quoteExactOutputSingle(inputCurrency, outputCurrency, HIGH_POOL_FEE, outputAmount, 0) returns (uint256 result) {
              amountIn = result;
            } catch Error(string memory /*reason*/) { } catch (bytes memory /*lowLevelData*/) { }

            if(cheapestAmountIn == 0 || amountIn < cheapestAmountIn) {
                cheapestAmountIn = amountIn;
                path[0] = inputCurrency;
                path[1] = outputCurrency;
                fees[0] = HIGH_POOL_FEE;
            }
        }
        /*if(cheapestAmountIn != 0) { 
            return (path, fees, cheapestAmountIn);
        }*/

        // Direct path does not exist
        // Check for 3-hop path: input -> weth -> output
        uint24[] memory hopFees = new uint24[](2);
        uint cheapestAmountInForWethToDai;
        if(_uniswapV3Factory.getPool(address(_weth), outputCurrency, LOW_POOL_FEE) != address(0)) {
            hopFees[1] = LOW_POOL_FEE;
            try _uniswapV3Quoter.quoteExactOutputSingle(address(_weth), outputCurrency, LOW_POOL_FEE, outputAmount, 0) returns (uint256 result) {
              cheapestAmountInForWethToDai = result;
            } catch Error(string memory /*reason*/) { } catch (bytes memory /*lowLevelData*/) { }
        } 
        if(_uniswapV3Factory.getPool(address(_weth), outputCurrency, MEDIUM_POOL_FEE) != address(0)){
            try _uniswapV3Quoter.quoteExactOutputSingle(address(_weth), outputCurrency, MEDIUM_POOL_FEE, outputAmount, 0) returns (uint256 result) {
              amountIn = result;
            } catch Error(string memory /*reason*/) { } catch (bytes memory /*lowLevelData*/) { }

            if(cheapestAmountInForWethToDai == 0 || amountIn < cheapestAmountInForWethToDai) {
                hopFees[1] = MEDIUM_POOL_FEE;
                cheapestAmountInForWethToDai = amountIn;
            }
        }
        if(_uniswapV3Factory.getPool(address(_weth), outputCurrency, HIGH_POOL_FEE) != address(0)) {
            try _uniswapV3Quoter.quoteExactOutputSingle(address(_weth), outputCurrency, HIGH_POOL_FEE, outputAmount, 0) returns (uint256 result) {
              amountIn = result;
            } catch Error(string memory /*reason*/) { } catch (bytes memory /*lowLevelData*/) { }

            if(cheapestAmountInForWethToDai == 0 || amountIn < cheapestAmountInForWethToDai) {
                hopFees[1] = HIGH_POOL_FEE;
                cheapestAmountInForWethToDai = amountIn;
            }
        }
        if (cheapestAmountIn == 0 && cheapestAmountInForWethToDai == 0) {
            revert("no-path");
        }
        uint cheapestAmountInForWeth;
        if (cheapestAmountInForWethToDai != 0) {
            if(_uniswapV3Factory.getPool(inputCurrency, address(_weth), LOW_POOL_FEE) != address(0)) {
                hopFees[0] = LOW_POOL_FEE;
                try _uniswapV3Quoter.quoteExactOutputSingle(inputCurrency, address(_weth), LOW_POOL_FEE, cheapestAmountInForWethToDai, 0) returns (uint256 result) {
                  cheapestAmountInForWeth = result;
                } catch Error(string memory /*reason*/) { } catch (bytes memory /*lowLevelData*/) { }
            }
            if(_uniswapV3Factory.getPool(inputCurrency, address(_weth), MEDIUM_POOL_FEE) != address(0)) {
                try _uniswapV3Quoter.quoteExactOutputSingle(inputCurrency, address(_weth), MEDIUM_POOL_FEE, cheapestAmountInForWethToDai, 0) returns (uint256 result) {
                  amountIn = result;
                } catch Error(string memory /*reason*/) { } catch (bytes memory /*lowLevelData*/) { }

                if(cheapestAmountInForWeth == 0 || amountIn < cheapestAmountInForWeth) {
                    hopFees[0] = MEDIUM_POOL_FEE;
                    cheapestAmountInForWeth = amountIn;
                }
            }
            if(_uniswapV3Factory.getPool(inputCurrency, address(_weth), HIGH_POOL_FEE) != address(0)) {
                try _uniswapV3Quoter.quoteExactOutputSingle(inputCurrency, address(_weth), HIGH_POOL_FEE, cheapestAmountInForWethToDai, 0) returns (uint256 result) {
                  amountIn = result;
                } catch Error(string memory /*reason*/) { } catch (bytes memory /*lowLevelData*/) { }

                if(cheapestAmountInForWeth == 0 || amountIn < cheapestAmountInForWeth) {
                    hopFees[0] = HIGH_POOL_FEE;
                    cheapestAmountInForWeth = amountIn;
                }
            }
        }
        if (cheapestAmountIn == 0 && cheapestAmountInForWeth == 0) { 
            revert("no-path");
        }
        // 3-hop path does not exist return two hop path
        if (cheapestAmountInForWeth == 0 || cheapestAmountInForWethToDai == 0) {
            return (path, fees, cheapestAmountIn);
        }
        address[] memory hopPath = new address[](3);
        hopPath[0] = inputCurrency;
        hopPath[1] = address(_weth);
        hopPath[2] = outputCurrency;
        // Exact Output Multihop Swap requires path to be encoded in reverse
        bytes memory encodedPath = abi.encodePacked(hopPath[2], hopFees[1], hopPath[1], hopFees[0], hopPath[0]);
        cheapestAmountInForWeth = _uniswapV3Quoter.quoteExactOutput(encodedPath, outputAmount);
        // check whether 3-hop path is cheaper or single hop doesnt exist
        if (cheapestAmountInForWeth < cheapestAmountIn || cheapestAmountIn == 0) {
            return (hopPath, hopFees, cheapestAmountInForWeth); 
        }
        return (path, fees, cheapestAmountIn);
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
    function getOutputForInputInternal(address inputCurrency, address outputCurrency, uint inputAmount) internal returns (uint) {
        (,, uint cheapestAmountOut) = getInputPathInternal(inputCurrency, outputCurrency, inputAmount);
        return cheapestAmountOut;
    }

    /**
     * Returns the Uniswap path from `inputCurrency` to `outputCurrency`
     *
     * @param inputCurrency The input currency
     * @param outputCurrency The output currency
     *
     * @return The Uniswap path from `inputCurrency` to `outputCurrency`
     */
    function getInputPathInternal(address inputCurrency, address outputCurrency, uint inputAmount) internal returns (address[] memory, uint24[] memory, uint) {
        inputCurrency = inputCurrency == address(0) ? address(_weth) : inputCurrency;
        outputCurrency = outputCurrency == address(0) ? address(_weth) : outputCurrency;

        address[] memory path = new address[](2);
        uint24[] memory fees = new uint24[](1);
        uint256 cheapestAmountOut;
        uint256 amountOut;

        if(_uniswapV3Factory.getPool(inputCurrency, outputCurrency, LOW_POOL_FEE) != address(0)) {
            path[0] = inputCurrency;
            path[1] = outputCurrency;
            fees[0] = LOW_POOL_FEE;

            try _uniswapV3Quoter.quoteExactInputSingle(inputCurrency, outputCurrency, LOW_POOL_FEE, inputAmount, 0) returns (uint256 result) {
              cheapestAmountOut = result;
            } catch Error(string memory /*reason*/) { } catch (bytes memory /*lowLevelData*/) { }
        }
        if(_uniswapV3Factory.getPool(inputCurrency, outputCurrency, MEDIUM_POOL_FEE) != address(0)) {
            try _uniswapV3Quoter.quoteExactInputSingle(inputCurrency, outputCurrency, MEDIUM_POOL_FEE, inputAmount, 0) returns (uint256 result) {
              amountOut = result;
            } catch Error(string memory /*reason*/) { } catch (bytes memory /*lowLevelData*/) { }

            if(amountOut > cheapestAmountOut) {
                cheapestAmountOut = amountOut;
                path[0] = inputCurrency;
                path[1] = outputCurrency;
                fees[0] = MEDIUM_POOL_FEE;
            }
        }
        if(_uniswapV3Factory.getPool(inputCurrency, outputCurrency, HIGH_POOL_FEE) != address(0)) {
            try _uniswapV3Quoter.quoteExactInputSingle(inputCurrency, outputCurrency, HIGH_POOL_FEE, inputAmount, 0) returns (uint256 result) {
              amountOut = result;
            } catch Error(string memory /*reason*/) { } catch (bytes memory /*lowLevelData*/) { }

            if(amountOut > cheapestAmountOut) {
                cheapestAmountOut = amountOut;
                path[0] = inputCurrency;
                path[1] = outputCurrency;
                fees[0] = HIGH_POOL_FEE;
            }
        }

        // Direct path does not exist
        // Check for 3-hop path: input -> weth -> output
        uint24[] memory hopFees = new uint24[](2);
        uint cheapestAmountOutForInputToWeth;
        if(_uniswapV3Factory.getPool(inputCurrency, address(_weth), LOW_POOL_FEE) != address(0)) {
            hopFees[0] = LOW_POOL_FEE;
            try _uniswapV3Quoter.quoteExactInputSingle(inputCurrency, address(_weth), LOW_POOL_FEE, inputAmount, 0) returns (uint256 result) {
              cheapestAmountOutForInputToWeth = result;
            } catch Error(string memory /*reason*/) { } catch (bytes memory /*lowLevelData*/) { }
        } 
        if(_uniswapV3Factory.getPool(inputCurrency, address(_weth), MEDIUM_POOL_FEE) != address(0)) {
            try _uniswapV3Quoter.quoteExactInputSingle(inputCurrency, address(_weth), MEDIUM_POOL_FEE, inputAmount, 0) returns (uint256 result) {
              amountOut = result;
            } catch Error(string memory /*reason*/) { } catch (bytes memory /*lowLevelData*/) { }

            if(amountOut > cheapestAmountOutForInputToWeth) {
                hopFees[0] = MEDIUM_POOL_FEE;
                cheapestAmountOutForInputToWeth = amountOut;
            }
        }
        if(_uniswapV3Factory.getPool(inputCurrency, address(_weth), HIGH_POOL_FEE) != address(0)) {
            try _uniswapV3Quoter.quoteExactInputSingle(inputCurrency, address(_weth), HIGH_POOL_FEE, inputAmount, 0) returns (uint256 result) {
              amountOut = result;
            } catch Error(string memory /*reason*/) { } catch (bytes memory /*lowLevelData*/) { }

            if(amountOut > cheapestAmountOutForInputToWeth) {
                hopFees[0] = HIGH_POOL_FEE;
                cheapestAmountOutForInputToWeth = amountOut;
            }
        } 

        if (cheapestAmountOut == 0 && cheapestAmountOutForInputToWeth == 0) {
            revert("no-path");
        }

        uint cheapestAmountOutForWeth;
        if (cheapestAmountOutForInputToWeth != 0) {
            if(_uniswapV3Factory.getPool(address(_weth), outputCurrency, LOW_POOL_FEE) != address(0)) {
                hopFees[1] = LOW_POOL_FEE;
                try _uniswapV3Quoter.quoteExactInputSingle(address(_weth), outputCurrency, LOW_POOL_FEE, cheapestAmountOutForInputToWeth, 0) returns (uint256 result) {
                  cheapestAmountOutForWeth = result;
                } catch Error(string memory /*reason*/) { } catch (bytes memory /*lowLevelData*/) { }
            }
            if(_uniswapV3Factory.getPool(address(_weth), outputCurrency, MEDIUM_POOL_FEE) != address(0)) {
                try _uniswapV3Quoter.quoteExactInputSingle(address(_weth), outputCurrency, MEDIUM_POOL_FEE, cheapestAmountOutForInputToWeth, 0) returns (uint256 result) {
                  amountOut = result;
                } catch Error(string memory /*reason*/) { } catch (bytes memory /*lowLevelData*/) { }

                if(amountOut > cheapestAmountOutForWeth) {
                    hopFees[1] = MEDIUM_POOL_FEE;
                    cheapestAmountOutForWeth = amountOut;
                }
            }
            if(_uniswapV3Factory.getPool(address(_weth), outputCurrency, HIGH_POOL_FEE) != address(0)) {
                try _uniswapV3Quoter.quoteExactInputSingle(address(_weth), outputCurrency, HIGH_POOL_FEE, cheapestAmountOutForInputToWeth, 0) returns (uint256 result) {
                  amountOut = result;
                } catch Error(string memory /*reason*/) { } catch (bytes memory /*lowLevelData*/) { }

                if(amountOut > cheapestAmountOutForWeth) {
                    hopFees[1] = HIGH_POOL_FEE;
                    cheapestAmountOutForWeth = amountOut;
                }
            }
        }

        if (cheapestAmountOut == 0 && cheapestAmountOutForWeth == 0) { 
            revert("no-path");
        }
        // if 3-hop path does not exist return single hop
        if (cheapestAmountOutForWeth == 0 || cheapestAmountOutForInputToWeth == 0){
            return (path, fees, cheapestAmountOut);
        }
        // 3-hop path exists
        address[] memory hopPath = new address[](3);
        hopPath[0] = inputCurrency;
        hopPath[1] = address(_weth);
        hopPath[2] = outputCurrency;
        bytes memory encodedPath = abi.encodePacked(hopPath[0], hopFees[0], hopPath[1], hopFees[1], hopPath[2]);
        cheapestAmountOutForWeth = _uniswapV3Quoter.quoteExactInput(encodedPath, inputAmount);
        // check whether output is greater for 3-hop path
        if (cheapestAmountOutForWeth > cheapestAmountOut) {
            return (hopPath, hopFees, cheapestAmountOutForWeth);
        }
        return (path, fees, cheapestAmountOut);
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
        ISwapRouter router = _uniswapV3SwapRouter;

        (address[] memory path, uint24[] memory fees, ) = getInputPathInternal(inputCurrency, outputCurrency, inputAmount);
    
        IERC20 inputERC20;
        if(inputCurrency == address(0)) {
            // If the input is ETH we convert to WETH
            weth.deposit{value: inputAmount}();
            inputERC20 = IERC20(address(weth));
        } else {
            inputERC20 = IERC20(inputCurrency);
        }

        require(inputERC20.approve(address(router), inputAmount), "router-approve");

        if(path.length == 2 && fees.length == 1) {
            ISwapRouter.ExactInputSingleParams memory params =
            ISwapRouter.ExactInputSingleParams({
                tokenIn: path[0],
                tokenOut: path[1],
                fee: fees[0],
                recipient: address(this),
                deadline: block.timestamp + 1,
                amountIn: inputAmount,
                amountOutMinimum: outputAmount,
                sqrtPriceLimitX96: 0
            });
            router.exactInputSingle(params);
        }
        else { 
            bytes memory encodedPath = abi.encodePacked(path[0], fees[0], path[1], fees[1], path[2]);
            ISwapRouter.ExactInputParams memory params =
            ISwapRouter.ExactInputParams({
                path: encodedPath,
                recipient: address(this),
                deadline: block.timestamp + 1,
                amountIn: inputAmount,
                amountOutMinimum: outputAmount
            });
            router.exactInput(params);
        }

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
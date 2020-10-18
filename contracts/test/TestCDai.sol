// SPDX-License-Identifier: MIT
pragma solidity ^0.6.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../compound/ICToken.sol";
import "./TestERC20.sol";

/**
 * @title TestCDai
 * @author Alexander Schlindwein
 *
 * @dev cDai token for testing
 */
contract TestCDai is ERC20, ICToken {

    TestERC20 _dai;
    TestERC20 _comp;
    uint _exchangeRate;

    /**
     * @dev Constructs a new TestCDai
     * @param dai The address of the test dai
     * @param comp The address of the test comp
     */
    constructor (address dai, address comp) public ERC20("cDai", "cDai") {
        _dai = TestERC20(dai);
        _comp = TestERC20(comp);
    }

    /**
     * @dev Updates the interest - not implemented for testing
     */
    function accrueInterest() external override returns (uint) {
        return 0;
    }

    /**
     * @dev Mints a given amount of tokens to an address in exchange for dai.
     *
     * @param mintAmount The amount of Dai to spend for minting
     */
    function mint(uint mintAmount) external override returns (uint) {
        require(_dai.allowance(msg.sender, address(this)) >= mintAmount, "cDai mint: not enough allowance");
        require(_dai.transferFrom(msg.sender, address(this), mintAmount), "cDai mint: dai transfer failed");

        uint cDaiAmount = divScalarByExpTruncate(mintAmount, exchangeRateStored());
        _mint(msg.sender, cDaiAmount);

        // Mint some COMP for the msg.sender
        uint compAmount = 1 ether;
        _comp.mint(msg.sender, compAmount);
    }

    /**
     * @dev Redeems a given amount of Dai
     *
     * @param redeemAmount The amount of Dai to redeem
     */
    function redeemUnderlying(uint redeemAmount) external override returns (uint) {
        uint cDaiAmount = divScalarByExpTruncate(redeemAmount, exchangeRateStored());
        require(balanceOf(msg.sender) >= cDaiAmount, "cDai redeemUnderlying: not enough balance");

        _burn(msg.sender, cDaiAmount);
        uint daiBalance = _dai.balanceOf(address(this));
        if(daiBalance < redeemAmount) {
            _dai.mint(address(this), redeemAmount - daiBalance);
        }
        _dai.transfer(msg.sender, redeemAmount);
    }

    /**
     * @dev Redeems a given amount of cDai
     *
     * @param redeemAmount The amount of cDai to redeem
     */
    function redeem(uint redeemAmount) external override returns (uint) {
        require(balanceOf(msg.sender) >= redeemAmount, "cDai redeem: not enough balance");
        _burn(msg.sender, redeemAmount);

        uint daiAmount = mulScalarTruncate(exchangeRateStored(), redeemAmount);
        uint daiBalance = _dai.balanceOf(address(this));
        if(daiBalance < daiAmount) {
            _dai.mint(address(this), daiAmount - daiBalance);
        }
        _dai.transfer(msg.sender, daiAmount);
    }

    /**
     * @dev Sets the exchange rate
     *
     * @param exchangeRate The exchange rate
     */
    function setExchangeRate(uint exchangeRate) external {
        require(exchangeRate >= _exchangeRate, "TestCDai: new exchange rate must be larger");
        _exchangeRate = exchangeRate;
    }

    /**
     * @dev Returns the exchange rate for cDai -> Dai
     *
     * @return The exchange rate
     */
    function exchangeRateStored() public view override returns (uint) {
        return _exchangeRate;
    }

    // ====================================== COMPOUND MATH ======================================
    // https://github.com/compound-finance/compound-protocol/blob/master/contracts/Exponential.sol
    //
    // Modified to revert instead of returning an error code

    function mulScalarTruncate(uint a, uint scalar) pure internal returns (uint) {
        uint product = mulScalar(a, scalar);
        return truncate(product);
    }

    function mulScalar(uint a, uint scalar) pure internal returns (uint) {
        return a.mul(scalar);
    }

    function divScalarByExpTruncate(uint scalar, uint divisor) pure internal returns (uint) {
        uint fraction = divScalarByExp(scalar, divisor);
        return truncate(fraction);
    }

    function divScalarByExp(uint scalar, uint divisor) pure internal returns (uint) {
        uint numerator = uint(10**18).mul(scalar);
        return getExp(numerator, divisor);
    }

    function getExp(uint num, uint denom) pure internal returns (uint) {
        uint scaledNumerator = num.mul(10**18);
        return scaledNumerator.div(denom);
    }

    function truncate(uint num) pure internal returns (uint) {
        return num / 10**18;
    }
}
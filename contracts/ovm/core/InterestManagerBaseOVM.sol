// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "./interfaces/IInterestManagerBaseOVM.sol";
import "../../shared/util/Ownable.sol";
import "../../shared/compound/ICToken.sol";
import "../../shared/compound/IComptroller.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

/**
 * @title InterestManagerBaseOVM
 * @author Alexander Schlindwein
 * 
 * Invests DAI into Compound to generate interest
 * Sits behind an AdminUpgradabilityProxy 
 */
abstract contract InterestManagerBaseOVM is Ownable, IInterestManagerBaseOVM {

    using SafeMath for uint;

    // The amount of total shares
    uint public _totalShares;

    // Dai contract
    IERC20 internal _dai;

    /**
     * Initializes the contract with all required values
     *
     * @param owner The owner of the contract
     * @param dai The Dai token address
     */
    function initializeBaseInternal(address owner, address dai) internal {
        require(dai != address(0), "invalid-params");

        setOwnerInternal(owner); // Checks owner to be non-zero
        _dai = IERC20(dai);
    }

    /**
     * Invests a given amount of Dai into Compound
     * The Dai have to be transfered to this contract before this function is called
     *
     * @param amount The amount of Dai to invest
     *
     * @return The amount of minted cDai
     */
    function invest(uint amount) external override onlyOwner returns (uint) {

        uint addedShares;
        uint totalSharesBefore = _totalShares;
        if(totalSharesBefore == 0) {
            addedShares = amount;
        } else {
            uint daiReservesAfter = getTotalDaiReserves();
            uint daiReservesBefore = daiReservesAfter.sub(amount);
            addedShares = daiReservesAfter.mul(totalSharesBefore).div(daiReservesBefore).sub(totalSharesBefore);  
        }

        _totalShares = _totalShares.add(addedShares);
    
        investInternal(amount);    

        return addedShares;
    }

    /**
     * Redeems a given amount of Dai from Compound and sends it to the recipient
     *
     * @param recipient The recipient of the redeemed Dai
     * @param amount The amount of Dai to redeem
     *
     * @return The amount of burned cDai
     */
    function redeem(address recipient, uint amount) external override onlyOwner returns (uint) {

        uint daiReservesBefore = getTotalDaiReserves(); 
        uint daiReservesAfter = daiReservesBefore.sub(amount);
        uint totalSharesBefore = _totalShares;

        uint removedShares = _totalShares.sub(daiReservesAfter.mul(totalSharesBefore).div(daiReservesBefore));
        _totalShares = _totalShares.sub(removedShares);

        redeemInternal(recipient, amount);
        
        return removedShares;
    }

    /**
     * Converts an amount of Dai to an amount of shares
     *
     * @param dai The amount of Dai
     *
     * @return The amount of shares
     */
    function daiToShares(uint dai) external override view returns (uint) {

        uint daiReserves = getTotalDaiReserves();

        if(daiReserves == 0) {
            return 0;
        }

        return dai.mul(_totalShares).div(daiReserves);
    }

    /**
     * Converts an amount of shares to an amount of Dai
     *
     * @param shares The amount of shares
     *
     * @return The amount of Dai
     */
    function sharesToDai(uint shares) external override view returns (uint) {
        uint daiReserves = getTotalDaiReserves(); 
        uint totalShares = _totalShares;

        if(totalShares == 0) {
            return 0;
        }

        return daiReserves.mul(shares).div(_totalShares);
    }

    function investInternal(uint amount) internal virtual;
    function redeemInternal(address recipient, uint amount) internal virtual;
    function accrueInterest() external virtual override;
    function getTotalDaiReserves() public virtual override view returns (uint);
}
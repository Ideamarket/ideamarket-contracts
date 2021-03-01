// SPDX-License-Identifier: MIT
pragma solidity 0.6.9;

import "../core/InterestManagerBaseAVM.sol";
import "./interfaces/IInterestManagerCompoundAVM.sol";
import "../../shared/compound/IComptroller.sol";
import "../../shared/compound/ICToken.sol";

/**
 * @title InterestManagerCompoundAVM
 * @author Alexander Schlindwein
 *
 * Logic for the InterestManager contract on L2 once Compound is available.
 * This contract will only be set as logic after the state transfer is complete with 
 * `InterestManagerStateTransferAVM` even if Compound would be available during state transfer.
 */
contract InterestManagerCompoundAVM is InterestManagerBaseAVM, IInterestManagerCompoundAVM {

    // cDai contract
    ICToken private _cDai;
    // COMP contract
    IERC20 private _comp;
    // Address which is allowed to withdraw accrued COMP tokens
    address private _compRecipient;

    /**
     * Initializes the contract. 
     *
     * @param cDai The cDai token address
     * @param comp The Comp token address
     * @param compRecipient The address of the recipient of the Comp tokens
     */
    function initializeCompound(address cDai, address comp, address compRecipient) external override {
        require(address(_cDai) == address(0), "already-init");

        require(cDai != address(0) && 
                comp != address(0) &&
                compRecipient != address(0),
                "invalid-params");
                
        _cDai = ICToken(cDai);
        _comp = IERC20(comp);
        _compRecipient = compRecipient;
    }

    /**
     * Invest an amount of Dai into Compound
     *
     * @param amount The amount of Dai to invest
     */
    function investInternal(uint amount) internal override {
        require(_dai.approve(address(_cDai), amount), "dai-cdai-approve");
        require(_cDai.mint(amount) == 0, "cdai-mint");
    }

    /**
     * Redeems an amount of Dai.
     *
     * @param amount The amount of Dai to redeem
     */
    function redeemInternal(address recipient, uint amount) internal override {
        require(_cDai.redeemUnderlying(amount) == 0, "redeem");
        require(_dai.transfer(recipient, amount), "dai-transfer");
    }

    /**
     * Accrues interest
     */
    function accrueInterest() external override {
        require(_cDai.accrueInterest() == 0, "accrue");
    }

    /**
     * Withdraws the generated Comp tokens to the Comp recipient
     */
    function withdrawComp() external override {
        address addr = address(this);
        IERC20 comp = _comp;

        IComptroller(_cDai.comptroller()).claimComp(addr);
        require(comp.transfer(_compRecipient, comp.balanceOf(addr)), "comp-transfer");
    }

    /**
     * Returns the total amount of Dai holdings.
     *
     * @return The total amount of Dai holdings.
     */
    function getTotalDaiReserves() public view override returns (uint) {
        address addr = address(this);
        ICToken cDai = _cDai;
        uint cDaiBalance = cDai.balanceOf(addr);
        uint cDaiAsDai = cDaiToDai(cDai, cDaiBalance);

        return _dai.balanceOf(address(this)).add(cDaiAsDai);
    }

    function cDaiToDai(ICToken cDai, uint cDaiAmount) internal view returns (uint) {
        return mulScalarTruncate(cDaiAmount, cDai.exchangeRateStored());
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

    function truncate(uint num) pure internal returns (uint) {
        return num / 10**18;
    }
}
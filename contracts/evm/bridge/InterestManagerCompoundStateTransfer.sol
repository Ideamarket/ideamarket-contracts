// SPDX-License-Identifier: MIT
// @unsupported: ovm
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "./interfaces/IInterestManagerCompoundStateTransfer.sol";
import "../core/InterestManagerCompound.sol"; 

/**
 * @title InterestManagerCompoundStateTransfer
 * @author Alexander Schlindwein
 *
 * Replaces the L1 InterestManagerCompound logic for the state transfer to Optimism L2.
 * 
 * This implementation will disable all state-altering methods.
 */
contract InterestManagerCompoundStateTransfer is InterestManagerCompound, IInterestManagerCompoundStateTransfer {

    uint __gapStateTransfer__;

    // EOA which is allowed to manage the state transfer
    address public _transferManager;
    // Address of the interest manager contract on L2
    address public _l2InterestManager;
    // Address of Maker's Dai bridge
    address public _daiBridge;
    // Whether the state transfer has been executed
    bool public _stateTransferExecuted; 

    /**
     * Initializes the contract's variables.
     *
     * @param transferManager EOA which is allowed to manage the state transfer
     * @param l2InterestManager Address of the interest manager contract on L2
     * @param daiBridge Address of Maker's Dai bridge
     */
    function initializeStateTransfer(address transferManager, address l2InterestManager, address daiBridge) external override {
        require(_transferManager == address(0), "already-init");
        require(transferManager != address(0) && l2InterestManager != address(0) &&  daiBridge != address(0), "invalid-args");

        _transferManager = transferManager;
        _l2InterestManager = l2InterestManager;
        _daiBridge = daiBridge;
    }

    /**
     * Transfers Dai to the L2 InterestManager
     */
    function executeStateTransfer() external override {
        require(msg.sender == _transferManager, "only-transfer-manager");
        require(!_stateTransferExecuted, "already-executed");
        
        _stateTransferExecuted = true;

        address addr = address(this);
        ICToken cDai = _cDai;
        IERC20 dai = _dai;
        IERC20 comp = _comp;

        // Accrue Interest
        require(_cDai.accrueInterest() == 0, "accrue");

        // Claim COMP
        IComptroller(cDai.comptroller()).claimComp(addr);
        require(comp.transfer(_compRecipient, comp.balanceOf(addr)), "comp-transfer");

        // Redeem Dai from Compound
        require(cDai.redeem(cDai.balanceOf(addr)) == 0, "redeem");

        /*
        *   ----- TODO -----
        *   Here the Dai should be transferred to L2 using a Dai bridge
        *   Once there is info available on Maker's Dai bridge this will be properly implemented
        */
        require(dai.transfer(address(0x1), dai.balanceOf(addr)), "dai-transfer"); // TODO: Implement transfer to bridge
    }

    /* **********************************************
     * ************  Disabled functions  ************
     * ********************************************** 
     */

    function initialize(address owner, address dai, address cDai, address comp, address compRecipient) external override {
        owner; dai; cDai; comp; compRecipient;
        revert("x");
    }

    function invest(uint amount) external override returns (uint) {
        amount;
        revert("x");
    }

    function redeem(address recipient, uint amount) external override returns (uint) {
        recipient; amount;
        revert("x");
    }

    function redeemInvestmentToken(address recipient, uint amount) external override returns (uint) {
        recipient; amount;
        revert("x");
    }

    function accrueInterest() external override {
        revert("x");
    }

    function withdrawComp() external override {
        revert("x");
    }

    function underlyingToInvestmentToken(uint underlyingAmount) external override view returns (uint) {
        underlyingAmount;
        revert("x");
    }

    function investmentTokenToUnderlying(uint investmentTokenAmount) external override view returns (uint) {
        investmentTokenAmount;
        revert("x");
    }

    function mulScalarTruncate(uint a, uint scalar) internal override pure returns (uint) {
        a; scalar;
        revert("x");
    }

    function mulScalar(uint a, uint scalar) internal override pure returns (uint) {
        a; scalar;
        revert("x");
    }

    function divScalarByExpTruncate(uint scalar, uint divisor) internal override pure returns (uint) {
        scalar; divisor;
        revert("x");
    }

    function divScalarByExp(uint scalar, uint divisor) internal override pure returns (uint) {
        scalar; divisor;
        revert("x");
    }

    function getExp(uint num, uint denom) internal override pure returns (uint) {
        num; denom;
        revert("x");
    }

    function truncate(uint num) internal override pure returns (uint) {
        num;
        revert("x");
    }
}
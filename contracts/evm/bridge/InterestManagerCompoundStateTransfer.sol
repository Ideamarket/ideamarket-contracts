// SPDX-License-Identifier: MIT
pragma solidity 0.6.9;

import "./interfaces/IInterestManagerCompoundStateTransfer.sol";
import "./interfaces/IERC20Bridge.sol";
import "../core/InterestManagerCompound.sol"; 

/**
 * @title InterestManagerCompoundStateTransfer
 * @author Alexander Schlindwein
 *
 * Replaces the L1 InterestManagerCompound logic for the state transfer to Arbitrum L2.
 * 
 * This implementation will disable all state-altering methods.
 */
contract InterestManagerCompoundStateTransfer is InterestManagerCompound, IInterestManagerCompoundStateTransfer {

    uint __gapStateTransfer__;

    // EOA which is allowed to manage the state transfer
    address public _transferManager;
    // Address of the interest manager contract on L2
    address public _l2InterestManager;
    // Arbitrum's ERC20 bridge
    IERC20Bridge public _erc20Bridge;
    // Whether the state transfer has been executed
    bool public _stateTransferExecuted;

    /**
     * Initializes the contract's variables.
     *
     * @param transferManager EOA which is allowed to manage the state transfer
     * @param l2InterestManager Address of the interest manager contract on L2
     * @param erc20Bridge Address of Arbitrum's ERC20 bridge
     */
    function initializeStateTransfer(address transferManager, address l2InterestManager, address erc20Bridge) external override {
        require(_transferManager == address(0), "already-init");
        require(transferManager != address(0) && l2InterestManager != address(0) && erc20Bridge != address(0), "invalid-args");

        _transferManager = transferManager;
        _l2InterestManager = l2InterestManager;
        _erc20Bridge = IERC20Bridge(erc20Bridge);
    }

    /**
     * Transfers Dai to the L2 InterestManager
     *
     * @param l2GasPriceBid Gas price for the L2 tx
     *
     * @return L1 -> L2 tx ticket id
     */
    function executeStateTransfer(uint gasLimit, uint maxSubmissionCost, uint l2GasPriceBid) external payable override returns (uint) {
        require(msg.sender == _transferManager, "only-transfer-manager");
        require(!_stateTransferExecuted, "already-executed");

        require(msg.value == maxSubmissionCost.add(gasLimit.mul(l2GasPriceBid)), "value");
        
        _stateTransferExecuted = true;

        address addr = address(this);
        ICToken cDai = _cDai;
        IERC20 dai = _dai;
        IERC20 comp = _comp;

        // Accrue Interest
        require(cDai.accrueInterest() == 0, "accrue");

        // Claim COMP
        IComptroller(cDai.comptroller()).claimComp(addr);

        uint bal = comp.balanceOf(addr);
        if(bal > 0) {
            require(comp.transfer(_compRecipient, bal), "comp-transfer");
        }
        
        // Redeem Dai from Compound
        bal = cDai.balanceOf(addr);
        if(bal > 0) {
            require(cDai.redeem(bal) == 0, "redeem");
        }
        
        bal = dai.balanceOf(addr);

        return transferDaiInternal(dai, bal, gasLimit, maxSubmissionCost, l2GasPriceBid);
    }

    // Stack too deep
    function transferDaiInternal(IERC20 dai, uint amount, uint gasLimit, uint maxSubmissionCost, uint l2GasPriceBid) internal returns (uint) {

        IERC20Bridge erc20Bridge = _erc20Bridge;
        require(dai.approve(address(erc20Bridge), amount), "dai-approve");

        (uint seq, ) = erc20Bridge.deposit{value: msg.value}(
            address(dai),           // ERC20 address
            _l2InterestManager,     // L2 recipient
            amount,                 // Amount
            maxSubmissionCost,      // max submission cost
            gasLimit,               // l2 tx gas limit
            l2GasPriceBid,          // l2 tx gas price
            ""                      // l2 calldata
        );
        
        return seq;
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
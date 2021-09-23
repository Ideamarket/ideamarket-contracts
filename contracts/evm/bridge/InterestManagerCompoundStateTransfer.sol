// SPDX-License-Identifier: MIT
pragma solidity 0.6.9;

import "./interfaces/IInterestManagerCompoundStateTransfer.sol";
import "./interfaces/IL1GatewayRouter.sol";
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
    // Arbitrum's token bridge router
    IL1GatewayRouter public _l1GatewayRouter;
    // Whether the state transfer has been executed
    bool public _stateTransferExecuted;

    /**
     * Initializes the contract's variables.
     *
     * @param transferManager EOA which is allowed to manage the state transfer
     * @param l2InterestManager Address of the interest manager contract on L2
     * @param l1GatewayRouter Address of Arbitrum's GatewayRouter
     */
    function initializeStateTransfer(address transferManager, address l2InterestManager, address l1GatewayRouter) external override {
        require(_transferManager == address(0), "already-init");
        require(transferManager != address(0) && l2InterestManager != address(0) && l1GatewayRouter != address(0), "invalid-args");

        _transferManager = transferManager;
        _l2InterestManager = l2InterestManager;
        _l1GatewayRouter = IL1GatewayRouter(l1GatewayRouter);
    }

    /**
     * Transfers Dai to the L2 InterestManager
     *
     * @param gasLimit The gas limit for the L2 tx
     * @param l2GasPriceBid Gas price for the L2 tx
     *
     * @return L1 -> L2 tx ticket id
     */
    function executeStateTransfer(uint gasLimit, uint maxSubmissionCost, uint l2GasPriceBid) external payable override returns (bytes memory) {
        require(msg.sender == _transferManager, "only-transfer-manager");
        require(!_stateTransferExecuted, "already-executed");

        require(msg.value == maxSubmissionCost.add(gasLimit.mul(l2GasPriceBid)), "value");
        
        _stateTransferExecuted = true;

        address addr = address(this);
        ICToken cDai = _cDai;
        IERC20 dai = _dai;

        // Accrue Interest
        require(cDai.accrueInterest() == 0, "accrue");
        
        // Redeem Dai from Compound
        uint bal = cDai.balanceOf(addr);
        if(bal > 0) {
            require(cDai.redeem(bal) == 0, "redeem");
        }
        
        bal = dai.balanceOf(addr);

        return transferDaiInternal(dai, bal, gasLimit, maxSubmissionCost, l2GasPriceBid);
    }

    // Stack too deep
    function transferDaiInternal(IERC20 dai, uint amount, uint gasLimit, uint maxSubmissionCost, uint l2GasPriceBid) internal returns (bytes memory) {

        IL1GatewayRouter l1GatewayRouter = _l1GatewayRouter;
        
        address gateway = l1GatewayRouter.getGateway(address(dai));
        require(gateway != address(0), "zero-gateway");
        require(dai.approve(address(gateway), amount), "dai-approve");

        bytes memory empty = "";
        bytes memory data = abi.encode(maxSubmissionCost, empty);

        return l1GatewayRouter.outboundTransfer{value: msg.value}(
            address(dai),           // ERC20 address
            _l2InterestManager,     // L2 recipient
            amount,                 // Amount
            gasLimit,               // l2 tx gas limit
            l2GasPriceBid,          // l2 tx gas price
            data                    // max submission cost and extra data
        );
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
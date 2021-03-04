// SPDX-License-Identifier: MIT
// @unsupported: ovm
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "./IRollupContract.sol";
import "../core/IdeaTokenExchange.sol"; 

contract IdeaTokenExchangeStateTransfer is IdeaTokenExchange {

    uint __gapStateTransfer__;

    address _transferManager;
    address _l2Bridge;
    IRollupContract _rollupContract;

    modifier onlyTransferManager() {
        require(msg.sender == _transferManager, "only-transfer-manager");
        _;
    }

    function initializeStateTransfer(address transferManager, address l2Bridge, address rollupContract) external {
        require(_transferManager == address(0), "already-init");
        require(transferManager != address(0) && l2Bridge != address(0) &&  rollupContract != address(0), "invalid-args");

        _transferManager = transferManager;
        _l2Bridge = l2Bridge;
        _rollupContract = IRollupContract(rollupContract);
    }

    function transferStaticVars() external onlyTransferManager {

    }

    function transferPlatformVars(uint marketID) external onlyTransferManager {
        
    }

    function transferTokenVars(uint[] calldata tokenIDs) external onlyTransferManager {
        
    }

    // --- Disabled function during state transfer ---
    function sellTokens(address ideaToken, uint amount, uint minPrice, address recipient) external override {
        ideaToken;
        amount;
        minPrice;
        recipient;

        revert("state-transfer");
    }

    function buyTokens(address ideaToken, uint amount, uint fallbackAmount, uint cost, address recipient) external override {
        ideaToken;
        amount;
        fallbackAmount;
        cost;
        recipient;

        revert("state-transfer");
    }

    function withdrawTokenInterest(address token) external override {
        token;

        revert("state-transfer");
    }

    function withdrawPlatformInterest(uint marketID) external override {
        marketID;

        revert("state-transfer");
    }

    function withdrawPlatformFee(uint marketID) external override {
        marketID;

        revert("state-transfer");
    }

    function withdrawTradingFee() external override {
        revert("state-transfer");
    }

    function setTokenOwner(address token, address owner) external override {
        token;
        owner;

        revert("state-transfer");
    }
}
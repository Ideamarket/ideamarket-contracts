// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "./interfaces/IInterestManagerStateTransferOVM.sol";
import "../core/InterestManagerBaseOVM.sol";

contract InterestManagerStateTransferOVM is InterestManagerBaseOVM, IInterestManagerStateTransferOVM {

    function initializeStateTransfer(address owner, address dai) external override {
        require(address(_dai) == address(0), "already-init");
        initializeBaseInternal(owner, dai);
    }

    function addToTotalShares(uint amount) external override onlyOwner {
        _totalShares = _totalShares.add(amount);
    }

    function investInternal(uint amount) internal override {}

    function redeemInternal(address recipient, uint amount) internal override {}

    function accrueInterest() external override {}

    function getTotalDaiReserves() public view override returns (uint) {
        return _dai.balanceOf(address(this));
    }
}
// SPDX-License-Identifier: MIT
pragma solidity ^0.6.9;

interface IInterestManager {
    function invest(uint amount) external;
    function redeem(address recipient, uint amount) external;
    function donateInterest(uint amount) external;
    function redeemDonated(uint amount) external;
    function accrueInterest() external;
    function redeemComp() external;
    function getExchangeRate() external view returns (uint);
}
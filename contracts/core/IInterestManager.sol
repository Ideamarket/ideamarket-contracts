// SPDX-License-Identifier: MIT
pragma solidity ^0.6.9;

interface IInterestManager {
    function invest(uint amount) external returns (uint);
    function redeem(address recipient, uint amount) external returns (uint);
    function redeemInvestmentToken(address recipient, uint amount) external returns (uint);
    function donateInterest(uint amount) external;
    function redeemDonated(uint amount) external;
    function accrueInterest() external;
    function redeemComp() external;
    function getExchangeRate() external view returns (uint);
}
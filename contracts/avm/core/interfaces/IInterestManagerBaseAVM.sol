// SPDX-License-Identifier: MIT
pragma solidity 0.6.9;

/**
 * @title IInterestManagerBaseAVM
 * @author Alexander Schlindwein
 */
interface IInterestManagerBaseAVM {
    function invest(uint amount) external returns (uint);
    function redeem(address recipient, uint amount) external returns (uint);
    function daiToShares(uint dai) external view returns (uint);
    function sharesToDai(uint shares) external view returns (uint);
    function accrueInterest() external;
    function getTotalDaiReserves() external view returns (uint);
}
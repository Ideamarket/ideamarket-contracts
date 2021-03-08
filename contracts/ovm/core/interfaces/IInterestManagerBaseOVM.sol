// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

/**
 * @title IInterestManagerBaseOVM
 * @author Alexander Schlindwein
 */
interface IInterestManagerBaseOVM {
    function invest(uint amount) external returns (uint);
    function redeem(address recipient, uint amount) external returns (uint);
    function daiToShares(uint dai) external view returns (uint);
    function sharesToDai(uint shares) external view returns (uint);
    function accrueInterest() external;
    function getTotalDaiReserves() external view returns (uint);
}
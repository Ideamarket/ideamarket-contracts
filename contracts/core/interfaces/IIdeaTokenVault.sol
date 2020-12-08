// SPDX-License-Identifier: MIT
pragma solidity ^0.6.9;
pragma experimental ABIEncoderV2;

/**
 * @title IIdeaTokenVault
 * @author Alexander Schlindwein
 */

struct LockedEntry {
    uint lockedUntil;
    uint lockedAmount;
}
    
interface IIdeaTokenVault {
    function lock(address ideaToken, uint amount, uint duration, address recipient) external;
    function withdraw(address ideaToken, address recipient) external;
    function withdrawMaxEntries(address ideaToken, address recipient, uint maxEntries) external;
    function getTotalAmount(address ideaToken, address owner) external view returns (uint);
    function getWithdrawableAmount(address ideaToken, address owner) external view returns (uint);
    function getLockedEntries(address ideaToken, address owner) external view returns (LockedEntry[] memory);
    function addAllowedDuration(uint duration) external;
} 
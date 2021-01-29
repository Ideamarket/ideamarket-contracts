// SPDX-License-Identifier: MIT
pragma solidity 0.6.9;
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
    function withdraw(address ideaToken, uint[] calldata untils, address recipient) external;
    function getLockedEntries(address ideaToken, address user, uint maxEntries) external view returns (LockedEntry[] memory);
} 
// SPDX-License-Identifier: MIT
pragma solidity ^0.6.9;

/**
 * @title IIdeaTokenVault
 * @author Alexander Schlindwein
 */

 struct LockedEntry {
        uint lockedUntil;
        uint lockedAmount;
    }
    
interface IIdeaTokenVault {

    

    function withdraw(address ideaToken, address recipient) external;
} 
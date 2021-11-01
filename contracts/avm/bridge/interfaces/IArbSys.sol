// SPDX-License-Identifier: MIT
// https://github.com/OffchainLabs/arb-os/blob/develop/contracts/arbos/builtin/ArbSys.sol

pragma solidity 0.6.9;

/**
 * @title IArbSys
 * @author Alexander Schlindwein
 */
interface IArbSys {
    function isTopLevelCall() external view returns (bool);
}
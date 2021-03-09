// SPDX-License-Identifier: MIT
// @unsupported: ovm
//
// Interface for 
// https://github.com/ethereum-optimism/contracts/blob/master/contracts/optimistic-ethereum/OVM/bridge/messaging/Abs_BaseCrossDomainMessenger.sol
pragma solidity 0.6.12;

/**
 * @title ICrossDomainMessenger
 * @author Alexander Schlindwein
 */
interface ICrossDomainMessenger {
    function sendMessage(address _target, bytes memory _message, uint32 _gasLimit) external;
}


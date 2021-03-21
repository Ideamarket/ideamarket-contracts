// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

/**
 * @title TestCrossDomainMessengerOVM
 * @author Alexander Schlindwein
 *
 * Mock xDomainMessenger for testing
 */
contract TestCrossDomainMessengerOVM {
    address private sender;

    function setXDomainMessageSender(address addr) external {
        sender = addr;
    }

    function xDomainMessageSender() external view returns (address) {
        return sender;
    }
}
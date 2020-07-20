// SPDX-License-Identifier: MIT
pragma solidity ^0.6.9;

/**
 * @title Ownable
 * @author Alexander Schlindwein
 *
 * @dev Implements only-owner functionality
 */
contract Ownable {

    address public _owner;

    constructor() public {
        _owner = msg.sender;
    }

    modifier onlyOwner {
        require(_owner == msg.sender, "Ownable: onlyOwner");
        _;
    }
}
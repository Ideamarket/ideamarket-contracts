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

    event OwnershipChanged(address oldOwner, address newOwner);

    constructor() public {
        _owner = msg.sender;

        emit OwnershipChanged(address(0), msg.sender);
    }

    modifier onlyOwner {
        require(_owner == msg.sender, "Ownable: onlyOwner");
        _;
    }

    function setOwner(address newOwner) external onlyOwner {
        setOwnerInternal(newOwner);
    }

    function setOwnerInternal(address newOwner) internal {
        address oldOwner = _owner;
        _owner = newOwner;

        emit OwnershipChanged(oldOwner, newOwner);
    }
}
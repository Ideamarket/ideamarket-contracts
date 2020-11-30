// SPDX-License-Identifier: MIT
pragma solidity ^0.6.9;
pragma experimental ABIEncoderV2;

import "./IIdeaTokenVault.sol";
import "./IIdeaTokenFactory.sol";

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title IdeaTokenVault
 * @author Alexander Schlindwein
 *
 * Locks IdeaTokens for one year
 * Sits behind an AdminUpgradabilityProxy
 */
contract IdeaTokenVault is IIdeaTokenVault {
    using SafeMath for uint256;

    uint constant LOCK_DURATION = 365 days;

    IIdeaTokenFactory _ideaTokenFactory;

    mapping(address => uint) public _totalLockedTokens;
    // IdeaToken => owner => locked amounts
    mapping(address => mapping(address => LockedEntry[])) public _lockedEntries;
    mapping(address => mapping(address => uint)) public _listHead;

    /*
        TODO: Events
    */

    constructor(address ideaTokenFactory) public {
        _ideaTokenFactory = IIdeaTokenFactory(ideaTokenFactory);
    }

    function lockTokens(address ideaToken, uint amount, address recipient) external {
        require(_ideaTokenFactory.getTokenIDPair(ideaToken).exists, "lockTokens: invalid IdeaToken");
        require(amount > 0, "lockTokens: invalid amount");
        require(IERC20(ideaToken).allowance(msg.sender, address(this)) >= amount, "lockTokens: not enough allowance");
        require(IERC20(ideaToken).transferFrom(msg.sender, address(this), amount), "lockTokens: transfer failed");

        addLockedEntry(ideaToken, recipient, amount);
    }

    function buyAndLockTokens(address ideaToken, uint amount, uint fallbackAmount, uint cost, address recipient) external {

    }

    function withdraw(address ideaToken, address recipient) external override {
        uint ts = now;
        uint head = _listHead[ideaToken][msg.sender];
        LockedEntry[] storage entries = _lockedEntries[ideaToken][msg.sender];

        uint total = 0;
        uint newHead = head;
        for(uint i = head; i < entries.length; i++) {
            if(entries[i].lockedUntil >= ts) {
                break;
            }

            newHead++;
            total = total.add(entries[i].lockedAmount);
        }

        _listHead[ideaToken][msg.sender] = newHead;

        if(total > 0) {
            _totalLockedTokens[ideaToken] = _totalLockedTokens[ideaToken].sub(total);
            IERC20(ideaToken).transfer(recipient, total);
        }
    }

    function addLockedEntry(address ideaToken, address user, uint amount) internal {
        _totalLockedTokens[ideaToken] = _totalLockedTokens[ideaToken].add(amount);
        LockedEntry memory newEntry = LockedEntry({lockedUntil: now + LOCK_DURATION, lockedAmount: amount});
        _lockedEntries[ideaToken][user].push(newEntry);

        // TODO: EMIT
    }

}
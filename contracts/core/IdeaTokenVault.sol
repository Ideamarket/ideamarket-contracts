// SPDX-License-Identifier: MIT
pragma solidity ^0.6.9;
pragma experimental ABIEncoderV2;

import "./interfaces/IIdeaTokenVault.sol";
import "./interfaces/IIdeaTokenFactory.sol";
import "../util/Initializable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";


/**
 * @title IdeaTokenVault
 * @author Alexander Schlindwein
 *
 * Locks IdeaTokens for 365 days
 * Sits behind an AdminUpgradabilityProxy
 */
contract IdeaTokenVault is IIdeaTokenVault, Initializable {
    using SafeMath for uint256;

    uint constant LOCK_DURATION = 365 days;

    IIdeaTokenFactory internal _ideaTokenFactory;

    // IdeaToken => toal locked
    mapping(address => uint) internal _totalLockedTokens;
    // IdeaToken => owner => locked amounts
    mapping(address => mapping(address => LockedEntry[])) internal _lockedEntries;
    // IdeaToken => owner => list head index
    mapping(address => mapping(address => uint)) internal _listHead;

    event Locked(address ideaToken, address owner, uint lockedUntil, uint lockedAmount, uint index);
    event Withdrawn(address ideaToken, address owner, uint index);

    function initialize (address ideaTokenFactory) external initializer {
        _ideaTokenFactory = IIdeaTokenFactory(ideaTokenFactory);
    }

    function lock(address ideaToken, uint amount, address recipient) external override {
        require(_ideaTokenFactory.getTokenIDPair(ideaToken).exists, "lockTokens: invalid IdeaToken");
        require(amount > 0, "lockTokens: invalid amount");
        require(IERC20(ideaToken).allowance(msg.sender, address(this)) >= amount, "lockTokens: not enough allowance");
        require(IERC20(ideaToken).transferFrom(msg.sender, address(this), amount), "lockTokens: transfer failed");

        _totalLockedTokens[ideaToken] = _totalLockedTokens[ideaToken].add(amount);
        uint lockedUntil = now + LOCK_DURATION;
        LockedEntry memory newEntry = LockedEntry({lockedUntil: lockedUntil, lockedAmount: amount});
        _lockedEntries[ideaToken][recipient].push(newEntry);

        emit Locked(ideaToken, recipient, lockedUntil, amount, _lockedEntries[ideaToken][recipient].length - 1);
    }

    function withdraw(address ideaToken, address recipient) external override {
        withdrawMaxEntries(ideaToken, recipient, uint(-1));
    }

    function withdrawMaxEntries(address ideaToken, address recipient, uint maxEntries) public override {
        uint ts = now;
        uint head = _listHead[ideaToken][msg.sender];
        LockedEntry[] storage entries = _lockedEntries[ideaToken][msg.sender];

        uint counter = 0;
        uint total = 0;
        uint newHead = head;
        for(uint i = head; i < entries.length && counter < maxEntries; i++) {
            if(entries[i].lockedUntil >= ts) {
                break;
            }

            counter ++;
            newHead++;
            total = total.add(entries[i].lockedAmount);

            delete entries[i];
            emit Withdrawn(ideaToken, msg.sender, i);
        }

        _listHead[ideaToken][msg.sender] = newHead;

        if(total > 0) {
            _totalLockedTokens[ideaToken] = _totalLockedTokens[ideaToken].sub(total);
            IERC20(ideaToken).transfer(recipient, total);
        }
    }

    function getTotalLockedAmount(address ideaToken) external view override returns (uint) {
        return _totalLockedTokens[ideaToken];
    }

    function getLockedAmount(address ideaToken, address owner) external view override returns (uint) {
        uint head = _listHead[ideaToken][owner];
        LockedEntry[] storage entries = _lockedEntries[ideaToken][owner];

        uint total = 0;
        for(uint i = head; i < entries.length; i++) {
            total = total.add(entries[i].lockedAmount);
        }

        return total;
    }

    function getWithdrawableAmount(address ideaToken, address owner) external view override returns (uint) {
        uint ts = now;
        uint head = _listHead[ideaToken][owner];
        LockedEntry[] storage entries = _lockedEntries[ideaToken][owner];

        uint total = 0;
        for(uint i = head; i < entries.length; i++) {
            if(entries[i].lockedUntil >= ts) {
                break;
            }
            
            total = total.add(entries[i].lockedAmount);
        }

        return total;
    }
}
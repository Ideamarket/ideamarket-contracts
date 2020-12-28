// SPDX-License-Identifier: MIT
pragma solidity ^0.6.9;
pragma experimental ABIEncoderV2;

import "./interfaces/IIdeaTokenVault.sol";
import "./interfaces/IIdeaTokenFactory.sol";
import "../util/Ownable.sol";
import "../util/Initializable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title IdeaTokenVault
 * @author Alexander Schlindwein
 *
 * Locks IdeaTokens for a given duration
 * Sits behind an AdminUpgradabilityProxy
 */
contract IdeaTokenVault is IIdeaTokenVault, Initializable {
    using SafeMath for uint256;

    // LinkedList Entry
    struct LLEntry {
        uint until;
        uint amount;
        bytes32 prev;
        bytes32 next;
    }

    IIdeaTokenFactory _ideaTokenFactory;

    // IdeaToken => owner => lockedUntil => bool
    mapping(address => mapping(address => bytes32)) public _llHead;

    event Locked(address ideaToken, address owner, uint lockedAmount, uint lockedUntil, uint lockedDuration);

    /**
     * Initializes the contract
     *
     * @param ideaTokenFactory The address of the IdeaTokenFactory contract
     */
    function initialize(address ideaTokenFactory) external initializer {
        _ideaTokenFactory = IIdeaTokenFactory(ideaTokenFactory);
    }

    /**
     * Locks IdeaTokens for a given duration.
     * Allowed durations are set by the owner.
     *
     * @param ideaToken The IdeaToken to be locked
     * @param amount The amount of IdeaTokens to lock
     * @param duration The duration in seconds to lock the tokens
     * @param recipient The account which receives the locked tokens 
     */
    function lock(address ideaToken, uint amount, uint duration, address recipient) external override {
        require(duration > 0, "lockTokens: invalid duration");
        require(_ideaTokenFactory.getTokenIDPair(ideaToken).exists, "lockTokens: invalid IdeaToken");
        require(amount > 0, "lockTokens: invalid amount");
        require(IERC20(ideaToken).allowance(msg.sender, address(this)) >= amount, "lockTokens: not enough allowance");
        require(IERC20(ideaToken).transferFrom(msg.sender, address(this), amount), "lockTokens: transfer failed");

        uint lockedUntil = now + duration;
        bytes32 location = getLLEntryStorageLocation(ideaToken, recipient, lockedUntil);

        LLEntry storage entry = getLLEntry(location);
        entry.amount = entry.amount.add(amount);

        // If an entry with this `until` does not already exist,
        // create a new one and add it the LL
        if(entry.until == 0) {
            entry.until = lockedUntil;
            entry.prev = bytes32(0);
            entry.next = _llHead[ideaToken][recipient];

            bytes32 currentHeadID = _llHead[ideaToken][recipient];
            if(currentHeadID != bytes32(0)) {
                // Set `prev` of the old head to the new entry
                LLEntry storage head = getLLEntry(currentHeadID);
                head.prev = location;
            } 

            _llHead[ideaToken][recipient] = location;
        }

        emit Locked(ideaToken, recipient, amount, lockedUntil, duration);
    }

    /**
     * Withdraws a given list of locked tokens
     *
     * @param ideaToken The IdeaToken to withdraw
     * @param untils List of timestamps until which tokens are locked
     * @param recipient The account which will receive the IdeaTokens
     */
    function withdraw(address ideaToken, uint[] calldata untils, address recipient) external override {

        uint ts = now;
        uint total = 0;

        for(uint i = 0; i < untils.length; i++) {
            uint until = untils[i];
            require(ts > until, "withdraw: too early");

            bytes32 location = getLLEntryStorageLocation(ideaToken, msg.sender, until);
            LLEntry storage entry = getLLEntry(location);

            require(entry.until > 0, "withdraw: invalid until");
            total = total.add(entry.amount);

            if(entry.next != bytes32(0)) {
                // Set `prev` of the next entry
                LLEntry storage next = getLLEntry(entry.next);
                next.prev = entry.prev;
            }

            if(entry.prev != bytes32(0)) {
                // Set `next` of the prev entry
                LLEntry storage prev = getLLEntry(entry.prev);
                prev.next = entry.next;
            } else {
                // This was the first entry in the LL
                // Update the head to the next entry
                // If this was also the only entry in the list
                // head will be set to 0
                _llHead[ideaToken][msg.sender] = entry.next;
            }

            // Reset storage to 0
            clearEntry(entry);
        }

        if(total > 0) {
            require(IERC20(ideaToken).transfer(recipient, total), "withdraw: transfer failed");
        }
    }

    /**
     * Returns all locked entries up to `maxEntries` for `user`
     *
     * @param ideaToken The IdeaToken for which to return the locked entries
     * @param user The user for which to return the locked entries
     * @param maxEntries The maximum amount of entries to return
     *
     * @return All locked entries up to `maxEntries` for `user`
     */
    function getLockedEntries(address ideaToken, address user, uint maxEntries) external view override returns (LockedEntry[] memory) {
        // Calculate the required size of the returned array
        bytes32 next = _llHead[ideaToken][user];
        uint len = 0;
        while(next != bytes32(0) && len < maxEntries) {
            len += 1;
            LLEntry storage entry = getLLEntry(next);
            next = entry.next;
        }

        if(len == 0) {
            LockedEntry[] memory empty;
            return empty;
        }

        LockedEntry[] memory ret = new LockedEntry[](len);

        uint index = 0;
        next = _llHead[ideaToken][user];
        while(next != bytes32(0) && len < maxEntries) {
            LLEntry storage entry = getLLEntry(next);
            
            ret[index] = LockedEntry({lockedUntil: entry.until, lockedAmount: entry.amount});

            index++;
            next = entry.next;
        }

        return ret;
    }

    function clearEntry(LLEntry storage entry) internal {
        entry.until = 0;
        entry.amount = 0;
        entry.prev = bytes32(0);
        entry.next = bytes32(0);
    }

    function getLLEntryStorageLocation(address ideaToken, address owner, uint until) internal pure returns (bytes32) {
        return keccak256(abi.encode(ideaToken, owner, until));
    }

    function getLLEntry(bytes32 location) internal pure returns (LLEntry storage) {
        LLEntry storage entry;
        assembly { entry_slot := location }
        return entry;
    } 
}
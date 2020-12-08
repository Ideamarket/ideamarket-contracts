// SPDX-License-Identifier: MIT
pragma solidity ^0.6.9;
pragma experimental ABIEncoderV2;

import "./interfaces/IIdeaTokenVault.sol";
import "./interfaces/IIdeaTokenFactory.sol";
import "../util/Ownable.sol";
import "../util/Initializable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";


/*
    ========================================== TODO =========================================
    * Update deployment script
    * Update Subgraph binary search
    * Update frontend new calls (different param ordering)
*/


/**
 * @title IdeaTokenVault
 * @author Alexander Schlindwein
 *
 * Locks IdeaTokens for 365 days
 * Sits behind an AdminUpgradabilityProxy
 */
contract IdeaTokenVault is IIdeaTokenVault, Initializable, Ownable {
    using SafeMath for uint256;

    IIdeaTokenFactory _ideaTokenFactory;

    mapping(uint => bool) public _allowedDurations;
    uint[] public _allowedDurationsList;

    // IdeaToken => owner => => duration => locked amounts
    mapping(address => mapping(address => mapping(uint => LockedEntry[]))) _lockedEntries;
    // IdeaToken => owner => duration => list head index
    mapping(address => mapping(address => mapping(uint => uint))) _listHead;

    event Locked(address ideaToken, address owner, uint lockedAmount, uint lockedUntil, uint lockedDuration, uint index);
    event Withdrawn(address ideaToken, address owner, uint lockedDuration, uint index);

    /**
     * Initializes the contract
     *
     * @param owner The owner of the contract
     * @param ideaTokenFactory The address of the IdeaTokenFactory contract
     */
    function initialize(address owner, address ideaTokenFactory) external initializer {
        setOwnerInternal(owner);
        _ideaTokenFactory = IIdeaTokenFactory(ideaTokenFactory);

        _allowedDurations[31556952] = true; // 1 year
        _allowedDurationsList.push(31556952);
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
        require(_allowedDurations[duration], "lockTokens: invalid duration");
        require(_ideaTokenFactory.getTokenIDPair(ideaToken).exists, "lockTokens: invalid IdeaToken");
        require(amount > 0, "lockTokens: invalid amount");
        require(IERC20(ideaToken).allowance(msg.sender, address(this)) >= amount, "lockTokens: not enough allowance");
        require(IERC20(ideaToken).transferFrom(msg.sender, address(this), amount), "lockTokens: transfer failed");

        uint lockedUntil = now + duration;
        LockedEntry memory newEntry = LockedEntry({lockedUntil: lockedUntil, lockedAmount: amount});
        _lockedEntries[ideaToken][recipient][duration].push(newEntry);

        emit Locked(ideaToken, recipient, amount, lockedUntil, duration, _lockedEntries[ideaToken][recipient][duration].length - 1);
    }

    /**
     * Withdraws all available IdeaTokens for a given account
     *
     * @param ideaToken The IdeaToken to withdraw
     * @param recipient The account which will receive the IdeaTokens
     */
    function withdraw(address ideaToken, address recipient) external override {
        withdrawMaxEntries(ideaToken, recipient, uint(-1));
    }

    /**
     * Same as `withdraw`, but is limited to a maximum amount of entries.
     *
     * @param ideaToken The IdeaToken to withdraw
     * @param recipient The account which will receive the IdeaTokens
     * @param maxEntries The maximum amount of entries to iterate over before exiting early
     */
    function withdrawMaxEntries(address ideaToken, address recipient, uint maxEntries) public override {
       
        uint ts = now;
        uint counter = 0;
        uint total = 0;
        address user = msg.sender;

        for(uint i = 0; i < _allowedDurationsList.length; i++) {
            uint duration = _allowedDurationsList[i];
            LockedEntry[] storage entries = _lockedEntries[ideaToken][user][duration];
            uint head = _listHead[ideaToken][user][duration];
            uint newHead = head;

            for(uint j = head; j < entries.length && counter < maxEntries; j++) {
                if(entries[j].lockedUntil >= ts) {
                    break;
                }

                counter++;
                newHead++;
                total = total.add(entries[j].lockedAmount);

                delete entries[j];
                emit Withdrawn(ideaToken, user, duration, j);
            } 

            _listHead[ideaToken][user][duration] = newHead;

            
            if(counter >= maxEntries) {
                break;
            }
        }

        if(total > 0) {
            IERC20(ideaToken).transfer(recipient, total);
        }
    }

    /**
     * Returns the amount of locked IdeaTokens for a given account.
     * Includes withdrawable tokens
     *
     * @param ideaToken The address of the IdeaToken
     * @param owner The holder account
     *
     * @return The amount of IdeaTokens held for this account
     */
    function getTotalAmount(address ideaToken, address owner) external view override returns (uint) {

        uint total = 0;
        for(uint i = 0; i < _allowedDurationsList.length; i++) {
            uint duration = _allowedDurationsList[i];
            uint head = _listHead[ideaToken][owner][duration];
            LockedEntry[] storage entries = _lockedEntries[ideaToken][owner][duration];
            
            for(uint j = head; j < entries.length; j++) {
                total = total.add(entries[j].lockedAmount);
            }
        }

        return total;
    }

    /**
     * Returns the amount of withdrawable IdeaTokens for a given account
     *
     * @param ideaToken The address of the IdeaToken
     * @param owner The holder account
     *
     * @return The amount of withdrawable IdeaTokens for this account
     */
    function getWithdrawableAmount(address ideaToken, address owner) external view override returns (uint) {
        uint ts = now;
        uint total = 0;
        for(uint i = 0; i < _allowedDurationsList.length; i++) {
            uint duration = _allowedDurationsList[i];
            uint head = _listHead[ideaToken][owner][duration];
            LockedEntry[] storage entries = _lockedEntries[ideaToken][owner][duration];

            for(uint j = head; j < entries.length; j++) {
                if(entries[j].lockedUntil >= ts) {
                    break;
                }
                
                total = total.add(entries[j].lockedAmount);
            }
        }

        return total;
    }

    /**
     * Returns the available LockedEntries for an account
     *
     * @param ideaToken The address of the IdeaToken
     * @param owner The holder account
     *
     * @return The available LockedEntries for this account
     */
    function getLockedEntries(address ideaToken, address owner) external view override returns (LockedEntry[] memory) {

        uint len = 0;
        for(uint i = 0; i < _allowedDurationsList.length; i++) {
            uint duration = _allowedDurationsList[i];
            uint head = _listHead[ideaToken][owner][duration];
            LockedEntry[] storage entries = _lockedEntries[ideaToken][owner][duration];
            len += entries.length - head;
        }

        if(len == 0) {
            LockedEntry[] memory empty;
            return empty;
        }

        LockedEntry[] memory ret = new LockedEntry[](len);
        uint index = 0;
        for(uint i = 0; i < _allowedDurationsList.length; i++) {
            uint duration = _allowedDurationsList[i];
            uint head = _listHead[ideaToken][owner][duration];
            LockedEntry[] storage entries = _lockedEntries[ideaToken][owner][duration];

            for(uint j = head; j < entries.length; j++) {
                ret[index] = entries[j];
                index++;
            }
        }

        return ret;
    }

    /**
     * Adds an allowed duration
     * May only be called by the owner
     *
     * @param duration The duration to add 
     */
    function addAllowedDuration(uint duration) external override onlyOwner {
        require(!_allowedDurations[duration], "addAllowedDuration: already set");
        require(duration > 0, "addAllowedDuration: invalid duration");

        _allowedDurations[duration] = true;
        _allowedDurationsList.push(duration);
    }
}
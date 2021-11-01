// SPDX-License-Identifier: GPL-3.0-or-later

// Inspired by Fei's LinearTokenTimelock
// https://github.com/fei-protocol/fei-protocol-core/blob/master/contracts/utils/LinearTokenTimelock.sol
// 
// Modified to allow start vesting in the future, to enable fully locking for
// a duration (from now to start time) and then vesting from start time to end time

pragma solidity 0.6.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

/**
 * @title TokenVesting
 * @author Alexander Schlindwein
 *
 * Vests an ERC20 token for `duration` seconds and unlocks to the `beneficiary` address.
 * The vesting `startTime` can be set in the future, which fully locks the tokens
 * until vesting begins.
 *
 * This contract is only designed to be compatible with standard ERC20 tokens.
 * Token contracts which implement transfer hooks, transfer fees, or similar features might be
 * unsafe to use with this contract.
 */
contract TokenVesting {

    using SafeMath for uint;

    address public _beneficiary;
    address public _lockedToken;
    address public _pendingBeneficiary;
    uint public _startTime;
    uint public _duration;
    uint public _initialBalance;
    uint internal _lastBalance;

    event Release(address indexed beneficiary, address indexed recipient, uint amount);
    event BeneficiaryUpdate(address indexed beneficiary);
    event PendingBeneficiaryUpdate(address indexed pendingBeneficiary);

    /**
     * Initializes the contract
     *
     * @param beneficiary The recipient of the tokens when unlocked
     * @param startTime The timestamp when vesting begins. If 0, the current block timestamp is used.
     * @param duration The duration in seconds to vest the tokens
     * @param lockedToken The address of the vested token
     */
    constructor(address beneficiary, uint startTime, uint duration, address lockedToken) public {
        require(beneficiary != address(0), "invalid-beneficiary");
        require(duration != 0, "invalid-duration");
        require(lockedToken != address(0), "invalid-lockedToken");

        _beneficiary = beneficiary;
        _startTime = startTime == 0 ? now : startTime;
        _duration = duration;
        _lockedToken = lockedToken;
    }

    // Prevents incoming tokens from messing up calculations
    modifier balanceCheck() {
        if (totalToken() > _lastBalance) {
            uint delta = totalToken() - _lastBalance;
            _initialBalance = _initialBalance.add(delta);
        }
        _;
        _lastBalance = totalToken();
    }

    modifier onlyBeneficiary() {
        require(msg.sender == _beneficiary, "only-beneficiary");
        _;
    }

    /**
     * Deposits `amount` `_lockedToken`s from `msg.sender` into this contract
     *
     * Note that it is of course possible to directly send tokens to this contract
     * without calling the `deposit` method. That is safe, however it might break
     * some frontend implementations when calling `availableForRelease()`
     * or `alreadyReleasedAmount()` since `_initialBalance` has not been updated properly
     * until the next `release()` or `releaseMax()`.
     *
     * @param amount The amount of tokens to deposit
     */
    function deposit(uint amount) external balanceCheck {
        require(IERC20(_lockedToken).transferFrom(msg.sender, address(this), amount), "transfer-failed");
        _initialBalance = _initialBalance.add(amount);
    }

    /**
     * Releases `amount` tokens to address `to`.
     * May only be called by the `beneficiary`.
     *
     * @param to Where to send the tokens
     * @param amount The amount of tokens to release
     */
    function release(address to, uint amount) external onlyBeneficiary balanceCheck {
        require(amount != 0, "amount-0");

        uint available = availableForRelease();
        require(amount <= available, "not-enough-released");

        _release(to, amount);
    }

    /**
     * Releases all available tokens to address `to`.
     * May only be called by the `beneficiary`.
     *
     * @param to Where to send the tokens
     */
    function releaseMax(address to) external onlyBeneficiary balanceCheck {
        _release(to, availableForRelease());
    }

    /**
     * Returns the token balance in this contract.
     *
     * @return The token balance in this contract.
     */
    function totalToken() public view virtual returns (uint) {
        return IERC20(_lockedToken).balanceOf(address(this));
    }

    /**
     * Returns the amount of tokens which has already been released.
     *
     * @return The amount of tokens which has already been released.
     */
    function alreadyReleasedAmount() public view returns (uint) {
        return _initialBalance.sub(totalToken());
    }

    /**
     * Returns the amount of tokens which is available to be released.
     *
     * @return The amount of tokens which is available to be released.
     */
    function availableForRelease() public view returns (uint) {
        uint elapsed = timeSinceStart();
        if(elapsed == 0) {
            return 0;
        }
        uint duration = _duration;

        uint totalAvailable = _initialBalance.mul(elapsed).div(duration);
        uint netAvailable = totalAvailable.sub(alreadyReleasedAmount());
        return netAvailable;
    }

    /**
     * Sets `pendingBeneficiary` as pending beneficiary.
     * May only be called by the current `beneficiary`.
     *
     * @param pendingBeneficiary The address of the pending beneficiary.
     */
    function setPendingBeneficiary(address pendingBeneficiary) external onlyBeneficiary {
        _pendingBeneficiary = pendingBeneficiary;
        emit PendingBeneficiaryUpdate(_pendingBeneficiary);
    }

    /**
     * Accepts the `pendingBeneficiary`.
     * May only be called by the `pendingBeneficiary`.
     */
    function acceptBeneficiary() external virtual {
        _setBeneficiary(msg.sender);
    }

    /**
     * Internal setter to set the `pendingBeneficiary` as `beneficiary`.
     *
     * @param newBeneficiary The new beneficiary.
     */
    function _setBeneficiary(address newBeneficiary) internal {
        require(newBeneficiary == _pendingBeneficiary, "not-allowed");

        _pendingBeneficiary = address(0);
        _beneficiary = newBeneficiary;

        emit BeneficiaryUpdate(newBeneficiary);
    }

    /**
     * Internal function to release `amount` tokens to address `to`.
     *
     * @param to The address where to send the released tokens.
     * @param amount The amount of tokens to send.
     */
    function _release(address to, uint amount) internal {
        if(amount == 0) {
            return;
        }

        require(IERC20(_lockedToken).transfer(to, amount), "transfer-failed");
        emit Release(_beneficiary, to, amount);
    }

    /**
     * Internal function which calculated the seconds passed since vesting start.
     * If the current time is before the `startTime`: return 0
     * If the current time is after the vesting end time (`startTime` + `duration`): return end time
     * Else return `now - startTime`.
     *
     * @return The seconds passed since vesting start
     */
    function timeSinceStart() public view returns (uint) {
        uint current = now;
        uint startTime = _startTime;
        if(current <= startTime) {
            return 0;
        }

        uint timePassed = current - startTime;
        uint duration = _duration;
        if(timePassed > _duration) {
            return duration;
        }
        return timePassed;
    }
}
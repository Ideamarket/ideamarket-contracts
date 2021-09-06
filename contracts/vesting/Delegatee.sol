// SPDX-License-Identifier: GPL-3.0-or-later

// Inspired by Fei's TimelockedDelegator
// https://github.com/fei-protocol/fei-protocol-core/blob/master/contracts/dao/TimelockedDelegator.sol

pragma solidity 0.6.9;

import "../util/Ownable.sol";
import "../erc20/IDelegateableERC20.sol";

/**
 * @title Delegatee
 * @author Alexander Schlindwein
 *
 * Proxy contract to receive voting power from vested tokens in `DelegateableTokenVesting`.
 */
contract Delegatee is Ownable {
    IDelegateableERC20 public _token;

    /**
     * Initializes the contract.
     *
     * @param delegatee The address to which to delegate the voting power.
     * @param token The governance token.
     */
    constructor(address delegatee, address token) public {
        setOwnerInternal(msg.sender);
        _token = IDelegateableERC20(token);
        _token.delegate(delegatee);
    }

    /**
     * Withdraws tokens back to the `DelegateableTokenVesting` contract and selfdestructs.
     * May only be called by `DelegateableTokenVesting`.
     */
    function withdraw() public onlyOwner {
        IDelegateableERC20 token = _token;
        uint balance = token.balanceOf(address(this));
        token.transfer(_owner, balance);
        selfdestruct(payable(_owner));
    }
}

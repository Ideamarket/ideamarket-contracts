// SPDX-License-Identifier: MIT
pragma solidity 0.6.9;

import "./ISource.sol";
import "../../util/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

/**
 * @title DrippingIMOSource
 * @author Alexander Schlindwein
 *
 * Source which continuously releases IMO
 * with a per-block rate. A rate of zero is allowed
 * (no payouts).
 */
contract DrippingIMOSource is ISource, Ownable {

    using SafeMath for uint;

    IERC20 public _imo;
    address public _target;
    uint public _rate;
    uint public _lastBlock;

    event RateChanged(uint rate);

    /**
     * Initializes the contract.
     *
     * @param imo The address of the IMO token.
     * @param target The address to receive the released IMO tokens.
     * @param rate The per-block rate. Zero is allowed.
     * @param owner The address of the owner.
     */
    constructor(address imo, address target, uint rate, address owner) public {
        require(imo != address(0), "invalid-imo");
        require(target != address(0), "invalid-target");

        setOwnerInternal(owner); // Checks owner to be non zero
        _imo = IERC20(imo);
        _target = target;
        _lastBlock = block.number;
        setRateInternal(rate);
    }

    /**
     * Releases IMO to the target address.
     * May be called by anyone.
     */
    function pull() public override {
        uint currentBlock = block.number;
        uint lastBlock = _lastBlock;
        if(currentBlock <= lastBlock) {
            return;
        }

        uint numBlocks = currentBlock - lastBlock;
        uint payout = numBlocks.mul(_rate);
        _lastBlock = currentBlock;
        if(payout == 0) {
            // When the rate is set to zero the payouts are disabled
            return;
        }

        IERC20 imo = _imo;
        uint balance = imo.balanceOf(address(this));

        if(balance == 0) {
            // The contract has paid out all funds.
            // We do not revert in this situation and simply
            // don't pay out anything.

            // When more funds are sent to this contract the
            // payouts will continue.
            return;
        }

        if(balance < payout) {
            // The contract has paid out almost all funds.
            // Send all remaining funds.
            payout = balance;
        }

        require(imo.transfer(_target, payout), "transfer-failed");
    }

    /**
     * Changes the per-block release rate.
     * May only be called by the owner.
     *
     * @param rate The per-block release rate to be set.
     */
    function setRate(uint rate) external onlyOwner {
        pull();
        setRateInternal(rate);
    }

    function setRateInternal(uint rate) internal {
        _rate = rate;
        emit RateChanged(rate);
    }
}
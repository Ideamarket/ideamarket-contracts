// SPDX-License-Identifier: MIT
pragma solidity 0.6.9;

import "../timelock/IDSPause.sol";

/**
 * @title SetTimelockDelaySpell
 * @author Alexander Schlindwein
 *
 * Spell to set the timelock delay
 */
contract SetTimelockDelaySpell {

    /**
     * Sets the timelock delay
     *
     * @param dsPause The address of the timelock
     * @param delay The new delay in seconds
     */
    function execute(address dsPause, uint delay) external {
        IDSPause(dsPause).setDelay(delay);
    }
}
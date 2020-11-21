// SPDX-License-Identifier: MIT
pragma solidity ^0.6.9;

import "../timelock/IDSPause.sol";

/**
 * @title SetTimelockAdminSpell
 * @author Alexander Schlindwein
 *
 * Spell to set the admin of the timelock
 */
contract SetTimelockAdminSpell {

    /**
     * Sets the timelock admin
     *
     * @param dsPause The address of the timelock
     * @param owner The address of the new admin
     */
    function execute(address dsPause, address owner) external {
        IDSPause(dsPause).setOwner(owner);
    }
}
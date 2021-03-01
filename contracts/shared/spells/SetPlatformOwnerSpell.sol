// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "../core/interfaces/IIdeaTokenExchange.sol";

/**
 * @title SetPlatformOwnerSpell
 * @author Alexander Schlindwein
 *
 * Spell to authorize a platform owner
 */
contract SetPlatformOwnerSpell {

    /**
     * Sets an address as owner of an Platform
     *
     * @param exchange The address of the IdeaTokenExchange
     * @param marketID The market id for which to authorize a platform fee withdrawer
     * @param owner The address of the owner
     */
    function execute(address exchange, uint marketID, address owner) external {
        IIdeaTokenExchange(exchange).setPlatformOwner(marketID, owner);
    }
}
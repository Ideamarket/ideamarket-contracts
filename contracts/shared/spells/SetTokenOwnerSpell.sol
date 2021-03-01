// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "../core/interfaces/IIdeaTokenExchange.sol";

/**
 * @title SetTokenOwnerSpell
 * @author Alexander Schlindwein
 *
 * Spell to authorize an IdeaToken owner
 */
contract SetTokenOwnerSpell {

    /**
     * Sets an address as owner of an IdeaToken
     *
     * @param exchange The address of the IdeaTokenExchange
     * @param ideaToken The address of the IdeaToken for which to authorize an interest withdrawer
     * @param owner The address of the owner
     */
    function execute(address exchange, address ideaToken, address owner) external {
        IIdeaTokenExchange(exchange).setTokenOwner(ideaToken, owner);
    }
}
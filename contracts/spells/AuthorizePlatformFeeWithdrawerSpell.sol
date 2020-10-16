// SPDX-License-Identifier: MIT
pragma solidity ^0.6.9;

import "../core/IIdeaTokenExchange.sol";

/**
 * @title AuthorizePlatformFeeWithdrawerSpell
 * @author Alexander Schlindwein
 *
 * @dev Spell to authorize an platform fee withdrawer
 */
contract AuthorizePlatformFeeWithdrawerSpell {

    /**
     * @dev Authorizes an address to withdraw the platform fee for a market
     *
     * @param exchange The address of the IdeaTokenExchange
     * @param marketID The market id for which to authorize a platform fee withdrawer
     * @param withdrawer The address of the withdrawer
     */
    function execute(address exchange, uint marketID, address withdrawer) external {
        IIdeaTokenExchange(exchange).authorizePlatformFeeWithdrawer(marketID, withdrawer);
    }
}
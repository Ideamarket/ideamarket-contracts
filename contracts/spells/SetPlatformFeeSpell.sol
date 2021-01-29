// SPDX-License-Identifier: MIT
pragma solidity 0.6.9;

import "../core/interfaces/IIdeaTokenFactory.sol";

/**
 * @title SetPlatformFeeSpell
 * @author Alexander Schlindwein
 *
 * Spell to set the platform fee for a market
 */
contract SetPlatformFeeSpell {

    /**
     * Sets the platform fee for a market
     *
     * @param factory The address of the IdeaTokenFactory
     * @param marketID The market for which to set the platform fee
     * @param platformFeeRate The platform fee
     */
    function execute(address factory, uint marketID, uint platformFeeRate) external {
        IIdeaTokenFactory(factory).setPlatformFee(marketID, platformFeeRate);
    }
}
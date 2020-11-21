// SPDX-License-Identifier: MIT
pragma solidity ^0.6.9;

import "../core/IIdeaTokenFactory.sol";

/**
 * @title AddMarketSpell
 * @author Alexander Schlindwein
 *
 * Spell to add a market
 */
contract AddMarketSpell {

    /**
     * Adds a market to the factory
     *
     * @param factory The address of the IdeaTokenFactory
     * @param marketName The name of the market
     * @param nameVerifier The address of the name verifier
     * @param baseCost The base cost
     * @param priceRise The price rise
     * @param tradingFeeRate The trading fee
     * @param platformFeeRate The platform fee
     */
    function execute(address factory, string calldata marketName, address nameVerifier,
                     uint baseCost, uint priceRise,
                     uint tradingFeeRate, uint platformFeeRate) external {

        IIdeaTokenFactory(factory).addMarket(marketName, nameVerifier,
                                              baseCost, priceRise,
                                              tradingFeeRate, platformFeeRate);
    }
}
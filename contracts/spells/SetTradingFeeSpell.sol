// SPDX-License-Identifier: MIT
pragma solidity ^0.6.9;

import "../core/interfaces/IIdeaTokenFactory.sol";

/**
 * @title SetTradingFeeSpell
 * @author Alexander Schlindwein
 *
 * Spell to set the trading fee for a market
 */
contract SetTradingFeeSpell {

    /**
     * Sets the trading fee for a market
     *
     * @param factory The address of the IdeaTokenFactory
     * @param marketID The market for which to set the trading fee
     * @param tradingFeeRate The trading fee
     */
    function execute(address factory, uint marketID, uint tradingFeeRate) external {
        IIdeaTokenFactory(factory).setTradingFee(marketID, tradingFeeRate);
    }
}
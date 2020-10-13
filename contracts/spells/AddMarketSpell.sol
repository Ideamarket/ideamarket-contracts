// SPDX-License-Identifier: MIT
pragma solidity ^0.6.9;

import "../core/IIdeaTokenFactory.sol";

contract AddMarketSpell {

    function execute(address factory, string calldata marketName, address nameVerifier,
                     uint baseCost, uint priceRise, uint tokensPerInterval,
                     uint tradingFeeRate, uint platformFeeRate) external {

        IIdeaTokenFactory(factory).addMarket(marketName, nameVerifier,
                                              baseCost, priceRise, tokensPerInterval,
                                              tradingFeeRate, platformFeeRate);
    }
}
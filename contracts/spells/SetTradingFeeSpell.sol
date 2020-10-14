// SPDX-License-Identifier: MIT
pragma solidity ^0.6.9;

import "../core/IIdeaTokenFactory.sol";

contract SetTradingFeeSpell {
    function execute(address factory, uint marketID, uint tradingFeeRate) external {
        IIdeaTokenFactory(factory).setTradingFee(marketID, tradingFeeRate);
    }
}
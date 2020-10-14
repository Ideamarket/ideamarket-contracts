// SPDX-License-Identifier: MIT
pragma solidity ^0.6.9;

import "../core/IIdeaTokenFactory.sol";

contract SetPlatformFeeSpell {
    function execute(address factory, uint marketID, uint platformFeeRate) external {
        IIdeaTokenFactory(factory).setPlatformFee(marketID, platformFeeRate);
    }
}
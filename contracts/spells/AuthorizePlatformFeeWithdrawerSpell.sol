// SPDX-License-Identifier: MIT
pragma solidity ^0.6.9;

import "../core/IIdeaTokenExchange.sol";

contract AuthorizePlatformFeeWithdrawerSpell {
    function execute(address exchange, uint marketID, address withdrawer) external {
        IIdeaTokenExchange(exchange).authorizePlatformFeeWithdrawer(marketID, withdrawer);
    }
}
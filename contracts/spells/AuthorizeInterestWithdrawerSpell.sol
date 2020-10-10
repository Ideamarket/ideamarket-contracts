// SPDX-License-Identifier: MIT
pragma solidity ^0.6.9;

import "../core/IIdeaTokenExchange.sol";

contract AuthorizeInterestWithdrawerSpell {
    function execute(address exchange, address ideaToken, address withdrawer) external {
        IIdeaTokenExchange(exchange).authorizeInterestWithdrawer(ideaToken, withdrawer);
    }
}
// SPDX-License-Identifier: MIT
pragma solidity ^0.6.9;

import "../timelock/IDSPause.sol";

contract SetTimelockAdminSpell {
    function execute(address dsPause, address owner) external {
        IDSPause(dsPause).setOwner(owner);
    }
}
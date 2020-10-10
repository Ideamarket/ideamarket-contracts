// SPDX-License-Identifier: MIT
pragma solidity ^0.6.9;

import "../timelock/IDSPause.sol";

contract SetTimelockDelaySpell {
    function execute(address dsPause, uint delay) external {
        IDSPause(dsPause).setDelay(delay);
    }
}
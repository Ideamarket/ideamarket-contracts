// SPDX-License-Identifier: MIT
pragma solidity 0.6.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IDelegateableERC20 is IERC20 {
    function delegate(address delegatee) external;
}
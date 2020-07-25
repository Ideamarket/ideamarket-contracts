// SPDX-License-Identifier: MIT
pragma solidity ^0.6.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

interface IIdeaToken is IERC20 {
    function mint(address account, uint256 amount) external;
    function burn(address account, uint256 amount) external;
}
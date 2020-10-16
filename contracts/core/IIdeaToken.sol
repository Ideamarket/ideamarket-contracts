// SPDX-License-Identifier: MIT
pragma solidity ^0.6.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title IIdeaToken
 * @author Alexander Schlindwein
 *
 * @dev Interface for IdeaTokens. Extends ERC20 with mint and burn.
 */
interface IIdeaToken is IERC20 {
    function mint(address account, uint256 amount) external;
    function burn(address account, uint256 amount) external;
}
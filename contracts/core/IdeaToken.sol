// SPDX-License-Identifier: MIT
pragma solidity ^0.6.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../util/Ownable.sol";

/**
 * @title IdeaToken
 * @author Alexander Schlindwein
 *
 * @dev Represents an ERC20 IdeaToken which can be burned and minted by the owner of the contract instance
 */
contract IdeaToken is ERC20, Ownable {

    /**
     * @dev Tokens are always created with 18 decimals
     * @param name The name of the token
     * @param symbol The symbol of the token
     */
    constructor (string memory _name, string memory _symbol) public ERC20(_name, _symbol) {}

    /**
     * @dev Mints a given amount of tokens to an address. May only be called by the owner
     * @param account The account to receive the minted tokens
     * @param amount The amount of tokens to mint
     */
    function mint(address account, uint256 amount) external onlyOwner {
        _mint(account, amount);
    }

    /**
     * @dev Burns a given amount of tokens from an address. May only be called by the owner
     * @param account The account for the tokens to be burned from
     * @param amount The amount of tokens to be burned
     */
    function burn(address account, uint256 amount) external onlyOwner {
        _burn(account, amount);
    }
}
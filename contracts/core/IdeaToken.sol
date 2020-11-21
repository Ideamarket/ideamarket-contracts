// SPDX-License-Identifier: MIT
pragma solidity ^0.6.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../util/Ownable.sol";
import "./IIdeaToken.sol";

/**
 * @title IdeaToken
 * @author Alexander Schlindwein
 *
 * IdeaTokens are implementations of the ERC20 interface
 * They can be burned and minted by the owner of the contract instance which is the IdeaTokenExchange
 */
contract IdeaToken is IIdeaToken, ERC20, Ownable {

    /**
     * Constructs an IdeaToken with 18 decimals
     * The constructor is called by the IdeaTokenFactory when a new token is listed
     * The owner of the contract is set to msg.sender
     *
     * @param _name The name of the token. IdeaTokenFactory will prefix the market name
     * @param _symbol The symbol of the token, as supplied by the IdeaTokenFactory
     */
    constructor (string memory _name, string memory _symbol) public ERC20(_name, _symbol) {
        setOwnerInternal(msg.sender);
    }

    /**
     * Mints a given amount of tokens to an address
     * May only be called by the owner
     *
     * @param account The address to receive the minted tokens
     * @param amount The amount of tokens to mint
     */
    function mint(address account, uint256 amount) external override onlyOwner {
        _mint(account, amount);
    }

    /**
     * Burns a given amount of tokens from an address.
     * May only be called by the owner
     *
     * @param account The address for the tokens to be burned from
     * @param amount The amount of tokens to be burned
     */
    function burn(address account, uint256 amount) external override onlyOwner {
        _burn(account, amount);
    }
}
// SPDX-License-Identifier: MIT
pragma solidity ^0.6.9;

import "../util/Ownable.sol";
import "./IdeaToken.sol";
import "./IIdeaTokenNameVerifier.sol";
import "@openzeppelin/upgrades/contracts/Initializable.sol";

/**
 * @title IdeaTokenFactory
 * @author Alexander Schlindwein
 *
 * @dev Manages the creation, exchange and interest distribution of IdeaTokens
 */
contract IdeaTokenFactory is Initializable, Ownable {

    /// @dev Stores information about a token
    struct TokenInfo {
        bool exists;
        uint id;
        string name;
        IdeaToken ideaToken;
    }

    /// @dev Stores information about a market
    struct MarketInfo {
        bool exists;
        uint id;
        string name;

        IIdeaTokenNameVerifier nameVerifier;
        mapping(uint => TokenInfo) tokens;
        mapping(string => uint) tokenIDs;
        uint numTokens;
    }

    mapping(uint => MarketInfo) public _markets;
    mapping(string => uint) public _marketIDs;
    uint public _numMarkets;

    /// @dev We want token names to be unique across markets, so we keep track of them in a seperate map
    mapping(string => bool) public tokenNameUsed;

    event NewMarket(uint id, string name);
    event NewToken(uint id, uint marketID, string name);

    /**
     * @dev Initializes the contract
     *
     * @param owner The owner of the contract
     */
    function initialize(address owner) external initializer {
        _owner = owner;
    }

    /**
     * @dev Adds a new market. May only be called by admin

     * @param marketName The name of the market
     * @param nameVerifier The address of the name verifier
     */
    function addMarket(string calldata marketName, address nameVerifier) external onlyOwner {
        require(_marketIDs[marketName] == 0, "addMarket: market exists already");

        uint marketID = ++_numMarkets;
        MarketInfo memory marketInfo = MarketInfo({
            exists: true,
            id: marketID,
            name: marketName,
            nameVerifier: IIdeaTokenNameVerifier(nameVerifier),
            numTokens: 0
        });

        _markets[marketID] = marketInfo;
        _marketIDs[marketName] = marketID;

        emit NewMarket(marketID, marketName);
    }

    /**
     * @dev Adds a new token.

     * @param tokenName The name of the token
     * @param marketID The ID of the market
     */
    function addToken(string calldata tokenName, uint marketID) external {
        MarketInfo storage marketInfo = _markets[marketID];
        require(marketInfo.exists, "addToken: market does not exist");
        require(!tokenNameUsed[tokenName], "addToken: token exists already");
        require(marketInfo.nameVerifier.verifyTokenName(tokenName), "addToken: name verification failed");

        IdeaToken ideaToken = new IdeaToken("tokenName", "IDT");

        uint tokenID = ++marketInfo.numTokens;
        TokenInfo memory tokenInfo = TokenInfo({
            exists: true,
            id: tokenID,
            name: tokenName,
            ideaToken: ideaToken
        });

        marketInfo.tokens[tokenID] = tokenInfo;
        marketInfo.tokenIDs[tokenName] = tokenID;
        tokenNameUsed[tokenName] = true;



        emit NewToken(tokenID, marketID, tokenName);
    }



}
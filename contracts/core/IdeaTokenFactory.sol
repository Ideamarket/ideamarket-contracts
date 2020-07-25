// SPDX-License-Identifier: MIT
pragma solidity ^0.6.9;
pragma experimental ABIEncoderV2;

import "../util/Ownable.sol";
import "./IdeaToken.sol";
import "./IIdeaToken.sol";
import "./IIdeaTokenNameVerifier.sol";
import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

/**
 * @title IdeaTokenFactory
 * @author Alexander Schlindwein
 *
 * @dev Manages the creation, exchange and interest distribution of IdeaTokens. Sits behind a proxy
 */
contract IdeaTokenFactory is Initializable, Ownable {

    using SafeMath for uint256;

    /// @dev Stores information about a token
    struct TokenInfo {
        bool exists;
        uint id;
        string name;
        IIdeaToken ideaToken;
    }

    struct MarketDetails {
        bool exists;
        uint id;
        string name;

        IIdeaTokenNameVerifier nameVerifier;
        uint numTokens;

        uint baseCost;
        uint priceRise;
        uint tokensPerInterval;
    }

    /// @dev Stores information about a market
    struct MarketInfo {
        mapping(uint => TokenInfo) tokens;
        mapping(string => uint) tokenIDs;

        MarketDetails marketDetails;
    }

    address _ideaTokenExchange;

    mapping(uint => MarketInfo) _markets;
    mapping(string => uint) _marketIDs;
    uint _numMarkets;

    /// @dev We want token names to be unique across markets, so we keep track of them in a seperate map
    mapping(string => bool) tokenNameUsed;

    event NewMarket(uint id, string name);
    event NewToken(uint id, uint marketID, string name);

    /**
     * @dev Initializes the contract
     *
     * @param owner The owner of the contract
     */
    function initialize(address owner, address ideaTokenExchange) external initializer {
        setOwnerInternal(owner);
        _ideaTokenExchange = ideaTokenExchange;
    }

    /**
     * @dev Adds a new market. May only be called by admin

     * @param marketName The name of the market
     * @param nameVerifier The address of the name verifier
     * @param baseCost: The initial cost in Dai per IdeaToken in the first interval
     * @param priceRise: The price rise in Dai per IdeaToken per completed interval
     * @param tokensPerInterval: The amount of IdeaTokens in each interval
     */
    function addMarket(string calldata marketName, address nameVerifier,
                       uint baseCost, uint priceRise, uint tokensPerInterval) external onlyOwner {
        require(_marketIDs[marketName] == 0, "addMarket: market exists already");
        require(baseCost > 0 && priceRise > 0 && tokensPerInterval > 0, "addMarket: invalid parameters");

        uint marketID = ++_numMarkets;
        MarketInfo memory marketInfo = MarketInfo({
            marketDetails: MarketDetails({
                exists: true,
                id: marketID,
                name: marketName,
                nameVerifier: IIdeaTokenNameVerifier(nameVerifier),
                numTokens: 0,
                baseCost: baseCost,
                priceRise: priceRise,
                tokensPerInterval: tokensPerInterval
            })
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
        require(marketInfo.marketDetails.exists, "addToken: market does not exist");
        require(isValidTokenName(tokenName, marketID), "addToken: name verification failed");

        address ideaTokenAddress = address(new IdeaToken(tokenName, "IDT"));
        IIdeaToken ideaToken = IIdeaToken(ideaTokenAddress);
        Ownable(ideaTokenAddress).setOwner(_ideaTokenExchange);

        uint tokenID = ++marketInfo.marketDetails.numTokens;
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

    function isValidTokenName(string calldata tokenName, uint marketID) public view returns (bool) {

        MarketDetails storage marketDetails = _markets[marketID].marketDetails;

        if(tokenNameUsed[tokenName] || !marketDetails.nameVerifier.verifyTokenName(tokenName)) {
            return false;
        }

        return true;
    }

    function getMarketDetailsById(uint marketID) external view returns (MarketDetails memory) {
        return _markets[marketID].marketDetails;
    }

    function getMarketDetailsByName(string calldata marketName) external view returns (MarketDetails memory) {
        return _markets[_marketIDs[marketName]].marketDetails;
    }

    function getNumMarkets() external view returns (uint) {
        return _numMarkets;
    }

    function getTokenInfo(uint marketID, uint tokenID) external view returns (TokenInfo memory) {
        return _markets[marketID].tokens[tokenID];
    }
}
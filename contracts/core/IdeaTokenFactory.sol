// SPDX-License-Identifier: MIT
pragma solidity ^0.6.9;
pragma experimental ABIEncoderV2;

import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "../util/Ownable.sol";
import "./IIdeaTokenFactory.sol";
import "./IdeaToken.sol";
import "./IIdeaToken.sol";
import "./nameVerifiers/IIdeaTokenNameVerifier.sol";

/**
 * @title IdeaTokenFactory
 * @author Alexander Schlindwein
 *
 * @dev Manages the creation, exchange and interest distribution of IdeaTokens. Sits behind a proxy
 */
contract IdeaTokenFactory is IIdeaTokenFactory, Initializable, Ownable {

    using SafeMath for uint256;

    struct MarketInfo {
        mapping(uint => TokenInfo) tokens;
        mapping(string => uint) tokenIDs;

        MarketDetails marketDetails;
    }

    address _ideaTokenExchange;

    mapping(address => IDPair) _tokenIDPairs;

    mapping(uint => MarketInfo) _markets;
    mapping(string => uint) _marketIDs;
    uint _numMarkets;

    /// @dev We want token names to be unique across markets, so we keep track of them in a seperate map
    mapping(string => bool) _tokenNameUsed;

    event NewMarket(uint id, string name);
    event NewToken(uint id, uint marketID, string name, address addr);

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
     * @param tradingFeeRate: The trading fee rate
     * @param tradingFeeRateScale: The scale by which the trading fee is scaled
     */
    function addMarket(string calldata marketName, address nameVerifier,
                       uint baseCost, uint priceRise, uint tokensPerInterval,
                       uint tradingFeeRate, uint tradingFeeRateScale) external override onlyOwner {
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
                tokensPerInterval: tokensPerInterval,
                tradingFeeRate: tradingFeeRate,
                tradingFeeRateScale: tradingFeeRateScale
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
    function addToken(string calldata tokenName, uint marketID) external override {
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
        _tokenNameUsed[tokenName] = true;
        _tokenIDPairs[address(ideaToken)] = IDPair({
            exists: true,
            marketID: marketID,
            tokenID: tokenID
        });

        emit NewToken(tokenID, marketID, tokenName, address(ideaToken));
    }

    /**
     * @dev Checks whether a token name is allowed and not used already
     *
     * @param tokenName The intended token name
     * @param marketID The market on which the token is to be listed
     *
     * @return True if the name is allowed, false otherwise
     */
    function isValidTokenName(string calldata tokenName, uint marketID) public view override returns (bool) {

        MarketDetails storage marketDetails = _markets[marketID].marketDetails;

        if(_tokenNameUsed[tokenName] || !marketDetails.nameVerifier.verifyTokenName(tokenName)) {
            return false;
        }

        return true;
    }

    /**
     * @dev Returns the market id by the market name
     *
     * @param marketName The market name
     *
     * @return The market id
     */
    function getMarketIDByName(string calldata marketName) external view override returns (uint) {
        return _marketIDs[marketName];
    }

    /**
     * @dev Returns the market details by the market id
     *
     * @param marketID The market id
     *
     * @return The market details
     */
    function getMarketDetailsByID(uint marketID) external view override returns (MarketDetails memory) {
        return _markets[marketID].marketDetails;
    }

    /**
     * @dev Returns the market details by the market name
     *
     * @param marketName The market name
     *
     * @return The market details
     */
    function getMarketDetailsByName(string calldata marketName) external view override returns (MarketDetails memory) {
        return _markets[_marketIDs[marketName]].marketDetails;
    }

    /**
     * @dev Returns the amount of existing markets
     *
     * @return The amount of existing markets
     */
    function getNumMarkets() external view override  returns (uint) {
        return _numMarkets;
    }

    /**
     * @dev Returns the token id by the token name and market id
     *
     * @param tokenName The token name
     * @param marketID The market id
     *
     * @return The token id
     */
    function getTokenIDByName(string calldata tokenName, uint marketID) external view override returns (uint) {
        return _markets[marketID].tokenIDs[tokenName];
    }

    /**
     * @dev Returns the token info by the token id and market id
     *
     * @param marketID The market id
     * @param tokenID The token id
     *
     * @return The token info
     */
    function getTokenInfo(uint marketID, uint tokenID) external view override returns (TokenInfo memory) {
        return _markets[marketID].tokens[tokenID];
    }

    /**
     * @dev Returns the token id pair by the tokens address
     *
     * @param token The tokens address
     *
     * @return The token id pair
     */
    function getTokenIDPair(address token) external view override returns (IDPair memory) {
        return _tokenIDPairs[token];
    }
}
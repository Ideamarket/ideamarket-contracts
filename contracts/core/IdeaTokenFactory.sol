// SPDX-License-Identifier: MIT
pragma solidity ^0.6.9;
pragma experimental ABIEncoderV2;

import "../util/Initializable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "../util/Ownable.sol";
import "./interfaces/IIdeaTokenFactory.sol";
import "./IdeaToken.sol";
import "./interfaces/IIdeaToken.sol";
import "./nameVerifiers/IIdeaTokenNameVerifier.sol";

/**
 * @title IdeaTokenFactory
 * @author Alexander Schlindwein
 *
 * Manages the creation of markets and IdeaTokens
 * Sits behind an AdminUpgradabilityProxy
 */
contract IdeaTokenFactory is IIdeaTokenFactory, Initializable, Ownable {

    using SafeMath for uint256;

    struct MarketInfo {
        mapping(uint => TokenInfo) tokens;
        mapping(string => uint) tokenIDs;
        mapping(string => bool) tokenNameUsed;

        MarketDetails marketDetails;
    }

    address _ideaTokenExchange;

    mapping(address => IDPair) _tokenIDPairs;

    mapping(uint => MarketInfo) _markets;
    mapping(string => uint) _marketIDs;
    uint _numMarkets;

    event NewMarket(uint id,
                    string name,
                    uint baseCost,
                    uint priceRise,
                    uint hatchTokens,
                    uint tradingFeeRate,
                    uint platformFeeRate,
                    address nameVerifier);

    event NewToken(uint id, uint marketID, string name, address addr);
    event NewTradingFee(uint marketID, uint tradingFeeRate);
    event NewPlatformFee(uint marketID, uint platformFeeRate);
    event NewNameVerifier(uint marketID, address nameVerifier);

    /**
     * Initializes the contract with all required values
     *
     * @param owner The owner of the contract
     */
    function initialize(address owner, address ideaTokenExchange) external initializer {
        setOwnerInternal(owner);
        _ideaTokenExchange = ideaTokenExchange;
    }

    /**
     * Adds a new market
     * May only be called by the owner
     *
     * @param marketName The name of the market
     * @param nameVerifier The address of the name verifier
     * @param baseCost: The initial cost in Dai per IdeaToken in the first interval
     * @param priceRise: The price rise in Dai per IdeaToken per completed interval
     * @param hatchTokens: The amount of IdeaTokens for which the price does not change initially
     * @param tradingFeeRate: The trading fee rate
     * @param platformFeeRate: The platform fee rate
     */
    function addMarket(string calldata marketName, address nameVerifier,
                       uint baseCost, uint priceRise, uint hatchTokens,
                       uint tradingFeeRate, uint platformFeeRate) external override onlyOwner {
        require(_marketIDs[marketName] == 0, "addMarket: market exists already");
        require(baseCost > 0 && priceRise > 0, "addMarket: invalid parameters");

        uint marketID = ++_numMarkets;

        { // Stack too deep
        MarketInfo memory marketInfo = MarketInfo({
            marketDetails: MarketDetails({
                exists: true,
                id: marketID,
                name: marketName,
                nameVerifier: IIdeaTokenNameVerifier(nameVerifier),
                numTokens: 0,
                baseCost: baseCost,
                priceRise: priceRise,
                hatchTokens: hatchTokens,
                tradingFeeRate: tradingFeeRate,
                platformFeeRate: platformFeeRate
            })
        });

        _markets[marketID] = marketInfo;
        _marketIDs[marketName] = marketID;
        }

        emit NewMarket(marketID,
                       marketName,
                       baseCost,
                       priceRise,
                       hatchTokens,
                       tradingFeeRate,
                       platformFeeRate,
                       nameVerifier);
    }

    /**
     * Adds a new IdeaToken 
     *
     * @param tokenName The name of the token
     * @param marketID The ID of the market
     */
    function addToken(string calldata tokenName, uint marketID) external override {
        MarketInfo storage marketInfo = _markets[marketID];
        require(marketInfo.marketDetails.exists, "addToken: market does not exist");
        require(isValidTokenName(tokenName, marketID), "addToken: name verification failed");

        address ideaTokenAddress = address(new IdeaToken(string(abi.encodePacked(marketInfo.marketDetails.name, ": ", tokenName)), "IDT"));
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
        marketInfo.tokenNameUsed[tokenName] = true;
        _tokenIDPairs[address(ideaToken)] = IDPair({
            exists: true,
            marketID: marketID,
            tokenID: tokenID
        });

        emit NewToken(tokenID, marketID, tokenName, address(ideaToken));
    }

    /**
     * Checks whether a token name is allowed and not used already
     *
     * @param tokenName The intended token name
     * @param marketID The market on which the token is to be listed
     *
     * @return True if the name is allowed, false otherwise
     */
    function isValidTokenName(string calldata tokenName, uint marketID) public view override returns (bool) {

        MarketInfo storage marketInfo = _markets[marketID];
        MarketDetails storage marketDetails = marketInfo.marketDetails;

        if(marketInfo.tokenNameUsed[tokenName] || !marketDetails.nameVerifier.verifyTokenName(tokenName)) {
            return false;
        }

        return true;
    }

    /**
     * Returns the market id by the market name
     *
     * @param marketName The market name
     *
     * @return The market id
     */
    function getMarketIDByName(string calldata marketName) external view override returns (uint) {
        return _marketIDs[marketName];
    }

    /**
     * Returns the market details by the market id
     *
     * @param marketID The market id
     *
     * @return The market details
     */
    function getMarketDetailsByID(uint marketID) external view override returns (MarketDetails memory) {
        return _markets[marketID].marketDetails;
    }

    /**
     * Returns the market details by the market name
     *
     * @param marketName The market name
     *
     * @return The market details
     */
    function getMarketDetailsByName(string calldata marketName) external view override returns (MarketDetails memory) {
        return _markets[_marketIDs[marketName]].marketDetails;
    }

    /**
     * Returns the amount of existing markets
     *
     * @return The amount of existing markets
     */
    function getNumMarkets() external view override  returns (uint) {
        return _numMarkets;
    }

    /**
     * Returns the token id by the token name and market id
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
     * Returns the token info by the token id and market id
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
     * Returns the token id pair by the tokens address
     *
     * @param token The tokens address
     *
     * @return The token id pair
     */
    function getTokenIDPair(address token) external view override returns (IDPair memory) {
        return _tokenIDPairs[token];
    }

    /**
     * Sets the trading fee for a market
     * May only be called by the owner
     *
     * @param marketID The market id for which to set the trading fee
     * @param tradingFeeRate The trading fee
     */
    function setTradingFee(uint marketID, uint tradingFeeRate) external override onlyOwner {
        MarketDetails storage marketDetails = _markets[marketID].marketDetails;
        require(marketDetails.exists, "setTradingFee: market does not exist");
        marketDetails.tradingFeeRate = tradingFeeRate;
        
        emit NewTradingFee(marketID, tradingFeeRate);
    }

    /**
     * Sets the platform fee for a market
     * May only be called by the owner
     *
     * @param marketID The market id for which to set the platform fee
     * @param platformFeeRate The platform fee
     */
    function setPlatformFee(uint marketID, uint platformFeeRate) external override onlyOwner {
        MarketDetails storage marketDetails = _markets[marketID].marketDetails;
        require(marketDetails.exists, "setPlatformFee: market does not exist");
        marketDetails.platformFeeRate = platformFeeRate;

        emit NewPlatformFee(marketID, platformFeeRate);
    }

    /**
     * Changes the address of the name verifier for a market
     * May only be called by the owner
     *
     * @param marketID The marketID for which to change the name verifier
     * @param nameVerifier The new name verifier address
     */
    function setNameVerifier(uint marketID, address nameVerifier) external override onlyOwner {
        MarketDetails storage marketDetails = _markets[marketID].marketDetails;
        require(marketDetails.exists, "setNameVerifier: market does not exist");
        marketDetails.nameVerifier = IIdeaTokenNameVerifier(nameVerifier);

        emit NewNameVerifier(marketID, nameVerifier);
    }
}
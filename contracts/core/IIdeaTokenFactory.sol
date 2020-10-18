// SPDX-License-Identifier: MIT
pragma solidity ^0.6.9;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./IIdeaToken.sol";
import "./nameVerifiers/IIdeaTokenNameVerifier.sol";

/**
 * @title IIdeaTokenFactory
 * @author Alexander Schlindwein
 *
 * @dev Interface for IdeaTokenFactory
 */
interface IIdeaTokenFactory {

    struct IDPair {
        bool exists;
        uint marketID;
        uint tokenID;
    }

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
        uint tradingFeeRate;
        uint platformFeeRate;
    }

    function addMarket(string calldata marketName, address nameVerifier,
                       uint baseCost, uint priceRise,
                       uint tradingFeeRate, uint platformFeeRate) external;

    function addToken(string calldata tokenName, uint marketID) external;

    function isValidTokenName(string calldata tokenName, uint marketID) external view returns (bool);
    function getMarketIDByName(string calldata marketName) external view returns (uint);
    function getMarketDetailsByID(uint marketID) external view returns (MarketDetails memory);
    function getMarketDetailsByName(string calldata marketName) external view returns (MarketDetails memory);
    function getNumMarkets() external view returns (uint);
    function getTokenIDByName(string calldata tokenName, uint marketID) external view returns (uint);
    function getTokenInfo(uint marketID, uint tokenID) external view returns (TokenInfo memory);
    function getTokenIDPair(address token) external view returns (IDPair memory);
    function setTradingFee(uint marketID, uint tradingFeeRate) external;
    function setPlatformFee(uint marketID, uint platformFeeRate) external;
}
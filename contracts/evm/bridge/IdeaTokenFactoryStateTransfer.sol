// SPDX-License-Identifier: MIT
// @unsupported: ovm
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "../core/IdeaTokenFactory.sol"; 

/**
 * @title IdeaTokenFactoryStateTransfer
 * @author Alexander Schlindwein
 *
 * Replaces the L1 IdeaTokenFactory logic for the state transfer to Optimism L2.
 * 
 * This implementation will disable all state-altering methods.
 */
contract IdeaTokenFactoryStateTransfer is IdeaTokenFactory {

    // --- Disabled functions ---
    function addMarket(string calldata marketName, address nameVerifier,
                       uint baseCost, uint priceRise, uint hatchTokens,
                       uint tradingFeeRate, uint platformFeeRate, bool allInterestToPlatform) external override onlyOwner {
    
        marketName;
        nameVerifier;
        baseCost;
        priceRise;
        hatchTokens;
        tradingFeeRate;
        platformFeeRate;
        allInterestToPlatform;

        revert("state-transfer");
    }

    function addToken(string calldata tokenName, uint marketID, address lister) external override {
        tokenName;
        marketID;
        lister;

        revert("state-transfer");
    }
}
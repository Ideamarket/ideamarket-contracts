// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "../core/IdeaTokenFactoryOVM.sol";

contract IdeaTokenFactoryStateTransferOVM is IdeaTokenFactoryOVM {
    
    function addToken(string calldata tokenName, uint marketID, address lister) external override onlyBridge {
        MarketInfo storage marketInfo = _markets[marketID];
        require(marketInfo.marketDetails.exists, "market-not-exist");
        require(isValidTokenName(tokenName, marketID), "invalid-name");

        IIdeaToken ideaToken = IIdeaToken(address(new MinimalProxy(_ideaTokenLogic)));
        ideaToken.initialize(string(abi.encodePacked(marketInfo.marketDetails.name, ": ", tokenName)), _ideaTokenExchange);

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

        emit NewToken(tokenID, marketID, tokenName, address(ideaToken), lister);
    }
}
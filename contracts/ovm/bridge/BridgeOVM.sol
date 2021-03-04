// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "./IIdeaTokenExchangeStateTransferOVM.sol";
import "../../shared/core/interfaces/IIdeaTokenFactory.sol";
import "../../shared/bridge/IBridgeOVM.sol";
import "../../shared/util/Ownable.sol";

contract BridgeOVM is Ownable, IBridgeOVM {

    struct TMPTokenInfo {
        uint tokenID;
        string name;
        uint supply;
        uint dai;
        uint invested;
        bool set;
    }

    address public _l1Exchange;
    IIdeaTokenExchangeStateTransferOVM public _l2Exchange;
    IIdeaTokenFactory public _l2Factory;

    mapping(uint => TMPTokenInfo[]) public _tmpTokenInfos;

    modifier onlyL1Exchange() {
        address L1ORIGIN = msg.sender; // ----------------- TODO! This is not officially documented yet
        require(L1ORIGIN == _l1Exchange, "only-l1-exchange");
        _;
    } 

    constructor(address l1Exchange) public {
        require(l1Exchange != address(0), "invalid-args");
        setOwnerInternal(msg.sender);
        _l1Exchange = l1Exchange;
    }

    function receiveExchangeStaticVars(uint tradingFeeInvested) external override onlyL1Exchange {
        // TODO: Only allow once?
        _l2Exchange.setStaticVars(tradingFeeInvested);
    }

    function receiveExchangePlatformVars(uint marketID, uint dai, uint invested, uint platformFeeInvested) external override onlyL1Exchange {
        // TODO: Only allow once?
        _l2Exchange.setPlatformVars(marketID, dai, invested, platformFeeInvested);
    }

    function receiveExchangeTokenVars(uint marketID,
                                      uint[] calldata tokenIDs,
                                      string[] calldata names,
                                      uint[] calldata supplies,
                                      uint[] calldata dais,
                                      uint[] calldata investeds) external override onlyL1Exchange {
        uint length = tokenIDs.length;
        require(length > 0, "length-0");
        require(length == names.length && length == dais.length && length == investeds.length && length == supplies.length, "length-mismatch");
        
        TMPTokenInfo[] storage tmpTokenInfos = _tmpTokenInfos[marketID];

        uint firstID = tokenIDs[0];
        require(firstID == tmpTokenInfos.length + 1, "storage-id-gap");

        uint prevID = firstID;
        for(uint i = 1; i < tokenIDs.length; i++) {
            uint id = tokenIDs[i];

            require(id == prevID + 1, "param-id-gap");
            tmpTokenInfos.push(TMPTokenInfo({
                tokenID: tokenIDs[i],
                name: names[i],
                supply: supplies[i],
                dai: dais[i],
                invested: investeds[i],
                set: false
            }));

            prevID = id;
        }
    }

    function setTokenVars(uint marketID, uint index) external override onlyOwner {
        TMPTokenInfo storage tmpTokenInfo = _tmpTokenInfos[marketID][index];
        require(!tmpTokenInfo.set, "already-set");
        tmpTokenInfo.set = true;

        if(index > 0) {
            require(_tmpTokenInfos[marketID][index - 1].set, "prev-not-set");
        }

        _l2Factory.addToken(tmpTokenInfo.name, marketID, address(this));

        // MIIIIIINT
    }

    // --- For deployment ---
    function setL2Exchange(address l2Exchange) external override onlyOwner {
        require(l2Exchange != address(0), "zero-addr");
        require(address(_l2Exchange) == address(0), "already-set");
        _l2Exchange = IIdeaTokenExchangeStateTransferOVM(l2Exchange);
    }

    function setL2Factory(address l2Factory) external override onlyOwner {
        require(l2Factory != address(0), "zero-addr");
        require(address(_l2Factory) != address(0), "already-set");
        _l2Factory = IIdeaTokenFactory(l2Factory);
    }   
}
// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "./interfaces/IIdeaTokenExchangeStateTransferOVM.sol";
import "../../shared/core/interfaces/IIdeaTokenFactory.sol";
import "../../shared/bridge/IBridgeOVM.sol";
import "../../shared/util/Ownable.sol";
import "../../shared/util/Initializable.sol";
import "../../shared/optimism/ICrossDomainMessenger.sol";

/**
 * @title BridgeOVM
 * @author Alexander Schlindwein
 *
 * Handles the state transfer from L1 to L2.
 * This contract is deployed on L2.
 */
contract BridgeOVM is Ownable, Initializable, IBridgeOVM {

    struct TMPTokenInfo {
        uint tokenID;
        string name;
        uint supply;
        uint dai;
        uint invested;
        bool set;
    }

    // Address of Optimism's CrossDomainMessenger contract on L2
    ICrossDomainMessenger public _l2CrossDomainMessenger;
    // Address of the IdeaTokenExchange on L1
    address public _l1Exchange;
    // Address of the IdeaTokenExchange on L2
    IIdeaTokenExchangeStateTransferOVM public _l2Exchange;
    // Address of the IdeaTokenFactory on L2
    IIdeaTokenFactory public _l2Factory;

    // Stores if the static vars have been set already
    bool public _exchangeStaticVarsSet;
    // Stores if platform vars have been set already
    mapping(uint => bool) public _exchangePlatformVarsSet;
    // Stores if token vars
    mapping(uint => TMPTokenInfo[]) public _tmpTokenInfos;

    modifier onlyL1Exchange {
        require(_l2CrossDomainMessenger.xDomainMessageSender() == _l1Exchange, "only-l1-exchange");
        _;
    } 

    /**
     * Initializes the contract
     *
     * @param l1Exchange The address of the IdeaTokenExchange on L1
     * @param l2CrossDomainMessenger The address of Optimism's CrossDomainMessenger contract on L2
     * @param l2Exchange The address of the IdeaTokenExchange on L2
     * @param l2Factory The address of the IdeaTokenFactory on L2
     */
    function initialize(address l1Exchange, address l2CrossDomainMessenger, address l2Exchange, address l2Factory) external override initializer {
        require(l1Exchange != address(0) && l2CrossDomainMessenger != address(0) && l2Exchange != address(0) && l2Factory != address(0), "invalid-args");
        setOwnerInternal(msg.sender);
        _l1Exchange = l1Exchange;
        _l2CrossDomainMessenger = ICrossDomainMessenger(l2CrossDomainMessenger);
        _l2Exchange = IIdeaTokenExchangeStateTransferOVM(l2Exchange);
        _l2Factory = IIdeaTokenFactory(l2Factory);
    }

    /**
     * Receives static vars from the IdeaTokenExchange on L1 and sets them on the L2 IdeaTokenExchange.
     * This function is invoked by Optimism's CrossDomainMessenger
     *
     * @param tradingFeeInvested The tradingFeeInvested on L1
     */
    function receiveExchangeStaticVars(uint tradingFeeInvested) external override onlyL1Exchange {
        require(!_exchangeStaticVarsSet, "already-set");
        _exchangeStaticVarsSet = true;
        _l2Exchange.setStaticVars(tradingFeeInvested);
    }

    /**
     * Receives platform vars from the IdeaTokenExchange on L1 and sets them on the L2 IdeaTokenExchange.
     * This function is invoked by Optimism's CrossDomainMessenger
     *
     * @param marketID The market's ID
     * @param dai The dai on L1
     * @param invested The invested on L1
     * @param platformFeeInvested The platformFeeInvested
     */
    function receiveExchangePlatformVars(uint marketID, uint dai, uint invested, uint platformFeeInvested) external override onlyL1Exchange {
        require(!_exchangePlatformVarsSet[marketID], "already-set");
        _exchangePlatformVarsSet[marketID] = true;
        _l2Exchange.setPlatformVars(marketID, dai, invested, platformFeeInvested);
    }

    /**
     * Receives token vars from the IdeaTokenExchange on L1.
     * The vars are not immediately set, but instead stored until setTokenVars is called.
     *
     * This function is invoked by Optimism's CrossDomainMessenger
     *
     * @param marketID The market's ID
     * @param tokenIDs The IDs of the tokens
     * @param names The names of the tokens
     * @param supplies The supplies of the tokens
     * @param dais The dais of the tokens
     * @param investeds The investeds of the tokens
     */
    function receiveExchangeTokenVars(uint marketID,
                                      uint[] calldata tokenIDs,
                                      string[] calldata names,
                                      uint[] calldata supplies,
                                      uint[] calldata dais,
                                      uint[] calldata investeds) external override onlyL1Exchange {
        {
        uint length = tokenIDs.length;
        require(length > 0, "length-0");
        require(length == names.length && length == dais.length && length == investeds.length && length == supplies.length, "length-mismatch");
        }

        TMPTokenInfo[] storage tmpTokenInfos = _tmpTokenInfos[marketID];
        uint prevID = tmpTokenInfos.length;

        for(uint i = 0; i < tokenIDs.length; i++) {
            require(tokenIDs[i] == prevID + 1, "id-gap");
            pushTMPTokenInfoInternal(tmpTokenInfos, tokenIDs[i], names[i], supplies[i], dais[i], investeds[i]);
            prevID = tokenIDs[i];
        }
    }

    /// Using seperate function due to stack too deep
    function pushTMPTokenInfoInternal(TMPTokenInfo[] storage tmpTokenInfos, uint tokenID, string memory name, uint supply, uint dai, uint invested) internal {
        tmpTokenInfos.push(TMPTokenInfo({
            tokenID: tokenID,
            name: name,
            supply: supply,
            dai: dai,
            invested: invested,
            set: false
        }));
    }

    /**
     * Sets previously received tokens vars on L2.
     * May only be called by the owner.
     * 
     * @param marketID The market's ID
     * @param tokenID The ID of the token
     */
    function setTokenVars(uint marketID, uint tokenID) external override onlyOwner {
        require(tokenID > 0, "tokenid-0");
        uint index = tokenID - 1;

        TMPTokenInfo storage tmpTokenInfo = _tmpTokenInfos[marketID][index];
        require(!tmpTokenInfo.set, "already-set");
        tmpTokenInfo.set = true;

        if(index > 0) {
            require(_tmpTokenInfos[marketID][index - 1].set, "prev-not-set");
        } else {
            require(!_tmpTokenInfos[marketID][0].set, "0-set");
        }

        _l2Factory.addToken(tmpTokenInfo.name, marketID, address(this));
        _l2Exchange.setTokenVarsAndMint(marketID, tmpTokenInfo.tokenID, tmpTokenInfo.supply, tmpTokenInfo.dai, tmpTokenInfo.invested);
    }

    /**
     * Transfers a user's IdeaTokens from L1 to L2.
     *
     * @param marketID The market ID of the token
     * @param tokenID The token ID of the token
     * @param amount The amount to transfer
     * @param to The recipient
     */
    function receiveIdeaTokenTransfer(uint marketID, uint tokenID, uint amount, address to) external override onlyL1Exchange {
        TokenInfo memory tokenInfo = _l2Factory.getTokenInfo(marketID, tokenID);
        require(tokenInfo.exists, "not-exist");
        tokenInfo.ideaToken.transfer(to, amount);
        // TODO: EVENTS?
    }
}
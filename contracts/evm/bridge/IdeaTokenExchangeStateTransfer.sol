// SPDX-License-Identifier: MIT
// @unsupported: ovm
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "./interfaces/IIdeaTokenExchangeStateTransfer.sol";
import "../core/IdeaTokenExchange.sol"; 
import "../../shared/bridge/IBridgeOVM.sol";
import "../../shared/optimism/ICrossDomainMessenger.sol";

/**
 * @title IdeaTokenExchangeStateTransfer
 * @author Alexander Schlindwein
 *
 * Replaces the L1 IdeaTokenExchange logic for the state transfer to Optimism L2.
 * 
 * This implementation will disable all state-altering methods and adds state transfer
 * methods which can be called by a transfer manager EOA. State transfer methods will call 
 * Optimism's CrossDomainMessenger contract to execute a transaction on L2.
 */
contract IdeaTokenExchangeStateTransfer is IdeaTokenExchange, IIdeaTokenExchangeStateTransfer {

    uint __gapStateTransfer__;

    // EOA which is allowed to manage the state transfer
    address public _transferManager;
    // Address of the BridgeOVM contract on L2
    address public _l2Bridge;
    // Address of Optimism's CrossDomainMessenger contract on L1
    ICrossDomainMessenger public _l1CrossDomainMessenger;
    // Switch to enable token transfers once the initial state transfer is complete
    bool public _tokenTransferEnabled;

    // The L2 gas limit for the static vars transfer
    uint32 constant private GAS_LIMIT_STATIC_VARS = 100_000;
    // The L2 gas limit for the platform vars transfer (per platform)
    uint32 constant private GAS_LIMIT_PLATFORM_VARS = 100_000;
    // The L2 gas limit for the token vars transfer (per token)
    uint32 constant private GAS_LIMIT_TOKEN_VARS = 100_000;
    // The L2 gas limit for IdeaToken transfers
    uint32 constant private GAS_LIMIT_TOKEN_TRANSFER = 100_000;
    
    // The max L2 gas limit
    uint32 constant private GAS_LIMIT_MAX = 9_000_000;

    event StaticVarsTransferred();
    event PlatformVarsTransferred(uint marketID);
    event TokenVarsTransferred(uint marketID, uint tokenID);
    event TokensTransferred(uint marketID, uint tokenID, address user, uint amount, address recipient);
    event TokenTransferEnabled();

    modifier onlyTransferManager {
        require(msg.sender == _transferManager, "only-transfer-manager");
        _;
    }

    /**
     * Initializes the contract's variables.
     *
     * @param transferManager EOA which is allowed to manage the state transfer
     * @param l2Bridge Address of the BridgeOVM contract on L2
     * @param l1CrossDomainMessenger Address of Optimism's CrossDomainMessenger contract on L1
     */
    function initializeStateTransfer(address transferManager, address l2Bridge, address l1CrossDomainMessenger) external override {
        require(_transferManager == address(0), "already-init");
        require(transferManager != address(0) && l2Bridge != address(0) &&  l1CrossDomainMessenger != address(0), "invalid-args");

        _transferManager = transferManager;
        _l2Bridge = l2Bridge;
        _l1CrossDomainMessenger = ICrossDomainMessenger(l1CrossDomainMessenger);
    }

    /**
     * Transfers _tradingFeeInvested to L2.
     */
    function transferStaticVars() external override onlyTransferManager {
        bytes4 selector = IBridgeOVM(_l2Bridge).receiveExchangeStaticVars.selector;
        bytes memory cdata = abi.encodeWithSelector(selector, _tradingFeeInvested);
        _l1CrossDomainMessenger.sendMessage(_l2Bridge, cdata, GAS_LIMIT_STATIC_VARS);

        emit StaticVarsTransferred();
    }

    /**
     * Transfers a market's state to L2.
     *
     * @param marketID The ID of the market
     */
    function transferPlatformVars(uint marketID) external override onlyTransferManager {
        MarketDetails memory marketDetails = _ideaTokenFactory.getMarketDetailsByID(marketID);
        require(marketDetails.exists, "not-exist");

        ExchangeInfo memory exchangeInfo = _platformsExchangeInfo[marketID];

        bytes4 selector = IBridgeOVM(_l2Bridge).receiveExchangePlatformVars.selector;
        bytes memory cdata = abi.encodeWithSelector(selector, marketID, exchangeInfo.dai, exchangeInfo.invested, _platformFeeInvested[marketID]);
        _l1CrossDomainMessenger.sendMessage(_l2Bridge, cdata, GAS_LIMIT_PLATFORM_VARS);

        emit PlatformVarsTransferred(marketID);
    }

    /**
     * Transfers token's state to L2.
     *
     * @param marketID The ID of the tokens' market
     * @param tokenIDs The IDs of the tokens
     */
    function transferTokenVars(uint marketID, uint[] calldata tokenIDs) external override onlyTransferManager {
        MarketDetails memory marketDetails = _ideaTokenFactory.getMarketDetailsByID(marketID);
        require(marketDetails.exists, "market-not-exist");
        
        uint length = tokenIDs.length;
        require(length > 0, "length-0");


        string[] memory names = new string[](length);
        uint[] memory supplies = new uint[](length);
        uint[] memory dais = new uint[](length);
        uint[] memory investeds = new uint[](length);

        for(uint i = 0; i < length; i++) {

            uint tokenID = tokenIDs[i];
            TokenInfo memory tokenInfo = _ideaTokenFactory.getTokenInfo(marketID, tokenID);
            require(tokenInfo.exists, "token-not-exist");

            IIdeaToken ideaToken = tokenInfo.ideaToken;
            ExchangeInfo memory exchangeInfo = _tokensExchangeInfo[address(ideaToken)];
            
            
            names[i] = tokenInfo.name;
            supplies[i] = ideaToken.totalSupply();
            dais[i] = exchangeInfo.dai;
            investeds[i] = exchangeInfo.invested;

            emit TokenVarsTransferred(marketID, tokenID);
        }

        uint32 l2GasLimit = GAS_LIMIT_TOKEN_VARS * uint32(length);
        require(l2GasLimit / GAS_LIMIT_TOKEN_VARS == uint32(length), "gas-overflow");
        require(l2GasLimit <= GAS_LIMIT_MAX, "max-gas");

        bytes4 selector = IBridgeOVM(_l2Bridge).receiveExchangeTokenVars.selector;
        bytes memory cdata = abi.encodeWithSelector(selector, marketID, tokenIDs, names, supplies, dais, investeds);
        _l1CrossDomainMessenger.sendMessage(_l2Bridge, cdata, l2GasLimit);
    }

    /**
     * Transfers an user's IdeaTokens to L2.
     *
     * @param marketID The ID of the token's market
     * @param tokenID The ID of the token
     * @param l2Recipient The address of the recipient on L2
     */
    function transferIdeaTokens(uint marketID, uint tokenID, address l2Recipient) override external {
        
        require(_tokenTransferEnabled, "not-enabled");
        require(l2Recipient != address(0), "zero-addr");

        TokenInfo memory tokenInfo = _ideaTokenFactory.getTokenInfo(marketID, tokenID);
        require(tokenInfo.exists, "not-exists");

        IIdeaToken ideaToken = tokenInfo.ideaToken;
        address sender = msg.sender;
        uint balance = ideaToken.balanceOf(sender);
        require(balance > 0, "no-balance");

        // TODO: Will this nuke the L1 subgraph?
        ideaToken.burn(sender, balance);
        
        bytes4 selector = IBridgeOVM(_l2Bridge).receiveIdeaTokenTransfer.selector;
        bytes memory cdata = abi.encodeWithSelector(selector, marketID, tokenID, balance, l2Recipient);
        _l1CrossDomainMessenger.sendMessage(_l2Bridge, cdata, GAS_LIMIT_TOKEN_TRANSFER);

        emit TokensTransferred(marketID, tokenID, sender, balance, l2Recipient);
    }

    /**
     * Enables transferIdeaTokens to be called.
     */
    function setTokenTransferEnabled() external override onlyTransferManager {
        _tokenTransferEnabled = true;

        emit TokenTransferEnabled();
    } 

    /* **********************************************
     * ************  Disabled functions  ************
     * ********************************************** 
     */

    function initialize(address owner, address authorizer, address tradingFeeRecipient, address interestManager, address dai) external override {
        owner; authorizer; tradingFeeRecipient; interestManager; dai;
        revert("x");
    }

    function sellTokens(address ideaToken, uint amount, uint minPrice, address recipient) external override {
        ideaToken; amount; minPrice; recipient;
        revert("x");
    }

    function getPriceForSellingTokens(address ideaToken, uint amount) external view override returns (uint) {
        ideaToken; amount;
        revert("x");
    }

    function getPricesForSellingTokens(MarketDetails memory marketDetails, uint supply, uint amount, bool feesDisabled) public pure override returns (CostAndPriceAmounts memory) {
        marketDetails; supply; amount; feesDisabled;
        revert("x");
    }

    function getRawPriceForSellingTokens(uint baseCost, uint priceRise, uint hatchTokens, uint supply, uint amount) internal pure override returns (uint) {
        baseCost; priceRise; hatchTokens; supply; amount;
        revert("x");
    }

    function buyTokens(address ideaToken, uint amount, uint fallbackAmount, uint cost, address recipient) external override {
        ideaToken; amount; fallbackAmount; cost; recipient;
        revert("x");
    }

    function getCostForBuyingTokens(address ideaToken, uint amount) external view override returns (uint) {
        ideaToken; amount;
        revert("x");
    }

    function getCostsForBuyingTokens(MarketDetails memory marketDetails, uint supply, uint amount, bool feesDisabled) public pure override returns (CostAndPriceAmounts memory) {
        marketDetails; supply; amount; feesDisabled;
        revert("x");
    }

    function getRawCostForBuyingTokens(uint baseCost, uint priceRise, uint hatchTokens, uint supply, uint amount) internal pure override returns (uint) {
        baseCost; priceRise; hatchTokens; supply; amount;
        revert("x");
    }

    function withdrawTokenInterest(address token) external override {
        token;
        revert("x");
    }

    function getInterestPayable(address token) public view override returns (uint) {
        token;
        revert("x");
    }

    function setTokenOwner(address token, address owner) external virtual override {
        token; owner;
        revert("x");
    }

    function withdrawPlatformInterest(uint marketID) external override {
        marketID;
        revert("x");
    }

    function getPlatformInterestPayable(uint marketID) public view override returns (uint) {
        marketID;
        revert("x");
    }

    function withdrawPlatformFee(uint marketID) external override {
        marketID;
        revert("x");
    }

    function getPlatformFeePayable(uint marketID) public view override returns (uint) {
        marketID;
        revert("x");
    }

    function setPlatformOwner(uint marketID, address owner) external override {
        marketID; owner;
        revert("x");
    }

    function withdrawTradingFee() external override {
        revert("x");
    }

    function getTradingFeePayable() public view override returns (uint) {
        revert("x");
    }

    function setAuthorizer(address authorizer) external override {
        authorizer;
        revert("x");
    }

    function isTokenFeeDisabled(address ideaToken) external view override returns (bool) {
        ideaToken;
        revert("x");
    }

    function setTokenFeeKillswitch(address ideaToken, bool set) external override {
        ideaToken; set;
        revert("x");
    }

    function setIdeaTokenFactoryAddress(address factory) external override {
        factory;
        revert("x");
    }
}
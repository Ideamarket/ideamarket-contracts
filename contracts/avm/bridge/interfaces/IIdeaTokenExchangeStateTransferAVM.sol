// SPDX-License-Identifier: MIT
pragma solidity 0.6.9;

/**
 * @title IIdeaTokenExchangeStateTransferAVM
 * @author Alexander Schlindwein
 */
interface IIdeaTokenExchangeStateTransferAVM {
    function setStaticVars(uint tradingFeeInvested) external;
    function setPlatformVars(uint marketID, uint dai, uint invested, uint platformFeeInvested) external;
    function setTokenVarsAndMint(uint marketID, uint tokenID, uint supply, uint dai, uint invested) external;
}
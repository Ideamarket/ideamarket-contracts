// SPDX-License-Identifier: MIT
// See https://github.com/OffchainLabs/arbitrum/blob/develop/packages/arb-bridge-eth/contracts/bridge/interfaces/IInbox.sol

pragma solidity 0.6.9;

/**
 * @title IInbox
 * @author Alexander Schlindwein
 */
interface IInbox {
    function createRetryableTicket(
        address destAddr,
        uint256 arbTxCallValue,
        uint256 maxSubmissionCost,
        address submissionRefundAddress,
        address valueRefundAddress,
        uint256 maxGas,
        uint256 gasPriceBid,
        bytes calldata data
    ) external payable returns (uint256);
}
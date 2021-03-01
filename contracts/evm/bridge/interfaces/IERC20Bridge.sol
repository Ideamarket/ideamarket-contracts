// SPDX-License-Identifier: MIT
// See https://github.com/OffchainLabs/arbitrum/blob/develop/packages/arb-bridge-peripherals/contracts/tokenbridge/ethereum/EthERC20Bridge.sol

pragma solidity 0.6.9;

/**
 * @title IERC20Bridge
 * @author Alexander Schlindwein
 */
interface IERC20Bridge {
    function deposit(
        address erc20,
        address destination,
        uint256 amount,
        uint256 maxSubmissionCost,
        uint256 maxGas,
        uint256 gasPriceBid,
        bytes calldata callHookData
    ) external payable returns (uint256 seqNum, uint256 depositCalldataLength);
}


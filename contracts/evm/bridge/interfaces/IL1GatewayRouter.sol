// SPDX-License-Identifier: MIT
pragma solidity 0.6.9;

/**
 * @title IL1GatewayRouter
 * @author Alexander Schlindwein
 */
interface IL1GatewayRouter {
    function outboundTransfer(
        address _token,
        address _to,
        uint256 _amount,
        uint256 _maxGas,
        uint256 _gasPriceBid,
        bytes calldata _data
    ) external payable returns (bytes memory);
}
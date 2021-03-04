// SPDX-License-Identifier: MIT
// @unsupported: ovm
pragma solidity 0.6.12;

interface IRollupContract {
    function sendL1ToL2Message(address targetL2Contract, bytes calldata data) external;
}


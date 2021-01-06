// SPDX-License-Identifier: MIT
pragma solidity ^0.6.9;

/**
 * @title MinimalProxy
 * @author Alexander Schlindwein
 *
 * Minimal proxy contract which delegates to an implementation
 */
contract MinimalProxy {
    // Implementation address storage slot
    bytes32 constant IMPLEMENTATION_SLOT = bytes32(uint256(keccak256("eip1967.proxy.implementation")) - 1);

    /**
     * Constructs a new proxy which delegates to the implementation address
     */
    constructor(address implementation) public {
        bytes32 slot = IMPLEMENTATION_SLOT;
        assembly {
            sstore(slot, implementation)
        }
    }

    /**
     * Every call is delegated to the implementation
     */
    fallback() payable external {
        bytes32 slot = IMPLEMENTATION_SLOT;
        assembly {
          calldatacopy(0, 0, calldatasize())
          let result := delegatecall(gas(), sload(slot), 0, calldatasize(), 0, 0)
          returndatacopy(0, 0, returndatasize())
    
          switch result
          case 0 { revert(0, returndatasize()) }
          default { return(0, returndatasize()) }
        }
    }    
}

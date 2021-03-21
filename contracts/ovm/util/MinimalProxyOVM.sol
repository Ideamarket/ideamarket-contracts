// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

/**
 * @title MinimalProxy
 * @author Alexander Schlindwein
 *
 * Minimal proxy contract which delegates to an implementation
 */
contract MinimalProxyOVM {
    // Implementation address storage slot
    bytes32 constant IMPLEMENTATION_SLOT = bytes32(uint256(keccak256("eip1967.proxy.implementation")) - 1);

    /**
     * Initializes the implementation address
     *
     * @param implementation The implementation address
     */
    function __initialize_implementation_slot(address implementation) external {
        require(implementation != address(0), "invalid-params");

        bytes32 slot = IMPLEMENTATION_SLOT;
        address currentImplementation;

        assembly {
            currentImplementation := sload(slot)
        }

        require(currentImplementation == address(0), "already-set");
        
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

          /*
            The below line causes an OVM compiler warning:
                Warning: OVM: Using RETURNDATASIZE or RETURNDATACOPY in user asm isn't guaranteed to work
            
            This warning does not apply to this case. From the OVM docs:

                If any of the opcodes replaced by the OVM compiler
                is between the CALL you originally made and your use of 
                RETURNDATACOPY or RETURNDATASIZE then this will cause issues.
                
                For example:

                assembly {
                    call(...)
                    let x := returndatasize()
                }

                will work. But if you do

                assembly {
                    call(...)
                    let y := address()
                    let x := returndatasize()
                }

                then that will not work because address is transpiled into
                a call to ovmADDRESS which changes returndatasize.

            Here there is no call between the delegatecall and returndatacopy/returndatasize.
          */
          returndatacopy(0, 0, returndatasize())
    
          switch result
          case 0 { revert(0, returndatasize()) }
          default { return(0, returndatasize()) }
        }
    }    
}

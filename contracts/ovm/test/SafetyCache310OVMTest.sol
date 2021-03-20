// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

interface ISafetyChecker310OVM {
    function isBytecodeSafe(bytes memory _bytecode) external pure returns (bool);
}

contract SafetyCache310OVMTest {


    /*******************************************
     * Contract Variables: Contract References *
     ******************************************/

    ISafetyChecker310OVM internal ovmSafetyChecker;


    /****************************************
     * Contract Variables: Internal Storage *
     ****************************************/

    mapping(bytes32 => bool) internal isSafeCodehash;


    /***************
     * Constructor *
     ***************/

    constructor(
        address safetyChecker
    ) public
    {
        ovmSafetyChecker = ISafetyChecker310OVM(safetyChecker);
    }


    /**********************
     * External Functions *
     *********************/


    /** Checks the registry to see if the verified bytecode is registered as safe. If not, calls to the 
    * SafetyChecker to see. 
    * @param _code A bytes32 hash of the code
    * @return `true` if the bytecode is safe, `false` otherwise.
    */
    function checkAndRegisterSafeBytecode(
        bytes memory _code
    ) 
        external
        returns (
            bool
    ) {
        bytes32 codehash = keccak256(abi.encode(_code));
        if(isSafeCodehash[codehash] == true) {
            return true;
        }

        bool safe = ovmSafetyChecker.isBytecodeSafe(_code);
        if(safe) {
            isSafeCodehash[codehash] = true;
        }
        return safe;
    }

    /** Used to check if bytecode has already been recorded as safe.
    * @param _codehash A bytes32 hash of the code
    */
    function isRegisteredSafeBytecode(
        bytes32 _codehash
    ) 
        external
        view
        returns (
            bool
        )
    {
        return isSafeCodehash[_codehash] == true;
    }
}
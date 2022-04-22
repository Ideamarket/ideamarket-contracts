// SPDX-License-Identifier: MIT
pragma solidity 0.6.9;

import "./IIdeaTokenNameVerifier.sol";

/**
 * @title AddressNameVerifier
 * @author Kelton Madden
 *
 * Verifies string is a valid ethereum address
 */
contract AddressNameVerifier is IIdeaTokenNameVerifier {
    /**
     * Verifies whether a string matches the required format
     *
     * @param name The input string (Showtime name)
     *
     * @return Bool; True=matches, False=does not match
     */
    function verifyTokenName(string calldata name) external pure override returns (bool) {
        bytes memory b = bytes(name);
        if(b.length != 42) {
            return false;
        }

        if(b[0] != 0x30 || b[1] != 0x78) { // @
            return false;
        }

        for(uint i = 2; i < 42; i++) {
            bytes1 char = b[i];
            if (!(char >= 0x30 && char <= 0x39) && //9-0
                !(char >= 0x61 && char <= 0x7A) && //a-z
                !(char >= 0x41 && char <= 0x5A)) {  //a-z 
                
                return false;
            }
        }
        return true;
    }
}

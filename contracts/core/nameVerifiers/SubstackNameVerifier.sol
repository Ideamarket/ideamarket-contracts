// SPDX-License-Identifier: MIT
pragma solidity 0.6.9;

import "./IIdeaTokenNameVerifier.sol";

/**
 * @title SubstackNameVerifier
 * @author Alexander Schlindwein
 *
 * Verifies a string to be a substack name: <the name>.substack.com. Allowed characters are a-z (lowercase) and 0-9, maximum length 30.
 */
contract SubstackNameVerifier is IIdeaTokenNameVerifier {
    /**
     * Verifies whether a string matches the required format
     *
     * @param name The input string (Substack name)
     *
     * @return Bool; True=matches, False=does not match
     */
    function verifyTokenName(string calldata name) external pure override returns (bool) {
        bytes memory b = bytes(name);
        if(b.length == 0 || b.length > 30) {
            return false;
        }

        for(uint i = 0; i < b.length; i++) {
            bytes1 char = b[i];
            if (!(char >= 0x61 && char <= 0x7A) && // a-z
                !(char >= 0x30 && char <= 0x39)    // 0-9
                ) { 
                return false;
            }
        }

        return true;
    }
}

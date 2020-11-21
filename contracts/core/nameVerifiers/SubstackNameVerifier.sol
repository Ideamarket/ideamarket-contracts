// SPDX-License-Identifier: MIT
pragma solidity ^0.6.9;

import "./IIdeaTokenNameVerifier.sol";

/**
 * @title SubstackNameVerifier
 * @author Alexander Schlindwein
 *
 * Verifies a string to be a substack name: <the name>.substack.com. Allowed characters are a-z (lowercase).
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
        if(b.length == 0) {
            return false;
        }

        for(uint i = 0; i < b.length; i++) {
            bytes1 char = b[i];
            if (!(char >= 0x61 && char <= 0x7A)) { //a-z
                return false;
            }
        }

        return true;
    }
}

// SPDX-License-Identifier: MIT
pragma solidity 0.6.9;

import "./IIdeaTokenNameVerifier.sol";

/**
 * @title MirrorNameVerifier
 * @author Alexander Schlindwein
 *
 * Verifies a string to be a mirror name: <the name>.mirror.xyz.
 * Allowed characters are a-z (lowercase), 0-9 and - (dash) excluding at the beginning and end.
 * Maximum length 63.
 */
contract MirrorNameVerifier is IIdeaTokenNameVerifier {
    /**
     * Verifies whether a string matches the required format
     *
     * @param name The input string (Substack name)
     *
     * @return Bool; True=matches, False=does not match
     */
    function verifyTokenName(string calldata name) external pure override returns (bool) {
        bytes memory b = bytes(name);
        if(b.length == 0 || b.length > 63) {
            return false;
        }

        bytes1 firstChar = b[0];
        bytes1 lastChar = b[b.length - 1];

        if(firstChar == 0x2D || lastChar == 0x2D) { // -
            return false;
        }

        for(uint i = 0; i < b.length; i++) {
            bytes1 char = b[i];
            if (!(char >= 0x61 && char <= 0x7A) && // a-z
                !(char >= 0x30 && char <= 0x39) && // 0-9
                char != 0x2D
                ) { 
                return false;
            }
        }

        return true;
    }
}

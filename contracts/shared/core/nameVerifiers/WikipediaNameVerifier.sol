// SPDX-License-Identifier: MIT
pragma solidity 0.6.9;

import "./IIdeaTokenNameVerifier.sol";

/**
 * @title WikipediaNameVerifier
 * @author Kelton Madden
 *
 * Verifies a string to be a wikipedia article title name.
 * Allowed characters all utf-8 supported characters excluding at the beginning and end.
 * Maximum length of 256 bytes.
 */
contract WikipediaNameVerifier is IIdeaTokenNameVerifier {
    /**
     * Verifies whether a string matches the required format
     *
     * @param name The input string (Wikipedia link name)
     *
     * @return Bool; True=matches, False=does not match
     */
    function verifyTokenName(string calldata name) external pure override returns (bool) {
        bytes memory b = bytes(name);
        if(b.length == 0 || b.length > 256) {
            return false;
        }

        bytes1 firstChar = b[0];
        bytes1 lastChar = b[b.length - 1];
        if(firstChar >= 0x61 && firstChar <= 0x7A) { // a-z lowercase cannot be first char
            return false;
        }

        if(firstChar == 0x3A || firstChar <= 0x20 || firstChar == 0x5F || lastChar <= 0x20 || lastChar == 0x5F) { 
            // first char cannot be :, _ or space, last char cannot be space or _
            return false;
        }

        for(uint i = 0; i < b.length; i++) {
            bytes1 char = b[i];
            if (char == 0x20 || char == 0x3C || char == 0x3E || char == 0x5B || char == 0x5D
                || char == 0x7B || char == 0x7D || char == 0x7C) {
                // char == 0x7F || char <= 0x31) {
                // string cannot include <> {} [] | space or any char 0-31
                return false;
            }
        }
        return true;
    }
}
// SPDX-License-Identifier: MIT
pragma solidity 0.6.9;

import "./IIdeaTokenNameVerifier.sol";

/**
 * @title URLNameVerifier
 * @author Alexander Schlindwein
 *
 * Verifies a string to be a URL:
 */
contract URLNameVerifier is IIdeaTokenNameVerifier {
    /**
     * Verifies whether a string matches the required format
     *
     * @param name The input string (URL)
     *
     * @return Bool; True=matches, False=does not match
     */
    function verifyTokenName(string calldata name) external pure override returns (bool) {
        bytes memory b = bytes(name);
        uint length = b.length;

        if(length == 0) {
            return false;
        }

        for(uint i = 0; i < length; i++) {
            bytes1 char = b[i];

            if (!(char >= 0x61 && char <= 0x7A) &&  // a-z
                !(char >= 0x30 && char <= 0x39) &&  // 0-9
                !(char >= 0x41 && char <= 0x5A) &&  // A-Z
                !(char >= 0x2D && char <= 0x2F) &&  // / - .
                char != 0x5F                    &&  // _
                char != 0x7E) {                     // ~

                return false;
            }
        }

        return true;
    }
}

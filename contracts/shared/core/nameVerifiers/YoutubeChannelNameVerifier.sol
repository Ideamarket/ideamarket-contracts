// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "./IIdeaTokenNameVerifier.sol";

/**
 * @title YoutubeChannelNameVerifier
 * @author Alexander Schlindwein
 *
 * Verifies a string to be a Youtube Channel: a-z äöü, max 40 characters, all lower-case
 */
contract YoutubeChannelNameVerifier is IIdeaTokenNameVerifier {
    /**
     * Verifies whether a string matches the required format
     *
     * @param name The input string (Youtube channel)
     *
     * @return Bool; True=matches, False=does not match
     */
    function verifyTokenName(string calldata name) external pure override returns (bool) {
        bytes memory b = bytes(name);
        uint length = b.length;

        if(length == 0 || length > 40) {
            return false;
        }

        for(uint i = 0; i < length; i++) {
            bytes1 char = b[i];

            if(char == 0xC3) { // Unicode begin
                if(i == length - 1) { // End of input
                    return false;
                }

                char = b[i + 1];
                if(char != 0xA4 && // ä
                   char != 0xB6 && // ö
                   char != 0xBC) { // ü
                    return false;
                } 

                // We already read the next byte
                i++;

            } else if (!(char >= 0x61 && char <= 0x7A)) { // a-z
                return false;
            }
        }

        return true;
    }
}

// SPDX-License-Identifier: MIT
pragma solidity 0.6.9;

import "./IIdeaTokenNameVerifier.sol";

/**
 * @title URLNameVerifier
 * @author Kelton Madden
 *
 * Verifies a string to be a domain names: 0-9 and a-z and - (hyphen). Excludes subdomains
 */
contract URLNameVerifier is IIdeaTokenNameVerifier {
    /**
     * Verifies whether a string matches the required format
     *
     * @param name The input string (domain name)
     *
     * @return Bool; True=matches, False=does not match
     */
    function verifyTokenName(string calldata name) external pure override returns (bool) {
        bytes memory b = bytes(name);
        bool hasHTTP = false;
        bool hasHTTPS = false;
        bool hasIPFS = false;
        bool hasDomain = false;
        bool hasDot = false;
        bool hasTLD = false;
        if (b.length <= 7) {
            return false;
        }
        uint i = 7;
        // check beginning
        if (b[0] == 0x68 && b[1] == 0x74 && b[2] == 0x74 && b[3] == 0x70 && b[4] == 0x3a && b[5] == 0x2f && b[6] == 0x2f) {
            hasHTTP = true;
        } else if (b[0] == 0x68 && b[1] == 0x74 && b[2] == 0x74 && b[3] == 0x70 && b[4] == 0x73 && b[5] == 0x3a && b[6] == 0x2f && b[7] == 0x2f) {
            hasHTTPS = true;
            i = 8;
        } else if (b[0] == 0x69 && b[1] == 0x70 && b[2] == 0x66 && b[3] == 0x73 && b[4] == 0x3a && b[5] == 0x2f && b[6] == 0x2f) {
            hasIPFS = true;
        }

        if (!(hasHTTP || hasHTTPS || hasIPFS)) {
            return false;
        }

        for(i; i < b.length; i++) {
            bytes1 char = b[i];
            if (!(char >= 0x30 && char <= 0x39) && //9-0
                !(char >= 0x61 && char <= 0x7A) && //a-z
                !(char == 0x2D) && //-
                !(char == 0x2E) && //.
                !(char == 0x5F)) {//_
                    return false;
                }

             if (char == 0x2E) { // .
                if(hasDot) {
                    // There is already a dot -> no subdomains allowed
                    return false;
                }
                hasDot = true;
             } else {
                if(hasDot) {
                    hasTLD = true;
                } else {
                    hasDomain = true;
                }
             }
        }

        return hasDomain && hasDot && hasTLD;
    }
}

// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "./IIdeaTokenNameVerifier.sol";

/**
 * @title DomainNoSubdomainNameVerifier
 * @author Alexander Schlindwein
 *
 * Verifies a string to be a domain names: 0-9 and a-z and - (hyphen). Excludes subdomains
 */
contract DomainNoSubdomainNameVerifier is IIdeaTokenNameVerifier {
    /**
     * Verifies whether a string matches the required format
     *
     * @param name The input string (domain name)
     *
     * @return Bool; True=matches, False=does not match
     */
    function verifyTokenName(string calldata name) external pure override returns (bool) {
        bytes memory b = bytes(name);
        bool hasDomain = false;
        bool hasDot = false;
        bool hasTLD = false;

        for(uint i = 0; i < b.length; i++) {
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

// SPDX-License-Identifier: MIT
pragma solidity ^0.6.9;

/**
 * @title DomainNoSubdomainNameVerifier
 * @author Alexander Schlindwein
 *
 * @dev Verifies a string to be a domain names: 0-9 and a-z and - (hyphen). Excludes subdomains
 */
contract DomainNoSubdomainNameVerifier {
    function verifyTokenName(string calldata name) external pure returns (bool) {
        bytes memory b = bytes(name);
        bool hasDot = false;

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
             }
        }
        return true;
    }
}

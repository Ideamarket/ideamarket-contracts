// SPDX-License-Identifier: MIT
pragma solidity 0.6.9;


/**
 * @title ICredibilityRatings
 * @author Alexander Schlindwein
 */

struct CredibilityRating {
    uint rating;
    uint timestamp;
}

interface ICredibilityRatings {
    function submitRating(address link, uint rating) external;
    function getNumRatings(address user, address link) external view returns (uint);
    function getRating(address user, address link, uint index) external view returns (uint, uint);
}
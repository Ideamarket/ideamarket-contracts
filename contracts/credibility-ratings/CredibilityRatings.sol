// SPDX-License-Identifier: MIT
pragma solidity 0.6.9;

import "./ICredibilityRatings.sol";

/**
 * @title CredibilityRatings
 * @author Alexander Schlindwein
 *
 * Enables users to store ratings (0-100) for Ideatokens representing links to an online resource
 */
contract CredibilityRatings is ICredibilityRatings {

    // user address => link token address => CredibilityRatings
    mapping(address => mapping(address => CredibilityRating[])) internal _credibilityRatings;

    event RatingSubmitted(address user, address link, uint rating, uint timestamp);

    /**
     * Submits a rating (0-100)
     *
     * @param link The address of the Ideatoken representing a link to an online resource
     * @param rating The rating from 0-100
     *
     * Note: The `link` parameter is not checked for validity, any address can be submitted.
     * The frontend is required to filter out invalid submissions.
     */
    function submitRating(address link, uint rating) external override {

        require(rating <= 100, "invalid-rating");

        address user = msg.sender;
        uint timestamp = now;

        CredibilityRating memory cr = CredibilityRating({
            rating: rating,
            timestamp: timestamp
        });

        _credibilityRatings[user][link].push(cr);

        emit RatingSubmitted(user, link, rating, timestamp);
    }

    /**
     * Returns the number of ratings a user has submitted for a specific link
     *
     * @param user The address of the user
     * @param link The address of the Ideatoken representing a link to an online resource
     * 
     * @return The number of ratings a user has submitted for a specific link
     */
    function getNumRatings(address user, address link) external view override returns (uint) {
        return _credibilityRatings[user][link].length;
    }

    /**
     * Returns the rating value and the rating timestamp for a given rating by index
     *
     * @param user The address of the user
     * @param link The address of the Ideatoken representing a link to an online resource
     * @param index The index of the CredibilityRating
     *
     * @return (rating value, rating timestamp)
     */
    function getRating(address user, address link, uint index) external view override returns (uint, uint) {
        CredibilityRating storage cr = _credibilityRatings[user][link][index];
        return (cr.rating, cr.timestamp);
    }
}
// SPDX-License-Identifier: MIT
pragma solidity 0.6.9;

import "./InterestManagerCompound.sol";
/**
 * @title InterestManagerCompoundV2
 * @author Alexander Schlindwein 
 *
 * V2 implements significant gas savings.
 * The previous version of the InterestManagerCompound contract invested Dai into Compound
 * on every invest() call. With the current gas prices this increases the cost of each trade
 * on Ideamarket by $40-$80.
 *
 * To reduce this cost to the users, this new V2 contract does not invest Dai into Compound
 * on every call anymore. Instead, it holds the Dai until supplyDaiToCompound() is manually called.
 *
 * The resulting difference in interest is spread across all IdeaTokens. 
 */
contract InterestManagerCompoundV2 is InterestManagerCompound {

    // Just to be extra safe
    uint private __gapV2__;
    bool internal _isV2Initialized = false;

    // "Investment Tokens" represent shares in the total liquidity in this contract
    // 1 investment token is redeemable to (1/_totalInvestmentTokens) * total Dai balance
    // with
    // total Dai balance = Dai balance + cDai balance converted to Dai
    //
    // The naming of this variable stems from the V1 contract where 1 investment token = 1 cDai  
    uint internal _totalInvestmentTokens = 0;

    /**
     * Initializes the contract's _totalInvestmentTokens
     * The upgrade to this new logic contract and the call to initializeV2
     * is atomically performed by the AdminUpgradeabilityProxy's upgradeToAndCall function.
     */
    function initializeV2() external {
        require(!_isV2Initialized, "is-init");

        // During initialization,
        // cDai balance = sum(return of all V1 invest() calls) - sum(return of all V1 redeem() calls)
        // (unless someone were to transfer cDai directly to this contract, see below)
        //
        // Direct Dai transfers to this contract before or after V2 initialization
        // and direct cDai transfers to this contracts after V2 initialization
        // will be implicity handled as accrued interest.
        //
        // Direct cDai transfers to this contract before V2 initialization will effectively be lost.
        _totalInvestmentTokens = _cDai.balanceOf(address(this));
        
        _isV2Initialized = true;
    }

    /**
     * Invests a given amount of Dai. The funds will be held until supplyDaiToCompound() is called
     * The Dai have to be transfered to this contract before this function is called
     *
     * @param amount The amount of Dai to invest
     *
     * @return The amount of minted investment tokens (shares)
     */
    function invest(uint amount) external override onlyOwner returns (uint) {

        // Mint new investmentTokens as if the Dai were immediately deposited to Compound
        // This ensures that the "loss" in the form of reduced interest is spread across all IdeaTokens.
        ICToken cDai = _cDai;
        uint addedInvestmentTokens = daiToCDai(cDai, amount);
        _totalInvestmentTokens = _totalInvestmentTokens.add(addedInvestmentTokens);
        return addedInvestmentTokens;
    }

    /**
     * Redeems a given amount of Dai and sends it to the recipient
     * Redeeming from Compound will be skipped if this contract holds enough Dai
     *
     * @param recipient The recipient of the redeemed Dai
     * @param amount The amount of Dai to redeem
     *
     * @return The amount of burned investment tokens (shares)
     */
    function redeem(address recipient, uint amount) external override onlyOwner returns (uint) {
        address addr = address(this);
        IERC20 dai = _dai;
        uint daiBalance = dai.balanceOf(addr);
        uint burnedInvestmentTokens = underlyingToInvestmentToken(amount);

        if(daiBalance < amount) {
            // If we currently do not hold enough Dai, we need to redeem some cDai
            // Subtraction needs no SafeMath due to the if condition
            require(_cDai.redeemUnderlying(amount - daiBalance) == 0, "redeem");
        }

        _totalInvestmentTokens = _totalInvestmentTokens.sub(burnedInvestmentTokens);
        require(dai.transfer(recipient, amount), "dai-transfer");

        return burnedInvestmentTokens;
    }

    /**
     * Supplies Dai held by this contract to Compound
     * No access restrictions on purpose
     */
    function supplyDaiToCompound() external {
        address addr = address(this);
        IERC20 dai = _dai;
        ICToken cDai = _cDai;
        uint balance = dai.balanceOf(addr);

        require(dai.approve(address(cDai), balance), "dai-cdai-approve");
        require(cDai.mint(balance) == 0, "cdai-mint");
    }

    /**
     * Converts an amount of Dai to an amount of investment tokens (shares)
     *
     * @param underlyingAmount The amount of Dai
     *
     * @return The amount of investment tokens (shares)
     */
    function underlyingToInvestmentToken(uint underlyingAmount) public override view returns (uint) {
        address addr = address(this);
        ICToken cDai = _cDai;
        uint totalDai = _dai.balanceOf(addr).add(cDaiToDai(cDai, cDai.balanceOf(addr)));

        if(totalDai == 0) {
            return 0;
        }

        return underlyingAmount.mul(_totalInvestmentTokens).div(totalDai);
    }

    /**
     * Converts an amount of investment tokens (shares) to an amount of Dai
     *
     * @param investmentTokenAmount The amount of investment tokens (shares)
     *
     * @return The amount of Dai
     */
    function investmentTokenToUnderlying(uint investmentTokenAmount) external override view returns (uint) {
        address addr = address(this);
        ICToken cDai = _cDai;
        uint totalDai = _dai.balanceOf(addr).add(cDaiToDai(cDai, cDai.balanceOf(addr)));
        uint totalInvestmentTokens = _totalInvestmentTokens;

        if(totalInvestmentTokens == 0) {
            return 0;
        }

        return totalDai.mul(investmentTokenAmount).div(totalInvestmentTokens);
    }

    /**
     * Converts an amount of Dai to cDai
     *
     * @param cDai The cDai address
     * @param daiAmount The amount of Dai
     *
     * @return The amount of cDai
     */
    function daiToCDai(ICToken cDai, uint daiAmount) internal view returns (uint) {
        return divScalarByExpTruncate(daiAmount, cDai.exchangeRateStored());
    }

    /**
     * Converts an amount of cDai to Dai
     *
     * @param cDai The cDai address
     * @param cDaiAmount The amount of cDai
     *
     * @return The amount of Dai
     */
    function cDaiToDai(ICToken cDai, uint cDaiAmount) internal view returns (uint) {
        return mulScalarTruncate(cDaiAmount, cDai.exchangeRateStored());
    }
}
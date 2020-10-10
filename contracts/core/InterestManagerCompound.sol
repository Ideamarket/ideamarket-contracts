// SPDX-License-Identifier: MIT
pragma solidity ^0.6.9;

import "./IInterestManager.sol";
import "../util/Ownable.sol";
import "../compound/ICToken.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

/**
 * @title InterestManagerCompound
 * @author Alexander Schlindwein
 *
 * @dev Manages DAI investments into Compound. Sits behind a proxy
 */
contract InterestManagerCompound is Ownable, Initializable {

    using SafeMath for uint;

    IERC20 private _dai;
    ICToken private _cDai;
    IERC20 private _comp;
    address private _compRecipient;

    mapping(address => uint) _donatedDai;

    /**
     * @dev Initializes the contract
     *
     * @param owner The owner of the contract
     * @param dai The Dai token address
     * @param cDai The cDai token address
     * @param comp The Comp token address
     * @param compRecipient The address of the recipient of the Comp tokens
     */
    function initialize(address owner, address dai, address cDai, address comp, address compRecipient) external initializer {
        setOwnerInternal(owner);
        _dai = IERC20(dai);
        _cDai = ICToken(cDai);
        _comp = IERC20(comp);
        _compRecipient = compRecipient;
    }

    /**
     * @dev Invests a given amount of Dai into Compound
     *
     * @param amount The amount of Dai to invest
     *
     * @return The amount of minted cDai
     */
    function invest(uint amount) public returns (uint) {
        uint balanceBefore = _cDai.balanceOf(address(this));
        require(_dai.balanceOf(address(this)) >= amount, "invest: not enough dai");
        require(_dai.approve(address(_cDai), amount), "invest: dai approve cDai failed");
        require(_cDai.mint(amount) == 0, "invest: cDai mint failed");
        uint balanceAfter = _cDai.balanceOf(address(this));
        return balanceAfter.sub(balanceBefore);
    }

    /**
     * @dev Checks that the caller is the owner and delegates to redeemInternal
     *
     * @return The amount of burned cDai
     */
    function redeem(address recipient, uint amount) external onlyOwner returns (uint) {
        return redeemInternal(recipient, amount);
    }

    /**
     * @dev Redeem a given amount of Dai from Compound and sends it to the recipient
     *
     * @param recipient The recipient of the redeemed Dai
     * @param amount The amount of Dai to redeem
     *
     * @return The amount of burned cDai
     */
    function redeemInternal(address recipient, uint amount) internal returns (uint) {
        uint balanceBefore = _cDai.balanceOf(address(this));
        require(_cDai.redeemUnderlying(amount) == 0, "redeem: failed to redeem");
        uint balanceAfter = _cDai.balanceOf(address(this));
        require(_dai.transfer(recipient, amount), "redeem: dai transfer failed");
        return balanceBefore.sub(balanceAfter);
    }

    /**
     * @dev Redeem a given amount of cDai from Compound and sends Dai to the recipient
     *
     * @param recipient The recipient of the redeemed Dai
     * @param amount The amount of cDai to redeem
     *
     * @return The amount of redeemed Dai
     */
    function redeemInvestmentToken(address recipient, uint amount) external onlyOwner returns (uint) {
        uint balanceBefore = _dai.balanceOf(address(this));
        require(_cDai.redeem(amount) == 0, "redeemInvestmentToken: failed to redeem");
        uint redeemed = _dai.balanceOf(address(this)).sub(balanceBefore);
        require(_dai.transfer(recipient, redeemed), "redeemInvestmentToken: failed to transfer");
        return redeemed;
    }

    /**
     * @dev Accepts donated Dai and invests into Compound to generate interest
     *
     * @param amount The amount of Dai to donate
     */
    function donateInterest(uint amount) external {
        require(_dai.allowance(msg.sender, address(this)) >= amount, "donateInterest: not enough allowance");
        require(_dai.transferFrom(msg.sender, address(this), amount), "donateInterest: dai transfer failed");
        _donatedDai[msg.sender] = _donatedDai[msg.sender].add(amount);
        invest(amount);
    }

    /**
     * @dev Redeems donated Dai back to the donator without generated interest
     *
     * @param amount The amount of Dai to redeem
     */
    function redeemDonated(uint amount) external {
        require(_donatedDai[msg.sender] >= amount, "redeemDonated: not enough donated");
        _donatedDai[msg.sender] = _donatedDai[msg.sender].sub(amount);
        redeemInternal(msg.sender, amount);
    }

    /**
     * @dev Updates accrued interest on the invested Dai
     */
    function accrueInterest() external {
        require(_cDai.accrueInterest() == 0, "accrueInterest: failed to accrue interest");
    }

    /**
     * @dev Withdraws the generated Comp tokens to the Comp recipient
     */
    function withdrawComp() external {
        require(_comp.transfer(_compRecipient, _comp.balanceOf(address(this))), "redeemComp: transfer failed");
    }

    /**
     * @dev Returns the exchange rate cDai -> Dai
     *
     * @return The exchange rate cDai -> Dai
     */
    function getExchangeRate() external view returns (uint) {
        return _cDai.exchangeRateStored();
    }
}
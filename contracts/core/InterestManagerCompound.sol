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
     */
    function invest(uint amount) public {
        require(_dai.balanceOf(address(this)) >= amount, "invest: not enough dai");
        require(_dai.approve(address(_cDai), amount), "invest: dai approve cDai failed");
        require(_cDai.mint(amount) == 0, "invest: cDai mint failed");
    }

    /**
     * @dev Checks that the caller is the owner and delegates to redeemInternal
     */
    function redeem(address recipient, uint amount) external onlyOwner {
        redeemInternal(recipient, amount);
    }

    /**
     * @dev Redeem a given amount of Dai from Compound and sends it to the recipient
     *
     * @param recipient The recipient of the redeemed Dai
     * @param amount The amount of Dai to redeem
     */
    function redeemInternal(address recipient, uint amount) internal {
        require(_cDai.redeemUnderlying(amount) == 0, "redeem: failed to redeem");
        require(_dai.transfer(recipient, amount), "redeem: dai transfer failed");
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
     * @dev Sends the generated Comp tokens to the Comp recipient
     */
    function redeemComp() external {
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
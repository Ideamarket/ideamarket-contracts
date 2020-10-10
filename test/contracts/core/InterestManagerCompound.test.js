const { expectRevert } = require('@openzeppelin/test-helpers');
const InterestManagerCompound = artifacts.require('InterestManagerCompound')
const TestCDai = artifacts.require('TestCDai')
const TestERC20 = artifacts.require('TestERC20')

const BN = web3.utils.BN

contract('core/InterestManagerCompound', async accounts => {

    const zero = new BN('0')
    const tenPow18 = new BN('10').pow(new BN('18'))

    const userAccount = accounts[0]
    const adminAccount = accounts[1]
    const compRecipient = accounts[2]

    let interestManagerCompound
    let cDai
    let dai
    let comp

    beforeEach(async () => {
        dai = await TestERC20.new('DAI', 'DAI')
        comp = await TestERC20.new('COMP', 'COMP')
        cDai = await TestCDai.new(dai.address, comp.address)
        await cDai.setExchangeRate(tenPow18)
        interestManagerCompound = await InterestManagerCompound.new()
        await interestManagerCompound.initialize(
            adminAccount,
            dai.address,
            cDai.address,
            comp.address,
            compRecipient
        )
    })

    it('admin is owner', async () => {
        assert.equal(adminAccount, await interestManagerCompound.getOwner())
    })

    it('can invest', async () => {
        await dai.mint(userAccount, tenPow18)
        await dai.transfer(interestManagerCompound.address, tenPow18)
        await interestManagerCompound.invest(tenPow18)
        assert.isTrue(zero.eq(await dai.balanceOf(userAccount)))
        assert.isTrue(tenPow18.eq(await dai.balanceOf(cDai.address)))
        assert.isTrue(tenPow18.eq(await cDai.balanceOf(interestManagerCompound.address)))
    })

    it('invest fails when too few dai', async () => {
        await expectRevert(
            interestManagerCompound.invest(tenPow18),
            'invest: not enough dai'
        )
    })

    it('can redeem', async () => {
        await dai.mint(userAccount, tenPow18)
        await dai.transfer(interestManagerCompound.address, tenPow18)
        await interestManagerCompound.invest(tenPow18)

        const redeemAmount = tenPow18.div(new BN('2'))
        await interestManagerCompound.redeem(
            adminAccount,
            redeemAmount,
            { from: adminAccount }
        )

        assert.isTrue(redeemAmount.eq(await dai.balanceOf(adminAccount)))
        assert.isTrue(tenPow18.sub(redeemAmount).eq(await cDai.balanceOf(interestManagerCompound.address)))
    })

    it('redeem fails when non-admin calls', async () => {
        await dai.mint(userAccount, tenPow18)
        await dai.transfer(interestManagerCompound.address, tenPow18)
        await interestManagerCompound.invest(tenPow18)

        const redeemAmount = tenPow18.div(new BN('2'))
        await expectRevert(
            interestManagerCompound.redeem(
                adminAccount,
                redeemAmount
            ),
            'Ownable: onlyOwner'
        )
    })

    it('can donate interest and redeem donated dai', async () => {
        await dai.mint(userAccount, tenPow18)
        await dai.approve(interestManagerCompound.address, tenPow18)
        await interestManagerCompound.donateInterest(tenPow18)
        assert.isTrue(zero.eq(await dai.balanceOf(userAccount)))
        assert.isTrue(tenPow18.eq(await dai.balanceOf(cDai.address)))
        assert.isTrue(tenPow18.eq(await cDai.balanceOf(interestManagerCompound.address)))

        await interestManagerCompound.redeemDonated(tenPow18)
        assert.isTrue(tenPow18.eq(await dai.balanceOf(userAccount)))
        assert.isTrue(zero.eq(await dai.balanceOf(cDai.address)))
        assert.isTrue(zero.eq(await cDai.balanceOf(interestManagerCompound.address)))
    })

    it('donate fails when too few dai', async () => {
        await dai.approve(interestManagerCompound.address, tenPow18)
        await expectRevert(
            interestManagerCompound.donateInterest(tenPow18),
            'ERC20: transfer amount exceeds balance'
        )
    })
    
    it('cannot redeem more than donated', async () => {
        await dai.mint(userAccount, tenPow18)
        await dai.approve(interestManagerCompound.address, tenPow18)
        await interestManagerCompound.donateInterest(tenPow18)

        await expectRevert(
            interestManagerCompound.redeemDonated(tenPow18.mul(new BN('2'))),
            'redeemDonated: not enough donated'
        )
    })

    it('can withdraw COMP', async () => {
        await dai.mint(userAccount, tenPow18)
        await dai.approve(interestManagerCompound.address, tenPow18)
        await interestManagerCompound.donateInterest(tenPow18)

        const compBalance = await comp.balanceOf(interestManagerCompound.address)
        await interestManagerCompound.withdrawComp()
        assert.isTrue((await comp.balanceOf(interestManagerCompound.address)).eq(new BN('0')))
        assert.isTrue((await comp.balanceOf(compRecipient)).eq(compBalance))
    })
})
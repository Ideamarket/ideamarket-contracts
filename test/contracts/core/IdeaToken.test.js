const { expectRevert } = require('@openzeppelin/test-helpers');
const IdeaToken = artifacts.require('IdeaToken')

const BN = web3.utils.BN

contract('core/IdeaToken', async accounts => {

    const tenPow18 = new BN('10').pow(new BN('18'))

    const userAccount = accounts[0]
    const otherUserAccount = accounts[1]
    const adminAccount = accounts[2]

    let ideaToken

    beforeEach(async () => {
        ideaToken = await IdeaToken.new('name', 'symbol', { from: adminAccount })
    })

    it('admin is owner', async () => {
        assert.equal(adminAccount, await ideaToken.getOwner())
    })

    it('admin can mint tokens', async () => {
        await ideaToken.mint(userAccount, tenPow18, { from: adminAccount })
        assert.isTrue(tenPow18.eq(await ideaToken.balanceOf(userAccount)))
    })

    it('admin can burn tokens', async () => {
        await ideaToken.mint(userAccount, tenPow18, { from: adminAccount })
        assert.isTrue(tenPow18.eq(await ideaToken.balanceOf(userAccount)))
        await ideaToken.burn(userAccount, tenPow18, { from: adminAccount })
        assert.isTrue(new BN('0').eq(await ideaToken.balanceOf(userAccount)))
    })

    it('normal user cannot mint tokens', async () => {
        await expectRevert(
            ideaToken.mint(userAccount, tenPow18, { from: userAccount }),
            'Ownable: onlyOwner'
        )
    })

    it('normal user cannot burn tokens', async () => {
        await ideaToken.mint(userAccount, tenPow18, { from: adminAccount })
        assert.isTrue(tenPow18.eq(await ideaToken.balanceOf(userAccount)))
        await expectRevert(
            ideaToken.burn(userAccount, tenPow18, { from: userAccount }),
            'Ownable: onlyOwner'
        )
    })

    it('user can transfer tokens', async () => {
        await ideaToken.mint(userAccount, tenPow18, { from: adminAccount })
        assert.isTrue(tenPow18.eq(await ideaToken.balanceOf(userAccount)))
        await ideaToken.transfer(otherUserAccount, tenPow18)
        assert.isTrue(new BN('0').eq(await ideaToken.balanceOf(userAccount)))
        assert.isTrue(tenPow18.eq(await ideaToken.balanceOf(otherUserAccount)))
    })

    it('user can approve other user', async () => {
        await ideaToken.mint(userAccount, tenPow18, { from: adminAccount })
        assert.isTrue(tenPow18.eq(await ideaToken.balanceOf(userAccount)))
        await ideaToken.approve(otherUserAccount, tenPow18)
        assert.isTrue(tenPow18.eq(await ideaToken.allowance(userAccount, otherUserAccount)))
        await ideaToken.transferFrom(userAccount, otherUserAccount, tenPow18, { from: otherUserAccount })
        assert.isTrue(new BN('0').eq(await ideaToken.balanceOf(userAccount)))
        assert.isTrue(tenPow18.eq(await ideaToken.balanceOf(otherUserAccount)))
    })

    it('user can transfer other users tokens', async () => {
        await ideaToken.mint(userAccount, tenPow18, { from: adminAccount })
        assert.isTrue(tenPow18.eq(await ideaToken.balanceOf(userAccount)))
        await expectRevert(
            ideaToken.transferFrom(userAccount, otherUserAccount, tenPow18, { from: otherUserAccount }),
            'ERC20: transfer amount exceeds allowance'
        )
    })
})
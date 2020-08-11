const { expectRevert } = require('@openzeppelin/test-helpers');
const IdeaToken = artifacts.require('IdeaToken')

const BN = web3.utils.BN

contract('IdeaToken', async accounts => {

    const tenPow18 = new BN('10').pow(new BN('18'))

    const userAccount = accounts[0]
    const adminAccount = accounts[1]

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

    it('normal user cannot mint tokens', async () => {
        await expectRevert(
            ideaToken.mint(userAccount, tenPow18, { from: userAccount }),
            'Ownable: onlyOwner'
        )
    })

    it('admin can burn tokens', async () => {
        await ideaToken.mint(userAccount, tenPow18, { from: adminAccount })
        assert.isTrue(tenPow18.eq(await ideaToken.balanceOf(userAccount)))
        await ideaToken.burn(userAccount, tenPow18, { from: adminAccount })
        assert.isTrue(new BN('0').eq(await ideaToken.balanceOf(userAccount)))
    })

    it('normal user cannot burn tokens', async () => {
        await ideaToken.mint(userAccount, tenPow18, { from: adminAccount })
        assert.isTrue(tenPow18.eq(await ideaToken.balanceOf(userAccount)))
        await expectRevert(
            ideaToken.burn(userAccount, tenPow18, { from: userAccount }),
            'Ownable: onlyOwner'
        )
    })

})
const { time } = require('@openzeppelin/test-helpers')
const DSPause = artifacts.require('DSPause')
const IdeaTokenExchange = artifacts.require('IdeaTokenExchange')
const AuthorizePlatformFeeWithdrawerSpell = artifacts.require('AuthorizePlatformFeeWithdrawerSpell')

const BN = web3.utils.BN

contract('spells/AuthorizePlatformFeeWithdrawerSpell', async accounts => {

    let dsPause
    let dsPauseProxyAddress
    let spell
    let ideaTokenExchange

    const zeroAddress = '0x0000000000000000000000000000000000000000'
    const delay = 86400
    const adminAccount = accounts[0]
    const withdrawer = accounts[1]

    before(async () => {
        dsPause = await DSPause.new(delay, adminAccount)
        dsPauseProxyAddress = await dsPause._proxy()
        spell = await AuthorizePlatformFeeWithdrawerSpell.new()
        ideaTokenExchange = await IdeaTokenExchange.new()

        await ideaTokenExchange.initialize(dsPauseProxyAddress,
                                           zeroAddress,
                                           zeroAddress,
                                           zeroAddress,
                                           { from: adminAccount })
    })

    it('can set new platform fee withdrawer', async () => {
        const eta = new BN((parseInt(await time.latest()) + delay + 100).toString())
        const tag = await dsPause.soul(spell.address)

        const fax = spell.contract.methods.execute(ideaTokenExchange.address, '1', withdrawer).encodeABI()

        await dsPause.plot(spell.address, tag, fax, eta)
        await time.increaseTo(eta.add(new BN('1')))
        await dsPause.exec(spell.address, tag, fax, eta)
    })
})
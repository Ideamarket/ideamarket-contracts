const { time } = require('@openzeppelin/test-helpers')
const DSPause = artifacts.require('DSPause')
const SetTimelockDelaySpell = artifacts.require('SetTimelockDelaySpell')

const BN = web3.utils.BN

contract('spells/SetTimelockDelaySpell', async accounts => {

    let dsPause
    let dsPauseProxyAddress
    let spell

    const delay = 86400
    const newDelay = delay * 2
    const adminAccount = accounts[0]

    before(async () => {
        dsPause = await DSPause.new(delay, adminAccount)
        dsPauseProxyAddress = await dsPause._proxy()
        spell = await SetTimelockDelaySpell.new()
    })

    it('can set new delay', async () => {
        const eta = new BN((parseInt(await time.latest()) + delay + 100).toString())
        const tag = await dsPause.soul(spell.address)

        const fax = spell.contract.methods.execute(dsPause.address, newDelay).encodeABI()

        await dsPause.plot(spell.address, tag, fax, eta)
        await time.increaseTo(eta.add(new BN('1')))
        await dsPause.exec(spell.address, tag, fax, eta)

        assert.isTrue((await dsPause._delay()).eq(new BN(newDelay)))
    })
})
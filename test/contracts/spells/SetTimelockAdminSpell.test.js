const { time } = require('@openzeppelin/test-helpers')
const DSPause = artifacts.require('DSPause')
const SetTimelockAdminSpell = artifacts.require('SetTimelockAdminSpell')

const BN = web3.utils.BN

contract('spells/SetTimelockAdminSpell', async accounts => {

    let dsPause
    let dsPauseProxyAddress
    let spell

    const delay = 86400
    const adminAccount = accounts[0]
    const newAdminAccount = accounts[1]

    before(async () => {
        dsPause = await DSPause.new(delay, adminAccount)
        dsPauseProxyAddress = await dsPause._proxy()
        spell = await SetTimelockAdminSpell.new()
    })

    it('can set new admin', async () => {
        const eta = new BN((parseInt(await time.latest()) + delay + 100).toString())
        const tag = await dsPause.soul(spell.address)

        const fax = spell.contract.methods.execute(dsPause.address, newAdminAccount).encodeABI()

        await dsPause.plot(spell.address, tag, fax, eta)
        await time.increaseTo(eta.add(new BN('1')))
        await dsPause.exec(spell.address, tag, fax, eta)

        assert.isTrue((await dsPause._owner()).toString() == newAdminAccount)
    })
})
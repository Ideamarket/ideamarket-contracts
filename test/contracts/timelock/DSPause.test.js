const { expectRevert, time } = require('@openzeppelin/test-helpers')
const DSPause = artifacts.require('DSPause')
// We use the AddMarketSpell to test the DSPause
const AddMarketSpell = artifacts.require('AddMarketSpell')
const IdeaTokenFactory = artifacts.require('IdeaTokenFactory')

const BN = web3.utils.BN

contract('timelock/DSPause', async accounts => {

    let dsPause
    let dsPauseProxyAddress
    let spell

    const delay = 86400
    const zeroAddress = '0x0000000000000000000000000000000000000000'
    const someAddress = '0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8' // random addr from etherscan
    const adminAccount = accounts[0]
    const userAccount = accounts[1]
    
    beforeEach(async () => {
        dsPause = await DSPause.new(delay, adminAccount)
        dsPauseProxyAddress = await dsPause._proxy()
        spell = await AddMarketSpell.new()
    })

    it('admin and user cannot set owner', async () => {
        await expectRevert(dsPause.setOwner(someAddress, { from: adminAccount }), 'ds-pause-undelayed-call')
        await expectRevert(dsPause.setOwner(someAddress, { from: userAccount }), 'ds-pause-undelayed-call')
    })

    it('admin and user cannot set delay', async () => {
        await expectRevert(dsPause.setDelay(new BN('0'), { from: adminAccount }), 'ds-pause-undelayed-call')
        await expectRevert(dsPause.setDelay(new BN('0'), { from: userAccount }), 'ds-pause-undelayed-call')
    })

    it('admin can plot and drop', async () => {
        const eta = new BN((parseInt(await time.latest()) + delay + 100).toString())
        const tag = await dsPause.soul(spell.address)
        await dsPause.plot(spell.address, tag, [], eta)
        await dsPause.drop(spell.address, tag, [], eta)
    })

    it('admin can plot and exec', async () => {
        const eta = new BN((parseInt(await time.latest()) + delay + 100).toString())
        const tag = await dsPause.soul(spell.address)

        const factory = await IdeaTokenFactory.new()
        await factory.initialize(dsPauseProxyAddress, zeroAddress)
    
        // For some reason web3 doesnt want BNs here
        const fax = spell.contract.methods.execute(factory.address, 'SOME_MARKET', zeroAddress,
                                                   '1', '1', '1',
                                                   '0', '0').encodeABI()

        await dsPause.plot(spell.address, tag, fax, eta)
        await time.increaseTo(eta.add(new BN('1')))
        await dsPause.exec(spell.address, tag, fax, eta)
    })

    it('user cannot plot', async () => {
        const eta = new BN((parseInt(await time.latest()) + delay + 100).toString())
        const tag = await dsPause.soul(spell.address)
        await expectRevert(
            dsPause.plot(spell.address, tag, [], eta, { from: userAccount }),
            'ds-pause-unauthorized'  
        )
    })

    it('user cannot drop', async () => {
        const eta = new BN((parseInt(await time.latest()) + delay + 100).toString())
        const tag = await dsPause.soul(spell.address)
        await dsPause.plot(spell.address, tag, [], eta)
        await expectRevert(
            dsPause.drop(spell.address, tag, [], eta, { from: userAccount }),
            'ds-pause-unauthorized'  
        )
    })

    it('user cannot exec', async () => {
        const eta = new BN((parseInt(await time.latest()) + delay + 100).toString())
        const tag = await dsPause.soul(spell.address)
        await dsPause.plot(spell.address, tag, [], eta)
        await expectRevert(
            dsPause.exec(spell.address, tag, [], eta, { from: userAccount }),
            'ds-pause-unauthorized'  
        )
    })

    it('cannot exec unplotted', async () => {
        const eta = new BN((parseInt(await time.latest()) + delay + 100).toString())
        const tag = await dsPause.soul(spell.address)
        await dsPause.plot(spell.address, tag, [], eta)
        await expectRevert(
            dsPause.exec(spell.address, tag, [], eta.add(new BN('1'))), // wrong eta
            'ds-pause-unplotted-plan'  
        )
    })

    it('cannot exec premature', async () => {
        const eta = new BN((parseInt(await time.latest()) + delay + 100).toString())
        const tag = await dsPause.soul(spell.address)
        await dsPause.plot(spell.address, tag, [], eta)
        await expectRevert(
            dsPause.exec(spell.address, tag, [], eta),
            'ds-pause-premature-exec'  
        )
    })
})
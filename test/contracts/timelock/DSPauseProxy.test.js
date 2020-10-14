const { expectRevert, time } = require('@openzeppelin/test-helpers')
const DSPause = artifacts.require('DSPause')
const DSPauseProxy = artifacts.require('DSPauseProxy')
// We use the AddMarketSpell to test the DSPause
const AddMarketSpell = artifacts.require('AddMarketSpell')

const BN = web3.utils.BN

contract('timelock/DSPause', async accounts => {

	let dsPause
	let dsPauseProxy
	let spell

	const delay = 86400
	const zeroAddress = '0x0000000000000000000000000000000000000000'
	const adminAccount = accounts[0]
    
	beforeEach(async () => {
		dsPause = await DSPause.new(delay, adminAccount)
		dsPauseProxy = await DSPauseProxy.at(await dsPause._proxy())
		spell = await AddMarketSpell.new()
	})

	it('fail unauthorized exec', async () => {
		await expectRevert(dsPauseProxy.exec(zeroAddress, []), 'ds-pause-proxy-unauthorized')
	})

	it('fail delegatecall error', async () => {
		const eta = new BN((parseInt(await time.latest()) + delay + 100).toString())
		const tag = await dsPause.soul(spell.address)
    
		const fax = spell.contract.methods.execute(zeroAddress, 'SOME_MARKET', zeroAddress, // zero for factory addr
			'1', '1', '1',
			'0', '0').encodeABI()

		await dsPause.plot(spell.address, tag, fax, eta)
		await time.increaseTo(eta.add(new BN('1')))
		await expectRevert(
			dsPause.exec(spell.address, tag, fax, eta),
			'ds-pause-delegatecall-error'
		)
	})
})
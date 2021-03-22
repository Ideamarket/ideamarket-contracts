const { l2ethers: ethers } = require('hardhat')
const { waitForTx, expectRevert } = require('../../utils/tx')
const time = require('../../utils/time')

describe('ovm/timelock/DSPauseProxy', () => {
	let DSPause
	let DSPauseProxy
	let AddMarketSpell

	let dsPause
	let dsPauseProxy
	let spell

	const delay = 0
	const zeroAddress = '0x0000000000000000000000000000000000000000'
	let adminAccount

	before(async () => {
		const accounts = await ethers.getSigners()
		adminAccount = accounts[0]

		DSPause = await ethers.getContractFactory('DSPauseOVM')
		DSPauseProxy = await ethers.getContractFactory('DSPauseProxy')
		AddMarketSpell = await ethers.getContractFactory('AddMarketSpell')
	})

	beforeEach(async () => {
		dsPause = await DSPause.deploy()
		await dsPause.deployed()
		await waitForTx(dsPause.initialize(delay, adminAccount.address))

		dsPauseProxy = new ethers.Contract(await dsPause._proxy(), DSPauseProxy.interface, DSPauseProxy.signer)

		spell = await AddMarketSpell.deploy()
		await spell.deployed()
	})

	it('fail unauthorized exec', async () => {
		await expectRevert(dsPauseProxy.exec(zeroAddress, []))
	})

	it('fail delegatecall error', async () => {
		const eta = await time.latest()
		const tag = await dsPause.soul(spell.address)

		const fax = spell.interface.encodeFunctionData('execute', [
			zeroAddress,
			'SOME_MARKET',
			zeroAddress,
			'1',
			'1',
			'1',
			'0',
			'0',
			false,
		])

		await waitForTx(dsPause.plot(spell.address, tag, fax, eta))
		await expectRevert(dsPause.exec(spell.address, tag, fax, eta))
	})
})

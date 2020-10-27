const { time } = require('@openzeppelin/test-helpers')
const { expect } = require('chai')
const { BigNumber } = require('ethers')
const { ethers } = require('hardhat')

describe('timelock/DSPauseProxy', () => {
	let DSPause
	let DSPauseProxy
	let AddMarketSpell

	let dsPause
	let dsPauseProxy
	let spell

	const delay = 86400
	const zeroAddress = '0x0000000000000000000000000000000000000000'
	let adminAccount

	before(async () => {
		const accounts = await ethers.getSigners()
		adminAccount = accounts[0]

		DSPause = await ethers.getContractFactory('DSPause')
		DSPauseProxy = await ethers.getContractFactory('DSPauseProxy')
		AddMarketSpell = await ethers.getContractFactory('AddMarketSpell')
	})

	beforeEach(async () => {
		dsPause = await DSPause.deploy(delay, adminAccount.address)
		await dsPause.deployed()

		dsPauseProxy = new ethers.Contract(await dsPause._proxy(), DSPauseProxy.interface, DSPauseProxy.signer)

		spell = await AddMarketSpell.deploy()
		await spell.deployed()
	})

	it('fail unauthorized exec', async () => {
		await expect(dsPauseProxy.exec(zeroAddress, [])).to.be.revertedWith('ds-pause-proxy-unauthorized')
	})

	it('fail delegatecall error', async () => {
		const eta = BigNumber.from((parseInt(await time.latest()) + delay + 100).toString())
		const tag = await dsPause.soul(spell.address)

		const fax = spell.interface.encodeFunctionData('execute', [
			zeroAddress,
			'SOME_MARKET',
			zeroAddress,
			'1',
			'1',
			'0',
			'0',
		])

		await dsPause.plot(spell.address, tag, fax, eta)
		await time.increaseTo(eta.add(BigNumber.from('1')).toString())
		await expect(dsPause.exec(spell.address, tag, fax, eta)).to.be.revertedWith('ds-pause-delegatecall-error')
	})
})

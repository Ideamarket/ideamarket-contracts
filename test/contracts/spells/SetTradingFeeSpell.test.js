const { time } = require('@openzeppelin/test-helpers')
const { expect } = require('chai')
const { BigNumber } = require('ethers')
const { ethers } = require('hardhat')

describe('spells/SetTradingFeeSpell', () => {
	let DSPause
	let SetTradingFeeSpell
	let IdeaTokenFactory

	let dsPause
	let dsPauseProxyAddress
	let spell

	const delay = 86400
	const zeroAddress = '0x0000000000000000000000000000000000000000'
	let adminAccount

	const marketName = 'SOME_MARKET'
	const nameVerifierAddress = zeroAddress
	const baseCost = '1'
	const priceRise = '1'
	const hatchTokens = '1'
	const tradingFeeRate = '2'
	const platformFeeRate = '3'

	before(async () => {
		const accounts = await ethers.getSigners()
		adminAccount = accounts[0]

		DSPause = await ethers.getContractFactory('DSPause')
		SetTradingFeeSpell = await ethers.getContractFactory('SetTradingFeeSpell')
		IdeaTokenFactory = await ethers.getContractFactory('IdeaTokenFactory')

		dsPause = await DSPause.deploy(delay, adminAccount.address)
		await dsPause.deployed()
		dsPauseProxyAddress = await dsPause._proxy()

		spell = await SetTradingFeeSpell.deploy()
		await spell.deployed()
	})

	it('can set trading fee', async () => {
		const factory = await IdeaTokenFactory.deploy()
		await factory.deployed()
		await factory.initialize(adminAccount.address, zeroAddress)

		await factory.addMarket(
			marketName,
			nameVerifierAddress,
			baseCost,
			priceRise,
			hatchTokens,
			tradingFeeRate,
			platformFeeRate,
			false
		)

		await factory.setOwner(dsPauseProxyAddress)

		const eta = BigNumber.from((parseInt(await time.latest()) + delay + 100).toString())
		const tag = await dsPause.soul(spell.address)

		const fax = spell.interface.encodeFunctionData('execute', [factory.address, '1', '123'])

		await dsPause.plot(spell.address, tag, fax, eta)
		await time.increaseTo(eta.add(BigNumber.from('1')).toString())
		await dsPause.exec(spell.address, tag, fax, eta)

		const tradingFee = (await factory.getMarketDetailsByID('1')).tradingFeeRate

		expect(tradingFee.eq(BigNumber.from('123'))).to.be.true
	})
})

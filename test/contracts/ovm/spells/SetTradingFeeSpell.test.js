const { expect } = require('chai')
const { BigNumber } = require('ethers')
const { l2ethers: ethers } = require('hardhat')
const { waitForTx } = require('../../utils/tx')
const time = require('../../utils/time')

describe('ovm/spells/SetTradingFeeSpell', () => {
	let DSPause
	let SetTradingFeeSpell
	let IdeaTokenFactory

	let dsPause
	let dsPauseProxyAddress
	let spell

	const delay = 0
	const oneAddress = '0x0000000000000000000000000000000000000001'
	let adminAccount

	const marketName = 'SOME_MARKET'
	const nameVerifierAddress = oneAddress
	const baseCost = '1'
	const priceRise = '1'
	const hatchTokens = '1'
	const tradingFeeRate = '2'
	const platformFeeRate = '3'

	before(async () => {
		const accounts = await ethers.getSigners()
		adminAccount = accounts[0]

		DSPause = await ethers.getContractFactory('DSPauseOVM')
		SetTradingFeeSpell = await ethers.getContractFactory('SetTradingFeeSpell')
		IdeaTokenFactory = await ethers.getContractFactory('IdeaTokenFactoryOVM')

		dsPause = await DSPause.deploy()
		await dsPause.deployed()
		await waitForTx(dsPause.initialize(delay, adminAccount.address))
		dsPauseProxyAddress = await dsPause._proxy()

		spell = await SetTradingFeeSpell.deploy()
		await spell.deployed()
	})

	it('can set trading fee', async () => {
		const factory = await IdeaTokenFactory.deploy()
		await factory.deployed()
		await waitForTx(factory.initialize(adminAccount.address, oneAddress, oneAddress, oneAddress))

		await waitForTx(
			factory.addMarket(
				marketName,
				nameVerifierAddress,
				baseCost,
				priceRise,
				hatchTokens,
				tradingFeeRate,
				platformFeeRate,
				false
			)
		)

		await waitForTx(factory.setOwner(dsPauseProxyAddress))

		const eta = await time.latest()
		const tag = await dsPause.soul(spell.address)

		const fax = spell.interface.encodeFunctionData('execute', [factory.address, '1', '123'])

		await waitForTx(dsPause.plot(spell.address, tag, fax, eta))
		await waitForTx(dsPause.exec(spell.address, tag, fax, eta))

		const tradingFee = (await factory.getMarketDetailsByID('1')).tradingFeeRate

		expect(tradingFee.eq(BigNumber.from('123'))).to.be.true
	})
})

const { expect } = require('chai')
const { BigNumber } = require('ethers')
const { l2ethers: ethers } = require('hardhat')
const time = require('../../utils/time')

describe('ovm/spells/SetPlatformFeeSpell', () => {
	let DSPause
	let SetPlatformFeeSpell
	let IdeaTokenFactory

	let dsPause
	let dsPauseProxyAddress
	let spell

	const delay = 86400
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

		DSPause = await ethers.getContractFactory('DSPause')
		SetPlatformFeeSpell = await ethers.getContractFactory('SetPlatformFeeSpell')
		IdeaTokenFactory = await ethers.getContractFactory('IdeaTokenFactoryOVM')

		dsPause = await DSPause.deploy(delay, adminAccount.address)
		await dsPause.deployed()
		dsPauseProxyAddress = await dsPause._proxy()

		spell = await SetPlatformFeeSpell.deploy()
		await spell.deployed()
	})

	it('can set platform fee', async () => {
		const factory = await IdeaTokenFactory.deploy()
		await factory.deployed()
		await factory.initialize(adminAccount.address, oneAddress, oneAddress, oneAddress)

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

		const fax = spell.interface.encodeFunctionData('execute', [
			factory.address,
			BigNumber.from('1'),
			BigNumber.from('123'),
		])

		await dsPause.plot(spell.address, tag, fax, eta)
		await time.increaseTo(eta.add(BigNumber.from('1')).toString())
		await dsPause.exec(spell.address, tag, fax, eta)

		const tradingFee = (await factory.getMarketDetailsByID(BigNumber.from('1'))).platformFeeRate

		expect(tradingFee.eq(BigNumber.from('123'))).to.be.true
	})
})

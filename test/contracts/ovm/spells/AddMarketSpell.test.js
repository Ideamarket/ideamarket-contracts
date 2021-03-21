const { expect } = require('chai')
const { BigNumber } = require('ethers')
const { l2ethers: ethers } = require('hardhat')

const time = require('../../utils/time')
const { expectRevert, waitForTx } = require('../../utils/tx')

describe('ovm/spells/AddMarketSpell', () => {
	let DSPause
	let AddMarketSpell
	let IdeaTokenFactory

	let dsPause
	let dsPauseProxyAddress
	let spell

	const delay = 5
	const oneAddress = '0x0000000000000000000000000000000000000001'
	let adminAccount

	const marketName = 'SOME_MARKET'
	const nameVerifierAddress = oneAddress
	const baseCost = BigNumber.from('1')
	const priceRise = BigNumber.from('1')
	const hatchTokens = BigNumber.from('1')
	const tradingFeeRate = BigNumber.from('0')
	const platformFeeRate = BigNumber.from('0')

	before(async () => {
		const accounts = await ethers.getSigners()
		adminAccount = accounts[0].address

		DSPause = await ethers.getContractFactory('DSPauseOVM')
		dsPause = await DSPause.deploy()
		await dsPause.deployed()
		await waitForTx(dsPause.initialize(delay, adminAccount))
		dsPauseProxyAddress = await dsPause._proxy()

		AddMarketSpell = await ethers.getContractFactory('AddMarketSpell')
		spell = await AddMarketSpell.deploy()
		await spell.deployed()

		IdeaTokenFactory = await ethers.getContractFactory('IdeaTokenFactoryOVM')
	})

	it('can add new market', async () => {
		const eta = BigNumber.from((parseInt(await time.latest()) + delay + 1).toString())
		const tag = await dsPause.soul(spell.address)
		const factory = await IdeaTokenFactory.deploy()
		await factory.deployed()
		await waitForTx(factory.initialize(dsPauseProxyAddress, oneAddress, oneAddress, oneAddress))

		const fax = spell.interface.encodeFunctionData('execute', [
			factory.address,
			marketName,
			nameVerifierAddress,
			baseCost,
			priceRise,
			hatchTokens,
			tradingFeeRate,
			platformFeeRate,
			false,
		])

		await waitForTx(dsPause.plot(spell.address, tag, fax, eta))
		await time.increaseTo(eta.add(BigNumber.from('1')).toString())
		console.log('execing')
		await waitForTx(dsPause.exec(spell.address, tag, fax, eta))
		console.log('done')
		expect(BigNumber.from('1').eq(await factory.getNumMarkets())).to.be.true
		expect(BigNumber.from('1').eq(await factory.getMarketIDByName(marketName))).to.be.true

		const marketDetails = await factory.getMarketDetailsByID(BigNumber.from('1'))

		expect(marketDetails.exists).to.be.true
		expect(marketDetails.id.eq(BigNumber.from('1'))).to.be.true
		expect(marketDetails.name).to.be.equal(marketName)
		expect(marketDetails.nameVerifier).to.be.equal(nameVerifierAddress)
		expect(marketDetails.numTokens.eq(BigNumber.from('0'))).to.be.true
		expect(marketDetails.baseCost.eq(baseCost)).to.be.true
		expect(marketDetails.priceRise.eq(priceRise)).to.be.true
		expect(marketDetails.hatchTokens.eq(hatchTokens)).to.be.true
		expect(marketDetails.tradingFeeRate.eq(tradingFeeRate)).to.be.true
		expect(marketDetails.platformFeeRate.eq(platformFeeRate)).to.be.true
	})
})

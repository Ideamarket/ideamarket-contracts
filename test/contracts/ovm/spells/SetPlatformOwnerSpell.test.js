const { BigNumber } = require('ethers')
const { l2ethers: ethers } = require('hardhat')
const time = require('../../utils/time')

describe('ovm/spells/SetPlatformOwnerSpell', () => {
	let DSPause
	let IdeaTokenExchange
	let SetPlatformOwnerSpell

	let dsPause
	let dsPauseProxyAddress
	let spell
	let ideaTokenExchange

	const oneAddress = '0x0000000000000000000000000000000000000001'
	const delay = 86400
	let adminAccount
	let withdrawer

	before(async () => {
		const accounts = await ethers.getSigners()
		adminAccount = accounts[0]
		withdrawer = accounts[1]

		DSPause = await ethers.getContractFactory('DSPause')
		IdeaTokenExchange = await ethers.getContractFactory('IdeaTokenExchangeOVM')
		SetPlatformOwnerSpell = await ethers.getContractFactory('SetPlatformOwnerSpell')

		dsPause = await DSPause.deploy(delay, adminAccount.address)
		await dsPause.deployed()
		dsPauseProxyAddress = await dsPause._proxy()

		spell = await SetPlatformOwnerSpell.deploy()
		await spell.deployed()

		ideaTokenExchange = await IdeaTokenExchange.deploy()
		await ideaTokenExchange.deployed()

		await ideaTokenExchange
			.connect(adminAccount)
			.initialize(dsPauseProxyAddress, oneAddress, oneAddress, oneAddress, oneAddress)
	})

	it('can set new platform owner', async () => {
		const eta = BigNumber.from((parseInt(await time.latest()) + delay + 100).toString())
		const tag = await dsPause.soul(spell.address)
		const fax = spell.interface.encodeFunctionData('execute', [
			ideaTokenExchange.address,
			BigNumber.from('1'),
			withdrawer.address,
		])

		await dsPause.plot(spell.address, tag, fax, eta)
		await time.increaseTo(eta.add(BigNumber.from('1')).toString())
		await dsPause.exec(spell.address, tag, fax, eta)
	})
})

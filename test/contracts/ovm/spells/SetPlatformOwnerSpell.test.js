const { BigNumber } = require('ethers')
const { l2ethers: ethers } = require('hardhat')
const { waitForTx } = require('../../utils/tx')
const { generateWallets } = require('../../utils/wallet')
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
	const delay = 0
	let adminAccount
	let withdrawer

	before(async () => {
		const accounts = await ethers.getSigners()
		adminAccount = accounts[0]
		;[withdrawer] = generateWallets(ethers, 1)

		DSPause = await ethers.getContractFactory('DSPauseOVM')
		IdeaTokenExchange = await ethers.getContractFactory('IdeaTokenExchangeOVM')
		SetPlatformOwnerSpell = await ethers.getContractFactory('SetPlatformOwnerSpell')

		dsPause = await DSPause.deploy()
		await dsPause.deployed()
		await waitForTx(dsPause.initialize(delay, adminAccount.address))
		dsPauseProxyAddress = await dsPause._proxy()

		spell = await SetPlatformOwnerSpell.deploy()
		await spell.deployed()

		ideaTokenExchange = await IdeaTokenExchange.deploy()
		await ideaTokenExchange.deployed()

		await waitForTx(
			ideaTokenExchange
				.connect(adminAccount)
				.initialize(dsPauseProxyAddress, oneAddress, oneAddress, oneAddress, oneAddress, oneAddress)
		)
	})

	it('can set new platform owner', async () => {
		const eta = await time.latest()
		const tag = await dsPause.soul(spell.address)
		const fax = spell.interface.encodeFunctionData('execute', [
			ideaTokenExchange.address,
			BigNumber.from('1'),
			withdrawer.address,
		])

		await waitForTx(dsPause.plot(spell.address, tag, fax, eta))
		await waitForTx(dsPause.exec(spell.address, tag, fax, eta))
	})
})

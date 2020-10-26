const { time } = require('@openzeppelin/test-helpers')
const { BigNumber } = require('ethers')
const { ethers } = require('hardhat')

describe('spells/AuthorizePlatformFeeWithdrawer', () => {

	let DSPause
	let IdeaTokenExchange
	let AuthorizePlatformFeeWithdrawerSpell

	let dsPause
	let dsPauseProxyAddress
	let spell
	let ideaTokenExchange

	const zeroAddress = '0x0000000000000000000000000000000000000000'
	const delay = 86400
	let adminAccount
	let withdrawer

	before(async () => {

		const accounts = await ethers.getSigners()
		adminAccount = accounts[0]
		withdrawer = accounts[1]

		DSPause = await ethers.getContractFactory('DSPause')
		IdeaTokenExchange = await ethers.getContractFactory('IdeaTokenExchange')
		AuthorizePlatformFeeWithdrawerSpell = await ethers.getContractFactory('AuthorizePlatformFeeWithdrawerSpell')

		dsPause = await DSPause.deploy(delay, adminAccount.address)
		await dsPause.deployed()
		dsPauseProxyAddress = await dsPause._proxy()

		spell = await AuthorizePlatformFeeWithdrawerSpell.deploy()
		await spell.deployed()

		ideaTokenExchange = await IdeaTokenExchange.deploy()
		await ideaTokenExchange.deployed()

		await ideaTokenExchange.connect(adminAccount).initialize(dsPauseProxyAddress,
			zeroAddress,
			zeroAddress,
			zeroAddress,
			zeroAddress)
	})

	it('can set new platform feee withdrawer', async () => {
		const eta = BigNumber.from((parseInt(await time.latest()) + delay + 100).toString())
		const tag = await dsPause.soul(spell.address)
		const fax = spell.interface.encodeFunctionData('execute', [ideaTokenExchange.address, BigNumber.from('1'), withdrawer.address])

		await dsPause.plot(spell.address, tag, fax, eta)
		await time.increaseTo(eta.add(BigNumber.from('1')).toString())
		await dsPause.exec(spell.address, tag, fax, eta)
	})
})
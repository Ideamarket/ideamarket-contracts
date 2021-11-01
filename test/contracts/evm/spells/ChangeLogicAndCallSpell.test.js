const { time } = require('@openzeppelin/test-helpers')
const { expect } = require('chai')
const { BigNumber } = require('ethers')
const { ethers } = require('hardhat')

describe('evm/spells/ChangeLogicAndCallSpell', () => {
	let DSPause
	let ChangeLogicAndCallSpell
	let IdeaTokenExchange
	let IdeaTokenExchangeStateTransfer
	let ProxyAdmin
	let AdminUpgradeabilityProxy

	let dsPause
	let dsPauseProxyAddress
	let spell
	let proxy
	let proxyAdmin

	const delay = 86400
	const oneAddress = '0x0000000000000000000000000000000000000001'
	let adminAccount

	before(async () => {
		const accounts = await ethers.getSigners()
		adminAccount = accounts[0].address

		DSPause = await ethers.getContractFactory('DSPause')
		dsPause = await DSPause.deploy(delay, adminAccount)
		await dsPause.deployed()
		dsPauseProxyAddress = await dsPause._proxy()

		ChangeLogicAndCallSpell = await ethers.getContractFactory('ChangeLogicAndCallSpell')
		spell = await ChangeLogicAndCallSpell.deploy()
		await spell.deployed()

		IdeaTokenExchangeStateTransfer = await ethers.getContractFactory('IdeaTokenExchangeStateTransfer')
		IdeaTokenExchange = await ethers.getContractFactory('IdeaTokenExchange')
		const logic = await IdeaTokenExchange.deploy()
		await logic.deployed()

		ProxyAdmin = await ethers.getContractFactory('ProxyAdmin')
		proxyAdmin = await ProxyAdmin.deploy(dsPauseProxyAddress)
		await proxyAdmin.deployed()

		AdminUpgradeabilityProxy = await ethers.getContractFactory('AdminUpgradeabilityProxy')
		const data = logic.interface.encodeFunctionData('initialize', [
			dsPauseProxyAddress,
			oneAddress,
			oneAddress,
			oneAddress,
			oneAddress,
		])
		proxy = await AdminUpgradeabilityProxy.deploy(logic.address, proxyAdmin.address, data)
		await proxy.deployed()
	})

	it('can change logic and call', async () => {
		const newLogic = await IdeaTokenExchangeStateTransfer.deploy()
		await newLogic.deployed()

		const calldata = newLogic.interface.encodeFunctionData('initializeStateTransfer', [
			oneAddress,
			oneAddress,
			oneAddress,
		])
		const fax = spell.interface.encodeFunctionData('execute', [
			proxyAdmin.address,
			proxy.address,
			newLogic.address,
			calldata,
		])

		const eta = BigNumber.from((parseInt(await time.latest()) + delay + 100).toString())
		const tag = await dsPause.soul(spell.address)

		await dsPause.plot(spell.address, tag, fax, eta)
		await time.increaseTo(eta.add(BigNumber.from('1')).toString())
		await dsPause.exec(spell.address, tag, fax, eta)
	})
})

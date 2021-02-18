const { time } = require('@openzeppelin/test-helpers')
const { expect } = require('chai')
const { BigNumber } = require('ethers')
const { ethers } = require('hardhat')

describe('spells/ChangeLogicAndCallSpell', () => {
	let DSPause
	let TestERC20
	let ChangeLogicAndCallSpell
	let InterestManagerCompound
	let InterestManagerCompoundV2
	let ProxyAdmin
	let AdminUpgradeabilityProxy

	let testERC20
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

		TestERC20 = await ethers.getContractFactory('TestERC20')
		testERC20 = await TestERC20.deploy('cDAI', 'cDAI')
		await testERC20.deployed()

		DSPause = await ethers.getContractFactory('DSPause')
		dsPause = await DSPause.deploy(delay, adminAccount)
		await dsPause.deployed()
		dsPauseProxyAddress = await dsPause._proxy()

		ChangeLogicAndCallSpell = await ethers.getContractFactory('ChangeLogicAndCallSpell')
		spell = await ChangeLogicAndCallSpell.deploy()
		await spell.deployed()

		InterestManagerCompound = await ethers.getContractFactory('InterestManagerCompound')
		const logic = await InterestManagerCompound.deploy()
		await logic.deployed()

		InterestManagerCompoundV2 = await ethers.getContractFactory('InterestManagerCompoundV2')

		ProxyAdmin = await ethers.getContractFactory('ProxyAdmin')
		proxyAdmin = await ProxyAdmin.deploy(dsPauseProxyAddress)
		await proxyAdmin.deployed()

		AdminUpgradeabilityProxy = await ethers.getContractFactory('AdminUpgradeabilityProxy')
		const data = logic.interface.encodeFunctionData('initialize', [
			oneAddress,
			oneAddress,
			testERC20.address,
			oneAddress,
			oneAddress,
		])
		proxy = await AdminUpgradeabilityProxy.deploy(logic.address, proxyAdmin.address, data)
		await proxy.deployed()
	})

	it('can change logic', async () => {
		const newLogic = await InterestManagerCompoundV2.deploy()
		await newLogic.deployed()
		const data = newLogic.interface.encodeFunctionData('initializeV2', [])

		const fax = spell.interface.encodeFunctionData('execute', [
			proxyAdmin.address,
			proxy.address,
			newLogic.address,
			data,
		])

		const eta = BigNumber.from((parseInt(await time.latest()) + delay + 100).toString())
		const tag = await dsPause.soul(spell.address)

		await dsPause.plot(spell.address, tag, fax, eta)
		await time.increaseTo(eta.add(BigNumber.from('1')).toString())
		await dsPause.exec(spell.address, tag, fax, eta)
	})
})

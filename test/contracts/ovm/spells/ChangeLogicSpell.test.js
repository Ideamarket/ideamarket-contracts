const { l2ethers: ethers } = require('hardhat')
const time = require('../../utils/time')
const { waitForTx } = require('../../utils/tx')

describe('ovm/spells/ChangeLogicSpell', () => {
	let DSPause
	let ChangeLogicSpell
	let IdeaTokenFactory
	let ProxyAdmin
	let AdminUpgradeabilityProxy

	let dsPause
	let dsPauseProxyAddress
	let spell
	let proxy
	let proxyAdmin

	const delay = 0
	const oneAddress = '0x0000000000000000000000000000000000000001'
	let adminAccount

	before(async () => {
		const accounts = await ethers.getSigners()
		adminAccount = accounts[0].address

		DSPause = await ethers.getContractFactory('DSPauseOVM')
		dsPause = await DSPause.deploy()
		await dsPause.deployed()
		await waitForTx(dsPause.initialize(delay, adminAccount))
		dsPauseProxyAddress = await dsPause._proxy()

		ChangeLogicSpell = await ethers.getContractFactory('ChangeLogicSpell')
		spell = await ChangeLogicSpell.deploy()
		await spell.deployed()

		IdeaTokenFactory = await ethers.getContractFactory('IdeaTokenFactoryOVM')
		const logic = await IdeaTokenFactory.deploy()
		await logic.deployed()

		ProxyAdmin = await ethers.getContractFactory('ProxyAdminOVM')
		proxyAdmin = await ProxyAdmin.deploy()
		await proxyAdmin.deployed()

		AdminUpgradeabilityProxy = await ethers.getContractFactory('AdminUpgradeabilityProxyOVM')
		const data = logic.interface.encodeFunctionData('initialize', [
			dsPauseProxyAddress,
			oneAddress,
			oneAddress,
			oneAddress,
		])
		proxy = await AdminUpgradeabilityProxy.deploy()
		await proxy.deployed()
		await waitForTx(proxy.initialize(logic.address, proxyAdmin.address, data))
	})

	it('can change logic', async () => {
		const newLogic = await IdeaTokenFactory.deploy()
		await newLogic.deployed()

		const fax = spell.interface.encodeFunctionData('execute', [proxyAdmin.address, proxy.address, newLogic.address])

		const eta = await time.latest()
		const tag = await dsPause.soul(spell.address)

		await dsPause.plot(spell.address, tag, fax, eta)
		await dsPause.exec(spell.address, tag, fax, eta)
	})
})

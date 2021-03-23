const { l2ethers: ethers } = require('hardhat')
const time = require('../../utils/time')
const { waitForTx } = require('../../utils/tx')

describe('ovm/spells/ChangeLogicAndCallSpell', () => {
	let DSPauseOVM
	let ChangeLogicAndCallSpell
	let IdeaTokenExchangeOVM
	let IdeaTokenExchangeStateTransferOVM
	let ProxyAdminOVM
	let AdminUpgradeabilityProxyOVM

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

		DSPauseOVM = await ethers.getContractFactory('DSPauseOVM')
		dsPause = await DSPauseOVM.deploy()
		await dsPause.deployed()
		await waitForTx(dsPause.initialize(delay, adminAccount))
		dsPauseProxyAddress = await dsPause._proxy()

		ChangeLogicAndCallSpell = await ethers.getContractFactory('ChangeLogicAndCallSpell')
		spell = await ChangeLogicAndCallSpell.deploy()
		await spell.deployed()

		IdeaTokenExchangeOVM = await ethers.getContractFactory('IdeaTokenExchangeOVM')
		IdeaTokenExchangeStateTransferOVM = await ethers.getContractFactory('IdeaTokenExchangeStateTransferOVM')
		const logic = await IdeaTokenExchangeStateTransferOVM.deploy()
		await logic.deployed()

		ProxyAdminOVM = await ethers.getContractFactory('ProxyAdminOVM')
		proxyAdmin = await ProxyAdminOVM.deploy()
		await waitForTx(proxyAdmin.setOwner(dsPauseProxyAddress))
		await proxyAdmin.deployed()

		AdminUpgradeabilityProxyOVM = await ethers.getContractFactory('AdminUpgradeabilityProxyOVM')
		proxy = await AdminUpgradeabilityProxyOVM.deploy()
		await proxy.deployed()
		await waitForTx(proxy.initialize(logic.address, proxyAdmin.address, ethers.utils.toUtf8Bytes('')))
	})

	it('can change logic and call', async () => {
		const newLogic = await IdeaTokenExchangeOVM.deploy()
		await newLogic.deployed()

		const calldata = newLogic.interface.encodeFunctionData('initialize', [
			dsPauseProxyAddress,
			oneAddress,
			oneAddress,
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

		const eta = await time.latest()
		const tag = await dsPause.soul(spell.address)

		await waitForTx(dsPause.plot(spell.address, tag, fax, eta))
		await waitForTx(dsPause.exec(spell.address, tag, fax, eta))
	})
})

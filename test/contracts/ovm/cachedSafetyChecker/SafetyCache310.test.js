const { l2ethers: ethers } = require('hardhat')

describe('ovm/cachedSafetyChecker/SafetyCache310', () => {

	let SafetyCache310OVM
	let SafetyChecker310OVM
	let IdeaTokenExchangeOVM
	let IdeaTokenFactoryOVM
	let IdeaTokenVault
	let MultiActionOVM
	let safetyCache

	before(async () => {
		SafetyCache310OVM = await ethers.getContractFactory('SafetyCache310OVMTest')
		SafetyChecker310OVM = await ethers.getContractFactory('SafetyChecker310OVMTest')
		IdeaTokenExchangeOVM = await ethers.getContractFactory('IdeaTokenExchangeOVM')
		IdeaTokenFactoryOVM = await ethers.getContractFactory('IdeaTokenFactoryOVM')
		IdeaTokenVault = await ethers.getContractFactory('IdeaTokenVault')
		MultiActionOVM = await ethers.getContractFactory('MultiActionOVM')
	})

	beforeEach(async () => {
		const safetyChecker = await SafetyChecker310OVM.deploy()
		await safetyChecker.deployed()
		safetyCache = await SafetyCache310OVM.deploy(safetyChecker.address)
		await safetyCache.deployed()
	})

	it('IdeaTokenExchange gas', async () => {
		const tx = await safetyCache.checkAndRegisterSafeBytecode(IdeaTokenExchangeOVM.bytecode)
		const receipt = await tx.wait()
		console.log(receipt.gasUsed.toString())
	})

	it('IdeaTokenFactory gas', async () => {
		const tx = await safetyCache.checkAndRegisterSafeBytecode(IdeaTokenFactoryOVM.bytecode)
		const receipt = await tx.wait()
		console.log(receipt.gasUsed.toString())
	})

	it('IdeaTokenVault gas', async () => {
		const tx = await safetyCache.checkAndRegisterSafeBytecode(IdeaTokenVault.bytecode)
		const receipt = await tx.wait()
		console.log(receipt.gasUsed.toString())
	})

	it('MultiAction gas', async () => {
		const tx = await safetyCache.checkAndRegisterSafeBytecode(MultiActionOVM.bytecode)
		const receipt = await tx.wait()
		console.log(receipt.gasUsed.toString())
	})
})

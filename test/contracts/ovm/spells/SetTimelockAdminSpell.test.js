const { expect } = require('chai')
const { l2ethers: ethers } = require('hardhat')
const { waitForTx } = require('../../utils/tx')
const { generateWallets } = require('../../utils/wallet')
const time = require('../../utils/time')

describe('ovm/spells/SetTimelockAdminSpell', () => {
	let DSPause
	let SetTimelockAdminSpell

	let dsPause
	let spell

	const delay = 0
	let adminAccount
	let newAdminAccount

	before(async () => {
		const accounts = await ethers.getSigners()
		adminAccount = accounts[0]
		;[newAdminAccount] = generateWallets(ethers, 1)

		DSPause = await ethers.getContractFactory('DSPauseOVM')
		SetTimelockAdminSpell = await ethers.getContractFactory('SetTimelockAdminSpell')

		dsPause = await DSPause.deploy()
		await dsPause.deployed()
		await waitForTx(dsPause.initialize(delay, adminAccount.address))

		spell = await SetTimelockAdminSpell.deploy()
		await spell.deployed()
	})

	it('can set new admin', async () => {
		const eta = await time.latest()
		const tag = await dsPause.soul(spell.address)

		const fax = spell.interface.encodeFunctionData('execute', [dsPause.address, newAdminAccount.address])

		await waitForTx(dsPause.plot(spell.address, tag, fax, eta))
		await waitForTx(dsPause.exec(spell.address, tag, fax, eta))

		expect((await dsPause._owner()).toString()).to.be.equal(newAdminAccount.address)
	})
})

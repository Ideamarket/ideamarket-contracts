const { time } = require('@openzeppelin/test-helpers')
const { expect } = require('chai')
const { BigNumber } = require('ethers')
const { ethers } = require('hardhat')

describe('spells/SetTimelockAdminSpell', () => {
	let DSPause
	let SetTimelockAdminSpell

	let dsPause
	let spell

	const delay = 86400
	let adminAccount
	let newAdminAccount

	before(async () => {
		const accounts = await ethers.getSigners()
		adminAccount = accounts[0]
		newAdminAccount = accounts[1]

		DSPause = await ethers.getContractFactory('DSPause')
		SetTimelockAdminSpell = await ethers.getContractFactory('SetTimelockAdminSpell')

		dsPause = await DSPause.deploy(delay, adminAccount.address)
		await dsPause.deployed()

		spell = await SetTimelockAdminSpell.deploy()
		await spell.deployed()
	})

	it('can set new admin', async () => {
		const eta = BigNumber.from((parseInt(await time.latest()) + delay + 100).toString())
		const tag = await dsPause.soul(spell.address)

		const fax = spell.interface.encodeFunctionData('execute', [dsPause.address, newAdminAccount.address])

		await dsPause.plot(spell.address, tag, fax, eta)
		await time.increaseTo(eta.add(BigNumber.from('1')).toString())
		await dsPause.exec(spell.address, tag, fax, eta)

		expect((await dsPause._owner()).toString()).to.be.equal(newAdminAccount.address)
	})
})

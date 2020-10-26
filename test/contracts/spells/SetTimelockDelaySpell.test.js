const { time } = require('@openzeppelin/test-helpers')
const { expect } = require('chai')
const { BigNumber } = require('ethers')
const { ethers } = require('hardhat')

describe('spells/SetTimelockDelaySpell', () => {

	let DSPause
	let SetTimelockDelaySpell

	let dsPause
	let spell

	const delay = 86400
	const newDelay = delay * 2
	let adminAccount

	before(async () => {
		const accounts = await ethers.getSigners()
		adminAccount = accounts[0]

		DSPause = await ethers.getContractFactory('DSPause')
		SetTimelockDelaySpell = await ethers.getContractFactory('SetTimelockDelaySpell')

		dsPause = await DSPause.deploy(delay, adminAccount.address)
		await dsPause.deployed()
	
		spell = await SetTimelockDelaySpell.deploy()
		await spell.deployed()
	})

	it('can set new delay', async () => {
		const eta = BigNumber.from((parseInt(await time.latest()) + delay + 100).toString())
		const tag = await dsPause.soul(spell.address)

		const fax = spell.interface.encodeFunctionData('execute', [dsPause.address, newDelay])

		await dsPause.plot(spell.address, tag, fax, eta)
		await time.increaseTo(eta.add(BigNumber.from('1')).toString())
		await dsPause.exec(spell.address, tag, fax, eta)

		expect((await dsPause._delay()).eq(BigNumber.from(newDelay))).to.be.true
	})
})
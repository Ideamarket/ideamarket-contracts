const { expect } = require('chai')
const { BigNumber } = require('ethers')
const { l2ethers: ethers } = require('hardhat')
const { waitForTx } = require('../../utils/tx')
const time = require('../../utils/time')

describe('ovm/spells/SetTimelockDelaySpell', () => {
	let DSPause
	let SetTimelockDelaySpell

	let dsPause
	let spell

	const delay = 0
	const newDelay = 1
	let adminAccount

	before(async () => {
		const accounts = await ethers.getSigners()
		adminAccount = accounts[0]

		DSPause = await ethers.getContractFactory('DSPauseOVM')
		SetTimelockDelaySpell = await ethers.getContractFactory('SetTimelockDelaySpell')

		dsPause = await DSPause.deploy()
		await dsPause.deployed()
		await waitForTx(dsPause.initialize(delay, adminAccount.address))

		spell = await SetTimelockDelaySpell.deploy()
		await spell.deployed()
	})

	it('can set new delay', async () => {
		const eta = await time.latest()
		const tag = await dsPause.soul(spell.address)

		const fax = spell.interface.encodeFunctionData('execute', [dsPause.address, newDelay])

		await waitForTx(dsPause.plot(spell.address, tag, fax, eta))
		await waitForTx(dsPause.exec(spell.address, tag, fax, eta))

		expect((await dsPause._delay()).eq(BigNumber.from(newDelay))).to.be.true
	})
})

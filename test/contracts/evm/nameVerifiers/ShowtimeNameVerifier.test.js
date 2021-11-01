const { expect } = require('chai')

describe('evm/nameVerifiers/ShowtimeNameVerifier', () => {
	let ShowtimeNameVerifier
	let nameVerifier

	before(async () => {
		ShowtimeNameVerifier = await ethers.getContractFactory('ShowtimeNameVerifier')
		nameVerifier = await ShowtimeNameVerifier.deploy()
		await nameVerifier.deployed()
	})

	it('(empty)', async () => {
		expect(await nameVerifier.verifyTokenName('')).to.be.false
	})

	it('a', async () => {
		expect(await nameVerifier.verifyTokenName('a')).to.be.false
	})

	it('A', async () => {
		expect(await nameVerifier.verifyTokenName('A')).to.be.false
	})

	it('aa', async () => {
		expect(await nameVerifier.verifyTokenName('aa')).to.be.true
	})

	it('0x1a1853db0905c759b28bb1d7b84cd5cbaa31794b', async () => {
		expect(await nameVerifier.verifyTokenName('0x1a1853db0905c759b28bb1d7b84cd5cbaa31794b')).to.be.true
	})

	it('abcdefghijklmnopqrstuvwxyz_', async () => {
		expect(await nameVerifier.verifyTokenName('abcdefghijklmnopqrstuvwxyz_')).to.be.true
	})

	it('(too long)', async () => {
		expect(await nameVerifier.verifyTokenName('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')).to.be.false
	})

	it('ABCDEFGHIJKLMNOPQRSTUVWXYZ', async () => {
		expect(await nameVerifier.verifyTokenName('ABCDEFGHIJKLMNOPQRSTUVWXYZ')).to.be.false
	})

	it('123456789_', async () => {
		expect(await nameVerifier.verifyTokenName('123456789_')).to.be.true
	})

	it('@{unallowed ascii char}', async () => {
		for (let i = 0; i < 255; i++) {
			if (
				!(i >= 0x61 && i <= 0x7a) && // a-z
				!(i >= 0x30 && i <= 0x39) && // 0-9
				!(i == 0x5f) // _
			) {
				expect(await nameVerifier.verifyTokenName(String.fromCharCode(i) + String.fromCharCode(i))).to.be.false
			}
		}
	})

	it('@{allowed ascii char}', async () => {
		for (let i = 0; i < 255; i++) {
			if (
				(i >= 0x61 && i <= 0x7a) || // a-z
				(i >= 0x30 && i <= 0x39) || // 0-9
				i == 0x5f // _
			) {
				expect(await nameVerifier.verifyTokenName(String.fromCharCode(i) + String.fromCharCode(i))).to.be.true
			}
		}
	})
})

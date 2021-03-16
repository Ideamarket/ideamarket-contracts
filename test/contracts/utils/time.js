const { BigNumber } = require('ethers')
const { l2ethers: ethers } = require('hardhat')

module.exports = {
	latest: async () => {
		return BigNumber.from((await ethers.provider.getBlock('latest')).timestamp.toString())
	},

	increase: async (secs) => {
		if (!BigNumber.isBigNumber(secs)) {
			secs = BigNumber.from(secs.toString())
		}

		await ethers.provider.send('evm_increaseTime', [secs.toNumber()])
	},

	increaseTo: async (to) => {
		if (!BigNumber.isBigNumber(to)) {
			to = BigNumber.from(to.toString())
		}

		const latestTs = await module.exports.latest()
		const diff = to.sub(latestTs)

		await module.exports.increase(diff)
	},

	duration: {
		seconds: function (val) {
			return BigNumber.from(val)
		},
		minutes: function (val) {
			return BigNumber.from(val).mul(this.seconds('60'))
		},
		hours: function (val) {
			return BigNumber.from(val).mul(this.minutes('60'))
		},
		days: function (val) {
			return BigNumber.from(val).mul(this.hours('24'))
		},
		weeks: function (val) {
			return BigNumber.from(val).mul(this.days('7'))
		},
		years: function (val) {
			return BigNumber.from(val).mul(this.days('365'))
		},
	},
}

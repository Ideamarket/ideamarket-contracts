module.exports = {
	waitForTx: async (tx) => {
		const res = await tx
		if (res.wait) {
			await res.wait()
		}
	},

	expectRevert: async (tx) => {
		try {
			await module.exports.waitForTx(tx)
		} catch (ex) {
			return
		}

		throw 'expected revert'
	},
}

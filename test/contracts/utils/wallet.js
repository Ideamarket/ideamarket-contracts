module.exports = {
	generateWallets: (ethers, num) => {
		const wallets = []
		for (let i = 0; i < num; i++) {
			wallets.push(ethers.Wallet.createRandom().connect(ethers.provider))
		}
		return wallets
	},
}

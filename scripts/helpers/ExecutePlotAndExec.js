const { ethers } = require('hardhat')
const { read } = require('../shared')

const gasPrice = 10000000000 // 10 gwei

async function main() {
	const deployerAccount = (await ethers.getSigners())[0]
	const deployerAddress = deployerAccount.address
	console.log(`Running from ${deployerAddress}`)
	console.log('')

	const to = await read('To: ')
	const usr = await read('Param usr: ')
	const tag = await read('Param tag: ')
	const fax = await read('Param fax: ')
	const eta = await read('Param eta: ')
	console.log('')

	const timelockContract = new ethers.Contract(
		to,
		(await ethers.getContractFactory('DSPause')).interface,
		deployerAccount
	)

	console.log('Plot...')
	await timelockContract.plot(usr, tag, fax, eta)

	await read('Plot confirmed. Press enter to continue with exec.')

	console.log('')
	console.log('Exec...')
	await timelockContract.exec(usr, tag, fax, eta)
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error)
		process.exit(1)
	})

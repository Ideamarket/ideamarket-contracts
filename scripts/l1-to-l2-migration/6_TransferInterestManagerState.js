const { ethers } = require('hardhat')
const { read, loadDeployedAddress } = require('../shared')

const gasPrice = 10000000000 // 10 gwei

async function main() {
	const deployerAccount = (await ethers.getSigners())[0]
	const deployerAddress = deployerAccount.address
    console.log(`Running from ${deployerAddress}`)
	console.log('')

	let networkName = (await ethers.provider.getNetwork()).name

	if (networkName === 'kovan') {
		console.log('Using Kovan')
	} else {
		throw 'cannot work with network: ' + networkName
	}

    const interestManagerCompoundStateTransferAddress = loadDeployedAddress(networkName, 'interestManager')

    console.log('InterestManagerCompoundStateTransfer', interestManagerCompoundStateTransferAddress)
    const yn = await read('Correct? [Y/n]: ')
	if (yn !== 'Y' && yn !== 'y') {
		console.log('abort')
		return
	}

    const interestManagerCompoundStateTransfer = new ethers.Contract(
		interestManagerCompoundStateTransferAddress,
		(await ethers.getContractFactory('InterestManagerCompoundStateTransfer')).interface,
		deployerAccount
	)

    console.log('Executing state transfer')
    const tx = await interestManagerCompoundStateTransfer.executeStateTransfer({ gasPrice: gasPrice })
    await tx.wait()
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error)
		process.exit(1)
	})

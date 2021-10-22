const { ethers } = require('hardhat')
const { read, unixTimestampFromDateString, loadDeployedAddress, loadABI } = require('./shared')

async function main() {
	const deployerAccount = (await ethers.getSigners())[0]
	const deployerAddress = deployerAccount.address

    const chainID = (await ethers.provider.getNetwork()).chainId
    let networkName

	if(chainID === 42161) {
		networkName = 'avm'
	} else {
		throw 'cannot work with network: ' + chainID
	}

	console.log('')
	const executionDate = await read('execution date (DAY-MONTH-YEAR HOUR:MINUTE:SECOND) in UTC time: ')
	const executionTimestamp = unixTimestampFromDateString(executionDate)

    const newOwnerAddress = await read('new owner address: ')

	const timelockAddress = loadDeployedAddress(networkName, 'dsPause')
	const changeTimelockOwnerSpellAddress = loadDeployedAddress(networkName, 'changeTimelockOwnerSpell')

	console.log(`Network ${networkName}`)
	console.log('Deployer ', deployerAddress)
	console.log('')
	console.log('Timelock', timelockAddress)
	console.log('ChangeTimelockOwnerSpell', changeTimelockOwnerSpellAddress)
	console.log('New Owner', newOwnerAddress)
	console.log('')

	const yn = await read('Correct? [Y/n]: ')
	if (yn !== 'Y' && yn !== 'y') {
		console.log('abort')
		return
	}
	console.log('')

	const timelockAbi = (await ethers.getContractFactory('DSPause')).interface.fragments
	const timelockContract = new ethers.Contract(
		timelockAddress,
		(await ethers.getContractFactory('DSPause')).interface,
		deployerAccount
	)

	const changeTimelockOwnerSpell = await ethers.getContractFactory('ChangeTimelockOwnerSpell')
	const changeTimelockOwnerTag = await timelockContract.soul(changeTimelockOwnerSpellAddress)

	const fax = changeTimelockOwnerSpell.interface.encodeFunctionData('execute', [
		timelockAddress,
		newOwnerAddress,
	])

	console.log('To:', timelockAddress)
	console.log('Param usr:', changeTimelockOwnerSpellAddress)
	console.log('Param tag:', changeTimelockOwnerTag)
	console.log('Param fax:', fax)
	console.log('Param eta:', executionTimestamp.toString())
	console.log('ABI:', JSON.stringify(timelockAbi))
	console.log('')
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error)
		process.exit(1)
	})

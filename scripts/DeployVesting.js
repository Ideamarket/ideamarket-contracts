require('dotenv').config({ path: '../.env' })
const { BigNumber } = require('ethers')
const { run, ethers } = require('hardhat')
const { loadDeployedAddress, read } = require('./shared')

const tenPow18 = BigNumber.from('1000000000000000000')
const GAS_PRICE = 2000000000 // 2 GWEI

async function runDeployVesting() {
	const deployerAccount = (await ethers.getSigners())[0]
	const deployerAddress = deployerAccount.address
	console.log(`Deploying from ${deployerAddress}`)

	await run('compile')
	console.log('')


	const chainID = (await ethers.provider.getNetwork()).chainId
    let networkName

	if (chainID === 421611) {
		networkName = 'test-avm-l2'
    } else if (chainID === 42161) {
		networkName = 'avm'
    } else {
		throw `unknown chain id: ${chainID}`
	}

    const imoAddress = await loadDeployedAddress(networkName, 'imo')
    const recipient = await read('Recipient address: ')
    const start = await read('Start date (UTC Unix timestamp): ')
    const duration = await read('Duration (seconds): ')
    const inputAmount = await read('Amount: ')
    const amount =  BigNumber.from(inputAmount).mul(tenPow18)

    console.log('')
    console.log('Network', networkName)
    console.log('IMO', imoAddress)
    console.log('Recipient', recipient)
    console.log('Start Date', start)
    console.log('Duration', duration)
    console.log('Amount (Wei)', amount.toString())
    await read('Correct?')

    const vesting = await deployContract('DelegateableTokenVesting', recipient, start, duration, imoAddress)
	console.log('DelegateableTokenVesting deployed to', vesting.address)
    console.log('')

    console.log('Approving', inputAmount, 'IMO')
    const imo = new ethers.Contract(
		imoAddress,
		(await ethers.getContractFactory('IMO')).interface,
		deployerAccount
	)
    let tx = await imo.approve(vesting.address, amount, { gasPrice: GAS_PRICE })
    await tx.wait()
    console.log('')

    console.log('Depositing', inputAmount, 'IMO')
    tx = await vesting.deposit(amount, { gasPrice: GAS_PRICE })
    await tx.wait()
}

async function deployContract(name, ...params) {
	console.log(`Deploying contract ${name}`)
	const contractFactory = await ethers.getContractFactory(name)
	const deployed = await contractFactory.deploy(...params, { gasPrice: GAS_PRICE })
	await deployed.deployed()
	return deployed
}

runDeployVesting()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error)
		process.exit(1)
	})

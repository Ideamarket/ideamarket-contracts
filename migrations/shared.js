require('dotenv').config()
const fs = require('fs')
const { exec } = require("child_process")


const AdminUpgradeabilityProxy = artifacts.require('AdminUpgradeabilityProxy')

module.exports.deploymentParams = {
    'kovan': {
        timelockDelay: '1'
    }
}

module.exports.externalContractAddresses = {
    'kovan': {
        'multisig': '0x4e6a11b687F35fA21D92731F9CD2f231C61f9151',
        'dai': '0x4F96Fe3b7A6Cf9725f59d353F723c1bDb64CA6Aa',
        'cDai': '0xF0d0EB522cfa50B716B3b1604C4F0fA6f04376AD',
        'comp': '0x61460874a7196d6a22D1eE4922473664b3E95270',
        'weth': '0xd0A1E359811322d97991E03f863a0C30C2cF029C',
        'uniswapV2Router02': '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'
    }
}

module.exports.saveDeployedAddress = function (network, contract, address) {
    let addresses = {}
    const path = 'deployed/deployed-' + network + '.json'
    if(fs.existsSync(path)) {
        const raw = fs.readFileSync(path)
        addresses = JSON.parse(raw)
    }

    addresses[contract] = address
    fs.writeFileSync(path, JSON.stringify(addresses, undefined, 4))
}

module.exports.loadDeployedAddress = function (network, contract) {
    const path = 'deployed/deployed-' + network + '.json'
    const raw = fs.readFileSync(path)
    const addresses = JSON.parse(raw)
    return addresses[contract]
}

module.exports.deployProxy = async function(artifact, deployer, admin, ...args) {
    // Deploy the logic contract
    await deployer.deploy(artifact)
    const logicContract = await artifact.at(artifact.address)

    // Proxy will delegatecall into the initializer
    const data = logicContract.contract.methods.initialize(...args).encodeABI()

    await deployer.deploy(AdminUpgradeabilityProxy, logicContract.address, admin, data)

    return [AdminUpgradeabilityProxy.address, logicContract.address]
}

module.exports.verifyOnEtherscan = async function(network, address, contractName, license = 'MIT') {

    console.log('Waiting 10 seconds before beginning Etherscan verification')
    // We need this to avoid "Unable to locate ContractCode at 0x..."
    await new Promise((resolve) => {
        setTimeout(resolve, 10000)
    })

    const cmd = `truffle run verify ${contractName}@${address} --network ${network} --license=${license}`
    await new Promise(resolve => {
        console.log('Beginning Etherscan verification for contract ' + contractName)
        exec(cmd, async (error, stdout, stderr) => {
            if (error) {
                if(stderr.includes('Unable to locate ContractCode') || stdout.includes('Unable to locate ContractCode')) {
                    console.log('Contract verification failed. Retrying.')
                    await module.exports.verifyOnEtherscan(network, address, contractName, license)
                } else {
                    console.log('Failed to verify contract ' + contractName + ': ' + error + '\n' + stdout + '\n' + stderr)
                }
            } else {
                console.log('Sucessfully verified contract ' + contractName)
            }

            // We dont want a failing verification to cancel our migration
            resolve()
        })
    })
}
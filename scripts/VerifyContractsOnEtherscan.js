require('dotenv').config({ path: '../.env' })
const fs = require('fs')
const { exec } = require('child_process')

async function run() {
	let network = ''
	for (let i = 0; i < process.argv.length; i++) {
		if (process.argv[i] === '--kovan') {
			network = 'kovan'
			break
		} else if (process.argv[i] === '--mainnet') {
			network = 'mainnet'
			break
		}
	}

	if (network !== 'kovan' && network !== 'mainnet') {
		console.log('Please specify --kovan or --mainnet')
		return
	}

	const artifactFiles = fs.readdirSync('../build/contracts')
	const rawDeployedAddresses = fs.readFileSync('../deployed/deployed-' + network + '.json')
	const deployedAddresses = JSON.parse(rawDeployedAddresses)

	for (const contractEntry in deployedAddresses) {
		let contractName = contractEntry.toLowerCase()

		if (contractName.endsWith('logic')) {
			// This is a logic contract which gets called by a proxy
			contractName = contractName.slice(0, -5) // Remove the "logic"

			// Some hardcoded contract names
			if (contractName === 'interestmanager') {
				contractName = 'interestmanagercompound'
			}
		} else {
			// Is there a logic contract?
			for (const c in deployedAddresses) {
				if (contractName + 'logic' === c.toLowerCase()) {
					// This is a proxy
					contractName = 'adminupgradeabilityproxy'
					break
				}
			}
		}

		let found = false
		for (let i = 0; i < artifactFiles.length; i++) {
			const artifactFile = artifactFiles[i]
			if (contractName + '.json' === artifactFile.toLowerCase()) {
				found = true

				await verify(network, deployedAddresses[contractEntry], artifactFile.slice(0, -5))

				break
			}
		}

		if (!found) {
			console.log('Could not find artifact for contract ' + contractName)
		}
	}
}

async function verify(network, address, contractName, license = 'MIT') {
	console.log('Verifying', contractName, '@', address)
	const cmd = `truffle run verify ${contractName}@${address} --network ${network} --license=${license}`
	await new Promise((resolve) => {
		exec(cmd, async (error, stdout, stderr) => {
			if (error) {
				console.log('Failed to verify contract ' + contractName + ': ' + error + '\n' + stdout + '\n' + stderr)
			}
			// We dont want a failing verification to cancel the run
			resolve()
		})
	})
}

run()

const { saveDeployedAddress } = require('./shared')

const Migrations = artifacts.require("Migrations")

module.exports = async function(deployer, network, accounts) {
  if(network != 'kovan') {
    return
  }
  
  await deployer.deploy(Migrations)
  saveDeployedAddress(network, 'migrations', Migrations.address)
}

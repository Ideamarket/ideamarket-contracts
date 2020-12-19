# Ideamarket Contracts

The Ideamarket contracts for the Ethereum blockchain.

## Usage

### Run tests

`npx hardhat test`

### Deploy

`npx hardhat run --network <mainnet|rinkeby|test> scripts/Deploy.js`

## Repository structure

### `/contracts`

Holds the Solidity smart contracts.

-   `./core`: Main Ideamarket contracts
-   `./proxy`: OZ `AdminUpgradeabilityProxy`
-   `./compound`: Compound V2 interfaces
-   `./weth`: Wrapped ETH (WETH) interfaces
-   `./uniswap`: Uniswap V2 interfaces
-   `./test`: Mock contracts for testing
-   `./timelock`: DAppHub `DSPause` timelock. Uses `spells` to execute changes
-   `./spells`: Spells for the `DSPause` timelock to delegatecall into
-   `./util`: Utility contracts like `Ownable` and `Initializable`

### `/deployed`

Holds `.json` files containing contract addresses and ABIs of the contracts deployed on the different networks.

### `/docs`

Diagrams and docs.

### `/scripts`

Utility scripts for deploying and making calls to on-chain contracts.

### `/test/contracts`

Contract unit tests

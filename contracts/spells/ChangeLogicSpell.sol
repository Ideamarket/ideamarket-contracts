// SPDX-License-Identifier: MIT
pragma solidity 0.6.9;

import "../proxy/ProxyAdmin.sol";
import "../proxy/AdminUpgradeabilityProxy.sol";
import "../core/interfaces/IIdeaTokenExchange.sol";

/**
 * @title ChangeLogicSpell
 * @author Alexander Schlindwein
 *
 * Spell to change the logic of a proxy contract
 */
contract ChangeLogicSpell {

    /**
     * Changes the logic contract of a proxy contract
     *
     * @param proxyAdmin The address of the proxy admin contract
     * @param proxy The address of the proxy contract
     * @param newLogic The address of the new logic contract
     */
    function execute(address proxyAdmin, address payable proxy, address newLogic) external {
        ProxyAdmin(proxyAdmin).upgrade(AdminUpgradeabilityProxy(proxy), newLogic);
    }
}

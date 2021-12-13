// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract DAIMockToken is ERC20 {

    constructor(uint256 initialSupply) ERC20("DAI Token", "DAI") {
        _mint(msg.sender, initialSupply);
    }
}
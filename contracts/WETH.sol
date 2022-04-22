// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract WETH is ERC20 {
    constructor() public ERC20("Wrapped Ether", "WETH") {}

    function mint() public {
        _mint(msg.sender, 10000 * (10**18));
    }
}

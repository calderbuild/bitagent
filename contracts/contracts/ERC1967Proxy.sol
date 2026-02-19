// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol" as OZProxy;

contract ERC1967Proxy is OZProxy.ERC1967Proxy {
    constructor(address implementation, bytes memory _data) OZProxy.ERC1967Proxy(implementation, _data) {}
}

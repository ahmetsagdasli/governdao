// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title Treasury - Governance-controlled target contract.
/// @notice Owner MUST be the TimelockController. Only successful proposals can call store().
contract Treasury is Ownable {
    uint256 public value;

    event ValueChanged(uint256 indexed newValue, address indexed executor);

    constructor(address timelock) Ownable(timelock) {}

    function store(uint256 newValue) external onlyOwner {
        value = newValue;
        emit ValueChanged(newValue, msg.sender);
    }
}

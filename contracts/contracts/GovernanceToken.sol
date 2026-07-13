// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {ERC20Votes} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import {Nonces} from "@openzeppelin/contracts/utils/Nonces.sol";

/// @title GovernanceToken - ERC20Votes governance token for GovernDAO
/// @notice Fixed supply, checkpoint-based voting power, gasless approvals via permit.
contract GovernanceToken is ERC20, ERC20Permit, ERC20Votes {
    constructor(address initialHolder)
        ERC20("GovernDAO Token", "GDAO")
        ERC20Permit("GovernDAO Token")
    {
        _mint(initialHolder, 1_000_000e18);
    }

    // ---- Required overrides (OZ 5.x) ----

    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Votes)
    {
        super._update(from, to, value);
    }

    function nonces(address owner)
        public
        view
        override(ERC20Permit, Nonces)
        returns (uint256)
    {
        return super.nonces(owner);
    }
}

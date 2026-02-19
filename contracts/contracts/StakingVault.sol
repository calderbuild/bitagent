// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title StakingVault
 * @notice BTC staking vault for AI agent trust on GOAT Network.
 * @dev Agents stake native BTC (GOAT's gas token) as trust collateral.
 *      BTC is 18 decimals on GOAT, payable functions receive it directly.
 */
contract StakingVault {
    struct Stake {
        uint256 amount;
        uint256 stakedAt;
        uint256 slashedAmount;
        address owner;
        bool active;
    }

    mapping(uint256 => Stake) public agentStakes;
    address public admin;
    address public slashOracle;
    uint256 public cooldownPeriod = 7 days;
    uint256 public minimumStake = 0.001 ether; // 0.001 BTC

    event Staked(uint256 indexed agentId, address indexed owner, uint256 amount);
    event Slashed(uint256 indexed agentId, uint256 amount, string reason);
    event Unstaked(uint256 indexed agentId, uint256 amount);
    event SlashOracleUpdated(address indexed newOracle);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    modifier onlyStakeOwner(uint256 agentId) {
        require(agentStakes[agentId].owner == msg.sender, "Not stake owner");
        _;
    }

    constructor(address _slashOracle) {
        admin = msg.sender;
        slashOracle = _slashOracle;
    }

    /// @notice Agent stakes BTC (native gas token on GOAT)
    function stake(uint256 agentId) external payable {
        require(msg.value >= minimumStake, "Below minimum stake");
        Stake storage s = agentStakes[agentId];
        if (s.owner == address(0)) {
            s.owner = msg.sender;
        } else {
            require(s.owner == msg.sender, "Not stake owner");
        }
        s.amount += msg.value;
        s.stakedAt = block.timestamp;
        s.active = true;
        emit Staked(agentId, msg.sender, msg.value);
    }

    /// @notice Query effective stake (total - slashed)
    function effectiveStake(uint256 agentId) external view returns (uint256) {
        Stake storage s = agentStakes[agentId];
        if (s.amount <= s.slashedAmount) return 0;
        return s.amount - s.slashedAmount;
    }

    /// @notice Slash a misbehaving agent's stake
    function slash(uint256 agentId, uint256 amount, string calldata reason) external {
        require(msg.sender == slashOracle, "Only oracle can slash");
        Stake storage s = agentStakes[agentId];
        require(s.active, "Agent not staked");
        uint256 effective = s.amount - s.slashedAmount;
        uint256 slashAmt = amount > effective ? effective : amount;
        s.slashedAmount += slashAmt;
        emit Slashed(agentId, slashAmt, reason);
    }

    /// @notice Agent withdraws stake after cooldown
    function unstake(uint256 agentId) external onlyStakeOwner(agentId) {
        Stake storage s = agentStakes[agentId];
        require(s.active, "Not active");
        require(block.timestamp >= s.stakedAt + cooldownPeriod, "Cooldown not met");
        uint256 withdrawable = s.amount - s.slashedAmount;
        s.active = false;
        s.amount = 0;
        s.slashedAmount = 0;
        (bool sent,) = payable(msg.sender).call{value: withdrawable}("");
        require(sent, "Transfer failed");
        emit Unstaked(agentId, withdrawable);
    }

    /// @notice Get full stake info for an agent
    function getStakeInfo(uint256 agentId) external view returns (
        uint256 amount,
        uint256 stakedAt,
        uint256 slashedAmount,
        address owner,
        bool active
    ) {
        Stake storage s = agentStakes[agentId];
        return (s.amount, s.stakedAt, s.slashedAmount, s.owner, s.active);
    }

    /// @notice Update slash oracle address
    function setSlashOracle(address _newOracle) external onlyAdmin {
        slashOracle = _newOracle;
        emit SlashOracleUpdated(_newOracle);
    }

    /// @notice Update cooldown period (admin only, for testnet flexibility)
    function setCooldownPeriod(uint256 _period) external onlyAdmin {
        cooldownPeriod = _period;
    }

    /// @notice Update minimum stake (admin only)
    function setMinimumStake(uint256 _minimum) external onlyAdmin {
        minimumStake = _minimum;
    }

    receive() external payable {}
}

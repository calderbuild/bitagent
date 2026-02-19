import { ethers } from "ethers";

export const GOAT_RPC = process.env.GOAT_RPC_URL || "https://rpc.testnet3.goat.network";
export const GOAT_CHAIN_ID = 48816;
export const GOAT_NETWORK = `eip155:${GOAT_CHAIN_ID}`;

// Contract addresses (set after deployment)
export const MOCK_USDC_ADDRESS = process.env.MOCK_USDC_ADDRESS || "";
export const STAKING_VAULT_ADDRESS = process.env.STAKING_VAULT_ADDRESS || "";
export const IDENTITY_REGISTRY_ADDRESS = process.env.IDENTITY_REGISTRY_ADDRESS || "";
export const REPUTATION_REGISTRY_ADDRESS = process.env.REPUTATION_REGISTRY_ADDRESS || "";

export function getProvider() {
  return new ethers.JsonRpcProvider(GOAT_RPC, GOAT_CHAIN_ID);
}

export function getWallet(privateKey: string) {
  return new ethers.Wallet(privateKey, getProvider());
}

// Minimal ABIs for contract interaction
export const STAKING_VAULT_ABI = [
  "function stake(uint256 agentId) external payable",
  "function effectiveStake(uint256 agentId) external view returns (uint256)",
  "function slash(uint256 agentId, uint256 amount, string calldata reason) external",
  "function getStakeInfo(uint256 agentId) external view returns (uint256, uint256, uint256, address, bool)",
  "event Staked(uint256 indexed agentId, address indexed owner, uint256 amount)",
  "event Slashed(uint256 indexed agentId, uint256 amount, string reason)",
];

export const MOCK_USDC_ABI = [
  "function mint(address to, uint256 amount) external",
  "function balanceOf(address account) external view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function transferWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s) external",
  "function DOMAIN_SEPARATOR() external view returns (bytes32)",
  "function name() external view returns (string)",
  "function version() external view returns (string)",
];

// ERC-8004 Identity Registry ABI (minimal)
export const IDENTITY_REGISTRY_ABI = [
  "function register(string agentURI) external returns (uint256)",
  "function setAgentURI(uint256 agentId, string calldata newURI) external",
  "function tokenURI(uint256 tokenId) external view returns (string)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function totalSupply() external view returns (uint256)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
];

// ERC-8004 Reputation Registry ABI (minimal)
export const REPUTATION_REGISTRY_ABI = [
  "function giveFeedback(uint256 agentId, int128 value, uint8 valueDecimals, string tag1, string tag2, string endpoint, string feedbackURI, bytes32 feedbackHash) external",
  "function getSummary(uint256 agentId, address[] clientAddresses, string tag1, string tag2) external view returns (uint64, int128, uint8)",
  "function readAllFeedback(uint256 agentId, address[] clientAddresses, string tag1, string tag2, bool includeRevoked) external view returns (address[], uint64[], int128[], uint8[], string[], string[], bool[])",
];

import { ethers } from "hardhat";

async function main() {
  const repAddr = process.env.REPUTATION_REGISTRY_ADDRESS;
  if (!repAddr) throw new Error("REPUTATION_REGISTRY_ADDRESS not set");

  const abi = [
    "function getClients(uint256 agentId) external view returns (address[])",
    "function getSummary(uint256 agentId, address[] clientAddresses, string tag1, string tag2) external view returns (uint64, int128, uint8)",
  ];
  const rep = await ethers.getContractAt(abi, repAddr);

  for (const id of [1, 2, 3]) {
    const clients = await rep.getClients(id);
    console.log(`Agent ${id} clients: [${clients.join(", ")}]`);
    if (clients.length > 0) {
      const summary = await rep.getSummary(id, clients, "", "");
      console.log(`  count=${summary[0]}, value=${summary[1]}, decimals=${summary[2]}`);
    } else {
      console.log("  no clients");
    }
  }
}

main().catch(console.error);

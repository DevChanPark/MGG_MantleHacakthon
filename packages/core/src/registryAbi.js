export const AIVerdictRegistryAbi = Object.freeze([
  {
    type: "function",
    name: "recordVerdict",
    stateMutability: "nonpayable",
    inputs: [
      { name: "contentHash", type: "bytes32" },
      { name: "optionsHash", type: "bytes32" },
      { name: "entriesRoot", type: "bytes32" },
      { name: "rulesHash", type: "bytes32" },
      { name: "modelVersionHash", type: "bytes32" },
      { name: "winnerHash", type: "bytes32" },
      { name: "mvpEntryHash", type: "bytes32" },
      { name: "verdictHash", type: "bytes32" }
    ],
    outputs: []
  },
  {
    type: "event",
    name: "VerdictRecorded",
    inputs: [
      { name: "verdictHash", type: "bytes32", indexed: true },
      { name: "contentHash", type: "bytes32", indexed: false },
      { name: "entriesRoot", type: "bytes32", indexed: false }
    ],
    anonymous: false
  }
]);

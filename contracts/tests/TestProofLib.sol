pragma solidity 0.5.2;

import "../ProofLib.sol";


library TestProofLib {
  function ChainHash(bytes memory chainProof, bytes memory uncleHeader) internal pure returns(bytes32 hash) {
    return ProofLib.chainHash(chainProof, uncleHeader);
  }
  
  function UncleHeader(bytes memory proof, bytes32 hostSeedHash) internal pure returns(bytes32 headerHash, bytes memory header) {
    return ProofLib.uncleHeader(proof, hostSeedHash);
  }

  function ReceiptAddr(bytes memory proof) internal pure returns(address addr) {
    return ProofLib.receiptAddr(proof);
  }


  function BlobPtrLenShift(bytes memory proof, uint offset, uint slotDataLen) internal pure returns(uint ptr, uint len, uint shift) {
    return ProofLib.blobPtrLenShift(proof, offset, slotDataLen);
  }

  function Memcpy(bytes memory src, uint start, uint len) internal pure returns(bytes memory dst) {
      
  }   
}

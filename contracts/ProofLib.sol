pragma solidity 0.5.2;

//solium-disable security/no-inline-assembly 
//solium-disable indentation
//solium-disable security/no-assign-params


library ProofLib {
  function chainHash(bytes memory chainProof, bytes memory uncleHeader) internal pure returns(bytes32 hash) {
    uint proofLen = chainProof.length;
    require(proofLen >= 4, "proof lib: chain proof length too low");
    bytes memory slotData = uncleHeader;
    uint slotDataPtr;  assembly { slotDataPtr := add(slotData, 32) }
    
    for (uint offset; ;) {
      // uncles blob
      (uint blobPtr, uint blobLen, uint blobShift) = blobPtrLenShift(chainProof, offset, slotData.length);
      offset += 4;
      // put uncle header to uncles slot.
      uint slotPtr; assembly { slotPtr := add(blobPtr, blobShift) }
      memcpy(slotDataPtr, slotPtr, slotData.length);
      // calc uncles hash
      assembly { hash := keccak256(blobPtr, blobLen) }
      offset += blobLen;
      
      
      // header blob
      (blobPtr, blobLen, blobShift) = blobPtrLenShift(chainProof, offset, 32);
      offset += 4;
      uint hashSlot; assembly { hashSlot := mload(add(blobPtr, blobShift)) }
      require(hashSlot == 0, "proof lib: non-empty uncles hash slot");
      assembly { 
        mstore(add(blobPtr, blobShift), hash)  // put uncles hash to uncles hash slot.
        hash := keccak256(blobPtr, blobLen) // calc header hash
      }
      offset += blobLen;
      
      // return if has not next blob
      if (offset+4 >= proofLen) {
        return hash;
      }
      
      // copy header blob to slotData for using in next blob
      slotData = new bytes(blobLen); assembly { slotDataPtr := add(slotData, 32) }
      memcpy(blobPtr, slotDataPtr, blobLen);
    }
  }
  
  function uncleHeader(bytes memory proof, bytes32 hostSeedHash) internal pure returns(bytes32 headerHash, bytes memory header) {
    uint proofLen = proof.length;
    require(proofLen >= 4, "proof lib: uncle proof length too low");
    uint blobPtr; uint blobLen; 
    bytes32 blobHash = hostSeedHash;
    for (uint offset; offset+4 < proofLen; offset += blobLen) {
      uint blobShift;
      (blobPtr, blobLen, blobShift) = blobPtrLenShift(proof, offset, 32);
      offset += 4;
      uint hashSlot; assembly { hashSlot := mload(add(blobPtr, blobShift)) }
      require(hashSlot == 0, "proof lib: non-empty hash slot");
      assembly { 
        mstore(add(blobPtr, blobShift), blobHash) 
        blobHash := keccak256(blobPtr, blobLen)
      }
    }
    
    header = new bytes(blobLen);
    uint headerPtr; assembly { headerPtr := add(header, 32) }
    memcpy(blobPtr, headerPtr, blobLen); 
    return (blobHash, header);
  }

  function receiptAddr(bytes memory proof) internal pure returns(address addr) {
    uint b;
    uint offset; assembly { offset := add(add(proof, 32), 4) }
    
    // leaf header
    assembly { b := byte(0, mload(offset)) }
    require(b >= 0xf7, "proof lib: receipt leaf longer than 55 bytes");
    offset += b - 0xf6;

    // path header
    assembly { b := byte(0, mload(offset)) }
    if (b <= 0x7f) {
      offset += 1;
    } else {
      require(b >= 0x80 && b <= 0xb7, "proof lib: path is an RLP string");
      offset += b - 0x7f;
    }

    // receipt string header
    assembly { b := byte(0, mload(offset)) }
    require(b == 0xb9, "proof lib: Rrceipt str is always at least 256 bytes long, but less than 64k");
    offset += 3;

    // receipt header
    assembly { b := byte(0, mload(offset)) }
    require(b == 0xf9, "proof lib: receipt is always at least 256 bytes long, but less than 64k");
    offset += 3;

    // status
    assembly { b := byte(0, mload(offset)) }
    require(b == 0x1, "proof lib: status should be success");
    offset += 1;

    // cum gas header
    assembly { b := byte(0, mload(offset)) }
    if (b <= 0x7f) {
      offset += 1;
    } else {
      require(b >= 0x80 && b <= 0xb7, "proof lib: cumulative gas is an RLP string");
      offset += b - 0x7f;
    }

    // bloom header
    assembly { b := byte(0, mload(offset)) }
    require(b == 0xb9, "proof lib: bloom filter is always 256 bytes long");
    offset += 256 + 3;

    // logs list header
    assembly { b := byte(0, mload(offset)) }
    require(b == 0xf8, "proof lib: logs list is less than 256 bytes long");
    offset += 2;

    // log entry header
    assembly { b := byte(0, mload(offset)) }
    require(b == 0xf8, "proof lib: log entry is less than 256 bytes long");
    offset += 2;

    // address header
    assembly { b := byte(0, mload(offset)) }
    require(b == 0x94, "proof lib: address is 20 bytes long");
    
    offset -= 11;
    assembly { addr := and(mload(offset), 0xffffffffffffffffffffffffffffffffffffffff) }
  }


  function blobPtrLenShift(bytes memory proof, uint offset, uint slotDataLen) internal pure returns(uint ptr, uint len, uint shift) {
    assembly { 
      ptr := add(add(proof, 32), offset) 
      len := and(mload(sub(ptr, 30)), 0xffff)
    }
    require(proof.length >= len+offset+4, "proof lib: blob length out of range proof");
    assembly { shift := and(mload(sub(ptr, 28)), 0xffff) }
    require(shift + slotDataLen <= len, "proof lib: blob shift bounds check");
    ptr += 4;
  }

  // Copy 'len' bytes from memory address 'src', to address 'dest'.
  // This function does not check the or destination, it only copies
  // the bytes.
  function memcpy(uint src, uint dest, uint len) internal pure {
    // Copy word-length chunks while possible
    for (; len >= 32; len -= 32) {
      assembly {
        mstore(dest, mload(src))
      }
      dest += 32;
      src += 32;
    }

    // Copy remaining bytes
    uint mask = 256 ** (32 - len) - 1;
    assembly {
      let srcpart := and(mload(src), not(mask))
      let destpart := and(mload(dest), mask)
      mstore(dest, or(destpart, srcpart))
    }
  }   
}

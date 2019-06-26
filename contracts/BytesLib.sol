pragma solidity 0.5.2;

// solium-disable security/no-assign-params


library BytesLib {


  // index returns the index of the first instance of sub in s, or -1 if sub is not present in s. 
  function index(bytes memory b, bytes memory subb, uint start) internal pure returns(int) {
    uint lensubb = subb.length;
    
    uint hashsubb;
    uint ptrb;
    assembly {
      hashsubb := keccak256(add(subb, 0x20), lensubb)
      ptrb := add(b, 0x20)
    }
    
    for (uint lenb = b.length; start < lenb; start++) {
      if (start+lensubb > lenb) {
        return -1;
      }
      bool found;
      assembly {
        found := eq(keccak256(add(ptrb, start), lensubb), hashsubb)
      }
      if (found) {
        return int(start);
      }
    }
    return -1;
  }  
  
  // index returns the index of the first instance of sub in s, or -1 if sub is not present in s. 
  function index(bytes memory b, bytes memory sub) internal pure returns(int) {
    return index(b, sub, 0);
  }

  function index(bytes memory b, byte sub, uint start) internal pure returns(int) {
    for (uint len = b.length; start < len; start++) {
      if (b[start] == sub) {
        return int(start);
      }
    }
    return -1;
  }

  function index(bytes memory b, byte sub) internal pure returns(int) {
    return index(b, sub, 0);
  }

  function count(bytes memory b, bytes memory sub) internal pure returns(uint times) {
    int i = index(b, sub, 0);
    while (i != -1) {
      times++;
      i = index(b, sub, uint(i)+sub.length);
    }
  }
  
  function equals(bytes memory b, bytes memory a) internal pure returns(bool equal) {
    if (b.length != a.length) {
      return false;
    }
    
    uint len = b.length;
    
    assembly {
      equal := eq(keccak256(add(b, 0x20), len), keccak256(add(a, 0x20), len))
    }  
  }
  
  function copy(bytes memory b) internal pure returns(bytes memory) {
    return abi.encodePacked(b);
  }
  
  function slice(bytes memory b, uint start, uint end) internal pure returns(bytes memory r) {
    if (start > end) {
      return r;
    }
    if (end > b.length-1) {
      end = b.length-1;
    }
    r = new bytes(end-start+1);
    
    uint j;
    uint i = start;
    for (; i <= end; (i++, j++)) {
      r[j] = b[i];
    }
  }
  
  function append(bytes memory b, bytes memory a) internal pure returns(bytes memory r) {
    return abi.encodePacked(b, a);
  }
  
  
  function replace(bytes memory b, bytes memory oldb, bytes memory newb) internal pure returns(bytes memory r) {
    if (equals(oldb, newb)) {
      return copy(b);
    }
    
    uint n = count(b, oldb);
    if (n == 0) {
      return copy(b);
    }
    
    uint start;
    for (uint i; i < n; i++) {
      uint j = start;
      j += uint(index(slice(b, start, b.length-1), oldb));  
      if (j!=0) {
        r = append(r, slice(b, start, j-1));
      }
      
      r = append(r, newb);
      start = j + oldb.length;
    }
    if (r.length != b.length+n*(newb.length-oldb.length)) {
      r = append(r, slice(b, start, b.length-1));
    }
  }

  function fillPattern(bytes memory b, bytes memory pattern, byte newb) internal pure returns (uint n) {
    uint start;
    while (true) {
      int i = index(b, pattern, start);
      if (i < 0) {
        return n;
      }
      uint len = pattern.length;
      for (uint k = 0; k < len; k++) {
        b[uint(i)+k] = newb;
      }
      start = uint(i)+len;
      n++;
    }
  }
}


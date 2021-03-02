//SPDX-License-Identifier: Unlicense
pragma solidity ^0.7.0;

import "hardhat/console.sol";


contract Distribute {

  function distribute(address[] calldata _to, uint256[] calldata _amount, address _token) external {

      require(_to.length == _amount.length, "recipient/amount mismatch");

      for (uint i=0; i<_to.length; i++) {
          require( IERC20(_token).transferFrom(msg.sender, _to[i], _amount[i]), "token transfer error" ) ;
      }

  }

}

abstract contract IERC20 {
    function totalSupply() public virtual view returns (uint);
    function balanceOf(address tokenOwner) public virtual view returns (uint balance);
    function allowance(address tokenOwner, address spender) public virtual view returns (uint remaining);
    function transfer(address to, uint tokens) public virtual returns (bool success);
    function approve(address spender, uint tokens) public virtual returns (bool success);
    function transferFrom(address from, address to, uint tokens) public virtual returns (bool success);

    event Transfer(address indexed from, address indexed to, uint tokens);
    event Approval(address indexed tokenOwner, address indexed spender, uint tokens);
}

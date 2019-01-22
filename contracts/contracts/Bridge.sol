pragma solidity ^0.5.0;


import "./EventListener.sol";
import "./EventEmitter.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol" as Token;
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "./libs/LibEvent.sol";

contract Bridge is Ownable {

    uint256 public chainId;
    EventListener public eventListener;
    EventEmitter public eventEmitter;

    struct Network {
        mapping(address => address) tokenToBridgedToken;
        mapping(address => address) bridgedTokenToToken;
        address escrowContract;
    }

    mapping(uint256 => Network) networks;

    constructor(uint256 _chainId, address _eventListener, address _eventEmitter) public {
        chainId = _chainId;

        eventListener = EventListener(_eventListener);
        eventEmitter = EventEmitter(_eventEmitter);

    }
    
    function claim(address _receiver, address _token, address _amount, address _salt, uint256 _chainId, uint256 _period, bytes32[] _proof) public {
        // eventEmitter.emitEvent(abi.encodePacked(msg.sender, _token, _amount, _salt));
        // GO ON HERE
        bytes32 leaf = keccak256();

        eventListener.checkEvent(_chainId, _period, _proof);
        

    }
    
    function initNetwork(address _escrowContract, uint256 _chainId) public onlyOwner {
        require(networks[_chainId].escrowContract == address(0), "CHAIN_ALREADY_INITIALISED");
        networks[_chainId].escrowContract = _escrowCOntract;
    }
    
    function getBridgedToken(address _token, uint256 _chainId) public { 
        if(networks[_network].tokenToBridgedToken[_token] != address(0)) {
            return networks[_network].tokenToBridgedToken[_token];
        }

        address bridgedTokenAddress = new Token();

        networks[_network].tokenToBridgedToken[_token] = bridgedTokenAddress;
        networks[_network].bridgedTokenToToken[_bridgedTokenAddress] = _token;

        return networks[_network].tokenToBridgedToken[_token];

    }

}
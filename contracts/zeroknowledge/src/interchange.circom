include "../circomlib/circuits/ecdsa.circom";

component ecdsa = EdDSAVerifier(80);

template Interchange(n) {
    signal input txs[n];

    for(var i = 0; i < txs.length; i++) {
        component tx = Tx(txs[i]);
        
        component main = EdDSAVerifier(80);
    }

    
}


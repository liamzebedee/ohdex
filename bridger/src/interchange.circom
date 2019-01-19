include "../circomlib/circuits/ecdsa.circom";

component ecdsa = EdDSAVerifier(80);

template Interchange(n) {
    signal input txs[n];

    signal reserved[5];
    signal escrow[5];
    signal wrapped[5];

    for(var i = 0; i < txs.length; i++) {
        component tx = Tx(txs[i]);
        
        
        escrow[] -= amount;
        wrapped[] += amount;

    }
}


template Tx(data) {
    addr = data[0];
    amount = data[1];
    

    ecdsa(data)
}
import React from 'react';
import TokenBridge from '../src/components/pages/tokenBridge/TokenBridge';
import LoadingGate from '../src/components/util/LoadingGate/LoadingGate';
import Head from 'next/head';

class TokenBridgePage extends React.Component<any> {

    render(){
        return(
            <div>

                <Head>
                    <title key="title">Bridge Token</title>
                </Head>

                <LoadingGate><TokenBridge /></LoadingGate>
            </div>
        )
    }

}

export default TokenBridgePage;
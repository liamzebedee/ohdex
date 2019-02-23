import React from 'react';
import CreateToken from '../src/components/pages/createToken/CreateToken';
import LoadingGate from '../src/components/util/LoadingGate/LoadingGate';
import Head from 'next/head';

class CreateTokenPage extends React.Component<any> {

    render() {
        return (

            <div>

                <Head>
                    <title key="title">Create a Token</title>
                </Head>

                <LoadingGate><CreateToken /></LoadingGate>
            </div>

           
        )
    }

}

export default CreateTokenPage;
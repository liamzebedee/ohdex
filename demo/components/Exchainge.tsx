
import React from 'react';
import Select from '@atlaskit/select';

const Exchainge = () => {
    return <div>
        Select your altchain
        <ChainSelector/>
    </div>
}

const Step1 = () => <div>
    Select your altchain
    <ChainSelector/>
</div>

const Step2 = () => 


const ChainSelector = () => (
  <Select
    className="single-select"
    classNamePrefix="react-select"
    options={[
      { label: 'Ropsten', value: 'ropsten' },
      { label: 'POA', value: 'poa' },
    ]}
    placeholder="Select an altchain"
  />
);

export {
    Exchainge
}
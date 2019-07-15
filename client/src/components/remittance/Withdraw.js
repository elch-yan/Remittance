import React, { useState } from 'react';
import assert from 'assert';

function Withdraw({ web3, remittance }) {
    const [ state, setState ] = useState();
    let beneficiaryInput = null;
    let secretInput = null;

    async function onWithdrawClick() {
        try {
            const beneficiaryAddr = beneficiaryInput.value;
            const secret = secretInput.value;

            // checking if transaction will succeed
            assert(await remittance.withdraw.call(
                web3.utils.fromAscii(secret),
                { from: beneficiaryAddr }
            ), 'The transaction will fail anyway, not sending');

            const txObj = await remittance.withdraw(
                web3.utils.fromAscii(secret),
                { from: beneficiaryAddr }
            ).on(
                'transactionHash',
                txHash => setState(`Transaction on the way ${txHash}`)
            );

            const receipt = txObj.receipt;
            console.log('got receipt', receipt);
            if (!receipt.status) {
                console.error('Wrong status');
                console.error(receipt);
                setState('There was an error in the tx execution, status not 1');
            } else if (receipt.logs.length === 0) {
                console.error('Empty logs');
                console.error(receipt);
                setState('There was an error in the tx execution, missing expected event');
            } else {
                console.log(receipt.logs[0]);
                setState('Transfer executed succesfully');
            }
        } catch (err) {
            console.error(err);
        }
    }

    return (
        <div className="ui two column grid">
            <div className="ui input four wide column">
                <input type="text" ref={i => beneficiaryInput = i} placeholder="Your address"/>
            </div>
            <div className="ui input four wide column">
                <input type="text" ref={i => secretInput= i} placeholder="Secret"/>
            </div>
            <div className="two wide column">
                <button className="ui button" onClick={onWithdrawClick}>Withdraw</button>
            </div>
            <div className="five wide column">
                <p>{state}</p>
            </div>
        </div>
    );
}

export default Withdraw;
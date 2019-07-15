import React, { useState } from 'react';
import assert from 'assert';

function Create({ web3, remittance }) {
    const [ state, setState ] = useState();
    let depositorInput = null;
    let beneficiaryInput = null;
    let amountInput = null;
    let secretInput = null;
    let deadlineInput = null;

    async function onCreateClick() {
        try {
            const depositorAddr = depositorInput.value;
            const beneficiaryAddr = beneficiaryInput.value;
            const amount = parseInt(amountInput.value);
            const secret = secretInput.value;
            const deadline = parseInt(deadlineInput.value);

            const puzzle = await remittance.generatePuzzle(web3.utils.fromAscii(secret), beneficiaryAddr);

            // checking if transaction will succeed
            assert(await remittance.createDeposit.call(
                puzzle,
                deadline,
                { from: depositorAddr, value: amount }
            ), 'The transaction will fail anyway, not sending');

            const txObj = await remittance.createDeposit(
                puzzle,
                deadline,
                { from: depositorAddr, value: amount }
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
                setState(`Transfer executed, you can get refund using this puzzle ${puzzle}`);
            }
        } catch (err) {
            console.error(err);
        }
    }

    return (
        <div className="ui two column grid">
            <div className="ui input four wide column">
                <input type="text" ref={i => depositorInput = i} placeholder="Your address"/>
            </div>
            <div className="ui input four wide column">
                <input type="text" ref={i => beneficiaryInput = i} placeholder="Beneficiary address"/>
            </div>
            <div className="ui input four wide column">
                <input type="text" ref={i => amountInput = i} placeholder="Amount"/>
            </div>
            <div className="ui input four wide column">
                <input type="text" ref={i => secretInput = i} placeholder="Secret"/>
            </div>
            <div className="ui input four wide column">
                <input type="text" ref={i => deadlineInput = i} placeholder="Deadline in milliseconds"/>
            </div>
            <div className="two wide column">
                <button className="ui button" onClick={onCreateClick}>Create</button>
            </div>
            <div className="five wide column">
                <p>{state}</p>
            </div>
        </div>
    );
}

export default Create;
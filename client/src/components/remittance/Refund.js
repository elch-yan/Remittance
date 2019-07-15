import React, { useState } from 'react';
import assert from 'assert';

function Refund({ remittance }) {
    const [ state, setState ] = useState();
    let depositorInput = null;
    let puzzleInput = null;

    async function onWithdrawClick() {
        try {
            const depositorAddr = depositorInput.value;
            const puzzle = puzzleInput.value;

            // checking if transaction will succeed
            assert(await remittance.refund.call(
                puzzle,
                { from: depositorAddr }
            ), 'The transaction will fail anyway, not sending');

            const txObj = await remittance.refund(
                puzzle,
                { from: depositorAddr }
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
                setState('Transfer executed, successfully');
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
                <input type="text" ref={i => puzzleInput = i} placeholder="Puzzle"/>
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

export default Refund;
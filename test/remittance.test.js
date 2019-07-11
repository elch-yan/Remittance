const chai = require('chai');
chai.use(require('chai-as-promised')).should();
const { expect } = chai;

const Remittance = artifacts.require('Remittance');

contract('Remittance', accounts => {
    // Setup accounts
    const [ owner, depositor, beneficiary ] = accounts;

    const fund = 5000;
    const tax = 100;
    let puzzle;
    let remittanceInstance;
    let deadLineTestingPuzzle;
    
    before(async () => {
        remittanceInstance = await Remittance.deployed();
        puzzle = await remittanceInstance.generatePuzzle('secret', beneficiary);

        deadLineTestingPuzzle = await remittanceInstance.generatePuzzle('deadLineSecret', beneficiary);

        // Preparing deposit to test deadline
        const txObject = await remittanceInstance.createDeposit(deadLineTestingPuzzle, 0, { from: depositor, value: fund });
        assert(txObject.receipt.status, `Deposit creation for an account: ${beneficiary} failed`);
    });

    describe('Overall functionality', () => {
        it('Should generate same puzzle with same arguments', async () => {
            const secret = 'SecretKey';
            const puzzle1 = await remittanceInstance.generatePuzzle(secret, beneficiary);
            const puzzle2 = await remittanceInstance.generatePuzzle(secret, beneficiary);

            assert(puzzle1 && puzzle1 === puzzle2, 'Puzzle generation failed');
        });

        it('Should be able to create deposit', async () => {
            const deadline = 1000;

            // Creating deposit
            const txObject = await remittanceInstance.createDeposit(puzzle, deadline, { from: depositor, value: fund });
            assert(txObject.receipt.status, `Deposit creation for an account: ${beneficiary} failed`);
            
            // Checking if logs have been written
            expect(txObject.logs.map(({ event }) => event), 'Problem with logs').to.deep.equal([
                'LogTaxed',
                'LogDepositCreated'
            ]);

            // Checking if deposit has been created 
            let deposit = await remittanceInstance.deposits.call(puzzle);
            deposit = [ deposit.fund.toNumber(), deposit.depositor ];
            expect(deposit).to.deep.equal([ fund - tax, depositor ]);

            // Checking reward has been saved
            const reward = await remittanceInstance.reward.call();
            expect(reward.toNumber(), 'Reward is incorrect').to.be.equal(2 * tax);
        });

        it('Should be able to withdraw deposited fund', async () => {
            // Get account initial balance
            const initialBalance = web3.utils.toBN(await web3.eth.getBalance(beneficiary));

            // Withdrawing
            const txObject = await remittanceInstance.withdraw('secret', { from: beneficiary });
            assert(txObject.receipt.status, `Deposit withdrawal for an account: ${beneficiary} failed`);

            // Get transaction cost
            const txPrice = await getTransactionPrice(txObject);

            // Get account final balance
            const finalBalance = web3.utils.toBN(await web3.eth.getBalance(beneficiary));

            // Check final balance
            assert.equal(finalBalance.add(txPrice).sub(initialBalance).toString(), fund - tax, `Final balance for an account: ${beneficiary} is incorrect`);

            // Checking if logs have been written
            expect(txObject.logs.map(({ event }) => event)[0], `LogDepositWithdrawn haven't been written`).to.deep.equal('LogDepositWithdrawn');

            // Checking if deposit's been updated 
            let depositFund = (await remittanceInstance.deposits.call(puzzle)).fund;
            expect(depositFund.toNumber()).to.be.equal(0);
        });

        it('Should not be able to get the refund after deadline, if not depositor', async () => {
            await remittanceInstance.refund.call(deadLineTestingPuzzle, { from: owner }).should.be.rejectedWith(Error);
        });

        it('Should be able to get the refund, after deadline', async () => {
            // Get account initial balance
            const initialBalance = web3.utils.toBN(await web3.eth.getBalance(depositor));

            // Requesting refund
            const txRefundObject = await remittanceInstance.refund(deadLineTestingPuzzle, { from: depositor });
            assert(txRefundObject.receipt.status, `Deposit withdrawal for an account: ${depositor} failed`);

            // Get transaction cost
            const txPrice = await getTransactionPrice(txRefundObject);

            // Get account final balance
            const finalBalance = web3.utils.toBN(await web3.eth.getBalance(depositor));

            // Check final balance
            assert.equal(finalBalance.add(txPrice).sub(initialBalance).toString(), fund - tax, `Final balance for an account: ${depositor} is incorrect`);

            // Checking if logs have been written
            expect(txRefundObject.logs.map(({ event }) => event)[0], `LogDepositRefunded haven't been written`).to.deep.equal('LogDepositRefunded');

            // Checking if deposit's been updated 
            let depositFund = (await remittanceInstance.deposits.call(puzzle)).fund;
            expect(depositFund.toNumber()).to.be.equal(0);
        });

        it('Should be able to claim reward', async () => {
            // Get account initial balance
            const initialBalance = web3.utils.toBN(await web3.eth.getBalance(owner));

            // Claiming reward
            const txObject = await remittanceInstance.claimReward({ from: owner });
            assert(txObject.receipt.status, `Reward withdrawal for an account: ${owner} failed`);

            // Get transaction cost
            const txPrice = await getTransactionPrice(txObject);

            // Get account final balance
            const finalBalance = web3.utils.toBN(await web3.eth.getBalance(owner));

            // Check final balance
            assert.equal(finalBalance.add(txPrice).sub(initialBalance).toString(), 2 * tax, `Final balance for an account: ${owner} is incorrect`);

            // Checking if logs have been written
            expect(txObject.logs.map(({ event }) => event)[0], `LogRewardClaimed haven't been written`).to.deep.equal('LogRewardClaimed');

            // Checking if reward's been updated 
            let reward = await remittanceInstance.reward.call();
            expect(reward.toNumber()).to.be.equal(0);
        });

        it('Should not be able to create deposit with same puzzle twice', async () => {
            const deadline = 10000;

            // Creating deposit
            const txObject = await remittanceInstance.createDeposit(puzzle, deadline, { from: depositor, value: fund });
            assert(txObject.receipt.status, `Deposit creation for an account: ${beneficiary} failed`);
            
            // Checking if we can create deposit with same puzzle for the second time
            await remittanceInstance.createDeposit.call(puzzle, deadline, { from: depositor, value: fund }).should.be.rejectedWith(Error);
        });

        it('Should not be able to withdraw deposited fund with wrong secret', async () => {
            await remittanceInstance.withdraw.call('wrongSecret', { from: beneficiary }).should.be.rejectedWith(Error);
        });

        it('Should not be able to get the refund, before deadline is over', async () => {
            await remittanceInstance.refund.call('secret', { from: depositor }).should.be.rejectedWith(Error);
        });

        it('Should not be able to claim reward if not an owner', async () => {
            await remittanceInstance.claimReward.call({ from: depositor }).should.be.rejectedWith(Error);
        });

        it('Should be able to change tax', async () => {
            const newTax = 200;

            // Changing tax
            const txObject = await remittanceInstance.changeTax(newTax, { from: owner });
            assert(txObject.receipt.status, 'Tax change failed');

            // Checking if logs have been written
            expect(txObject.logs.map(({ event }) => event)[0], `LogTaxChanged haven't been written`).to.deep.equal('LogTaxChanged');

            // Checking if tax has been changed
            const tax = await remittanceInstance.tax.call();
            expect(tax.toNumber(), 'Wrong tax').to.be.equal(newTax);
        });

        it('Should not be able to change tax if not an owner', async () => {
            await remittanceInstance.changeTax(500, { from: beneficiary }).should.be.rejectedWith(Error);
        });
    });
});

/**
 * Retrieves price for making a transaction
 *
 * @param {Object} txObject
 * @returns {BN} price
 */
async function getTransactionPrice(txObject) {
    // Obtain used gas from the receipt
    const gasUsed = web3.utils.toBN(txObject.receipt.gasUsed);
    
    // Obtain gasPrice from the transaction
    const tx = await web3.eth.getTransaction(txObject.tx);
    const gasPrice = web3.utils.toBN(tx.gasPrice);
    
    // Calculate overall price
    return gasPrice.mul(gasUsed);
}
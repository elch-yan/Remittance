const chai = require('chai');
chai.use(require('chai-as-promised')).should();
const { expect } = chai;

const Remittance = artifacts.require('Remittance');

contract('Remittance', accounts => {
    // Setup accounts
    const [ owner, depositor, beneficiary ] = accounts;

    const deadline = 1000;
    const fund = 5000;
    const tax = 100;
    const secret = web3.utils.fromAscii('secret');
    let puzzle;
    let remittanceInstance;

    beforeEach(async () => {
        remittanceInstance = await Remittance.new(100000, 100, { from: owner });
        puzzle = await remittanceInstance.generatePuzzle(secret, beneficiary);
    });

    describe('Overall functionality', () => {
        it('Should generate same puzzle with same arguments', async () => {
            const secret = web3.utils.fromAscii('SecretKey');
            const puzzle1 = await remittanceInstance.generatePuzzle(secret, beneficiary);
            const puzzle2 = await remittanceInstance.generatePuzzle(secret, beneficiary);

            assert(puzzle1 && puzzle1 === puzzle2, 'Puzzle generation failed');
        });

        it('Should be able to create deposit', async () => {
            const txObject = await createDeposit();
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
            const reward = await remittanceInstance.getReward();
            expect(reward.toNumber(), 'Reward is incorrect').to.be.equal(tax);
        });

        it('Should be able to withdraw deposited fund', async () => {
            await createDeposit();

            // Get account initial balance
            const initialBalance = web3.utils.toBN(await web3.eth.getBalance(beneficiary));

            // Withdrawing
            const txObject = await remittanceInstance.withdraw(secret, { from: beneficiary });
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
            await createDeposit();

            // Making sure deadline have passed
            await travelToFuture(2000);
            
            await remittanceInstance.refund.call(puzzle, { from: owner }).should.be.rejectedWith(Error);
        });

        it('Should be able to get the refund, after deadline', async () => {
            await createDeposit();
            
            // Making sure deadline have passed
            await travelToFuture(2000);

            // Get account initial balance
            const initialBalance = web3.utils.toBN(await web3.eth.getBalance(depositor));
            // Requesting refund
            const txRefundObject = await remittanceInstance.refund(puzzle, { from: depositor });
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
            await createDeposit();

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
            assert.equal(finalBalance.add(txPrice).sub(initialBalance).toString(), tax, `Final balance for an account: ${owner} is incorrect`);

            // Checking if logs have been written
            expect(txObject.logs.map(({ event }) => event)[0], `LogRewardClaimed haven't been written`).to.deep.equal('LogRewardClaimed');

            // Checking if reward's been updated 
            let reward = await remittanceInstance.getReward();
            expect(reward.toNumber()).to.be.equal(0);
        });

        it('Should not be able to create deposit with same puzzle twice', async () => {
            await createDeposit();

            // Checking if we can create deposit with same puzzle for the second time
            await remittanceInstance.createDeposit.call(puzzle, deadline, { from: depositor, value: fund }).should.be.rejectedWith(Error);
        });

        it('Should not be able to withdraw deposited fund with wrong secret', async () => {
            await createDeposit();

            await remittanceInstance.withdraw.call(web3.utils.fromAscii('wrongSecret'), { from: beneficiary }).should.be.rejectedWith(Error);
        });

        it('Should not be able to get the refund, before deadline is over', async () => {
            await createDeposit();

            await remittanceInstance.refund.call(secret, { from: depositor }).should.be.rejectedWith(Error);
        });

        it('Should not be able to claim reward if not an owner', async () => {
            await createDeposit();

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
            const tax = await remittanceInstance.getTax();
            expect(tax.toNumber(), 'Wrong tax').to.be.equal(newTax);
        });

        it('Should not be able to change tax if not an owner', async () => {
            await remittanceInstance.changeTax(500, { from: beneficiary }).should.be.rejectedWith(Error);
        });


        /**
         * Creates default deposit for testing
         */
        function createDeposit() {
            return remittanceInstance.createDeposit(puzzle, deadline, { from: depositor, value: fund });
        }
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

/**
 * Increases EVM block time by given amount of milliseconds
 *
 * @param {Number} time milliseconds
 * @returns {Promise}
 */
async function travelToFuture(time) {
    return new Promise((resolve, reject) => {
        web3.currentProvider.send({
                jsonrpc: "2.0",
                method: "evm_increaseTime",
                params: [ time ],
                id: new Date().getTime()
            }, (err, res) => err && reject(error) || resolve(res.result));
    });
}
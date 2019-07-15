import React, { Component } from 'react';
import Menu from './components/Menu';
import { BrowserRouter, Route } from 'react-router-dom';

import getWeb3 from './utils/getWeb3';
import truffleContract from 'truffle-contract';
import remittanceJson from './contracts/Remittance.json';

import Create from './components/remittance/Create';
import Withdraw from './components/remittance/Withdraw';
import Refund from './components/remittance/Refund';
import Reward from './components/remittance/Reward';

class App extends Component {
    constructor(props) {
        super(props);

        this.state = { web3: null }
    }

    async componentDidMount() {
        try {
            const web3 = await getWeb3();

            const Remittance = truffleContract(remittanceJson);
            Remittance.setProvider(web3.currentProvider);

            const remittance = await Remittance.deployed();

            this.setState({ web3, remittance });
        } catch (err) {
            console.error(err);
        }
    }

    render() {
        if (!this.state.web3) {
            return <div>Loading Web3</div>;
        }

        return (
            <div className="ui container">
            <BrowserRouter>
                <div className="ui two column grid">
                    <div className="four wide column">
                        <Menu />
                    </div>
                    <div className="twelve wide column">
                        <div className="ui massive message">
                            Welcome to Remittance!
                        </div>
                        <Route path="/client/create" component={() => <Create {...this.state} />} />
                        <Route path="/client/withdraw" component={() => <Withdraw {...this.state} />} />
                        <Route path="/client/refund" component={() => <Refund {...this.state} />} />
                        <Route path="/owner/reward" component={() => <Reward {...this.state} />} />
                    </div>
                </div>
            </BrowserRouter>
            </div>
        );
    }
}

export default App;

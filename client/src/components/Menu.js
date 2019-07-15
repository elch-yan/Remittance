import React from 'react';
import { Link } from 'react-router-dom';

function Menu() {
    return (
        <div className="ui vertical menu">
            <div className="item">
                <div className="header">Client</div>
                <div className="menu">
                <Link to="/client/create" className="item">Create Deposit</Link>
                <Link to="/client/withdraw" className="item">Withdraw</Link>
                <Link to="/client/refund" className="item">Get Refund</Link>
                </div>
            </div>
            <div className="item">
                <div className="header">Owner</div>
                <div className="menu">
                <Link to="/owner/reward" className="item">Claim Reward</Link>
                </div>
            </div>
        </div>
    );
}

export default Menu;
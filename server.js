const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const axios = require('axios');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(cors());

const consumerKey = 'YOUR_CONSUMER_KEY';
const consumerSecret = 'YOUR_CONSUMER_SECRET';
const shortCode = 'YOUR_SHORT_CODE';
const passkey = 'YOUR_PASSKEY';
const callbackURL = 'YOUR_CALLBACK_URL';

let accessToken = '';

const getAccessToken = async () => {
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    const response = await axios.get('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
        headers: {
            Authorization: `Basic ${auth}`,
        },
    });
    accessToken = response.data.access_token;
};

const initiateSTKPush = async (phone, amount) => {
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
    const password = Buffer.from(`${shortCode}${passkey}${timestamp}`).toString('base64');

    const response = await axios.post(
        'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
        {
            BusinessShortCode: shortCode,
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerPayBillOnline',
            Amount: amount,
            PartyA: phone,
            PartyB: shortCode,
            PhoneNumber: phone,
            CallBackURL: callbackURL,
            AccountReference: 'BettingGame',
            TransactionDesc: 'Deposit to Wallet',
        },
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
    );

    return response.data;
};

const initiateWithdrawal = async (phone, amount) => {
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
    const password = Buffer.from(`${shortCode}${passkey}${timestamp}`).toString('base64');

    const response = await axios.post(
        'https://sandbox.safaricom.co.ke/mpesa/b2c/v1/paymentrequest',
        {
            InitiatorName: 'YOUR_INITIATOR_NAME',
            SecurityCredential: 'YOUR_SECURITY_CREDENTIAL',
            CommandID: 'BusinessPayment',
            Amount: amount,
            PartyA: shortCode,
            PartyB: phone,
            Remarks: 'Withdrawal',
            QueueTimeOutURL: callbackURL,
            ResultURL: callbackURL,
            Occasion: 'Withdrawal',
        },
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
    );

    return response.data;
};

mongoose.connect('mongodb://localhost:27017/betting-game', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const userSchema = new mongoose.Schema({
    phone: String,
    otp: String,
    wallet: Number,
});

const User = mongoose.model('User', userSchema);

app.post('/signup', async (req, res) => {
    const { phone, otp } = req.body;
    const user = new User({ phone, otp, wallet: 0 });
    await user.save();
    res.send('User signed up successfully');
});

app.post('/verify-otp', async (req, res) => {
    const { phone, otp } = req.body;
    const user = await User.findOne({ phone, otp });
    if (user) {
        res.send('OTP verified successfully');
    } else {
        res.status(400).send('Invalid OTP');
    }
});

app.post('/add-money', async (req, res) => {
    const { phone, amount } = req.body;
    await getAccessToken();
    const response = await initiateSTKPush(phone, amount);

    if (response.ResponseCode === '0') {
        const user = await User.findOne({ phone });
        if (user) {
            user.wallet += parseFloat(amount);
            await user.save();
            res.send('Deposit successful');
        } else {
            res.status(404).send('User not found');
        }
    } else {
        res.status(400).send('Deposit failed');
    }
});

app.post('/withdraw', async (req, res) => {
    const { phone, amount } = req.body;
    const user = await User.findOne({ phone });
    if (user && user.wallet >= amount) {
        await getAccessToken();
        const response = await initiateWithdrawal(phone, amount);

        if (response.ResponseCode === '0') {
            user.wallet -= amount;
            await user.save();
            res.send('Withdrawal successful');
        } else {
            res.status(400).send('Withdrawal failed');
        }
    } else {
        res.status(400).send('Insufficient funds or user not found');
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

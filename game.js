let walletAmount = 0;
let betAmount = 0;
let gameRunning = false;
let jetMultiplier = 1.00;
let highestMultiplier = 1.00;
let interval;
let userSignedIn = false;

const walletDisplay = document.getElementById('walletAmount');
const jetMultiplierDisplay = document.getElementById('jetMultiplier');
const highestMultiplierDisplay = document.getElementById('highestMultiplier');
const message = document.getElementById('message');
const betButton = document.getElementById('betButton');
const cashOutButton = document.getElementById('cashOutButton');
const addMoneyButton = document.getElementById('addMoney');
const withdrawButton = document.getElementById('withdrawButton');
const signUpForm = document.getElementById('signUpForm');
const gameContainer = document.getElementById('gameContainer');

addMoneyButton.addEventListener('click', addMoney);
betButton.addEventListener('click', placeBet);
cashOutButton.addEventListener('click', cashOut);
withdrawButton.addEventListener('click', withdrawMoney);
signUpForm.addEventListener('submit', signUp);

function addMoney() {
    const amount = prompt('Enter amount to add:');
    const phone = 'USER_PHONE_NUMBER'; // Replace with the user's phone number

    try {
        const response = await fetch('http://localhost:3000/deposit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ phone, amount }),
        });

        if (response.ok) {
            const data = await response.json();
            message.textContent = 'Deposit request sent. Please check your MPESA phone for a pop-up message.';
        } else {
            message.textContent = 'Deposit request failed!';
        }
    } catch (error) {
        console.error('Error:', error);
        message.textContent = 'An error occurred!';
    }
}

function placeBet() {
    if (!gameRunning) {
        betAmount = prompt('Enter bet amount:');
        if (betAmount > walletAmount) {
            message.textContent = 'Insufficient funds!';
            return;
        }
        walletAmount -= betAmount;
        updateWallet();
        startGame();
    }
}

function cashOut() {
    if (gameRunning) {
        const winnings = betAmount * jetMultiplier;
        walletAmount += winnings;
        updateWallet();
        message.textContent = `You cashed out at x${jetMultiplier.toFixed(2)} and won ${winnings.toFixed(2)} KES!`;
        betAmount = 0; // Reset bet amount after cashing out
    }
}

function withdrawMoney() {
    const amount = prompt('Enter amount to withdraw:');
    const phone = 'USER_PHONE_NUMBER'; // Replace with the user's phone number

    try {
        const response = await fetch('http://localhost:3000/withdraw', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ phone, amount }),
        });

        if (response.ok) {
            message.textContent = 'Withdrawal request sent. Please check your MPESA phone for a pop-up message.';
        } else {
            message.textContent = 'Withdrawal request failed!';
        }
    } catch (error) {
        console.error('Error:', error);
        message.textContent = 'An error occurred!';
    }
}

function startGame() {
    gameRunning = true;
    jetMultiplier = 1.00;
    highestMultiplier = 1.00;
    betButton.disabled = true;
    cashOutButton.disabled = false;
    message.textContent = 'Game started!';

    interval = setInterval(() => {
        jetMultiplier += 0.1;
        if (jetMultiplier > highestMultiplier) {
            highestMultiplier = jetMultiplier;
        }
        jetMultiplierDisplay.textContent = `x${jetMultiplier.toFixed(2)}`;
        highestMultiplierDisplay.textContent = `Highest Multiplier: x${highestMultiplier.toFixed(2)}`;
        if (Math.random() < 0.9) { // 90% chance to end
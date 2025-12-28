const pool = require('../config/mysql');
const { logActivity } = require('./userController'); // Reuse activity logger

const EXCHANGE_RATE = 100;

// Helper to determine coin value for logic (Bronze=1, Silver=100, Gold=10000)
// Actually simpler: just handle pairs.
// Supported Pairs:
// bronze -> silver (100 -> 1)
// silver -> bronze (1 -> 100)
// silver -> gold (100 -> 1)
// gold -> silver (1 -> 100)

exports.exchangeCurrency = async (req, res) => {
    const userId = req.user.id;
    const { fromCurrency, toCurrency, amount } = req.body; // amount is how much user GIVES

    if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
    }

    // Mapping for column names
    const currencyMap = {
        'bronze': 'coin_bronze',
        'silver': 'coin_silver',
        'gold': 'coin_gold'
    };

    if (!currencyMap[fromCurrency] || !currencyMap[toCurrency]) {
        return res.status(400).json({ message: "Invalid currency type" });
    }

    if (fromCurrency === toCurrency) {
        return res.status(400).json({ message: "Cannot exchange same currency" });
    }

    let resultingAmount = 0;
    let rateDescription = "";

    // VALIDATE PAIRS & RATE
    if (fromCurrency === 'bronze' && toCurrency === 'silver') {
        if (amount < EXCHANGE_RATE) return res.status(400).json({ message: `Minimum ${EXCHANGE_RATE} Bronze required` });
        if (amount % EXCHANGE_RATE !== 0) return res.status(400).json({ message: `Amount must be multiple of ${EXCHANGE_RATE}` });
        resultingAmount = amount / EXCHANGE_RATE;
        rateDescription = "100 Bronze = 1 Silver";
    } 
    else if (fromCurrency === 'silver' && toCurrency === 'bronze') {
        resultingAmount = amount * EXCHANGE_RATE;
        rateDescription = "1 Silver = 100 Bronze";
    }
    else if (fromCurrency === 'silver' && toCurrency === 'gold') {
        if (amount < EXCHANGE_RATE) return res.status(400).json({ message: `Minimum ${EXCHANGE_RATE} Silver required` });
        if (amount % EXCHANGE_RATE !== 0) return res.status(400).json({ message: `Amount must be multiple of ${EXCHANGE_RATE}` });
        resultingAmount = amount / EXCHANGE_RATE;
        rateDescription = "100 Silver = 1 Gold";
    }
    else if (fromCurrency === 'gold' && toCurrency === 'silver') {
        resultingAmount = amount * EXCHANGE_RATE;
        rateDescription = "1 Gold = 100 Silver";
    }
    else {
        // Direct Bronze -> Gold not allowed per plan (keep it simple/immersive)
        // Or if user wants, currently blocking it.
        return res.status(400).json({ message: "Direct exchange not supported for this pair." });
    }

    try {
        const conn = await pool.getConnection();
        await conn.beginTransaction();

        // 1. Check Balance
        const [users] = await conn.execute(`SELECT ${currencyMap[fromCurrency]} as balance FROM users WHERE id = ? FOR UPDATE`, [userId]);
        const userBalance = users[0].balance;

        if (userBalance < amount) {
            await conn.rollback();
            conn.release();
            return res.status(400).json({ message: "Insufficient balance" });
        }

        // 2. Deduct From
        await conn.execute(`UPDATE users SET ${currencyMap[fromCurrency]} = ${currencyMap[fromCurrency]} - ? WHERE id = ?`, [amount, userId]);

        // 3. Add To
        await conn.execute(`UPDATE users SET ${currencyMap[toCurrency]} = ${currencyMap[toCurrency]} + ? WHERE id = ?`, [resultingAmount, userId]);

        await conn.commit();
        conn.release();

        // 4. Log Activity (Non-blocking)
        logActivity(userId, 'Exchange', `Exchanged ${amount} ${fromCurrency} to ${resultingAmount} ${toCurrency}`);

        res.json({ 
            success: true, 
            message: "Exchange successful",
            exchanged: { from: fromCurrency, to: toCurrency, amountIn: amount, amountOut: resultingAmount }
        });

    } catch (err) {
        console.error("EXCHANGE ERROR:", err);
        res.status(500).json({ message: "Exchange failed" });
    }
};

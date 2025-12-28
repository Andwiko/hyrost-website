require('dotenv').config();
const mongoose = require('mongoose');
const RedeemCode = require('./models/RedeemCode');

const seedCode = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('Error: MONGODB_URI is not defined in .env');
            process.exit(1);
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');

        // Check if code exists
        const exists = await RedeemCode.findOne({ code: 'HYRO2024' });
        if (exists) {
            console.log('Code HYRO2024 already exists.');
        } else {
            const newCode = new RedeemCode({
                code: 'HYRO2024',
                rewardCommand: 'give %player% diamond 1',
                maxUses: 999,
                isActive: true
            });
            await newCode.save();
            console.log('Success! Created code: HYRO2024 (Reward: 1 Diamond)');
        }

    } catch (error) {
        console.error('Error seeding code:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected');
    }
};

seedCode();

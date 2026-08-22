const { execSync } = require('child_process');
const fs = require('fs');

console.log('🚀 Starting automatic dependency repair...');

try {
    console.log('📦 Installing dependencies (npm install)... This may take a few minutes.');
    // Run npm install with stdio passed to console so user sees progress
    execSync('npm install --no-audit', { stdio: 'inherit' });
    
    console.log('✅ Dependencies installed successfully!');
    console.log('🔄 You can now restart the server normally.');
    
    // Attempt to verify express
    try {
        require('express');
        console.log('✅ Verified: Express module is available.');
    } catch (e) {
        console.error('❌ Verification failed: Express still not found despite npm install success.');
    }

} catch (error) {
    console.error('❌ Failed to install dependencies:', error.message);
    console.log('⚠️ Please try running "npm install" manually in the Console.');
}

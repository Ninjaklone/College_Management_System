const bcrypt = require('bcrypt');

async function hashPassword(plainPassword) {
    try {
        // Use 10 salt rounds (standard practice)
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);
        
        console.log('Password Hashing:');
        console.log('Plain Password:', plainPassword);
        console.log('Hashed Password:', hashedPassword);
        
        return hashedPassword;
    } catch (error) {
        console.error('Password Hashing Error:', error);
        throw error;
    }
}

async function verifyPassword(plainPassword, hashedPassword) {
    try {
        console.log('Password Verification:');
        console.log('Plain Password:', plainPassword);
        console.log('Stored Hash:', hashedPassword);

        // Verify the hash is in correct bcrypt format
        if (!hashedPassword.startsWith('$2')) {
            console.error('Invalid hash format. Requires bcrypt hash.');
            return false;
        }

        const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
        
        console.log('Comparison Result:', isMatch);
        return isMatch;
    } catch (error) {
        console.error('Password Verification Error:', error);
        return false;
    }
}

module.exports = { hashPassword, verifyPassword };
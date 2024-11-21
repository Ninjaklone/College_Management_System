const mysql = require('mysql2/promise');
const { hashPassword } = require('../utils/passwordUtils');

async function convertPasswords() {
    // Database connection configuration
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'qwertyuiop',
        database: 'college_man_sys'
    });

    try {
        // Fetch all users with unhashed passwords
        const [users] = await connection.execute('SELECT id, password FROM users');

        console.log(`Found ${users.length} users to convert`);

        // Counter for tracking conversions
        let convertedCount = 0;
        let skippedCount = 0;

        // Process each user
        for (const user of users) {
            // Skip if password is already looks like a bcrypt hash (starts with $2)
            if (user.password.startsWith('$2')) {
                skippedCount++;
                continue;
            }

            try {
                // Hash the password
                const hashedPassword = await hashPassword(user.password);

                // Update the user's password in the database
                await connection.execute(
                    'UPDATE users SET password = ? WHERE id = ?', 
                    [hashedPassword, user.id]
                );

                convertedCount++;
                console.log(`Converted password for user ID: ${user.id}`);
            } catch (error) {
                console.error(`Error converting password for user ID ${user.id}:`, error);
            }
        }

        console.log(`
        Conversion Complete:
        - Total Users: ${users.length}
        - Converted: ${convertedCount}
        - Skipped (Already Hashed): ${skippedCount}
        `);
    } catch (error) {
        console.error('Error in password conversion:', error);
    } finally {
        // Close the database connection
        await connection.end();
    }
}

// Run the conversion
convertPasswords();

const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'qwertyuiop',
    database: 'college_man_sys'
});

connection.connect((err) => {
    if (err) {
        throw err;
    }
    console.log('Connected to database');
});

module.exports = connection;


function createUser(username, password, role, email) {

  const sql = "INSERT INTO users (username, password, role, email) VALUES (?, ?, ?, ?)"
  connection.query(sql, [username, password, role, email], (err, result) => {
    if (err) {
      console.error("Error creating user:", err)

      return
    }
    console.log(`New user added with ID: ${result.insertId}`)
  })
}

// Example usage:
createUser("ibembem imu", "hashedPassword123", "student", "ibemimu@example.com")








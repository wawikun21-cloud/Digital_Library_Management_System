<?php
$conn = new mysqli("localhost", "root", "", "lexora");
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// First delete existing librarian if any
$conn->query("DELETE FROM users WHERE username = 'librarian'");

// Insert librarian with correct role
$hashed = '$2b$10$ElJ3d4HI9eEAX086sjsL9.rKh12BbSyutcq9h.SJ57JBIfkT6smOC';
$stmt = $conn->prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)");
$stmt->bind_param("sss", $username, $password, $role);
$username = "librarian";
$password = $hashed;
$role = "librarian";
$stmt->execute();

echo "Librarian user created successfully!\n";

// Verify
$result = $conn->query("SELECT username, role FROM users WHERE username = 'librarian'");
if ($row = $result->fetch_assoc()) {
    echo "Verification: " . $row['username'] . " - " . $row['role'] . "\n";
}

$conn->close();

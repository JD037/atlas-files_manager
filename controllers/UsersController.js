#!/usr/bin/node
const sha1 = require('sha1');
const dbClient = require ('../utils/db');

class UsersController {
  // Creating a user, must specify an email and a password
  static async postNew(request, response) {
    const { email, password } = request.body;

    // Check if email is provided
    if (!email) {
      return response.status(400).json({ error: 'Missing email' });
    }
    // Check if password is provided
    if (!password) {
      return response.status(400).json({ error: 'Missing password' });
    }
    // Check if email already exists
    const existingUser = await dbClient.users.findOne({ email });
    if (existingUser) {
      return response.status(400).json({ error: 'Already exist' });
    }
    // Hash the password using SHA1
    const hashedPassword = sha1(password);
    // Create new user
    const newUser = await dbClient.users.insertOne({
      email,
      password: hashedPassword,
    });
    // The endpoint is returning the new user with only the email and the id
    return response.status(201).json({ id: newUser.insertedId, email });
  }
}

module.exports = UsersController;

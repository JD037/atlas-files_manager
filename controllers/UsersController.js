const sha1 = require('sha1');
const mongodb = require('mongodb');
const dbClient = require('../utils/db'); // import mongo user
const redisClient = require('../utils/redis');

const REDIS_AUTH_PREFIX = 'auth_';

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

  // GET /users/me endpoint (Task 4)
  static async getMe(req, res) {
    // Get the token from the X-Token header
    const token = req.header('x-token');
    const key = `${REDIS_AUTH_PREFIX}${token}`;
    console.log(`Token received: ${token}`);

    // Get the user ID associated with the token from Redis
    const userId = await redisClient.get(key);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    // Find the user in the mongo database using the user ID
    const user = await dbClient.users.findOne({ _id: new mongodb.ObjectId(userId) });
    return res.status(200).json({ id: user._id, email: user.email });
  }
}

module.exports = UsersController;

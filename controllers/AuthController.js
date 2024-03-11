// Import required modules
import sha1 from 'sha1';
import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db.js';
import redisClient from '../utils/redis.js';

// Constants for Redis authentication
const REDIS_AUTH_PREFIX = 'auth_';
const REDIS_AUTH_EXPIRATION = 24 * 60 * 60; // 24 hours

const AuthController = {
  // GET /connect endpoint
  getConnect: async (req, res) => {
    // Check if Authorization header is present and starts with 'Basic '
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Extract email and password from Authorization header
    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf8').split(':');
    const [email, password] = credentials;

    // Find user in database using email and hashed password
    const user = await dbClient.users.findOne({ email, password: sha1(password) });
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Generate a new token and store it in Redis with user ID and expiration time
    const token = uuidv4();
    const key = `${REDIS_AUTH_PREFIX}${token}`;
    await redisClient.set(key, user._id.toString(), REDIS_AUTH_EXPIRATION);

    // Return the token
    return res.status(200).json({ token });
  },

  // GET /disconnect endpoint
  getDisconnect: async (req, res) => {
    // Get the token from the X-Token header
    const token = req.headers['x-token'];
    const key = `${REDIS_AUTH_PREFIX}${token}`;

    // Get the user ID associated with the token from Redis
    const userId = await redisClient.get(key);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Delete the token from Redis
    await redisClient.del(key);

    // Return a 204 status code (No Content)
    return res.status(204).send();
  },
};

export default AuthController;

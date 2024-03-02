// Import the createClient method from the redis package
import { createClient } from 'redis';

/**
 * RedisClient class
 * This class encapsulates methods to interact with Redis.
 */
class RedisClient {
  /**
   * Constructor connects to Redis upon instantiation of the class.
   */
  constructor() {
    // Initialize the Redis client and connect to the server
    this.client = createClient();
    // Handle error events emitted by the client
    this.client.on('error', (err) => console.error('Redis Client Error', err));
    // Connect to the Redis server
    this.client.connect();
  }

  /**
   * Checks if the Redis client is connected and ready to use.
   * @return {boolean} - Returns true if the client is connected, false otherwise.
   */
  isAlive() {
    return this.client.isOpen;
  }

  /**
   * Retrieves the value for a given key from Redis.
   * @param {string} key - The key to retrieve the value for.
   * @return {Promise<string|null>}
   */
  async get(key) {
    const value = await this.client.get(key);
    return value;
  }

  /**
   * Sets a value for a key in Redis with an expiration time.
   * @param {string} key - The key to set the value for.
   * @param {string} value - The value to set.
   * @param {number} duration - The expiration time in seconds.
   * @return {Promise<void>} - A promise that resolves when the key is set.
   */
  async set(key, value, duration) {
    await this.client.setEx(key, duration, value);
  }

  /**
   * Deletes a key-value pair from Redis by key.
   * @param {string} key - The key to delete the value for.
   * @return {Promise<void>} - A promise that resolves when the key is deleted.
   */
  async del(key) {
    await this.client.del(key);
  }
}

// Export an instance of RedisClient to be used throughout the application
const redisClient = new RedisClient();
export default redisClient;

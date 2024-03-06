#!/usr/bin/node
const { MongoClient } = require('mongodb');

const host = process.env.DB_HOST || 'localhost';
const port = process.env.DB_PORT || 27017;
const dbName = process.env.DB_DATABASE || 'files_manager';

class DBClient {
  constructor() {
    this.client = new MongoClient(`mongodb://${host}:${port}`, { useUnifiedTopology: true });
    this.db = null;
    this.users = null;
    this.files = null;

    this.connect();
  }

  async connect() {
    try {
      await this.client.connect();
      // console.log('Connected to MongoDB');
      this.db = this.client.db(dbName);
      this.users = this.db.collection('users');
      this.files = this.db.collection('files');
    } catch (error) {
      console.error('Error connecting to MongoDB:', error);
    }
  }

  isAlive() {
    if (!this.db) {
        return !!this.db;
      }
      return !!this.db;
    }

  async nbUsers() {
    try {
      const numDocs = await this.users.countDocuments();
      return numDocs;
    } catch (error) {
      console.error('Error counting documents in "users" collection:', error);
      return 0;
    }
  }

  async nbFiles() {
    try {
      const numDocs = await this.files.countDocuments();
      return numDocs;
    } catch (error) {
      console.error('Error counting documents in "files" collection:', error);
      return 0;
    }
  }
}

const dbClient = new DBClient();
module.exports = dbClient;

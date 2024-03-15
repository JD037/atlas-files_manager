// filesController.test.js
const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../server');
const mongodb = require('mongodb');
const redis = require('redis');
const { promisify } = require('util');

chai.use(chaiHttp);
const { expect } = chai;


describe('FilesController', () => {
	let testClientDb;
	let testRedisClient;
	let redisDelAsync;
	let redisSetAsync;
  
	before(async () => {
	  // Connect to MongoDB and Redis before running the tests
	  const dbInfo = {
		host: process.env.DB_HOST || 'localhost',
		port: process.env.DB_PORT || '27017',
		database: process.env.DB_DATABASE || 'files_manager',
	  };
	  const client = await mongodb.MongoClient.connect(`mongodb://${dbInfo.host}:${dbInfo.port}/${dbInfo.database}`);
	  testClientDb = client.db(dbInfo.database);
  
	  testRedisClient = redis.createClient();
	  redisDelAsync = promisify(testRedisClient.del).bind(testRedisClient);
	  redisSetAsync = promisify(testRedisClient.set).bind(testRedisClient);
	});
  
	beforeEach(async () => {
	  // Clear the files and users collections before each test
	  await testClientDb.collection('files').deleteMany({});
	  await testClientDb.collection('users').deleteMany({});
	  await redisDelAsync('auth_*');
	});
  
	after(async () => {
	  // Disconnect from MongoDB and Redis after running the tests
	  await testClientDb.close();
	  testRedisClient.quit();
	});
  
	describe('GET /files', () => {
	  it('should return the first page of files with no parentId and no page specified', async () => {
		// Create a user and files for testing
		const userId = await createUser();
		const token = await createToken(userId);
		await createFiles(userId, 25);
  
		const res = await chai
		  .request(app)
		  .get('/files')
		  .set('X-Token', token);
  
		expect(res).to.have.status(200);
		expect(res.body.length).to.equal(20);
		// Add more assertions as needed
	  });
  
	  it('should return files with a valid parentId and no page specified', async () => {
		// Create a user, files, and folders for testing
		const userId = await createUser();
		const token = await createToken(userId);
		const folderId = await createFolder(userId);
		await createFiles(userId, 2, folderId);
  
		const res = await chai
		  .request(app)
		  .get('/files')
		  .query({ parentId: folderId })
		  .set('X-Token', token);
  
		expect(res).to.have.status(200);
		expect(res.body.length).to.equal(2);
		// Add more assertions as needed
	  });
  
	  it('should return the second page of files with no parentId', async () => {
		// Create a user and files for testing
		const userId = await createUser();
		const token = await createToken(userId);
		await createFiles(userId, 25);
  
		const res = await chai
		  .request(app)
		  .get('/files')
		  .query({ page: 1 })
		  .set('X-Token', token);
  
		expect(res).to.have.status(200);
		expect(res.body.length).to.equal(5);
		// Add more assertions as needed
	  });
	});
  
	// Helper functions for creating test data
	async function createUser() {
	  const user = {
		email: 'test@example.com',
		password: 'password',
	  };
	  const result = await testClientDb.collection('users').insertOne(user);
	  return result.insertedId.toString();
	}
  
	async function createToken(userId) {
	  const token = 'test-token';
	  await redisSetAsync(`auth_${token}`, userId);
	  return token;
	}
  
	async function createFolder(userId, parentId = '0') {
	  const folder = {
		userId: mongodb.ObjectId(userId),
		name: 'Test Folder',
		type: 'folder',
		parentId,
	  };
	  const result = await testClientDb.collection('files').insertOne(folder);
	  return result.insertedId.toString();
	}
  
	async function createFiles(userId, count, parentId = 0) {
	  const files = [];
	  for (let i = 0; i < count; i++) {
		files.push({
		  userId: mongodb.ObjectId(userId),
		  name: `File ${i}`,
		  type: 'file',
		  parentId,
		});
	  }
	  await testClientDb.collection('files').insertMany(files);
	}
  });
const mongodb = require('mongodb');
const { v4: uuid } = require('uuid');
const fs = require('fs');
const dbClient = require('../utils/db'); // import mongo user
const redisClient = require('../utils/redis');

class FilesController {
  static async postUpload(request, response) {
    // Get the token from the X-Token header
    const token = request.header('x-token');
    const key = `auth_${token}`;
    // Get the user ID associated with the token from Redis
    const currentId = await redisClient.get(key);
    if (!currentId) {
      return response.status(401).json({ error: 'Unauthorized' });
    }
    // Extract file metadata from request body
    const {
      name, type, parentId = 0, isPublic = false, data,
    } = request.body;
    // if the name is missing returns an error Missing name with a status code 400
    if (!name) {
      return response.status(400).json({ error: 'Missing name' });
    }
    // If the type is missing or not part of the list
    // of accepted type, return an error Missing type with a status code 400
    if (!['folder', 'file', 'image'].includes(type)) {
      return response.status(400).json({ error: 'Missing type' });
    }
    // if the data is missing and type != folder, return an error Missing data
    if (!data && type !== 'folder') {
      return response.status(400).json({ error: 'Missing data' });
    }
    // Its goes to find data in the MongoDB
    if (parentId !== 0) {
    // retrieve the parentId object from mongoDB as ObjectId
      const parentObjectId = new mongodb.ObjectId(parentId);
      const file = await dbClient.files.findOne({ _id: parentObjectId });

      if (!file) {
        return response.status(400).json({ error: 'Parent not found' });
      }
      if (file.type !== 'folder') {
        return response.status(400).json({ error: 'Parent is not a folder' });
      }
    }

    // The user ID should be added to the document saved in DB - as owner of a file
    let newFile;
    if (type === 'folder') {
      newFile = await dbClient.files.insertOne({
        userId: new mongodb.ObjectId(currentId),
        name,
        type,
        isPublic,
        parentId,
      });
    } else {
      const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';
      if (!fs.existsSync(FOLDER_PATH)) {
        fs.mkdirSync(FOLDER_PATH);
      }
      const localPath = `${FOLDER_PATH}/${uuid()}`;
      const decodedContent = Buffer.from(request.body.data, 'base64').toString('utf-8');
      await fs.promises.writeFile(localPath, decodedContent);
      newFile = await dbClient.files.insertOne({
        userId: await mongodb.ObjectId(currentId),
        name,
        type,
        isPublic,
        parentId,
        localPath,
      });
    }
    return response.status(201).send({
      id: newFile.insertedId, userId: currentId, name, type, isPublic, parentId,
    });
  }
}
module.exports = FilesController;

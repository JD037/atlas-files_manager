/* Task5. First file: FilesController.postUpload
*  Task6. Get and list file - FilesController.(getShow, getIndex)
*  Task7. File publish/unpublish - FilesController.(putPublish,putUnpublish)
*/
const mongodb = require('mongodb');
const { v4: uuid } = require('uuid');
const fs = require('fs');
const Bull = require('bull');
const imageThumbnail = require('image-thumbnail');
const mime = require('mime-types');
const dbClient = require('../utils/db'); // import mongo user
const redisClient = require('../utils/redis');

// Create a Bull queue
const fileQueue = new Bull('fileQueue');

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

      // Add a job to the fileQueue for image processing
      if (type === 'image') {
        const fileId = newFile.insertedId.toString();
        const userId = currentId;

        await fileQueue.add({ userId, fileId });
      }
    }
    return response.status(201).send({
      id: newFile.insertedId, userId: currentId, name, type, isPublic, parentId,
    });
  }

  // **********************************
  // task6. Get and list file
  static async getShow(request, response) {
    const { id } = request.params;
    const token = request.header('x-token');
    const key = `auth_${token}`;
    const currUserId = await redisClient.get(key);

    if (!currUserId) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const file = await dbClient.files.findOne({
      _id: new mongodb.ObjectId(id),
      // userId: new mongodb.ObjectId(userId),
    });

    if (!file || currUserId.toString() !== file.userId.toString()) {
      return response.status(404).json({ error: 'Not found' });
    }
    return response.json({ ...file });
  }

  static async getIndex(request, response) {
    const token = request.header('x-token');
    const key = `auth_${token}`;
    const currUserId = await redisClient.get(key);

    if (!currUserId) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const { parentId, page = 0 } = request.query;
    let fileList;
    if (parentId) {
      fileList = await dbClient.files.aggregate([
        { $match: { parentId: new mongodb.ObjectId(parentId) } },
        { $skip: page * 20 },
        { $limit: 20 },
      ]).toArray();
    } else {
      fileList = await dbClient.files.aggregate([
        { $match: { userId: new mongodb.ObjectId(new mongodb.ObjectId(currUserId)) } },
        { $skip: page * 20 },
        { $limit: 20 },
      ]).toArray();
    }
    return response.json(fileList.map((file) => ({
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId,
    })));
  }

  // task7. File publish
  static async putPublish(request, response) {
    const token = request.header('x-token');
    const key = `auth_${token}`;
    const currUserId = await redisClient.get(key);

    if (!currUserId) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const file = await dbClient.files.findOne({
      _id: mongodb.ObjectId(request.params.id),
    });
    if (!file || currUserId.toString() !== file.userId.toString()) {
      return response.status(404).json({ error: 'Not found' });
    }
    file.isPublic = true;
    await dbClient.files.updateOne({ _id: file._id }, { $set: { isPublic: true } });
    return response.json({
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId,
    });
  }

  // Unpublish method
  static async putUnpublish(request, response) {
    const fileId = request.params.id;
    const token = request.header('x-Token');

    try {
      const currUserId = await redisClient.get(`auth_${token}`);

      if (!currUserId) {
        return response.status(401).json({ error: 'Unauthorized' });
      }
      const file = await dbClient.files.findOneAndUpdate(
        { _id: new mongodb.ObjectId(fileId), userId: new mongodb.ObjectId(currUserId) },
        { $set: { isPublic: false } },
        { returnOriginal: false },
      );

      if (!file.value) {
        return response.status(404).json({ error: 'Not found' });
      }
      return response.status(200).json(file.value);
    } catch (error) {
      console.error(error);
      return response.status(500).json({ error: 'Server error' });
    }
  }

  // Task 8: File data
  static async getFile(request, response) {
    const { id } = request.params;
    const token = request.header('x-token');
    const key = `auth_${token}`;
    const currUserId = await redisClient.get(key);

    const file = await dbClient.files.findOne({ _id: new mongodb.ObjectId(id) });

    // no file document is linked to the ID
    if (!file) {
      console.log('File not found');
      return response.status(404).json({ error: 'Not found' });
    }
    // Check if the file is a folder
    if (file.type === 'folder') {
      return response.status(400).json({ error: "A folder doesn't have content" });
    }

    /* if (!file.isPublic && (!currUserId || file.userId.toString() !== currUserId)) {
      return response.status(404).json({ error: 'Not found' });
    } */

    if (!file.isPublic && (!currUserId || currUserId.toString() !== file.userId.toString())) {
      return response.status(404).json({ error: 'Not found' });
    }

    const filePath = file.localPath;
    if (!fs.existsSync(filePath)) {
      return response.status(404).json({ error: 'Not found' });
    }

    const { size } = request.query;

    if (size && (size === '500' || size === '250' || size === '100')) {
      const thumbnailPath = `${filePath}_${size}`;

      if (!fs.existsSync(thumbnailPath)) {
        return response.status(404).json({ error: 'Not found' });
      }

      const thumbnailContent = await fs.promises.readFile(thumbnailPath);
      const mimeType = mime.lookup(file.name);

      response.setHeader('Content-Type', mimeType);
      response.send(thumbnailContent);
      return null;
    }

    const fileContent = await fs.promises.readFile(filePath);
    const mimeType = mime.lookup(file.name);

    response.setHeader('Content-Type', mimeType);
    response.send(fileContent);
    return null;
  }
}

fileQueue.process(async (job, done) => {
  const { fileId, userId } = job.data;

  if (!fileId) {
    throw new Error('Missing fileId');
  }

  if (!userId) {
    throw new Error('Missing userId');
  }

  const file = await dbClient.files.findOne({
    _id: new mongodb.ObjectId(fileId),
    userId: new mongodb.ObjectId(userId),
  });

  if (!file) {
    throw new Error('File not found');
  }

  const filePath = file.localPath;

  const sizes = [500, 250, 100];
  const thumbnailPromises = sizes.map((size) => {
    const thumbnailPath = `${filePath}_${size}`;
    return imageThumbnail(filePath, { width: size })
      .then((thumbnail) => fs.promises.writeFile(thumbnailPath, thumbnail));
  });

  await Promise.all(thumbnailPromises);

  done();
});

module.exports = FilesController;

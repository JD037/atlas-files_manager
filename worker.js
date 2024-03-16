const Bull = require('bull');
const imageThumbnail = require('image-thumbnail');
const mongodb = require('mongodb');
const fs = require('fs');
const dbClient = require('./utils/db');

const fileQueue = new Bull('fileQueue');

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
  const thumbnailPromises = sizes.map(size => {
    const thumbnailPath = `${filePath}_${size}`;
    return imageThumbnail(filePath, { width: size }).then(thumbnail => {
      return fs.promises.writeFile(thumbnailPath, thumbnail);
    });
  });

  await Promise.all(thumbnailPromises);

  done();
});

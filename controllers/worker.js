const Bull = require('bull');
const fs = require('fs');
const imageThumbnail = require('image-thumbnail');
const dbClient = require('../utils/db'); // import mongo user

// Create Bull queue
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
    _id: new dbClient.ObjectId(fileId),
    userId: new dbClient.ObjectId(userId),
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

module.exports = fileQueue;

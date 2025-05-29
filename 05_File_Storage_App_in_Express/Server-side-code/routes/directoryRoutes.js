import express from "express";
import { rm } from "fs/promises";
import { ObjectId } from "mongodb";
import validateIdMiddleware from "../middleware/validateIdMiddleware.js";

const router = express.Router();

router.param("parentDirId", validateIdMiddleware);
router.param("id", validateIdMiddleware);


// Read
router.get("/:id?", async (req, res) => {
  const user = req.user;
  const _id = req.params.id ? new ObjectId(req.params.id) : user.rootDirId;
  const db = req.db

  // Find the directory and verify ownership
  const directoryData = await db.collection("directories").findOne({ _id });

  if (!directoryData) {
    return res.status(404).json({ error: "Directory not found or you do not have access to it!" });
  }

  const files = await db.collection("files").find({ parentDirId: directoryData._id }).toArray()
  const directories = await db.collection("directories").find({ parentDirId: _id }).toArray();

  return res.status(200).json({ ...directoryData, files: files.map((file) => ({ ...file, id: file._id })), directories: directories.map((dir) => ({ ...dir, id: dir._id })) });
});

// Create Dir
router.post("/:parentDirId?", async (req, res, next) => {
  const user = req.user
  const db = req.db
  const parentDirId = req.params.parentDirId ? new ObjectId(req.params.parentDirId) : user.rootDirId;
  const dirname = req.headers.dirname || 'New Folder'
  try {
    const parentDir = await db.collection("directories").findOne({ _id: parentDirId });

    if (!parentDir) return res.status(404).json({ message: "Parent Directory Does not exist!" })

    const newDirCreate = await db.collection("directories").insertOne({
      name: dirname,
      parentDirId,
      userId: user._id,
    })

    return res.status(200).json({ message: "Directory Created!" })
  } catch (err) {
    next(err)
  }
});

// Rename Dir
router.patch('/:id', async (req, res, next) => {
  const user = req.user;
  const { id } = req.params;
  const { newDirName } = req.body;
  const db = req.db;

  try {
    await db.collection("directories").updateOne({ _id: new ObjectId(String(id)), userId: user._id }, { $set: { name: newDirName } })
    res.status(200).json({ message: "Directory Renamed!" });
  } catch (err) {
    next(err);
  }
});



router.delete("/:id", async (req, res, next) => {
  const { id } = req.params;
  const db = req.db;
  const parentDirObjId = new ObjectId(id);

  // Check ownership of the root directory
  const directoryDataFound = await db.collection("directories").findOne({ _id: parentDirObjId, userId: user._id }, { projection: { _id: 1 } });
  if (!directoryDataFound) {
    return res.status(403).json({ error: "You do not have permission to delete this directory." });
  }

  // Recursively collect all files and directories under the given directory
  async function getDirectoryContents(dirId) {
    let files = await db.collection("files").find({ parentDirId: dirId }, { projection: { _id: 1, extension: 1 } }).toArray();
    let directories = await db.collection("directories").find({ parentDirId: dirId }, { projection: { _id: 1 } }).toArray();

    let allDirIds = [dirId]; // Include the current directory
    for (const { _id } of directories) {
      const { files: childFiles, dirIds: childDirIds } = await getDirectoryContents(_id);
      files = [...files, ...childFiles];
      allDirIds = [...allDirIds, ...childDirIds];
    }
    return { files, dirIds: allDirIds };
  }

  try {
    const { files, dirIds } = await getDirectoryContents(parentDirObjId);

    // Delete files from storage
    for (const { _id, extension } of files) {
      await rm(`./storage/${_id.toString()}${extension}`);
    }

    // Delete files and directories from DB
    await db.collection("files").deleteMany({ _id: { $in: files.map(({ _id }) => _id) } });
    await db.collection("directories").deleteMany({ _id: { $in: dirIds } });

    return res.json({ message: "Files and directory deleted" });
  } catch (err) {
    next(err);
  }
});

export default router;

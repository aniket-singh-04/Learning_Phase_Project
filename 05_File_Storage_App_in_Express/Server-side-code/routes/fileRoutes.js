import express from "express";
import { createWriteStream } from "fs";
import { rm } from "fs/promises";
import path from "path";
import { ObjectId } from "mongodb";
import validateIdMiddleware from "../middleware/validateIdMiddleware.js";


const router = express.Router();


router.param("parentDirId", validateIdMiddleware);
router.param("id", validateIdMiddleware);

// CREATE
router.post("/:parentDirId?", async (req, res, next) => {
  const db = req.db
  const parentDirId = req.params.parentDirId || req.user.rootDirId;
  const parentDirData = await db.collection("directories").findOne({ _id: new ObjectId(String(parentDirId)), userId: req.user._id })

  // Check if parent directory exists
  if (!parentDirData) {
    return res.status(404).json({ error: "Parent directory not found!" });
  }

  const filename = req.headers.filename || "untitled";
  const extension = path.extname(filename);
  const insertedFile = await db.collection("files").insertOne({
    extension,
    name: filename,
    parentDirId: parentDirData._id,
    userId: req.user._id
  })

  const fileId = insertedFile.insertedId.toString()
  const fullFileName = `${fileId}${extension}`;

  const writeStream = createWriteStream(`./storage/${fullFileName}`);
  req.pipe(writeStream);

  req.on("end", async () => {
    return res.status(201).json({ message: "File Uploaded" });
  });

  req.on("error", async (err) => {  // Handle errors during the uploading time 
    await db.collection("files").deleteOne({ _id: new ObjectId(String(fileId)) });
    return res.status(500).json({ error: "File upload failed!" });
  })
});


// READ
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  const db = req.db
  const fileData = await db.collection("files").findOne({ _id: new ObjectId(String(id)), userId: req.user._id }); // here also check the parent directory ownership

  // Check if file exists
  if (!fileData) {
    return res.status(404).json({ error: "File not found!" });
  }


  const filePath = `${process.cwd()}/storage/${id}${fileData.extension}`
  // If "download" is requested, set the appropriate headers
  if (req.query.action === "download") {
    //OR res.set("Content-Disposition", `attachment; filename=${fileData.name}`);
    return res.download(filePath, fileData.name)
  }

  // Send file
  return res.sendFile(`${process.cwd()}/storage/${id}${fileData.extension}`, (err) => {
    if (!res.headersSent && err) {
      return res.status(404).json({ error: "File not found!" });
    }
  });
});


// UPDATE
router.patch("/:id", async (req, res, next) => {
  const { id } = req.params;
  const db = req.db;
  const fileData = await db.collection("files").findOne({ _id: new ObjectId(String(id)), userId: req.user._id }); // here also check the parent directory ownership

  // Check if file exists
  if (!fileData) {
    return res.status(404).json({ error: "File not found!" });
  }


  // Perform rename
  await db.collection("files").updateOne({ _id: new ObjectId(String(id)) }, { $set: { name: req.body.newFilename } })
  try {
    return res.status(200).json({ message: "Renamed" });
  } catch (err) {
    err.status = 500;
    next(err);
  }
});


// DELETE
router.delete("/:id", async (req, res, next) => {
  const { id } = req.params;
  const db = req.db;
  const fileData = await db.collection("files").findOne({ _id: new ObjectId(String(id)), userId: req.user._id }); // here also check the parent directory ownership

  if (!fileData) {
    return res.status(404).json({ error: "File not found!" });
  }


  try {
    // Remove file from filesystem
    await rm(`./storage/${id}${fileData.extension}`, { recursive: true });

    // Remove file from DB
    await db.collection("files").deleteOne({ _id: fileData._id })

    return res.status(200).json({ message: "File Deleted Successfully" });
  } catch (err) {
    next(err);
  }
});

export default router;

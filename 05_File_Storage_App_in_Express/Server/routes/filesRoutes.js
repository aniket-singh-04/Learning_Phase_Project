import express from 'express';
import { createWriteStream, WriteStream } from 'fs';
import { rm, writeFile } from 'fs/promises';
import path from 'path';
import mime from 'mime';
import { fileURLToPath } from 'url';
import filesData from '../filesDB.json' with {type: "json"}
import foldersData from '../folderDB.json' with {type: "json"}


const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper paths
const getFullPath = (subPath = '') => path.join(__dirname, '../', 'Storage', subPath);

// Route: Upload file
router.post("/:parentDirId?", (req, res) => {
  const parentDirId = req.params.parentDirId || foldersData[0].id
  const id = crypto.randomUUID()
  const {filename}  = req.headers
  const fileExtension = path.extname(filename)
  const filePath = getFullPath(`${id}${fileExtension}`);

  const fileStream = createWriteStream(filePath);
  req.pipe(fileStream);
  fileStream.on("finish", async () => {
    filesData.push({ id, fileExtension, name: filename, parentDirId })
    const parentDirData = foldersData.find((folData) => folData.id === parentDirId)
    parentDirData.files.push(id)
    await writeFile('./filesDB.json', JSON.stringify(filesData))
    await writeFile('./folderDB.json', JSON.stringify(foldersData))
    res.json({ message: "File uploaded successfully" });
  });

  fileStream.on("error", (err) => {
    res.status(500).json({ message: "File upload failed", error: err.message });
  });
});

// Route: Serve or download file
router.get("/:id", (req, res) => {
  const fileData = filesData.find((file) => file.id === req.params.id)
  const filePath = getFullPath(`${req.params.id}${fileData.fileExtension}`);

  if (req.query.action === "download") {
    res.set("Content-Disposition", `attachment; fileName = ${fileData.name}`);
  }

  try {
    const mimeType = mime.getType(filePath);
    if (mimeType) {
      res.setHeader("Content-Type", mimeType);
    }
    res.sendFile(filePath);
  } catch (error) {
    res.status(500).json({ message: "Failed video played", error: error.message });
  }
});

// Route: Rename file
router.patch("/:id", async (req, res) => {
  const {newFilename} = req.body
  const fileData = filesData.find((file) => file.id === req.params.id)
  if (!newFilename) {
    return res.status(400).json({ message: "New filename is required" });
  }
  fileData.name = newFilename;
  await writeFile('./filesDB.json', JSON.stringify(filesData))
  res.json({ message: "File renamed successfully" });
});

// Route: Delete file or directory
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const fileIndex = filesData.findIndex((file) => file.id === id)
  const fileData = filesData[fileIndex]
  const filePath = getFullPath(`${id}${fileData.fileExtension}`);

  try {
    await rm(filePath, { recursive: true, force: true });
    filesData.splice(fileIndex, 1) // splice modify original arry so here we used not slice ,splice also used for insert (staIdx, delIdx, insNewItem1, insNewItem2...)
    await writeFile('./filesDB.json', JSON.stringify(filesData))
    const parentDirData = foldersData.find((folData) => folData.id === fileData.parentDirId)
    parentDirData.files = parentDirData.files.filter((fileId) => fileId !== id)
    await writeFile('./folderDB.json', JSON.stringify(foldersData))

    res.json({ message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Deletion failed", error: error.message });
  }
});


export default router;
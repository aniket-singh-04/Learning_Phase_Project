import express from 'express';
import { createWriteStream } from 'fs';
import { rm, writeFile } from 'fs/promises';
import path from 'path';
import mime from 'mime';
import { fileURLToPath } from 'url';
import filesData from '../filesDB.json' with {type: "json"}
import foldersData from '../folderDB.json' with {type: "json"}
if (!Array.isArray(filesData)) filesData = []; // for making always filesDB vaild array
// if (!Array.isArray(foldersData)) foldersData = [];

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper paths
const getFullPath = (subPath = '') => path.join(__dirname, '../', 'Storage', subPath);

// Route: Upload file
router.post('/:parentDirId?', (req, res) => {
  try {
    // Get parent directory ID from params or use root directory's ID
    const parentDirId = req.params.parentDirId || (foldersData[0] && foldersData[0].id);
    if (!parentDirId) return res.status(400).json({ message: 'No parent directory ID provided and no root directory found.' });
    const { filename } = req.headers;
    if (!filename) return res.status(400).json({ message: 'Filename is required in headers.' });
    const id = crypto.randomUUID();
    const fileExtension = path.extname(filename);
    const filePath = getFullPath(`${id}${fileExtension}`);
    // Find the parent directory object
    const parentDirData = foldersData.find((folData) => folData.id === parentDirId);
    if (!parentDirData) return res.status(404).json({ message: 'Parent directory not found.' });
     // Create a write stream to save the file
    const fileStream = createWriteStream(filePath);
    req.pipe(fileStream);
    // On successful file write, update filesData and foldersData
    fileStream.on('finish', async () => {
      try {
        // Add file metadata to filesData
        filesData.push({ id, fileExtension, name: filename, parentDirId });
        // Add file ID to parent directory's files array
        parentDirData.files.push(id);
        await writeFile('./filesDB.json', JSON.stringify(filesData));
        await writeFile('./folderDB.json', JSON.stringify(foldersData));
        return res.status(201).json({ message: 'File uploaded successfully' });
      } catch (err) {
        res.status(500).json({ message: 'File upload failed', error: err.message });
      }
    });
    fileStream.on('error', (err) => {
      res.status(500).json({ message: 'File upload failed', error: err.message });
    });
  } catch (err) {
    res.status(500).json({ message: 'File upload failed', error: err.message });
  }
});

// Route: Serve or download file
router.get('/:id', (req, res) => {
  try {
    // Find file metadata by ID
    const fileData = filesData.find((file) => file.id === req.params.id);
    if (!fileData) return res.status(404).json({ message: 'File not found' });
    // Get the file's absolute path
    const filePath = getFullPath(`${req.params.id}${fileData.fileExtension}`);
    if (req.query.action === 'download') {
      res.set('Content-Disposition', `attachment; fileName = ${fileData.name}`);
    }
    const mimeType = mime.getType(filePath);
    if (mimeType) {
      res.setHeader('Content-Type', mimeType);
    }
    res.sendFile(filePath, (err) => {
      if (err) {
        res.status(404).json({ message: 'File not found on disk' });
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to serve file', error: error.message });
  }
});

// Route: Rename file
router.patch('/:id', async (req, res) => {
  try {
    const { newFilename } = req.body;
    if (!newFilename) return res.status(400).json({ message: 'New filename is required' });
    const fileData = filesData.find((file) => file.id === req.params.id);
    if (!fileData) return res.status(404).json({ message: 'File not found' });
    fileData.name = newFilename;
    await writeFile('./filesDB.json', JSON.stringify(filesData));
    return res.status(200).json({ message: 'File renamed successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Rename failed', error: err.message });
  }
});

// Route: Delete file
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const fileIndex = filesData.findIndex((file) => file.id === id);
    if (fileIndex === -1) return res.status(404).json({ message: 'File not found' });
    const fileData = filesData[fileIndex];
    const filePath = getFullPath(`${id}${fileData.fileExtension}`);
    await rm(filePath, { recursive: true, force: true });
    filesData.splice(fileIndex, 1); // Remove file from filesData
    await writeFile('./filesDB.json', JSON.stringify(filesData));
    // Remove file ID from parent directory's files array, if parent exists
    const parentDirData = foldersData.find((folData) => folData.id === fileData.parentDirId);
    if (parentDirData) {
      parentDirData.files = parentDirData.files.filter((fileId) => fileId !== id);
      await writeFile('./folderDB.json', JSON.stringify(foldersData));
    }
    return res.status(200).json({ message: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Deletion failed', error: error.message });
  }
});


export default router;
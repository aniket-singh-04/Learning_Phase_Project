import express from 'express';
import cors from 'cors';
import { createWriteStream } from 'fs';
import { readdir, rm, rename, stat, mkdir } from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';
import mime from 'mime';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 5000;

app.use(express.json());
app.use(cors());

// Helper paths
const getFullPath = (subPath = '') => path.join(__dirname, 'Storage', subPath);

// Route: List directory contents
app.get("/directory/*?", async (req, res) => {
  const dirName = req.params[0] || "";
  const fullPath = getFullPath(dirName);

  try {
    const items = await readdir(fullPath);
    const dataArray = await Promise.all(items.map(async (item) => {
      const itemPath = path.join(fullPath, item);
      const stats = await stat(itemPath);
      return { name: item, isDirectory: stats.isDirectory() };
    }));
    res.json(dataArray);
  } catch (error) {
    res.status(500).json({ message: "Failed to read directory", error: error.message });
  }
});

// Route: Create directory
app.post("/directory/*?", async (req, res) => {
  const dirName = req.params[0] || "";
  const dirPath = getFullPath(dirName);

  try {
    await mkdir(dirPath, { recursive: true });
    res.json({ message: "Directory created successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to create directory", error: error.message });
  }
});

// Route: Upload file
app.post("/files/*", (req, res) => {
  const fileName = req.params[0] || "";
  const filePath = getFullPath(fileName);

  const fileStream = createWriteStream(filePath);
  req.pipe(fileStream);

  fileStream.on("finish", () => {
    res.json({ message: "File uploaded successfully" });
  });

  fileStream.on("error", (err) => {
    res.status(500).json({ message: "File upload failed", error: err.message });
  });
});

// Route: Serve or download file
app.get("/files/*", (req, res) => {
  const fileName = req.params[0] || "";
  const filePath = getFullPath(fileName);

  if (req.query.action === "download") {
    res.set("Content-Disposition", "attachment");
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
app.patch("/files/*", async (req, res) => {
  const oldName = req.params[0] || "";
  const { newFilename } = req.body;

  if (!newFilename) {
    return res.status(400).json({ message: "New filename is required" });
  }

  const oldPath = getFullPath(oldName);
  const newPath = getFullPath(newFilename);

  try {
    await rename(oldPath, newPath);
    res.json({ message: "File renamed successfully" });
  } catch (error) {
    res.status(500).json({ message: "Rename failed", error: error.message });
  }
});

// Route: Delete file or directory
app.delete("/files/*", async (req, res) => {
  const fileName = req.params[0] || "";
  const filePath = getFullPath(fileName);

  try {
    await rm(filePath, { recursive: true, force: true });
    res.json({ message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Deletion failed", error: error.message });
  }
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});

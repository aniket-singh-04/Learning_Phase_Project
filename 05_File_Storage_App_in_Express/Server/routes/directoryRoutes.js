import express from 'express';
import { readdir, stat, mkdir } from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';


const router = express.Router()



const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// Helper paths
const getFullPath = (subPath = '') => path.join(__dirname, '../', 'Storage', subPath);

// Route: List directory contents
router.get("/*?", async (req, res) => {
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
router.post("/*?", async (req, res) => {
  const dirName = req.params[0] || "";
  const dirPath = getFullPath(dirName);

  try {
    await mkdir(dirPath, { recursive: true });
    res.json({ message: "Directory created successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to create directory", error: error.message });
  }
});


export default router;
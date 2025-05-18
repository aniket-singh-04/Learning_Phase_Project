import express from 'express';
import { rm, writeFile } from 'fs/promises';;
import foldersData from '../folderDB.json' with {type: "json"}
import filesData from '../filesDB.json' with {type: "json"}
import path from 'path';
import { fileURLToPath } from 'url';



const router = express.Router()

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const getFullPath = (subPath = '') => path.join(__dirname, '../', 'Storage', subPath);

// Route: List directory contents
router.get("/:id?", async (req, res) => {
  const { id } = req.params;
  try {
    const dirData = id ? foldersData.find((folder) => folder.id === id) : foldersData[0];  // foldersData ke array hai islye [0] kar rahe hai aur ye karna jaruri hai nahi to undefined aaga foldersData se 
    if (!dirData) {
      return res.status(404).json({ message: "Directory not found" });
    }
    const files = dirData.files.map((singleFileId) => filesData.find((file) => file.id === singleFileId));
    const directories = dirData.directories
      .map((singleDir) => foldersData.find((dir) => dir.id === singleDir))
      .filter(Boolean)
      .map(({ id, name }) => ({ id, name }));
    res.json({ ...dirData, files, directories });
  } catch (err) {
    res.status(404).json({ message: err.message });
  }
});



// Route: Create directory

router.post("/:parentDirId?", async (req, res) => {
  const parentDirId = req.params.parentDirId || foldersData[0].id
  const { dirname } = req.headers
  const id = crypto.randomUUID()
  const parentDir = foldersData.find((dir) => dir.id === parentDirId)
  parentDir.directories.push(id)
  foldersData.push({ id, name: dirname, parentDirId, files: [], directories: [] })
  try {
    await writeFile('./folderDB.json', JSON.stringify(foldersData))
    res.json({ message: "directory created" })
  } catch (err) {
    res.status(404).json({ err: err.message })
  }
})




// Rename : Rename directory 

router.patch("/:id", async (req, res) => {
  const { id } = req.params
  const { newDirname } = req.body
  const foldername = foldersData.find((folder) => folder.id === id)
  foldername.name = newDirname
  try {
    await writeFile('./folderDB.json', JSON.stringify(foldersData))
    res.json({ message: "Directory Renamed" })
  } catch (err) {
    res.status(404).json({ message: err.message })
  }
})


// // Deletion of directory
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const folder = foldersData.find((folder) => folder.id === id);
    if (!folder) return res.status(404).json({ message: "Directory not found" });

    // Delete all files in the folder
    for await (const fileId of folder.files) { // for handle syncronous here we use for .. of 
      const fileIndex = filesData.findIndex(file => file.id === fileId);
      if (fileIndex !== -1) {
        const fileObj = filesData[fileIndex];
        await rm(getFullPath(`${fileObj.id}${fileObj.fileExtension}`));
        filesData.splice(fileIndex, 1);
      }
    }
    folder.files = [];

    // delete folder.directories arrya
    for await (const dirId of folder.directories) {
      const dirIndex = foldersData.findIndex(({id}) => id === dirId)
      foldersData.splice(dirIndex, 1)
    }

    // Remove this folder from its parent's directories
    const parentFolder = foldersData.find((folder) => folder.id === folder.parentDirId);
    if (parentFolder) {
      parentFolder.directories = parentFolder.directories.filter(dirId => dirId !== id);
    }

    // Remove the folder itself from foldersData
    const folderIndex = foldersData.findIndex(folder => folder.id === id);
    if (folderIndex !== -1) foldersData.splice(folderIndex, 1);

    await writeFile('./filesDB.json', JSON.stringify(filesData));
    await writeFile('./folderDB.json', JSON.stringify(foldersData));
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


export default router;
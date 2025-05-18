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
  try {
    const id = req.params.id || (foldersData[0] && foldersData[0].id);
    if (!id) return res.status(404).json({ message: "No directory ID provided and no root directory found." });
    const dirData = foldersData.find((folder) => folder.id === id);  // foldersData ke array hai islye [0] kar rahe hai aur ye karna jaruri hai nahi to undefined aaga foldersData se 
    if (!dirData) {
      return res.status(404).json({ message: "Directory not found" });
    }
    const files = Array.isArray(dirData.files)
      ? dirData.files.map((singleFileId) => filesData.find((file) => file.id === singleFileId)).filter(Boolean)
      : [];
    const directories = Array.isArray(dirData.directories)
      ? dirData.directories
          .map((singleDir) => foldersData.find((dir) => dir.id === singleDir))
          .filter(Boolean)          // ya undefined se bachne ke liye ye kar rahe hai yaha undefined tab aaiga jab hmm directory to delet kar de pr uske parent me se remove na ho 
          .map(({ id, name }) => ({ id, name }))
      : [];
    return res.json({ ...dirData, files, directories });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});



// Route: Create directory
router.post("/:parentDirId?", async (req, res) => {
  try {
    const parentDirId = req.params.parentDirId || (foldersData[0] && foldersData[0].id);
    if (!parentDirId) return res.status(400).json({ message: 'No parent directory ID provided and no root directory found.' });
    const { dirname } = req.headers;
    if (!dirname) return res.status(400).json({ message: 'Directory name is required.' });
    const id = crypto.randomUUID();
    const parentDir = foldersData.find((dir) => dir.id === parentDirId);
    if (!parentDir) return res.status(404).json({ message: 'Parent directory not found.' });
    parentDir.directories.push(id);
    foldersData.push({ id, name: dirname, parentDirId, files: [], directories: [] });
    await writeFile('./folderDB.json', JSON.stringify(foldersData));
    return res.status(201).json({ message: 'directory created' });
  } catch (err) {
    return res.status(500).json({ err: err.message });
  }
})




// Rename : Rename directory 
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { newDirname } = req.body;
    if (!id) return res.status(400).json({ message: 'Directory ID is required.' });
    if (!newDirname) return res.status(400).json({ message: 'New directory name is required.' });
    const foldername = foldersData.find((folder) => folder.id === id);
    if (!foldername) return res.status(404).json({ message: 'Directory not found.' });
    foldername.name = newDirname;
    await writeFile('./folderDB.json', JSON.stringify(foldersData));
    return res.status(200).json({ message: 'Directory Renamed' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
})


// Deletion of directory without recursion only single level deletion  
// router.delete("/:id", async (req, res) => {
//   const { id } = req.params;
//   try {
//     const folder = foldersData.find((folder) => folder.id === id);
//     console.log(folder)
//     if (!folder) return res.status(404).json({ message: "Directory not found" });

//     // Delete all files in the folder
//     for await (const fileId of folder.files) { // for handle syncronous here we use for .. of 
//       const fileIndex = filesData.findIndex(file => file.id === fileId);
//       if (fileIndex !== -1) {
//         const fileObj = filesData[fileIndex];
//         await rm(getFullPath(`${fileObj.id}${fileObj.fileExtension}`));
//         filesData.splice(fileIndex, 1);
//       }
//     }
//     folder.files = [];

//     // This delete the delete folder ke ander ki directory ko 
//     for await (const dirId of folder.directories) {
//       // Find the index of each subdirectory in foldersData
//       const dirIndex = foldersData.findIndex(({id}) => id === dirId)
//       // Remove the subdirectory from foldersData if it exists
//       foldersData.splice(dirIndex, 1)
//     }



//     // Remove this folder from its parent's directories
//     // Find the parent folder using parentDirId
//     const parentFolder = foldersData.find((singFolder) => singFolder.id === folder.parentDirId);
//     if (parentFolder) {
//       // Remove this folder's id from the parent's directories array
//       parentFolder.directories = parentFolder.directories.filter(dirId => dirId !== id);
//     }

//     // Remove the folder itself from foldersData
//     // Find the index of the folder to delete
//     const folderIndex = foldersData.findIndex(folder => folder.id === id);
//     if (folderIndex !== -1) foldersData.splice(folderIndex, 1);

//     // Write updated files and folders data to disk
//     await writeFile('./filesDB.json', JSON.stringify(filesData));
//     await writeFile('./folderDB.json', JSON.stringify(foldersData));
//     return res.status(200).json({ message: "Deleted successfully" });
//   } catch (err) {
//     return res.status(500).json({ message: err.message });
//   }
// });


// Deletion of directory wiht recursion with multi level deletion 
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  // 1. Recursive function to delete folder and all its contents
  const deleteFolderRecursively = async (folderId) => {
    const folder = foldersData.find(folder => folder.id === folderId);
    if (!folder) return;

    // 2. Delete all files in this folder
    for (const fileId of folder.files) {
      const fileIndex = filesData.findIndex(file => file.id === fileId);
      if (fileIndex !== -1) {
        const fileObj = filesData[fileIndex];
        await rm(getFullPath(`${fileObj.id}${fileObj.fileExtension}`));
        filesData.splice(fileIndex, 1);  // Remove file from in-memory array
      }
    }
    folder.files = [];

    // 3. Recursively delete all subdirectories
    for (const subFolderId of folder.directories) {
      await deleteFolderRecursively(subFolderId);  // recursion!
    }

    // 4. Remove this folder from its parent's directories list
    const parentFolder = foldersData.find(parent => parent.id === folder.parentDirId);
    if (parentFolder) {
      parentFolder.directories = parentFolder.directories.filter(dirId => dirId !== folderId);
    }

    // 5. Remove this folder from the foldersData
    const folderIndex = foldersData.findIndex(f => f.id === folderId);
    if (folderIndex !== -1) foldersData.splice(folderIndex, 1);
  };

  try {
    // 6. Ensure the folder exists
    const folder = foldersData.find(folder => folder.id === id);
    if (!folder) return res.status(404).json({ message: "Directory not found" });

    // 7. Start the recursive deletion
    await deleteFolderRecursively(id);

    // 8. Save updated data to disk
    await writeFile('./filesDB.json', JSON.stringify(filesData));
    await writeFile('./folderDB.json', JSON.stringify(foldersData));

    // 9. Respond to the client
    return res.status(200).json({ message: "Deleted successfully" });

  } catch (err) {
    // 10. Handle unexpected errors
    return res.status(500).json({ message: err.message });
  }
});


export default router;
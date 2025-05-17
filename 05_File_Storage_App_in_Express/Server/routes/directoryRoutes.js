import express from 'express';
import { writeFile } from 'fs/promises';;
import foldersData from '../folderDB.json' with {type: "json"}
import filesData from '../filesDB.json' with {type: "json"}



const router = express.Router()

// Route: List directory contents
router.get("/:id?", async (req, res) => {
  const { id } = req.params
  const dirData = id ? foldersData.find((folder) => folder.id === id) : foldersData[0] // foldersData ke array hai islye [0] kar rahe hai aur ye karna jaruri hai nahi to undefined aaga foldersData se 

  const files = dirData.files.map((singleFileId) => filesData.find((file) => file.id === singleFileId))
  const directories = dirData.directories.map((singleDir) => foldersData.find((dir) => dir.id === singleDir)).map(({id, name}) => ({id, name}))
  res.json({ ...dirData, files, directories })

})



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
    res.json({message: "directory created"})
  } catch (err) {
    res.status(404).json({ err: err.message })
  }
})



export default router;
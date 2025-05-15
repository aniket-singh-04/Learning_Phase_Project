import express from 'express';
import { createWriteStream } from 'fs';
import { readdir, rm, rename, stat } from 'fs/promises';
import cors from 'cors'; // for handling CORS issue


const app = express();
const port = 5000;

app.use(express.json()); // for parsing application/json so not give undefined 


// Preflite request wo request hota hai jo browser bhejta hai jab bhi koi request non-simple request hoti hai aur uska method OPTION hota hai aur ye actual request se pehle jata hai  it handle by cors library

app.use(cors());

// OR
// Enabling CORS (Cross-Origin Resource Sharing)
// app.use((req, res, next) => {
//   res.set({
//     "Access-Control-Allow-Origin": "*", // allow all origins
//     "Access-Control-Allow-Methods": "*", // allow all methods
//     "Access-Control-Allow-Headers": "content-type", // allow all headers
//   }); // res.set is short method of sedding headers
//   next();
// });



// Serving Dir Content
app.get("/directory/:dirname?", async (req, res) => {  // optional dynamic routing of single level 
  // and means: (/directory) will match (no dirname provided). (/directory/some-folder) will also match (with dirname provided).
  const {dirname} = req.params
  const fullPath = `./Storage/${dirname ? dirname : ""}`
  const filesList = await readdir(fullPath);  //he readdir function in Node.js, which is part of the fs/promises module, is used to read the contents of a directory. It returns an array of strings 
  const dataArray = []
  for(const item of filesList){  // for of loop for loop on value of object
    const stats = await stat(`${fullPath}/${item}`) // stats gives the information about a file or folder, lite its size ,when it was created or last changed , and whether it is a file or folder 
    dataArray.push({name: item, isDirectory: stats.isDirectory()})
  }
  res.json(dataArray); // it converts into a JSON response
});


// Uploading file
app.post("/files/:fileName", (req, res) => {
  const fileStream = createWriteStream(`./Storage/${req.params.fileName}`); // create a write stream to the file path
  req.pipe(fileStream);  // working > The req object in Express is a readable stream that contains the file data sent by the client.The pipe method automatically reads data chunks from the req stream and writes them to the fileStream.
  fileStream.on("finish", () => {
  // ✅ How It Works:
  // This listens to the writable stream (fileStream), which is responsible for saving the uploaded file to disk.
  // The "finish" event is triggered only after all the data has been fully written to disk.
  // ✅ Use Case:
  // Best for file uploads, because it ensures the file is fully saved before telling the client "upload successful".
  // ✅ Why Use This:
  // Guarantees file integrity.
  // Prevents clients from reading an incomplete file.
  // Ensures no race conditions (like trying to access the file before it's written).


    res.json({ message: "File uploaded successfully" });
  });
  fileStream.on("error", (err) => {
    res.status(500).json({ message: "File upload failed", error: err.message });
  });
});




// // Serving Static Files
// app.use((req, res, next) => {
//   if (req.query.action === "download") {  // yaha per jo query hamare link se aa raha hai aur uska action download hai to
//     res.set("Content-Disposition", "attachment"); // inline used for opening in browser and attachment used for downloading and fileName
//   }
//   express.static("storage")(req, res, next); // it serves all files in the storage directory
// });
// OR

// dynamic serving using dynamic routing
app.get('/files/:fileName', (req, res) => {
  const { fileName } = req.params;
  if (req.query.action === "download") {
    res.set("Content-Disposition", `attachment; filename=${fileName}`);
  }
  res.sendFile(`${import.meta.dirname}/Storage/${fileName}`)
})


// Edit functionality
app.patch("/files/:fileName", async (req, res) => {
  const { fileName } = req.params;
  const { newFilename } = req.body; // yaha par body se newfilename aa raha hai jo ki humne client se bheja hoga by default ye undefined hoga kayo ki body pe json data nahi hota hai
  try {
    await rename(`./Storage/${fileName}`, `./Storage/${newFilename}`);
    res.json({ message: "File renamed successfully" });
  } catch (err) {
    res.json({ message: "File not found" });
  }
})


// Delete functionality
app.delete("/files/:fileName", async (req, res) => {
  const { fileName } = req.params;
  try {
    const filePath = `./Storage/${fileName}`;
    await rm(filePath);
    res.json({ message: "File deleted successfully" });
  } catch (err) {
    res.status(404).json({ message: "File not found" });
  }
});



app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
})
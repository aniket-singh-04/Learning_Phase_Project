import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import "./App.css";

function DirectoryView() {
  const URL = "http://localhost:5000";
  const [directoryItems, setDirectoryItems] = useState([]);
  const [progress, setProgress] = useState(0);
  const [newFilename, setNewFilename] = useState("");
  const [newDirname, setNewDirname] = useState("");
  const [uploading, setUploading] = useState(false);
  const [directories, setDirectories] = useState([]);

  const { dirId } = useParams(); // get the path after /directory/

  // fetch and set directory contents
  async function getDirectoryItems() {
    try {
      const response = await fetch(`${URL}/directory/${dirId || ""}`);
      if (!response.ok) throw new Error("Failed to fetch directory");
      const data = await response.json();
      setDirectoryItems(data.files);
      console.log(data.files)
      setDirectories(data.directories)
    } catch (err) {
      console.error("Error loading directory:", err);
      // alert("Failed to load directory contents.");
    }
  }
  // console.log(data)

  useEffect(() => {
    getDirectoryItems();
  }, [dirId]);

  // Upload file using XHR with progress tracking
  async function uploadFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    setProgress(0);
    setUploading(true);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${URL}/files/${dirId || ""}`, true);
    xhr.setRequestHeader("filename" , file.name)

    xhr.addEventListener("load", () => {
      console.log(xhr.response);
      setUploading(false);
      getDirectoryItems();
    });

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        const totalProgress = (e.loaded / e.total) * 100;
        setProgress(totalProgress.toFixed(2));
      }
    });

    xhr.send(file);
  }

  // delete a file 
  async function handleDelete(fileId) {
    try {
      const response = await fetch(
        `${URL}/files/${fileId}`,
        // yaha request send kar rahe hai taki data delete kar sake aur backend ke delete url pr jai
        { method: "DELETE" }
      );
      if (!response.ok) throw new Error("Failed to delete");
      await response.text();
      getDirectoryItems();
    } catch (err) {
      console.error("Error deleting file:", err);
      alert("Failed to delete file.");
    }
  }

  // prepare for rename
  function renameFile(oldFilename) {
    setNewFilename(oldFilename);
  }

  // apply new filename
  async function saveFilename(fileId) {
    try {
      const response = await fetch(`${URL}/files/${fileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" }, // ye karege tabhi express js isko pars kar payega nahi to plain text samjhega-
        body: JSON.stringify({ newFilename: `${newFilename}` }),
      });
      if (!response.ok) throw new Error("Rename failed");
      await response.text();
      setNewFilename("");
      getDirectoryItems();
    } catch (err) {
      console.error("Error renaming file:", err);
      alert("Failed to rename file.");
    }
  }


  // Dir name Rename 
    async function saveDirname(fileId) {
    console.log(fileId)
    try{
      const response = await fetch(`${URL}/directory/${fileId}`, {
        method: "PATCH",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({newDirname: `${newFilename}`})
      });
      if(!response.ok) throw new Error("Rename Failed")
      await response.text();
    setNewFilename("");
    getDirectoryItems();
    }catch(err){
      console.error("Error in dir renaming", err)
    }
  }


  // Dir deletion 

  async function dirDeletHandle(fileId){
    try{
      const response = await fetch(`${URL}/directory/${fileId}`,{
        method: "DELETE"
      })
      if (!response.ok) throw new Error("Failed to delete");
      await response.json();
      // setDirectories()
      getDirectoryItems();
    }catch(err){
      console.error("Error deleting Directory:", err);
      alert("Failed to delete Directory.");
    }
  }



  // create new directory
  async function directoryCreationHandler(e) {
    e.preventDefault();
    try {
      const response = await fetch(`${URL}/directory/${dirId || ""}`, {
        method: "POST",
        headers: { dirname: newDirname },
      });
      if (!response.ok) throw new Error("Create folder failed");
      await response.json();
      setNewDirname("");
      getDirectoryItems();
    } catch (err) {
      console.error("Error creating folder:", err);
      alert("Failed to create folder.");
    }
  }

  return (
    <>
      <h1>My Files</h1>

      {/* File Upload */}
      <input type="file" onChange={uploadFile} disabled={uploading} />
      {uploading && (
        <>
          <p>Uploading... {progress}%</p>
        </>
      )}

      {/* Rename Input */}
      <input
        type="text"
        onChange={(e) => setNewFilename(e.target.value)}
        value={newFilename}
      />

      {/* Create Folder */}
      <form onSubmit={directoryCreationHandler}>
        <input
          type="text"
          placeholder="Enter the folder name"
          onChange={(e) => {
            setNewDirname(e.target.value);
          }}
          value={newDirname}
        />
        <button disabled={newDirname.trim() === ""}>Create Folder</button>
      </form>

      {/* dir Items */}
      {directories.map(({id , name}) => (
        <div key={id}>
          {name}{" "}
          {
            <Link to={`/directory/${id}`}>
              Open
            </Link>
          }{" "}
          <button onClick={() => renameFile(name)}>Rename</button>
          <button onClick={() => saveDirname(id)}>Save</button>
          <button onClick={() => dirDeletHandle(id)}>Delete</button>
          <br />
        </div>
      ))}
      {directoryItems.map(({ name, id }) => (
        <div key={id}>
          {name}{" "}
          {
            <Link to={`${URL}/files/${id}`} target="_blank">
              Open
            </Link>
          }{" "}
          {<Link to={`${URL}/files/${id}?action=download`}>Download</Link>}
          <button onClick={() => renameFile(name)}>Rename</button>
          <button onClick={() => saveFilename(id)}>Save</button>
          <button onClick={() => handleDelete(id)}>Delete</button>
          <br />
        </div>
      ))}
    </>
  );
}

export default DirectoryView;

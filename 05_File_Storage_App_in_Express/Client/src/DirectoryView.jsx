import { useEffect, useState } from "react";
import "./App.css";
import { Link, useParams } from "react-router-dom";

function DirectoryView() {
  const URL = "http://localhost:5000";
  const [directoryItems, setDirectoryItems] = useState([]);
  const [progress, setProgress] = useState(0);
  const [newFilename, setNewFilename] = useState("");
  const [newDirname, setNewDirname] = useState("");
  const [uploading, setUploading] = useState(false);

  const { "*": dirpath } = useParams(); // get the path after /directory/

  // fetch and set directory contents
  async function getDirectoryItems() {
    try {
      const response = await fetch(`${URL}/directory/${dirpath || ""}`);
      if (!response.ok) throw new Error("Failed to fetch directory");
      const data = await response.json();
      setDirectoryItems(data);
    } catch (err) {
      console.error("Error loading directory:", err);
      alert("Failed to load directory contents.");
    }
  }

  useEffect(() => {
    getDirectoryItems();
  }, [dirpath]);

  // Upload file using XHR with progress tracking
  async function uploadFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    setProgress(0);
    setUploading(true);

    const xhr = new XMLHttpRequest();
    xhr.open(
      "POST",
      `${URL}/files${dirpath ? "/" + dirpath : ""}/${file.name}`,
      true
    );

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

  // delete a file or directory
  async function handleDelete(filename) {
    try {
      const response = await fetch(
        `${URL}/files${dirpath ? "/" + dirpath : ""}/${filename}`,
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
  async function saveFilename(oldFilename) {
    try {
      const response = await fetch(
        `${URL}/files${dirpath ? "/" + dirpath : ""}/${oldFilename}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" }, // ye karege tabhi express js isko pars kar payega nahi to plain text samjhega-
          body: JSON.stringify({ newFilename: `${dirpath}/${newFilename}` }),
        }
      );
      if (!response.ok) throw new Error("Rename failed");
      await response.text();
      setNewFilename("");
      getDirectoryItems();
    } catch (err) {
      console.error("Error renaming file:", err);
      alert("Failed to rename file.");
    }
  }

  // create new directory
  async function directoryCreationHandler(e) {
    e.preventDefault();
    try {
      const response = await fetch(
        `${URL}/directory${dirpath ? "/" + dirpath : ""}/${newDirname}`,
        { method: "POST" }
      );
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

      {/* List Items */}
      {directoryItems.map(({ name: item, isDirectory }, i) => (
        <div key={i}>
          {item}{" "}
          {!isDirectory && (
            <Link
              to={`${URL}/files/${
                dirpath ? dirpath + "/" : ""
              }${item}?action=open`}
              target="_blank"
            >
              Open
            </Link>
          )}
          {isDirectory && <Link to={`./${item}`}>Open</Link>}{" "}
          {/*yaha dirpath/${item} ke pehle set ho raha hai automatic due to Link tag */}
          {/* yaha per (item) url se aa rha hai jo backend se send kiya ja raha hoga  */}
          {!isDirectory && (
            <Link to={`${URL}/files/${dirpath}/${item}?action=download`}>
              Download
            </Link>
          )}
          <button onClick={() => renameFile(item)}>Rename</button>
          <button onClick={() => saveFilename(item)}>Save</button>
          <button onClick={() => handleDelete(item)}>Delete</button>
          <br />
        </div>
      ))}
    </>
  );
}

export default DirectoryView;

import { useEffect, useState } from "react";
import "./App.css";
import { useParams } from "react-router-dom";

function DirectoryView() {
  const URL = "http://localhost:5000";
  const [directoryItems, setDirectoryItems] = useState([]);
  const [progress, setProgress] = useState(0);
  const [newFilename, setNewFilename] = useState("");

  const {"*":dirpath} = useParams()
  // console.log(dirpath)

  async function getDirectoryItems() {
    const response = await fetch(`${URL}/directory/${dirpath ? dirpath : ""}`);
    const data = await response.json();
    // console.log(data)
    setDirectoryItems(data);
  }
  useEffect(() => {
    getDirectoryItems();
  }, []);

async function uploadFile(e) {
  const file = e.target.files[0];
  const xhr = new XMLHttpRequest();
  xhr.open("POST", `${URL}/files/${file.name}`, true);

  xhr.addEventListener("load", () => { // Corrected from "onload" to "load"
    if (xhr.status === 200) {
      getDirectoryItems(); // Refresh directory items
      console.log("File uploaded successfully:", xhr.response);
    } else {
      console.error("Upload failed with status:", xhr.status);
    }
  });

  xhr.addEventListener("error", () => {
    console.error("An error occurred during the upload.");
  });

  xhr.upload.addEventListener("progress", (e) => {
    const totalProgress = (e.loaded / e.total) * 100;
    setProgress(totalProgress.toFixed(2));
  });

  xhr.send(file);
}
  

  async function handleDelete(filename) {
    const response = await fetch(`${URL}/files/${filename}`, {
      // yaha request send kar rahe hai taki data delete kar sake aur backend ke delete url pr jai
      method: "DELETE",
    });
    console.log(response);
    const data = await response.text();
    console.log(data);
    getDirectoryItems();
  }

  async function renameFile(oldFilename) {
    setNewFilename(oldFilename);
  }

  async function saveFilename(oldFilename) {
    setNewFilename(oldFilename);
    const response = await fetch(`${URL}/files/${oldFilename}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "DirectoryViewlication/json", // ye karege tabhi express js isko pars kar payega nahi to plain text samjhega
      },
      body: JSON.stringify({ newFilename }),
    });
    const data = await response.text();
    // console.log(data);
    setNewFilename("");
    getDirectoryItems();
  }

  return (
    <>
      <h1>My Files</h1>
      <input type="file" onChange={uploadFile} />
      <input
        type="text"
        onChange={(e) => setNewFilename(e.target.value)}
        value={newFilename}
      />
      <p>Progress: {progress}%</p>
      {directoryItems.map(({name:item , isDirectory}, i) => (
        <div key={i}>
          {item} {!isDirectory && (<a href={`${URL}/files/${item}?action=open`}>Open</a>)}{isDirectory && (<a href={`./${item}`}>Open</a>)}{" "}
          {/* yaha per (item) url se aa rha hai jo backend se send kiya ja raha hoga  */}
          {!isDirectory && (<a href={`${URL}/files/${item}?action=download`}>Download</a>)}
          <button onClick={() => renameFile(item)}>Rename</button>
          <button onClick={() => saveFilename(item)}>Save</button>
          <button
            onClick={() => {
              handleDelete(item);
            }}
          >
            Delete
          </button>
          <br />
        </div>
      ))}
    </>
  );
}

export default DirectoryView;

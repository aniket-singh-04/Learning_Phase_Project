import { createBrowserRouter, RouterProvider } from "react-router-dom";
import DirectoryView from "./DirectoryView";
import './App.css'


const router = createBrowserRouter([
  {
    path:"/*", // yaha (*) ke wajh se user kisi bhi path pe jaiga to directoryView render hoga 
    element: <DirectoryView />
  },
]);

function App(){
  return <RouterProvider router={router} />
}
export default App
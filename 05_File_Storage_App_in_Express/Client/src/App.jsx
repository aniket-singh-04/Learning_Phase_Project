import { createBrowserRouter, RouterProvider } from "react-router-dom";
import DirectoryView from "./DirectoryView";
import './App.css'


const router = createBrowserRouter([
  {
    path:"/", 
    element: <DirectoryView />
  },
  {
    path:"/directory/:dirId", // uper ("/*") hata ke ye isliye set kar rahe hai ki jab nested directroy open ho to hamara component dike 
    element: <DirectoryView />
  }
]);

function App(){
  return <RouterProvider router={router} />
}
export default App
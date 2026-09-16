import {StrictMode} from "react";
import {createRoot} from "react-dom/client";
import {BrowserRouter} from "react-router-dom";
import App from "./App";
import "./styles.css";
import "./storefront.css";
const authHash=new URLSearchParams(window.location.hash.slice(1));
if(["invite_token","recovery_token","confirmation_token","access_token","email_change_token"].some(key=>authHash.has(key))&&!window.location.pathname.endsWith("/admin")){
  window.history.replaceState(null,"",import.meta.env.BASE_URL+"admin"+window.location.hash);
}
createRoot(document.getElementById("root")!).render(<StrictMode><BrowserRouter basename={import.meta.env.BASE_URL}><App/></BrowserRouter></StrictMode>);

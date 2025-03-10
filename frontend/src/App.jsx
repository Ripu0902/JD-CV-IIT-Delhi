import React from "react";
import Home from "./components/Home";
import { Route, Router, Routes } from "react-router-dom";
import Signup from "./components/signup";
import Login from "./components/Login";
import LoggedInHome from "./components/LoggedInHome";
import APIscreen from "./components/APIscreen";
import RankwiseResumes from "./components/RankwiseResumes";

const App = () => {
  window.onload = () => {
    localStorage.clear(); // Clear all items from localStorage
  };

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/login" element={<Login />} />
      <Route path="/authorized" element={<LoggedInHome />} />
      <Route path="/api-screen" element={<APIscreen />} />
      <Route path="/rankwise-resumes" element={<RankwiseResumes />} />
    </Routes>
  );
};

export default App;

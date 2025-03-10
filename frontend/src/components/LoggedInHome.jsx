import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "remixicon/fonts/remixicon.css";

const LoggedInHome = () => {
  const [jobDescription, setJobDesription] = useState("");
  const [resumeCollection, setResumeCollection] = useState([]);

  const submitHandler = (e) => {
    e.preventDefault();
  };

  useEffect(() => {
    console.log(resumeCollection);
  }, [resumeCollection]);

  return (
    <div className="bg-gray-900 w-screen flex flex-col items-center h-screen">
      <div className="w-full h-24 flex items-center justify-end pr-8 border-b border-yellow-300 mb-8">
        <Link
          to={"/api-screen"}
          className="text-white bg-yellow-600 text-xl font-semibold p-4 rounded-full"
        >
          API Integration
        </Link>
      </div>
      <div className="flex w-[40%] ">
        <form
          onSubmit={(e) => {
            submitHandler(e);
          }}
          className="w-full"
        >
          <div className="flex flex-col">
            <label
              htmlFor="job-description"
              className="font-medium pb-2 text-white"
            >
              Job Description
            </label>
            <input
              className="p-2 rounded-xl focus:outline-none shadow-xl my-1 mb-3"
              type="text"
              id="job-description"
              name="job-description"
              placeholder="Frontend Engineer"
              value={jobDescription}
              onChange={(e) => {
                setJobDesription(e.target.value);
              }}
            />
            <label htmlFor="resumes" className="font-medium pb-2 text-white">
              Resumes:
            </label>
            <input
              className="text-white"
              type="file"
              name="resumes"
              id="resumes"
              accept=".pdf"
              multiple
              onChange={(e) => {
                const uploadedFiles = Array.from(e.target.files);
                setResumeCollection((prevCollection) => [
                  ...prevCollection,
                  ...uploadedFiles,
                ]);
              }}
            />
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoggedInHome;

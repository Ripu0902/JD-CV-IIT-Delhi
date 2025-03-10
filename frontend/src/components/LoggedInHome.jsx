import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "remixicon/fonts/remixicon.css";

const LoggedInHome = () => {
  const [jobDescription, setJobDesription] = useState("");
  const [resumeCollection, setResumeCollection] = useState([]);

  const navigate = useNavigate();

  const submitHandler = (e) => {
    e.preventDefault();

    if (jobDescription.trim !== "" && resumeCollection.length > 0) {
      navigate("/rankwise-resumes");
    } else {
      alert("Either of the fields are empty");
    }
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
              className="font-medium pb-2 text-white cursor-text"
            >
              Job Description
            </label>
            <input
              className="p-2 rounded-xl focus:outline-none shadow-xl my-1 mb-5"
              type="text"
              id="job-description"
              name="job-description"
              placeholder="Frontend Engineer"
              value={jobDescription}
              onChange={(e) => {
                setJobDesription(e.target.value);
              }}
            />
            <label
              htmlFor="resumes"
              className="font-medium pb-2 text-white cursor-pointer"
            >
              Resumes:
            </label>
            <input
              className="text-white mb-5 p-2 cursor-pointer"
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
            <button className="cursor-pointer text-white flex justify-center rounded-full p-4 mb-5 bg-yellow-600">
              Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoggedInHome;

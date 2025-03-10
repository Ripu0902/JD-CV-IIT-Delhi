import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "remixicon/fonts/remixicon.css";

const LoggedInHome = () => {
  const [jobDescription, setJobDesription] = useState("");
  const [resumeCollection, setResumeCollection] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [extractedText, setExtractedText] = useState("");

  const navigate = useNavigate();

  const submitHandler = async (e) => {
    e.preventDefault();

    if (jobDescription.trim() === "" || resumeCollection.length === 0) {
      alert("Please fill out all fields!");
      return;
    }

    console.log("Job Description:", jobDescription);
    console.log("Resume Collection:", resumeCollection);

    const formData = new FormData();
    formData.append("job_description", jobDescription);
    resumeCollection.forEach((file) => formData.append("resumes", file)); // Append multiple resumes

    for (let pair of formData.entries()) {
      console.log(pair[0] + ": " + pair[1]);
    }

    try {
      setUploading(true);

      const response = await fetch("http://127.0.0.1:8000/rank", {
        method: "POST",
        body: formData, // Send FormData
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      setExtractedText(data.extractedText); // Store extracted text

      navigate("/rankwise-resumes"); // Navigate after upload success
    } catch (error) {
      console.error("Upload error:", error);
      alert("Error uploading files!");
    } finally {
      setUploading(false);
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
        <form onSubmit={submitHandler} className="w-full">
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
              placeholder="Frontend Engineer"
              value={jobDescription}
              onChange={(e) => setJobDesription(e.target.value)}
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
              id="resumes"
              accept=".pdf"
              multiple
              onChange={(e) => {
                const uploadedFiles = Array.from(e.target.files);
                setResumeCollection([...uploadedFiles]);
              }}
            />

            <button
              className="cursor-pointer text-white flex justify-center rounded-full p-4 mb-5 bg-yellow-600"
              disabled={uploading}
            >
              {uploading ? "Uploading..." : "Submit"}
            </button>

            {extractedText && (
              <div className="bg-white p-4 rounded-lg shadow-lg text-black">
                <h3 className="font-bold">Extracted Text:</h3>
                <pre>{extractedText}</pre>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoggedInHome;

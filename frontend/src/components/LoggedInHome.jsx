import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "remixicon/fonts/remixicon.css";

const LoggedInHome = () => {
  const [resumeCollection, setResumeCollection] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [extractedText, setExtractedText] = useState("");

  const navigate = useNavigate();

  const submitHandler = async (e) => {
    e.preventDefault();

    if (resumeCollection.length === 0) {
      alert("Please upload at least one resume.");
      return;
    }

    const formData = new FormData();
    resumeCollection.forEach((file) => formData.append("resumes", file)); // Ensure the field name matches backend

    try {
      setUploading(true);

      const response = await fetch("http://localhost:5000/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      console.log("Extracted Data:", data.extractedTexts);
      setExtractedText(
        data.extractedTexts
          .map((item) => `${item.fileName}: ${item.text}`)
          .join("\n\n")
      );

      navigate("/rankwise-resumes");
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

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "remixicon/fonts/remixicon.css";

const LoggedInHome = () => {
  const [apiKey, setApiKey] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);

  window.onload = () => {
    localStorage.clear(); // Clear all items from localStorage
  };

  const navigate = useNavigate();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopySuccess(true);
      setTimeout(() => {
        setCopySuccess(false);
      }, 2000);
    } catch (err) {
      console.error("Failed to copy API key", err);
    }
  };

  const email = localStorage.getItem("userEmail");

  useEffect(() => {
    const otherEmail = localStorage.getItem("userEmail");
    if (!otherEmail) {
      navigate("/login", { replace: true });
    }
  }, []);

  const fetchApiKey = async () => {
    try {
      const res = await fetch("http://localhost:5000/get-api-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const result = await res.json();

      if (res.ok) {
        setApiKey(result.apiKey);
      }
    } catch (err) {
      console.error("Error fetching API key:", err);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen w-screen">
      <div className="w-[50%] h-[50%] rounded-3xl p-10 flex flex-col items-center bg-gray-900 text-white">
        <button
          className="text-white bg-yellow-600 text-xl font-semibold p-4 rounded-full"
          onClick={fetchApiKey}
        >
          Get API Key
        </button>
        {apiKey && (
          <div className="mt-4 text-xl font-semibold">
            <h3 className="mb-10">Your API Key:</h3>
            <div>
              <p className="border p-2 rounded-xl">{apiKey}</p>
              <button onClick={handleCopy}>
                Copy <i className="ri-clipboard-fill"></i>
              </button>
            </div>
            <small>Please save this key securely!</small>
          </div>
        )}
        {copySuccess && (
          <p style={{ color: "green", marginTop: "10px" }}>
            Copied to clipboard!
          </p>
        )}
      </div>
    </div>
  );
};

export default LoggedInHome;

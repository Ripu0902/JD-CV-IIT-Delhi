import React from "react";

const RankwiseResumes = () => {
  const data = [
    {
      filename: "John_Doe_Resume.pdf",
      score: 95,
      rank: 1,
      reasoning: "Strong React.js match + 5YOE at Fortune 500",
      bias_checks: ["School names ignored", "No biased language detected"],
      missing_skills: [],
    },
    {
      filename: "Jane_Smith_Resume.pdf",
      score: 88,
      rank: 2,
      reasoning: "Meets all prerequisites, lacks advanced Next.js experience",
      bias_checks: ["School names ignored", "No biased language detected"],
      missing_skills: ["Next.js"],
    },
    {
      filename: "Michael_Lee_Resume.pdf",
      score: 78,
      rank: 3,
      reasoning: "Good frontend knowledge, but limited backend exposure",
      bias_checks: ["No biased language detected"],
      missing_skills: ["Node.js", "Express"],
    },
    {
      filename: "Emily_Jackson_Resume.pdf",
      score: 70,
      rank: 4,
      reasoning: "Strong CSS & UI/UX, but lacks JavaScript expertise",
      bias_checks: ["No biased language detected"],
      missing_skills: ["JavaScript", "React"],
    },
    {
      filename: "Chris_Williams_Resume.pdf",
      score: 62,
      rank: 5,
      reasoning: "Basic frontend knowledge, missing key React concepts",
      bias_checks: ["No biased language detected"],
      missing_skills: ["React", "Redux", "TypeScript"],
    },
  ];
  return (
    <div className="bg-gray-900 min-h-screen flex flex-col items-center py-10">
      <h1 className="text-3xl text-yellow-400 font-bold mb-6">
        Ranked Resumes
      </h1>
      <div className="w-3/4">
        {data.map((resume) => (
          <div
            key={resume.rank}
            className="bg-gray-800 text-white p-4 mb-4 rounded-lg flex justify-between items-center shadow-lg"
          >
            <div>
              <h2 className="text-xl font-semibold">
                Rank {resume.rank}:{" "}
                {resume.filename.replace("_Resume.pdf", "").replace("_", " ")}
              </h2>
              <p className="text-gray-400">Score: {resume.score}/100</p>
            </div>
            <a
              href={`#`} // Replace with actual download URL
              className="bg-yellow-500 text-black px-4 py-2 rounded-lg font-medium hover:bg-yellow-600 transition"
              download
            >
              Download Resume
            </a>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RankwiseResumes;

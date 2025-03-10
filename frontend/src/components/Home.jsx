import React from "react";
import { Link } from "react-router-dom";

const Home = () => {
  const data = {
    job_details: {
      job_id: "J12345",
      job_title: "Software Engineer",
      company_name: "XYZ Corp",
      job_location: "New York, USA",
      employment_type: "Full-time",
      experience_required: "3-5 years",
      salary_range: "80,000-100,000 USD",
      job_description:
        "We are looking for a skilled software engineer with experience in Java, Spring Boot, and cloud computing.",
      required_skills: ["Java", "Spring Boot", "AWS", "Microservices"],
      preferred_skills: ["Docker", "Kubernetes", "GraphQL"],
      education_required: "B.Tech / B.E in Computer Science",
      industry: "IT & Software Development",
      job_posted_date: "2025-03-06",
      application_deadline: "2025-03-31",
    },
    candidates: [
      {
        candidate_id: "C98765",
        full_name: "John Doe",
        email: "johndoe@example.com",
        phone: "+1-234-567-890",
        linkedin: "https://linkedin.com/in/johndoe",
        location: "San Francisco, USA",
        experience_years: 4,
        education: [
          {
            degree: "B.Tech in Computer Science",
            university: "MIT",
            year_of_passing: 2020,
          },
        ],
        skills: ["Java", "Spring Boot", "AWS", "Microservices", "Docker"],
        work_experience: [
          {
            company: "ABC Tech",
            job_title: "Software Engineer",
            duration: "2021-2025",
            responsibilities: [
              "Developed microservices using Java Spring Boot",
              "Implemented CI/CD pipelines with Jenkins",
            ],
          },
        ],
        certifications: ["AWS Certified Developer"],
        languages: ["English", "Spanish"],
      },
    ],
  };
  return (
    <div className="bg-gray-900 w-screen">
      <div className="w-full h-24 flex items-center justify-end pr-8 border-b border-yellow-300 mb-8">
        <Link
          to={"/signup"}
          className="text-white bg-yellow-600 text-xl font-semibold p-4 rounded-full"
        >
          Login/SignUp
        </Link>
      </div>
      <div className="flex flex-col justify-center items-center gap-8">
        <div className="text-white text-3xl font-semibold p-5 rounded-full px-10 bg-yellow-600">
          <p>Data formats for API Integration</p>
        </div>
        <div className="bg-[#272822] text-white flex items-center justify-center w-[50%] p-10 rounded-3xl py-10">
          How to give data
        </div>
        <div className="bg-[#272822] text-white flex items-center justify-center w-[50%] rounded-3xl p-5">
          <pre className="whitespace-pre-wrap break-words ">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default Home;

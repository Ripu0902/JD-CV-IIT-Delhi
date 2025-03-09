import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";

const Signup = () => {
  const [FirstName, setFirstName] = useState("");
  const [LastName, setLastName] = useState("");
  const [company, setcompany] = useState("");
  const [email, setemail] = useState("");
  const [password, setPassword] = useState("");

  const navigate = useNavigate();

  const submitHandler = async (e) => {
    e.preventDefault();

    const formData = {
      FirstName,
      LastName,
      company,
      email,
      password,
    };

    try {
      const res = await fetch("http://localhost:5000/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await res.json();
      if (res.ok) {
        alert("Signup successful!");
        console.log("Server Response:", result);

        localStorage.setItem("userEmail", formData.email);

        navigate("/authorized");
      } else {
        alert("Signup failed.");
        console.error(result);
      }
    } catch (err) {
      console.log("Error submitting form:", err);
    }

    setFirstName("");
    setLastName("");
    setPassword("");
    setcompany("");
    setemail("");
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-cyan-100 ">
      <div>
        <Link
          to={"/"}
          className="absolute text-white bg-yellow-600 text-xl font-semibold p-4 m-4 rounded-full top-0 right-0"
        >
          Home
        </Link>
      </div>
      <div className="shadow-2xl flex flex-col px-10 rounded-xl bg-stone-200 w-[30%]">
        <h2 className="text-xl font-semibold my-4">SignUp</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitHandler(e);
            e;
          }}
        >
          <div className="flex flex-col">
            <label htmlFor="fname" className="font-medium pb-2">
              First Name
            </label>
            <input
              className="p-2 rounded-xl focus:outline-none shadow-xl my-1 mb-3"
              type="text"
              id="fname"
              name="fname"
              placeholder="First Name"
              value={FirstName}
              onChange={(e) => {
                setFirstName(e.target.value);
              }}
            />
            <label htmlFor="lname" className="font-medium pb-2">
              Last Name
            </label>
            <input
              className="p-2 rounded-xl focus:outline-none shadow-xl my-1 mb-3"
              type="text"
              id="lname"
              name="lname"
              placeholder="Last Name"
              value={LastName}
              onChange={(e) => {
                setLastName(e.target.value);
              }}
            />
            <label htmlFor="email" className="font-medium pb-2">
              Email
            </label>
            <input
              className="p-2 rounded-xl focus:outline-none shadow-xl my-1 mb-3"
              type="text"
              id="email"
              name="email"
              placeholder="example@gmail.com"
              value={email}
              onChange={(e) => {
                setemail(e.target.value);
              }}
            />
            <label htmlFor="password" className="font-medium pb-2">
              Password
            </label>
            <input
              type="password"
              name="password"
              id="password"
              className="p-2 rounded-xl focus:outline-none shadow-xl my-1 mb-3"
              placeholder="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
              }}
            />
            <label htmlFor="company" className="font-medium pb-2">
              Company name
            </label>
            <input
              className="p-2 rounded-xl focus:outline-none shadow-xl my-1 mb-3"
              type="text"
              id="company"
              name="company"
              placeholder="Company "
              value={company}
              onChange={(e) => {
                setcompany(e.target.value);
              }}
            />
            <button className="cursor-pointer bg-gray-900 text-white flex justify-center rounded-full p-4 mb-5">
              Submit
            </button>
            <p className="w-full flex justify-center mb-10">
              Already have an account!
              <span className="text-blue-600 mx-2">
                <Link to={"/login"}>Login</Link>
              </span>
              instead
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Signup;

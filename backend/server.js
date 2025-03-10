const express=require('express')
const bodyParser=require('body-parser')
const cors=require('cors')
const { MongoClient, ServerApiVersion, GridFSBucket } = require("mongodb");
const bcrypt=require('bcrypt')
const crypto=require('crypto')
require('dotenv').config();

const app=express()
const PORT=5000

app.use(bodyParser.json())
app.use(cors())

const uri = process.env.uri
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function hashPassword(password){
    const hash=await bcrypt.hash(password,10);
    return hash;
}

let db;

async function connectToDatabase() {
  try {
    await client.connect();
    console.log("Connected to MongoDB!");
    db = client.db("userDatabase"); 
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err);
  }
}
connectToDatabase();


// API Endpoint to handle form submissions
app.post("/signup", async (req, res) => {
    try {
        const { FirstName, LastName, company, email, password } = req.body;
    
        // Validate fields
        if (!FirstName || !LastName || !email || !password || !company) {
          return res.status(400).send({ message: "All fields are required!" });
        }
    
        const collection = db.collection("users"); // Ensure this collection exists
        const hash=await hashPassword(password)
        console.log(hash)

        //API key
        const apiKey=crypto.randomBytes(32).toString('hex')
    
        // Insert the data into MongoDB
        const result = await collection.insertOne({ FirstName, LastName, company, email, password:hash,apiKey });
        res.status(200).send({ message: "User added successfully!", result });
      } catch (err) {
        console.error("Error inserting user data:", err);
        res.status(500).send({ message: "Error saving user data", error: err.message });
      }
  });

//login
app.post("/login",async (req,res)=>{
    try {
        const {email,password}=req.body;

        if(!email || !password){
            return res.status(500).json({message:"Email or password are required"});
        }
        
        const collection=db.collection('users')

        const user=await collection.findOne({email})

        if(!user){
            return res.status(400).json({message:'User Not Found!'})
        }

        const isMatch=await bcrypt.compare(password,user.password);
        if(!isMatch){
            return res.status(400).send({message:"Invalid email or password!"})
        }

        res.status(200).send({message:"Login Successful", user:{email:user.email, password:user.password}})
    } catch (err) {
        console.log('Error during login',err)
        res.status(404).send({message:"An error occurred during login", error:err.message})
    }
})

//get api key
app.post('/get-api-key', async (req,res)=>{
    try {
        const email = req.body.email;

        if(!email){
            return res.status(404).send({message:"Email is required"})
        }

        const collection=db.collection('users')

        const user=await collection.findOne({email});

        if(!user){
            return res.status(400).send({message:"User Not Found!"})
        }

        res.status(200).send({apiKey:user.apiKey})
    } catch (err) {
        console.error("Error fetching API key:", err);
        res.status(500).send({ message: "An error occurred", error: err.message });
    }
})

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
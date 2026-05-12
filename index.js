require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3000;
const { MongoClient, ServerApiVersion } = require("mongodb");

//middleware

app.use(express.json());
app.use(cors());

const uri = `mongodb+srv://${process.env.DB_USER}:${
  process.env.DB_PASS
}@cluster0.etvdx8p.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

const db = client.db("assignment_11");
const userCollection = db.collection("users");


app.get('/users/:email', async (req, res) => {

    const email = req.params.email;

    const query = { email: email };

    const result = await userCollection.findOne(query);

    res.send(result);

});

app.post("/users",async(req,res)=>{
    const user = req.body;
    user.role = "user";
    user.plan="free"
    user.createAt = new Date();
    const email = user.email;

    const findUser = await userCollection.findOne({ email });
      if(findUser){
        return res.send({message: 'user existed'})
      }

    const result = await userCollection.insertOne(user);
    res.send(result);
})

app.patch("/users",async(req,res)=>{
   const email = req.params.email;
   const filter = {email}

   const updateDoc = {
    $set:{
        plan:'premium'
    }
   }

   const result = await userCollection.updateOne(filter,updateDoc);
   res.send(result);
})



// const featuredCollection = db.collection("featuredLesson");


// app.get('/featuredLesson',async(req,res)=>{
//     const query ={}
//     const cursor = featuredCollection.
// })










    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

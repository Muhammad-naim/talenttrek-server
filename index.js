const express = require('express');
const cors = require('cors');
require('dotenv').config()
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
const port = process.env.PORT || 5000;
const courses = require('./data/courses.json');
const bannerContent = require('./data/bannerContent.json');

//middleWare functions
app.use(cors())
app.use(express.json())



const uri = `mongodb+srv://${process.env.talentTrek_admin}:${process.env.talentTrek_password}@cluster0.ilp6hsx.mongodb.net/?retryWrites=true&w=majority`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
      await client.connect();
      const courseCollection = client.db('talendtrekDB').collection('courses');
      const bannerCollection = client.db('talendtrekDB').collection('bannerData');
      const instructorCollection = client.db('talendtrekDB').collection('instructors');
      const userCollection = client.db('talendtrekDB').collection('users');
      const bookingCollection = client.db('talendtrekDB').collection('bookings');
    





    app.post('/users', async (req, res) => {
      const user = req.body;
      console.log(user);
      const query = {email: user.email}
      const existingUser = await userCollection.findOne(query)
      if (existingUser) {
        res.send('user already exist')
      }
      const result = await userCollection.insertOne(user);
      res.send(result)
    })

    //jwt token generator API  
    app.post('/jwt', async (req, res)=>{
      const body = req.body;
      const token = jwt.sign(body, process.env.SECTER_TOKEN, { expiresIn: '1h' });
      res.send({token})
    })
    
    app.post('/book-class', async (req, res) => {
      const course = req.body;
      const result = await bookingCollection.insertOne(course) 
      res.send(result)
    })




    //All get methods are here
      app.get('/courses', async (req, res) => {
          const cursor = courseCollection.find()
          const courses = await cursor.toArray()
        res.send(courses)
    })
      
    app.get('/banner', async (req, res) => {
          const cursor = bannerCollection.find()
          const bannerContent = await cursor.toArray()
        res.send(bannerContent)
    })
      
    app.get('/instructors', async (req, res) => {
          const cursor = instructorCollection.find()
      const instructors = await cursor.toArray()
        res.send(instructors)
    })



    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', async (req, res) => {
    res.send('server is running')
})


app.listen(port, () => {
    console.log(`app is running on port ${port}`);
})
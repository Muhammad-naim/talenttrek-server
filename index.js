const express = require('express');
const cors = require('cors');
require('dotenv').config()
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
const port = process.env.PORT || 5000;
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY)
const courses = require('./data/courses.json');
const bannerContent = require('./data/bannerContent.json');

//middleWare functions
app.use(cors())
app.use(express.json())


//verify jwt
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: "Unauthorized access k" });
  }
  const token = authorization.split(' ')[1];
  jwt.verify(token, process.env.SECTER_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: 'unauthorized access' })
    }
    req.decoded = decoded;
    next()
  })

}



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
    const paymentCollection = client.db('talendtrekDB').collection('payments');


    //verify admin
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email }
      const user = await userCollection.findOne(query);
      if (user?.role !== 'admin') {
        return res.status(403).send({ error: true, message: 'forbidden access' });
      }
      next();
    }

    //verify instructor
    const verifyInstructor = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email }
      const user = await userCollection.findOne(query);
      if (user?.role !== 'instructor') {
        return res.status(403).send({ error: true, message: 'forbidden access' });
      }
      next();
    }



    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const existingUser = await userCollection.findOne(query)
      if (existingUser) {
        res.send('user already exist')
      }
      const result = await userCollection.insertOne(user);
      res.send(result)
    })

    //jwt token generator API  
    app.post('/jwt', async (req, res) => {
      const body = req.body;
      const token = jwt.sign(body, process.env.SECTER_TOKEN, { expiresIn: '1h' });
      const query = { email: body.email }
      const role = await userCollection.findOne(query)
      res.send({ token, role })
    })

    app.post('/book-class', verifyJWT, async (req, res) => {
      const course = req.body;
      const query = { user: course.user, courseID: course.courseID }
      const booked = await bookingCollection.findOne(query)
      if (booked) {
        return res.send({ isExist: true, message: "already added" })
      }
      const result = await bookingCollection.insertOne(course)
      res.send(result)
    })

    app.post("/create-payment-intent", verifyJWT, async (req, res) => {
      const { price } = req.body
      const amount = price * 100
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ["card"]
      })
      res.send({ clientSecret: paymentIntent.client_secret, })
    })

    app.post('/payment', verifyJWT, async (req, res) => {
      const payment = req.body;
      const query = { _id: new ObjectId(payment.bookingID) }
      const result = await paymentCollection.insertOne(payment);
      if (result.insertedId) {
        const filter = { _id: new ObjectId(payment.courseID) }
        const updatedCourse = await courseCollection.updateOne(filter, { $inc: { students: 1 } })
        const deleteBooking = await bookingCollection.deleteOne(query)
      }
      res.send(result)

    })

    app.post('/add-class', verifyJWT, verifyInstructor, async (req, res) => {
      const classData = req.body;
      const result = await courseCollection.insertOne(classData)
      res.send(result)
    })


    //patch apis
    app.patch('/update-class', async (req, res) => {
      const updatedClass = req.body;
      const id = updatedClass.courseID;
      delete updatedClass.courseID;
      const filter = {_id: new ObjectId(id)}
      const updateDoc = {
        $set: {
          ...updatedClass
        },
      };
      const result = await courseCollection.updateOne(filter, updateDoc)
      console.log(result);
      res.send(result)
    })
    
    //delete apis

    app.delete('/bookings/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await bookingCollection.deleteOne(query)
      res.send(result)
    })


    //All get methods are here
    app.get('/courses', async (req, res) => {
      const query = {status: "approved"}
      const cursor = courseCollection.find(query)
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

    app.get('/my-bookings', verifyJWT, async (req, res) => {
      const email = req.query.email;
      if (!email) {
        return res.send([])
      }
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ error: true, message: "forbidden access" })
      }
      const query = { user: email }
      const result = await bookingCollection.find(query).toArray();
      res.send(result)
    })

    app.get('/enrolled-classes/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ error: true, message: "Forbidden  access" })
      }
      const query = { email: email }
      const sort = { date: -1 }
      const result = await paymentCollection.find(query).sort(sort).toArray()
      res.send(result)
    })

    app.get('/payment-history/:email', verifyJWT, async (req, res) => {
      const email = req.params.email
      if (email !== req.decoded.email) {
        return res.status(403).send({ error: true, message: "Forbidden  access" })
      }
      const query = { email: email }
      const sort = { date: -1 }
      const result = await paymentCollection.find(query).sort(sort).toArray()
      res.send(result)
    })

    app.get('/instructor-classes/:email',verifyJWT,verifyInstructor, async (req, res) => {
      const email = req.params.email;
      const query = {email: email}
      const classes = await courseCollection.find(query).toArray()
      res.send(classes)
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
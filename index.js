const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_User}:${process.env.DB_Password}@firstcluster.6t8rb7j.mongodb.net/?appName=firstCluster`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
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
    // await client.connect();

    const db = client.db("food-db");
    const foodCollection = db.collection("allFoods");
    const RequestFoodCollection = db.collection("requests");
    const contactCollection = db.collection("contacts");
    const userCollection = db.collection("users");

    // POST - create user
app.post("/users", async (req, res) => {
  const { name, email, photo } = req.body;
  try {
    const existingUser = await userCollection.findOne({ email });
    if (existingUser) {
      return res.status(400).send({ message: "User already exists" });
    }
    const result = await userCollection.insertOne({ name, email, photo });
    res.send({ success: true, user: result });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

// GET user by email 
app.get("/users", async (req, res) => {
  const email = req.query.email;
  try {
    const user = await userCollection.find({ email }).toArray();
    res.send(user);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});
 
app.put("/users/:id", async (req, res) => {
  const { id } = req.params;
  const data = req.body;

  try {
    const filter = { _id: new ObjectId(id) };

    const result = await userCollection.updateOne(
      filter,
      { $set: data }
    );

    const updatedUser = await userCollection.findOne(filter);

    if (!updatedUser) {
      return res.status(404).send({ message: "User not found" });
    }

    res.send(updatedUser);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

app.post("/register", async (req, res) => {
  const { name, email, password, photo } = req.body;
  try {
    const result = await userCollection.insertOne({ name, email, password, photo });
    res.send({ success: true, user: result });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});


    // find
    app.get("/all-foods", async (req, res) => {
      const result = await foodCollection.find().toArray();
      res.send(result);
    });

    app.get("/all-foods/:id", async (req, res) => {
      const { id } = req.params;
      // console.log(id)
      const objectId = new ObjectId(id);
      const result = await foodCollection.findOne({ _id: objectId });

      res.send(result);
    });

    app.get("/my-foods", async (req, res) => {
      const email = req.query.email;

      const result = await foodCollection
        .find({ donator_email: email })
        .toArray();
      res.send(result);
    });

    // insert
    app.post("/all-foods", async (req, res) => {
      const data = req.body;
      //   console.log(data);
      const result = await foodCollection.insertOne(data);
      res.send(result);
    });

    // PUT-Update
    app.put("/my-foods/:id", async (req, res) => {
      const { id } = req.params;
      const data = req.body;
      // console.log(id)
      // console.log(data)
      const objectId = new ObjectId(id);
      const filter = { _id: objectId };

      const update = {
        $set: data,
      };

      const result = await foodCollection.updateOne(filter, update);
      res.send(result);
    });

    // Delete
    app.delete("/my-foods/:id", async (req, res) => {
      const { id } = req.params;
      const objectId = new ObjectId(id);
      const filter = { _id: objectId };
      const result = await foodCollection.deleteOne(filter);
      res.send(result);
    });

    // // Featured Foods
    app.get("/featured-foods", async (req, res) => {
      try {
        const foods = await foodCollection
          .find({ food_status: "Available" })
          .toArray();

        // Sort
        const sorted = foods.sort((a, b) => {
          const numA = parseInt(a.food_quantity.match(/\d+/));
          const numB = parseInt(b.food_quantity.match(/\d+/));
          return numB - numA;
        });

        res.send(sorted.slice(0, 6));
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to load featured foods" });
      }
    });

    app.post("/my-food-request", async (req, res) => {
      try {
        const data = req.body;
        const result = await RequestFoodCollection.insertOne(data);

        const insertedRequest = await RequestFoodCollection.findOne({
          _id: result.insertedId,
        });
        // console.log("Inserted request:", insertedRequest);
        res.send(insertedRequest);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to save request" });
      }
    });

    app.post("/contact", async (req, res) => {
  try {
    const message = {
      name: req.body.name,
      email: req.body.email,
      message: req.body.message,
      createdAt: new Date(),
    };

    const result = await contactCollection.insertOne(message);
    res.send({ success: true, message: "Message sent successfully" });
  } catch (error) {
    res.status(500).send({ success: false, message: "Failed to send message" });
  }
});


app.get("/my-requests", async (req, res) => {
  const email = req.query.email;

  try {
    const requests = await RequestFoodCollection.find({ requested_by: email }).toArray();

    const enrichedRequests = await Promise.all(
      requests.map(async (reqItem) => {
        // Fetch food from allFoods collection
        const food = await foodCollection.findOne({ _id: new ObjectId(reqItem.food_id) });

        // Attach actual food_status
        return {
          ...reqItem,
          food_status: food?.food_status?.toLowerCase() || "available", // default available
          food_image: food?.food_image,
          food_name: food?.food_name,
          food_quantity: food?.food_quantity,
          expire_date: food?.expire_date,
        };
      })
    );

    res.send(enrichedRequests);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});


    app.get("/food-requests", async (req, res) => {
      try {
        const { donator_email, food_id } = req.query;

        if (!donator_email || !food_id) {
          return res
            .status(400)
            .send({ message: "Missing donator_email or food_id" });
        }

        const result = await RequestFoodCollection.find({
          donator_email,
          food_id,
        }).toArray();

        res.send(result);
      } catch (err) {
        res.status(500).send({ message: err.message });
      }
    });

    // Update request status and food status
    app.patch("/update-request/:id", async (req, res) => {
      const { id } = req.params;
      const { status, foodId } = req.body;

      try {
        const requestFilter = { _id: new ObjectId(id) };
        await RequestFoodCollection.updateOne(requestFilter, {
          $set: { status: status },
        });

        if (status === "accepted" && foodId) {
          const foodFilter = { _id: new ObjectId(foodId) };
          await foodCollection.updateOne(foodFilter, {
            $set: { food_status: "donated" },
          });
        }

        res.send({ message: "Request updated successfully" });
      } catch (err) {
        res.status(500).send({ message: err.message });
      }
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Food Share Server is Running");
});

app.listen(port, () => {
  console.log(`Food Share Server  listening on port ${port}`);
});
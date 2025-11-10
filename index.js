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

    app.get("/my-requests", async (req, res) => {
      const email = req.query.email;
      const result = await RequestFoodCollection.find({
        requested_by: email,
      }).toArray();
      res.send(result);
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

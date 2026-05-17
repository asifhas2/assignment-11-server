require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

// stripe payment
const Stripe = require("stripe");

//middleware
const stripe = Stripe(process.env.StRIPE_SECRET);
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
    const paymentCollection = db.collection("payments");
    const lessonsCollection = db.collection("lessons");
    const commentsCollection = db.collection("comments");
    const favoriteCollection = db.collection("favorite");
    const reportCollection = db.collection("report");

    app.get("/users", async (req, res) => {
      const result = await userCollection.find().toArray();

      res.send(result);
    });

    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;

      const query = { email: email };

      const result = await userCollection.findOne(query);

      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      user.role = "user";
      user.plan = "free";
      user.createAt = new Date();
      const email = user.email;

      const findUser = await userCollection.findOne({ email });
      if (findUser) {
        return res.send({ message: "user existed" });
      }

      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.patch("/users/:id", async (req, res) => {
      const id = req.params.id;
      const roleInfo = req.body;

      const query = { _id: new ObjectId(id) };
      const updateDocs = {
        $set: {
          role: roleInfo.role,
        },
      };
      const result = await userCollection.updateOne(query, updateDocs);
      res.send(result);
    });

    app.patch("/users/:email", async (req, res) => {
      const email = req.params.email;
      const filter = { email };

      const updateDoc = {
        $set: {
          plan: "premium",
        },
      };

      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    //payment serverApi

    app.post("/create-checkout-session", async (req, res) => {
      try {
        const paymentInfo = req.body;

        const amount = parseInt(paymentInfo.cost) * 100;

        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],

          line_items: [
            {
              price_data: {
                currency: "usd",

                product_data: {
                  name: "Premium Plan",
                },

                unit_amount: amount,
              },

              quantity: 1,
            },
          ],

          customer_email: paymentInfo.senderEmail,

          mode: "payment",

          success_url: `${process.env.SITE_DOMAIN}/dashboard/payment-success`,

          cancel_url: `${process.env.SITE_DOMAIN}/dashboard/payment-cancel`,
        });

        console.log(session);

        res.send({
          url: session.url,
        });
      } catch (error) {
        console.log(error.message);

        res.status(400).send({
          error: error.message,
        });
      }
    });

    app.patch("/dashboard/:email", async (req, res) => {
      const email = req.params.email;

      const result = await userCollection.updateOne(
        { email },
        {
          $set: {
            plan: "premium",
            premiumTakenAt: new Date(),
          },
        },
      );

      res.send(result);
    });

    // lessons serverApi
    app.get("/lessons/favorite", async (req, res) => {
      try {
        const email = req.query.email;

        // console.log(email);

        const query = {
          userEmail: email,
        };

        const result = await favoriteCollection.find(query).toArray();

        res.send(result);
      } catch (error) {
        console.log("FAVORITE ERROR:", error);

        res.status(500).send({
          message: error.message,
        });
      }
    });
    app.patch("/lessons/featured/:id", async (req, res) => {
      try {
        const id = req.params.id;

        const filter = {
          _id: new ObjectId(id),
        };

        const updatedDoc = {
          $set: {
            featured: true,
          },
        };

        const result = await lessonsCollection.updateOne(filter, updatedDoc);

        res.send(result);
      } catch (error) {
        console.log(error);

        res.status(500).send({
          message: "Failed to update featured",
        });
      }
    });

    app.patch("/lessons/reviewed/:id", async (req, res) => {
      try {
        const id = req.params.id;

        const filter = {
          _id: new ObjectId(id),
        };

        const updatedDoc = {
          $set: {
            reviewed: true,
          },
        };

        const result = await lessonsCollection.updateOne(filter, updatedDoc);

        res.send(result);
      } catch (error) {
        console.log(error);

        res.status(500).send({
          message: "Failed to mark reviewed",
        });
      }
    });

    app.get("/lessons", async (req, res) => {
      const email = req.query.email;

      let query = {};
      if (email) {
        query = { email: email };
      }

      const result = await lessonsCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/lessons/:id", async (req, res) => {
      const id = req.params.id;
      const query = {
        _id: new ObjectId(id),
      };

      const result = await lessonsCollection.findOne(query);
      res.send(result);
    });
    app.delete("/lessons/:id", async (req, res) => {
      try {
        const id = req.params.id;

        const query = {
          _id: new ObjectId(id),
        };

        const result = await lessonsCollection.deleteOne(query);

        res.send(result);
      } catch (error) {
        console.log(error);

        res.status(500).send({
          message: "Failed to delete lesson",
        });
      }
    });

    app.post("/lessons", async (req, res) => {
      try {
        const lesson = req.body;

        const result = await lessonsCollection.insertOne(lesson);

        res.send(result);
      } catch (error) {
        console.log(error);

        res.status(500).send({
          message: "Failed to create lesson",
        });
      }
    });

    app.patch("/lessons/like/:id", async (req, res) => {
      const id = req.params.id;

      const filter = {
        _id: new ObjectId(id),
      };

      const updateDoc = {
        $inc: {
          reactions: 1,
        },
      };

      const result = await lessonsCollection.updateOne(filter, updateDoc);

      res.send(result);
    });

    app.patch("/lessons/favorite/:id", async (req, res) => {
      const id = req.params.id;

      const favoriteData = req.body;

      // lesson update
      const filter = {
        _id: new ObjectId(id),
      };

      const updateDoc = {
        $inc: {
          saves: 1,
        },
      };

      const updateResult = await lessonsCollection.updateOne(filter, updateDoc);

      // save favorite collection
      const favoriteResult = await favoriteCollection.insertOne(favoriteData);

      res.send({
        updateResult,
        favoriteResult,
      });
    });

    // comment api

    app.post("/comments", async (req, res) => {
      const commentData = req.body;

      const result = await commentsCollection.insertOne(commentData);

      res.send(result);
    });
    app.get("/comments/:id", async (req, res) => {
      const lessonId = req.params.id;

      const query = {
        lessonId: lessonId,
      };

      const result = await commentsCollection.find(query).toArray();

      res.send(result);
    });

    // report api

    app.get("/report", async (req, res) => {
      const query = {};

      const result = await reportCollection.find(query).toArray();

      res.send(result);
    });

    app.post("/report", async (req, res) => {
      const reportData = req.body;
      const result = reportCollection.insertOne(reportData);
      res.send(result);
    });

    app.delete("/report/:id", async (req, res) => {
      try {
        const id = req.params.id;

        const query = {
          _id: new ObjectId(id),
        };

        const result = await reportCollection.deleteOne(query);

        res.send(result);
      } catch (error) {
        console.log(error);

        res.status(500).send({
          message: error.message,
        });
      }
    });

    app.patch("/report/ignore/:id", async (req, res) => {
  try {

    const id = req.params.id;

    const filter = {
      _id: new ObjectId(id),
    };

    const updateDoc = {
      $set: {
        status: "ignored",
      },
    };

    const result = await reportCollection.updateOne(
      filter,
      updateDoc
    );

    res.send(result);

  } catch (error) {

    console.log(error);

    res.status(500).send({
      message: error.message,
    });

  }
});
// admin api

app.get("/admin/dashboard-stats", async (req, res) => {
  try {
    // total users
    const totalUsers = await userCollection.countDocuments();

    // total public lessons
    const totalLessons = await lessonsCollection.countDocuments({
      privacy: "public",
    });

    // total reports
    const reportedLessons = await reportCollection.countDocuments();

    // today's lessons
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayLessons = await lessonsCollection.countDocuments({
      createdAt: {
        $gte: today,
      },
    });

    res.send({
      totalUsers,
      totalLessons,
      reportedLessons,
      todayLessons,
    });
  } catch (error) {
    res.status(500).send({
      message: "Failed to load dashboard stats",
    });
  }
});

app.get("/admin/lesson-growth", async (req, res) => {
  try {
    const lessons = await lessonsCollection
      .find({})
      .sort({ createdAt: 1 })
      .toArray();

    const growthMap = {};

    lessons.forEach((lesson) => {
      const date = new Date(lesson.createdAt)
        .toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });

      if (!growthMap[date]) {
        growthMap[date] = 0;
      }

      growthMap[date] += 1;
    });

    const chartData = Object.entries(growthMap).map(
      ([date, count]) => ({
        date,
        count,
      }),
    );

    res.send(chartData);
  } catch (error) {
    res.status(500).send({
      message: "Failed to load lesson growth",
    });
  }
});

app.get("/admin/user-growth", async (req, res) => {
  try {
    const users = await userCollection
      .find({})
      .sort({ createdAt: 1 })
      .toArray();

    const growthMap = {};

    users.forEach((user) => {
      const date = new Date(user.createdAt)
        .toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });

      if (!growthMap[date]) {
        growthMap[date] = 0;
      }

      growthMap[date] += 1;
    });

    const chartData = Object.entries(growthMap).map(
      ([date, count]) => ({
        date,
        count,
      }),
    );

    res.send(chartData);
  } catch (error) {
    res.status(500).send({
      message: "Failed to load user growth",
    });
  }
});

app.get("/admin/top-contributors", async (req, res) => {
  try {
    const result = await lessonsCollection.aggregate([
      {
        $group: {
          _id: "$creatorEmail",
          totalLessons: {
            $sum: 1,
          },
          creatorName: {
            $first: "$creatorName",
          },
        },
      },

      {
        $sort: {
          totalLessons: -1,
        },
      },

      {
        $limit: 5,
      },
    ]).toArray();

    res.send(result);
  } catch (error) {
    res.status(500).send({
      message: "Failed to load contributors",
    });
  }
});




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

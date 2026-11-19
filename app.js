import express from "express";
import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 7000;

// MongoDB connection
const mongoUrl =
  process.env.MONGO_URI ||
  "mongodb+srv://admin:Cherry1234@cluster0.s735bf2.mongodb.net/?retryWrites=true&w=majority";
const databaseName = process.env.DB_NAME || "library_db";

let client;
let db;

async function getDb() {
  if (db) return db;
  client = new MongoClient(mongoUrl);
  await client.connect();
  db = client.db(databaseName);
  console.log("Connected to MongoDB");
  return db;
}

// Initial connection attempt
getDb().catch((err) => console.error("Initial MongoDB connection attempt error:", err.message));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure DB is ready on each request in serverless
app.use(async (req, res, next) => {
  try {
    await getDb();
    next();
  } catch (err) {
    console.error("Failed to connect to MongoDB", err);
    res.status(500).json({ message: "Database connection failed", error: err.message });
  }
});

// Root test route
app.get("/", (req, res) => {
  res.status(200).json({ message: "MongoDB Library API Server is running" });
});

// CRUD API endpoints
// Create a new book - POST /api/v1/books
app.post("/api/v1/books", (req, res) => {
  const { title, author, category, price } = req.body;
  if (!title || !author || !category || !price) {
    return res.status(400).json({ message: "All book fields are required" });
  }
  db.collection("books")
    .insertOne({ title, author, category, price })
    .then((result) => {
      const newBook = {
        _id: result.insertedId,
        title,
        author,
        category,
        price,
      };
      res
        .status(201)
        .json({ message: "Book created successfully", data: newBook });
    })
    .catch((err) => {
      res.status(500).json({ message: "Failed to create book", error: err.message });
    });
});

// Get books by category - GET /api/v1/books?category=categoryName
// Get all books - GET /api/v1/books
app.get("/api/v1/books", (req, res) => {
  const category = req.query.category;
  const query = category ? { category } : {};
  db.collection("books")
    .find(query)
    .toArray()
    .then((books) => {
      res
        .status(200)
        .json({ message: "Books fetched successfully", data: books });
    })
    .catch((err) => {
      res.status(500).json({ message: "Failed to fetch books", error: err.message });
    });
});

// Get a single book by ID - GET /api/v1/books/:id
app.get("/api/v1/books/:id", (req, res) => {
  const bookId = req.params.id;
  let oId;
  try {
    oId = new ObjectId(bookId);
  } catch (e) {
    return res.status(400).json({ message: "Invalid book ID format" });
  }
  db.collection("books")
    .findOne({ _id: oId })
    .then((book) => {
      if (!book) {
        return res.status(404).json({ message: "Book not found" });
      }
      res
        .status(200)
        .json({ message: "Book fetched successfully", data: book });
    })
    .catch((err) => {
      res.status(500).json({ message: "Failed to fetch book", error: err.message });
    });
});

// Update a book by ID - PUT /api/v1/books/:id
app.put("/api/v1/books/:id", (req, res) => {
  const bookId = req.params.id;
  const { title, author, category, price } = req.body;
  if (!title || !author || !category || !price) {
    return res.status(400).json({ message: "All book fields are required" });
  }
  let oId;
  try {
    oId = new ObjectId(bookId);
  } catch (e) {
    return res.status(400).json({ message: "Invalid book ID format" });
  }
  const book = { title, author, category, price };
  db.collection("books")
    .updateOne({ _id: oId }, { $set: book })
    .then((result) => {
      if (result.matchedCount === 0) {
        return res.status(404).json({ message: "Book not found" });
      }
      res.status(200).json({
        message: "Book updated successfully",
        data: { _id: oId, ...book },
      });
    })
    .catch((err) => {
      res.status(500).json({ message: "Failed to update book", error: err.message });
    });
});

// Delete a book by ID - DELETE /api/v1/books/:id
app.delete("/api/v1/books/:id", (req, res) => {
  const bookId = req.params.id;
  let oId;
  try {
    oId = new ObjectId(bookId);
  } catch (e) {
    return res.status(400).json({ message: "Invalid book ID format" });
  }
  db.collection("books")
    .deleteOne({ _id: oId })
    .then((result) => {
      if (result.deletedCount === 0) {
        return res.status(404).json({ message: "Book not found" });
      }
      res.status(200).json({ message: "Book deleted successfully" });
    })
    .catch((err) => {
      res.status(500).json({ message: "Failed to delete book", error: err.message });
    });
});

// 404 Not Found middleware
app.use((req, res) => {
  res.status(404).json({ message: "Not Found" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res
    .status(err.status || 500)
    .json({ message: err.message || "Internal Server Error" });
});

if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
}

export default app;
